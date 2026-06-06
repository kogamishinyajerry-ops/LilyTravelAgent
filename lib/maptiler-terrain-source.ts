// Real TerrainSource implementation backed by the MapTiler terrain-rgb tile
// service. MapTiler's terrain-rgb tileset uses the same RGB encoding as
// Mapbox (https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-rgb-v1/),
// so we reuse the `decodeTerrainRgb` helper from the Mapbox source verbatim
// — there is no need to maintain a second PNG parser. The only differences
// are the URL template and the credential name:
//
//   https://api.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png?key=KEY
//
// All real work (HTTP fetch, bbox -> slippy tile expansion, RGB -> meters
// conversion) is shared with the Mapbox implementation.

import {
  bboxToTiles,
  tileToBBox,
  type BBox,
  type TileCoord,
} from "./tile-coords";
import { decodeTerrainRgb } from "./mapbox-terrain-source";
import type {
  FetchTerrainOptions,
  TerrainSource,
  TerrainTile,
} from "./terrain-source";

/** Maximum number of tiles we are willing to fetch in a single call. */
export const MAPTILER_MAX_TILES = 64;

/** Hard clamp for the slippy-map zoom level accepted by MapTiler. */
const MAX_ZOOM = 14;
const MIN_ZOOM = 0;

/** Default tileset name; exposed as a constant for tests / overrides. */
export const DEFAULT_NAME = "maptiler-terrain-rgb";

/** Default MapTiler endpoint, parameterised by zoom/x/y. */
export const DEFAULT_ENDPOINT =
  "https://api.maptiler.com/tiles/terrain-rgb";

function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  const zi = Math.floor(z);
  if (zi < MIN_ZOOM) return MIN_ZOOM;
  if (zi > MAX_ZOOM) return MAX_ZOOM;
  return zi;
}

export type MapTilerTerrainSourceOptions = {
  /** MapTiler API key. Falls back to process.env.MAPTILER_KEY. */
  apiKey?: string;
  /** Override the endpoint base (useful for tests / proxies). */
  endpoint?: string;
  /** Override the human-readable name reported via `TerrainSource.name`. */
  name?: string;
};

/**
 * Real `TerrainSource` backed by the MapTiler terrain-rgb tileset.
 *
 * The constructor is intentionally cheap — it does not eagerly fetch
 * anything, it just stores configuration. The first call to
 * `fetchTerrain` is what actually hits the network. This makes the
 * source safe to construct at module load time, even when offline or
 * running in a build that strips server-only code paths.
 */
export class MapTilerTerrainSource implements TerrainSource {
  readonly name: string;
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(opts: MapTilerTerrainSourceOptions) {
    const key = opts.apiKey ?? process.env.MAPTILER_KEY;
    if (!key) {
      throw new Error(
        "MapTilerTerrainSource requires MAPTILER_KEY env var or apiKey option",
      );
    }
    this.apiKey = key;
    this.endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    this.name = opts.name ?? DEFAULT_NAME;
  }

  /**
   * Fetch every terrain-rgb tile that covers `bbox` at the requested
   * zoom level. Tiles are returned sorted by (z, x, y) so that caching
   * layers see a stable order.
   */
  async fetchTerrain(
    bbox: BBox,
    opts: FetchTerrainOptions,
  ): Promise<TerrainTile[]> {
    const z = clampZoom(opts.z ?? 12);
    const tiles: TileCoord[] = bboxToTiles(bbox, z);
    if (tiles.length === 0) return [];
    if (tiles.length > MAPTILER_MAX_TILES) {
      throw new RangeError(
        `MapTilerTerrainSource: request covers ${tiles.length} tiles at z=${z}, ` +
          `exceeding the ${MAPTILER_MAX_TILES}-tile rate-limit guard. ` +
          `Lower the zoom level or shrink the bbox.`,
      );
    }

    // tiles from bboxToTiles are already z-then-x-then-y sorted.
    const results = await Promise.all(
      tiles.map((tile) => this.fetchOne(tile)),
    );
    return results;
  }

  private async fetchOne(tile: TileCoord): Promise<TerrainTile> {
    const url =
      `${this.endpoint}/${tile.z}/${tile.x}/${tile.y}.png` +
      `?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `MapTilerTerrainSource: HTTP ${res.status} ${res.statusText} for ${tile.z}/${tile.x}/${tile.y}`,
      );
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const elevation = await decodeTerrainRgb(buf);
    return {
      bbox: tileToBBox(tile),
      elevation,
      tile,
      source: this.name,
    };
  }
}

/**
 * Factory mirroring the `createMapboxTerrainSource` shape. Returns a
 * `MapTilerTerrainSource` when a key is available (env or argument),
 * otherwise throws a clear, actionable error.
 */
export function createMapTilerTerrainSource(
  opts: MapTilerTerrainSourceOptions = {},
): MapTilerTerrainSource {
  return new MapTilerTerrainSource(opts);
}
