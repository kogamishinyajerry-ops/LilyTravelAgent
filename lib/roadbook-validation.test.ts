import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  formatZodIssues,
  travelBriefSchema,
  roadbookSchema,
  geocodeRequestSchema,
} from "./roadbook-validation";

describe("travelBriefSchema", () => {
  const validTravelBrief = {
    destination: "Paris",
    city: "Paris",
    days: "7",
    travelMonth: "June",
    travelers: "2 adults",
    budget: "medium",
    pace: "moderate",
    interests: ["museums", "food"],
    mustAvoid: "",
    specialRequests: "",
    tone: "friendly",
  };

  describe("happy path", () => {
    it("parses valid travel brief with all required fields", () => {
      const result = travelBriefSchema.safeParse(validTravelBrief);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toBe(7); // coerce number
      }
    });

    it("accepts optional empty strings for mustAvoid and specialRequests", () => {
      const input = { ...validTravelBrief, mustAvoid: "", specialRequests: "" };
      const result = travelBriefSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("keeps optional visual template strategy fields for dream generation prompts", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        visualTemplate: "starlake",
        visualTemplateLabel: "星湖",
        renderStrategy: {
          lens: "wide waterline",
          surface: "lake / glint / island",
          motion: "water glide",
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visualTemplate).toBe("starlake");
        expect(result.data.visualTemplateLabel).toBe("星湖");
        expect(result.data.renderStrategy?.surface).toBe("lake / glint / island");
      }
    });
  });

  describe("constraint: destination", () => {
    it("fails when destination is empty", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, destination: "" });
      expect(result.success).toBe(false);
    });

    it("fails when destination exceeds 80 characters", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        destination: "a".repeat(81),
      });
      expect(result.success).toBe(false);
    });

    it("accepts destination at max length (80)", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        destination: "a".repeat(80),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: city", () => {
    it("fails when city is empty", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, city: "" });
      expect(result.success).toBe(false);
    });

    it("fails when city exceeds 40 characters", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        city: "a".repeat(41),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constraint: days", () => {
    it("fails when days is less than 1", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, days: "0" });
      expect(result.success).toBe(false);
    });

    it("fails when days exceeds 10", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, days: "11" });
      expect(result.success).toBe(false);
    });

    it("coerces string number to integer", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, days: "5" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.days).toBe(5);
    });

    it("accepts days as integer", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, days: 5 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.days).toBe(5);
    });
  });

  describe("constraint: interests", () => {
    it("fails when interests array is empty", () => {
      const result = travelBriefSchema.safeParse({ ...validTravelBrief, interests: [] });
      expect(result.success).toBe(false);
    });

    it("fails when interests exceeds 12 items", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        interests: Array(13).fill("test"),
      });
      expect(result.success).toBe(false);
    });

    it("accepts interests at max count (12)", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        interests: Array(12).fill("interest"),
      });
      expect(result.success).toBe(true);
    });

    it("fails when any interest string is empty", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        interests: ["valid", ""],
      });
      expect(result.success).toBe(false);
    });

    it("fails when any interest exceeds 40 characters", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        interests: ["a".repeat(41)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("error structure", () => {
    it("returns array of errors with path and message", () => {
      const result = travelBriefSchema.safeParse({ destination: "", city: "", days: "0", travelMonth: "", travelers: "", budget: "", pace: "", interests: [], mustAvoid: "", specialRequests: "", tone: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0]).toHaveProperty("path");
        expect(result.error.issues[0]).toHaveProperty("message");
      }
    });
  });

  describe("constraint: renderStrategy", () => {
    it("fails when an optional render strategy field is too long", () => {
      const result = travelBriefSchema.safeParse({
        ...validTravelBrief,
        renderStrategy: {
          lens: "a".repeat(81),
          surface: "lake",
          motion: "glide",
        },
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("roadbookSchema", () => {
  const validStop = {
    name: "Eiffel Tower",
    time: "10:00",
    category: "view",
    addressHint: "Champ de Mars",
    why: "Iconic landmark",
    duration: "2 hours",
    tip: "Book tickets in advance",
  };

  const validDay = {
    day: 1,
    title: "Paris Highlights",
    area: "7th arrondissement",
    mood: "adventurous",
    routeSummary: "Morning at Eiffel Tower",
    commuteNote: "Metro line 6",
    budgetNote: "Moderate",
    stops: [validStop, { ...validStop, name: "Seine River Walk" }],
    food: ["Croissant", "Coffee"],
    photoTips: ["Golden hour shots"],
  };

  const validRoadbook = {
    title: "Paris in 7 Days",
    subtitle: "The Ultimate Guide",
    destination: "Paris",
    durationLabel: "7 Days",
    travelerLabel: "2 Travelers",
    budgetLabel: "Medium Budget",
    concept: "Romantic European getaway",
    bestFor: ["Couples", "First-time visitors"],
    highlights: ["Eiffel Tower", "Louvre", "Notre-Dame"],
    summary: {
      routeTheme: "Historic center exploration",
      transportPlan: "Metro and walking",
      stayArea: "Marais district",
      rhythm: "Balanced",
    },
    days: [validDay],
    budget: [
      { label: "Accommodation", amount: "$150/night", note: "Mid-range hotel" },
      { label: "Food", amount: "$50/day", note: "Local restaurants" },
      { label: "Transport", amount: "$20/day", note: "Metro pass" },
    ],
    packing: ["Comfortable shoes", "Camera", "Adapter"],
    reminders: ["Bring passport", "Check weather", "Learn basic French"],
    disclaimer: "Travel at your own risk",
  };

  describe("happy path", () => {
    it("parses valid roadbook with all required fields", () => {
      const result = roadbookSchema.safeParse(validRoadbook);
      expect(result.success).toBe(true);
    });

    it("accepts roadbook with maximum days (10)", () => {
      const days = Array(10).fill(null).map((_, i) => ({ ...validDay, day: i + 1 }));
      const result = roadbookSchema.safeParse({ ...validRoadbook, days });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: title", () => {
    it("fails when title is empty", () => {
      const result = roadbookSchema.safeParse({ ...validRoadbook, title: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("constraint: bestFor", () => {
    it("fails when bestFor has fewer than 2 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        bestFor: ["Solo travelers"],
      });
      expect(result.success).toBe(false);
    });

    it("fails when bestFor exceeds 8 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        bestFor: Array(9).fill("Category"),
      });
      expect(result.success).toBe(false);
    });

    it("accepts bestFor at min boundary (2)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        bestFor: ["A", "B"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts bestFor at max boundary (8)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        bestFor: Array(8).fill("Category"),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: highlights", () => {
    it("fails when highlights has fewer than 3 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        highlights: ["Only one"],
      });
      expect(result.success).toBe(false);
    });

    it("fails when highlights exceeds 8 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        highlights: Array(9).fill("Highlight"),
      });
      expect(result.success).toBe(false);
    });

    it("accepts highlights at min boundary (3)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        highlights: ["A", "B", "C"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: days", () => {
    it("fails when days array is empty", () => {
      const result = roadbookSchema.safeParse({ ...validRoadbook, days: [] });
      expect(result.success).toBe(false);
    });

    it("fails when days exceeds 10", () => {
      const days = Array(11).fill(null).map((_, i) => ({ ...validDay, day: i + 1 }));
      const result = roadbookSchema.safeParse({ ...validRoadbook, days });
      expect(result.success).toBe(false);
    });

    it("fails when day has fewer than 2 stops", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: [{ ...validStop }] }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when day has more than 6 stops", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: Array(7).fill(validStop) }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts day with stops at min boundary (2)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: [validStop, { ...validStop, name: "Stop 2" }] }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts day with stops at max boundary (6)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: Array(6).fill(validStop) }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts single day roadbook", () => {
      const result = roadbookSchema.safeParse({ ...validRoadbook, days: [validDay] });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: day.food", () => {
    it("fails when food array is empty", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, food: [] }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when food exceeds 5 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, food: Array(6).fill("Food") }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts food at max boundary (5)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, food: Array(5).fill("Food") }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: day.photoTips", () => {
    it("fails when photoTips array is empty", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, photoTips: [] }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when photoTips exceeds 5 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, photoTips: Array(6).fill("Tip") }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constraint: itineraryStopSchema category enum", () => {
    it("accepts valid category enum values", () => {
      const categories = ["view", "food", "coffee", "hotel", "transport", "culture", "shopping", "other"] as const;
      for (const cat of categories) {
        const stop = { ...validStop, category: cat };
        const result = roadbookSchema.safeParse({
          ...validRoadbook,
          days: [{ ...validDay, stops: [validStop, stop] }],
        });
        expect(result.success).toBe(true);
      }
    });

    it("falls back to 'other' for invalid category", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stop = { ...validStop, category: "invalid_category" as any };
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: [validStop, stop] }],
      });
      expect(result.success).toBe(true);
    });

    it("defaults id to empty string when not provided", () => {
      const stopNoId = { ...validStop, id: undefined };
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        days: [{ ...validDay, stops: [stopNoId, { ...validStop, id: "123" }] }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: budget", () => {
    it("fails when budget has fewer than 3 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        budget: [
          { label: "Food", amount: "$50", note: "Per day" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("fails when budget exceeds 8 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        budget: Array(9).fill({ label: "Item", amount: "$10", note: "Note" }),
      });
      expect(result.success).toBe(false);
    });

    it("accepts budget at min boundary (3)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        budget: [
          { label: "A", amount: "$1", note: "N" },
          { label: "B", amount: "$2", note: "M" },
          { label: "C", amount: "$3", note: "O" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("fails when budget item label is empty", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        budget: [
          { label: "", amount: "$50", note: "Note" },
          { label: "Food", amount: "$50", note: "Note" },
          { label: "Transport", amount: "$20", note: "Note" },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constraint: packing", () => {
    it("fails when packing has fewer than 3 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        packing: ["Shoes"],
      });
      expect(result.success).toBe(false);
    });

    it("fails when packing exceeds 10 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        packing: Array(11).fill("Item"),
      });
      expect(result.success).toBe(false);
    });

    it("accepts packing at min boundary (3)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        packing: ["A", "B", "C"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts packing at max boundary (10)", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        packing: Array(10).fill("Item"),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: reminders", () => {
    it("fails when reminders has fewer than 3 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        reminders: ["Just one"],
      });
      expect(result.success).toBe(false);
    });

    it("fails when reminders exceeds 10 items", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        reminders: Array(11).fill("Reminder"),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constraint: summary fields", () => {
    it("fails when summary.routeTheme is empty", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        summary: { ...validRoadbook.summary, routeTheme: "" },
      });
      expect(result.success).toBe(false);
    });

    it("fails when any summary field is missing", () => {
      const result = roadbookSchema.safeParse({
        ...validRoadbook,
        summary: { routeTheme: "Theme", transportPlan: "Plan", stayArea: "Area" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("error structure", () => {
    it("returns ZodError with issues array for invalid roadbook", () => {
      const result = roadbookSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(Array.isArray(result.error.issues)).toBe(true);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("geocodeRequestSchema", () => {
  const validPlace = {
    id: "place-1",
    name: "Eiffel Tower",
    addressHint: "Champ de Mars, Paris",
    day: 1,
    category: "view",
  };

  const validGeocodeRequest = {
    city: "Paris",
    places: [validPlace],
  };

  describe("happy path", () => {
    it("parses valid geocode request", () => {
      const result = geocodeRequestSchema.safeParse(validGeocodeRequest);
      expect(result.success).toBe(true);
    });

    it("accepts optional fields day and category", () => {
      const result = geocodeRequestSchema.safeParse(validGeocodeRequest);
      expect(result.success).toBe(true);
    });

    it("accepts place without optional day and category", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "p1", name: "Spot", addressHint: "Address" }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: city", () => {
    it("fails when city is empty", () => {
      const result = geocodeRequestSchema.safeParse({ city: "", places: [validPlace] });
      expect(result.success).toBe(false);
    });

    it("fails when city exceeds 60 characters", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "a".repeat(61),
        places: [validPlace],
      });
      expect(result.success).toBe(false);
    });

    it("accepts city at max length (60)", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "a".repeat(60),
        places: [validPlace],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: places array", () => {
    it("fails when places array is empty", () => {
      const result = geocodeRequestSchema.safeParse({ city: "Paris", places: [] });
      expect(result.success).toBe(false);
    });

    it("fails when places exceeds 40 items", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: Array(41).fill(validPlace),
      });
      expect(result.success).toBe(false);
    });

    it("accepts places at max boundary (40)", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: Array(40).fill(validPlace),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("constraint: place fields", () => {
    it("fails when place id is empty", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "", name: "Spot", addressHint: "Address" }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when place id exceeds 80 characters", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "a".repeat(81), name: "Spot", addressHint: "Address" }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when place name is empty", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "p1", name: "", addressHint: "Address" }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when place name exceeds 120 characters", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "p1", name: "a".repeat(121), addressHint: "Address" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts addressHint at max length (180)", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "p1", name: "Spot", addressHint: "a".repeat(180) }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty addressHint (has default)", () => {
      const result = geocodeRequestSchema.safeParse({
        city: "Paris",
        places: [{ id: "p1", name: "Spot" }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("error structure", () => {
    it("returns ZodError with issues for invalid request", () => {
      const result = geocodeRequestSchema.safeParse({ city: "", places: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("formatZodIssues", () => {
  it("returns the expected shape with dotted path, message, and code", () => {
    const result = travelBriefSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;

    const issues = formatZodIssues(result.error);

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBe(result.error.issues.length);
    for (const issue of issues) {
      expect(typeof issue.path).toBe("string");
      expect(typeof issue.message).toBe("string");
      expect(typeof issue.code).toBe("string");
    }
  });

  it("uses a dotted path for top-level field issues", () => {
    const result = travelBriefSchema.safeParse({
      destination: "Paris",
      city: "Paris",
      days: "5",
      travelMonth: "June",
      travelers: "2 adults",
      budget: "medium",
      pace: "moderate",
      interests: ["museums"],
      mustAvoid: "",
      specialRequests: "",
      tone: "friendly",
    });
    expect(result.success).toBe(true);

    const error = new z.ZodError([
      {
        code: "invalid_type",
        path: ["title"],
        message: "title is required",
      },
    ]);

    const issues = formatZodIssues(error);
    expect(issues).toEqual([
      { path: "title", message: "title is required", code: "invalid_type" },
    ]);
  });

  it("preserves multiple issues in order", () => {
    const result = roadbookSchema.safeParse({ title: "", subtitle: "" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const issues = formatZodIssues(result.error);
    expect(issues.length).toBe(result.error.issues.length);
    expect(issues.length).toBeGreaterThan(1);

    // Every formatted issue maps back to a Zod issue at the same index.
    result.error.issues.forEach((zodIssue, index) => {
      expect(issues[index].path).toBe(zodIssue.path.join("."));
      expect(issues[index].message).toBe(zodIssue.message);
      expect(issues[index].code).toBe(zodIssue.code);
    });
  });

  it("flattens nested paths with dots (e.g. days.0.stops.2.name)", () => {
    const result = roadbookSchema.safeParse({
      title: "Trip",
      subtitle: "Sub",
      destination: "Paris",
      durationLabel: "7 days",
      travelerLabel: "2",
      budgetLabel: "mid",
      concept: "C",
      bestFor: ["a", "b"],
      highlights: ["h1", "h2", "h3"],
      summary: {
        routeTheme: "t",
        transportPlan: "p",
        stayArea: "s",
        rhythm: "r",
      },
      days: [
        {
          day: 1,
          title: "Day 1",
          area: "Area",
          mood: "mood",
          routeSummary: "rs",
          commuteNote: "cn",
          budgetNote: "bn",
          stops: [
            { name: "Stop 1", time: "10:00", category: "view", addressHint: "a", why: "w", duration: "1h", tip: "t" },
            { name: "Stop 2", time: "11:00", category: "view", addressHint: "a", why: "w", duration: "1h", tip: "t" },
            { name: "", time: "12:00", category: "view", addressHint: "a", why: "w", duration: "1h", tip: "t" },
          ],
          food: ["food"],
          photoTips: ["tip"],
        },
      ],
      budget: [
        { label: "A", amount: "1", note: "n" },
        { label: "B", amount: "2", note: "n" },
        { label: "C", amount: "3", note: "n" },
      ],
      packing: ["p1", "p2", "p3"],
      reminders: ["r1", "r2", "r3"],
      disclaimer: "d",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const issues = formatZodIssues(result.error);
    const nameIssue = issues.find((issue) => issue.path.endsWith("name"));
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.path).toBe("days.0.stops.2.name");
    expect(nameIssue?.message).toBeTruthy();
    expect(typeof nameIssue?.code).toBe("string");
  });

  it("converts numeric path segments to strings", () => {
    const error = new z.ZodError([
      {
        code: "too_small",
        path: ["items", 0, "tags", 2],
        message: "tag too short",
      },
    ]);

    const issues = formatZodIssues(error);
    expect(issues[0].path).toBe("items.0.tags.2");
  });
});
