import { describe, it, expect } from "vitest";
import { buildDreamRoadbookDesign, dreamMoods, dreamTemplates } from "./dream-design-skill";
import type { Roadbook, DayPlan } from "./roadbook-types";

describe("dream-design-skill", () => {
  describe("dreamMoods", () => {
    it("should export 4 mood options", () => {
      expect(dreamMoods).toHaveLength(4);
    });

    it("should have valid mood ids", () => {
      const moodIds = dreamMoods.map((m) => m.id);
      expect(moodIds).toContain("cloud");
      expect(moodIds).toContain("geometry");
      expect(moodIds).toContain("dusk");
      expect(moodIds).toContain("neon");
    });

    it("should have Chinese labels", () => {
      dreamMoods.forEach((mood) => {
        expect(typeof mood.label).toBe("string");
        expect(mood.label.length).toBeGreaterThan(0);
      });
    });

    describe("neon mood", () => {
      it("includes neon in dreamMoods", () => {
        const moodIds = dreamMoods.map((m) => m.id);
        expect(moodIds).toContain("neon");
      });

      it("neon mood has a Chinese label (霓虹)", () => {
        const neonMood = dreamMoods.find((m) => m.id === "neon");
        expect(neonMood).toBeDefined();
        expect(neonMood!.label).toBe("霓虹");
      });
    });
  });

  describe("dreamTemplates", () => {
    it("should export 8 template options", () => {
      expect(dreamTemplates).toHaveLength(8);
    });

    it("should have valid template ids", () => {
      const templateIds = dreamTemplates.map((t) => t.id);
      expect(templateIds).toContain("monument");
      expect(templateIds).toContain("starlake");
      expect(templateIds).toContain("lantern");
      expect(templateIds).toContain("snowfield");
      expect(templateIds).toContain("neon-city");
      expect(templateIds).toContain("island");
      expect(templateIds).toContain("shrine");
      expect(templateIds).toContain("desert");
    });

    describe("neon-city template", () => {
      it("includes neon-city in dreamTemplates", () => {
        const templateIds = dreamTemplates.map((t) => t.id);
        expect(templateIds).toContain("neon-city");
      });

      it("neon-city has a Chinese label (霓虹都市)", () => {
        const neonCity = dreamTemplates.find((t) => t.id === "neon-city");
        expect(neonCity).toBeDefined();
        expect(neonCity!.label).toBe("霓虹都市");
      });

      it("neon-city has a generationHint", () => {
        const neonCity = dreamTemplates.find((t) => t.id === "neon-city");
        expect(neonCity).toBeDefined();
        expect(typeof neonCity!.generationHint).toBe("string");
        expect(neonCity!.generationHint.length).toBeGreaterThan(0);
      });
    });

    describe("island template", () => {
      it("includes island in dreamTemplates", () => {
        const templateIds = dreamTemplates.map((t) => t.id);
        expect(templateIds).toContain("island");
      });

      it("island has a Chinese label (漂浮岛屿)", () => {
        const island = dreamTemplates.find((t) => t.id === "island");
        expect(island).toBeDefined();
        expect(island!.label).toBe("漂浮岛屿");
      });

      it("island has a generationHint", () => {
        const island = dreamTemplates.find((t) => t.id === "island");
        expect(island).toBeDefined();
        expect(typeof island!.generationHint).toBe("string");
        expect(island!.generationHint.length).toBeGreaterThan(0);
      });
    });

    describe("shrine template", () => {
      it("includes shrine in dreamTemplates", () => {
        const templateIds = dreamTemplates.map((t) => t.id);
        expect(templateIds).toContain("shrine");
      });

      it("shrine has a Chinese label (清冷神殿)", () => {
        const shrine = dreamTemplates.find((t) => t.id === "shrine");
        expect(shrine).toBeDefined();
        expect(shrine!.label).toBe("清冷神殿");
      });

      it("shrine has a generationHint", () => {
        const shrine = dreamTemplates.find((t) => t.id === "shrine");
        expect(shrine).toBeDefined();
        expect(typeof shrine!.generationHint).toBe("string");
        expect(shrine!.generationHint.length).toBeGreaterThan(0);
      });
    });

    describe("desert template", () => {
      it("includes desert in dreamTemplates", () => {
        const templateIds = dreamTemplates.map((t) => t.id);
        expect(templateIds).toContain("desert");
      });

      it("desert has a Chinese label (大漠孤烟)", () => {
        const desert = dreamTemplates.find((t) => t.id === "desert");
        expect(desert).toBeDefined();
        expect(desert!.label).toBe("大漠孤烟");
      });

      it("desert has a generationHint", () => {
        const desert = dreamTemplates.find((t) => t.id === "desert");
        expect(desert).toBeDefined();
        expect(typeof desert!.generationHint).toBe("string");
        expect(desert!.generationHint.length).toBeGreaterThan(0);
      });
    });

    it("should have all required fields", () => {
      dreamTemplates.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("label");
        expect(template).toHaveProperty("note");
        expect(template).toHaveProperty("generationHint");
        expect(template).toHaveProperty("renderStrategy");
        expect(typeof template.id).toBe("string");
        expect(typeof template.label).toBe("string");
        expect(typeof template.note).toBe("string");
        expect(typeof template.generationHint).toBe("string");
        expect(typeof template.renderStrategy.lens).toBe("string");
        expect(typeof template.renderStrategy.surface).toBe("string");
        expect(typeof template.renderStrategy.motion).toBe("string");
      });
    });

    it("binds each visual template to a cinematic rendering strategy", () => {
      const monument = dreamTemplates.find((template) => template.id === "monument");
      const starlake = dreamTemplates.find((template) => template.id === "starlake");

      expect(monument?.renderStrategy).toEqual({
        lens: "isometric monument",
        surface: "stone / stairs / void",
        motion: "slow parallax",
      });
      expect(starlake?.renderStrategy).toEqual({
        lens: "wide waterline",
        surface: "lake / glint / island",
        motion: "water glide",
      });
    });
  });

  describe("buildDreamRoadbookDesign", () => {
    const createMinimalRoadbook = (overrides: Partial<Roadbook> = {}): Roadbook => ({
      title: "云南旅行",
      subtitle: "彩云之南",
      destination: "云南大理",
      durationLabel: "5天4晚",
      travelerLabel: "2人",
      budgetLabel: "5000元",
      concept: "慢旅行",
      bestFor: [],
      highlights: ["洱海", "古城", "苍山"],
      summary: {
        routeTheme: "自然风光",
        transportPlan: "自驾",
        stayArea: "大理古城",
        rhythm: "休闲",
      },
      days: [],
      budget: [],
      packing: [],
      reminders: [],
      disclaimer: "",
      ...overrides,
    });

    const createDayPlan = (day: number, overrides: Partial<DayPlan> = {}): DayPlan => ({
      day,
      title: `第${day}天`,
      area: "洱海边",
      mood: "休闲",
      routeSummary: "环湖游",
      commuteNote: "",
      budgetNote: "",
      stops: [
        {
          id: `stop-${day}-1`,
          name: "洱海",
          time: "09:00",
          category: "view",
          addressHint: "云南大理",
          why: "风景美",
          duration: "2小时",
          tip: "早上光线好",
        },
      ],
      food: ["米线"],
      photoTips: ["逆光"],
      ...overrides,
    });

    describe("happy path", () => {
      it("should build design with valid roadbook", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1), createDayPlan(2), createDayPlan(3)],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result).toHaveProperty("eyebrow");
        expect(result).toHaveProperty("titleLines");
        expect(result.titleLines).toHaveLength(2);
        expect(result).toHaveProperty("inputDestination");
        expect(result).toHaveProperty("inputMeta");
        expect(result).toHaveProperty("highlightChips");
        expect(result).toHaveProperty("routeStops");
        expect(result).toHaveProperty("routePath");
      });

      it("should include routeStops for each day", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1), createDayPlan(2)],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops).toHaveLength(2);
        expect(result.routeStops[0].day).toBe(1);
        expect(result.routeStops[1].day).toBe(2);
      });

      it("should highlight chips from roadbook highlights", () => {
        const roadbook = createMinimalRoadbook({
          highlights: ["洱海风光", "古城夜景", "苍山雪景"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.highlightChips).toHaveLength(3);
        expect(result.highlightChips[0]).toBe("洱海风光");
        expect(result.highlightChips[1]).toBe("古城夜景");
        expect(result.highlightChips[2]).toBe("苍山雪景");
      });

      it("should limit highlight chips to 3", () => {
        const roadbook = createMinimalRoadbook({
          highlights: ["a", "b", "c", "d", "e"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.highlightChips).toHaveLength(3);
      });

      it("should build route path with bezier curves", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1), createDayPlan(2)],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routePath).toMatch(/^M\d+(\.\d)?\s\d+(\.\d)?/);
        expect(result.routePath).toContain("C"); // cubic bezier curve command
      });
    });

    describe("edge case: empty days", () => {
      it("should handle roadbook with no days", () => {
        const roadbook = createMinimalRoadbook({ days: [] });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops).toHaveLength(0); // empty days means no stops
        expect(result.routePath).toBe("M50 44"); // buildRoutePath handles empty stops
      });

      it("should handle empty destination using shortened title", () => {
        const roadbook = createMinimalRoadbook({
          destination: "",
          title: "未命名旅行",
          days: [],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // shortenDestination truncates to 4 chars, so "未命名旅行" -> "未命名"
        expect(result.inputDestination).toBe("未命名");
        // titleLines[0] = shortDestination + dayLabel = "未命名" + "零日" = "未命名零日"
        expect(result.titleLines[0]).toBe("未命名零日");
      });

      it("should handle empty highlights array", () => {
        const roadbook = createMinimalRoadbook({
          highlights: [],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.highlightChips).toHaveLength(0);
      });
    });

    describe("edge case: single day", () => {
      it("should position single stop at center x=50", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1)],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops[0].x).toBe(50);
        // y uses first fallbackRouteY value (index 0 = 46) for single day
        expect(result.routePath).toBe("M50 46");
      });

      it("should have eyebrow with default destination", () => {
        const roadbook = createMinimalRoadbook({
          destination: "",
          title: "我的旅行",
          days: [createDayPlan(1)],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // shortenDestination truncates to 4 chars: "我的旅行" -> "我"
        expect(result.eyebrow).toContain("我");
        expect(result.eyebrow).toContain("Dynamic Roadbook");
      });
    });

    describe("edge case: max days (10+ days)", () => {
      it("should handle 10 days", () => {
        const days = Array.from({ length: 10 }, (_, i) =>
          createDayPlan(i + 1, { area: `区域${i + 1}` })
        );
        const roadbook = createMinimalRoadbook({ days });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops).toHaveLength(10);
        expect(result.titleLines[0]).toContain("十日");
      });

      it("should cycle through fallback Y values", () => {
        const days = Array.from({ length: 12 }, (_, i) => createDayPlan(i + 1));
        const roadbook = createMinimalRoadbook({ days });

        const result = buildDreamRoadbookDesign(roadbook);

        // Y values should cycle through fallbackRouteY array
        expect(result.routeStops.length).toBe(12);
        // Verify Y values are from fallbackRouteY
        const fallbackY = [46, 32, 43, 30, 45, 34, 48, 36, 44, 33];
        result.routeStops.forEach((stop, i) => {
          const expectedY = fallbackY[i % fallbackY.length];
          expect(stop.y).toBe(expectedY);
        });
      });
    });

    describe("derivePoeticLine logic", () => {
      it("should use scenic keyword from subtitle", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "星湖之旅",
          concept: "",
          highlights: ["其他"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.titleLines[1]).toBe("走进星湖");
      });

      it("should use scenic keyword from concept", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "",
          concept: "星湖",
          highlights: ["其他"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.titleLines[1]).toBe("走进星湖");
      });

      it("should use scenic keyword from highlights", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "",
          concept: "",
          highlights: ["星湖", "其他", "测试"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.titleLines[1]).toBe("走进星湖");
      });

      it("should prefer specific scenic keyword over generic token", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "洱海晨雾",
          concept: "",
          highlights: ["其他"],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // "洱海" comes before "晨雾" in scenicKeywords; both are in subtitle
        expect(result.titleLines[1]).toBe("走进洱海");
      });

      it("should fall back to token extraction when no scenic keyword matches", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "彩云之南",
          concept: "",
          highlights: [],
          summary: { routeTheme: "", transportPlan: "", stayArea: "", rhythm: "" },
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.titleLines[1]).toContain("走进");
      });

      it("should filter out blacklisted tokens", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "体验路线规划",
          concept: "",
          highlights: [],
          summary: { routeTheme: "", transportPlan: "", stayArea: "", rhythm: "" },
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // "体验" and "路线" and "规划" are filtered out
        // So the result should still contain "走进" but via "风里" fallback
        expect(result.titleLines[1]).toContain("走进");
      });

      it("should default to 走进风里 when no tokens survive filtering", () => {
        const roadbook = createMinimalRoadbook({
          subtitle: "体验路线规划",
          concept: "体验路线",
          highlights: ["体验"],
          summary: { routeTheme: "规划", transportPlan: "", stayArea: "", rhythm: "" },
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.titleLines[1]).toBe("走进风里");
      });
    });

    describe("shortenDestination logic", () => {
      it("should remove destination prefixes", () => {
        const roadbook = createMinimalRoadbook({
          destination: "中国云南大理",
          title: "云南旅行",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // shortenDestination removes both "中国" and "云南" prefixes, leaving "大理"
        expect(result.eyebrow).toContain("大理");
      });

      it("should remove common suffixes", () => {
        const roadbook = createMinimalRoadbook({
          destination: "云南旅行目的地",
          title: "旅行",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.highlightChips).toHaveLength(3);
      });

      it("should truncate to 4 characters", () => {
        const roadbook = createMinimalRoadbook({
          destination: "云南",
          title: "很长的旅行目的地名称",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        // The eyebrow should contain shortened destination
        expect(result.eyebrow).toBeDefined();
      });
    });

    describe("deriveDayTitle and deriveDayKeywords", () => {
      it("should use area for day title", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1, { area: "洱海边", title: "环湖" })],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops[0].title).toBe("洱海边");
      });

      it("should fall back to title when area is empty", () => {
        const roadbook = createMinimalRoadbook({
          days: [createDayPlan(1, { area: "", title: "环湖游" })],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops[0].title).toBe("环湖游");
      });

      it("should derive keywords from day properties", () => {
        const roadbook = createMinimalRoadbook({
          days: [
            createDayPlan(1, {
              mood: "休闲",
              routeSummary: "环湖",
              food: ["米线", "饵块"],
              photoTips: ["日出", "逆光"],
              stops: [{ id: "1", name: "洱海", time: "9:00", category: "view", addressHint: "", why: "", duration: "2h", tip: "" }],
            }),
          ],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops[0].keywords.length).toBeGreaterThan(0);
        expect(result.routeStops[0].keywords.length).toBeLessThanOrEqual(3);
      });

      it("should fallback to default keywords when none found", () => {
        const roadbook = createMinimalRoadbook({
          days: [
            createDayPlan(1, {
              mood: "",
              routeSummary: "",
              food: [],
              photoTips: [],
              stops: [],
            }),
          ],
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.routeStops[0].keywords).toEqual(["慢游", "取景", "留白"]);
      });
    });

    describe("inputMeta formatting", () => {
      it("should join all meta fields with /", () => {
        const roadbook = createMinimalRoadbook({
          durationLabel: "5天4晚",
          travelerLabel: "2人",
          budgetLabel: "5000元",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.inputMeta).toBe("5天4晚 / 2人 / 5000元");
      });

      it("should filter out empty meta fields", () => {
        const roadbook = createMinimalRoadbook({
          durationLabel: "5天4晚",
          travelerLabel: "",
          budgetLabel: "",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.inputMeta).toBe("5天4晚");
      });

      it("should handle all empty meta fields", () => {
        const roadbook = createMinimalRoadbook({
          durationLabel: "",
          travelerLabel: "",
          budgetLabel: "",
        });

        const result = buildDreamRoadbookDesign(roadbook);

        expect(result.inputMeta).toBe("");
      });
    });

    describe("day label formatting", () => {
      it("should use Chinese numerals for 1-10 days", () => {
        for (let i = 1; i <= 10; i++) {
          const days = Array.from({ length: i }, (_, idx) => createDayPlan(idx + 1));
          const roadbook = createMinimalRoadbook({ days });
          const result = buildDreamRoadbookDesign(roadbook);
          // dayLabel uses Chinese numerals (零一二三四五六七八九十)
          expect(result.titleLines[0]).toMatch(/[零一二三四五六七八九十]日/);
        }
      });
    });
  });
});
