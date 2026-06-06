"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
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
    root.add(createLandmark(profile, palette, template, disposables));

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
  }, [activeDay, assetSource, design.routeStops.length, mood, palette, profile, template]);

  return (
    <div ref={wrapRef} className={`dream-skyline-scene dream-skyline-${template}${template === "neon-city" ? " dream-skyline-neon" : ""}`}>
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
  const isUrban = profile.density > 0.8;
  if (!isUrban) {
    return group;
  }

  const count = Math.round(28 + profile.density * 38);
  const glass = new MeshStandardMaterial({
    color: new Color(palette.glass),
    roughness: 0.55,
    metalness: 0.08,
    transparent: true,
    opacity: isUrban ? (template === "lantern" ? 0.86 : 0.74) : 0.34,
  });
  disposables.push(glass);

  for (let index = 0; index < count; index += 1) {
    const lane = index % 5;
    const x = -8.2 + ((index * 2.73) % 16.4);
    const z = -0.35 + lane * 0.56 + Math.sin(index * 1.3) * 0.12;
    const width = 0.18 + ((index * 17) % 9) * 0.025;
    const depth = 0.24 + ((index * 11) % 7) * 0.035;
    const heightBase = 0.8;
    const height = heightBase + ((index * 19) % 13) * 0.11;
    const geometry = new BoxGeometry(width, height, depth);
    const mesh = new Mesh(geometry, glass);
    mesh.position.set(x, height / 2 - 0.05, z);
    group.add(mesh);
    disposables.push(geometry);

  }

  if (template === "neon-city") {
    const neonGlass = new MeshStandardMaterial({
      color: new Color(palette.glass),
      roughness: 0.18,
      metalness: 0.45,
      transparent: true,
      opacity: 0.42,
      emissive: new Color(palette.glass),
      emissiveIntensity: 0.55,
    });
    disposables.push(neonGlass);

    const neonLineMat = new LineBasicMaterial({
      color: new Color(palette.light),
      transparent: true,
      opacity: 0.78,
    });
    disposables.push(neonLineMat);

    const neonLightMat = new MeshBasicMaterial({
      color: new Color(palette.light),
      transparent: true,
      opacity: 0.92,
    });
    disposables.push(neonLightMat);

    const neonCount = Math.round(18 + profile.density * 24);
    for (let index = 0; index < neonCount; index += 1) {
      const lane = index % 5;
      const x = -7.6 + ((index * 2.91) % 15.2);
      const z = -0.28 + lane * 0.48 + Math.sin(index * 1.17) * 0.1;
      const width = 0.22 + ((index * 13) % 9) * 0.032;
      const depth = 0.28 + ((index * 17) % 7) * 0.038;
      const height = 0.9 + ((index * 23) % 15) * 0.13;
      const geometry = new BoxGeometry(width, height, depth);
      const mesh = new Mesh(geometry, neonGlass);
      mesh.position.set(x, height / 2 - 0.04, z);
      group.add(mesh);
      disposables.push(geometry);

      const edgesGeom = new EdgesGeometry(geometry);
      const edges = new LineSegments(edgesGeom, neonLineMat);
      edges.position.copy(mesh.position);
      group.add(edges);
      disposables.push(edgesGeom);

      const winW = 0.022;
      const winH = 0.028;
      const winGeom = new BoxGeometry(winW, winH, 0.008);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const winMesh = new Mesh(winGeom, neonLightMat);
          winMesh.position.set(
            x - width / 2 + 0.06 + col * (width * 0.22),
            0.12 + row * (height * 0.28),
            z + depth / 2 + 0.005,
          );
          group.add(winMesh);
        }
      }
      disposables.push(winGeom);
    }
  }

  return group;
}

function createLandmark(
  profile: SceneProfile,
  palette: SkylinePalette,
  template: DreamTemplate,
  disposables: Array<{ dispose: () => void }>,
) {
  if (template === "neon-city") {
    return createNeonTower(palette, disposables);
  }

  if (profile.landmark === "pagoda") {
    return createPagoda(palette, disposables);
  }

  if (profile.landmark === "village") {
    return createVillageLandmark(palette, disposables);
  }

  if (profile.landmark === "gate") {
    return createAncientGate(palette, template, disposables);
  }

  return createObservationDeck(palette, disposables);
}

function createAncientGate(
  palette: SkylinePalette,
  template: DreamTemplate,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.position.set(0, 0, 1.45);
  const stone = new MeshStandardMaterial({ color: new Color(palette.stone), roughness: 0.72, metalness: 0.02 });
  const roof = new MeshStandardMaterial({ color: new Color(palette.roof), roughness: 0.78, metalness: 0.02 });
  const shadow = new MeshStandardMaterial({ color: new Color("#3f4750"), roughness: 0.9, metalness: 0.02 });
  disposables.push(stone, roof, shadow);

  addBox(group, [-1.05, 0.55, 0], [0.58, 1.1, 0.55], stone, disposables);
  addBox(group, [1.05, 0.55, 0], [0.58, 1.1, 0.55], stone, disposables);
  addBox(group, [0, 0.78, 0], [2.45, 0.38, 0.44], stone, disposables);
  addBox(group, [0, 0.34, 0.03], [0.8, 0.62, 0.5], shadow, disposables);

  addRoof(group, [-1.05, 1.2, 0], 0.78, roof, disposables);
  addRoof(group, [1.05, 1.2, 0], 0.78, roof, disposables);
  addRoof(group, [0, 1.05, 0], template === "snowfield" ? 1.02 : 1.25, roof, disposables);

  const deckMaterial = new MeshStandardMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: 0.68,
    roughness: 0.4,
  });
  disposables.push(deckMaterial);
  addBox(group, [0, 0.04, 1.18], [2.8, 0.08, 2.1], deckMaterial, disposables);

  return group;
}

function createPagoda(palette: SkylinePalette, disposables: Array<{ dispose: () => void }>) {
  const group = new Group();
  group.position.set(0, 0, 1.4);
  const stone = new MeshStandardMaterial({ color: new Color(palette.stone), roughness: 0.78 });
  const roof = new MeshStandardMaterial({ color: new Color(palette.roof), roughness: 0.72 });
  disposables.push(stone, roof);

  for (let floor = 0; floor < 4; floor += 1) {
    const y = floor * 0.34;
    addBox(group, [0, y + 0.13, 0], [0.55 - floor * 0.06, 0.26, 0.55 - floor * 0.06], stone, disposables);
    addRoof(group, [0, y + 0.31, 0], 0.9 - floor * 0.1, roof, disposables);
  }

  return group;
}

function createVillageLandmark(palette: SkylinePalette, disposables: Array<{ dispose: () => void }>) {
  const group = new Group();
  group.position.set(0, 0, 1.4);
  const texture = createVillageTexture(palette);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const geometry = new PlaneGeometry(5.7, 2.35);
  const village = new Mesh(geometry, material);
  village.position.set(0, 0.78, 0);
  group.add(village);
  disposables.push(texture, material, geometry);

  const pier = new MeshStandardMaterial({ color: new Color("#4f6062"), roughness: 0.9, metalness: 0.02 });
  disposables.push(pier);
  addBox(group, [0, 0.035, 1.7], [0.12, 0.07, 0.86], pier, disposables);
  addBox(group, [-0.58, 0.11, 1.5], [0.055, 0.22, 0.055], pier, disposables);
  addBox(group, [0.58, 0.11, 1.5], [0.055, 0.22, 0.055], pier, disposables);

  return group;
}

function createVillageTexture(palette: SkylinePalette) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 420;
  const context = canvas.getContext("2d");

  if (!context) {
    return new CanvasTexture(canvas);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const roofGradient = context.createLinearGradient(0, 120, 0, 230);
  roofGradient.addColorStop(0, palette.roof);
  roofGradient.addColorStop(1, "#5f5551");
  const wallGradient = context.createLinearGradient(0, 170, 0, 335);
  wallGradient.addColorStop(0, "rgba(255, 253, 240, 0.98)");
  wallGradient.addColorStop(1, "rgba(232, 239, 231, 0.92)");
  const shadowGradient = context.createLinearGradient(0, 200, 0, 360);
  shadowGradient.addColorStop(0, "rgba(86, 100, 100, 0.72)");
  shadowGradient.addColorStop(1, "rgba(45, 61, 65, 0.5)");

  context.fillStyle = "rgba(255, 255, 255, 0.34)";
  context.beginPath();
  context.ellipse(480, 326, 360, 50, 0, 0, Math.PI * 2);
  context.fill();

  const houses = [
    { x: 120, y: 214, w: 188, h: 96, roof: 52 },
    { x: 300, y: 190, w: 228, h: 122, roof: 60 },
    { x: 514, y: 208, w: 188, h: 104, roof: 54 },
    { x: 690, y: 220, w: 158, h: 88, roof: 44 },
  ];

  houses.forEach((house, index) => {
    context.fillStyle = wallGradient;
    roundRect(context, house.x, house.y, house.w, house.h, 10);
    context.fill();

    context.fillStyle = roofGradient;
    context.beginPath();
    context.moveTo(house.x - 18, house.y + 8);
    context.lineTo(house.x + house.w / 2, house.y - house.roof);
    context.lineTo(house.x + house.w + 18, house.y + 8);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(68, 83, 82, 0.75)";
    const windowWidth = index === 1 ? 62 : 46;
    roundRect(context, house.x + house.w * 0.36, house.y + house.h * 0.45, windowWidth, house.h * 0.28, 3);
    context.fill();
  });

  context.strokeStyle = "rgba(255, 255, 255, 0.76)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(118, 318);
  context.bezierCurveTo(292, 340, 628, 332, 846, 312);
  context.stroke();

  context.fillStyle = shadowGradient;
  roundRect(context, 438, 310, 88, 26, 5);
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createObservationDeck(palette: SkylinePalette, disposables: Array<{ dispose: () => void }>) {
  const group = new Group();
  group.position.set(0, 0, 1.3);
  const deck = new MeshStandardMaterial({ color: new Color(palette.stone), roughness: 0.65 });
  const glass = new MeshStandardMaterial({
    color: new Color(palette.glass),
    transparent: true,
    opacity: 0.68,
    roughness: 0.34,
    metalness: 0.1,
  });
  disposables.push(deck, glass);
  addBox(group, [0, 0.12, 0], [2.4, 0.16, 0.7], deck, disposables);
  addBox(group, [0, 0.44, 0], [1.15, 0.5, 0.45], glass, disposables);
  addBox(group, [0, 0.08, 1.1], [0.34, 0.1, 1.8], deck, disposables);
  return group;
}

function createNeonTower(
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.position.set(0, 0, 1.4);

  const towerMat = new MeshStandardMaterial({
    color: new Color(palette.stone),
    roughness: 0.45,
    metalness: 0.3,
  });
  disposables.push(towerMat);

  const glowMat = new MeshStandardMaterial({
    color: new Color(palette.light),
    emissive: new Color(palette.light),
    emissiveIntensity: 2.2,
    roughness: 0.1,
    metalness: 0.1,
  });
  disposables.push(glowMat);

  addBox(group, [0, 0.4, 0], [0.55, 0.8, 0.55], towerMat, disposables);
  addBox(group, [0, 1.0, 0], [0.38, 0.6, 0.38], towerMat, disposables);
  addBox(group, [0, 1.48, 0], [0.24, 0.36, 0.24], towerMat, disposables);

  const coneGeom = new ConeGeometry(0.18, 0.45, 8);
  const cone = new Mesh(coneGeom, glowMat);
  cone.position.set(0, 1.89, 0);
  group.add(cone);
  disposables.push(coneGeom);

  const ringGeom = new ConeGeometry(0.28, 0.08, 8);
  const ring = new Mesh(ringGeom, glowMat);
  ring.position.set(0, 1.65, 0);
  ring.rotation.y = Math.PI / 8;
  group.add(ring);
  disposables.push(ringGeom);

  return group;
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

function addBox(
  group: Group,
  position: [number, number, number],
  scale: [number, number, number],
  material: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  const geometry = new BoxGeometry(scale[0], scale[1], scale[2]);
  const mesh = new Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
  disposables.push(geometry);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function addRoof(
  group: Group,
  position: [number, number, number],
  radius: number,
  material: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  const geometry = new ConeGeometry(radius, radius * 0.32, 4);
  const roof = new Mesh(geometry, material);
  roof.rotation.y = Math.PI / 4;
  roof.position.set(position[0], position[1], position[2]);
  group.add(roof);
  disposables.push(geometry);
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  material.dispose();
}
