import { describe, it, expect } from "vitest";
import {
  NoopTerrainSource,
  createDefaultTerrainSource,
  type BBox,
  type FetchTerrainOptions,
} from "./terrain-source";

describe("NoopTerrainSource", () => {
  it("returns an empty array for any bbox and options", async () => {
    const bbox: BBox = { west: -180, south: -85, east: 180, north: 85 };
    const opts: FetchTerrainOptions = { z: 10, size: 256 };
    const result = await NoopTerrainSource.fetchTerrain(bbox, opts);
    expect(result).toEqual([]);
  });

  it("ignores bbox parameters", async () => {
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const opts: FetchTerrainOptions = { z: 15 };
    const result = await NoopTerrainSource.fetchTerrain(bbox, opts);
    expect(result).toEqual([]);
  });

  it("has name 'noop'", () => {
    expect(NoopTerrainSource.name).toBe("noop");
  });
});

describe("createDefaultTerrainSource", () => {
  it("returns an instance with name 'noop'", () => {
    const source = createDefaultTerrainSource();
    expect(source.name).toBe("noop");
  });

  it("returns a functional source (not null or undefined)", () => {
    const source = createDefaultTerrainSource();
    expect(source).toBeDefined();
    expect(typeof source.fetchTerrain).toBe("function");
  });

  it("returned source behaves like NoopTerrainSource", async () => {
    const source = createDefaultTerrainSource();
    const bbox: BBox = { west: 0, south: 0, east: 1, north: 1 };
    const opts: FetchTerrainOptions = { z: 5 };
    const result = await source.fetchTerrain(bbox, opts);
    expect(result).toEqual([]);
  });
});
