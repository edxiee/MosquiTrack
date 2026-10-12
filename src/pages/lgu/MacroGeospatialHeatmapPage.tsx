import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Loader2 } from "lucide-react";
import { fetchDevices } from "@/services/device.service";
import type { OvitrapDevice } from "@/types/device.types";
import TrapDetailsPanel from "@/components/map/TrapDetailsPanel";

import "leaflet/dist/leaflet.css";

const createCustomMarker = (status: string, selected = false) => {
  const colorMap = {
    Active: { bg: "emerald", ping: true },
    Maintenance: { bg: "amber", ping: false },
    Offline: { bg: "rose", ping: false },
    Default: { bg: "sky", ping: false },
  };
  const { bg, ping } = colorMap[status as keyof typeof colorMap] ?? colorMap.Default;
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="flex items-center justify-center -translate-y-4" style="${selected ? "transform: translateY(-1rem) scale(1.3); filter: drop-shadow(0 0 6px rgba(15,23,42,0.45));" : ""}">
        <div class="relative w-10 h-10 flex items-center justify-center">
          ${ping ? `<div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-40 animate-ping"></div>` : ""}
          <div class="absolute inset-2 bg-${bg}-100 rounded-full shadow-inner"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-${bg}-600 relative z-10 filter drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Pans + zooms when center/zoom state changes
function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Re-measures the map when the side panel opens/closes and centers on the selected trap
function MapResizer({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const lat = target?.[0];
  const lng = target?.[1];

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (lat != null && lng != null) {
        map.panTo([lat, lng], { animate: true, duration: 0.6 });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [lat, lng, map]);

  return null;
}

function MapBoundsFitter({ traps }: { traps: OvitrapDevice[] }) {
  const map = useMap();

  useEffect(() => {
    if (traps.length === 0) return;

    const validCoords = traps
      .filter((t) => !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude)))
      .map((t) => [Number(t.latitude), Number(t.longitude)] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [traps, map]);

  return null;
}

const defaultCenter: [number, number] = [14.5995, 120.9842];

export default function MacroGeospatialHeatmapPage() {
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get("viewId");

  const [deployedTraps, setDeployedTraps] = useState<OvitrapDevice[]>([]);
  const [trapsLoading, setTrapsLoading] = useState(true);

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);

  // Currently selected trap (shown in the side panel)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTrap = deployedTraps.find((t) => t.id === selectedId) ?? null;
  const selectedPos: [number, number] | null =
    selectedTrap && !isNaN(Number(selectedTrap.latitude)) && !isNaN(Number(selectedTrap.longitude))
      ? [Number(selectedTrap.latitude), Number(selectedTrap.longitude)]
      : null;

  useEffect(() => {
    const load = async () => {
      setTrapsLoading(true);
      try {
        const allTraps = await fetchDevices();

        const deployed = allTraps.filter(
          (t) => t.latitude != null && t.longitude != null
        );

        setDeployedTraps(deployed);

        // If a specific device was requested via ?viewId=...
        if (viewId) {
          const trapToView = deployed.find((t) => t.id === viewId);

          if (
            trapToView &&
            trapToView.latitude != null &&
            trapToView.longitude != null
          ) {
            setMapCenter([
              Number(trapToView.latitude),
              Number(trapToView.longitude),
            ]);
            setMapZoom(16);
            setShouldFitBounds(false); // don't override with fitBounds
            setSelectedId(viewId);
          }
        }
      } catch (err) {
        console.error("Failed to load deployed traps.", err);
      } finally {
        setTrapsLoading(false);
      }
    };

    load();
  }, [viewId]);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-5rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mosquito Trap Map
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View all deployed Smart Ovi Traps locations and status
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md relative">
        {trapsLoading ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading traps map…
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 min-w-0">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Only fit bounds when we are NOT viewing a specific device */}
            {shouldFitBounds && <MapBoundsFitter traps={deployedTraps} />}

            {/* Controlled pan/zoom when viewId is present */}
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Keeps the map sized correctly beside the details panel */}
            <MapResizer target={selectedPos} />

            {deployedTraps.map((trap) => {
              const lat = Number(trap.latitude);
              const lng = Number(trap.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker
                  key={`${trap.id}-${trap.id === selectedId ? "sel" : "idle"}`}
                  position={[lat, lng]}
                  icon={createCustomMarker(
                    trap.device_statuses?.status_name ?? "Active",
                    trap.id === selectedId
                  )}
                  eventHandlers={{ click: () => setSelectedId(trap.id) }}
                />
              );
            })}
          </MapContainer>
        </div>

        {selectedTrap && (
          <TrapDetailsPanel trap={selectedTrap} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}