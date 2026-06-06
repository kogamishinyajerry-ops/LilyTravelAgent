import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createGaode3DBuildingsSource,
  createDefaultHeightEstimator,
  polyToBuilding3D,
  DEFAULT_NAME,
  DEFAULT_3D_TYPE_CODES,
  DEFAULT_LIMIT,
  HEIGHT_SOURCE_TAG,
} from "./gaode-3d-buildings-source";
import type { GaodePoly, GaodeResponse } from "./gaode-buildings-source";
import type { BBox } from "./tile-coords";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(polys: GaodeResponse["polys"]): GaodeResponse {
  return { status: "1", count: String(polys?.length ?? 0), info: "OK", infocode: "10000", polys };
}

/** Build a poly record that parses cleanly. */
function makePoly(id: string, name: string, type: string, lng: number, lat: number): GaodePoly {
  return {
    id,
    name,
    type,
    location: `${lng},${lat};${lng + 0.01},${lat};${lng + 0.01},${lat + 0.01};${lng},${lat + 0.01};${lng},${lat}`,
    address: `${id} Address`,
    adname: "Chaoyang",
    cityname: "Beijing",
    province: "Beijing",
  };
}

// ---------------------------------------------------------------------------
// Per-type-code mock fetch
// ---------------------------------------------------------------------------
//
// The 3D source fans out one Promise.allSettled of paginated queries
// per type code. To assert that "all type codes queried in parallel"
// we record every URL hit and inspect the types=... parameter.

type MockFetchState = {
  requests: { url: string }[];
  /**
   * Per-type-code page responses. Keyed by `types=CODE` and
   * `page=N`. A missing key falls back to `defaultResponse`.
   */
  responses: Record<string, GaodeResponse>;
  defaultResponse: GaodeResponse;
  throwOnTypes?: string[];
  rejectOnTypes?: string[];
  malformedJsonTypes?: string[];
  /** Response codes that return status !== "1" from queryTypeCode. */
  nonOneStatusTypes?: string[];
  /** Type codes whose fetch returns a rejected Promise (triggers allSettled rejection path). */
  rejectFetchTypes?: string[];
};

let mockState: MockFetchState | null = null;

function mockFetch(url: string): Promise<Response> {
  if (!mockState) throw new Error("mockState not set");
  const parsed = new URL(url);
  const typesParam = parsed.searchParams.get("types") ?? "";
  const pageParam = parsed.searchParams.get("page") ?? "1";

  mockState.requests.push({ url });

  if (mockState.throwOnTypes?.includes(typesParam)) {
    throw new Error(`network error for types=${typesParam}`);
  }
  if (mockState.rejectOnTypes?.includes(typesParam)) {
    return Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    } as Response);
  }
  if (mockState.malformedJsonTypes?.includes(typesParam)) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as Response);
  }
  if (mockState.rejectFetchTypes?.includes(typesParam)) {
    return Promise.reject(new Error(`fetch rejected for types=${typesParam}`));
  }

  const key = `${typesParam}@${pageParam}`;
  let response = mockState.responses[key] ?? mockState.defaultResponse;
  // Inject status !== "1" for nonOneStatusTypes
  if (mockState.nonOneStatusTypes?.includes(typesParam)) {
    response = { ...response, status: "0", info: "INVALID_REQUEST" };
  }
  const body = JSON.stringify(response);
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(JSON.parse(body)),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests: factory
// ---------------------------------------------------------------------------

describe("createGaode3DBuildingsSource", () => {
  it("throws when no apiKey and no AMAP_KEY env var", () => {
    vi.stubEnv("AMAP_KEY", "");
    expect(() => createGaode3DBuildingsSource()).toThrow(/missing API key/i);
  });

  it("reads apiKey from process.env.AMAP_KEY when not passed directly", () => {
    vi.stubEnv("AMAP_KEY", "env-key");
    const source = createGaode3DBuildingsSource();
    expect(source).toBeDefined();
    expect(typeof source.fetchBuildings).toBe("function");
  });

  it("returns instance with name 'gaode-3d' by default", () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaode3DBuildingsSource();
    expect(source.name).toBe(DEFAULT_NAME);
  });

  it("returned source implements BuildingsSource", () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaode3DBuildingsSource();
    expect(typeof source.fetchBuildings).toBe("function");
    expect(typeof source.name).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests: fetchBuildings
// ---------------------------------------------------------------------------

describe("fetchBuildings", () => {
  const bbox: BBox = { west: 116.3, south: 39.8, east: 116.5, north: 40.0 };

  beforeEach(() => {
    mockState = {
      requests: [],
      responses: {},
      defaultResponse: makeResponse([]),
    };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    mockState = null;
  });

  it("queries all four default type codes", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaode3DBuildingsSource();
    await source.fetchBuildings(bbox, {});

    // Each default type code should appear in at least one request.
    const typesParams = new Set(
      mockState!.requests.map(
        (r) => new URL(r.url).searchParams.get("types") ?? "",
      ),
    );
    for (const code of DEFAULT_3D_TYPE_CODES) {
      expect(typesParams.has(code)).toBe(true);
    }
  });

  it("uses all four default type codes by default", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaode3DBuildingsSource();
    expect(DEFAULT_3D_TYPE_CODES).toEqual(["120000", "120100", "120200", "120300"]);
    // Sanity: the default is wired into the source.
    const allTypes = new Set<string>();
    mockState!.requests.length = 0;
    await source.fetchBuildings(bbox, {});
    for (const r of mockState!.requests) {
      allTypes.add(new URL(r.url).searchParams.get("types") ?? "");
    }
    expect(allTypes.size).toBe(DEFAULT_3D_TYPE_CODES.length);
  });

  it("respects custom typeCodes option", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    const source = createGaode3DBuildingsSource({ typeCodes: ["120000", "120200"] });
    await source.fetchBuildings(bbox, {});

    const typesParams = new Set(
      mockState!.requests.map(
        (r) => new URL(r.url).searchParams.get("types") ?? "",
      ),
    );
    expect(typesParams.has("120000")).toBe(true);
    expect(typesParams.has("120200")).toBe(true);
    // Codes not in the custom list should NOT appear.
    expect(typesParams.has("120100")).toBe(false);
    expect(typesParams.has("120300")).toBe(false);
  });

  it("merges results from multiple type codes", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    // 120000 returns B001 (office) and B002 (office); 120100 returns B003 (residential).
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("B001", "Office One", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([makePoly("B003", "Residence Three", "120100", 116.32, 39.92)]),
      "120200@1": makeResponse([makePoly("B004", "Mall Four", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([makePoly("B005", "Restaurant Five", "120300", 116.36, 39.96)]),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id).sort();
    expect(ids).toEqual([
      "amap-3d-B001",
      "amap-3d-B003",
      "amap-3d-B004",
      "amap-3d-B005",
    ]);
  });

  it("dedupes buildings that appear in multiple type code responses", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    // The same id shows up under both 120000 and 120100 (some chain
    // businesses are categorized under both). Result should contain
    // it exactly once.
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("DUPE", "Shared Building", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([makePoly("DUPE", "Shared Building", "120100", 116.3, 39.9)]),
      "120200@1": makeResponse([]),
      "120300@1": makeResponse([]),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id);
    expect(ids).toEqual(["amap-3d-DUPE"]);
    expect(result).toHaveLength(1);
  });

  it("falls back gracefully when one type code throws on the network", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120100@1": makeResponse([makePoly("B003", "Residence", "120100", 116.32, 39.92)]),
      "120200@1": makeResponse([makePoly("B004", "Mall", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([makePoly("B005", "Restaurant", "120300", 116.36, 39.96)]),
    };
    // 120000 throws a network error; the other three should still
    // produce results.
    mockState!.throwOnTypes = ["120000"];

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id).sort();
    expect(ids).toEqual(["amap-3d-B003", "amap-3d-B004", "amap-3d-B005"]);
  });

  it("falls back gracefully when one type code returns a non-OK HTTP status", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120100@1": makeResponse([makePoly("B003", "Residence", "120100", 116.32, 39.92)]),
      "120200@1": makeResponse([makePoly("B004", "Mall", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([makePoly("B005", "Restaurant", "120300", 116.36, 39.96)]),
    };
    mockState!.rejectOnTypes = ["120000"]; // → 500 response

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id).sort();
    expect(ids).toEqual(["amap-3d-B003", "amap-3d-B004", "amap-3d-B005"]);
  });

  it("respects opts.limit by capping the returned array", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    // Make every type code return 2 polys (8 total) and ask for 3.
    const twoPolys = [
      makePoly("A1", "A One", "120000", 116.3, 39.9),
      makePoly("A2", "A Two", "120000", 116.31, 39.9),
    ];
    const twoB = [
      makePoly("B1", "B One", "120100", 116.32, 39.92),
      makePoly("B2", "B Two", "120100", 116.33, 39.92),
    ];
    const twoC = [
      makePoly("C1", "C One", "120200", 116.34, 39.94),
      makePoly("C2", "C Two", "120200", 116.35, 39.94),
    ];
    const twoD = [
      makePoly("D1", "D One", "120300", 116.36, 39.96),
      makePoly("D2", "D Two", "120300", 116.37, 39.96),
    ];
    mockState!.responses = {
      "120000@1": makeResponse(twoPolys),
      "120100@1": makeResponse(twoB),
      "120200@1": makeResponse(twoC),
      "120300@1": makeResponse(twoD),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, { limit: 3 });
    expect(result).toHaveLength(3);
  });

  it("applies the height estimator and tags every record with heightSource='heuristic'", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    // 'Office Plaza' should hit the office/tower heuristic row.
    // 'Mall' should hit the shop/mall row.
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("OF1", "Office Plaza Tower", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([]),
      "120200@1": makeResponse([makePoly("ML1", "Mall", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([]),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    expect(result).toHaveLength(2);

    for (const b of result) {
      expect(b.heightMeters).toBeGreaterThan(0);
      expect(b.metadata).toBeDefined();
      expect(b.metadata?.["heightSource"]).toBe(HEIGHT_SOURCE_TAG);
    }

    const office = result.find((b) => b.id === "amap-3d-OF1")!;
    // Office heuristic row: 30-80 m range → midpoint 55 m.
    expect(office.heightMeters).toBeGreaterThanOrEqual(30);
    expect(office.heightMeters).toBeLessThanOrEqual(80);
    expect(office.metadata?.["estimatedHeightSource"]).toBe("heuristic");
    expect(office.metadata?.["estimatedHeightConfidence"]).toBe("medium");
  });

  it("uses a custom height estimator when one is injected", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("OF1", "Anything", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([]),
      "120200@1": makeResponse([]),
      "120300@1": makeResponse([]),
    };

    const estimator = vi.fn(() => ({
      meters: 123,
      source: "heuristic" as const,
      confidence: "medium" as const,
    }));

    const source = createGaode3DBuildingsSource({ heightEstimator: estimator });
    const result = await source.fetchBuildings(bbox, {});
    expect(estimator).toHaveBeenCalled();
    expect(result[0]!.heightMeters).toBe(123);
    expect(result[0]!.metadata?.["heightSource"]).toBe(HEIGHT_SOURCE_TAG);
    expect(result[0]!.metadata?.["estimatedHeightSource"]).toBe("heuristic");
  });

  it("sorts the result by id for stable ordering", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("Z", "Z Office", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([makePoly("A", "A Residence", "120100", 116.32, 39.92)]),
      "120200@1": makeResponse([makePoly("M", "M Mall", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([makePoly("B", "B Restaurant", "120300", 116.36, 39.96)]),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id);
    expect(ids).toEqual(["amap-3d-A", "amap-3d-B", "amap-3d-M", "amap-3d-Z"]);
  });

  it("returns an empty array when every type code fails", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.throwOnTypes = ["120000", "120100", "120200", "120300"];

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    expect(result).toEqual([]);
  });

  it("falls back gracefully when one type code returns malformed JSON", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    // 120000 returns malformed JSON; the other three should still produce results.
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("B003", "Residence", "120100", 116.32, 39.92)]),
      "120100@1": makeResponse([makePoly("B004", "Mall", "120200", 116.34, 39.94)]),
      "120200@1": makeResponse([makePoly("B005", "Restaurant", "120300", 116.36, 39.96)]),
    };
    // Override 120000 to return a Response whose json() rejects.
    mockState!.malformedJsonTypes = ["120000"];

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id).sort();
    expect(ids).toEqual(["amap-3d-B004", "amap-3d-B005"]);
  });

  it("returns an empty array when every type code returns malformed JSON", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.malformedJsonTypes = ["120000", "120100", "120200", "120300"];

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    expect(result).toEqual([]);
  });

  it("falls back gracefully when one type code returns non-'1' status", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120000@1": makeResponse([]),
      "120100@1": makeResponse([makePoly("B003", "Residence", "120100", 116.32, 39.92)]),
      "120200@1": makeResponse([makePoly("B004", "Mall", "120200", 116.34, 39.94)]),
      "120300@1": makeResponse([makePoly("B005", "Restaurant", "120300", 116.36, 39.96)]),
    };
    // 120000 returns status="0" (invalid) from queryTypeCode → returns null.
    mockState!.nonOneStatusTypes = ["120000"];

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    const ids = result.map((b) => b.id).sort();
    expect(ids).toEqual(["amap-3d-B003", "amap-3d-B004", "amap-3d-B005"]);
  });

  it("handles all four type codes when none fail", async () => {
    vi.stubEnv("AMAP_KEY", "test-key");
    mockState!.responses = {
      "120000@1": makeResponse([makePoly("B001", "Office", "120000", 116.3, 39.9)]),
      "120100@1": makeResponse([makePoly("B002", "Residence", "120100", 116.31, 39.9)]),
      "120200@1": makeResponse([makePoly("B003", "Mall", "120200", 116.32, 39.9)]),
      "120300@1": makeResponse([makePoly("B004", "Restaurant", "120300", 116.33, 39.9)]),
    };

    const source = createGaode3DBuildingsSource();
    const result = await source.fetchBuildings(bbox, {});
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Tests: createDefaultHeightEstimator
// ---------------------------------------------------------------------------

describe("createDefaultHeightEstimator", () => {
  it("returns a function", () => {
    const estimator = createDefaultHeightEstimator();
    expect(typeof estimator).toBe("function");
  });

  it("estimates a high-rise for an office/tower name", () => {
    const estimator = createDefaultHeightEstimator();
    const result = estimator({ id: "X", name: "CBD Tower", type: "120000" });
    expect(result.confidence).toBe("medium");
    expect(result.meters).toBeGreaterThanOrEqual(30);
    expect(result.meters).toBeLessThanOrEqual(80);
  });

  it("falls back to 8 m for a name that matches nothing", () => {
    const estimator = createDefaultHeightEstimator();
    const result = estimator({ id: "X", name: "Xylophone 12345", type: "120000" });
    expect(result.meters).toBe(8);
    expect(result.confidence).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// Tests: polyToBuilding3D
// ---------------------------------------------------------------------------

describe("polyToBuilding3D", () => {
  const estimator = createDefaultHeightEstimator();

  it("returns null when location is missing", () => {
    expect(polyToBuilding3D({ id: "1", name: "Test" }, estimator)).toBeNull();
  });

  it("returns null when footprint has fewer than 3 unique points", () => {
    expect(
      polyToBuilding3D(
        { id: "1", name: "Test", location: "116.3,39.9;116.31,39.9" },
        estimator,
      ),
    ).toBeNull();
  });

  it("converts a valid poly to a Building with id 'amap-3d-<id>'", () => {
    const poly: GaodePoly = {
      id: "B001",
      name: "Test Office",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding3D(poly, estimator);
    expect(b).not.toBeNull();
    expect(b!.id).toBe("amap-3d-B001");
    expect(b!.tags["name"]).toBe("Test Office");
    expect(b!.tags["amap:type"]).toBe("120000");
    expect(b!.tags["gaode-3d:sourceType"]).toBe("120000");
    expect(b!.metadata?.["heightSource"]).toBe(HEIGHT_SOURCE_TAG);
  });

  it("stamps every building with heightSource='heuristic'", () => {
    const poly: GaodePoly = {
      id: "B-META",
      name: "Unknown Place",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding3D(poly, estimator)!;
    expect(b.metadata?.["heightSource"]).toBe("heuristic");
    // Underlying estimator may say 'default' but the architectural
    // tag is 'heuristic' because we asked the heuristic table.
    expect(b.metadata?.["estimatedHeightSource"]).toBe("default");
    expect(b.metadata?.["estimatedHeightConfidence"]).toBe("low");
  });

  it("falls back to 'anon' in the id when name is an empty string", () => {
    // Covers the `tags.name ?? "anon"` branch in polyToBuilding3D.
    const poly: GaodePoly = {
      id: "B-ANON",
      name: "",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding3D(poly, estimator)!;
    expect(b.id).toBe("amap-3d-B-ANON");
    // name tag should not be set when name is empty string
    expect(b.tags["name"]).toBeUndefined();
  });

  it("falls back to 'anon' in the id when name is missing", () => {
    // Covers the `tags.name ?? "anon"` branch when name is undefined.
    const poly: GaodePoly = {
      id: "B-MISSING",
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding3D(poly, estimator)!;
    expect(b.id).toBe("amap-3d-B-MISSING");
  });

  it("uses 'anon' in the id when both id and name are missing", () => {
    // Covers the `poly.id ? ... : \`amap-3d-${tags.name ?? "anon"}-...\`` branch
    // when poly.id is undefined AND poly.name is undefined → tags.name never set → ?? "anon"
    const poly: GaodePoly = {
      type: "120000",
      location: "116.3,39.9;116.31,39.9;116.31,39.91;116.3,39.91;116.3,39.9",
    };
    const b = polyToBuilding3D(poly, estimator)!;
    expect(b.id).toBe("amap-3d-anon-116.3,39.9");
    expect(b.tags["name"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("DEFAULT_NAME is 'gaode-3d'", () => {
    expect(DEFAULT_NAME).toBe("gaode-3d");
  });

  it("DEFAULT_3D_TYPE_CODES has the four expected categories", () => {
    expect(DEFAULT_3D_TYPE_CODES).toEqual([
      "120000",
      "120100",
      "120200",
      "120300",
    ]);
  });

  it("DEFAULT_LIMIT is 5000", () => {
    expect(DEFAULT_LIMIT).toBe(5000);
  });

  it("HEIGHT_SOURCE_TAG is 'heuristic'", () => {
    expect(HEIGHT_SOURCE_TAG).toBe("heuristic");
  });
});
