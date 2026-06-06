// Real BuildingsSource backed by 高德 (Amap) "place/polygon", enhanced
// for 3D rendering.
//
// The standard `GaodeBuildingsSource` queries a single '|'-joined
// `types` parameter and is fine for quick maps. For real 3D scenes we
// need more comprehensive coverage: business towers, residential
// compounds, malls, and restaurants all live under different
// top-level POI type codes, and 高德 only returns ~20 records per
// `types` filter before requiring pagination.
//
// `Gaode3DBuildingsSource` therefore takes a different strategy:
//   1. Fan out to ONE request per type code, in parallel
//      (Promise.allSettled so a single type-code failure does not
//      take down the whole bbox).
//   2. For each type code, paginate through 高德's 20-per-page
//      responses until exhausted or `opts.limit` is hit.
//   3. Merge the per-type results, dedupe by `id` (高德 ids are
//      unique across the entire category tree, so a single id-keyed
//      Map is sufficient — no spatial dedupe required).
//   4. Run each poly through a height estimator. The default
//      estimator is `createDefaultHeightEstimator()`, which wraps
//      `estimateHeightByHeuristic` from `lib/building-height-estimator`
//      and tags every result with `heightSource = 'heuristic'`
//      because 高德's standard Web Service API does not return
//      real height data.
//
// The "3D" in the name refers to the resulting Building records
// carrying a usable `heightMeters` value (estimated) so the renderer
// can extrude them. The polygon endpoint itself is the same as
// `GaodeBuildingsSource`; this source is a different
// coverage/strategy layer on top of the same wire format.

import type { BBox } from "./tile-coords";
import type {
  Building,
  BuildingsSource,
  FetchBuildingsOptions,
} from "./buildings-source";
import {
  estimateHeightByHeuristic,
  type HeightEstimate,
} from "./building-height-estimator";
import {
  buildGaodeUrl,
  buildPolygonParam,
  computeCentroid,
  parsePolyLocation,
  type GaodePoly,
  type GaodeResponse,
  DEFAULT_GAODE_ENDPOINT,
  DEFAULT_EXTENSIONS,
} from "./gaode-buildings-source";

/** Public `name` reported via `BuildingsSource.name`. */
export const DEFAULT_NAME = "gaode-3d";

/**
 * 高德 POI type codes that the 3D source fans out across. Defaults
 * cover the four categories the 3D renderer cares about:
 *   - `120000` 商务写字楼 (commercial / business)
 *   - `120100` 住宅小区 (residential compounds)
 *   - `120200` 商场 (shopping malls / retail)
 *   - `120300` 餐饮 (F&B / restaurants)
 */
export const DEFAULT_3D_TYPE_CODES: ReadonlyArray<string> = [
  "120000",
  "120100",
  "120200",
  "120300",
];

/** Hard cap when the caller does not pass `opts.limit`. */
export const DEFAULT_LIMIT = 5000;

/** Paging size — 高德 caps each page at 20 for the polygon endpoint. */
const PAGE_SIZE = 20;

/**
 * Marker that gets stamped on every building's `metadata.heightSource`
 * so downstream consumers can tell the height came from a heuristic
 * estimate, not an explicit measurement. Surfaced even when the
 * estimator's own `source` field says something different
 * (e.g. `'default'`) because the architectural choice was "use the
 * heuristic table".
 */
export const HEIGHT_SOURCE_TAG = "heuristic";

/**
 * Function signature for the injected height estimator. Given a
 * raw 高德 poly, it must return a `HeightEstimate` (meters + source +
 * confidence). The default implementation wraps
 * `estimateHeightByHeuristic` from `lib/building-height-estimator`.
 */
export type HeightEstimator = (poly: GaodePoly) => HeightEstimate;

/**
 * Default height estimator: just delegate to the building-height-
 * estimator's heuristic lookup by name + typecode. The name-based
 * heuristic is the strongest signal we have for 高德 records, and
 * this keeps the heuristic table as the single source of truth.
 */
export function createDefaultHeightEstimator(): HeightEstimator {
  return (poly: GaodePoly): HeightEstimate =>
    estimateHeightByHeuristic(poly.name ?? "", poly.type);
}

export type Gaode3DBuildingsSourceOptions = {
  /** 高德 Web Service API key. Falls back to `process.env.AMAP_KEY`. */
  apiKey?: string;
  /** Override the endpoint (useful for tests / mirrors). */
  endpoint?: string;
  /**
   * 高德 POI type codes to fan out across. Each code triggers its
   * own paginated `place/polygon` request. Defaults to
   * `DEFAULT_3D_TYPE_CODES`.
   */
  typeCodes?: ReadonlyArray<string>;
  /** Inject a `fetch` implementation (used by tests). */
  fetchImpl?: typeof fetch;
  /** Override the human-readable name. */
  name?: string;
  /**
   * Override the height estimator. Defaults to
   * `createDefaultHeightEstimator()`. Useful for tests and for
   * callers who want to plug in a domain-specific table.
   */
  heightEstimator?: HeightEstimator;
};

/** Options for the internal per-type-code query. */
type TypeCodeQuery = {
  typeCode: string;
  page: number;
  apiKey: string;
  endpoint: string;
  polygon: string;
  fetchImpl: typeof fetch;
};

/**
 * Issue a single 高德 `place/polygon` request for one type code on
 * one page. Returns `null` on any failure (network, non-OK, bad
 * JSON, non-`'1'` status) so `Promise.allSettled` can absorb the
 * failure without losing sibling type-code results.
 */
async function queryTypeCode({
  typeCode,
  page,
  apiKey,
  endpoint,
  polygon,
  fetchImpl,
}: TypeCodeQuery): Promise<GaodeResponse | null> {
  const url = buildGaodeUrl(
    // BBox not used directly here — polygon is precomputed. We pass
    // a dummy bbox because the URL builder expects one; an empty
    // `polygon` field on the options object would also work but
    // keeping a real bbox keeps the type signature happy.
    { west: 0, south: 0, east: 0, north: 0 },
    {
      apiKey,
      endpoint,
      polygon,
      page,
      offset: PAGE_SIZE,
      typeCodes: typeCode,
      extensions: DEFAULT_EXTENSIONS,
    },
  );

  let response: Response;
  try {
    response = await fetchImpl(url, { method: "GET" });
  } catch (err) {
    console.warn(
      `Gaode3DBuildingsSource: network request failed for types=${typeCode} page=${page}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!response.ok) {
    console.warn(
      `Gaode3DBuildingsSource: HTTP ${response.status} ${response.statusText} for types=${typeCode} page=${page}`,
    );
    return null;
  }

  let payload: GaodeResponse;
  try {
    payload = (await response.json()) as GaodeResponse;
  } catch (err) {
    console.warn(
      `Gaode3DBuildingsSource: failed to parse 高德 JSON for types=${typeCode} page=${page}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (payload.status !== "1") {
    console.warn(
      `Gaode3DBuildingsSource: 高德 returned status=${payload.status} infocode=${payload.infocode} info=${payload.info} for types=${typeCode} page=${page}`,
    );
    return null;
  }

  return payload;
}

/**
 * Fetch all polys for a single type code, paginating until 高德
 * reports exhaustion or the per-code limit is hit. Returns `[]` on
 * any failure (queryTypeCode already logged the cause).
 *
 * `codeLimit` is the per-type-code ceiling: we cap each type code at
 * `opts.limit` so a single dense category (e.g. 120100 住宅小区)
 * cannot starve the other three.
 */
async function fetchAllForTypeCode(
  typeCode: string,
  apiKey: string,
  endpoint: string,
  polygon: string,
  codeLimit: number,
  fetchImpl: typeof fetch,
): Promise<GaodePoly[]> {
  const collected: GaodePoly[] = [];
  for (let page = 1; ; page++) {
    if (collected.length >= codeLimit) break;
    const payload = await queryTypeCode({
      typeCode,
      page,
      apiKey,
      endpoint,
      polygon,
      fetchImpl,
    });
    if (!payload) return collected;
    const polys = payload.polys ?? [];
    for (const poly of polys) {
      if (collected.length >= codeLimit) break;
      collected.push(poly);
    }
    const total = Number.parseInt(payload.count ?? "0", 10) || 0;
    if (polys.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
  }
  return collected;
}

/**
 * Convert a 高德 poly into a `Building`, applying the configured
 * height estimator and stamping the `heightSource = 'heuristic'`
 * metadata tag. Returns `null` for unusable polys (no / malformed
 * `location`).
 */
export function polyToBuilding3D(
  poly: GaodePoly,
  estimator: HeightEstimator,
): Building | null {
  const footprint = parsePolyLocation(poly.location);
  if (!footprint || footprint.length < 4) return null;

  const tags: Record<string, string> = {};
  if (poly.name) tags.name = poly.name;
  if (poly.type) tags["amap:type"] = poly.type;
  if (poly.address) tags["addr:full"] = poly.address;
  if (poly.adname) tags["addr:district"] = poly.adname;
  if (poly.cityname) tags["addr:city"] = poly.cityname;
  if (poly.province) tags["addr:province"] = poly.province;
  if (poly.tel) tags["contact:phone"] = poly.tel;
  if (poly.business_area) tags["amap:business_area"] = poly.business_area;
  // Record which type code this came from so callers can recover
  // the 3D strategy that produced the record.
  tags["gaode-3d:sourceType"] = poly.type ?? "";

  const id = poly.id
    ? `amap-3d-${poly.id}`
    : `amap-3d-${tags.name ?? "anon"}-${footprint[0].lng},${footprint[0].lat}`;

  const { lng, lat } = computeCentroid(footprint);
  const heightEstimate = estimator(poly);
  return {
    id,
    lng,
    lat,
    heightMeters: heightEstimate.meters,
    footprint,
    tags,
    // The 3D source always runs the poly through a heuristic
    // estimator, so the resulting `heightSource` reflects the
    // estimator's own verdict: `heuristic` for a real table hit,
    // `default` for the 8 m fallback. We do NOT stamp the
    // high-level "I asked the heuristic to do this" marker here
    // (that's what `metadata.heightSource = HEIGHT_SOURCE_TAG` is
    // for) because the composite source uses the typed field to
    // rank confidence and needs to distinguish a real match from
    // a default fallback.
    heightSource: heightEstimate.source,
    metadata: {
      // The user asked us to tag every record with this exact value
      // — the high-level "I asked the heuristic to do this" marker,
      // independent of whether the estimator actually matched a row
      // or fell back to the default 8 m.
      heightSource: HEIGHT_SOURCE_TAG,
      // Keep the estimator's own provenance label so callers can
      // tell the difference between a real heuristic hit
      // ('heuristic') and a default fallback ('default').
      estimatedHeightSource: heightEstimate.source,
      estimatedHeightConfidence: heightEstimate.confidence,
    },
  };
}

/**
 * Real `BuildingsSource` backed by 高德 (Amap) with multi-type-code
 * fan-out and heuristic height estimation. The "3D" refers to the
 * resulting `Building.heightMeters` (estimated) so the scene
 * renderer can extrude them.
 *
 * Failure handling: every per-type-code query is wrapped in
 * `Promise.allSettled`, so a single type-code failure (rate limit,
 * invalid key, network glitch) only loses that category's results —
 * the survivors are still merged and returned. The whole source
 * never throws; it resolves to whatever it could gather.
 */
export class Gaode3DBuildingsSource implements BuildingsSource {
  readonly name: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly typeCodes: ReadonlyArray<string>;
  private readonly fetchImpl: typeof fetch;
  private readonly heightEstimator: HeightEstimator;

  constructor(opts: Gaode3DBuildingsSourceOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.AMAP_KEY ?? "";
    if (!this.apiKey) {
      throw new Error(
        "Gaode3DBuildingsSource: missing API key. Pass `apiKey` or set AMAP_KEY.",
      );
    }
    this.endpoint = opts.endpoint ?? DEFAULT_GAODE_ENDPOINT;
    this.typeCodes = opts.typeCodes ?? DEFAULT_3D_TYPE_CODES;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.name = opts.name ?? DEFAULT_NAME;
    this.heightEstimator = opts.heightEstimator ?? createDefaultHeightEstimator();
  }

  async fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]> {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const polygon = buildPolygonParam(bbox);

    // Cap each type code at the global limit so a single dense
    // category cannot starve the others. floor(limit / N) keeps the
    // union under `limit`; leftover `limit % N` buildings are
    // possible because we never truncate mid-list, so we
    // additionally bound by `limit` in the merge step.
    const codeLimit = Math.max(1, Math.floor(limit / this.typeCodes.length));

    const settled = await Promise.allSettled(
      this.typeCodes.map((typeCode) =>
        fetchAllForTypeCode(
          typeCode,
          this.apiKey,
          this.endpoint,
          polygon,
          codeLimit,
          this.fetchImpl,
        ),
      ),
    );

    // Merge + dedupe by id. 高德 ids are globally unique across the
    // whole category tree, so a single id-keyed map is sufficient —
    // no spatial dedupe needed. When a poly appears in multiple type
    // codes (rare, but possible for some chain businesses) the first
    // type code's record wins, matching the user-stated requirement
    // "Merge results, dedupe by id".
    const byId = new Map<string, GaodePoly>();
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]!;
      if (result.status === "rejected") {
        console.warn(
          `Gaode3DBuildingsSource: type code ${this.typeCodes[i]} rejected:`,
          result.reason instanceof Error ? result.reason.message : result.reason,
        );
        continue;
      }
      for (const poly of result.value) {
        const id = poly.id;
        if (!id) continue;
        if (!byId.has(id)) byId.set(id, poly);
      }
    }

    // Convert to Buildings, respecting the global limit, then sort
    // by id for stable downstream caching.
    const buildings: Building[] = [];
    for (const poly of byId.values()) {
      if (buildings.length >= limit) break;
      const building = polyToBuilding3D(poly, this.heightEstimator);
      if (building) buildings.push(building);
    }
    buildings.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return buildings;
  }
}

/** Factory mirroring `createGaodeBuildingsSource`. */
export function createGaode3DBuildingsSource(
  opts: Gaode3DBuildingsSourceOptions = {},
): Gaode3DBuildingsSource {
  return new Gaode3DBuildingsSource(opts);
}
