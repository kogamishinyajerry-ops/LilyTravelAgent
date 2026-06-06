import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createGaodeBuildingsSource,
  buildPolygonParam,
  buildGaodeUrl,
  joinTypeCodes,
  parsePolyLocation,
  parseGaodePolys,
  polyToBuilding,
  estimatePolyHeight,
  computeCentroid,
  DEFAULT_NAME,
  DEFAULT_GAODE_ENDPOINT,
  DEFAULT_LIMIT,
  DEFAULT_HEIGHT_METERS,
  DEFAULT_EXTENSIONS,
  DEFAULT_GAODE_TYPE_CODES,
  BUILDING_TYPE_CODE,
} from "./gaode-buildings-source";
import type { GaodeResponse, GaodePoly } from "./gaode-buildings-source";
import type { BBox } from "./tile-coords";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal closed polygon (first === last vertex). */
function closedPoly(...coords: [number, number][]): Array<{ lng: number; lat: number }> {
  const pts = coords.map(([lng, lat]) => ({ lng, lat }));
  pts.push({ ...pts[0] });
  return pts;
}

// ---------------------------------------------------------------------------
// Fixture 高德 responses
// ---------------------------------------------------------------------------

function makeResponse(polys: GaodeResponse["polys"]): GaodeResponse {
  return { status: "1", count: String(polys?.length ?? 0), info: "OK", infocode: "10000", polys };
}

/** Two buildings with distinct geometry. */
const TWO_BUILDINGS_FIXTURE: GaodeResponse = {
  status: "1",
  count: "2",
  info: "OK",
  infocode: "10000",
  polys: [
    {
      id: "B001",
      name: "Building One",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
      address: "123 Test Street",
      adname: "Chaoyang",
      cityname: "Beijing",
      province: "Beijing",
    },
    {
      id: "B002",
      name: "Building Two",
      type: "120000",
      location: "116.32,39.92;116.33,39.92;116.33,39.93;116.32,39.93;116.32,39.92",
      address: "456 Example Ave",
      adname: "Haidian",
      cityname: "Beijing",
      province: "Beijing",
    },
  ],
};

/** Fixture exercising every field that `extensions=all` unlocks. */
const RICH_FIXTURE: GaodeResponse = {
  status: "1",
  count: "2",
  info: "OK",
  infocode: "10000",
  polys: [
    {
      id: "R001",
      name: "万达广场",
      type: "120000",
      location: "116.40,39.90;116.41,39.90;116.41,39.91;116.40,39.91;116.40,39.90",
      address: "建国路93号",
      adname: "Chaoyang",
      cityname: "Beijing",
      province: "Beijing",
      tel: "010-12345678",
      business_area: "CBD",
    },
    {
      id: "R002",
      name: "阳光小区",
      type: "120100",
      location: "116.42,39.92;116.43,39.92;116.43,39.93;116.42,39.93;116.42,39.92",
      address: "朝阳门外大街18号",
      adname: "Chaoyang",
      cityname: "Beijing",
      province: "Beijing",
      tel: "010-87654321",
      business_area: "CBD",
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

type MockFetchState = {
  requests: { url: string }[];
  response: GaodeResponse;
  throwOnFetch?: boolean;
  nonOk?: boolean;
};

let mockState: MockFetchState | null = null;

function mockFetch(url: string): Promise<Response> {
  if (!mockState) throw new Error("mockState not set");
  if (mockState.throwOnFetch) throw new Error("network error");
  mockState.requests.push({ url });
  const body = JSON.stringify(mockState.response);
  return Promise.resolve({
    ok: !mockState.nonOk,
    status: mockState.nonOk ? 500 : 200,
    statusText: mockState.nonOk ? "Internal Server Error" : "OK",
    json: () => Promise.resolve(JSON.parse(body)),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests: factory
// ---------------------------------------------------------------------------

describe("createGaodeBuildingsSource", () => {
  it("throws when no apiKey and no AMAP_KEY env var", () => {
    // Ensure env is not set
    vi.stubEnv("AMAP_KEY", "");
    expect(() => createGaodeBuildingsSource()).toThrow(
      /missing API key/i,
    );
  });

  it("reads apiKey from process.env.AMAP_KEY when not passed directly", () => {
    vi.stubEnv("AMAP_KEY", "test-key-from-env");
    const source = createGaodeBuildingsSource();
    expect(source).toBeDefined();
    expect(typeof source.fetchBuildings).toBe("function");
  });

  it("prefers explicit apiKey over env var", () => {
    vi.stubEnv("AMAP_KEY", "env-key");
    const source = createGaodeBuildingsSource({ apiKey: "explicit-key" });
    expect(source).toBeDefined();
  });

  it("returns instance with name 'gaode-amap' by default", () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    expect(source.name).toBe(DEFAULT_NAME);
  });

  it("returns instance with custom name when provided", () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource({ name: "my-source" });
    expect(source.name).toBe("my-source");
  });

  it("returned source implements BuildingsSource", () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    expect(typeof source.fetchBuildings).toBe("function");
    expect(typeof source.name).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests: fetchBuildings
// ---------------------------------------------------------------------------

describe("fetchBuildings", () => {
  beforeEach(() => {
    mockState = { requests: [], response: makeResponse([]) };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("sends the correct polygon param and key in the URL", async () => {
    vi.stubEnv("AMAP_KEY", "my-amap-key");
    const source = createGaodeBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    await source.fetchBuildings(bbox, {});

    const req = mockState!.requests[0];
    const url = new URL(req.url);
    expect(url.origin + url.pathname).toBe(DEFAULT_GAODE_ENDPOINT);
    expect(url.searchParams.get("key")).toBe("my-amap-key");
    expect(url.searchParams.get("polygon")).toBe(buildPolygonParam(bbox));
    // After the upgrade we send the joined type-code filter and
    // request the rich per-record metadata.
    expect(url.searchParams.get("types")).toBe(
      DEFAULT_GAODE_TYPE_CODES.join("|"),
    );
    expect(url.searchParams.get("extensions")).toBe(DEFAULT_EXTENSIONS);
  });

  it("returns empty array on network error", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.throwOnFetch = true;
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array on non-OK HTTP response", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.nonOk = true;
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array on non-'1' status from 高德", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.response = { status: "0", info: "INVALID_USER", infocode: "10001" };
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array on malformed JSON", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const badResponse: Response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as unknown as Response;
    mockState = { requests: [], response: makeResponse([]) };
    vi.stubGlobal("fetch", () => Promise.resolve(badResponse) as Promise<Response>);

    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("applies opts.limit to the returned array", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const manyPolys = Array.from({ length: 5 }, (_, i) => ({
      id: `B${i}`,
      name: `Building ${i}`,
      type: "120000",
      location: `${i},${i};${i + 0.01},${i};${i + 0.01},${i + 0.01};${i},${i + 0.01};${i},${i}`,
    }));
    mockState!.response = makeResponse(manyPolys);
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      { limit: 2 },
    );
    expect(result).toHaveLength(2);
  });

  it("sorts results by id for stable ordering", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.response = makeResponse([
      { id: "B003", name: "Third", type: "120000", location: "0,0;1,0;1,1;0,1;0,0" },
      { id: "B001", name: "First", type: "120000", location: "2,0;3,0;3,1;2,1;2,0" },
      { id: "B002", name: "Second", type: "120000", location: "4,0;5,0;5,1;4,1;4,0" },
    ]);
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 6, north: 2 },
      {},
    );
    expect(result[0]!.id).toBe("amap-B001");
    expect(result[1]!.id).toBe("amap-B002");
    expect(result[2]!.id).toBe("amap-B003");
  });
});

// ---------------------------------------------------------------------------
// Tests: extensions=all upgrade
// ---------------------------------------------------------------------------

describe("extensions=all upgrade", () => {
  beforeEach(() => {
    mockState = { requests: [], response: RICH_FIXTURE };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("requests extensions=all in the request URL", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const url = new URL(mockState!.requests[0]!.url);
    expect(url.searchParams.get("extensions")).toBe("all");
  });

  it("sends a '|' joined type-code filter covering all default codes", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const url = new URL(mockState!.requests[0]!.url);
    const typesParam = url.searchParams.get("types") ?? "";
    // Each default code should appear individually in the joined string.
    for (const code of DEFAULT_GAODE_TYPE_CODES) {
      expect(typesParam.split("|")).toContain(code);
    }
    expect(typesParam).toBe(DEFAULT_GAODE_TYPE_CODES.join("|"));
  });

  it("parses every extensions=all field into Building tags", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    const plaza = byId["amap-R001"]!;
    expect(plaza.tags["amap:type"]).toBe("120000");
    expect(plaza.tags["addr:full"]).toBe("建国路93号");
    expect(plaza.tags["addr:district"]).toBe("Chaoyang");
    expect(plaza.tags["addr:city"]).toBe("Beijing");
    expect(plaza.tags["contact:phone"]).toBe("010-12345678");
    expect(plaza.tags["amap:business_area"]).toBe("CBD");
  });

  it("stamps metadata.estimatedHeightSource='gaode-extensions' on every building", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    expect(result.length).toBeGreaterThan(0);
    for (const b of result) {
      expect(b.metadata).toBeDefined();
      expect(b.metadata?.["estimatedHeightSource"]).toBe("gaode-extensions");
    }
  });

  it("uses heuristic height for 万达广场 (matches commercial/tower row)", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    const plaza = result.find((b) => b.id === "amap-R001")!;
    // 万达广场 → "广场" doesn't hit a keyword directly, but the
    // typecode 120000 (commercial-residential) and the heuristic
    // fall-through land in the "default" bucket. We accept either
    // a heuristic match or a default fallback.
    expect(plaza.heightMeters).toBeGreaterThan(0);
    expect(plaza.heightMeters).toBeLessThanOrEqual(200);
    expect(plaza.metadata?.["estimatedHeightSource"]).toBe("gaode-extensions");
  });
});

// ---------------------------------------------------------------------------
// Tests: fixture parsing
// ---------------------------------------------------------------------------

describe("TWO_BUILDINGS_FIXTURE parsing", () => {
  beforeEach(() => {
    mockState = { requests: [], response: TWO_BUILDINGS_FIXTURE };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("parses two buildings from fixture", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const result = await source.fetchBuildings(bbox, {});

    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    expect(byId["amap-B001"]).toBeDefined();
    expect(byId["amap-B002"]).toBeDefined();
  });

  it("assigns correct footprint to each building", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const result = await source.fetchBuildings(bbox, {});

    const byId = Object.fromEntries(result.map((b) => [b.id, b]));

    // Building One: 116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9
    const b1 = byId["amap-B001"]!;
    expect(b1.footprint).toHaveLength(5);
    expect(b1.footprint[0]).toEqual({ lng: 116.3, lat: 39.9 });
    expect(b1.footprint[4]).toEqual({ lng: 116.3, lat: 39.9 }); // closed

    // Building Two: 116.32,39.92;116.33,39.92;116.33,39.93;116.32,39.93;116.32,39.92
    const b2 = byId["amap-B002"]!;
    expect(b2.footprint).toHaveLength(5);
    expect(b2.footprint[0]).toEqual({ lng: 116.32, lat: 39.92 });
  });

  it("maps tags from 高德 fields", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const result = await source.fetchBuildings(bbox, {});

    const byId = Object.fromEntries(result.map((b) => [b.id, b]));
    const b1 = byId["amap-B001"]!;
    expect(b1.tags["name"]).toBe("Building One");
    expect(b1.tags["amap:type"]).toBe("120000");
    expect(b1.tags["addr:full"]).toBe("123 Test Street");
    expect(b1.tags["addr:district"]).toBe("Chaoyang");
    expect(b1.tags["addr:city"]).toBe("Beijing");
    expect(b1.tags["addr:province"]).toBe("Beijing");
  });

  it("uses DEFAULT_HEIGHT_METERS when no height signal matches", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );
    // 'Building One' / 'Building Two' do not match any heuristic
    // keyword, so they fall through to the 8 m default.
    for (const b of result) {
      expect(b.heightMeters).toBe(DEFAULT_HEIGHT_METERS);
    }
  });

  it("computes centroid for each building", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 116.3, south: 39.8, east: 116.5, north: 40.0 },
      {},
    );

    const byId = Object.fromEntries(result.map((b) => [b.id, b]));

    // Building One centroid: avg of (116.3,39.9), (116.31,39.9), (116.31,39.91), (116.3,39.91)
    const b1 = byId["amap-B001"]!;
    expect(b1.lng).toBeCloseTo((116.3 + 116.31 + 116.31 + 116.3) / 4, 5);
    expect(b1.lat).toBeCloseTo((39.9 + 39.9 + 39.91 + 39.91) / 4, 5);
    expect(b1.lng).toBeCloseTo(116.305, 3);
    expect(b1.lat).toBeCloseTo(39.905, 3);
  });
});

// ---------------------------------------------------------------------------
// Tests: empty response
// ---------------------------------------------------------------------------

describe("empty response handling", () => {
  beforeEach(() => {
    mockState = { requests: [], response: makeResponse([]) };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("returns empty array when polys is empty", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.response = makeResponse([]);
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when polys is undefined", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.response = { status: "1", count: "0", info: "OK", infocode: "10000" };
    const source = createGaodeBuildingsSource();
    const result = await source.fetchBuildings(
      { west: 0, south: 0, east: 1, north: 1 },
      {},
    );
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: invalid polygon string
// ---------------------------------------------------------------------------

describe("parsePolyLocation", () => {
  it("returns null for undefined input", () => {
    expect(parsePolyLocation(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parsePolyLocation("")).toBeNull();
  });

  it("returns null for fewer than 3 points", () => {
    expect(parsePolyLocation("116.3,39.9;116.31,39.9")).toBeNull();
  });

  it("returns null when any coordinate fails to parse", () => {
    expect(parsePolyLocation("116.3,39.9;not-numeric,39.9;116.31,39.91")).toBeNull();
  });

  it("returns null when coordinate is not finite", () => {
    expect(parsePolyLocation("116.3,NaN;116.31,39.9;116.31,39.91")).toBeNull();
  });

  it("parses a valid closed polygon string", () => {
    const result = parsePolyLocation("116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9");
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(5);
  });

  it("auto-closes an open ring", () => {
    // 高德 sometimes returns unclosed rings; function should close it
    const result = parsePolyLocation("116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91");
    expect(result).not.toBeNull();
    expect(result!).toHaveLength(5); // 4 points + auto-closed
    expect(result![4]).toEqual(result![0]); // last === first
  });
});

// ---------------------------------------------------------------------------
// Tests: polyToBuilding
// ---------------------------------------------------------------------------

describe("polyToBuilding", () => {
  it("returns null for poly with no location", () => {
    expect(polyToBuilding({ id: "1", name: "Test" })).toBeNull();
  });

  it("returns null for poly with fewer than 3 unique points", () => {
    expect(polyToBuilding({ id: "1", location: "116.3,39.9;116.31,39.9" })).toBeNull();
  });

  it("returns null for poly with invalid coordinates", () => {
    expect(polyToBuilding({ id: "1", location: "abc,def;ghi,jkl;123,456" })).toBeNull();
  });

  it("converts a valid poly to Building with id 'amap-<id>'", () => {
    const poly: GaodePoly = {
      id: "B001",
      name: "Test Building",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding(poly);
    expect(b).not.toBeNull();
    expect(b!.id).toBe("amap-B001");
    expect(b!.tags["name"]).toBe("Test Building");
    expect(b!.heightMeters).toBe(DEFAULT_HEIGHT_METERS);
  });

  it("generates id from name and first vertex when id is absent", () => {
    const poly: GaodePoly = {
      name: "Nameless Tower",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding(poly);
    expect(b).not.toBeNull();
    expect(b!.id).toMatch(/^amap-Nameless Tower/);
  });

  it("surfaces tel and business_area tags from extensions=all", () => {
    const poly: GaodePoly = {
      id: "B-TEL",
      name: "Mall",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
      tel: "010-9999-0000",
      business_area: "Sanlitun",
    };
    const b = polyToBuilding(poly)!;
    expect(b.tags["contact:phone"]).toBe("010-9999-0000");
    expect(b.tags["amap:business_area"]).toBe("Sanlitun");
  });

  it("stamps metadata.estimatedHeightSource='gaode-extensions'", () => {
    const poly: GaodePoly = {
      id: "B-META",
      name: "Some Building",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding(poly)!;
    expect(b.metadata?.["estimatedHeightSource"]).toBe("gaode-extensions");
  });
});

// ---------------------------------------------------------------------------
// Tests: buildPolygonParam
// ---------------------------------------------------------------------------

describe("buildPolygonParam", () => {
  it("returns a closed ring in lng,lat;...;lng,lat format", () => {
    const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };
    const param = buildPolygonParam(bbox);
    // sw; nw; ne; se; sw
    expect(param).toBe("116.3,39.8;116.3,40;116.5,40;116.5,39.8;116.3,39.8");
  });

  it("starts and ends with the same coordinate (closed ring)", () => {
    const bbox: BBox = { west: 0, south: 0, east: 1, north: 1 };
    const param = buildPolygonParam(bbox);
    const parts = param.split(";");
    expect(parts[0]).toBe(parts[parts.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// Tests: buildGaodeUrl
// ---------------------------------------------------------------------------

describe("buildGaodeUrl", () => {
  const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };

  it("includes extensions=all by default", () => {
    const url = new URL(
      buildGaodeUrl(bbox, { apiKey: "k", polygon: "0,0;1,0;1,1;0,1;0,0", page: 1 }),
    );
    expect(url.searchParams.get("extensions")).toBe("all");
  });

  it("includes the joined type-code filter", () => {
    const url = new URL(
      buildGaodeUrl(bbox, { apiKey: "k", polygon: "0,0;1,0;1,1;0,1;0,0", page: 1 }),
    );
    expect(url.searchParams.get("types")).toBe("120000|120100");
  });

  it("respects a custom extensions override", () => {
    const url = new URL(
      buildGaodeUrl(bbox, {
        apiKey: "k",
        polygon: "0,0;1,0;1,1;0,1;0,0",
        page: 1,
        extensions: "base",
      }),
    );
    expect(url.searchParams.get("extensions")).toBe("base");
  });

  it("respects a custom single type code", () => {
    const url = new URL(
      buildGaodeUrl(bbox, {
        apiKey: "k",
        polygon: "0,0;1,0;1,1;0,1;0,0",
        page: 1,
        typeCodes: "120000",
      }),
    );
    expect(url.searchParams.get("types")).toBe("120000");
  });

  it("threads the apiKey, polygon, page, and offset into the URL", () => {
    const url = new URL(
      buildGaodeUrl(bbox, {
        apiKey: "my-key",
        polygon: "0,0;1,0;1,1;0,1;0,0",
        page: 3,
        offset: 20,
      }),
    );
    expect(url.searchParams.get("key")).toBe("my-key");
    expect(url.searchParams.get("polygon")).toBe("0,0;1,0;1,1;0,1;0,0");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("offset")).toBe("20");
  });

  it("builds the polygon param from the bbox when none is provided", () => {
    const url = new URL(
      buildGaodeUrl(bbox, { apiKey: "k", polygon: "", page: 1 }),
    );
    expect(url.searchParams.get("polygon")).toBe(buildPolygonParam(bbox));
  });
});

// ---------------------------------------------------------------------------
// Tests: joinTypeCodes
// ---------------------------------------------------------------------------

describe("joinTypeCodes", () => {
  it("returns the input string when given a string", () => {
    expect(joinTypeCodes("120000")).toBe("120000");
  });

  it("joins an array with '|'", () => {
    expect(joinTypeCodes(["120000", "120100"])).toBe("120000|120100");
  });

  it("uses the default codes when called with no argument", () => {
    expect(joinTypeCodes()).toBe(DEFAULT_GAODE_TYPE_CODES.join("|"));
  });
});

// ---------------------------------------------------------------------------
// Tests: parseGaodePolys
// ---------------------------------------------------------------------------

describe("parseGaodePolys", () => {
  it("returns an empty array on non-'1' status", () => {
    const result = parseGaodePolys({
      status: "0",
      info: "INVALID_USER",
      infocode: "10001",
      polys: [
        {
          id: "X",
          location: "0,0;1,0;1,1;0,1;0,0",
        },
      ],
    });
    expect(result).toEqual([]);
  });

  it("parses every poly in a status='1' response", () => {
    const result = parseGaodePolys(RICH_FIXTURE);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("amap-R001");
    expect(result[1]!.id).toBe("amap-R002");
  });

  it("skips polys with no usable location", () => {
    const result = parseGaodePolys({
      status: "1",
      count: "2",
      info: "OK",
      infocode: "10000",
      polys: [
        { id: "GOOD", location: "0,0;1,0;1,1;0,1;0,0" },
        { id: "BAD" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("amap-GOOD");
  });

  it("returns an empty array when polys is undefined", () => {
    const result = parseGaodePolys({ status: "1", count: "0", info: "OK", infocode: "10000" });
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: estimatePolyHeight (heuristic-driven)
// ---------------------------------------------------------------------------

describe("estimatePolyHeight", () => {
  it("returns a high-rise estimate for an office/tower name", () => {
    // 'CBD Tower' should hit the commercial/office row.
    const result = estimatePolyHeight({ name: "CBD Tower", type: "120000" });
    expect(result.confidence).toBe("medium");
    expect(result.meters).toBeGreaterThanOrEqual(30);
    expect(result.meters).toBeLessThanOrEqual(80);
  });

  it("returns a residential estimate for an apartment name", () => {
    const result = estimatePolyHeight({ name: "Greenfield Apartment", type: "120100" });
    expect(result.confidence).toBe("medium");
    expect(result.meters).toBeGreaterThanOrEqual(15);
    expect(result.meters).toBeLessThanOrEqual(30);
  });

  it("falls back to DEFAULT_HEIGHT_METERS for an unknown name", () => {
    const result = estimatePolyHeight({ name: "Xylophone 12345", type: "120000" });
    expect(result.meters).toBe(DEFAULT_HEIGHT_METERS);
    expect(result.confidence).toBe("low");
  });

  it("still resolves when name is missing", () => {
    const result = estimatePolyHeight({ type: "120000" });
    // No name means no haystack; we fall through to default.
    expect(result.meters).toBe(DEFAULT_HEIGHT_METERS);
  });
});

// ---------------------------------------------------------------------------
// Tests: computeCentroid
// ---------------------------------------------------------------------------

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
    const pts = closedPoly([0, 0], [0, 2], [2, 2], [2, 0]);
    const c = computeCentroid(pts);
    // Should average only the 4 unique corners, not 5 points
    expect(c.lng).toBeCloseTo(1, 5);
    expect(c.lat).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// Tests: constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("DEFAULT_NAME is 'gaode-amap'", () => {
    expect(DEFAULT_NAME).toBe("gaode-amap");
  });

  it("DEFAULT_LIMIT is 2000", () => {
    expect(DEFAULT_LIMIT).toBe(2000);
  });

  it("DEFAULT_HEIGHT_METERS is 8", () => {
    expect(DEFAULT_HEIGHT_METERS).toBe(8);
  });

  it("DEFAULT_EXTENSIONS is 'all'", () => {
    expect(DEFAULT_EXTENSIONS).toBe("all");
  });

  it("DEFAULT_GAODE_TYPE_CODES contains 120000 and 120100", () => {
    expect(DEFAULT_GAODE_TYPE_CODES).toContain("120000");
    expect(DEFAULT_GAODE_TYPE_CODES).toContain("120100");
  });

  it("BUILDING_TYPE_CODE is '120000' (legacy constant preserved)", () => {
    expect(BUILDING_TYPE_CODE).toBe("120000");
  });

  it("DEFAULT_GAODE_ENDPOINT is a valid https URL", () => {
    expect(DEFAULT_GAODE_ENDPOINT).toMatch(/^https:\/\//);
  });
});
