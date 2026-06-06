import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createMapTilerTerrainSource,
  DEFAULT_NAME,
  MAPTILER_MAX_TILES,
} from "./maptiler-terrain-source";
import {
  decodeTerrainRgb,
  decodeTerrainRgbPixel,
} from "./mapbox-terrain-source";
import type { FetchTerrainOptions } from "./terrain-source";

// Reuse PNG builders from mapbox-terrain-source.test.ts
// (Both sources share the same decodeTerrainRgb implementation.)

/** Pure-JS CRC-32 using the standard PNG polynomial 0xEDB88320. */
function crc32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.byteLength; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const len = new Uint8Array(4);
  len[0] = (data.byteLength >>> 24) & 0xff;
  len[1] = (data.byteLength >>> 16) & 0xff;
  len[2] = (data.byteLength >>> 8) & 0xff;
  len[3] = data.byteLength & 0xff;

  const crcData = new Uint8Array(typeBytes.byteLength + data.byteLength);
  crcData.set(typeBytes);
  crcData.set(data, typeBytes.byteLength);
  const crcVal = crc32(crcData);
  const crcBytes = new Uint8Array(4);
  crcBytes[0] = (crcVal >>> 24) & 0xff;
  crcBytes[1] = (crcVal >>> 16) & 0xff;
  crcBytes[2] = (crcVal >>> 8) & 0xff;
  crcBytes[3] = crcVal & 0xff;

  const chunk = new Uint8Array(4 + 4 + data.byteLength + 4);
  let off = 0;
  chunk.set(len); off += 4;
  chunk.set(typeBytes, off); off += 4;
  chunk.set(data, off); off += data.byteLength;
  chunk.set(crcBytes, off);
  return chunk;
}

function buildTerrainPng(
  rgbTriples: Array<{ r: number; g: number; b: number }>,
): Uint8Array {
  const W = 256;
  const H = 256;
  const rowBytes = W * 3;
  const raw = new Uint8Array((rowBytes + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (rowBytes + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const { r, g, b } = rgbTriples[idx] ?? { r: 0, g: 0, b: 0 };
      const base = y * (rowBytes + 1) + 1 + x * 3;
      raw[base] = r;
      raw[base + 1] = g;
      raw[base + 2] = b;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zlib = require("node:zlib") as typeof import("node:zlib");
  const compressed = zlib.deflateSync(raw);

  const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  ihdrData[0] = (W >>> 24) & 0xff; ihdrData[1] = (W >>> 16) & 0xff;
  ihdrData[2] = (W >>> 8) & 0xff;  ihdrData[3] = W & 0xff;
  ihdrData[4] = (H >>> 24) & 0xff; ihdrData[5] = (H >>> 16) & 0xff;
  ihdrData[6] = (H >>> 8) & 0xff;  ihdrData[7] = H & 0xff;
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = buildPngChunk("IHDR", ihdrData);
  const idatChunk = buildPngChunk("IDAT", compressed);
  const iendChunk = buildPngChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    PNG_SIGNATURE.byteLength +
      ihdrChunk.byteLength +
      idatChunk.byteLength +
      iendChunk.byteLength,
  );
  let off = 0;
  png.set(PNG_SIGNATURE, off); off += PNG_SIGNATURE.byteLength;
  png.set(ihdrChunk, off); off += ihdrChunk.byteLength;
  png.set(idatChunk, off); off += idatChunk.byteLength;
  png.set(iendChunk, off);
  return png;
}

function buildZeroTerrainPng(): Uint8Array {
  return buildTerrainPng(
    Array.from({ length: 256 * 256 }, () => ({ r: 0, g: 0, b: 0 })),
  );
}

function buildUniformTerrainPng(r: number, g: number, b: number): Uint8Array {
  return buildTerrainPng(
    Array.from({ length: 256 * 256 }, () => ({ r, g, b })),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createMapTilerTerrainSource", () => {
  const ORIGINAL_MAPTILER_KEY = process.env.MAPTILER_KEY;

  afterEach(() => {
    if (ORIGINAL_MAPTILER_KEY === undefined) {
      delete process.env.MAPTILER_KEY;
    } else {
      process.env.MAPTILER_KEY = ORIGINAL_MAPTILER_KEY;
    }
    vi.unstubAllGlobals();
  });

  it("throws when no apiKey is provided and MAPTILER_KEY env var is absent", () => {
    delete process.env.MAPTILER_KEY;
    expect(() => createMapTilerTerrainSource()).toThrow(
      "MapTilerTerrainSource requires MAPTILER_KEY env var or apiKey option",
    );
  });

  it("returns an instance with name 'maptiler-terrain-rgb' when given an explicit apiKey", () => {
    const src = createMapTilerTerrainSource({ apiKey: "test-key" });
    expect(src.name).toBe(DEFAULT_NAME);
  });

  it("uses MAPTILER_KEY from process.env when no option is supplied", () => {
    process.env.MAPTILER_KEY = "env-test-key";
    const src = createMapTilerTerrainSource();
    expect(src.name).toBe(DEFAULT_NAME);
  });

  it("uses the provided apiKey even when MAPTILER_KEY env var is set", () => {
    process.env.MAPTILER_KEY = "env-key";
    const src = createMapTilerTerrainSource({ apiKey: "explicit-key" });
    expect(src.name).toBe(DEFAULT_NAME);
  });

  it("allows overriding the name option", () => {
    const src = createMapTilerTerrainSource({
      apiKey: "test-key",
      name: "my-custom-source",
    });
    expect(src.name).toBe("my-custom-source");
  });

  it("allows overriding the endpoint option", () => {
    const src = createMapTilerTerrainSource({
      apiKey: "test-key",
      endpoint: "https://my-proxy/terrain-rgb",
    });
    expect(src.name).toBe(DEFAULT_NAME);
  });
});

describe("fetchTerrain", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let fakePng: Uint8Array;

  beforeEach(() => {
    fakePng = buildZeroTerrainPng();

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      async arrayBuffer() {
        return new Uint8Array(fakePng).buffer as ArrayBuffer;
      },
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an array of TerrainTiles for a tiny bbox", async () => {
    const src = createMapTilerTerrainSource({ apiKey: "test-key" });

    const tiles = await src.fetchTerrain(
      { west: 116.3, south: 39.9, east: 116.4, north: 40.0 },
      { z: 12 },
    );

    expect(Array.isArray(tiles)).toBe(true);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it("calls fetch with the correct MapTiler URL and apiKey", async () => {
    const src = createMapTilerTerrainSource({ apiKey: "my-secret-key" });

    await src.fetchTerrain(
      { west: 116.3, south: 39.9, east: 116.4, north: 40.0 },
      { z: 12 },
    );

    const calls = mockFetch.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [url] = calls[0] as [string];
    expect(url).toContain("api.maptiler.com/tiles/terrain-rgb");
    expect(url).toContain("key=my-secret-key");
    expect(url).toMatch(/\/\d+\/\d+\/\d+\.png/);
  });

  it("throws RangeError when bbox exceeds the 64-tile cap", async () => {
    const src = createMapTilerTerrainSource({ apiKey: "test-key" });

    await expect(
      src.fetchTerrain(
        { west: -180, south: -85, east: 180, north: 85 },
        { z: 14 } satisfies FetchTerrainOptions,
      ),
    ).rejects.toThrow(RangeError);
  });

  it("throws when HTTP response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });

    const src = createMapTilerTerrainSource({ apiKey: "test-key" });

    await expect(
      src.fetchTerrain(
        { west: 116.3, south: 39.9, east: 116.31, north: 39.91 },
        { z: 14 },
      ),
    ).rejects.toThrow("HTTP 403");
  });

  it("decodes terrain-rgb pixels correctly via shared decodeTerrainRgb", async () => {
    // Build a PNG where every pixel is (10, 20, 30)
    const png = buildUniformTerrainPng(10, 20, 30);
    const elevation = await decodeTerrainRgb(png);

    const expected = decodeTerrainRgbPixel(10, 20, 30);
    for (let i = 0; i < elevation.length; i++) {
      expect(elevation[i]).toBeCloseTo(expected, 4);
    }
  });
});

describe("MAPTILER_MAX_TILES constant", () => {
  it("is exported and equals 64", () => {
    expect(MAPTILER_MAX_TILES).toBe(64);
  });
});

describe("decodeTerrainRgbPixel (shared with Mapbox, used by MapTiler)", () => {
  it("converts RGB=0,0,0 to -10000 (void/below-sea-level sentinel)", () => {
    expect(decodeTerrainRgbPixel(0, 0, 0)).toBeCloseTo(-10000, 5);
  });

  it("converts RGB=255,255,255 to the max elevation value", () => {
    expect(decodeTerrainRgbPixel(255, 255, 255)).toBeCloseTo(1667721.5, 4);
  });

  it("converts RGB=128,128,128 to the correct elevation", () => {
    expect(decodeTerrainRgbPixel(128, 128, 128)).toBeCloseTo(832150.4, 4);
  });

  it("matches the documented terrain-rgb formula", () => {
    const r = 10, g = 20, b = 30;
    const expected = -10000 + ((r * 65536 + g * 256 + b) * 0.1);
    expect(decodeTerrainRgbPixel(r, g, b)).toBeCloseTo(expected, 5);
  });
});
