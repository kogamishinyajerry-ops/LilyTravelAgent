import { NextResponse } from "next/server";
import { gcj02ToWgs84 } from "@/lib/geo";
import type { GeocodePlacesResponse, GeocodePoint } from "@/lib/roadbook-types";
import { geocodeRequestSchema } from "@/lib/roadbook-validation";

export const runtime = "nodejs";

type AmapGeoResponse = {
  status?: string;
  count?: string;
  info?: string;
  geocodes?: Array<{
    formatted_address?: string;
    location?: string;
  }>;
};

async function geocodeOne(key: string, city: string, place: { id: string; name: string; addressHint: string }) {
  const address = place.addressHint || `${city}${place.name}`;
  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", key);
  url.searchParams.set("address", address);
  url.searchParams.set("city", city);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    const data = (await response.json()) as AmapGeoResponse;
    if (!response.ok || data.status !== "1") {
      return {
        id: place.id,
        name: place.name,
        addressHint: address,
        status: "api_error",
        message: data.info || "Amap geocoding request failed.",
      } satisfies GeocodePoint;
    }

    const first = data.geocodes?.[0];
    const location = first?.location;
    if (!location || location.split(",").length !== 2) {
      return {
        id: place.id,
        name: place.name,
        addressHint: address,
        status: "not_found",
        message: "Amap did not return a coordinate for this place.",
      } satisfies GeocodePoint;
    }

    const [lngText, latText] = location.split(",");
    const sourceLngGcj = Number(lngText);
    const sourceLatGcj = Number(latText);
    if (!Number.isFinite(sourceLngGcj) || !Number.isFinite(sourceLatGcj)) {
      return {
        id: place.id,
        name: place.name,
        addressHint: address,
        status: "not_found",
        message: "Amap returned an invalid coordinate.",
      } satisfies GeocodePoint;
    }

    const converted = gcj02ToWgs84(sourceLngGcj, sourceLatGcj);
    return {
      id: place.id,
      name: place.name,
      addressHint: first.formatted_address || address,
      status: "ok",
      lng: converted.lng,
      lat: converted.lat,
      sourceLngGcj,
      sourceLatGcj,
    } satisfies GeocodePoint;
  } catch (error) {
    return {
      id: place.id,
      name: place.name,
      addressHint: address,
      status: "api_error",
      message: error instanceof Error ? error.message : "Amap geocoding failed.",
    } satisfies GeocodePoint;
  }
}

export async function POST(request: Request) {
  const parsed = geocodeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "地点列表格式不完整。",
      },
      { status: 400 },
    );
  }

  const key = process.env.AMAP_KEY;
  if (!key) {
    const payload: GeocodePlacesResponse = {
      ok: true,
      configured: false,
      points: parsed.data.places.map((place) => ({
        id: place.id,
        name: place.name,
        addressHint: place.addressHint,
        status: "missing_key",
        message: "AMAP_KEY is not configured in .env.local.",
      })),
    };
    return NextResponse.json(payload);
  }

  const points: GeocodePoint[] = [];
  for (const place of parsed.data.places) {
    points.push(await geocodeOne(key, parsed.data.city, place));
  }

  const payload: GeocodePlacesResponse = {
    ok: true,
    configured: true,
    points,
  };
  return NextResponse.json(payload);
}
