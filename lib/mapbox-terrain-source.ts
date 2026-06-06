// Real TerrainSource implementation backed by the Mapbox terrain-rgb tile
// service. The encoding documented at
//   https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-rgb-v1/
// packs elevation (meters above the WGS84 ellipsoid) into the three
// 8-bit RGB channels of a 256x256 PNG:
//
//   height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
//
// No special access is required beyond a Mapbox access token — the
// `mapbox.terrain-rgb` tileset is part of the default public tileset set
// for any Mapbox account. We deliberately keep this file self-contained
// and dependency-free: the PNG decoder below handles the subset of the
// PNG spec that Mapbox actually emits (8-bit RGB, no interlace, single
// IDAT chunk in zlib stream form) without pulling in `pngjs` or a Web
// Assembly decoder.

import {
  bboxToTiles,
  tileToBBox,
  type BBox,
  type TileCoord,
} from "./tile-coords";
import type {
  FetchTerrainOptions,
  TerrainSource,
  TerrainTile,
} from "./terrain-source";

/** Maximum number of tiles we are willing to fetch in a single call. */
export const MAPBOX_MAX_TILES = 64;

/** Hard clamp for the slippy-map zoom level accepted by Mapbox. */
const MAX_ZOOM = 22;
const MIN_ZOOM = 0;

/** Default tileset name; exposed as a constant for tests / overrides. */
export const DEFAULT_NAME = "mapbox-terrain-rgb";

/** Default Mapbox endpoint, parameterised by zoom/x/y. */
export const DEFAULT_ENDPOINT = "https://api.mapbox.com/v4/mapbox.terrain-rgb";

/** Decode a terrain-rgb pixel to meters above the WGS84 ellipsoid. */
export function decodeTerrainRgbPixel(
  r: number,
  g: number,
  b: number,
): number {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  const zi = Math.floor(z);
  if (zi < MIN_ZOOM) return MIN_ZOOM;
  if (zi > MAX_ZOOM) return MAX_ZOOM;
  return zi;
}

/** Compute the next PNG signature byte position; used by the parser. */
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Minimal in-memory inflater. We piggy-back on Node's `zlib` when running
 * server-side, and on the browser's `DecompressionStream('deflate')` API
 * when running client-side. The Mapbox endpoint always emits zlib-wrapped
 * deflate data, which is the format both of these accept.
 */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof (globalThis as { zlib?: { inflateSync?: (b: Uint8Array) => Uint8Array } }).zlib?.inflateSync === "function") {
    // Node.js path. We use sync inflate because the IDAT payload for a
    // 256x256 RGB tile is well under the 4 MB default heap limit and
    // completes in microseconds.
    const zlib = (globalThis as unknown as {
      zlib: { inflateSync: (b: Uint8Array) => Uint8Array };
    }).zlib;
    return zlib.inflateSync(bytes);
  }
  if (typeof DecompressionStream !== "undefined") {
    // Browser path. Copy into a fresh ArrayBuffer to satisfy TS strict
    // typing (Uint8Array<ArrayBufferLike> is not assignable to
    // Uint8Array<ArrayBuffer> in lib.dom).
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    void writer.write(copy);
    void writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return out;
  }
  throw new Error(
    "MapboxTerrainSource: no deflate implementation available in this runtime",
  );
}

/**
 * Decode a 256x256 RGB PNG into a Float32Array of terrain elevations.
 * Supports the subset of the PNG spec that the Mapbox terrain-rgb
 * tileset actually emits: 8-bit color type 2 (RGB), no interlace, a
 * single IDAT chunk.
 */
export async function decodeTerrainRgb(
  pngBytes: Uint8Array,
): Promise<Float32Array> {
  if (pngBytes.byteLength < 8 + 25) {
    throw new Error("decodeTerrainRgb: input is not a PNG (too short)");
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (pngBytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error("decodeTerrainRgb: input is not a PNG (bad signature)");
    }
  }

  // Parse chunks. We collect the IDAT payload, the IHDR dimensions, and
  // bail on anything that requires color type handling beyond RGB8.
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Uint8Array[] = [];
  let pos = 8;
  while (pos < pngBytes.byteLength) {
    if (pos + 8 > pngBytes.byteLength) break;
    const length =
      (pngBytes[pos] << 24) |
      (pngBytes[pos + 1] << 16) |
      (pngBytes[pos + 2] << 8) |
      pngBytes[pos + 3];
    const type =
      String.fromCharCode(
        pngBytes[pos + 4],
        pngBytes[pos + 5],
        pngBytes[pos + 6],
        pngBytes[pos + 7],
      );
    const dataStart = pos + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > pngBytes.byteLength) break;
    if (type === "IHDR") {
      width =
        (pngBytes[dataStart] << 24) |
        (pngBytes[dataStart + 1] << 16) |
        (pngBytes[dataStart + 2] << 8) |
        pngBytes[dataStart + 3];
      height =
        (pngBytes[dataStart + 4] << 24) |
        (pngBytes[dataStart + 5] << 16) |
        (pngBytes[dataStart + 6] << 8) |
        pngBytes[dataStart + 7];
      bitDepth = pngBytes[dataStart + 8];
      colorType = pngBytes[dataStart + 9];
      interlace = pngBytes[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(pngBytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    pos = dataEnd + 4; // skip data + CRC
  }

  if (width !== 256 || height !== 256) {
    throw new Error(
      `decodeTerrainRgb: expected 256x256 tile, got ${width}x${height}`,
    );
  }
  if (bitDepth !== 8) {
    throw new Error(`decodeTerrainRgb: expected 8-bit depth, got ${bitDepth}`);
  }
  if (colorType !== 2) {
    throw new Error(
      `decodeTerrainRgb: expected color type 2 (RGB), got ${colorType}`,
    );
  }
  if (interlace !== 0) {
    throw new Error(
      `decodeTerrainRgb: interlaced PNGs are not supported (interlace=${interlace})`,
    );
  }
  if (idatChunks.length === 0) {
    throw new Error("decodeTerrainRgb: PNG contained no IDAT chunk");
  }

  // Concatenate IDAT chunks, then inflate.
  let idatLen = 0;
  for (const chunk of idatChunks) idatLen += chunk.byteLength;
  const idat = new Uint8Array(idatLen);
  let offset = 0;
  for (const chunk of idatChunks) {
    idat.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const inflated = await inflate(idat);

  // Strip the leading filter byte from each scanline.
  const rowBytes = width * 3;
  const expected = (rowBytes + 1) * height;
  if (inflated.byteLength !== expected) {
    throw new Error(
      `decodeTerrainRgb: inflated length ${inflated.byteLength} != expected ${expected}`,
    );
  }
  const out = new Float32Array(width * height);
  let src = 0;
  let dst = 0;
  for (let y = 0; y < height; y += 1) {
    src += 1; // skip this scanline's filter byte (assume filter 0 / None)
    for (let x = 0; x < width; x += 1) {
      const r = inflated[src];
      const g = inflated[src + 1];
      const b = inflated[src + 2];
      out[dst] = decodeTerrainRgbPixel(r, g, b);
      src += 3;
      dst += 1;
    }
  }
  return out;
}

export type MapboxTerrainSourceOptions = {
  /** Mapbox access token. Falls back to process.env.MAPBOX_TOKEN. */
  accessToken?: string;
  /** Override the endpoint base (useful for tests / proxies). */
  endpoint?: string;
  /** Override the human-readable name reported via `TerrainSource.name`. */
  name?: string;
};

/**
 * Real `TerrainSource` backed by the Mapbox terrain-rgb tileset.
 *
 * The constructor is intentionally cheap — it does not eagerly fetch
 * anything, it just stores configuration. The first call to
 * `fetchTerrain` is what actually hits the network. This makes the
 * source safe to construct at module load time, even when offline or
 * running in a build that strips server-only code paths.
 */
export class MapboxTerrainSource implements TerrainSource {
  readonly name: string;
  private readonly accessToken: string;
  private readonly endpoint: string;

  constructor(opts: MapboxTerrainSourceOptions) {
    const token = opts.accessToken ?? process.env.MAPBOX_TOKEN;
    if (!token) {
      throw new Error(
        "MapboxTerrainSource requires MAPBOX_TOKEN env var or accessToken option",
      );
    }
    this.accessToken = token;
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
    if (tiles.length > MAPBOX_MAX_TILES) {
      throw new RangeError(
        `MapboxTerrainSource: request covers ${tiles.length} tiles at z=${z}, ` +
          `exceeding the ${MAPBOX_MAX_TILES}-tile rate-limit guard. ` +
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
      `${this.endpoint}/${tile.z}/${tile.x}/${tile.y}.pngraw` +
      `?access_token=${encodeURIComponent(this.accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `MapboxTerrainSource: HTTP ${res.status} ${res.statusText} for ${tile.z}/${tile.x}/${tile.y}`,
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
 * Factory mirroring the `createDefaultTerrainSource` shape. Returns a
 * `MapboxTerrainSource` when a token is available (env or argument),
 * otherwise throws a clear, actionable error.
 */
export function createMapboxTerrainSource(
  opts: MapboxTerrainSourceOptions = {},
): MapboxTerrainSource {
  return new MapboxTerrainSource(opts);
}
