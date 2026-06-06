// Real BuildingsSource implementation backed by the 高德 / Amap Web
// Service "place/polygon" endpoint. 高德 has the best building
// footprint coverage in mainland China, so this source is the
// natural pick for trips inside CN. Like the Overpass source, the
// constructor accepts an injected `fetch` so unit tests can stub
// responses without touching the network.
//
// Endpoint reference:
//   GET https://restapi.amap.com/v3/place/polygon
//     ?polygon=bbox   (lng,lat;lng,lat;lng,lat;lng,lat — closed ring)
//     &key=AMAP_KEY
//     &types=120000   (商务住宅+商业楼宇 — buildings-of-interest)
//     &extensions=base
//     &offset=20&page=1
//
// The response carries a `polys` array of objects whose `location`
// field is a single string: "lng,lat;lng,lat;...". The ring is
// implicitly closed by 高德 (first vertex === last vertex) but we
// defensively re-close it for consistency with the Overpass source.

import type { BBox } from "./tile-coords";
import type {
  Building,
  BuildingsSource,
  FetchBuildingsOptions,
  FootprintVertex,
} from "./buildings-source";

/** Public 高德 endpoint, exposed as a constant for tests / overrides. */
export const DEFAULT_GAODE_ENDPOINT =
  "https://restapi.amap.com/v3/place/polygon";

/** Default `name` reported via `BuildingsSource.name`. */
export const DEFAULT_NAME = "gaode-amap";

/** 高德 type code that matches the building category we care about. */
export const BUILDING_TYPE_CODE = "120000";

/** Hard cap when the caller does not pass `opts.limit`. */
export const DEFAULT_LIMIT = 2000;

/** Fallback height when 高德 returns no building height metadata. */
export const DEFAULT_HEIGHT_METERS = 8;

/** Paging size — 高德 caps each page at 20 for the polygon endpoint. */
const PAGE_SIZE = 20;

/**
 * Shape of a single `polys[i]` record from the 高德 response. We only
 * type the fields we read; 高德 returns more in `extensions=all` mode
 * (which we don't request).
 */
type GaodePoly = {
  id?: string;
  name?: string;
  type?: string;
  location?: string;
  address?: string;
  adname?: string;
  cityname?: string;
  province?: string;
};

type GaodeResponse = {
  status?: string;
  count?: string;
  info?: string;
  infocode?: string;
  pois?: GaodePoly[];
  polys?: GaodePoly[];
};

export type GaodeBuildingsSourceOptions = {
  /** 高德 Web Service API key. Falls back to `process.env.AMAP_KEY`. */
  apiKey?: string;
  /** Override the endpoint (useful for tests / mirrors). */
  endpoint?: string;
  /** Inject a `fetch` implementation (used by tests). */
  fetchImpl?: typeof fetch;
  /** Override the human-readable name. */
  name?: string;
};

/**
 * Build the `polygon` query parameter for 高德. The endpoint expects
 * a closed ring of `lng,lat;lng,lat;...` vertices (NOT the same
 * orientation as Overpass — 高德 is south/east-ish in a different way
 * but the ring only needs to bound the area, so we just emit
 * `south-west, north-west, north-east, south-east, south-west`).
 */
export function buildPolygonParam(bbox: BBox): string {
  const sw = `${bbox.west},${bbox.south}`;
  const nw = `${bbox.west},${bbox.north}`;
  const ne = `${bbox.east},${bbox.north}`;
  const se = `${bbox.east},${bbox.south}`;
  // Close the ring so the bbox is unambiguous on the server side.
  return `${sw};${nw};${ne};${se};${sw}`;
}

/**
 * Parse a 高德 `location` string ("lng,lat;lng,lat;...") into a
 * polygon. 高德 does not always close the ring, so we append the
 * starting vertex when the last point differs from the first. Returns
 * `null` if fewer than 3 unique points are found or any coordinate
 * fails to parse.
 */
export function parsePolyLocation(
  raw: string | undefined,
): FootprintVertex[] | null {
  if (!raw) return null;
  const tokens = raw.split(";").map((s) => s.trim()).filter(Boolean);
  if (tokens.length < 3) return null;

  const points: FootprintVertex[] = [];
  for (const token of tokens) {
    const [lngRaw, latRaw] = token.split(",");
    if (lngRaw === undefined || latRaw === undefined) return null;
    const lng = Number.parseFloat(lngRaw.trim());
    const lat = Number.parseFloat(latRaw.trim());
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    points.push({ lng, lat });
  }

  // 高德's polygon endpoint returns closed rings; mirror that contract
  // so downstream `isClosedPolygon` checks agree with Overpass.
  const first = points[0];
  const last = points[points.length - 1];
  if (first.lng !== last.lng || first.lat !== last.lat) {
    points.push({ lng: first.lng, lat: first.lat });
  }
  return points;
}

/** Compute the arithmetic-mean centroid of a polygon (same shape as the Overpass helper). */
export function computeCentroid(footprint: FootprintVertex[]): {
  lng: number;
  lat: number;
} {
  if (footprint.length === 0) return { lng: 0, lat: 0 };
  const points =
    footprint.length > 1 &&
    footprint[0].lng === footprint[footprint.length - 1].lng &&
    footprint[0].lat === footprint[footprint.length - 1].lat
      ? footprint.slice(0, -1)
      : footprint;
  const count = points.length || 1;
  let sumLng = 0;
  let sumLat = 0;
  for (const p of points) {
    sumLng += p.lng;
    sumLat += p.lat;
  }
  return { lng: sumLng / count, lat: sumLat / count };
}

/** Convert a `polys[i]` record into a `Building`, or `null` if unusable. */
export function polyToBuilding(poly: GaodePoly): Building | null {
  const footprint = parsePolyLocation(poly.location);
  if (!footprint || footprint.length < 4) return null;

  const tags: Record<string, string> = {};
  if (poly.name) tags.name = poly.name;
  if (poly.type) tags["amap:type"] = poly.type;
  if (poly.address) tags["addr:full"] = poly.address;
  if (poly.adname) tags["addr:district"] = poly.adname;
  if (poly.cityname) tags["addr:city"] = poly.cityname;
  if (poly.province) tags["addr:province"] = poly.province;

  const id = poly.id
    ? `amap-${poly.id}`
    : `amap-${tags.name ?? "anon"}-${footprint[0].lng},${footprint[0].lat}`;

  const { lng, lat } = computeCentroid(footprint);
  return {
    id,
    lng,
    lat,
    heightMeters: DEFAULT_HEIGHT_METERS,
    footprint,
    tags,
  };
}

/**
 * Real `BuildingsSource` backed by 高德 (Amap) "place/polygon".
 *
 * `fetchBuildings` paginates through 高德's 20-per-page responses
 * until the count is exhausted or `opts.limit` is hit. Network errors,
 * non-`"1"` `status` responses, and JSON parse failures resolve to `[]`
 * (with a `console.warn`) so the scene renderer can fall back to its
 * procedural skyline — never throws.
 */
export class GaodeBuildingsSource implements BuildingsSource {
  readonly name: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GaodeBuildingsSourceOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.AMAP_KEY ?? "";
    if (!this.apiKey) {
      throw new Error(
        "GaodeBuildingsSource: missing API key. Pass `apiKey` or set AMAP_KEY.",
      );
    }
    this.endpoint = opts.endpoint ?? DEFAULT_GAODE_ENDPOINT;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.name = opts.name ?? DEFAULT_NAME;
  }

  async fetchBuildings(
    bbox: BBox,
    opts: FetchBuildingsOptions,
  ): Promise<Building[]> {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const polygon = buildPolygonParam(bbox);

    const buildings: Building[] = [];
    for (let page = 1; ; page++) {
      if (buildings.length >= limit) break;
      const url = new URL(this.endpoint);
      url.searchParams.set("key", this.apiKey);
      url.searchParams.set("polygon", polygon);
      url.searchParams.set("types", BUILDING_TYPE_CODE);
      url.searchParams.set("extensions", "base");
      url.searchParams.set("offset", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));

      let response: Response;
      try {
        response = await this.fetchImpl(url.toString(), { method: "GET" });
      } catch (err) {
        console.warn(
          "GaodeBuildingsSource: network request failed:",
          err instanceof Error ? err.message : err,
        );
        return [];
      }

      if (!response.ok) {
        console.warn(
          `GaodeBuildingsSource: HTTP ${response.status} ${response.statusText}`,
        );
        return [];
      }

      let payload: GaodeResponse;
      try {
        payload = (await response.json()) as GaodeResponse;
      } catch (err) {
        console.warn(
          "GaodeBuildingsSource: failed to parse 高德 JSON:",
          err instanceof Error ? err.message : err,
        );
        return [];
      }

      if (payload.status !== "1") {
        console.warn(
          `GaodeBuildingsSource: 高德 returned status=${payload.status} infocode=${payload.infocode} info=${payload.info}`,
        );
        return [];
      }

      const polys = payload.polys ?? [];
      for (const poly of polys) {
        if (buildings.length >= limit) break;
        const building = polyToBuilding(poly);
        if (building) buildings.push(building);
      }

      // `count` is a string; once we've consumed it, stop paginating.
      const total = Number.parseInt(payload.count ?? "0", 10) || 0;
      if (polys.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
    }

    // Stable order so downstream caches can dedupe across calls.
    buildings.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return buildings;
  }
}

/** Factory mirroring `createOverpassBuildingsSource`. */
export function createGaodeBuildingsSource(
  opts: GaodeBuildingsSourceOptions = {},
): GaodeBuildingsSource {
  return new GaodeBuildingsSource(opts);
}
