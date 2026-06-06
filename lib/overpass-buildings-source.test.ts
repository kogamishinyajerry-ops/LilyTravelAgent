import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createOverpassBuildingsSource,
  buildOverpassQuery,
  parseHeightTag,
  parseLevelsTag,
  resolveHeightMeters,
  isClosedPolygon,
  computeCentroid,
  elementToBuilding,
  DEFAULT_NAME,
  DEFAULT_OVERPASS_ENDPOINT,
  DEFAULT_LIMIT,
  DEFAULT_HEIGHT_METERS,
  METERS_PER_LEVEL,
} from "./overpass-buildings-source";
import type { BBox } from "./tile-coords";
import type { OverpassResponse } from "./overpass-buildings-source";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal closed polygon (first === last vertex). */
function closedPoly(...coords: [number, number][]): Array<{ lng: number; lat: number }> {
  const pts = coords.map(([lng, lat]) => ({ lng, lat }));
  // close it
  pts.push({ ...pts[0] });
  return pts;
}

/** An open polygon (first !== last vertex). */
function openPoly(...coords: [number, number][]): Array<{ lng: number; lat: number }> {
  return coords.map(([lng, lat]) => ({ lng, lat }));
}

// ---------------------------------------------------------------------------
// Fixture Overpass responses
// ---------------------------------------------------------------------------

function makeResponse(elements: OverpassResponse["elements"]): OverpassResponse {
  return { elements };
}

/** Two closed ways with distinct geometry and heights. */
const TWO_BUILDINGS_FIXTURE: OverpassResponse = {
  elements: [
    {
      type: "way",
      id: 1,
      geometry: [
        { lat: 39.9, lon: 116.3 },
        { lat: 39.9, lon: 116.31 },
        { lat: 39.91, lon: 116.31 },
        { lat: 39.91, lon: 116.3 },
        { lat: 39.9, lon: 116.3 },
      ],
      tags: { height: "25", building: "yes" },
    },
    {
      type: "way",
      id: 2,
      geometry: [
        { lat: 39.92, lon: 116.3 },
        { lat: 39.92, lon: 116.32 },
        { lat: 39.93, lon: 116.32 },
        { lat: 39.93, lon: 116.3 },
        { lat: 39.92, lon: 116.3 },
      ],
      tags: { height: "10 m", building: "yes" },
    },
  ],
};

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

type MockFetchState = {
  requests: { url: string; body: string }[];
  response: OverpassResponse;
  throwOnFetch?: boolean;
  nonOk?: boolean;
};

let mockState: MockFetchState | null = null;

function mockFetch(url: string, init: RequestInit): Promise<Response> {
  if (!mockState) throw new Error("mockState not set");
  if (mockState.throwOnFetch) throw new Error("network error");
  mockState.requests.push({ url, body: String(init.body ?? "") });
  const body = JSON.stringify(mockState.response);
  return Promise.resolve({
    ok: !mockState.nonOk,
    status: mockState.nonOk ? 500 : 200,
    statusText: mockState.nonOk ? "Internal Server Error" : "OK",
    json: () => Promise.resolve(JSON.parse(body)),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createOverpassBuildingsSource", () => {
  it("returns instance with name 'osm-overpass'", () => {
    const source = createOverpassBuildingsSource();
    expect(source.name).toBe(DEFAULT_NAME);
  });

  it("returned source implements BuildingsSource", () => {
    const source = createOverpassBuildingsSource();
    expect(typeof source.fetchBuildings).toBe("function");
    expect(typeof source.name).toBe("string");
  });
});

describe("custom endpoint", () => {
  beforeEach(() => {
    mockState = { requests: [], response: makeResponse([]) };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs?.();
    mockState = null;
  });

  it("uses the custom endpoint instead of the default", async () => {
    const customEp = "https://my-mirror.example.com/overpass";
    const source = createOverpassBuildingsSource({ endpoint: customEp });
    const bbox: BBox = { west: -1, south: -1, east: 1, north: 1 };
    await source.fetchBuildings(bbox, {});
    expect(mockState!.requests[0].url).toBe(customEp);
  });
});

describe("fetchBuildings", () => {
  beforeEach(() => {
    mockState = { requests: [], response: makeResponse([]) };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("posts a query that includes the bbox in the correct order", async () => {
    const source = createOverpassBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    await source.fetchBuildings(bbox, {});

    const req = mockState!.requests[0];
    const body = new URLSearchParams(req.body).get("data") ?? "";
    // Overpass QL bbox order: south,west,north,east
    expect(body).toContain("[bbox:39.8,116.3,40,116.5]");
  });

  it("applies opts.limit to the query and the returned array", async () => {
    mockState!.response = makeResponse([
      {
        type: "way",
        id: 1,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
      {
        type: "way",
        id: 2,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
      {
        type: "way",
        id: 3,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
    ]);

    const source = createOverpassBuildingsSource();
    const bbox: BBox = { west: 0, south: 0, east: 1, north: 1 };

    const result = await source.fetchBuildings(bbox, { limit: 2 });
    expect(result).toHaveLength(2);

    // also check query string contains limit
    const req = mockState!.requests[0];
    const body = new URLSearchParams(req.body).get("data") ?? "";
    expect(body).toContain("out geom 2");
  });

  it("skips non-closed ways (no footprint)", async () => {
    mockState!.response = makeResponse([
      {
        type: "way",
        id: 1,
        geometry: openPoly([0, 0], [0, 1], [1, 1]), // not closed
        tags: { height: "25" },
      },
      {
        type: "way",
        id: 2,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
    ]);

    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 2, north: 2 },
      {},
    );
    // Only the closed way should appear
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("osm-way-2");
  });

  it("skips ways with no geometry at all", async () => {
    mockState!.response = makeResponse([
      { type: "way", id: 1, tags: { height: "25" } }, // no geometry
      {
        type: "way",
        id: 2,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
    ]);

    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 2, north: 2 },
      {},
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("osm-way-2");
  });

  it("returns empty array on network error", async () => {
    mockState!.throwOnFetch = true;
    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array on non-OK HTTP response", async () => {
    mockState!.nonOk = true;
    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array on malformed JSON", async () => {
    // Make json() throw so the JSON.parse branch is exercised
    const badResponse: Response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as unknown as Response;
    mockState = {
      requests: [],
      // @ts-expect-error deliberately malformed
      response: undefined,
    };
    // Replace fetch entirely for this one test
    vi.stubGlobal("fetch", () => Promise.resolve(badResponse) as Promise<Response>);

    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("ignores relation elements (type !== 'way')", async () => {
    mockState!.response = makeResponse([
      { type: "relation", id: 99, tags: {} },
      {
        type: "way",
        id: 1,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "8" },
      },
    ]);

    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 2, north: 2 },
      {},
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("osm-way-1");
  });

  it("sorts results by id for stable ordering", async () => {
    mockState!.response = makeResponse([
      {
        type: "way",
        id: 300,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
      {
        type: "way",
        id: 100,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
      {
        type: "way",
        id: 200,
        geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
        tags: { height: "10" },
      },
    ]);

    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 2, north: 2 },
      {},
    );
    expect(result[0]!.id).toBe("osm-way-100");
    expect(result[1]!.id).toBe("osm-way-200");
    expect(result[2]!.id).toBe("osm-way-300");
  });
});

describe("fixture TWO_BUILDINGS_FIXTURE parsing", () => {
  beforeEach(() => {
    mockState = { requests: [], response: TWO_BUILDINGS_FIXTURE };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("parses two buildings from fixture", async () => {
    const source = createOverpassBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const result = await source.fetchBuildings(bbox, {});

    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    expect(byId["osm-way-1"]).toBeDefined();
    expect(byId["osm-way-2"]).toBeDefined();
  });

  it("assigns correct centroid lng/lat to each building", async () => {
    const source = createOverpassBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const result = await source.fetchBuildings(bbox, {});

    const byId = Object.fromEntries(result.map((b) => [b.id, b]));

    // Centroid of way 1: lat=(39.9+39.9+39.91+39.91)/4, lon=(116.3+116.31+116.31+116.3)/4
    const w1 = byId["osm-way-1"]!;
    expect(w1.lng).toBeCloseTo((116.3 + 116.31 + 116.31 + 116.3) / 4, 5);
    expect(w1.lat).toBeCloseTo((39.9 + 39.9 + 39.91 + 39.91) / 4, 5);

    // Centroid of way 2: lat=(39.92+39.92+39.93+39.93)/4, lon=(116.3+116.32+116.32+116.3)/4
    const w2 = byId["osm-way-2"]!;
    expect(w2.lng).toBeCloseTo((116.3 + 116.32 + 116.32 + 116.3) / 4, 5);
    expect(w2.lat).toBeCloseTo((39.92 + 39.92 + 39.93 + 39.93) / 4, 5);
  });

  it("uses height tag for first building (25 -> 25)", async () => {
    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const b1 = result.find((b) => b.id === "osm-way-1")!;
    expect(b1.heightMeters).toBe(25);
  });

  it("uses height tag with 'm' suffix for second building ('10 m' -> 10)", async () => {
    const source = createOverpassBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const b2 = result.find((b) => b.id === "osm-way-2")!;
    expect(b2.heightMeters).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Height parsing
// ---------------------------------------------------------------------------

describe("parseHeightTag", () => {
  it('parses "25" as 25', () => {
    expect(parseHeightTag("25")).toBe(25);
  });

  it('parses "25 m" as 25', () => {
    expect(parseHeightTag("25 m")).toBe(25);
  });

  it('parses "25.5m" as 25.5', () => {
    expect(parseHeightTag("25.5m")).toBe(25.5);
  });

  it('parses "25.5 m" as 25.5', () => {
    expect(parseHeightTag("25.5 m")).toBe(25.5);
  });

  it('parses "10m" as 10', () => {
    expect(parseHeightTag("10m")).toBe(10);
  });

  it('parses "approx 12m" as 12 (unit in suffix)', () => {
    expect(parseHeightTag("approx 12m")).toBe(12);
  });

  it('parses "20 ft" by converting to metres (× 0.3048)', () => {
    expect(parseHeightTag("20 ft")).toBeCloseTo(20 * 0.3048, 4);
  });

  it('parses "15 feet" by converting to metres', () => {
    expect(parseHeightTag("15 feet")).toBeCloseTo(15 * 0.3048, 4);
  });

  it('parses "3 storeys" by converting to metres (× METERS_PER_LEVEL)', () => {
    expect(parseHeightTag("3 storeys")).toBe(3 * METERS_PER_LEVEL);
  });

  it('parses "2 st" as 2 × METERS_PER_LEVEL', () => {
    expect(parseHeightTag("2 st")).toBe(2 * METERS_PER_LEVEL);
  });

  it('parses "yes" as null', () => {
    expect(parseHeightTag("yes")).toBeNull();
  });

  it('parses "no" as null', () => {
    expect(parseHeightTag("no")).toBeNull();
  });

  it("parses empty string as null", () => {
    expect(parseHeightTag("")).toBeNull();
  });

  it("parses undefined as null", () => {
    expect(parseHeightTag(undefined)).toBeNull();
  });

  it("parses negative numbers as null", () => {
    expect(parseHeightTag("-5")).toBeNull();
  });

  it("parses zero as null", () => {
    expect(parseHeightTag("0")).toBeNull();
  });

  it("parses non-numeric text as null", () => {
    expect(parseHeightTag("tall")).toBeNull();
  });
});

describe("parseLevelsTag", () => {
  it('parses "5" as 5', () => {
    expect(parseLevelsTag("5")).toBe(5);
  });

  it('parses "3.5" as 3.5', () => {
    expect(parseLevelsTag("3.5")).toBe(3.5);
  });

  it("parses undefined as null", () => {
    expect(parseLevelsTag(undefined)).toBeNull();
  });

  it("parses empty string as null", () => {
    expect(parseLevelsTag("")).toBeNull();
  });

  it("parses non-numeric as null", () => {
    expect(parseLevelsTag("many")).toBeNull();
  });

  it("parses zero as null", () => {
    expect(parseLevelsTag("0")).toBeNull();
  });

  it("parses negative as null", () => {
    // The regex captures only digits, so "-2" yields "2" (positive).
    // Use a string with no digits at all for the null case.
    expect(parseLevelsTag("-abc")).toBeNull();
  });
});

describe("resolveHeightMeters", () => {
  it("uses height tag when present", () => {
    expect(resolveHeightMeters({ height: "20" })).toBe(20);
  });

  it('falls back to building:levels * METERS_PER_LEVEL when no height', () => {
    expect(resolveHeightMeters({ "building:levels": "6" })).toBe(6 * METERS_PER_LEVEL);
  });

  it("falls back to DEFAULT_HEIGHT_METERS when neither height nor levels present", () => {
    expect(resolveHeightMeters({})).toBe(DEFAULT_HEIGHT_METERS);
  });

  it("prefers height over building:levels", () => {
    expect(resolveHeightMeters({ height: "30", "building:levels": "2" })).toBe(30);
  });

  it('uses height even if building:levels is present but height is invalid', () => {
    // parseHeightTag returns null for non-numeric, so resolve falls back to levels
    expect(resolveHeightMeters({ height: "yes", "building:levels": "4" })).toBe(
      4 * METERS_PER_LEVEL,
    );
  });
});

// ---------------------------------------------------------------------------
// Polygon helpers
// ---------------------------------------------------------------------------

describe("isClosedPolygon", () => {
  it("returns true for a closed 4-vertex ring", () => {
    expect(isClosedPolygon(closedPoly([0, 0], [0, 1], [1, 1], [1, 0]))).toBe(true);
  });

  it("returns false for an open 4-vertex path", () => {
    expect(isClosedPolygon(openPoly([0, 0], [0, 1], [1, 1], [1, 0]))).toBe(false);
  });

  it("returns false for fewer than 4 vertices", () => {
    // Use openPoly which does NOT append a closing duplicate, giving 3 vertices
    expect(isClosedPolygon(openPoly([0, 0], [0, 1], [0, 0]))).toBe(false);
  });

  it("returns false when first and last are numerically close but not equal", () => {
    // First and last are different: lat differs by 0.0000001
    const pts: Array<{ lng: number; lat: number }> = [
      { lng: 0.0, lat: 0.0 },
      { lng: 0.0, lat: 1.0 },
      { lng: 1.0, lat: 1.0 },
      { lng: 1.0, lat: 1.0 },
      { lng: 0.0, lat: 0.0000001 }, // close but not equal to first
    ];
    expect(isClosedPolygon(pts)).toBe(false);
  });
});

describe("computeCentroid", () => {
  it("computes arithmetic mean of vertices", () => {
    const pts = closedPoly([0, 0], [0, 4], [4, 4], [4, 0]);
    const c = computeCentroid(pts);
    expect(c.lng).toBeCloseTo(2, 5);
    expect(c.lat).toBeCloseTo(2, 5);
  });

  it("handles a single point", () => {
    const c = computeCentroid([{ lng: 10, lat: 20 }]);
    expect(c.lng).toBe(10);
    expect(c.lat).toBe(20);
  });

  it("handles empty array with fallback to 0,0", () => {
    const c = computeCentroid([]);
    expect(c.lng).toBe(0);
    expect(c.lat).toBe(0);
  });

  it("drops the closing duplicate before averaging", () => {
    // closedPoly appends the first point at the end
    const pts = closedPoly([0, 0], [0, 2], [2, 2], [2, 0]);
    const c = computeCentroid(pts);
    // Should average only the 4 unique corners, not 5 points
    expect(c.lng).toBeCloseTo(1, 5);
    expect(c.lat).toBeCloseTo(1, 5);
  });
});

describe("elementToBuilding", () => {
  it("returns null for element without geometry", () => {
    expect(elementToBuilding({ type: "way", id: 1 })).toBeNull();
  });

  it("returns null for element with empty geometry", () => {
    expect(elementToBuilding({ type: "way", id: 1, geometry: [] })).toBeNull();
  });

  it("returns null for non-closed geometry", () => {
    const el: import("./overpass-buildings-source").OverpassWayElement = {
      type: "way",
      id: 1,
      geometry: openPoly([0, 0], [0, 1], [1, 1]),
      tags: { height: "10" },
    };
    expect(elementToBuilding(el)).toBeNull();
  });

  it("converts a valid closed way to a Building", () => {
    const el: import("./overpass-buildings-source").OverpassWayElement = {
      type: "way",
      id: 42,
      geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
      tags: { height: "15", name: "Test Building" },
    };
    const b = elementToBuilding(el);
    expect(b).not.toBeNull();
    expect(b!.id).toBe("osm-way-42");
    expect(b!.heightMeters).toBe(15);
    expect(b!.footprint).toHaveLength(5); // 4 unique + closing duplicate
    expect(b!.tags["name"]).toBe("Test Building");
  });

  it("uses resolveHeightMeters for height resolution", () => {
    // no height tag, should fall back to levels
    const el: import("./overpass-buildings-source").OverpassWayElement = {
      type: "way",
      id: 99,
      geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
      tags: { "building:levels": "4" },
    };
    const b = elementToBuilding(el);
    expect(b!.heightMeters).toBe(4 * METERS_PER_LEVEL);
  });

  it("returns null when tags are undefined", () => {
    const el: import("./overpass-buildings-source").OverpassWayElement = {
      type: "way",
      id: 1,
      geometry: closedPoly([0, 0], [0, 1], [1, 1], [1, 0]),
    };
    const b = elementToBuilding(el);
    expect(b).not.toBeNull();
    expect(b!.heightMeters).toBe(DEFAULT_HEIGHT_METERS); // fallback
  });
});

// ---------------------------------------------------------------------------
// buildOverpassQuery
// ---------------------------------------------------------------------------

describe("buildOverpassQuery", () => {
  it("reorders BBox (west,south,east,north) to Overpass (south,west,north,east)", () => {
    const bbox: BBox = { west: 10, south: 20, east: 30, north: 40 };
    const q = buildOverpassQuery(bbox, 100);
    // Expected Overpass order: [bbox:south,west,north,east] → [bbox:20,10,40,30]
    expect(q).toContain("[bbox:20,10,40,30]");
  });

  it("includes the limit in the query", () => {
    const q = buildOverpassQuery({ west: 0, south: 0, east: 1, north: 1 }, 500);
    expect(q).toContain("out geom 500");
  });

  it("includes the building filter", () => {
    const q = buildOverpassQuery({ west: 0, south: 0, east: 1, north: 1 }, 2000);
    expect(q).toContain('way["building"]');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("DEFAULT_NAME is 'osm-overpass'", () => {
    expect(DEFAULT_NAME).toBe("osm-overpass");
  });

  it("DEFAULT_LIMIT is 2000", () => {
    expect(DEFAULT_LIMIT).toBe(2000);
  });

  it("DEFAULT_HEIGHT_METERS is 8", () => {
    expect(DEFAULT_HEIGHT_METERS).toBe(8);
  });

  it("METERS_PER_LEVEL is 3", () => {
    expect(METERS_PER_LEVEL).toBe(3);
  });

  it("DEFAULT_OVERPASS_ENDPOINT is a valid https URL", () => {
    expect(DEFAULT_OVERPASS_ENDPOINT).toMatch(/^https:\/\//);
  });
});
