import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NetworkSection, NetworkStation } from "../../types/network";

export type SectionStyle = { color: string; weight: number; label: string };

type LatLng = [number, number];

/** Distance from point p to segment a-b, in degree units (fine at this scale). */
function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * A straight section that runs over another station (e.g. a branch whose end
 * lies in line with the main line) would hide the sections underneath, so it
 * is drawn as an arc instead.
 */
function displayPath(path: LatLng[], stations: NetworkStation[]): LatLng[] {
  const [a, b] = [path[0], path[path.length - 1]];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const crossesStation = stations.some((station) => {
    const point: LatLng = [station.latitude, station.longitude];
    const isEndpoint = Math.hypot(point[0] - a[0], point[1] - a[1]) < 1e-6 || Math.hypot(point[0] - b[0], point[1] - b[1]) < 1e-6;
    return station.onNetwork && !isEndpoint && distanceToSegment(point, a, b) < length * 0.02;
  });
  if (!crossesStation) return path;

  // Quadratic curve bulging perpendicular to the chord.
  const bulge = 0.18 * length;
  const control: LatLng = [
    (a[0] + b[0]) / 2 - ((b[1] - a[1]) / length) * bulge,
    (a[1] + b[1]) / 2 + ((b[0] - a[0]) / length) * bulge,
  ];
  return Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    return [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * control[0] + t ** 2 * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * control[1] + t ** 2 * b[1],
    ] as LatLng;
  });
}

/**
 * Leaflet map of stations and sections. The map only draws; colours and
 * labels per section come from the page (styleFor).
 */
export function RailMap({
  stations,
  sections,
  styleFor,
  selectedId,
  onSelect,
}: {
  stations: NetworkStation[];
  sections: NetworkSection[];
  styleFor: (section: NetworkSection) => SectionStyle;
  selectedId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const onNetwork = stations.filter((station) => station.onNetwork);
    const bounds = L.latLngBounds(
      (onNetwork.length ? onNetwork : stations).map((station) => [
        station.latitude,
        station.longitude,
      ]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stations]);

  // Redraw sections and stations when styles or selection change.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const section of sections) {
      const style = styleFor(section);
      const selected = section.sectionId === selectedId;
      const path = displayPath(section.path, stations);
      if (selected) {
        L.polyline(path, { color: "#1e3a8a", weight: style.weight + 8, opacity: 0.35 }).addTo(layer);
      }
      L.polyline(path, {
        color: style.color,
        weight: style.weight,
        opacity: 0.95,
        lineCap: "round",
      })
        .bindTooltip(`${section.sectionId} · ${section.fromStation}–${section.toStation}<br/>${style.label}`, {
          sticky: true,
        })
        .on("click", () => onSelect(section.sectionId))
        .addTo(layer);
    }

    for (const station of stations) {
      L.circleMarker([station.latitude, station.longitude], {
        radius: station.onNetwork ? 6 : 3.5,
        color: station.onNetwork ? "#0f172a" : "#94a3b8",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      })
        .bindTooltip(
          `${station.stationCode} · ${station.name}${station.assetCount ? `<br/>${station.assetCount} asset(s)` : ""}${station.onNetwork ? "" : "<br/>not on a modelled section"}`,
        )
        .addTo(layer);
    }
  }, [stations, sections, styleFor, selectedId, onSelect]);

  return <div ref={containerRef} className="h-[560px] w-full rounded-lg" />;
}
