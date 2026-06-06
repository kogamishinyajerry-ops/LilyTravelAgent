// Real BuildingsSource implementation backed by the OpenStreetMap
// Overpass API. The Overpass endpoint is unauthenticated, global, and
// rate-limited — the public instance at overpass-api.de is fine for
// low-traffic prototypes but production callers should self-host or
// cycle through mirrors (kumi.systems, overpass.kumi.systems, etc.).
//
// The Overpass QL we emit is intentionally minimal:
//   [bbox:south,west,north,east];(way["building"];);out geom;
// `out geom` returns a flat `elements` array of ways, each carrying
// `geometry: [{ lat, lon }, ...]` in WGS84. We only keep closed polygons
// (first vertex === last vertex) and compute the centroid by simple
// arithmetic mean. Centroid accuracy is plenty for a 3D skyline render
// and avoids a shoelace dependency.
//
// Height is parsed from `tags.height` ("25", "25 m", "25.5 ft"), then
// `tags["building:levels"] * 3`, then a hard fallback of 8 m. The
// default matches a typical single-storey urban box so a 3D scene
// doesn't show flat slabs when an OSM record lacks height metadata.
//
// All network I/O is funneled through an injected `fetch` so unit
// tests can hand in a stubbed responder. `globalThis.fetch` is the
// sensible production default for both Node 18+ and the browser.

import type { BBox } from "./tile-coords";
import type {
  Building,
  BuildingsSource,
  FetchBuildingsOptions,
  FootprintVertex,
} from "./buildings-source";

/** Public Overpass endpoint, exposed as a constant for tests / overrides. */
export const DEFAULT_OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Default `name` reported via `BuildingsSource.name`. */
export const DEFAULT_NAME = "osm-overpass";

/** Hard cap when the caller does not pass `opts.limit`. */
export const DEFAULT_LIMIT = 2000;

/** Fallback height when neither `height` nor `building:levels` is present. */
export const DEFAULT_HEIGHT_METERS = 8;

/** Average metres per storey used when only `building:levels` is known. */
export const METERS_PER_LEVEL = 3;

/**
 * Element shape returned by `out geom` for ways. Only the fields we
 * actually consume are typed; Overpass may return more in some cases
 * (e.g. relations, nodes) and we silently ignore them.
 */
type OverpassGeometryPoint = {
  lat: number;
  lon: number;
};

type OverpassWayElement = {
  type: "way";
  id: number;
  geometry?: OverpassGeometryPoint[];
  tags?: Record<string, string>;
};

type OverpassElement = OverpassWayElement | { type: string };

type OverpassResponse = {
  elements?: OverpassElement[];
};

/** Overpass QL builder. Kept in its own function so it is unit-testable. */
export function buildOverpassQuery(bbox: BBox, limit: number): string {
  // `[bbox]` in Overpass QL expects (south, west, north, east). The
  // shared `BBox` type uses (west, south, east, north), so we reorder
  // here to avoid silently querying the wrong hemisphere.
  const s = bbox.south;
  const w = bbox.west;
  const n = bbox.north;
  const e = bbox.east;
  return `[bbox:${s},${w},${n},${e}];(way["building"];);out geom ${limit};`;
}

/**
 * Parse an OSM `height` tag value into metres. The tag is famously
 * messy — values look like "25", "25 m", "25.5", "25m", "20 ft",
 * "3 storeys", or "yes". We pull the first numeric run out of the
 * string and apply a unit hint when one is present:
 *   - "m" / "metre" / "metres"      → as-is
 *   - "ft" / "foot" / "feet"        → × 0.3048
 *   - "storey" / "storeys" / "st"   → × METERS_PER_LEVEL
 *   - unknown / missing unit        → assume metres (OSM convention)
 * Returns `null` when no numeric component is found.
 */
export function parseHeightTag(raw: string | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (text === "" || text === "yes" || text === "no") return null;

  // Find the first run of digits, optionally preceded by a sign and
  // containing a single decimal point. e.g. "-3.5", "12.0", "30".
  const match = /(-?\d+(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  // Look for a unit hint *after* the numeric run. We intentionally
  // search the whole string (not just the suffix) so values like
  // "approx 12m" still resolve to metres.
  let unit = "";
  if (/(ft|foot|feet)\b/.test(text)) unit = "ft";
  else if (/\b(stor(?:ey|eys|e|ies)|st)\b/.test(text)) unit = "st";
  else if (/\b(m\b|met(?:re|res|er|ers))\b/.test(text)) unit = "m";

  switch (unit) {
    case "ft":
      return value * 0.3048;
    case "st":
      return value * METERS_PER_LEVEL;
    case "m":
    default:
      return value;
  }
}

/** Parse `building:levels` into a positive integer, or `null` if invalid. */
export function parseLevelsTag(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = /(\d+(?:\.\d+)?)/.exec(raw.trim());
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Resolve a building's height in metres from its OSM tags. The order
 * matches the project spec: explicit `height` wins, then
 * `building:levels` × METERS_PER_LEVEL, then `DEFAULT_HEIGHT_METERS`.
 */
export function resolveHeightMeters(tags: Record<string, string>): number {
  const fromHeight = parseHeightTag(tags.height);
  if (fromHeight !== null) return fromHeight;
  const levels = parseLevelsTag(tags["building:levels"]);
  if (levels !== null) return levels * METERS_PER_LEVEL;
  return DEFAULT_HEIGHT_METERS;
}

/**
 * Compute the arithmetic-mean centroid of a closed polygon. Simple
 * and dependency-free; the result is well-defined for convex shapes
 * and a good-enough approximation for irregular building footprints
 * (we never use it for geometry, only for marker placement).
 */
export function computeCentroid(footprint: FootprintVertex[]): {
  lng: number;
  lat: number;
} {
  if (footprint.length === 0) {
    return { lng: 0, lat: 0 };
  }
  // Drop the trailing duplicate vertex that closes the ring.
  const points =
    footprint.length > 1 &&
    footprint[0].lng === footprint[footprint.length - 1].lng &&
    footprint[0].lat === footprint[footprint.length - 1].lat
      ? footprint.slice(0, -1)
      : footprint;
  const count = points.length || 1;
  let sumLng = 0;
  let sumLat = 0;
  for (const p of points) {
    sumLng += p.lng;
    sumLat += p.lat;
  }
  return { lng: sumLng / count, lat: sumLat / count };
}

/** Detect a closed ring (first vertex === last vertex) and minimum length. */
export function isClosedPolygon(points: FootprintVertex[]): boolean {
  if (points.length < 4) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return first.lng === last.lng && first.lat === last.lat;
}

/**
 * Convert an Overpass way element into a `Building`, or `null` if the
 * way is not a usable polygon (e.g. a multi-polygon relation, an open
 * way, or a degenerate geometry).
 */
export function elementToBuilding(
  element: OverpassWayElement,
): Building | null {
  const geometry = element.geometry;
  if (!geometry || geometry.length === 0) return null;

  const footprint: FootprintVertex[] = geometry.map((g) => ({
    lng: g.lon,
    lat: g.lat,
  }));
  if (!isClosedPolygon(footprint)) return null;

  const tags = element.tags ?? {};
  const { lng, lat } = computeCentroid(footprint);
  return {
    id: `osm-way-${element.id}`,
    lng,
    lat,
    heightMeters: resolveHeightMeters(tags),
    footprint,
    tags,
    // OSM `height` / `building:levels` tags are explicit values
    // declared by the mapper, so the resulting height is always
    // tagged with the highest-confidence `heightSource: 'osm'`. This
    // lets the composite source prefer OSM heights over heuristic
    // estimates when the same building shows up in two providers.
    heightSource: "osm",
  };
}

export type OverpassBuildingsSourceOptions = {
  /** Override the Overpass endpoint (useful for mirrors or tests). */
  endpoint?: string;
  /** Inject a `fetch` implementation (used by tests). */
  fetchImpl?: typeof fetch;
  /** Override the human-readable name. */
  name?: string;
};

/**
 * Real `BuildingsSource` backed by the OpenStreetMap Overpass API.
 *
 * `fetchBuildings` always resolves to an array (never rejects) so the
 * scene renderer can fall back to its procedural city blocks when the
 * network is down or the region has no mapped buildings. Network
 * errors, non-2xx responses, and JSON parse errors are caught and
 * logged via `console.warn` — callers get `[]` instead of a thrown
 * promise.
 */
export class OverpassBuildingsSource implements BuildingsSource {
  readonly name: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OverpassBuildingsSourceOptions = {}) {
    this.endpoint = opts.endpoint ?? DEFAULT_OVERPASS_ENDPOINT;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.name = opts.name ?? DEFAULT_NAME;
  }

  async fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]> {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const query = buildOverpassQuery(bbox, limit);

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
    } catch (err) {
      console.warn(
        "OverpassBuildingsSource: network request failed:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }

    if (!response.ok) {
      console.warn(
        `OverpassBuildingsSource: HTTP ${response.status} ${response.statusText}`,
      );
      return [];
    }

    let payload: OverpassResponse;
    try {
      payload = (await response.json()) as OverpassResponse;
    } catch (err) {
      console.warn(
        "OverpassBuildingsSource: failed to parse Overpass JSON:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }

    const elements = payload.elements ?? [];
    const buildings: Building[] = [];
    for (const el of elements) {
      if (el.type !== "way") continue;
      if (buildings.length >= limit) break;
      const building = elementToBuilding(el as OverpassWayElement);
      if (building) buildings.push(building);
    }

    // Stable order so downstream caches can dedupe across calls.
    buildings.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return buildings;
  }
}

/**
 * Factory mirroring the `createDefaultBuildingsSource` shape. Returns
 * a fresh `OverpassBuildingsSource` on every call so callers can own
 * the lifecycle (tests in particular want a clean instance per case).
 */
export function createOverpassBuildingsSource(
  opts: { endpoint?: string } = {},
): OverpassBuildingsSource {
  return new OverpassBuildingsSource(opts);
}
