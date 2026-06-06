"use client";

import { useEffect, useState } from "react";
import { DreamSkylineScene } from "./dream-skyline-scene";
import { createDefaultTerrainSource } from "@/lib/terrain-source";
import { createDefaultBuildingsSource } from "@/lib/buildings-source";
import type { BuildingsSource } from "@/lib/buildings-source";
import type { TerrainSource } from "@/lib/terrain-source";
import type { DreamMood, DreamRoadbookDesign, DreamTemplate } from "@/lib/dream-design-skill";
import type { PreviewAsset, Roadbook } from "@/lib/roadbook-types";

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
};

/** Dali default bbox [west, south, east, north] used when roadbook has no coordinate metadata. */
const DALI_BBOX = { west: 100.0, south: 25.4, east: 100.4, north: 25.8 };

/**
 * Attempt to derive a geographic bbox from roadbook destination metadata.
 * Returns `null` when no usable coordinates are present.
 *
 * Note: ItineraryStop does not carry lat/lng — coordinates are only
 * available on GeocodePoint (from the geocoding step) and are not
 * present on the roadbook object at this render stage. Future extension
 * points:
 *   - roadbook.metadata.bbox (populated by a geocoding pre-pass)
 *   - passing bbox as a prop to RealSkylineScene
 */
function tryDeriveBBox(roadbook: Roadbook): { west: number; south: number; east: number; north: number } | null {
  // Look for a top-level `metadata.bbox` (future extensibility).
  // @ts-expect-error – metadata may carry extra fields not in the public Roadbook type.
  const meta = roadbook.metadata;
  if (
    meta &&
    typeof meta.bbox === "object" &&
    Number.isFinite(meta.bbox.west) &&
    Number.isFinite(meta.bbox.south) &&
    Number.isFinite(meta.bbox.east) &&
    Number.isFinite(meta.bbox.north)
  ) {
    return meta.bbox;
  }

  return null;
}

function computeBBox(roadbook: Roadbook) {
  return tryDeriveBBox(roadbook) ?? DALI_BBOX;
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
}: RealSkylineSceneProps) {
  const terrain = terrainSource ?? createDefaultTerrainSource();
  const buildings = buildingsSource ?? createDefaultBuildingsSource();

  const bbox = computeBBox(roadbook);

  const [terrainData, setTerrainData] = useState<unknown>(null);
  const [buildingsData, setBuildingsData] = useState<unknown>(null);
  const [realTerrainActive, setRealTerrainActive] = useState(false);

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

  const commonProps = { roadbook, design, activeDay, mood, template, previewAsset, assetStage, assetMessage, onSelectDay };

  const showHybrid = realTerrainActive && terrainData !== null && buildingsData !== null;

  if (showHybrid) {
    // Phase C hybrid placeholder — full rendering is out of scope for now.
    return (
      <div className="real-skyline-scene">
        <div className="real-skyline-hybrid-placeholder">
          <div className="real-skyline-hybrid-chip active">
            <span>Real Terrain</span>
            <strong>on</strong>
          </div>
          <p className="real-skyline-hybrid-label">
            Hybrid scene ready &mdash; terrain: {terrain.name}, buildings: {buildings.name}
          </p>
          <pre className="real-skyline-hybrid-data">
            {JSON.stringify(
              {
                terrainTiles: (terrainData as unknown[]).length,
                buildingCount: (buildingsData as unknown[]).length,
                bbox,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="real-skyline-scene">
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
