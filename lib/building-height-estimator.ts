// Building height estimator.
//
// The 高德 (AMap / AutoNavi) standard Web Service API —
//   https://restapi.amap.com/v3/place/polygon
// — returns a building footprint, name, address and type, but no height
// data. For 3D rendering we therefore need to synthesise a height by
// combining whatever signals are available:
//
//   1. Explicit OSM tags from OverpassBuildingsSource
//      (`height`, `building:levels`). These win because they are real
//      measurements / declared values and have 'high' confidence.
//
//   2. A heuristic table that matches building name / category keywords
//      against typical heights. Confidence is 'medium' because it is a
//      guess, not a measurement.
//
//   3. A hard default of 8 metres, matching the OSM
//      `DEFAULT_HEIGHT_METERS` constant. Confidence is 'low'.
//
// All functions are pure: no I/O, no `Date.now`, no globals. The
// estimator is therefore trivial to unit-test and can be called
// inside render loops without performance concerns.

import { METERS_PER_LEVEL } from "./overpass-buildings-source";

/** Where a `HeightEstimate` came from. Useful for debugging and UI hints. */
export type HeightSource =
  | "osm"
  | "gaode-extensions"
  | "heuristic"
  | "default";

/** Confidence label for a height estimate. */
export type HeightConfidence = "high" | "medium" | "low";

/** A resolved height estimate with provenance and confidence. */
export type HeightEstimate = {
  meters: number;
  source: HeightSource;
  confidence: HeightConfidence;
};

/** Hard fallback when no signal is available. */
export const DEFAULT_HEIGHT_METERS = 8;

/** Average metres per storey — sourced from the OSM parser. */
export const METRES_PER_LEVEL = METERS_PER_LEVEL;

// ---------------------------------------------------------------------------
// Height-tag parsing (mirrors OverpassBuildingsSource.parseHeightTag)
// ---------------------------------------------------------------------------

/**
 * Parse an OSM `height` tag value into metres. The tag is famously
 * messy — values look like "25", "25 m", "25.5", "25m", "20 ft",
 * "3 storeys", or "yes". We pull the first numeric run out of the
 * string and apply a unit hint when one is present:
 *   - "m" / "metre" / "metres"      → as-is
 *   - "ft" / "foot" / "feet"        → × 0.3048
 *   - "storey" / "storeys" / "st"   → × METRES_PER_LEVEL
 *   - unknown / missing unit        → assume metres (OSM convention)
 * Returns `null` when no numeric component is found.
 */
export function parseHeightTag(raw: string | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (text === "" || text === "yes" || text === "no") return null;

  const match = /(-?\d+(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  let unit = "";
  if (/(ft|foot|feet)\b/.test(text)) unit = "ft";
  else if (/\b(stor(?:ey|eys|e|ies)|st)\b/.test(text)) unit = "st";
  else if (/\b(m\b|met(?:re|res|er|ers))\b/.test(text)) unit = "m";

  switch (unit) {
    case "ft":
      return value * 0.3048;
    case "st":
      return value * METRES_PER_LEVEL;
    case "m":
    default:
      return value;
  }
}

/** Parse `building:levels` into a positive number, or `null` if invalid. */
export function parseLevelsTag(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = /(\d+(?:\.\d+)?)/.exec(raw.trim());
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

// ---------------------------------------------------------------------------
// Heuristic table
// ---------------------------------------------------------------------------

type HeuristicRange = { min: number; max: number };

/**
 * Keyword → typical height range, in metres. The match is
 * case-insensitive and runs against a single normalised string that
 * concatenates `name` and `category` (if any). Whitespace is
 * collapsed so "office   tower" still matches "office tower".
 *
 * Mid-points are used when emitting an estimate; we deliberately
 * return a *single* number rather than a range because downstream
 * renderers want a scalar. The range is preserved as comments so
 * future readers can tune the model.
 */
const HEURISTIC_TABLE: ReadonlyArray<{
  keywords: ReadonlyArray<string>;
  range: HeuristicRange;
}> = [
  {
    // Tall commercial / office buildings. 30–80 m covers the typical
    // low-rise CBD tower to a mid-rise landmark.
    keywords: ["写字楼", "office", "商业", "购物中心", "mall", "cbd", "tower", "大厦"],
    range: { min: 30, max: 80 },
  },
  {
    // Residential mid-rise. 15–30 m covers ~5–10 storeys.
    keywords: ["公寓", "住宅", "小区", "apartment", "residential", "宿舍"],
    range: { min: 15, max: 30 },
  },
  {
    // Light industrial / warehouse — usually single-storey with a
    // pitched roof, sometimes two storeys for offices in front.
    keywords: ["工厂", "warehouse", "工业"],
    range: { min: 8, max: 15 },
  },
  {
    // Schools. Typically 3–6 storey classroom blocks.
    keywords: ["学校", "university", "school"],
    range: { min: 12, max: 25 },
  },
  {
    // Hospitals / clinics. Often 3–6 storeys with a low-rise podium.
    keywords: ["医院", "hospital", "诊所"],
    range: { min: 12, max: 20 },
  },
  {
    // Hotels. 5–10 storeys, sometimes taller in dense cities.
    keywords: ["酒店", "hotel", "宾馆"],
    range: { min: 15, max: 30 },
  },
  {
    // Standalone restaurants / F&B — usually single-storey.
    keywords: ["餐厅", "restaurant", "美食"],
    range: { min: 5, max: 10 },
  },
  {
    // Standalone retail / shop. 1–4 storeys depending on the city.
    keywords: ["商场", "shop", "零售"],
    range: { min: 8, max: 20 },
  },
  {
    // Heritage / temple structures. Single storey with a tall roof.
    keywords: ["寺庙", "古建筑", "temple", "heritage"],
    range: { min: 6, max: 15 },
  },
];

/** Mid-point of a range, rounded to one decimal place. */
function midpoint(range: HeuristicRange): number {
  return Math.round(((range.min + range.max) / 2) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a building's height in metres from an OSM-style tag bag.
 * Resolution order matches the project spec:
 *   1. `tags.height` (parsed with unit handling)
 *   2. `tags["building:levels"] * METRES_PER_LEVEL`
 *   3. `name` / `category` heuristic (via `tags.name` / `tags.amenity` /
 *      `tags.building` / similar common keys)
 *   4. `DEFAULT_HEIGHT_METERS`
 *
 * Confidence is 'high' for steps 1–2, 'medium' for step 3, and 'low'
 * for step 4.
 */
export function estimateHeightFromTags(
  tags: Record<string, string>,
): HeightEstimate {
  const fromHeight = parseHeightTag(tags.height);
  if (fromHeight !== null) {
    return { meters: fromHeight, source: "osm", confidence: "high" };
  }

  const levels = parseLevelsTag(tags["building:levels"]);
  if (levels !== null) {
    return {
      meters: levels * METRES_PER_LEVEL,
      source: "osm",
      confidence: "high",
    };
  }

  // Try a heuristic match using common POI-style fields. We use
  // `name` first, then `building`, `amenity`, `shop`, `office`,
  // `landuse`, in that order, so a building tagged
  //   { building: "retail", name: "Central Plaza" }
  // still resolves via `building`.
  const candidateFields = [
    tags.name,
    tags.building,
    tags.amenity,
    tags.shop,
    tags.office,
    tags.landuse,
    tags["building:use"],
  ];
  for (const value of candidateFields) {
    if (!value) continue;
    const heuristic = matchHeuristic(value);
    if (heuristic) {
      return { ...heuristic, source: "heuristic" };
    }
  }

  return {
    meters: DEFAULT_HEIGHT_METERS,
    source: "default",
    confidence: "low",
  };
}

/**
 * Look up a heuristic height for a `(name, category?)` pair.
 * Returns `null` when no keyword matches so the caller can fall
 * back to the default 8 m. The result is `medium` confidence.
 */
export function estimateHeightByHeuristic(
  name: string,
  category?: string,
): HeightEstimate {
  const matched = matchHeuristic(name, category);
  if (matched) return matched;
  return {
    meters: DEFAULT_HEIGHT_METERS,
    source: "default",
    confidence: "low",
  };
}

/**
 * Convenience wrapper for name-only heuristics (e.g. when the caller
 * is a 高德 result and the only signal is the building's name).
 */
export function estimateHeightFromName(name: string): HeightEstimate {
  return estimateHeightByHeuristic(name);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Walk the heuristic table and return the first match. The match
 * string is `category + " " + name` (lowercased, whitespace
 * collapsed) so that "Office Tower" + category "Building" still
 * hits the office/tower row.
 */
function matchHeuristic(name: string, category?: string): HeightEstimate | null {
  const haystack = `${category ?? ""} ${name}`.toLowerCase().replace(/\s+/g, " ").trim();
  if (haystack === "") return null;

  for (const row of HEURISTIC_TABLE) {
    for (const kw of row.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        return {
          meters: midpoint(row.range),
          source: "heuristic",
          confidence: "medium",
        };
      }
    }
  }
  return null;
}
