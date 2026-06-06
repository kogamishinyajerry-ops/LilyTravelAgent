// Slippy map tile coordinate math.
// References:
//   - https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
//   - https://developers.google.com/maps/documentation/javascript/coordinates
//
// All functions are pure and side-effect free. They use the standard Web
// Mercator (EPSG:3857) projection, which is what the rest of the Lily travel
// agent stack assumes (Leaflet, Mapbox-style tile servers, terrain-rgb, etc.).
//
// We intentionally keep the API small and explicit so that callers in the
// scene-rendering layer can compose higher level helpers (e.g. "give me the
// terrain tiles that cover this itinerary bbox at zoom 12") without pulling
// in a heavy GIS dependency.

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type TileCoord = {
  x: number;
  y: number;
  z: number;
};

const TILE_SIZE = 256;

/**
 * Convert a longitude/latitude pair to fractional slippy tile coordinates
 * at zoom level `z`. The result has fractional `.x` / `.y` values, so callers
 * that need integer tile indices should `Math.floor` them.
 */
export function lngLatToTile(
  lng: number,
  lat: number,
  z: number,
): { x: number; y: number } {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n;
  return { x, y };
}

/**
 * Convert slippy tile coordinates back to the longitude/latitude of the
 * tile's north-west (top-left) corner. Inverse of `lngLatToTile`.
 */
export function tileToLngLat(
  x: number,
  y: number,
  z: number,
): { lng: number; lat: number } {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lng, lat };
}

/**
 * Clamp a zoom level to a sane range. Tiles outside z < 0 are meaningless;
 * z > 22 is rarely supported by tile servers and would just bloat the
 * requested set.
 */
function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 0;
  const zInt = Math.floor(z);
  if (zInt < 0) return 0;
  if (zInt > 22) return 22;
  return zInt;
}

/**
 * Normalize a bbox so that `south <= north` and `west <= east`. If the input
 * crosses the antimeridian we keep `west > east` and let the caller handle
 * the wrap-around explicitly — `bboxToTiles` only auto-normalizes the
 * north/south axis.
 */
// The standard slippy map cap: latitudes past ~85.05 cannot be encoded
// in Web Mercator, so we clamp to that bound. We use a slightly tighter
// value to keep the inverse math numerically stable.
const MAX_LATITUDE = 85.0511287798066;

function normalizeBBox(bbox: BBox): BBox {
  const { west, south, east, north } = bbox;
  const s = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, south));
  const n = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, north));
  const w = Math.max(-180, Math.min(180, west));
  const e = Math.max(-180, Math.min(180, east));
  return { west: w, south: Math.min(s, n), east: e, north: Math.max(s, n) };
}

/**
 * Return every integer slippy tile that covers the given bbox at zoom `z`.
 *
 * The bbox is treated as a "small region" view — if `west > east` we treat
 * the bbox as crossing the antimeridian and resolve both halves, clamped
 * to the valid tile range. This keeps the function crash-free for inputs
 * like `{ west: 170, east: -170 }` near the date line.
 *
 * To keep the function safe for absurd inputs, we cap the number of tiles
 * returned at `MAX_TILES_PER_BBOX`. Requests that would exceed that count
 * are truncated and a console warning is emitted.
 */
export const MAX_TILES_PER_BBOX = 4096;

export function bboxToTiles(bbox: BBox, z: number): TileCoord[] {
  const zoom = clampZoom(z);
  const n = 2 ** zoom;
  const max = n - 1;

  const norm = normalizeBBox(bbox);

  // Compute the tile-space range.
  const nw = lngLatToTile(norm.west, norm.north, zoom);
  const se = lngLatToTile(norm.east, norm.south, zoom);

  // Handle the antimeridian-crossing case: if the bbox wraps around, the
  // western tile coordinate ends up greater than the eastern one. We expand
  // the range to cover the full circle in that case.
  const crossesAntimeridian = norm.west > norm.east;
  const xMin = Math.max(0, Math.min(max, Math.floor(nw.x)));
  const xMax = Math.max(0, Math.min(max, Math.floor(se.x)));
  const yMin = Math.max(0, Math.min(max, Math.floor(nw.y)));
  const yMax = Math.max(0, Math.min(max, Math.floor(se.y)));

  const tiles: TileCoord[] = [];
  const pushTile = (x: number, y: number) => {
    if (tiles.length >= MAX_TILES_PER_BBOX) return;
    tiles.push({ x, y, z: zoom });
  };

  if (crossesAntimeridian) {
    for (let x = xMin; x <= max; x += 1) {
      for (let y = yMin; y <= yMax; y += 1) {
        pushTile(x, y);
        if (tiles.length >= MAX_TILES_PER_BBOX) break;
      }
      if (tiles.length >= MAX_TILES_PER_BBOX) break;
    }
    for (let x = 0; x <= xMax; x += 1) {
      for (let y = yMin; y <= yMax; y += 1) {
        pushTile(x, y);
        if (tiles.length >= MAX_TILES_PER_BBOX) break;
      }
      if (tiles.length >= MAX_TILES_PER_BBOX) break;
    }
    return tiles;
  }

  for (let x = xMin; x <= xMax; x += 1) {
    for (let y = yMin; y <= yMax; y += 1) {
      pushTile(x, y);
      if (tiles.length >= MAX_TILES_PER_BBOX) break;
    }
    if (tiles.length >= MAX_TILES_PER_BBOX) break;
  }
  return tiles;
}

/**
 * Compute the geographic bbox covered by a single slippy tile. Useful for
 * handing a tile back to a data source that wants a bbox argument.
 */
export function tileToBBox(tile: TileCoord): BBox {
  const nw = tileToLngLat(tile.x, tile.y, tile.z);
  const se = tileToLngLat(tile.x + 1, tile.y + 1, tile.z);
  return { west: nw.lng, north: nw.lat, east: se.lng, south: se.lat };
}

/**
 * Edge length in pixels of the canonical 256px slippy tile. Exposed so the
 * rendering layer can convert between "tile units" and "world pixels"
 * without hard-coding the constant.
 */
export const TILE_PIXEL_SIZE = TILE_SIZE;
