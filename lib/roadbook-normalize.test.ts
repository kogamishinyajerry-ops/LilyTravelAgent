import { describe, it, expect } from "vitest";
import { normalizeRoadbook } from "./roadbook-normalize";
import type { Roadbook, DayPlan, ItineraryStop } from "./roadbook-types";

// Minimal valid stop for reuse
function makeStop(overrides: Partial<ItineraryStop> = {}): ItineraryStop {
  return {
    id: "s1",
    name: "Tokyo Tower",
    time: "09:00",
    category: "view",
    addressHint: "4-2-8 Tokyo",
    why: "iconic",
    duration: "1h",
    tip: "arrive early",
    ...overrides,
  };
}

// Minimal valid day for reuse
function makeDay(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    day: 1,
    title: "Day 1",
    area: "Minato",
    mood: "relaxed",
    routeSummary: "walk",
    commuteNote: "taxi",
    budgetNote: "mid",
    stops: [makeStop()],
    food: ["ramen"],
    photoTips: ["sunset"],
    ...overrides,
  };
}

// Minimal valid roadbook for reuse
function makeRoadbook(overrides: Partial<Roadbook> = {}): Roadbook {
  return {
    title: "Tokyo Trip",
    subtitle: "5-day adventure",
    destination: "Tokyo",
    durationLabel: "5 days",
    travelerLabel: "2 adults",
    budgetLabel: "moderate",
    concept: "urban exploration",
    bestFor: ["culture", "food"],
    highlights: ["Shibuya", "Senso-ji"],
    summary: {
      routeTheme: "modern + tradition",
      transportPlan: "metro",
      stayArea: "Shinjuku",
      rhythm: "balanced",
    },
    days: [makeDay()],
    budget: [{ label: "Meals", amount: "¥8000", note: "per day" }],
    packing: ["shoes"],
    reminders: ["Suica card"],
    disclaimer: "Custom disclaimer",
    ...overrides,
  };
}

describe("normalizeRoadbook", () => {
  describe("disclaimer", () => {
    it("preserves existing disclaimer", () => {
      const input = makeRoadbook({ disclaimer: "My custom disclaimer" });
      const result = normalizeRoadbook(input);
      expect(result.disclaimer).toBe("My custom disclaimer");
    });

    it("fills default disclaimer when missing", () => {
      const input = makeRoadbook({ disclaimer: "" as unknown as undefined });
      const result = normalizeRoadbook(input);
      expect(result.disclaimer).toBe(
        "AI 生成的旅行建议仅用于规划参考。出发前请核验营业时间、票价、预约、交通、天气与安全信息。"
      );
    });

    it("preserves disclaimer even when other fields are missing", () => {
      const input = makeRoadbook({
        disclaimer: "Existing",
        days: [makeDay({ stops: [] })],
      });
      const result = normalizeRoadbook(input);
      expect(result.disclaimer).toBe("Existing");
    });
  });

  describe("stop id normalization", () => {
    it("preserves explicit stop id", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 2,
            stops: [makeStop({ id: "my-custom-id" })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].id).toBe("my-custom-id");
    });

    it("generates id when stop has no id", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 3,
            stops: [makeStop({ id: "" as unknown as undefined })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].id).toBe("day-3-stop-1");
    });

    it("generates sequential ids across multiple stops on the same day", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 1,
            stops: [
              makeStop({ id: "" as unknown as undefined }),
              makeStop({ id: "" as unknown as undefined }),
              makeStop({ id: "" as unknown as undefined }),
            ],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].id).toBe("day-1-stop-1");
      expect(result.days[0].stops[1].id).toBe("day-1-stop-2");
      expect(result.days[0].stops[2].id).toBe("day-1-stop-3");
    });

    it("uses day number from the day object for id generation", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 7,
            stops: [makeStop({ id: "" as unknown as undefined })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].id).toBe("day-7-stop-1");
    });
  });

  describe("stop addressHint normalization", () => {
    it("preserves explicit addressHint", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            stops: [makeStop({ addressHint: "Custom address" })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].addressHint).toBe("Custom address");
    });

    it("generates addressHint from destination + name when missing", () => {
      const input = makeRoadbook({
        destination: "Osaka",
        days: [
          makeDay({
            stops: [makeStop({ addressHint: "" as unknown as undefined })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].addressHint).toBe("OsakaTokyo Tower");
    });
  });

  describe("stop category normalization", () => {
    it("preserves explicit category", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            stops: [makeStop({ category: "food" })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].category).toBe("food");
    });

    it("defaults category to 'other' when missing", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            stops: [makeStop({ category: "" as unknown as undefined })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].category).toBe("other");
    });

    it("each valid category value is preserved", () => {
      const categories: ItineraryStop["category"][] = [
        "view",
        "food",
        "coffee",
        "hotel",
        "transport",
        "culture",
        "shopping",
        "other",
      ];
      for (const cat of categories) {
        const input = makeRoadbook({
          days: [makeDay({ stops: [makeStop({ category: cat })] })],
        });
        const result = normalizeRoadbook(input);
        expect(result.days[0].stops[0].category).toBe(cat);
      }
    });
  });

  describe("days array handling", () => {
    it("returns empty days array unchanged", () => {
      const input = makeRoadbook({ days: [] });
      const result = normalizeRoadbook(input);
      expect(result.days).toEqual([]);
    });

    it("normalizes single day with single stop", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 1,
            stops: [makeStop({ id: "" as unknown as undefined })],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days).toHaveLength(1);
      expect(result.days[0].stops).toHaveLength(1);
      expect(result.days[0].stops[0].id).toBe("day-1-stop-1");
    });

    it("normalizes multiple days each with multiple stops", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 1,
            stops: [
              makeStop({ id: "" as unknown as undefined }),
              makeStop({ id: "" as unknown as undefined }),
            ],
          }),
          makeDay({
            day: 2,
            stops: [
              makeStop({ id: "" as unknown as undefined }),
              makeStop({ id: "" as unknown as undefined }),
              makeStop({ id: "" as unknown as undefined }),
            ],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days).toHaveLength(2);
      expect(result.days[0].stops).toHaveLength(2);
      expect(result.days[1].stops).toHaveLength(3);
      expect(result.days[0].stops[0].id).toBe("day-1-stop-1");
      expect(result.days[0].stops[1].id).toBe("day-1-stop-2");
      expect(result.days[1].stops[0].id).toBe("day-2-stop-1");
      expect(result.days[1].stops[1].id).toBe("day-2-stop-2");
      expect(result.days[1].stops[2].id).toBe("day-2-stop-3");
    });

    it("normalizes day with no stops", () => {
      const input = makeRoadbook({
        days: [makeDay({ stops: [] })],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops).toEqual([]);
    });
  });

  describe("all-stop defaults applied simultaneously", () => {
    it("fills id, addressHint, and category when all are missing", () => {
      const input = makeRoadbook({
        destination: "Kyoto",
        days: [
          makeDay({
            day: 4,
            stops: [
              makeStop({
                id: "" as unknown as undefined,
                addressHint: "" as unknown as undefined,
                category: "" as unknown as undefined,
              }),
            ],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].stops[0].id).toBe("day-4-stop-1");
      expect(result.days[0].stops[0].addressHint).toBe("KyotoTokyo Tower");
      expect(result.days[0].stops[0].category).toBe("other");
    });
  });

  describe("other roadbook fields unchanged", () => {
    it("preserves all top-level Roadbook fields", () => {
      const input = makeRoadbook();
      const result = normalizeRoadbook(input);
      expect(result.title).toBe(input.title);
      expect(result.subtitle).toBe(input.subtitle);
      expect(result.destination).toBe(input.destination);
      expect(result.durationLabel).toBe(input.durationLabel);
      expect(result.travelerLabel).toBe(input.travelerLabel);
      expect(result.budgetLabel).toBe(input.budgetLabel);
      expect(result.concept).toBe(input.concept);
      expect(result.bestFor).toEqual(input.bestFor);
      expect(result.highlights).toEqual(input.highlights);
      expect(result.summary).toEqual(input.summary);
      expect(result.budget).toEqual(input.budget);
      expect(result.packing).toEqual(input.packing);
      expect(result.reminders).toEqual(input.reminders);
    });

    it("preserves day-level fields (title, area, mood, etc.)", () => {
      const input = makeRoadbook({
        days: [
          makeDay({
            day: 5,
            title: "Mt. Fuji Day",
            area: "Fujinomiya",
            mood: "adventurous",
            routeSummary: "hiking",
            commuteNote: "bus",
            budgetNote: "high",
            food: ["sushi", "matcha"],
            photoTips: ["summit sunrise"],
          }),
        ],
      });
      const result = normalizeRoadbook(input);
      expect(result.days[0].day).toBe(5);
      expect(result.days[0].title).toBe("Mt. Fuji Day");
      expect(result.days[0].area).toBe("Fujinomiya");
      expect(result.days[0].mood).toBe("adventurous");
      expect(result.days[0].routeSummary).toBe("hiking");
      expect(result.days[0].commuteNote).toBe("bus");
      expect(result.days[0].budgetNote).toBe("high");
      expect(result.days[0].food).toEqual(["sushi", "matcha"]);
      expect(result.days[0].photoTips).toEqual(["summit sunrise"]);
    });
  });
});
