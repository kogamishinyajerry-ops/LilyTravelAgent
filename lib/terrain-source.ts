// Terrain source abstraction.
//
// Phase C of the real-scenic-preview roadmap (see
// docs/design/real-scenic-preview-roadmap.md) calls for scaffolding the
// terrain pipeline without yet wiring up a real data provider. The
// interface below lets the scene-rendering layer ask "give me elevation
// for this region" without caring whether the answer comes from
// terrain-rgb, Mapbox Terrain, MapTiler, or a procedural fallback.
//
// The default export is a no-op source that always returns an empty
// array. Real sources will be plugged in later by swapping
// `createDefaultTerrainSource` (or by passing a different `TerrainSource`
// instance into the renderer). The empty-array contract means callers
// can branch on `result.length === 0` and gracefully fall back to
// procedural heightfields without further work.

import type { BBox, TileCoord } from "./tile-coords";

/**
 * A slippy-map tile coordinate (integer x/y at zoom z).
 *
 * Re-exported from `tile-coords` so consumers that only need terrain do
 * not have to import the coordinate utilities.
 */
export type { BBox, TileCoord } from "./tile-coords";

/**
 * A terrain height sample. Values are meters above the WGS84 ellipsoid.
 * Stored as a typed array for compactness — a 256x256 tile at 1 sample
 * per pixel is 256KB, which is what most tile-rgb decoders emit.
 */
export type TerrainTile = {
  /** Geographic bbox covered by this tile, in WGS84 degrees. */
  bbox: BBox;
  /** Row-major elevation samples, length = size * size. */
  elevation: Float32Array;
  /** The slippy tile this heightfield was extracted from. */
  tile: TileCoord;
  /**
   * Identifier of the upstream data source (e.g. "mapbox", "maptiler",
   * "terrain-rgb", "procedural", "none"). Useful for caching and for
   * the on-screen source badge in the dream UI.
   */
  source: string;
};

/** Options accepted by a `TerrainSource.fetchTerrain` call. */
export type FetchTerrainOptions = {
  /**
   * Slippy-map zoom level to request. Real sources should clamp to the
   * zoom range they actually support (most terrain-rgb endpoints cap at
   * z=15). The no-op source ignores this argument.
   */
  z: number;
  /**
   * Edge length of the returned `elevation` grid, in samples. Defaults
   * to 256 to match the canonical slippy tile size. Real sources may
   * resample to this resolution.
   */
  size?: number;
};

/**
 * A pluggable terrain data source. Implementations should be safe to
 * call concurrently and should resolve to an empty array (rather than
 * rejecting) when the requested region is unsupported or rate-limited —
 * the renderer is responsible for the procedural fallback.
 */
export interface TerrainSource {
  /** Short human-readable identifier (e.g. "noop", "mapbox"). */
  name: string;
  /**
   * Fetch every terrain tile that covers `bbox` at the given zoom. The
   * returned tiles should be sorted deterministically (e.g. by
   * tile.x, then tile.y) so that caching layers can rely on the order.
   */
  fetchTerrain(bbox: BBox, opts: FetchTerrainOptions): Promise<TerrainTile[]>;
}

/**
 * No-op source. Always returns an empty array so the renderer falls
 * back to its procedural heightfield. Used as the default until a real
 * provider is wired in.
 */
export const NoopTerrainSource: TerrainSource = {
  name: "noop",
  async fetchTerrain(bbox: BBox, opts: FetchTerrainOptions): Promise<TerrainTile[]> {
    void bbox;
    void opts;
    return [];
  },
};

/**
 * Factory for the default terrain source. Currently returns the
 * no-op source; later phases will branch here on env / config to
 * pick Mapbox / MapTiler / terrain-rgb.
 */
export function createDefaultTerrainSource(): TerrainSource {
  // TODO(phase-c): when the tile-server credentials are wired up,
  // return a real TerrainSource here. Candidates:
  //   - Mapbox Terrain-RGB (requires MAPBOX_TOKEN)
  //   - MapTiler Terrain (requires MAPTILER_KEY)
  //   - AWS Terrain Tiles / OpenTopoMap
  // The real source should still resolve to [] on failure so the
  // renderer can fall back to procedural heightfields.
  return NoopTerrainSource;
}
