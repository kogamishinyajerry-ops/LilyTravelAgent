import { describe, it, expect } from "vitest";
import {
  NoopBuildingsSource,
  createDefaultBuildingsSource,
  type BBox,
  type FetchBuildingsOptions,
} from "./buildings-source";

describe("NoopBuildingsSource", () => {
  it("returns an empty array for any bbox and options", async () => {
    const bbox: BBox = { west: -180, south: -85, east: 180, north: 85 };
    const opts: FetchBuildingsOptions = { limit: 5000 };
    const result = await NoopBuildingsSource.fetchBuildings(bbox, opts);
    expect(result).toEqual([]);
  });

  it("ignores bbox parameters", async () => {
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const opts: FetchBuildingsOptions = {};
    const result = await NoopBuildingsSource.fetchBuildings(bbox, opts);
    expect(result).toEqual([]);
  });

  it("has name 'noop'", () => {
    expect(NoopBuildingsSource.name).toBe("noop");
  });
});

describe("createDefaultBuildingsSource", () => {
  it("returns an instance with name 'noop'", () => {
    const source = createDefaultBuildingsSource();
    expect(source.name).toBe("noop");
  });

  it("returns a functional source (not null or undefined)", () => {
    const source = createDefaultBuildingsSource();
    expect(source).toBeDefined();
    expect(typeof source.fetchBuildings).toBe("function");
  });

  it("returned source behaves like NoopBuildingsSource", async () => {
    const source = createDefaultBuildingsSource();
    const bbox: BBox = { west: 0, south: 0, east: 1, north: 1 };
    const opts: FetchBuildingsOptions = {};
    const result = await source.fetchBuildings(bbox, opts);
    expect(result).toEqual([]);
  });
});
