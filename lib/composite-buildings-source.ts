// Composite BuildingsSource that fans out to multiple underlying sources
// in parallel and merges their results.
//
// Motivation: no single provider covers the world well. Overpass (OSM) is
// great for Europe and the US but sparse in mainland China; 高德 / Amap is
// the opposite. Wiring both behind a single `BuildingsSource` lets the
// scene renderer stay oblivious to the split — the composite just returns
// "the union of whatever any child source could fetch" for the bbox.
//
// Dedupe algorithm: two buildings are considered the same physical
// structure when the haversine distance between their centroids is at or
// below `DEDUPE_CENTROID_METERS` (5 m). 5 m is small enough to keep
// distinct neighbouring buildings in dense urban tiles apart, while
// still absorbing the same-building-with-slightly-different-vertex-
// order artefacts you get from OSM and 高德 tracing the same outline
// independently.
//
// When two records collide we pick the one with the higher-confidence
// `heightSource`. The ranking is
//   `osm` > `gaode-extensions` > `heuristic` > `default`
// so a building traced by both Overpass (explicit `height` tag) and
// 高德 (heuristic estimate) keeps the OSM measurement, not the guess.
// Ties preserve child order — the first source's record wins, matching
// the original contract documented below.
//
// Original (pre-confidence) behaviour, kept verbatim for context:
// "When two records collide, the first one wins and later duplicates
// are dropped — ordering is stable because each child source is
// required to return a sorted list (see BuildingsSource docs) and we
// iterate children in constructor order."
//
// Failure handling: any source that throws or rejects is caught and
// logged via `console.warn`. The composite still resolves to the
// survivors' results so a dead Overpass endpoint cannot take down a
// region that 高德 already covered cleanly.

import type { BBox } from "./tile-coords";
import type { HeightSource } from "./building-height-estimator";
import type {
  Building,
  BuildingsSource,
  FetchBuildingsOptions,
} from "./buildings-source";

/** Centroid distance below which two `Building`s are treated as the same. */
export const DEDUPE_CENTROID_METERS = 5;

/** Human-readable prefix used for the composite's `name`. */
export const COMPOSITE_NAME_PREFIX = "composite:";

export type CompositeBuildingsSourceOptions = {
  sources: BuildingsSource[];
};

/**
 * Numeric confidence ranking for each `heightSource`. Higher numbers
 * win during dedupe. The order is:
 *   `osm` > `gaode-extensions` > `heuristic` > `default`
 *
 * Exported so tests can assert on the exact ranking without re-stating
 * the order. Unknown / missing `heightSource` values fall back to
 * `default` (lowest confidence) so legacy buildings that pre-date the
 * typed field still lose out to a properly-tagged duplicate.
 */
export const HEIGHT_SOURCE_CONFIDENCE: Readonly<Record<HeightSource, number>> = {
  osm: 4,
  "gaode-extensions": 3,
  heuristic: 2,
  default: 1,
};

/**
 * Compare two `Building`s and return the one with the more confident
 * `heightSource`. Ties (equal confidence, including both being
 * `undefined` / `default`) return `a` so child-order is preserved.
 * Exposed for tests; production code uses the inlined fast-path
 * inside `dedupeByCentroidAndPreferHeight`.
 */
export function pickMoreConfidentHeight(
  a: Building,
  b: Building,
): Building {
  const confA = HEIGHT_SOURCE_CONFIDENCE[a.heightSource ?? "default"];
  const confB = HEIGHT_SOURCE_CONFIDENCE[b.heightSource ?? "default"];
  return confB > confA ? b : a;
}

/**
 * Earth radius in metres used by the haversine formula. Matches the
 * WGS-84 mean radius to within 0.1%, which is well below the 5 m dedupe
 * threshold, so a single global constant is fine.
 */
const EARTH_RADIUS_METERS = 6_371_008.8;

/** Great-circle distance between two WGS84 points, in metres. */
export function haversineMeters(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Test whether `candidate` is within `DEDUPE_CENTROID_METERS` of any
 * building already in `accepted`. Exposed for unit tests; production
 * code uses the inlined fast-path inside `fetchBuildings`.
 */
export function isDuplicate(
  candidate: Building,
  accepted: Building[],
  thresholdMeters: number = DEDUPE_CENTROID_METERS,
): boolean {
  for (const existing of accepted) {
    if (haversineMeters(candidate, existing) <= thresholdMeters) {
      return true;
    }
  }
  return false;
}

/**
 * Find the index of the first building in `accepted` that is within
 * `thresholdMeters` of `candidate`, or `-1` when no such building
 * exists. Returned as an index (not a boolean) so the caller can
 * replace the matching record with a higher-confidence variant.
 */
function findDuplicateIndex(
  candidate: Building,
  accepted: Building[],
  thresholdMeters: number,
): number {
  for (let i = 0; i < accepted.length; i++) {
    const existing = accepted[i]!;
    if (haversineMeters(candidate, existing) <= thresholdMeters) {
      return i;
    }
  }
  return -1;
}

/**
 * Dedupe a list of buildings by centroid proximity, preferring the
 * building with the higher-confidence `heightSource` when two
 * records collide.
 *
 * Behaviour:
 *   - Two buildings are "the same" when their haversine centroid
 *     distance is at or below `thresholdMeters`.
 *   - When a duplicate is found, the new candidate replaces the
 *     existing record only if its `heightSource` confidence is
 *     strictly greater (so the first-seen record still wins ties —
 *     this is what preserves the original "child order wins"
 *     contract documented in the file header).
 *   - `heightSource` metadata on the resulting buildings is the
 *     candidate's own field (callers that need a default for
 *     un-tagged buildings can stamp it before calling).
 *
 * Exposed as a pure function so callers (e.g. a renderer that
 * already has a list of buildings from several sources and wants to
 * dedupe them in a single pass) can reuse the same logic without
 * instantiating a `CompositeBuildingsSource`.
 */
export function dedupeByCentroidAndPreferHeight(
  buildings: Building[],
  thresholdMeters: number = DEDUPE_CENTROID_METERS,
): Building[] {
  const accepted: Building[] = [];
  for (const candidate of buildings) {
    const idx = findDuplicateIndex(candidate, accepted, thresholdMeters);
    if (idx === -1) {
      accepted.push(candidate);
      continue;
    }
    const existing = accepted[idx]!;
    const better = pickMoreConfidentHeight(existing, candidate);
    if (better !== existing) {
      accepted[idx] = candidate;
    }
  }
  return accepted;
}

/**
 * Composite `BuildingsSource` that merges multiple child sources in
 * parallel and deduplicates the union by centroid proximity, preferring
 * the higher-confidence `heightSource` when records collide.
 *
 * `name` is the join of all child names under the `composite:` prefix
 * so logs and telemetry can tell which sources actually contributed.
 * If no child sources are configured the composite is effectively a
 * no-op (resolves to `[]`) and `name` is `composite:` with an empty
 * suffix.
 */
export class CompositeBuildingsSource implements BuildingsSource {
  readonly name: string;
  private readonly sources: BuildingsSource[];

  constructor(opts: CompositeBuildingsSourceOptions) {
    this.sources = opts.sources;
    this.name =
      COMPOSITE_NAME_PREFIX + this.sources.map((s) => s.name).join("+");
  }

  async fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]> {
    if (this.sources.length === 0) return [];

    const settled = await Promise.all(
      this.sources.map((source) =>
        source.fetchBuildings(bbox, opts).then(
          (buildings) => ({ source, buildings }),
          (err: unknown) => {
            console.warn(
              `CompositeBuildingsSource: source '${source.name}' failed:`,
              err instanceof Error ? err.message : err,
            );
            return { source, buildings: [] as Building[] };
          },
        ),
      ),
    );

    // Children are already sorted by id (see BuildingsSource contract),
    // so iterating in constructor order and dedup'ing as we go yields a
    // stable, predictable output for caching layers. The dedupe now
    // prefers higher-confidence `heightSource` per
    // `dedupeByCentroidAndPreferHeight` below.
    const combined: Building[] = [];
    for (const { buildings } of settled) {
      for (const building of buildings) combined.push(building);
    }
    return dedupeByCentroidAndPreferHeight(combined, DEDUPE_CENTROID_METERS);
  }
}

/**
 * Factory mirroring the `createOverpassBuildingsSource` / `createDefault*`
 * shape. Returns a fresh `CompositeBuildingsSource` on every call so
 * callers (and tests) can own the lifecycle of the underlying children.
 */
export function createCompositeBuildingsSource(
  sources: BuildingsSource[],
): CompositeBuildingsSource {
  return new CompositeBuildingsSource({ sources });
}
