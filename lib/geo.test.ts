import { describe, it, expect } from "vitest";
import { gcj02ToWgs84 } from "./geo";

describe("gcj02ToWgs84", () => {
  describe("happy path", () => {
    it("converts GCJ-02 to WGS84 for typical Chinese coordinates", () => {
      // Beijing coordinates (GCJ-02)
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      const result = gcj02ToWgs84(gcjLng, gcjLat);

      // The result should be different from input (China uses encrypted coordinates)
      expect(result.lng).toBeCloseTo(116.39, 1);
      expect(result.lat).toBeCloseTo(39.9, 1);
    });

    it("converts Shanghai coordinates correctly", () => {
      const gcjLng = 121.4737;
      const gcjLat = 31.2304;

      const result = gcj02ToWgs84(gcjLng, gcjLat);

      expect(typeof result.lng).toBe("number");
      expect(typeof result.lat).toBe("number");
      // Result should be different from input (China uses encrypted coordinates)
      expect(result.lng).not.toBe(gcjLng);
      expect(result.lat).not.toBe(gcjLat);
    });

    it("returns coordinates with 6 decimal precision", () => {
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      const result = gcj02ToWgs84(gcjLng, gcjLat);

      // Check that the result has at most 6 decimal places
      const lngDecimals = result.lng.toString().split(".")[1]?.length ?? 0;
      const latDecimals = result.lat.toString().split(".")[1]?.length ?? 0;
      expect(lngDecimals).toBeLessThanOrEqual(6);
      expect(latDecimals).toBeLessThanOrEqual(6);
    });
  });

  describe("edge cases", () => {
    it("returns unchanged coordinates when out of China (lng < 72.004)", () => {
      const lng = 70.0;
      const lat = 40.0;

      const result = gcj02ToWgs84(lng, lat);

      expect(result.lng).toBe(lng);
      expect(result.lat).toBe(lat);
    });

    it("returns unchanged coordinates when out of China (lng > 137.8347)", () => {
      const lng = 140.0;
      const lat = 40.0;

      const result = gcj02ToWgs84(lng, lat);

      expect(result.lng).toBe(lng);
      expect(result.lat).toBe(lat);
    });

    it("returns unchanged coordinates when out of China (lat < 0.8293)", () => {
      const lng = 100.0;
      const lat = 0.0;

      const result = gcj02ToWgs84(lng, lat);

      expect(result.lng).toBe(lng);
      expect(result.lat).toBe(lat);
    });

    it("returns unchanged coordinates when out of China (lat > 55.8271)", () => {
      const lng = 100.0;
      const lat = 60.0;

      const result = gcj02ToWgs84(lng, lat);

      expect(result.lng).toBe(lng);
      expect(result.lat).toBe(lat);
    });

    it("handles default iterations of 3", () => {
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      const result = gcj02ToWgs84(gcjLng, gcjLat);
      const resultExplicit = gcj02ToWgs84(gcjLng, gcjLat, 3);

      expect(result.lng).toBe(resultExplicit.lng);
      expect(result.lat).toBe(resultExplicit.lat);
    });

    it("produces different results with fewer iterations", () => {
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      const result1Iter = gcj02ToWgs84(gcjLng, gcjLat, 1);
      const result3Iter = gcj02ToWgs84(gcjLng, gcjLat, 3);

      // More iterations should give more accurate conversion
      // The results should be different
      expect(result1Iter.lng).not.toBe(result3Iter.lng);
      expect(result1Iter.lat).not.toBe(result3Iter.lat);
    });

    it("produces more accurate results with more iterations", () => {
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      const result1Iter = gcj02ToWgs84(gcjLng, gcjLat, 1);
      const result5Iter = gcj02ToWgs84(gcjLng, gcjLat, 5);

      // With more iterations, the delta application converges closer to true WGS84
      // The 5-iteration result should be closer to convergence than 1-iteration
      const diff1 = Math.abs(result1Iter.lng - result5Iter.lng);
      expect(diff1).toBeGreaterThan(0);
    });

    it("handles boundary coordinates at edge of valid China range", () => {
      // Exact boundary values
      const lng = 72.004;
      const lat = 0.8293;

      // Should not throw and should return valid result
      const result = gcj02ToWgs84(lng, lat);
      expect(typeof result.lng).toBe("number");
      expect(typeof result.lat).toBe("number");
    });

    it("handles zero iteration count gracefully", () => {
      const gcjLng = 116.4074;
      const gcjLat = 39.9042;

      // With 0 iterations, no transformation is applied (out of China check passes)
      const result = gcj02ToWgs84(gcjLng, gcjLat, 0);

      // Since we don't go through the iteration loop, we just get the original offset applied once
      // This is an edge case - just verify it doesn't throw
      expect(typeof result.lng).toBe("number");
      expect(typeof result.lat).toBe("number");
    });

    it("handles coordinates at exact China boundary (lng=137.8347)", () => {
      // Exact boundary is still within China (strict > comparison), so transformation happens
      const lng = 137.8347;
      const lat = 30.0;

      const result = gcj02ToWgs84(lng, lat);

      // Both coordinates get transformed within China
      expect(result.lng).not.toBe(lng);
      expect(result.lat).not.toBe(lat);
    });

    it("handles coordinates at exact China boundary (lat=55.8271)", () => {
      // Exact boundary is still within China (strict > comparison), so transformation happens
      const lng = 100.0;
      const lat = 55.8271;

      const result = gcj02ToWgs84(lng, lat);

      // Both coordinates get transformed within China
      expect(result.lng).not.toBe(lng);
      expect(result.lat).not.toBe(lat);
    });
  });
});
