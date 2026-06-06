"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { AlertTriangle, MapPinned, Navigation, Route } from "lucide-react";
import type { GeocodePoint, Roadbook } from "@/lib/roadbook-types";

type RoadbookMapProps = {
  roadbook: Roadbook | null;
  points: GeocodePoint[];
  configured: boolean | null;
  loading: boolean;
};

const markerColors: Record<string, string> = {
  view: "#4f8f7a",
  food: "#d66b3d",
  coffee: "#9a6a45",
  culture: "#8966a8",
  shopping: "#b08938",
  hotel: "#5b7fa3",
  transport: "#5f6b7a",
  other: "#6f7c70",
};

export function RoadbookMap({ roadbook, points, configured, loading }: RoadbookMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const stopMeta = useMemo(() => {
    const lookup = new Map<string, { day: number; category: string; time: string; why: string }>();
    roadbook?.days.forEach((day) => {
      day.stops.forEach((stop) => {
        lookup.set(stop.id, {
          day: day.day,
          category: stop.category,
          time: stop.time,
          why: stop.why,
        });
      });
    });
    return lookup;
  }, [roadbook]);

  const okPoints = useMemo(
    () => points.filter((point) => point.status === "ok" && point.lng !== undefined && point.lat !== undefined),
    [points],
  );

  useEffect(() => {
    if (!containerRef.current || okPoints.length === 0) {
      return;
    }

    let disposed = false;

    async function drawMap() {
      const leaflet = await import("leaflet");
      if (disposed || !containerRef.current) {
        return;
      }

      if (!mapRef.current) {
        mapRef.current = leaflet.map(containerRef.current, {
          zoomControl: true,
          minZoom: 8,
          maxZoom: 18,
          scrollWheelZoom: true,
        });

        leaflet
          .tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            subdomains: "abcd",
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap &copy; CARTO',
          })
          .addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
      }
      const group = leaflet.layerGroup().addTo(mapRef.current);
      layerRef.current = group;

      const latLngs = okPoints.map((point) => [point.lat as number, point.lng as number] as [number, number]);
      const route = leaflet.polyline(latLngs, {
        color: "#f1a85a",
        weight: 4,
        opacity: 0.78,
        dashArray: "8 8",
      });
      route.addTo(group);

      okPoints.forEach((point, index) => {
        const meta = stopMeta.get(point.id);
        const color = markerColors[meta?.category || "other"] || markerColors.other;
        const marker = leaflet.circleMarker([point.lat as number, point.lng as number], {
          radius: 8,
          fillColor: color,
          color: "#fff7e6",
          weight: 2,
          fillOpacity: 0.92,
        });
        marker
          .bindPopup(
            `<div class="map-popup"><b>D${meta?.day ?? "-"} · ${point.name}</b><br/><span>${meta?.time ?? ""}</span><p>${meta?.why ?? point.addressHint}</p></div>`,
            { maxWidth: 240 },
          )
          .bindTooltip(`${index + 1}. ${point.name}`, { direction: "top", opacity: 0.9 });
        marker.addTo(group);
      });

      const bounds = leaflet.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [34, 34], maxZoom: okPoints.length === 1 ? 13 : 14 });
    }

    drawMap();

    return () => {
      disposed = true;
    };
  }, [okPoints, stopMeta]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const failedCount = points.filter((point) => point.status !== "ok").length;

  return (
    <section className="map-panel" aria-label="路线地图">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Route Map</p>
          <h2>路线地图</h2>
        </div>
        <div className="map-pill">
          <MapPinned size={16} />
          {configured === false ? "等待 AMAP_KEY" : okPoints.length ? `${okPoints.length} 个点位` : "待定位"}
        </div>
      </div>

      <div className="map-shell">
        {okPoints.length > 0 ? <div ref={containerRef} className="leaflet-host" /> : null}
        {okPoints.length === 0 ? (
          <div className="map-empty">
            {loading ? (
              <>
                <Navigation className="spin-slow" size={28} />
                <p>正在把路书地点交给高德定位...</p>
              </>
            ) : configured === false ? (
              <>
                <AlertTriangle size={28} />
                <p>还没有配置 AMAP_KEY。路书可以生成，地图会在配置后显示。</p>
              </>
            ) : (
              <>
                <Route size={28} />
                <p>生成路书后会在这里显示大理路线点位。</p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="map-status-grid">
        <div>
          <span>地图来源</span>
          <strong>Leaflet + Carto dark tiles</strong>
        </div>
        <div>
          <span>坐标来源</span>
          <strong>高德 Web Service geocode</strong>
        </div>
        <div>
          <span>定位状态</span>
          <strong>{failedCount ? `${failedCount} 个地点需复核` : okPoints.length ? "已定位" : "等待生成"}</strong>
        </div>
      </div>
    </section>
  );
}
