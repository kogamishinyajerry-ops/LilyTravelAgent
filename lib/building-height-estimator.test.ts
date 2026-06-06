import { describe, it, expect } from "vitest";
import {
  estimateHeightFromTags,
  estimateHeightByHeuristic,
  estimateHeightFromName,
  parseHeightTag,
  parseLevelsTag,
  DEFAULT_HEIGHT_METERS,
  METRES_PER_LEVEL,
} from "./building-height-estimator";

describe("parseHeightTag", () => {
  it("parses bare metres", () => {
    expect(parseHeightTag("25")).toBeCloseTo(25, 5);
    expect(parseHeightTag("25 m")).toBeCloseTo(25, 5);
    expect(parseHeightTag("25.5")).toBeCloseTo(25.5, 5);
  });

  it("converts feet to metres", () => {
    // 100 ft = 30.48 m
    expect(parseHeightTag("100 ft")).toBeCloseTo(30.48, 5);
  });

  it("converts storeys to metres using METRES_PER_LEVEL", () => {
    expect(parseHeightTag("3 storeys")).toBeCloseTo(3 * METRES_PER_LEVEL, 5);
  });

  it("returns null for yes / no / empty / unparseable", () => {
    expect(parseHeightTag(undefined)).toBeNull();
    expect(parseHeightTag("")).toBeNull();
    expect(parseHeightTag("yes")).toBeNull();
    expect(parseHeightTag("no")).toBeNull();
    expect(parseHeightTag("not a number")).toBeNull();
  });
});

describe("parseLevelsTag", () => {
  it("parses a positive integer", () => {
    expect(parseLevelsTag("3")).toBe(3);
    expect(parseLevelsTag("12")).toBe(12);
    expect(parseLevelsTag("2.5")).toBe(2.5);
  });

  it("returns null for empty / non-numeric / zero", () => {
    expect(parseLevelsTag(undefined)).toBeNull();
    expect(parseLevelsTag("")).toBeNull();
    expect(parseLevelsTag("nope")).toBeNull();
    expect(parseLevelsTag("0")).toBeNull();
  });
});

describe("estimateHeightFromTags", () => {
  it("uses tags.height when present, with 'high' confidence", () => {
    const result = estimateHeightFromTags({ height: "25" });
    expect(result.meters).toBe(25);
    expect(result.source).toBe("osm");
    expect(result.confidence).toBe("high");
  });

  it("uses tags.height with 'ft' unit conversion", () => {
    const result = estimateHeightFromTags({ height: "100 ft" });
    expect(result.meters).toBeCloseTo(30.48, 5);
    expect(result.confidence).toBe("high");
  });

  it("uses tags.height with 'storeys' unit conversion", () => {
    const result = estimateHeightFromTags({ height: "3 storeys" });
    expect(result.meters).toBeCloseTo(3 * METRES_PER_LEVEL, 5);
    expect(result.confidence).toBe("high");
  });

  it("falls back to building:levels * METRES_PER_LEVEL when height is absent", () => {
    const result = estimateHeightFromTags({ "building:levels": "3" });
    expect(result.meters).toBe(3 * METRES_PER_LEVEL);
    expect(result.source).toBe("osm");
    expect(result.confidence).toBe("high");
  });

  it("prefers tags.height over building:levels", () => {
    const result = estimateHeightFromTags({
      height: "50",
      "building:levels": "3",
    });
    expect(result.meters).toBe(50);
  });

  it("falls back to the heuristic when no explicit tag is present, using name", () => {
    const result = estimateHeightFromTags({ name: "Central Plaza Tower" });
    // tower is in the office / tall range 30–80
    expect(result.meters).toBeGreaterThanOrEqual(30);
    expect(result.meters).toBeLessThanOrEqual(80);
    expect(result.source).toBe("heuristic");
    expect(result.confidence).toBe("medium");
  });

  it("falls back to the heuristic via the 'building' tag", () => {
    const result = estimateHeightFromTags({ building: "warehouse" });
    expect(result.meters).toBeGreaterThanOrEqual(8);
    expect(result.meters).toBeLessThanOrEqual(15);
    expect(result.confidence).toBe("medium");
  });

  it("returns the default 8 m for empty tags with 'low' confidence", () => {
    const result = estimateHeightFromTags({});
    expect(result.meters).toBe(DEFAULT_HEIGHT_METERS);
    expect(result.source).toBe("default");
    expect(result.confidence).toBe("low");
  });

  it("returns the default for unmatched Chinese names", () => {
    const result = estimateHeightFromTags({ name: "无名建筑" });
    expect(result.meters).toBe(DEFAULT_HEIGHT_METERS);
    expect(result.confidence).toBe("low");
  });
});

describe("estimateHeightByHeuristic (Chinese names)", () => {
  it("matches 写字楼 (office) → 30–80 m", () => {
    const r = estimateHeightByHeuristic("国贸写字楼");
    expect(r.meters).toBeGreaterThanOrEqual(30);
    expect(r.meters).toBeLessThanOrEqual(80);
    expect(r.confidence).toBe("medium");
  });

  it("matches 公寓 (apartment) → 15–30 m", () => {
    const r = estimateHeightByHeuristic("阳光公寓");
    expect(r.meters).toBeGreaterThanOrEqual(15);
    expect(r.meters).toBeLessThanOrEqual(30);
  });

  it("matches 工厂 (factory) → 8–15 m", () => {
    const r = estimateHeightByHeuristic("华东工厂");
    expect(r.meters).toBeGreaterThanOrEqual(8);
    expect(r.meters).toBeLessThanOrEqual(15);
  });

  it("matches 寺庙 (temple) → 6–15 m", () => {
    const r = estimateHeightByHeuristic("灵隐寺庙");
    expect(r.meters).toBeGreaterThanOrEqual(6);
    expect(r.meters).toBeLessThanOrEqual(15);
  });

  it("returns the default for unrecognised Chinese names", () => {
    const r = estimateHeightByHeuristic("西二旗地铁站");
    expect(r.meters).toBe(DEFAULT_HEIGHT_METERS);
    expect(r.confidence).toBe("low");
  });
});

describe("estimateHeightByHeuristic (English names)", () => {
  it("matches 'Office Tower' → 30–80 m", () => {
    const r = estimateHeightByHeuristic("Riverside Office Tower");
    expect(r.meters).toBeGreaterThanOrEqual(30);
    expect(r.meters).toBeLessThanOrEqual(80);
  });

  it("matches 'Apartment' → 15–30 m", () => {
    const r = estimateHeightByHeuristic("Sunset Apartment");
    expect(r.meters).toBeGreaterThanOrEqual(15);
    expect(r.meters).toBeLessThanOrEqual(30);
  });

  it("matches 'Restaurant' → 5–10 m", () => {
    const r = estimateHeightByHeuristic("Local Restaurant");
    expect(r.meters).toBeGreaterThanOrEqual(5);
    expect(r.meters).toBeLessThanOrEqual(10);
  });

  it("matches 'Mall' → 30–80 m", () => {
    const r = estimateHeightByHeuristic("Westfield Mall");
    expect(r.meters).toBeGreaterThanOrEqual(30);
    expect(r.meters).toBeLessThanOrEqual(80);
  });

  it("matches 'Hospital' → 12–20 m", () => {
    const r = estimateHeightByHeuristic("City General Hospital");
    expect(r.meters).toBeGreaterThanOrEqual(12);
    expect(r.meters).toBeLessThanOrEqual(20);
  });
});

describe("estimateHeightByHeuristic (category argument)", () => {
  it("uses the category when name alone doesn't match", () => {
    const r = estimateHeightByHeuristic("Building 7", "写字楼");
    expect(r.meters).toBeGreaterThanOrEqual(30);
    expect(r.meters).toBeLessThanOrEqual(80);
  });

  it("returns the default when neither name nor category matches", () => {
    const r = estimateHeightByHeuristic("Foo", "Bar");
    expect(r.meters).toBe(DEFAULT_HEIGHT_METERS);
    expect(r.confidence).toBe("low");
  });
});

describe("estimateHeightFromName", () => {
  it("delegates to estimateHeightByHeuristic with no category", () => {
    const viaName = estimateHeightFromName("Office Tower");
    const viaHeuristic = estimateHeightByHeuristic("Office Tower");
    expect(viaName).toEqual(viaHeuristic);
  });
});

describe("confidence assignment", () => {
  it("explicit height tag → 'high'", () => {
    expect(estimateHeightFromTags({ height: "30" }).confidence).toBe("high");
  });

  it("explicit building:levels tag → 'high'", () => {
    expect(
      estimateHeightFromTags({ "building:levels": "5" }).confidence,
    ).toBe("high");
  });

  it("matched heuristic → 'medium'", () => {
    expect(estimateHeightFromName("Office Tower").confidence).toBe("medium");
  });

  it("no signal at all → 'low'", () => {
    expect(estimateHeightFromName("Nothing matches this").confidence).toBe(
      "low",
    );
  });
});
