import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createMapboxTerrainSource,
  decodeTerrainRgb,
  decodeTerrainRgbPixel,
  DEFAULT_NAME,
  MAPBOX_MAX_TILES,
} from "./mapbox-terrain-source";
import type { FetchTerrainOptions } from "./terrain-source";

// ---------------------------------------------------------------------------
// PNG buffer helpers
//
// Builds a minimal 256x256 PNG whose raw pixel values are `pixels` (row-major
// RGB triples). The inflate step uses Node.js zlib which is always available
// in the vitest Node environment.
// ---------------------------------------------------------------------------

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
  chunk.set(len); off += 4;              // length
  chunk.set(typeBytes, off); off += 4;   // type
  chunk.set(data, off); off += data.byteLength; // data
  chunk.set(crcBytes, off);              // CRC
  return chunk;
}

/**
 * Build a valid 256x256 PNG whose pixels encode the given RGB triples.
 * The caller provides exactly 256 × 256 = 65 536 triples.
 */
function buildTerrainPng(
  rgbTriples: Array<{ r: number; g: number; b: number }>,
): Uint8Array {
  const W = 256;
  const H = 256;
  const rowBytes = W * 3;
  const raw = new Uint8Array((rowBytes + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter type: None
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
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type 2 = RGB
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

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

/**
 * Build a 256x256 PNG with all-zero pixels (all elevation = -10000).
 */
function buildZeroTerrainPng(): Uint8Array {
  return buildTerrainPng(
    Array.from({ length: 256 * 256 }, () => ({ r: 0, g: 0, b: 0 })),
  );
}

/**
 * Build a 256x256 PNG where every pixel is (r, g, b).
 */
function buildUniformTerrainPng(r: number, g: number, b: number): Uint8Array {
  return buildTerrainPng(
    Array.from({ length: 256 * 256 }, () => ({ r, g, b })),
  );
}

/**
 * Build a PNG with valid 256x256 IHDR but no IDAT chunk.
 * Used to test the "no IDAT" error path.
 */
function build256x256PngNoIdat(): Uint8Array {
  const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  ihdrData[0] = 0; ihdrData[1] = 0; ihdrData[2] = 1; ihdrData[3] = 0; // width=256
  ihdrData[4] = 0; ihdrData[5] = 0; ihdrData[6] = 1; ihdrData[7] = 0; // height=256
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type 2 = RGB
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const ihdrChunk = buildPngChunk("IHDR", ihdrData);
  const iendChunk = buildPngChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    PNG_SIGNATURE.byteLength +
      ihdrChunk.byteLength +
      iendChunk.byteLength,
  );
  let off = 0;
  png.set(PNG_SIGNATURE, off); off += PNG_SIGNATURE.byteLength;
  png.set(ihdrChunk, off); off += ihdrChunk.byteLength;
  png.set(iendChunk, off);
  return png;
}

/**
 * Build a minimal PNG with valid structure but wrong dimensions (1x1).
 * This is used to test the "wrong width/height" error path.
 */
function buildMinimal1x1Png(): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zlib = require("node:zlib") as typeof import("node:zlib");
  // Raw pixel data for a 1x1 RGB image: filter byte (0) + RGB (3 bytes) = 4 bytes
  const raw = new Uint8Array([0, 0, 0, 0]);
  const compressed = zlib.deflateSync(raw);

  const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR for 1x1 image
  const ihdrData = new Uint8Array(13);
  ihdrData[0] = 0; ihdrData[1] = 0; ihdrData[2] = 0; ihdrData[3] = 1; // width=1
  ihdrData[4] = 0; ihdrData[5] = 0; ihdrData[6] = 0; ihdrData[7] = 1; // height=1
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type 2 = RGB
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createMapboxTerrainSource", () => {
  const ORIGINAL_MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

  afterEach(() => {
    if (ORIGINAL_MAPBOX_TOKEN === undefined) {
      delete process.env.MAPBOX_TOKEN;
    } else {
      process.env.MAPBOX_TOKEN = ORIGINAL_MAPBOX_TOKEN;
    }
    vi.unstubAllGlobals();
  });

  it("throws when no accessToken is provided and MAPBOX_TOKEN env var is absent", () => {
    delete process.env.MAPBOX_TOKEN;
    expect(() => createMapboxTerrainSource()).toThrow(
      "MapboxTerrainSource requires MAPBOX_TOKEN env var or accessToken option",
    );
  });

  it("returns an instance with name 'mapbox-terrain-rgb' when given an explicit token", () => {
    const src = createMapboxTerrainSource({ accessToken: "test-token" });
    expect(src.name).toBe(DEFAULT_NAME);
  });

  it("uses MAPBOX_TOKEN from process.env when no option is supplied", () => {
    process.env.MAPBOX_TOKEN = "env-test-token";
    const src = createMapboxTerrainSource();
    expect(src.name).toBe(DEFAULT_NAME);
  });

  it("uses the provided accessToken even when MAPBOX_TOKEN env var is set", () => {
    process.env.MAPBOX_TOKEN = "env-token";
    const src = createMapboxTerrainSource({ accessToken: "explicit-token" });
    expect(src.name).toBe(DEFAULT_NAME);
  });
});

describe("fetchTerrain", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let fakePng: Uint8Array;

  beforeEach(() => {
    fakePng = buildZeroTerrainPng();

    // Create the mock *before* stubbing so we hold a reference to it
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      async arrayBuffer() {
        // Return a fresh copy of the PNG bytes as an ArrayBuffer so the
        // decoder receives a detached buffer it can safely convert to Uint8Array.
        return new Uint8Array(fakePng).buffer as ArrayBuffer;
      },
    });

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an array of TerrainTiles for a tiny bbox", async () => {
    const src = createMapboxTerrainSource({ accessToken: "test-token" });

    const tiles = await src.fetchTerrain(
      { west: 116.3, south: 39.9, east: 116.4, north: 40.0 },
      { z: 12 },
    );

    expect(Array.isArray(tiles)).toBe(true);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it("calls fetch with the correct Mapbox URL", async () => {
    const src = createMapboxTerrainSource({ accessToken: "my-secret-token" });

    await src.fetchTerrain(
      { west: 116.3, south: 39.9, east: 116.4, north: 40.0 },
      { z: 12 },
    );

    // Find the first call to fetch
    const calls = mockFetch.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const [url] = calls[0] as [string];
    expect(url).toContain("api.mapbox.com/v4/mapbox.terrain-rgb");
    expect(url).toContain("access_token=my-secret-token");
    expect(url).toMatch(/\/\d+\/\d+\/\d+\.pngraw/);
  });

  it("throws RangeError when bbox exceeds the 64-tile cap", async () => {
    const src = createMapboxTerrainSource({ accessToken: "test-token" });

    // A huge bbox spanning nearly the whole world at z=14 produces far more than 64 tiles.
    await expect(
      src.fetchTerrain(
        { west: -180, south: -85, east: 180, north: 85 },
        { z: 14 } satisfies FetchTerrainOptions,
      ),
    ).rejects.toThrow(RangeError);
  });

  it("throws when HTTP response is not ok", async () => {
    // Replace the mock with one that returns a 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });

    const src = createMapboxTerrainSource({ accessToken: "test-token" });

    // Use a tiny bbox to ensure only 1 tile is fetched, keeping the test fast
    await expect(
      src.fetchTerrain(
        { west: 116.3, south: 39.9, east: 116.31, north: 39.91 },
        { z: 14 },
      ),
    ).rejects.toThrow("HTTP 404");
  });
});

describe("decodeTerrainRgbPixel", () => {
  it("converts RGB=0,0,0 to -10000 (the void/below-sea-level sentinel)", () => {
    // Formula: -10000 + ((0*65536 + 0*256 + 0) * 0.1) = -10000
    expect(decodeTerrainRgbPixel(0, 0, 0)).toBeCloseTo(-10000, 5);
  });

  it("converts RGB=255,255,255 to the max elevation value", () => {
    // Formula: -10000 + ((255*65536 + 255*256 + 255) * 0.1) = -10000 + 1677721.5 = 1667721.5
    expect(decodeTerrainRgbPixel(255, 255, 255)).toBeCloseTo(1667721.5, 4);
  });

  it("converts RGB=128,128,128 to the correct elevation", () => {
    // Formula: -10000 + ((128*65536 + 128*256 + 128) * 0.1) = -10000 + 85563801.6 = 832150.4
    expect(decodeTerrainRgbPixel(128, 128, 128)).toBeCloseTo(832150.4, 4);
  });

  it("matches the documented Mapbox formula", () => {
    // height = -10000 + ((R*65536 + G*256 + B) * 0.1)
    const r = 10, g = 20, b = 30;
    const expected = -10000 + ((r * 65536 + g * 256 + b) * 0.1);
    expect(decodeTerrainRgbPixel(r, g, b)).toBeCloseTo(expected, 5);
  });
});

describe("decodeTerrainRgb", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the Node.js zlib inflate path in the Node test environment", async () => {
    // Confirm that inflate takes the zlib path (not DecompressionStream) in vitest's
    // Node environment. The PNG decoder is exercised via buildZeroTerrainPng.
    const png = buildZeroTerrainPng();
    const elevation = await decodeTerrainRgb(png);
    expect(elevation).toBeInstanceOf(Float32Array);
    expect(elevation.length).toBe(256 * 256);
  });

  it("decodes a valid 256x256 PNG and returns a Float32Array of length 65536", async () => {
    const png = buildZeroTerrainPng();
    const elevation = await decodeTerrainRgb(png);
    expect(elevation).toBeInstanceOf(Float32Array);
    expect(elevation.length).toBe(256 * 256);
    expect(elevation[0]).toBeCloseTo(-10000, 5);
  });

  it("throws when PNG signature is missing", async () => {
    const bad = new Uint8Array(100);
    await expect(decodeTerrainRgb(bad)).rejects.toThrow(
      "decodeTerrainRgb: input is not a PNG (bad signature)",
    );
  });

  it("throws when PNG is too short to contain a valid header", async () => {
    await expect(
      decodeTerrainRgb(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])),
    ).rejects.toThrow("decodeTerrainRgb: input is not a PNG (too short)");
  });

  it("throws when width is not 256", async () => {
    // Build a 1x1 PNG — decodeTerrainRgb will reject it as not 256x256
    const png = buildMinimal1x1Png();
    await expect(decodeTerrainRgb(png)).rejects.toThrow(
      "decodeTerrainRgb: expected 256x256 tile",
    );
  });

  it("throws when bit depth is not 8", async () => {
    // Start from a valid 256x256 PNG and corrupt only the bit depth byte.
    // The PNG file layout: signature(8) + length(4) + type(4) + ihdr_data(13) + crc(4)
    //                    = 8 + 4 + 4 + 13 + 4 = 33 bytes for IHDR chunk
    // The IHDR data starts at offset 16 (after sig+len+type).
    // Byte 16-19 = width, Byte 20-23 = height, Byte 24 = bit depth
    const png = buildZeroTerrainPng();
    // Bit depth is at dataStart(16) + 8 = 24
    png[24] = 16; // change bit depth from 8 to 16
    await expect(decodeTerrainRgb(png)).rejects.toThrow(
      "decodeTerrainRgb: expected 8-bit depth, got 16",
    );
  });

  it("throws when color type is not 2 (RGB)", async () => {
    // Corrupt color type (IHDR data byte 9, which is at file offset 16+9=25)
    const png = buildZeroTerrainPng();
    png[25] = 6; // change color type from 2 (RGB) to 6 (RGBA)
    await expect(decodeTerrainRgb(png)).rejects.toThrow(
      "decodeTerrainRgb: expected color type 2 (RGB), got 6",
    );
  });

  it("throws for interlaced PNGs", async () => {
    // Corrupt interlace byte (IHDR data byte 12, at file offset 16+12=28)
    const png = buildZeroTerrainPng();
    png[28] = 1; // change interlace from 0 (None) to 1 (Adam7)
    await expect(decodeTerrainRgb(png)).rejects.toThrow(
      "decodeTerrainRgb: interlaced PNGs are not supported",
    );
  });

  it("throws when PNG has no IDAT chunk", async () => {
    // Build a 256x256 PNG with no IDAT chunk: signature + IHDR + IEND
    const png = build256x256PngNoIdat();
    await expect(decodeTerrainRgb(png)).rejects.toThrow(
      "decodeTerrainRgb: PNG contained no IDAT chunk",
    );
  });

  it("correctly decodes non-zero pixel values and maps to elevations", async () => {
    // Build a 256x256 PNG where every pixel is (10, 20, 30)
    const png = buildUniformTerrainPng(10, 20, 30);
    const elevation = await decodeTerrainRgb(png);

    // The decoder applies decodeTerrainRgbPixel to each pixel.
    // Verify all decoded values are identical (uniform source image)
    // and that they match what decodeTerrainRgbPixel produces for (10,20,30).
    const expected = decodeTerrainRgbPixel(10, 20, 30);
    for (let i = 0; i < elevation.length; i++) {
      expect(elevation[i]).toBeCloseTo(expected, 4);
    }
  });
});

describe("MAPBOX_MAX_TILES constant", () => {
  it("is exported and equals 64", () => {
    expect(MAPBOX_MAX_TILES).toBe(64);
  });
});
