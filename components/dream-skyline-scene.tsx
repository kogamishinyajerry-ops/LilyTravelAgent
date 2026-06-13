"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
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
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
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
import {
  buildCinematicCameraPose,
  buildCinematicLandmarkSilhouettes,
  buildCinematicRouteRail,
  resolveCinematicScenePreset,
  type CinematicLandmarkSilhouette,
  type ResolvedCinematicScenePreset,
} from "@/lib/cinematic-scene-preset";

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

type AnimatedWaterMesh = Mesh<PlaneGeometry, MeshPhysicalMaterial> & {
  userData: {
    baseWaveZ?: Float32Array;
  };
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
  const cinematicScene = useMemo(
    () => resolveCinematicScenePreset(roadbook, activeDay),
    [roadbook, activeDay],
  );
  const cameraPose = useMemo(
    () => buildCinematicCameraPose(cinematicScene?.focus),
    [cinematicScene],
  );
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

    const camera = new PerspectiveCamera(cameraPose.fov, 1, 0.1, 90);
    camera.position.set(...cameraPose.camera);
    camera.lookAt(...cameraPose.lookAt);

    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = mood === "neon" ? 1.18 : mood === "dusk" ? 1.08 : 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    disposables.push(renderer);

    const root = new Group();
    root.rotation.x = -0.06;
    scene.add(root);

    scene.add(new AmbientLight(0xffffff, mood === "neon" ? 1.05 : 1.35));
    scene.add(new HemisphereLight(new Color(palette.sky), new Color(palette.ground), mood === "neon" ? 1.35 : 1.55));

    const sun = new DirectionalLight(new Color(palette.light), mood === "dusk" ? 4.3 : 3.4);
    sun.position.set(-5.5, 8, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 36;
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    const rim = new DirectionalLight(0xffffff, 1.2);
    rim.position.set(6, 4, -8);
    scene.add(rim);

    root.add(createAtmosphere(palette, mood, disposables));
    if (cinematicScene) {
      root.add(createCinematicPresetLayer(cinematicScene, palette, disposables));
    }

    const terrain = createTerrain(profile, palette, disposables);
    root.add(terrain);

    if (assetSource) {
      root.add(createPreviewAssetBillboard(assetSource, disposables));
    }

    const water = profile.hasWater ? createWater(palette, disposables) : null;
    if (water) {
      root.add(water);
      root.add(createWaterSpecularRibbons(palette, disposables));
    }

    root.add(createSkyline(profile, palette, template, disposables));
    root.add(createRouteRibbon(palette, design.routeStops.length, disposables));
    root.add(createLandmark(profile, palette, template, disposables, landmarkPreset));
    applyHighQualityShading(root);

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
      root.rotation.y = Math.sin(elapsed * 0.22) * 0.035 * cameraPose.parallaxWeight;
      root.position.y = Math.sin(elapsed * 0.55) * 0.045;
      camera.lookAt(
        cameraPose.lookAt[0] + Math.sin(elapsed * 0.18) * 0.055 * cameraPose.parallaxWeight,
        cameraPose.lookAt[1],
        cameraPose.lookAt[2],
      );
      if (water) {
        animateWater(water, elapsed);
      }
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
  }, [activeDay, assetSource, cameraPose, cinematicScene, design.routeStops.length, mood, palette, profile, template, landmarkPreset]);

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
      <canvas
        ref={canvasRef}
        className="dream-skyline-canvas"
        aria-label={`${cinematicScene?.preset.destination || profile.destination} 3D 天际线预览`}
      />
      <div className="dream-skyline-glass" />
      <div className="dream-skyline-caption">
        <span>Terrain Preview</span>
        <strong>{cinematicScene?.preset.heroLabel || profile.label}</strong>
        <small>
          {cinematicScene
            ? `${cinematicScene.focus.label} · ${cinematicScene.focus.visualCue}`
            : activePlan?.stops[0]?.name || activePlan?.area || roadbook.destination}
        </small>
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

function createAtmosphere(
  palette: SkylinePalette,
  mood: DreamMood,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.name = "atmosphere";

  const sunGeometry = new CircleGeometry(1.35, 48);
  const sunMaterial = new MeshBasicMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: mood === "neon" ? 0.26 : 0.5,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const sunDisc = new Mesh(sunGeometry, sunMaterial);
  sunDisc.name = "atmosphere-sun-disc";
  sunDisc.position.set(-5.9, 5.7, -6.35);
  sunDisc.renderOrder = -4;
  group.add(sunDisc);

  const hazeGeometry = new PlaneGeometry(20, 8.2);
  const hazeMaterial = new MeshBasicMaterial({
    color: new Color(mood === "neon" ? palette.glass : palette.fog),
    transparent: true,
    opacity: mood === "neon" ? 0.2 : 0.34,
    depthWrite: false,
    side: DoubleSide,
  });
  const haze = new Mesh(hazeGeometry, hazeMaterial);
  haze.name = "atmosphere-haze";
  haze.position.set(0, 2.45, -3.8);
  haze.renderOrder = -3;
  group.add(haze);

  const foregroundGeometry = new PlaneGeometry(24, 4.6);
  const foregroundMaterial = new MeshBasicMaterial({
    color: new Color(palette.fog),
    transparent: true,
    opacity: mood === "neon" ? 0.08 : 0.18,
    depthWrite: false,
    side: DoubleSide,
  });
  const foregroundHaze = new Mesh(foregroundGeometry, foregroundMaterial);
  foregroundHaze.name = "atmosphere-foreground-haze";
  foregroundHaze.position.set(0, 0.55, 4.85);
  foregroundHaze.rotation.x = -0.08;
  foregroundHaze.renderOrder = 5;
  group.add(foregroundHaze);

  disposables.push(
    sunGeometry,
    sunMaterial,
    hazeGeometry,
    hazeMaterial,
    foregroundGeometry,
    foregroundMaterial,
  );
  return group;
}

function createCinematicPresetLayer(
  scene: ResolvedCinematicScenePreset,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.name = `cinematic-preset-${scene.preset.id}`;

  scene.preset.mountainBands.forEach((band) => {
    group.add(createMountainBandMesh(band, disposables));
  });

  scene.preset.shorelines.forEach((shoreline, index) => {
    const points = Array.from({ length: 34 }, (_, pointIndex) => {
      const t = pointIndex / 33;
      const x = -8.7 + t * 17.4;
      const wave = Math.sin(t * Math.PI * 2.4 + index * 0.85) * shoreline.amplitude;
      return new Vector3(x, 0.055 + index * 0.012, shoreline.z + wave);
    });
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({
      color: new Color(palette.light),
      transparent: true,
      opacity: shoreline.opacity,
    });
    const line = new Line(geometry, material);
    line.name = `cinematic-shoreline-${shoreline.id}`;
    group.add(line);
    disposables.push(geometry, material);
  });

  group.add(createDaliRouteRail(scene, palette, disposables));
  group.add(createDaliCourtyardCluster(scene, palette, disposables));
  group.add(createDaliLandmarkSilhouettes(scene, palette, disposables));
  group.add(createFocusBeacon(scene, palette, disposables));

  return group;
}

function createMountainBandMesh(
  band: ResolvedCinematicScenePreset["preset"]["mountainBands"][number],
  disposables: Array<{ dispose: () => void }>,
) {
  const width = 23.5;
  const segments = 24;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const x = -width / 2 + t * width;
    const ridge =
      Math.sin(t * Math.PI * 2.2 + band.phase) * 0.18 +
      Math.sin(t * Math.PI * 5.4 + band.phase * 1.7) * 0.1 +
      Math.cos(t * Math.PI * 3.2) * 0.08;
    const topY = band.baseY + band.height * (0.44 + ridge + Math.sin(t * Math.PI) * 0.42);

    positions.push(x, band.baseY - 0.08, band.z);
    positions.push(x, Math.max(band.baseY + 0.24, topY), band.z);
  }

  for (let index = 0; index < segments; index += 1) {
    const a = index * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new MeshBasicMaterial({
    color: new Color(band.color),
    transparent: true,
    opacity: band.opacity,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = `cinematic-mountain-${band.id}`;
  mesh.renderOrder = -2;
  disposables.push(geometry, material);
  return mesh;
}

function createDaliRouteRail(
  scene: ResolvedCinematicScenePreset,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const rail = buildCinematicRouteRail(scene.preset, scene.focus.day);
  const group = new Group();
  group.name = "dali-day-route-rail";

  const routePoints = rail.points.map((point) => new Vector3(point.x, 0.13, point.z));
  const routeCurve = new CatmullRomCurve3(routePoints);
  const routeGeometry = new BufferGeometry().setFromPoints(routeCurve.getPoints(72));
  const routeMaterial = new LineBasicMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: 0.24,
  });
  const routeLine = new Line(routeGeometry, routeMaterial);
  routeLine.name = "dali-day-route-line";
  group.add(routeLine);
  disposables.push(routeGeometry, routeMaterial);

  const activeRoutePoints = routePoints.slice(0, rail.activeIndex + 1);
  if (activeRoutePoints.length > 1) {
    const activeCurve = new CatmullRomCurve3(activeRoutePoints);
    const activeGeometry = new BufferGeometry().setFromPoints(activeCurve.getPoints(36));
    const activeMaterial = new LineBasicMaterial({
      color: new Color("#fff5cf"),
      transparent: true,
      opacity: 0.58,
    });
    const activeLine = new Line(activeGeometry, activeMaterial);
    activeLine.name = "dali-active-route-line";
    group.add(activeLine);
    disposables.push(activeGeometry, activeMaterial);
  }

  rail.points.forEach((point) => {
    const anchorGeometry = new CircleGeometry(point.isActive ? 0.13 : 0.09, 32);
    const anchorMaterial = new MeshBasicMaterial({
      color: new Color(point.isActive ? palette.light : palette.glass),
      transparent: true,
      opacity: point.isActive ? 0.58 : 0.28,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const anchor = new Mesh(anchorGeometry, anchorMaterial);
    anchor.name = `dali-route-anchor-d${point.day}`;
    anchor.rotation.x = -Math.PI / 2;
    anchor.position.set(point.x, 0.145, point.z);
    anchor.renderOrder = 8;
    group.add(anchor);
    disposables.push(anchorGeometry, anchorMaterial);
  });

  return group;
}

function createDaliCourtyardCluster(
  scene: ResolvedCinematicScenePreset,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.name = "dali-bai-courtyards";

  const courtyardAnchors = scene.preset.focusByDay.filter((focus) =>
    focus.anchorKind === "old-town" || focus.anchorKind === "village" || focus.anchorKind === "return"
  );

  const wallMaterial = new MeshStandardMaterial({
    color: new Color(palette.stone),
    roughness: 0.72,
    metalness: 0.02,
  });
  const roofMaterial = new MeshStandardMaterial({
    color: new Color(palette.roof),
    roughness: 0.64,
    metalness: 0.04,
  });
  disposables.push(wallMaterial, roofMaterial);

  courtyardAnchors.forEach((anchor, anchorIndex) => {
    for (let index = 0; index < 3; index += 1) {
      const offsetX = (index - 1) * 0.52 + (anchorIndex % 2 === 0 ? 0.12 : -0.12);
      const offsetZ = (index % 2) * 0.32 - 0.18;
      const width = 0.42 + index * 0.06;
      const depth = 0.36 + (2 - index) * 0.04;

      const wallGeometry = new BoxGeometry(width, 0.24, depth);
      const wall = new Mesh(wallGeometry, wallMaterial);
      wall.name = "dali-courtyard-wall";
      wall.position.set(anchor.x + offsetX, 0.08, anchor.z + offsetZ);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
      disposables.push(wallGeometry);

      const roofGeometry = new BoxGeometry(width * 1.28, 0.08, depth * 1.22);
      const roof = new Mesh(roofGeometry, roofMaterial);
      roof.name = "dali-courtyard-roof";
      roof.position.set(anchor.x + offsetX, 0.26, anchor.z + offsetZ);
      roof.rotation.z = (index - 1) * 0.03;
      roof.castShadow = true;
      group.add(roof);
      disposables.push(roofGeometry);
    }
  });

  return group;
}

function createDaliLandmarkSilhouettes(
  scene: ResolvedCinematicScenePreset,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const layer = buildCinematicLandmarkSilhouettes(scene.preset, scene.focus.day);
  const group = new Group();
  group.name = "dali-cinematic-landmark-silhouettes";

  layer.markers.forEach((marker) => {
    const markerGroup = createDaliLandmarkMarker(marker, palette, disposables);
    markerGroup.name = marker.id;
    markerGroup.position.set(marker.x, 0.14, marker.z);
    markerGroup.scale.setScalar(marker.scale);
    markerGroup.rotation.y = marker.kind === "erhai-sail" ? -0.18 : marker.kind === "return-cafe" ? 0.24 : 0.12;
    group.add(markerGroup);
  });

  return group;
}

function createDaliLandmarkMarker(
  marker: CinematicLandmarkSilhouette,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  const opacity = marker.isActive ? 0.92 : 0.4;
  const accentOpacity = marker.isActive ? 0.72 : 0.28;
  const bodyMaterial = new MeshStandardMaterial({
    color: new Color(marker.kind === "erhai-sail" ? "#f0e3cc" : palette.stone),
    roughness: 0.68,
    metalness: 0.02,
    transparent: true,
    opacity,
  });
  const roofMaterial = new MeshStandardMaterial({
    color: new Color(marker.kind === "return-cafe" ? "#a75545" : palette.roof),
    roughness: 0.58,
    metalness: 0.03,
    transparent: true,
    opacity: marker.isActive ? 0.96 : 0.5,
  });
  const accentMaterial = new MeshBasicMaterial({
    color: new Color(marker.isActive ? "#fff1c3" : palette.light),
    transparent: true,
    opacity: accentOpacity,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  disposables.push(bodyMaterial, roofMaterial, accentMaterial);

  const baseRingGeometry = new CircleGeometry(marker.isActive ? 0.42 : 0.31, 36);
  const baseRing = new Mesh(baseRingGeometry, accentMaterial);
  baseRing.name = `${marker.id}-ground-glow`;
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.012;
  baseRing.renderOrder = 7;
  group.add(baseRing);
  disposables.push(baseRingGeometry);

  if (marker.kind === "erhai-sail") {
    createDaliSailMarker(group, marker, bodyMaterial, accentMaterial, disposables);
    return group;
  }

  if (marker.kind === "bai-courtyard-arch") {
    createDaliCourtyardArchMarker(group, marker, bodyMaterial, roofMaterial, accentMaterial, disposables);
    return group;
  }

  if (marker.kind === "return-cafe") {
    createDaliCafeMarker(group, marker, bodyMaterial, roofMaterial, accentMaterial, disposables);
    return group;
  }

  createDaliGateMarker(group, marker, bodyMaterial, roofMaterial, accentMaterial, disposables);
  return group;
}

function createDaliGateMarker(
  group: Group,
  marker: CinematicLandmarkSilhouette,
  bodyMaterial: Material,
  roofMaterial: Material,
  accentMaterial: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  addMarkerBox(group, `${marker.id}-left-tower`, 0.18, 0.72, 0.22, -0.31, 0.36, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-right-tower`, 0.18, 0.72, 0.22, 0.31, 0.36, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-lintel`, 0.8, 0.16, 0.24, 0, 0.69, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-roof-main`, 0.96, 0.08, 0.32, 0, 0.84, 0, roofMaterial, disposables, 0.04);
  addMarkerBox(group, `${marker.id}-roof-tip`, 1.08, 0.04, 0.24, 0, 0.93, 0, roofMaterial, disposables, -0.04);
  addMarkerBox(group, `${marker.id}-gate-light`, 0.16, 0.24, 0.02, 0, 0.36, -0.12, accentMaterial, disposables);
}

function createDaliSailMarker(
  group: Group,
  marker: CinematicLandmarkSilhouette,
  bodyMaterial: Material,
  accentMaterial: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  addMarkerBox(group, `${marker.id}-hull`, 0.66, 0.08, 0.2, 0, 0.16, 0, bodyMaterial, disposables, -0.04);
  addMarkerBox(group, `${marker.id}-mast`, 0.035, 0.74, 0.035, -0.06, 0.48, 0, bodyMaterial, disposables);

  const sailGeometry = new BufferGeometry();
  sailGeometry.setAttribute(
    "position",
    new Float32BufferAttribute([
      -0.02, 0.16, 0.01,
      -0.02, 0.82, 0.01,
      0.42, 0.28, 0.01,
    ], 3),
  );
  sailGeometry.setIndex([0, 1, 2]);
  sailGeometry.computeVertexNormals();
  const sail = new Mesh(sailGeometry, accentMaterial);
  sail.name = `${marker.id}-sail`;
  sail.renderOrder = 8;
  group.add(sail);
  disposables.push(sailGeometry);

  addMarkerBox(group, `${marker.id}-water-glint`, 0.9, 0.018, 0.04, 0.05, 0.08, 0.2, accentMaterial, disposables);
}

function createDaliCourtyardArchMarker(
  group: Group,
  marker: CinematicLandmarkSilhouette,
  bodyMaterial: Material,
  roofMaterial: Material,
  accentMaterial: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  addMarkerBox(group, `${marker.id}-left-wall`, 0.16, 0.54, 0.2, -0.26, 0.29, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-right-wall`, 0.16, 0.54, 0.2, 0.26, 0.29, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-arch-top`, 0.68, 0.14, 0.22, 0, 0.56, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-roof`, 0.86, 0.08, 0.32, 0, 0.72, 0, roofMaterial, disposables, -0.03);

  const windowGeometry = new CircleGeometry(0.11, 24);
  const window = new Mesh(windowGeometry, accentMaterial);
  window.name = `${marker.id}-round-window`;
  window.position.set(0, 0.37, -0.12);
  window.renderOrder = 8;
  group.add(window);
  disposables.push(windowGeometry);
}

function createDaliCafeMarker(
  group: Group,
  marker: CinematicLandmarkSilhouette,
  bodyMaterial: Material,
  roofMaterial: Material,
  accentMaterial: Material,
  disposables: Array<{ dispose: () => void }>,
) {
  addMarkerBox(group, `${marker.id}-cafe-body`, 0.62, 0.42, 0.24, 0, 0.28, 0, bodyMaterial, disposables);
  addMarkerBox(group, `${marker.id}-awning`, 0.82, 0.1, 0.34, 0, 0.56, 0, roofMaterial, disposables, 0.02);
  addMarkerBox(group, `${marker.id}-counter`, 0.48, 0.08, 0.06, 0, 0.22, -0.16, accentMaterial, disposables);

  const signGeometry = new CircleGeometry(0.13, 26);
  const sign = new Mesh(signGeometry, accentMaterial);
  sign.name = `${marker.id}-cafe-sign`;
  sign.position.set(0.32, 0.46, -0.14);
  sign.renderOrder = 8;
  group.add(sign);
  disposables.push(signGeometry);

  addMarkerBox(group, `${marker.id}-cup`, 0.12, 0.1, 0.08, -0.18, 0.34, -0.17, accentMaterial, disposables);
}

function addMarkerBox(
  group: Group,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: Material,
  disposables: Array<{ dispose: () => void }>,
  rotationZ = 0,
) {
  const geometry = new BoxGeometry(width, height, depth);
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  disposables.push(geometry);
  return mesh;
}

function createFocusBeacon(
  scene: ResolvedCinematicScenePreset,
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.name = `dali-focus-${scene.focus.anchorKind}`;

  const ringGeometry = new CircleGeometry(0.34, 48);
  const ringMaterial = new MeshBasicMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.name = "dali-focus-ring";
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(scene.focus.x, 0.095, scene.focus.z);
  ring.renderOrder = 6;
  group.add(ring);

  const beamGeometry = new PlaneGeometry(0.08, 1.45);
  const beamMaterial = new MeshBasicMaterial({
    color: new Color(palette.light),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const beam = new Mesh(beamGeometry, beamMaterial);
  beam.name = "dali-focus-beam";
  beam.position.set(scene.focus.x, 0.82, scene.focus.z);
  beam.rotation.y = 0.18;
  beam.renderOrder = 7;
  group.add(beam);

  if (scene.focus.anchorKind === "erhai") {
    const pierMaterial = new MeshStandardMaterial({
      color: new Color("#d8c3a4"),
      roughness: 0.58,
      metalness: 0.02,
    });
    const pierGeometry = new BoxGeometry(0.12, 0.05, 1.35);
    const pier = new Mesh(pierGeometry, pierMaterial);
    pier.name = "dali-erhai-pier";
    pier.position.set(scene.focus.x - 0.42, 0.1, scene.focus.z - 0.44);
    pier.rotation.y = -0.18;
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);
    disposables.push(pierGeometry, pierMaterial);
  }

  disposables.push(ringGeometry, ringMaterial, beamGeometry, beamMaterial);
  return group;
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
    roughness: 0.86,
    metalness: 0.04,
    flatShading: false,
  });
  disposables.push(geometry, material);

  const terrain = new Mesh(geometry, material);
  terrain.name = "cinematic-terrain";
  terrain.receiveShadow = true;
  return terrain;
}

function createWater(palette: SkylinePalette, disposables: Array<{ dispose: () => void }>) {
  const geometry = new PlaneGeometry(25, 8, 96, 24);
  const position = geometry.getAttribute("position") as Float32BufferAttribute;
  const baseWaveZ = new Float32Array(position.count);
  for (let index = 0; index < position.count; index += 1) {
    baseWaveZ[index] = position.getZ(index);
  }

  const material = new MeshPhysicalMaterial({
    color: new Color(palette.water),
    transparent: true,
    opacity: 0.7,
    roughness: 0.16,
    metalness: 0.04,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    reflectivity: 0.34,
    side: DoubleSide,
  });
  const water = new Mesh(geometry, material) as AnimatedWaterMesh;
  water.name = "cinematic-water";
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.13, 2.8);
  water.receiveShadow = true;
  water.userData.baseWaveZ = baseWaveZ;
  disposables.push(geometry, material);
  return water;
}

function createWaterSpecularRibbons(
  palette: SkylinePalette,
  disposables: Array<{ dispose: () => void }>,
) {
  const group = new Group();
  group.name = "water-specular-ribbons";

  for (let ribbonIndex = 0; ribbonIndex < 5; ribbonIndex += 1) {
    const y = -1.7 + ribbonIndex * 0.72;
    const points = Array.from({ length: 26 }, (_, index) => {
      const t = index / 25;
      const x = -7.8 + t * 15.6;
      const z = 2.2 + y * 0.22 + Math.sin(t * Math.PI * 2 + ribbonIndex) * 0.18;
      return new Vector3(x, 0.035 + ribbonIndex * 0.006, z);
    });
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({
      color: new Color(palette.light),
      transparent: true,
      opacity: 0.1 + ribbonIndex * 0.025,
    });
    const line = new Line(geometry, material);
    line.name = "water-specular-ribbon";
    group.add(line);
    disposables.push(geometry, material);
  }

  return group;
}

function animateWater(water: AnimatedWaterMesh, elapsed: number) {
  const position = water.geometry.getAttribute("position") as Float32BufferAttribute;
  const baseWaveZ = water.userData.baseWaveZ;
  if (!baseWaveZ) {
    return;
  }

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const wave =
      Math.sin(x * 0.88 + elapsed * 0.82) * 0.036 +
      Math.cos(y * 2.05 + elapsed * 1.22) * 0.022 +
      Math.sin((x + y) * 0.42 + elapsed * 0.54) * 0.014;
    position.setZ(index, baseWaveZ[index] + wave);
  }

  position.needsUpdate = true;
  water.geometry.computeVertexNormals();
}

function applyHighQualityShading(root: Group) {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const isTransparent = Boolean(material?.transparent) || object.name.startsWith("atmosphere");
    object.castShadow = !isTransparent;
    object.receiveShadow = !object.name.startsWith("atmosphere");
  });
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
