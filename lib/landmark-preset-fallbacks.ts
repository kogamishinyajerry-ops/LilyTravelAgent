import {
  landmarkPresetSchema,
  validateLandmarkPreset,
  type LandmarkPreset,
  type LandmarkPrimitive,
  type LandmarkMaterialSpec,
} from "./landmark-preset";

/**
 * Procedural fallback LandmarkPresets for the 8 hardcoded landmark
 * functions previously embedded in `components/dream-skyline-scene.tsx`.
 *
 * Each preset is a JSON-serializable description that the renderer can
 * interpret to rebuild the same scene without hardcoding geometry
 * calls. Use `getFallbackPreset(id)` to look up a specific preset, or
 * `getFallbackPresetForTemplate(template)` to pick the best default
 * for a given DreamTemplate.
 */

// ---------------------------------------------------------------------------
// Per-preset builders
// ---------------------------------------------------------------------------

/**
 * 漂浮岛屿 — a tapered earth block with a small tree on top.
 * Mirrors `createIslandLandmark` in dream-skyline-scene.tsx.
 */
function buildIslandClassic(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    earth: { color: "#8b99a2", roughness: 0.94, metalness: 0.02 },
    grass: { color: "#bfc8b8", roughness: 0.82, metalness: 0.02 },
    trunk: { color: "#3d2a1a", roughness: 0.9, metalness: 0.02 },
    foliage: { color: "#4faa55", roughness: 0.78, metalness: 0.02 },
  };

  const primitives: LandmarkPrimitive[] = [
    {
      id: "island-earth-top",
      type: "box",
      position: [0, 0.45, 0],
      size: [1.4, 0.32, 1.4],
      materialId: "earth",
    },
    {
      id: "island-earth-bottom",
      type: "box",
      position: [0, 0.16, 0],
      size: [1.18, 0.24, 1.18],
      materialId: "earth",
    },
    {
      id: "island-grass-top",
      type: "box",
      position: [0, 0.6, 0],
      size: [1.32, 0.06, 1.32],
      materialId: "grass",
    },
    {
      id: "island-tree-trunk",
      type: "cylinder",
      position: [0.18, 0.78, -0.1],
      radius: 0.05,
      // Average of top/bottom radius for a tapered trunk look
      size: [0.09, 0.36, 0.12],
      segments: 8,
      materialId: "trunk",
    },
    {
      id: "island-tree-foliage",
      type: "sphere",
      position: [0.18, 1.06, -0.1],
      radius: 0.2,
      size: [0.2, 0.2, 0.2],
      segments: 12,
      materialId: "foliage",
    },
  ];

  return finalizePreset("island-classic", "island", "浮岛经典", primitives, materials, {
    notes:
      "漂浮岛屿:上下两层泥土方块构成倒锥形基座,顶部铺草皮,侧边立着一棵小树,树叶是一个绿色球体。",
  });
}

/**
 * 清冷神殿 — a vermillion torii gate flanked by two stone lanterns.
 * Mirrors `createShrineLandmark` in dream-skyline-scene.tsx.
 */
function buildShrineClassic(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    shrineRed: { color: "#b8332a", roughness: 0.55, metalness: 0.08 },
    shrineRedDeep: { color: "#8a2018", roughness: 0.6, metalness: 0.08 },
    stone: { color: "#e4d7c4", roughness: 0.88, metalness: 0.02 },
    lanternGlow: {
      color: "#fff0c2",
      emissive: "#fff0c2",
      emissiveIntensity: 1.8,
      roughness: 0.32,
      metalness: 0.05,
    },
  };

  const primitives: LandmarkPrimitive[] = [
    // Torii pillars
    {
      id: "shrine-pillar-left",
      type: "box",
      position: [-0.62, 0.55, 0],
      size: [0.16, 1.1, 0.16],
      materialId: "shrineRed",
    },
    {
      id: "shrine-pillar-right",
      type: "box",
      position: [0.62, 0.55, 0],
      size: [0.16, 1.1, 0.16],
      materialId: "shrineRed",
    },
    // Torii beams
    {
      id: "shrine-nuki",
      type: "box",
      position: [0, 0.92, 0],
      size: [1.7, 0.12, 0.18],
      materialId: "shrineRed",
    },
    {
      id: "shrine-kasagi",
      type: "box",
      position: [0, 1.16, 0],
      size: [1.9, 0.1, 0.2],
      materialId: "shrineRedDeep",
    },
    {
      id: "shrine-shimaki",
      type: "box",
      position: [0, 1.24, 0],
      size: [1.95, 0.04, 0.22],
      materialId: "shrineRedDeep",
    },
    {
      id: "shrine-gakuzuka",
      type: "box",
      position: [0, 1.04, 0],
      size: [0.08, 0.18, 0.08],
      materialId: "shrineRed",
    },
    // Left stone lantern
    {
      id: "shrine-lantern-left-base",
      type: "box",
      position: [-1.1, 0.08, 0.1],
      size: [0.18, 0.16, 0.18],
      materialId: "stone",
    },
    {
      id: "shrine-lantern-left-post",
      type: "cylinder",
      position: [-1.1, 0.34, 0.1],
      radius: 0.055,
      size: [0.1, 0.36, 0.12],
      segments: 8,
      materialId: "stone",
    },
    {
      id: "shrine-lantern-left-housing",
      type: "box",
      position: [-1.1, 0.6, 0.1],
      size: [0.16, 0.16, 0.16],
      materialId: "stone",
    },
    {
      id: "shrine-lantern-left-cap",
      type: "cone",
      position: [-1.1, 0.73, 0.1],
      rotation: [0, Math.PI / 4, 0],
      radius: 0.14,
      size: [0.28, 0.1, 0.28],
      segments: 4,
      materialId: "stone",
    },
    {
      id: "shrine-lantern-left-flame",
      type: "sphere",
      position: [-1.1, 0.82, 0.1],
      radius: 0.05,
      size: [0.05, 0.05, 0.05],
      segments: 10,
      materialId: "lanternGlow",
    },
    // Right stone lantern
    {
      id: "shrine-lantern-right-base",
      type: "box",
      position: [1.1, 0.08, 0.1],
      size: [0.18, 0.16, 0.18],
      materialId: "stone",
    },
    {
      id: "shrine-lantern-right-post",
      type: "cylinder",
      position: [1.1, 0.34, 0.1],
      radius: 0.055,
      size: [0.1, 0.36, 0.12],
      segments: 8,
      materialId: "stone",
    },
    {
      id: "shrine-lantern-right-housing",
      type: "box",
      position: [1.1, 0.6, 0.1],
      size: [0.16, 0.16, 0.16],
      materialId: "stone",
    },
    {
      id: "shrine-lantern-right-cap",
      type: "cone",
      position: [1.1, 0.73, 0.1],
      rotation: [0, Math.PI / 4, 0],
      radius: 0.14,
      size: [0.28, 0.1, 0.28],
      segments: 4,
      materialId: "stone",
    },
    {
      id: "shrine-lantern-right-flame",
      type: "sphere",
      position: [1.1, 0.82, 0.1],
      radius: 0.05,
      size: [0.05, 0.05, 0.05],
      segments: 10,
      materialId: "lanternGlow",
    },
  ];

  return finalizePreset("shrine-classic", "shrine", "神社经典", primitives, materials, {
    notes:
      "朱红色鸟居居中,顶部笠木带深红描边,两侧各立一座石灯笼(底座、立柱、灯室、锥形顶盖、顶端暖光小球),氛围清冷肃穆。",
  });
}

/**
 * 大漠孤烟 — a low sand dune with a back dune, an oasis puddle and
 * three palm trees scattered around it. Mirrors `createDesertLandmark`.
 */
function buildDesertClassic(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    sand: { color: "#e8c98a", roughness: 0.96, metalness: 0.02 },
    sandShadow: { color: "#c8a86a", roughness: 0.95, metalness: 0.02 },
    palmTrunk: { color: "#4a2e1a", roughness: 0.92, metalness: 0.02 },
    palmFrond: { color: "#3f8a3a", roughness: 0.7, metalness: 0.02, side: "double" },
    oasisWater: { color: "#6cb8d6", roughness: 0.18, metalness: 0.18, opacity: 0.85 },
  };

  const primitives: LandmarkPrimitive[] = [
    {
      id: "desert-dune-front",
      type: "sphere",
      position: [0, -0.15, 0],
      radius: 1.2,
      size: [1.2, 1.2, 1.2],
      segments: 24,
      materialId: "sand",
      scale: [1.4, 0.5, 1.1],
    },
    {
      id: "desert-dune-back",
      type: "sphere",
      position: [0.5, -0.1, -0.6],
      radius: 0.7,
      size: [0.7, 0.7, 0.7],
      segments: 18,
      materialId: "sandShadow",
      scale: [1.1, 0.4, 0.9],
    },
    {
      id: "desert-oasis-water",
      type: "plane",
      position: [0.1, 0.02, 0.7],
      rotation: [-Math.PI / 2, 0, 0],
      size: [1.1, 1.1, 0],
      materialId: "oasisWater",
    },
  ];

  // Three palm trees — each is a small group of primitives.
  const palms: Array<{ x: number; z: number; scale: number; idx: number }> = [
    { x: -0.85, z: 0.25, scale: 0.95, idx: 0 },
    { x: 0.7, z: 0.45, scale: 1.05, idx: 1 },
    { x: 0.15, z: 1.0, scale: 0.85, idx: 2 },
  ];

  const frondCount = 5;
  palms.forEach((palm) => {
    const trunkHeight = 1.3 * palm.scale;
    const trunkRadius = 0.05 * palm.scale;
    primitives.push({
      id: `desert-palm-${palm.idx}-trunk`,
      type: "cylinder",
      position: [palm.x, (trunkHeight / 2) * palm.scale, palm.z],
      radius: trunkRadius,
      size: [trunkRadius * 2, trunkHeight, trunkRadius * 2],
      segments: 8,
      materialId: "palmTrunk",
    });
    for (let f = 0; f < frondCount; f += 1) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondLen = 0.55 * palm.scale;
      primitives.push({
        id: `desert-palm-${palm.idx}-frond-${f}`,
        type: "cone",
        position: [
          palm.x + Math.cos(angle) * 0.18 * palm.scale,
          (trunkHeight + 0.12) * palm.scale,
          palm.z + Math.sin(angle) * 0.18 * palm.scale,
        ],
        rotation: [Math.sin(angle) * 0.7, 0, -Math.cos(angle) * 0.7],
        radius: 0.05 * palm.scale,
        size: [0.1 * palm.scale, frondLen, 0.1 * palm.scale],
        segments: 6,
        materialId: "palmFrond",
      });
    }
    primitives.push({
      id: `desert-palm-${palm.idx}-crown`,
      type: "sphere",
      position: [palm.x, (trunkHeight + 0.08) * palm.scale, palm.z],
      radius: 0.08 * palm.scale,
      size: [0.08 * palm.scale, 0.08 * palm.scale, 0.08 * palm.scale],
      segments: 8,
      materialId: "palmFrond",
    });
  });

  return finalizePreset("desert-classic", "desert", "大漠经典", primitives, materials, {
    notes:
      "两座半埋的沙丘(前沙、远沙)与一片圆形水洼构成绿洲,周围三棵椰枣树环绕;每棵树由一根细圆柱树干、5 片向外倾斜的锥形叶和一顶绿色叶冠组成。",
  });
}

/**
 * 霓虹都市塔 — a stepped tower with two cone accents.
 * Mirrors `createNeonTower` in dream-skyline-scene.tsx.
 */
function buildNeonCityTower(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    tower: { color: "#2a2a4a", roughness: 0.45, metalness: 0.3 },
    glow: {
      color: "#ff2db5",
      emissive: "#ff2db5",
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.1,
    },
  };

  const primitives: LandmarkPrimitive[] = [
    {
      id: "neon-tower-base",
      type: "box",
      position: [0, 0.4, 0],
      size: [0.55, 0.8, 0.55],
      materialId: "tower",
    },
    {
      id: "neon-tower-mid",
      type: "box",
      position: [0, 1.0, 0],
      size: [0.38, 0.6, 0.38],
      materialId: "tower",
    },
    {
      id: "neon-tower-top",
      type: "box",
      position: [0, 1.48, 0],
      size: [0.24, 0.36, 0.24],
      materialId: "tower",
    },
    {
      id: "neon-tower-cone",
      type: "cone",
      position: [0, 1.89, 0],
      radius: 0.18,
      size: [0.36, 0.45, 0.36],
      segments: 8,
      materialId: "glow",
    },
    {
      id: "neon-tower-ring",
      type: "cone",
      position: [0, 1.65, 0],
      rotation: [0, Math.PI / 8, 0],
      radius: 0.28,
      size: [0.56, 0.08, 0.56],
      segments: 8,
      materialId: "glow",
    },
  ];

  return finalizePreset("neon-city-tower", "neon-city", "霓虹塔", primitives, materials, {
    notes:
      "三段逐级收窄的暗色方塔,顶部接一截高耸的霓虹锥体,中段环抱一圈倾斜的发光环,夜色里发出粉色辉光。",
  });
}

/**
 * 古城门 — stone gate with two pillars, three roof caps, a deck floor.
 * Mirrors `createAncientGate` in dream-skyline-scene.tsx.
 */
function buildAncientGate(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    stone: { color: "#e4d7c4", roughness: 0.72, metalness: 0.02 },
    roof: { color: "#8f6c5f", roughness: 0.78, metalness: 0.02 },
    shadow: { color: "#3f4750", roughness: 0.9, metalness: 0.02 },
    deck: { color: "#fff0c2", roughness: 0.4, opacity: 0.68 },
  };

  const primitives: LandmarkPrimitive[] = [
    {
      id: "gate-pillar-left",
      type: "box",
      position: [-1.05, 0.55, 0],
      size: [0.58, 1.1, 0.55],
      materialId: "stone",
    },
    {
      id: "gate-pillar-right",
      type: "box",
      position: [1.05, 0.55, 0],
      size: [0.58, 1.1, 0.55],
      materialId: "stone",
    },
    {
      id: "gate-architrave",
      type: "box",
      position: [0, 0.78, 0],
      size: [2.45, 0.38, 0.44],
      materialId: "stone",
    },
    {
      id: "gate-shadow",
      type: "box",
      position: [0, 0.34, 0.03],
      size: [0.8, 0.62, 0.5],
      materialId: "shadow",
    },
    {
      id: "gate-roof-left",
      type: "cone",
      position: [-1.05, 1.2, 0],
      rotation: [0, Math.PI / 4, 0],
      radius: 0.78,
      size: [1.56, 0.78 * 0.32, 1.56],
      segments: 4,
      materialId: "roof",
    },
    {
      id: "gate-roof-right",
      type: "cone",
      position: [1.05, 1.2, 0],
      rotation: [0, Math.PI / 4, 0],
      radius: 0.78,
      size: [1.56, 0.78 * 0.32, 1.56],
      segments: 4,
      materialId: "roof",
    },
    {
      id: "gate-roof-center",
      type: "cone",
      position: [0, 1.05, 0],
      rotation: [0, Math.PI / 4, 0],
      radius: 1.25,
      size: [2.5, 1.25 * 0.32, 2.5],
      segments: 4,
      materialId: "roof",
    },
    {
      id: "gate-deck",
      type: "box",
      position: [0, 0.04, 1.18],
      size: [2.8, 0.08, 2.1],
      materialId: "deck",
    },
  ];

  return finalizePreset("ancient-gate", "monument", "古城门", primitives, materials, {
    notes:
      "左右两根石柱顶着各自的屋顶,中央拱顶由更宽的锥形屋顶覆盖,门后有一块半透明暖色光台,像通往目的地的入口。",
  });
}

/**
 * 古塔 — four stacked floors that taper upward, each with a roof cap.
 * Mirrors `createPagoda` in dream-skyline-scene.tsx.
 */
function buildPagoda(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    stone: { color: "#e4d7c4", roughness: 0.78, metalness: 0.02 },
    roof: { color: "#8f6c5f", roughness: 0.72, metalness: 0.02 },
  };

  const primitives: LandmarkPrimitive[] = [];
  for (let floor = 0; floor < 4; floor += 1) {
    const y = floor * 0.34;
    const width = 0.55 - floor * 0.06;
    const height = 0.26;
    const radius = 0.9 - floor * 0.1;
    primitives.push({
      id: `pagoda-floor-${floor}-body`,
      type: "box",
      position: [0, y + 0.13, 0],
      size: [width, height, width],
      materialId: "stone",
    });
    primitives.push({
      id: `pagoda-floor-${floor}-roof`,
      type: "cone",
      position: [0, y + 0.31, 0],
      rotation: [0, Math.PI / 4, 0],
      radius,
      size: [radius * 2, radius * 0.32, radius * 2],
      segments: 4,
      materialId: "roof",
    });
  }

  return finalizePreset("pagoda", "monument", "古塔", primitives, materials, {
    notes:
      "四层逐级收窄的塔身,每层都罩着一顶四角攒尖顶,整座塔由下至上由大到小,呈现东方宝塔的剪影。",
  });
}

/**
 * 村落码头 — a textured billboard of houses on stilts above a wooden pier.
 * Mirrors `createVillageLandmark` in dream-skyline-scene.tsx.
 */
function buildVillagePier(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    pier: { color: "#4f6062", roughness: 0.9, metalness: 0.02 },
    houses: { color: "#fffde0", roughness: 0.6, metalness: 0.02 },
  };

  const primitives: LandmarkPrimitive[] = [
    // The village houses are rendered as a single textured billboard
    // (a plane), since the source uses a canvas-painted texture rather
    // than individual 3D meshes.
    {
      id: "village-houses-billboard",
      type: "plane",
      position: [0, 0.78, 0],
      size: [5.7, 2.35, 0],
      materialId: "houses",
    },
    {
      id: "village-pier-plank",
      type: "box",
      position: [0, 0.035, 1.7],
      size: [0.12, 0.07, 0.86],
      materialId: "pier",
    },
    {
      id: "village-pier-post-left",
      type: "box",
      position: [-0.58, 0.11, 1.5],
      size: [0.055, 0.22, 0.055],
      materialId: "pier",
    },
    {
      id: "village-pier-post-right",
      type: "box",
      position: [0.58, 0.11, 1.5],
      size: [0.055, 0.22, 0.055],
      materialId: "pier",
    },
  ];

  return finalizePreset("village-pier", "monument", "村落码头", primitives, materials, {
    notes:
      "一座由画布纹理绘制的小村落贴片居中,前方是三块木质栈道(板面加左右两根立柱),像水边的码头小屋。",
  });
}

/**
 * 观景台 — a stone deck with a glass cube and an observation bridge.
 * Mirrors `createObservationDeck` in dream-skyline-scene.tsx.
 */
function buildObservationDeck(): LandmarkPreset {
  const materials: Record<string, LandmarkMaterialSpec> = {
    deck: { color: "#e4d7c4", roughness: 0.65, metalness: 0.02 },
    glass: { color: "#dbe7e8", roughness: 0.34, metalness: 0.1, opacity: 0.68 },
  };

  const primitives: LandmarkPrimitive[] = [
    {
      id: "deck-main-platform",
      type: "box",
      position: [0, 0.12, 0],
      size: [2.4, 0.16, 0.7],
      materialId: "deck",
    },
    {
      id: "deck-glass-cube",
      type: "box",
      position: [0, 0.44, 0],
      size: [1.15, 0.5, 0.45],
      materialId: "glass",
    },
    {
      id: "deck-bridge",
      type: "box",
      position: [0, 0.08, 1.1],
      size: [0.34, 0.1, 1.8],
      materialId: "deck",
    },
  ];

  return finalizePreset("observation-deck", "monument", "观景台", primitives, materials, {
    notes:
      "中央石质平台上立着半透明玻璃观景盒,前方伸出一条窄长的石桥,引导视线进入远景,适合城市天际线。",
  });
}

// ---------------------------------------------------------------------------
// Finalize helper
// ---------------------------------------------------------------------------

function finalizePreset(
  id: string,
  template: string,
  name: string,
  primitives: LandmarkPrimitive[],
  materials: Record<string, LandmarkMaterialSpec>,
  extra: { notes: string },
): LandmarkPreset {
  const preset: LandmarkPreset = {
    id,
    name,
    template,
    source: "procedural-fallback",
    version: 1,
    materials,
    primitives,
    notes: extra.notes,
  };
  // Self-validate before publishing so the export is guaranteed to
  // satisfy the LandmarkPresetSchema. Throws synchronously on dev
  // mistakes (a missing materialId, an invalid color, etc.).
  return landmarkPresetSchema.parse(preset) as LandmarkPreset;
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * The 8 procedural fallback presets, keyed by stable id.
 *
 * Each entry is pre-validated against `landmarkPresetSchema` at module
 * load time, so consumers can rely on the data shape without an extra
 * validation step.
 */
export const FALLBACK_PRESETS: Record<string, LandmarkPreset> = {
  "island-classic": buildIslandClassic(),
  "shrine-classic": buildShrineClassic(),
  "desert-classic": buildDesertClassic(),
  "neon-city-tower": buildNeonCityTower(),
  "ancient-gate": buildAncientGate(),
  pagoda: buildPagoda(),
  "village-pier": buildVillagePier(),
  "observation-deck": buildObservationDeck(),
};

/**
 * Default fallback id for each DreamTemplate. Picks the most aesthetic
 * fit for that template's mood; callers can override by calling
 * `getFallbackPreset` with a different id.
 */
const TEMPLATE_TO_FALLBACK: Record<string, string> = {
  island: "island-classic",
  shrine: "shrine-classic",
  desert: "desert-classic",
  "neon-city": "neon-city-tower",
  monument: "ancient-gate",
  starlake: "observation-deck",
  lantern: "pagoda",
  snowfield: "village-pier",
};

/**
 * Look up a fallback preset by id. Returns `undefined` if no preset
 * matches — callers should provide a default of their own in that case.
 */
export function getFallbackPreset(id: string): LandmarkPreset | undefined {
  return FALLBACK_PRESETS[id];
}

/**
 * Get the recommended fallback preset for a given DreamTemplate.
 *
 * Falls back to `observation-deck` if the template is unknown so the
 * renderer can always mount something.
 */
export function getFallbackPresetForTemplate(template: string): LandmarkPreset {
  const id = TEMPLATE_TO_FALLBACK[template] ?? "observation-deck";
  // TEMPLATE_TO_FALLBACK only references ids that exist in
  // FALLBACK_PRESETS, so the `!` is safe.
  return FALLBACK_PRESETS[id]!;
}

// Re-export validator for convenience to consumers that want to verify
// their own dynamically-built presets against the same schema.
export { validateLandmarkPreset };
