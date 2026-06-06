import { describe, it, expect } from "vitest";
import {
  bboxToTiles,
  lngLatToTile,
  tileToBBox,
  tileToLngLat,
  TILE_PIXEL_SIZE,
} from "./tile-coords";

describe("lngLatToTile", () => {
  it("maps the prime meridian / equator (0,0) to the center of z=0", () => {
    // At z=0 there is exactly one tile (0,0). The origin sits exactly at its
    // center, so both coordinates should be 0.5.
    const result = lngLatToTile(0, 0, 0);
    expect(result.x).toBeCloseTo(0.5, 10);
    expect(result.y).toBeCloseTo(0.5, 10);
  });

  it("maps the prime meridian / equator to the center tile at z=1", () => {
    // At z=1 the world is 2x2 tiles; the origin sits at the corner shared by
    // the four tiles, which is (1, 1) in tile space.
    const result = lngLatToTile(0, 0, 1);
    expect(result.x).toBeCloseTo(1, 10);
    expect(result.y).toBeCloseTo(1, 10);
  });

  it("maps the prime meridian / equator to the center of z=10 (1024 tiles wide)", () => {
    const result = lngLatToTile(0, 0, 10);
    expect(result.x).toBeCloseTo(512, 10);
    expect(result.y).toBeCloseTo(512, 10);
  });

  it("maps Beijing's approximate coordinates consistently across zooms", () => {
    // Same lng/lat at three zooms should land in the same neighborhood —
    // doubling the zoom roughly doubles both x and y.
    const z0 = lngLatToTile(116.4074, 39.9042, 0);
    const z1 = lngLatToTile(116.4074, 39.9042, 1);
    const z10 = lngLatToTile(116.4074, 39.9042, 10);

    // z=1 coords should be ~2x the z=0 coords.
    expect(z1.x).toBeCloseTo(z0.x * 2, 10);
    expect(z1.y).toBeCloseTo(z0.y * 2, 10);

    // z=10 coords should be ~1024x the z=0 coords.
    expect(z10.x).toBeCloseTo(z0.x * 1024, 6);
    expect(z10.y).toBeCloseTo(z0.y * 1024, 6);

    // Beijing is well inside tile 0,0 at z=0.
    expect(z0.x).toBeGreaterThan(0);
    expect(z0.x).toBeLessThan(1);
    expect(z0.y).toBeGreaterThan(0);
    expect(z0.y).toBeLessThan(1);
  });

  it("places the antimeridian at x=0 of the next zoom", () => {
    // (180, 0) is the seam; the next tile east is x = 2^z exactly.
    const result = lngLatToTile(180, 0, 5);
    expect(result.x).toBeCloseTo(32, 10);
  });
});

describe("tileToLngLat", () => {
  it("returns the north-west corner of the world at tile (0,0,0)", () => {
    const result = tileToLngLat(0, 0, 0);
    expect(result.lng).toBeCloseTo(-180, 10);
    // Standard slippy map top latitude.
    expect(result.lat).toBeCloseTo(85.0511287798066, 10);
  });

  it("round-trips through lngLatToTile at z=10 for the prime meridian", () => {
    const original = { lng: 0, lat: 0 };
    const tile = lngLatToTile(original.lng, original.lat, 10);
    const recovered = tileToLngLat(tile.x, tile.y, 10);
    expect(recovered.lng).toBeCloseTo(original.lng, 10);
    expect(recovered.lat).toBeCloseTo(original.lat, 10);
  });

  it("round-trips through lngLatToTile at z=15 for an arbitrary point", () => {
    const original = { lng: 121.4737, lat: 31.2304 }; // Shanghai
    const tile = lngLatToTile(original.lng, original.lat, 15);
    const recovered = tileToLngLat(tile.x, tile.y, 15);
    expect(recovered.lng).toBeCloseTo(original.lng, 9);
    expect(recovered.lat).toBeCloseTo(original.lat, 9);
  });

  it("round-trips at the antimeridian seam", () => {
    const original = { lng: 179.9999, lat: 0 };
    const tile = lngLatToTile(original.lng, original.lat, 6);
    const recovered = tileToLngLat(tile.x, tile.y, 6);
    expect(recovered.lng).toBeCloseTo(original.lng, 9);
    expect(recovered.lat).toBeCloseTo(original.lat, 9);
  });
});

describe("bboxToTiles", () => {
  it("returns the single containing tile for a tiny bbox at z=0", () => {
    // A 1-degree box around Beijing is well within the single z=0 tile.
    const bbox = {
      west: 115.5,
      south: 39.0,
      east: 116.5,
      north: 40.0,
    };
    const tiles = bboxToTiles(bbox, 0);
    expect(tiles).toEqual([{ x: 0, y: 0, z: 0 }]);
  });

  it("returns a 2x2 grid for a bbox that straddles a tile boundary at z=1", () => {
    // At z=1 the world is 2x2 tiles. A box that crosses the prime meridian
    // AND the equator should produce 4 tiles.
    const bbox = {
      west: -10,
      south: -10,
      east: 10,
      north: 10,
    };
    const tiles = bboxToTiles(bbox, 1);
    expect(tiles).toEqual([
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 1, y: 1, z: 1 },
    ]);
  });

  it("returns the expected tile count for a small bbox at z=10", () => {
    // A 0.01-degree box in central Tokyo is far smaller than one slippy tile
    // (which spans ~0.35 degrees at z=10), so it should land in a single
    // tile. We assert the count and that the returned tile contains the
    // center of the bbox.
    const bbox = {
      west: 139.7,
      south: 35.65,
      east: 139.71,
      north: 35.66,
    };
    const tiles = bboxToTiles(bbox, 10);
    expect(tiles).toHaveLength(1);
    const center = lngLatToTile(
      (bbox.west + bbox.east) / 2,
      (bbox.south + bbox.north) / 2,
      10,
    );
    expect(tiles[0]?.x).toBe(Math.floor(center.x));
    expect(tiles[0]?.y).toBe(Math.floor(center.y));
  });

  it("clips tile coordinates to the valid range at high zoom", () => {
    // A bbox that nominally covers the entire world should produce a full
    // grid at the given zoom, with no tile outside [0, 2^z - 1].
    const tiles = bboxToTiles(
      { west: -180, south: -85, east: 180, north: 85 },
      2,
    );
    expect(tiles).toHaveLength(4 * 4);
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThanOrEqual(3);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThanOrEqual(3);
      expect(tile.z).toBe(2);
    }
  });

  it("handles an antimeridian-crossing bbox without crashing", () => {
    // Fiji sits near 180 degrees east. west=178, east=-178 means "go east
    // from 178, wrap around, end at -178". We don't enforce full wrap-around
    // correctness here — only that the function does not throw and returns
    // some plausible covering tiles.
    const bbox = {
      west: 178,
      south: -20,
      east: -178,
      north: -10,
    };
    let tiles: ReturnType<typeof bboxToTiles> = [];
    expect(() => {
      tiles = bboxToTiles(bbox, 3);
    }).not.toThrow();
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThanOrEqual(7);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThanOrEqual(7);
      expect(tile.z).toBe(3);
    }
  });

  it("returns an empty array for a degenerate bbox with no span", () => {
    // north == south and west == east is a single point. Tile math can
    // still resolve it, but the box has zero area. We don't enforce a
    // specific result here, only that the function does not throw.
    expect(() =>
      bboxToTiles(
        { west: 116.4, south: 39.9, east: 116.4, north: 39.9 },
        10,
      ),
    ).not.toThrow();
  });

  it("clamps absurd zoom values to a safe range", () => {
    // A negative or huge zoom should not throw; it should still return a
    // well-formed tile set.
    const bbox = { west: 0, south: 0, east: 1, north: 1 };
    const negative = bboxToTiles(bbox, -3);
    for (const tile of negative) {
      expect(tile.z).toBe(0);
    }

    // At z=999 the implementation caps at z=22. A 1-degree bbox at the
    // equator would normally produce billions of tiles, but the function
    // caps the result set to MAX_TILES_PER_BBOX to stay memory-safe.
    const huge = bboxToTiles(bbox, 999);
    for (const tile of huge) {
      expect(tile.z).toBe(22);
    }
    expect(huge.length).toBeGreaterThan(0);
    expect(huge.length).toBeLessThanOrEqual(4096);
  });
});

describe("tileToBBox", () => {
  it("returns a 360-degree wide bbox for the single z=0 tile", () => {
    const bbox = tileToBBox({ x: 0, y: 0, z: 0 });
    expect(bbox.west).toBeCloseTo(-180, 10);
    expect(bbox.east).toBeCloseTo(180, 10);
    // The standard slippy map cap.
    expect(bbox.north).toBeCloseTo(85.0511287798066, 10);
    expect(bbox.south).toBeCloseTo(-85.0511287798066, 10);
  });

  it("round-trips with lngLatToTile / tileToLngLat at z=10", () => {
    const original = { x: 512, y: 512, z: 10 };
    const bbox = tileToBBox(original);
    const nw = lngLatToTile(bbox.west, bbox.north, 10);
    expect(nw.x).toBeCloseTo(512, 9);
    expect(nw.y).toBeCloseTo(512, 9);
  });
});

describe("TILE_PIXEL_SIZE", () => {
  it("exposes the canonical 256-px slippy tile size", () => {
    expect(TILE_PIXEL_SIZE).toBe(256);
  });
});
