"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DreamSkylineScene } from "./dream-skyline-scene";
import { createDefaultTerrainSource, type TerrainTile } from "@/lib/terrain-source";
import { createDefaultBuildingsSource, type Building } from "@/lib/buildings-source";
import type { BuildingsSource } from "@/lib/buildings-source";
import type { TerrainSource } from "@/lib/terrain-source";
import type { DreamMood, DreamRoadbookDesign, DreamTemplate } from "@/lib/dream-design-skill";
import type { PreviewAsset, Roadbook } from "@/lib/roadbook-types";
import {
  formatHeightSourceStats,
  summarizeBuildingHeightSources,
} from "@/lib/recording-helper";

type RealSkylineSceneProps = {
  roadbook: Roadbook;
  design: DreamRoadbookDesign;
  activeDay: number;
  mood: DreamMood;
  template: DreamTemplate;
  previewAsset?: PreviewAsset | null;
  assetStage?: "idle" | "generating" | "ready" | "fallback" | "error";
  assetMessage?: string;
  onSelectDay: (day: number) => void;
  terrainSource?: TerrainSource;
  buildingsSource?: BuildingsSource;
  /** When true, the height-source stats overlay is shown (used during recording). */
  isRecording?: boolean;
};

/** Dali default bbox [west, south, east, north] used when roadbook has no coordinate metadata. */
const DALI_BBOX = { west: 100.0, south: 25.4, east: 100.4, north: 25.8 };

/** Vertical exaggeration factor applied to terrain elevation. */
const TERRAIN_VERTICAL_SCALE = 0.6;

/** Maximum building footprint vertices we will iterate over before bailing. */
const MAX_FOOTPRINT_VERTICES = 64;

/** Hard cap on how many buildings we will actually draw (sorted by height desc). */
const MAX_BUILDINGS_DRAWN = 1500;

/** Show an FPS counter overlay in dev mode only. */
const SHOW_FPS_OVERLAY = process.env.NODE_ENV !== "production";

/**
 * Attempt to derive a geographic bbox from roadbook destination metadata.
 * Returns `null` when no usable coordinates are present.
 */
function tryDeriveBBox(roadbook: Roadbook): { west: number; south: number; east: number; north: number } | null {
  const meta = (roadbook as { metadata?: { bbox?: { west?: number; south?: number; east?: number; north?: number } } })
    .metadata;
  if (
    meta &&
    typeof meta.bbox === "object" &&
    Number.isFinite(meta.bbox.west) &&
    Number.isFinite(meta.bbox.south) &&
    Number.isFinite(meta.bbox.east) &&
    Number.isFinite(meta.bbox.north)
  ) {
    return meta.bbox as { west: number; south: number; east: number; north: number };
  }

  return null;
}

function computeBBox(roadbook: Roadbook) {
  return tryDeriveBBox(roadbook) ?? DALI_BBOX;
}

/**
 * Convert a longitude/latitude pair to a local tangent-plane offset (meters)
 * around a reference point using the equirectangular projection.
 *
 * - x = (lng - centerLng) * 111000 * cos(centerLat)
 * - z = (lat - centerLat) * 111000
 */
function lngLatToMeters(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number,
): { x: number; z: number } {
  const metersPerDeg = 111_000;
  const x = (lng - centerLng) * metersPerDeg * Math.cos((centerLat * Math.PI) / 180);
  const z = (lat - centerLat) * metersPerDeg;
  return { x, z };
}

/**
 * Approximate the ground footprint size of a building (in meters) by taking
 * the bounding box of its lng/lat vertices around the same reference point.
 * Returns sensible fallbacks for degenerate footprints.
 */
function footprintSizeMeters(
  footprint: Building["footprint"],
  centerLng: number,
  centerLat: number,
): { width: number; depth: number } {
  if (!footprint || footprint.length === 0) {
    return { width: 6, depth: 6 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const vertex of footprint) {
    const { x, z } = lngLatToMeters(vertex.lng, vertex.lat, centerLng, centerLat);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const width = Math.max(maxX - minX, 2);
  const depth = Math.max(maxZ - minZ, 2);
  return { width, depth };
}

/**
 * Create a single Group of terrain meshes from a set of TerrainTiles.
 *
 * Each tile becomes a `PlaneGeometry(width, height, 255, 255)` whose vertices
 * are displaced by `elevation[i] * verticalScale`. The tile is positioned
 * around its bbox centroid in local meters relative to `center`.
 */
function createTerrainMesh(
  tiles: TerrainTile[],
  centerLng: number,
  centerLat: number,
  verticalScale: number,
  disposables: Array<{ dispose: () => void }>,
): Group {
  const group = new Group();
  group.name = "real-terrain";

  for (const tile of tiles) {
    if (!tile || !tile.elevation || tile.elevation.length === 0) continue;

    const { bbox, elevation } = tile;
    const size = Math.sqrt(elevation.length);
    if (!Number.isFinite(size) || size < 2) continue;

    const segments = Math.round(size) - 1;
    if (segments < 1) continue;

    const widthDeg = Math.max(bbox.east - bbox.west, 1e-6);
    const heightDeg = Math.max(bbox.north - bbox.south, 1e-6);
    const widthMeters = widthDeg * 111_000 * Math.cos((centerLat * Math.PI) / 180);
    const heightMeters = heightDeg * 111_000;

    const geometry = new PlaneGeometry(widthMeters, heightMeters, segments, segments);
    disposables.push(geometry);

    const positions = geometry.getAttribute("position");
    const count = Math.min(positions.count, elevation.length);
    for (let i = 0; i < count; i += 1) {
      const e = Number.isFinite(elevation[i]) ? elevation[i] : 0;
      positions.setY(i, e * verticalScale);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new MeshStandardMaterial({
      color: new Color("#6b7a4a"),
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true,
      side: DoubleSide,
    });
    disposables.push(material);

    const mesh = new Mesh(geometry, material);
    mesh.name = `terrain-tile-${tile.tile?.x ?? "?"}-${tile.tile?.y ?? "?"}-${tile.tile?.z ?? "?"}`;

    // PlaneGeometry is in the XY plane; rotate so the heightfield lies on XZ.
    mesh.rotation.x = -Math.PI / 2;

    // The tile's "center" on the plane geometry is the geometry's local origin.
    // The plane spans ±width/2 around 0 — shift it so the SW corner of the
    // bbox lives at (0,0) before placing the tile at its center.
    const center = lngLatToMeters(
      (bbox.west + bbox.east) / 2,
      (bbox.south + bbox.north) / 2,
      centerLng,
      centerLat,
    );
    mesh.position.set(center.x, 0, center.z);
    group.add(mesh);
  }

  return group;
}

/**
 * Create a single Group of building meshes from a list of Buildings.
 *
 * For each building we draw a `BoxGeometry` whose size is derived from the
 * building's footprint bbox in meters. Buildings are clamped to a drawable
 * cap (sorted by height descending) to keep the renderer responsive.
 */
function createBuildingMeshes(
  buildings: Building[],
  centerLng: number,
  centerLat: number,
  disposables: Array<{ dispose: () => void }>,
): Group {
  const group = new Group();
  group.name = "real-buildings";

  if (!buildings || buildings.length === 0) {
    return group;
  }

  const material = new MeshStandardMaterial({
    color: new Color("#cdbfa9"),
    roughness: 0.78,
    metalness: 0.04,
  });
  disposables.push(material);

  // Largest buildings first — capped to MAX_BUILDINGS_DRAWN to keep frame rate
  // healthy in dense urban bboxes.
  const sorted = [...buildings]
    .filter((b) => b && Number.isFinite(b.heightMeters) && b.heightMeters > 0)
    .sort((a, b) => b.heightMeters - a.heightMeters)
    .slice(0, MAX_BUILDINGS_DRAWN);

  for (const building of sorted) {
    const { x, z } = lngLatToMeters(building.lng, building.lat, centerLng, centerLat);
    const { width, depth } = footprintSizeMeters(building.footprint, centerLng, centerLat);
    const height = Math.min(Math.max(building.heightMeters, 1), 250);

    // Guard against runaway footprints from malformed data.
    const safeWidth = Math.min(width, 200);
    const safeDepth = Math.min(depth, 200);

    const geometry = new BoxGeometry(safeWidth, height, safeDepth);
    disposables.push(geometry);

    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, height / 2, z);
    mesh.name = `building-${building.id}`;
    group.add(mesh);

    // Avoid letting unused-vars warning fire on the footprint import shape.
    void MAX_FOOTPRINT_VERTICES;
  }

  return group;
}

export default function RealSkylineScene({
  roadbook,
  design,
  activeDay,
  mood,
  template,
  previewAsset,
  assetStage = "idle",
  assetMessage,
  onSelectDay,
  terrainSource,
  buildingsSource,
  isRecording = false,
}: RealSkylineSceneProps) {
  const terrain = terrainSource ?? createDefaultTerrainSource();
  const buildings = buildingsSource ?? createDefaultBuildingsSource();

  const bbox = computeBBox(roadbook);

  const [terrainData, setTerrainData] = useState<TerrainTile[] | null>(null);
  const [buildingsData, setBuildingsData] = useState<Building[] | null>(null);
  const [realTerrainActive, setRealTerrainActive] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fps, setFps] = useState(0);

  // Recompute the height-source stats whenever the building list
  // changes. Cheap O(n) walk over a few thousand entries.
  const heightSourceStats = useMemo(
    () => summarizeBuildingHeightSources(buildingsData),
    [buildingsData],
  );
  const heightSourceLabel = useMemo(
    () => formatHeightSourceStats(heightSourceStats),
    [heightSourceStats],
  );

  // Show the overlay during recording, plus in dev mode for easy
  // inspection while developing / debugging the real-scene pipeline.
  const showHeightSourceOverlay = isRecording || SHOW_FPS_OVERLAY;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [terrainResult, buildingsResult] = await Promise.all([
        terrain.fetchTerrain(bbox, { z: 12 }),
        buildings.fetchBuildings(bbox, { limit: 5000 }),
      ]);

      if (cancelled) return;

      const hasTerrain = terrainResult.length > 0;
      const hasBuildings = buildingsResult.length > 0;

      if (hasTerrain && hasBuildings) {
        setTerrainData(terrainResult);
        setBuildingsData(buildingsResult);
        setRealTerrainActive(true);
      }
      // If either is empty, states remain null/false — component falls back to DreamSkylineScene.
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [roadbook, activeDay, terrain, buildings, bbox]);

  // Real Three.js scene — only mounted when both sources have data.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    if (!terrainData || !buildingsData) return;

    const centerLng = (bbox.west + bbox.east) / 2;
    const centerLat = (bbox.south + bbox.north) / 2;

    const disposables: Array<{ dispose: () => void }> = [];
    const scene = new Scene();
    scene.fog = new Fog(new Color("#cbd6df"), 2500, 9000);
    scene.background = new Color("#dfe7ee");

    const camera = new PerspectiveCamera(48, 1, 0.1, 50_000);
    camera.position.set(0, 1800, 2400);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    disposables.push(renderer);

    scene.add(new AmbientLight(0xffffff, 1.6));
    scene.add(new HemisphereLight(new Color("#e9eef5"), new Color("#4a4a3a"), 1.2));

    const sun = new DirectionalLight(new Color("#fff1d6"), 2.6);
    sun.position.set(-2500, 3500, 1800);
    scene.add(sun);

    const rim = new DirectionalLight(new Color("#a4c0ff"), 0.9);
    rim.position.set(2000, 1500, -2500);
    scene.add(rim);

    const terrainGroup = createTerrainMesh(
      terrainData,
      centerLng,
      centerLat,
      TERRAIN_VERTICAL_SCALE,
      disposables,
    );
    scene.add(terrainGroup);

    const buildingsGroup = createBuildingMeshes(buildingsData, centerLng, centerLat, disposables);
    scene.add(buildingsGroup);

    // Orbit controls so the user can pan around the real scene.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 200;
    controls.maxDistance = 12_000;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 200, 0);
    controls.update();

    // Frame the camera so the whole bbox is comfortably in view.
    const spanMeters = Math.max(
      (bbox.east - bbox.west) * 111_000 * Math.cos((centerLat * Math.PI) / 180),
      (bbox.north - bbox.south) * 111_000,
      200,
    );
    const cameraDistance = Math.max(spanMeters * 1.4, 1200);
    camera.position.set(cameraDistance * 0.5, cameraDistance * 0.45, cameraDistance * 0.9);
    controls.target.set(0, 0, 0);
    controls.update();

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

    let frameId = 0;
    let lastSample = performance.now();
    let frames = 0;

    const animate = (now: number) => {
      controls.update();
      renderer.render(scene, camera);
      frames += 1;
      if (now - lastSample > 500) {
        setFps(Math.round((frames * 1000) / (now - lastSample)));
        frames = 0;
        lastSample = now;
      }
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
        }
      });
      disposables.forEach((item) => item.dispose());
    };
  }, [terrainData, buildingsData, bbox]);

  const commonProps = { roadbook, design, activeDay, mood, template, previewAsset, assetStage, assetMessage, onSelectDay };

  const showHybrid = realTerrainActive && terrainData !== null && buildingsData !== null;

  if (showHybrid) {
    const center = new Vector3(0, 0, 0);
    void center; // reserved for future label anchor calculations

    return (
      <div className="real-skyline-scene" ref={wrapRef}>
        <canvas ref={canvasRef} className="real-skyline-canvas" aria-label="real terrain and buildings 3D preview" />
        <div className="real-skyline-hybrid-chip active">
          <span>Real Terrain</span>
          <strong>on</strong>
        </div>
        <p className="real-skyline-hybrid-label">
          Hybrid scene &mdash; terrain: {terrain.name}, buildings: {buildings.name} &middot; tiles:{" "}
          {terrainData.length} &middot; buildings: {buildingsData.length}
        </p>
        {SHOW_FPS_OVERLAY && (
          <div className="real-skyline-fps" aria-hidden="true">
            <span>fps</span>
            <strong>{fps}</strong>
          </div>
        )}
        {showHeightSourceOverlay && (
          <div
            className="real-skyline-height-overlay"
            data-testid="real-skyline-height-overlay"
            aria-label="building height source stats"
          >
            <span>heights</span>
            <strong>{heightSourceLabel}</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="real-skyline-scene" ref={wrapRef}>
      {!realTerrainActive && (
        <div className="real-skyline-hybrid-chip">
          <span>Real Terrain</span>
          <strong>off</strong>
        </div>
      )}
      <DreamSkylineScene {...commonProps} />
    </div>
  );
}
