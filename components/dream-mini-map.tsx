"use client";

import { MapPinned, Navigation, Route } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { GeocodePoint, Roadbook } from "@/lib/roadbook-types";

type DreamMiniMapProps = {
  roadbook: Roadbook;
  points: GeocodePoint[];
  configured: boolean | null;
  loading: boolean;
};

export function DreamMiniMap({ roadbook, points, configured, loading }: DreamMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const okPoints = useMemo(
    () => points.filter((point) => point.status === "ok" && point.lng !== undefined && point.lat !== undefined),
    [points],
  );

  const pointMeta = useMemo(() => {
    const lookup = new Map<string, { day: number; time: string }>();
    roadbook.days.forEach((day) => {
      day.stops.forEach((stop) => {
        lookup.set(stop.id, { day: day.day, time: stop.time });
      });
    });
    return lookup;
  }, [roadbook]);

  useEffect(() => {
    if (!containerRef.current || okPoints.length === 0) {
      return;
    }

    let disposed = false;

    async function drawMap() {
      const leaflet = await import("leaflet");
      if (disposed || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = leaflet.map(containerRef.current, {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        });

        leaflet
          .tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            subdomains: "abcd",
            maxZoom: 19,
          })
          .addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
      }

      const group = leaflet.layerGroup().addTo(mapRef.current);
      layerRef.current = group;

      const latLngs = okPoints.map((point) => [point.lat as number, point.lng as number] as [number, number]);
      leaflet
        .polyline(latLngs, {
          color: "#ffe2a7",
          weight: 3,
          opacity: 0.86,
          dashArray: "6 7",
        })
        .addTo(group);

      okPoints.slice(0, 12).forEach((point, index) => {
        const meta = pointMeta.get(point.id);
        leaflet
          .circleMarker([point.lat as number, point.lng as number], {
            radius: 5,
            fillColor: index === 0 ? "#f2b66f" : "#a7d8dd",
            color: "#fff7e6",
            weight: 1.5,
            fillOpacity: 0.92,
          })
          .bindTooltip(`D${meta?.day ?? "-"} ${point.name}`, { direction: "top", opacity: 0.9 })
          .addTo(group);
      });

      const bounds = leaflet.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [18, 18], maxZoom: okPoints.length === 1 ? 13 : 14 });
      setTimeout(() => mapRef.current?.invalidateSize(), 0);
    }

    drawMap();

    return () => {
      disposed = true;
    };
  }, [okPoints, pointMeta]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const failedCount = points.filter((point) => point.status !== "ok").length;
  const statusText =
    configured === false
      ? "等待高德 Key"
      : okPoints.length
        ? `${okPoints.length} 点`
        : loading
          ? "定位中"
          : "待定位";

  return (
    <section className="dream-map-card" aria-label="紧凑路线地图">
      <div className="dream-map-head">
        <span>
          <MapPinned size={14} />
          小地图
        </span>
        <strong>{statusText}</strong>
      </div>

      <div className="dream-map-shell">
        {okPoints.length > 0 ? <div ref={containerRef} className="dream-leaflet-host" /> : null}
        {okPoints.length === 0 ? (
          <div className="dream-map-fallback">
            {loading ? <Navigation size={18} className="dream-spin" /> : <Route size={18} />}
            <span>{configured === false ? "配置 AMAP_KEY 后显示真实点位" : "预览路线先展示，点位稍后定位"}</span>
          </div>
        ) : null}
      </div>

      <div className="dream-map-foot">
        <span>{roadbook.destination}</span>
        <span>{failedCount ? `${failedCount} 个需复核` : okPoints.length ? "已定位" : "等待路线"}</span>
      </div>
    </section>
  );
}
