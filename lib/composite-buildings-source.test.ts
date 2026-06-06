import { describe, it, expect, vi } from "vitest";
import {
  createCompositeBuildingsSource,
  DEDUPE_CENTROID_METERS,
  COMPOSITE_NAME_PREFIX,
  isDuplicate,
  haversineMeters,
} from "./composite-buildings-source";
import type { BBox } from "./tile-coords";
import type { Building, BuildingsSource, FetchBuildingsOptions } from "./buildings-source";

// ---------------------------------------------------------------------------
// Helper: minimal mock source
// ---------------------------------------------------------------------------

function makeMockSource(name: string, buildings: Building[]): BuildingsSource {
  return {
    name,
    fetchBuildings: vi.fn<(_bbox: BBox, _opts: FetchBuildingsOptions) => Promise<Building[]>>(
      () => Promise.resolve(buildings),
    ),
  };
}

function makeMockFailingSource(name: string, err: Error): BuildingsSource {
  return {
    name,
    fetchBuildings: vi.fn<(_bbox: BBox, _opts: FetchBuildingsOptions) => Promise<Building[]>>(
      () => Promise.reject(err),
    ),
  };
}

// ---------------------------------------------------------------------------
// Fixture buildings
// ---------------------------------------------------------------------------

/** Building near (0, 0) */
const BLDG_A: Building = {
  id: "a",
  lng: 0,
  lat: 0,
  heightMeters: 10,
  footprint: [
    { lng: -0.0001, lat: -0.0001 },
    { lng: 0.0001, lat: -0.0001 },
    { lng: 0.0001, lat: 0.0001 },
    { lng: -0.0001, lat: 0.0001 },
    { lng: -0.0001, lat: -0.0001 },
  ],
  tags: { source: "A" },
};

/** Building near (0, 0) — within DEDUPE_CENTROID_METERS of BLDG_A (~2.5 m apart) */
const BLDG_A2: Building = {
  id: "a2",
  lng: 0.00002,
  lat: 0.00002,
  heightMeters: 20,
  footprint: [
    { lng: -0.00015, lat: -0.00005 },
    { lng: 0.00015, lat: -0.00005 },
    { lng: 0.00015, lat: 0.00015 },
    { lng: -0.00015, lat: 0.00015 },
    { lng: -0.00015, lat: -0.00005 },
  ],
  tags: { source: "A2" },
};

/** Building far from (0, 0) — distinct from BLDG_A */
const BLDG_B: Building = {
  id: "b",
  lng: 0.1,
  lat: 0.1,
  heightMeters: 30,
  footprint: [
    { lng: 0.0999, lat: 0.0999 },
    { lng: 0.1001, lat: 0.0999 },
    { lng: 0.1001, lat: 0.1001 },
    { lng: 0.0999, lat: 0.1001 },
    { lng: 0.0999, lat: 0.0999 },
  ],
  tags: { source: "B" },
};

const BBOX: BBox = { west: -1, south: -1, east: 1, north: 1 };
const OPTS: FetchBuildingsOptions = {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CompositeBuildingsSource", () => {
  describe("empty sources", () => {
    it("returns [] when sources array is empty", async () => {
      const source = createCompositeBuildingsSource([]);
      const result = await source.fetchBuildings(BBOX, OPTS);
      expect(result).toEqual([]);
    });
  });

  describe("name", () => {
    it("is 'composite:' when no sources", () => {
      const source = createCompositeBuildingsSource([]);
      expect(source.name).toBe(COMPOSITE_NAME_PREFIX);
    });

    it("is composite of source names", () => {
      const s1 = makeMockSource("osm", []);
      const s2 = makeMockSource("amap", []);
      const source = createCompositeBuildingsSource([s1, s2]);
      expect(source.name).toBe("composite:osm+amap");
    });

    it("is composite of three source names", () => {
      const s1 = makeMockSource("src1", []);
      const s2 = makeMockSource("src2", []);
      const s3 = makeMockSource("src3", []);
      const source = createCompositeBuildingsSource([s1, s2, s3]);
      expect(source.name).toBe("composite:src1+src2+src3");
    });
  });

  describe("fetchBuildings", () => {
    it("merges results from 2 sources", async () => {
      const s1 = makeMockSource("osm", [BLDG_A]);
      const s2 = makeMockSource("amap", [BLDG_B]);
      const source = createCompositeBuildingsSource([s1, s2]);

      const result = await source.fetchBuildings(BBOX, OPTS);

      expect(result).toHaveLength(2);
      const ids = result.map((b) => b.id);
      expect(ids).toContain("a");
      expect(ids).toContain("b");
    });

    it("dedupes buildings by centroid within 5 metres", async () => {
      const s1 = makeMockSource("osm", [BLDG_A]);
      const s2 = makeMockSource("amap", [BLDG_A2]); // same physical building, different id
      const source = createCompositeBuildingsSource([s1, s2]);

      const result = await source.fetchBuildings(BBOX, OPTS);

      // Only one should survive (first one wins)
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("a");
    });

    it("keeps buildings farther than 5 metres apart", async () => {
      const s1 = makeMockSource("osm", [BLDG_A]);
      const s2 = makeMockSource("amap", [BLDG_B]);
      const source = createCompositeBuildingsSource([s1, s2]);

      const result = await source.fetchBuildings(BBOX, OPTS);

      expect(result).toHaveLength(2);
    });

    it("one failing source does not break the composite", async () => {
      const s1 = makeMockSource("osm", [BLDG_A]);
      const s2 = makeMockFailingSource("amap", new Error("network failure"));
      const source = createCompositeBuildingsSource([s1, s2]);

      const result = await source.fetchBuildings(BBOX, OPTS);

      // s1's building should still be returned
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("a");
    });

    it("returns [] when all sources fail", async () => {
      const s1 = makeMockFailingSource("osm", new Error("error 1"));
      const s2 = makeMockFailingSource("amap", new Error("error 2"));
      const source = createCompositeBuildingsSource([s1, s2]);

      const result = await source.fetchBuildings(BBOX, OPTS);

      expect(result).toEqual([]);
    });

    it("calls each source with the same bbox and opts", async () => {
      const s1 = makeMockSource("osm", []);
      const s2 = makeMockSource("amap", []);
      const source = createCompositeBuildingsSource([s1, s2]);

      await source.fetchBuildings(BBOX, OPTS);

      expect(s1.fetchBuildings).toHaveBeenCalledOnce();
      expect(s1.fetchBuildings).toHaveBeenCalledWith(BBOX, OPTS);
      expect(s2.fetchBuildings).toHaveBeenCalledOnce();
      expect(s2.fetchBuildings).toHaveBeenCalledWith(BBOX, OPTS);
    });
  });
});

// ---------------------------------------------------------------------------
// isDuplicate
// ---------------------------------------------------------------------------

describe("isDuplicate", () => {
  it("returns false when accepted is empty", () => {
    expect(isDuplicate(BLDG_A, [])).toBe(false);
  });

  it("returns true when candidate is within threshold of an accepted building", () => {
    expect(isDuplicate(BLDG_A2, [BLDG_A], DEDUPE_CENTROID_METERS)).toBe(true);
  });

  it("returns false when candidate is outside threshold", () => {
    expect(isDuplicate(BLDG_B, [BLDG_A], DEDUPE_CENTROID_METERS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// haversineMeters
// ---------------------------------------------------------------------------

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    const p = { lng: 116.3, lat: 39.9 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it("returns correct distance between two known points", () => {
    // Beijing (116.3, 39.9) to Tianjin (117.2, 39.1) is roughly 100 km
    const a = { lng: 116.3, lat: 39.9 };
    const b = { lng: 117.2, lat: 39.1 };
    const d = haversineMeters(a, b);
    expect(d).toBeGreaterThan(100_000);
    expect(d).toBeLessThan(130_000);
  });
});
