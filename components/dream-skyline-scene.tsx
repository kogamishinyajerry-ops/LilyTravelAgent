"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Material, Object3D } from "three";
import type { DreamMood, DreamRoadbookDesign, DreamTemplate } from "@/lib/dream-design-skill";
import type { PreviewAsset, Roadbook } from "@/lib/roadbook-types";
import type { LandmarkPreset } from "@/lib/landmark-preset";
import { getFallbackPreset, getFallbackPresetForTemplate } from "@/lib/landmark-preset-fallbacks";
import { renderLandmarkPreset } from "@/lib/landmark-renderer";

type DreamSkylineSceneProps = {
  roadbook: Roadbook;
  design: DreamRoadbookDesign;
  activeDay: number;
  mood: DreamMood;
  template: DreamTemplate;
  previewAsset?: PreviewAsset | null;
  assetStage?: "idle" | "generating" | "ready" | "fallback" | "error";
  assetMessage?: string;
  onSelectDay: (day: number) => void;
  landmarkPreset?: LandmarkPreset | null;
};

type SceneProfile = {
  destination: string;
  label: string;
  landmark: "gate" | "village" | "pagoda" | "deck";
  hasMountain: boolean;
  hasWater: boolean;
  hasOldTown: boolean;
  hasVillage: boolean;
  hasTemple: boolean;
  density: number;
};

type SkylinePalette = {
  sky: string;
  fog: string;
  mountain: string;
  ground: string;
  water: string;
  glass: string;
  stone: string;
  roof: string;
  light: string;
};

const palettes: Record<DreamMood, SkylinePalette> = {
  cloud: {
    sky: "#dfe8ee",
    fog: "#eef2f1",
    mountain: "#8b99a2",
    ground: "#bfc8b8",
    water: "#78aeb9",
    glass: "#dbe7e8",
    stone: "#e4d7c4",
    roof: "#8f6c5f",
    light: "#fff0c2",
  },
  geometry: {
    sky: "#d9e3f2",
    fog: "#f1e9f1",
    mountain: "#7e8bb7",
    ground: "#c9c7d7",
    water: "#80b8c9",
    glass: "#e1e6f8",
    stone: "#ead5d2",
    roof: "#876f86",
    light: "#ffe4a1",
  },
  dusk: {
    sky: "#c9b9c2",
    fog: "#f0d7bc",
    mountain: "#737d9a",
    ground: "#c4a886",
    water: "#6c94a6",
    glass: "#dbcfc5",
    stone: "#e2c6a8",
    roof: "#7f5a52",
    light: "#ffd08a",
  },
  neon: {
    sky: "#0a0e2e",
    fog: "#1a1a3a",
    mountain: "#1f2547",
    ground: "#0d1024",
    water: "#1a4d6b",
    glass: "#3a7eff",
    stone: "#2a2a4a",
    roof: "#1a1a2e",
    light: "#ff2db5",
  },
};

export function DreamSkylineScene({
  roadbook,
  design,
  activeDay,
  mood,
  template,
  previewAsset,
  assetStage = "idle",
  assetMessage,
  onSelectDay,
  landmarkPreset,
}: DreamSkylineSceneProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePlan = roadbook.days.find((day) => day.day === activeDay) || roadbook.days[0];
  const profile = useMemo(() => buildSceneProfile(roadbook, activeDay), [roadbook, activeDay]);
  const palette = palettes[mood];
  const assetSource = previewAsset?.imageDataUrl || previewAsset?.imageUrl;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;

    if (!canvas || !wrap) {
      return;
    }

    let frameId = 0;
    const disposables: Array<{ dispose: () => void }> = [];
    const scene = new Scene();
    scene.fog = new Fog(new Color(palette.fog), 12, 26);

    const camera = new PerspectiveCamera(38, 1, 0.1, 90);
    camera.position.set(0, 5.3, 12.5);
    camera.lookAt(0, 1.05, 0);

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    disposables.push(renderer);

    const root = new Group();
    root.rotation.x = -0.06;
    scene.add(root);

    scene.add(new AmbientLight(0xffffff, 1.9));
    scene.add(new HemisphereLight(new Color(palette.sky), new Color(palette.ground), 1.7));

    const sun = new DirectionalLight(new Color(palette.light), mood === "dusk" ? 4.3 : 3.4);
    sun.position.set(-5.5, 8, 7);
    scene.add(sun);

    const rim = new DirectionalLight(0xffffff, 1.2);
    rim.position.set(6, 4, -8);
    scene.add(rim);

    const terrain = createTerrain(profile, palette, disposables);
    root.add(terrain);

    if (assetSource) {
      root.add(createPreviewAssetBillboard(assetSource, disposables));
    }

    if (profile.hasWater) {
      root.add(createWater(palette, disposables));
    }

    root.add(createSkyline(profile, palette, template, disposables));
    root.add(createRouteRibbon(palette, design.routeStops.length, disposables));
    root.add(createLandmark(profile, palette, template, disposables, landmarkPreset));

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(Math.floor(rect.width), 1);
      const height = Math.max(Math.floor(rect.height), 1);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - start) / 1000;
      root.rotation.y = Math.sin(elapsed * 0.22) * 0.035;
      root.position.y = Math.sin(elapsed * 0.55) * 0.045;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh || object instanceof Line) {
          object.geometry.dispose();
          disposeMaterial(object.material);
        }
      });
      disposables.forEach((item) => item.dispose());
    };
  }, [activeDay, assetSource, design.routeStops.length, mood, palette, profile, template, landmarkPreset]);

  return (
    <div ref={wrapRef} className={`dream-skyline-scene dream-skyline-${template}${
      template === "neon-city" ? " dream-skyline-neon" : ""
    }${
      template === "island" ? " dream-skyline-island" : ""
    }${
      template === "shrine" ? " dream-skyline-shrine" : ""
    }${
      template === "desert" ? " dream-skyline-desert" : ""
    }`}>
      {assetSource ? (
        <div className="dream-skyline-asset-backdrop" style={{ backgroundImage: `url(${assetSource})` }} />
      ) : null}
      <canvas ref={canvasRef} className="dream-skyline-canvas" aria-label={`${profile.destination} 3D 天际线预览`} />
      <div className="dream-skyline-glass" />
      <div className="dream-skyline-caption">
        <span>Terrain Preview</span>
        <strong>{profile.label}</strong>
        <small>{activePlan?.stops[0]?.name || activePlan?.area || roadbook.destination}</small>
      </div>
      <div className={`dream-skyline-asset-chip ${assetStage}`}>
        <span>Asset</span>
        <strong>{buildAssetStatusLabel(assetStage, previewAsset)}</strong>
        <small>{assetMessage || previewAsset?.message || "terrain + image layer"}</small>
      </div>
      <div className="dream-skyline-hotspots" aria-label="选择路书天数">
        {design.routeStops.map((stop, index) => (
          <button
            key={stop.day}
            type="button"
            className={activeDay === stop.day ? "active" : ""}
            style={{
              left: `${12 + index * (76 / Math.max(design.routeStops.length - 1, 1))}%`,
            }}
            onClick={() => onSelectDay(stop.day)}
            aria-pressed={activeDay === stop.day}
          >
            <small>D{stop.day}</small>
            <strong>{stop.title}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function createPreviewAssetBillboard(assetSource: string, disposables: Array<{ dispose: () => void }>) {
  const loader = new TextureLoader();
  loader.setCrossOrigin("anonymous");
  const texture = loader.load(assetSource);
  texture.colorSpace = SRGBColorSpace;
  const geometry = new PlaneGeometry(18, 10.125);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const billboard = new Mesh(geometry, material);
  billboard.position.set(0, 2.45, -5.2);
  disposables.push(texture, geometry, material);
  return billboard;
}

function buildAssetStatusLabel(assetStage: DreamSkylineSceneProps["assetStage"], previewAsset?: PreviewAsset | null) {
  if (assetStage === "generating") {
    return "生成远景图";
  }

  if (assetStage === "ready" && previewAsset?.source === "minimax-image") {
    if (previewAsset.cacheStatus === "hit") {
      return "缓存贴片";
    }

    if (previewAsset.cacheStatus === "stored") {
      return "已写缓存";
    }

    if (previewAsset.cacheStatus === "restored") {
      return "历史贴片";
    }

    if (previewAsset.cacheStatus === "cover") {
      return "最终封面";
    }

    if (previewAsset.cacheStatus === "cleared") {
      return "临时贴片";
    }

    return "AI 贴片已接入";
  }

  if (assetStage === "fallback" || previewAsset?.status === "fallback") {
    return "3D 兜底";
  }

  if (assetStage === "error") {
    return "贴片失败";
  }

  return "程序化地形";
}

function buildSceneProfile(roadbook: Roadbook, activeDay: number): SceneProfile {
  const activePlan = roadbook.days.find((day) => day.day === activeDay) || roadbook.days[0];
  const activeText = [
    activePlan?.area,
    activePlan?.title,
    activePlan?.routeSummary,
    activePlan?.mood,
    activePlan?.stops.map((stop) => `${stop.name} ${stop.category}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const text = [
    roadbook.destination,
    roadbook.title,
    roadbook.subtitle,
    roadbook.concept,
    roadbook.highlights.join(" "),
    activeText,
  ]
    .filter(Boolean)
    .join(" ");
  const hasDali = /大理|洱海|苍山|喜洲|才村|双廊|古城/.test(text);
  const hasWater = /洱海|湖|海|湾|江|河|水|港|岛|双廊/.test(text) || hasDali;
  const hasMountain = /苍山|山|峰|岭|雪|峡|坡/.test(text) || hasDali;
  const hasVillage = /村|镇|喜洲|才村|白族|田园|院|湾|码头/.test(activeText);
  const hasOldTown = /古城|老城|城门|城|街|巷|院|门/.test(activeText) || (hasDali && !hasVillage);
  const hasTemple = /寺|塔|庙|宫/.test(activeText);
  const density = /上海|深圳|香港|重庆|广州|成都|东京|纽约|city|Skyline/i.test(text) ? 1 : 0.56;
  const landmark = hasTemple ? "pagoda" : hasVillage ? "village" : hasOldTown ? "gate" : "deck";
  const landscapeLabel = hasVillage ? "村落码头" : hasOldTown ? "古城轮廓" : "城市天际线";

  return {
    destination: roadbook.destination || "目的地",
    label: [
      hasMountain ? "山体" : "",
      hasWater ? "水面" : "",
      landscapeLabel,
    ]
      .filter(Boolean)
      .join(" / "),
    landmark,
    hasMountain,
    hasWater,
    hasOldTown,
    hasVillage,
    hasTemple,
    density,
  };
}

function createTerrain(
  profile: SceneProfile,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const width = 24;
  const depth = 15;
  const columns = 72;
  const rows = 44;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    const zRatio = row / rows;
    const z = -6.6 + zRatio * depth;

    for (let column = 0; column <= columns; column += 1) {
      const xRatio = column / columns;
      const x = -width / 2 + xRatio * width;
      const ridgeA = Math.exp(-Math.pow((z + 4.6) / 1.25, 2)) * (profile.hasMountain ? 4.2 : 1.2);
      const ridgeB = Math.exp(-Math.pow((z + 2.4) / 1.7, 2)) * (profile.hasMountain ? 2.1 : 0.7);
      const cityPlain = z > -0.4 ? 0.18 : 1;
      const noise = Math.sin(x * 1.05 + z * 0.55) * 0.24 + Math.cos(x * 0.47 - z * 0.82) * 0.18;
      const y = Math.max(0, (ridgeA + ridgeB + noise) * cityPlain - (profile.hasWater && z > 0.4 ? 0.32 : 0));
      positions.push(x, y - 0.35, z);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new MeshStandardMaterial({
    color: new Color(profile.hasMountain ? palette.mountain : palette.ground),
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });
  disposables.push(geometry, material);

  return new Mesh(geometry, material);
}

function createWater(palette: SkylinePalette, disposables: Array<{ dispose: () => void }>) {
  const geometry = new PlaneGeometry(25, 8, 32, 6);
  const material = new MeshStandardMaterial({
    color: new Color(palette.water),
    transparent: true,
    opacity: 0.62,
    roughness: 0.28,
    metalness: 0.12,
    side: DoubleSide,
  });
  const water = new Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.13, 2.8);
  disposables.push(geometry, material);
  return water;
}

function createSkyline(
  profile: SceneProfile,
  palette: SkylinePalette,
  template: DreamTemplate,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();

  // Skyline depth is now data-driven: look up a "skyline" preset for the
  // current template. If no skyline preset exists for this template,
  // return an empty group (no procedural fallback) so we never ship
  // hardcoded boxes / islands / lanterns / neon buildings again.
  const skylineId = `${template}-skyline`;
  const skylinePreset = getFallbackPreset(skylineId);
  if (!skylinePreset) {
    return group;
  }

  // Light hint for grepability: profile.density is still relevant for
  // future preset selection (e.g. low-density vs. dense-city), but for
  // now every template uses the same procedural skyline preset.
  void profile;
  void palette;

  return renderLandmarkPreset(skylinePreset, disposables);
}

function createLandmark(
  profile: SceneProfile,
  palette: SkylinePalette,
  template: DreamTemplate,
  disposables: Array<{ dispose: () => void }>,
  landmarkPreset?: LandmarkPreset | null,
) {
  // Landmarks are now data-driven: prefer the M3 / user-supplied
  // `LandmarkPreset` from the AI landmark UI; fall back to the
  // procedural preset bundled with this template.
  void profile;
  void palette;
  const preset = landmarkPreset ?? getFallbackPresetForTemplate(template);
  return renderLandmarkPreset(preset, disposables);
}

function createRouteRibbon(
  palette: SkylinePalette,
  stopCount: number,
  disposables: Array<{ dispose: () => void }>,
) {
  const points = Array.from({ length: Math.max(stopCount, 2) }, (_, index) => {
    const count = Math.max(stopCount - 1, 1);
    const x = -6.5 + (index / count) * 13;
    const z = 2.8 + Math.sin(index * 1.4) * 0.38;
    return new Vector3(x, 0.06, z);
  });
  const curve = new CatmullRomCurve3(points);
  const geometry = new BufferGeometry().setFromPoints(curve.getPoints(80));
  const material = new LineBasicMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: 0.72,
  });
  disposables.push(geometry, material);
  return new Line(geometry, material);
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  material.dispose();
}
