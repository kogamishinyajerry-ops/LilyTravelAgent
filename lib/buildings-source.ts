// Building outline source abstraction.
//
// Phase C of the real-scenic-preview roadmap (see
// docs/design/real-scenic-preview-roadmap.md) calls for scaffolding the
// building pipeline. The default implementation is a no-op so the
// scene-rendering layer can call it unconditionally and gracefully fall
// back to procedural city blocks when no real data is available.
//
// Real sources to consider later:
//   - OpenStreetMap Overpass API (global, no auth, rate-limited)
//   - 高德 / Amap 3D building outlines (best coverage in mainland China)
//   - Mapbox Buildings, Overture Maps, Microsoft Building Footprints
//
// All sources should normalize their output to the `Building` type
// defined here, so the renderer does not have to know which upstream
// provider answered.

import type { BBox } from "./tile-coords";

/** Re-exported so building consumers don't need to import tile-coords. */
export type { BBox, TileCoord } from "./tile-coords";

/** A vertex in a building's footprint polygon, in WGS84 degrees. */
export type FootprintVertex = {
  lng: number;
  lat: number;
};

/**
 * A single building record.
 *
 * `id` should be stable across requests for the same building so the
 * renderer can deduplicate and so the dream UI can highlight specific
 * landmarks. `footprint` is a polygon expressed as lng/lat vertices in
 * the same coordinate space as `lng`/`lat` (WGS84). `tags` carries
 * through upstream metadata (OSM tags, 高德 type codes, etc.) for
 * downstream consumers that care about land use, height, or names.
 */
export type Building = {
  id: string;
  lng: number;
  lat: number;
  heightMeters: number;
  footprint: FootprintVertex[];
  tags: Record<string, string>;
};

/** Options accepted by a `BuildingsSource.fetchBuildings` call. */
export type FetchBuildingsOptions = {
  /**
   * Maximum number of buildings to return. Sources should respect this
   * (e.g. by truncating the Overpass `out` clause) so a dense urban
   * bbox cannot OOM the renderer. Defaults to 5000.
   */
  limit?: number;
};

/**
 * Pluggable building data source. Implementations should resolve to an
 * empty array (not reject) when the region is unsupported, the request
 * is rate-limited, or the upstream tile is empty.
 */
export interface BuildingsSource {
  /** Short human-readable identifier (e.g. "noop", "overpass", "amap"). */
  name: string;
  /**
   * Fetch every building whose footprint intersects `bbox`. The
   * returned buildings should be sorted deterministically (by `id`) so
   * caching layers can rely on the order.
   */
  fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]>;
}

/**
 * No-op source. Always returns an empty array so the renderer falls
 * back to its procedural city skyline. Used as the default until a
 * real provider is wired in.
 */
export const NoopBuildingsSource: BuildingsSource = {
  name: "noop",
  async fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]> {
    void bbox;
    void opts;
    return [];
  },
};

/**
 * Factory for the default buildings source. Currently returns the
 * no-op source; later phases will branch here on env / config / locale
 * to pick OSM Overpass (global) or 高德 3D (mainland China friendly).
 */
export function createDefaultBuildingsSource(): BuildingsSource {
  // TODO(phase-c): when the building-source credentials are wired up,
  // return a real BuildingsSource here. Candidates:
  //   - OSM Overpass (no auth, but rate-limited; good for non-China trips)
  //   - 高德 / Amap 3D building outlines (best for mainland China, requires key)
  //   - Overture Maps / Microsoft Building Footprints (global, bulk download)
  // The real source should still resolve to [] on failure so the
  // renderer can fall back to procedural city blocks.
  return NoopBuildingsSource;
}
