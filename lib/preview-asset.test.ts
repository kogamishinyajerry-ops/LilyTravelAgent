import { buildCinematicPreviewPrompt, buildCinematicScenePromptLine, buildPromptOnlyPreviewAsset } from "./preview-asset";
import type { Roadbook } from "./roadbook-types";
import { sampleRoadbook } from "./sample-roadbook";

const mockRoadbook: Roadbook = {
  title: "Tokyo Discovery",
  subtitle: "Urban cultural journey",
  destination: "Tokyo, Japan",
  durationLabel: "5 days",
  travelerLabel: "Solo",
  budgetLabel: "Mid-range",
  concept: "Cultural immersion",
  bestFor: ["temples", "food", "neon"],
  highlights: ["Shibuya Crossing", "Senso-ji Temple"],
  summary: {
    routeTheme: "modern与传统结合",
    transportPlan: "JR Pass",
    stayArea: "Shinjuku",
    rhythm: "Moderate",
  },
  days: [
    {
      day: 1,
      title: "Arrival & Shinjuku",
      area: "Shinjuku",
      mood: "adventure",
      routeSummary: "Arrive, settle in, evening exploration",
      commuteNote: "Narita Express",
      budgetNote: "¥2000",
      stops: [
        { id: "1", name: "Golden Gai", time: "19:00", category: "culture", addressHint: "Shinjuku", why: "unique bars", duration: "2h", tip: "Cash only" },
        { id: "2", name: "Don Quijote", time: "20:30", category: "shopping", addressHint: "Shinjuku", why: "souvenirs", duration: "1h", tip: "Tax-free" },
      ],
      food: ["Gyudon", "Convenience store snacks"],
      photoTips: ["Neon reflections at night"],
    },
  ],
  budget: [],
  packing: [],
  reminders: [],
  disclaimer: "",
};

describe("buildCinematicPreviewPrompt", () => {
  describe("cinematic scene preset alignment", () => {
    it("adds Dali scene preset, landmark, and atmosphere direction for the active day", () => {
      const result = buildCinematicPreviewPrompt(sampleRoadbook, { activeDay: 2, mood: "dusk", template: "monument" });

      expect(result).toContain("preset dali-cangshan-erhai");
      expect(result).toContain("active shot D2 洱海西线");
      expect(result).toContain("landmark erhai-sail");
      expect(result).toContain("atmosphere erhai-sunset");
      expect(result).toContain("water #78c5cf");
    });

    it("switches the scene direction when another Dali day is active", () => {
      const result = buildCinematicScenePromptLine(sampleRoadbook, 4);

      expect(result).toContain("active shot D4 古城收尾");
      expect(result).toContain("landmark return-cafe");
      expect(result).toContain("atmosphere return-amber");
    });

    it("keeps unsupported destinations explicit instead of inventing a preset", () => {
      const result = buildCinematicScenePromptLine(mockRoadbook, 1);

      expect(result).toContain("no destination-specific 3D preset");
      expect(result).not.toContain("dali-cangshan-erhai");
    });
  });

  describe("island template", () => {
    it("uses floating-sky-islands wording", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { template: "island" });
      expect(result).toContain("floating sky islands");
    });

    it("island template with dusk mood combines correctly", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { mood: "dusk", template: "island" });
      expect(result).toContain("floating sky islands");
      expect(result).toContain("warm dusk light");
    });
  });

  describe("shrine template", () => {
    it("uses shrine-path wording", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { template: "shrine" });
      expect(result).toContain("Japanese shrine path");
    });

    it("shrine template with geometry mood combines correctly", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { mood: "geometry", template: "shrine" });
      expect(result).toContain("Japanese shrine path");
      expect(result).toContain("precise architectural composition");
    });
  });

  describe("desert template", () => {
    it("uses sand-dunes wording", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { template: "desert" });
      expect(result).toContain("sand dunes");
    });

    it("desert template with dusk mood combines correctly", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { mood: "dusk", template: "desert" });
      expect(result).toContain("sand dunes");
      expect(result).toContain("warm dusk light");
    });
  });

  describe("other templates and moods", () => {
    it("neon-city template uses cyberpunk wording", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { template: "neon-city" });
      expect(result).toContain("cyberpunk megacity");
      expect(result).toContain("neon");
    });

    it("default mood uses soft morning light", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, {});
      expect(result).toContain("soft morning light");
    });

    it("cloud + island mood+template combination", () => {
      const result = buildCinematicPreviewPrompt(mockRoadbook, { mood: "cloud", template: "island" });
      expect(result).toContain("floating sky islands");
      expect(result).toContain("soft morning light");
    });
  });
});

describe("buildPromptOnlyPreviewAsset", () => {
  it("returns a fallback PreviewAsset with template-specific visual style", () => {
    const result = buildPromptOnlyPreviewAsset(mockRoadbook, { template: "island" }, "test message");
    expect(result.status).toBe("fallback");
    expect(result.source).toBe("prompt-only");
    expect(result.prompt).toContain("floating sky islands");
    expect(result.message).toBe("test message");
  });

  it("returns fallback with shrine template wording", () => {
    const result = buildPromptOnlyPreviewAsset(mockRoadbook, { template: "shrine" }, "shrine message");
    expect(result.prompt).toContain("Japanese shrine path");
    expect(result.message).toBe("shrine message");
  });

  it("returns fallback with desert template wording", () => {
    const result = buildPromptOnlyPreviewAsset(mockRoadbook, { template: "desert" }, "desert message");
    expect(result.prompt).toContain("sand dunes");
    expect(result.message).toBe("desert message");
  });
});
