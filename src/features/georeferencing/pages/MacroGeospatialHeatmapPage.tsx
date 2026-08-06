import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { OvitrapDevice } from "@/features/nodes/types/device";

import "leaflet/dist/leaflet.css";

// Status → colour mapping for map markers
const createCustomMarker = (status: string) => {
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
      <div class="flex items-center justify-center -translate-y-4">
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

function MapBoundsFitter({ traps }: { traps: OvitrapDevice[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (traps.length === 0) return;
    
    const validCoords = traps
      .filter(t => !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude)))
      .map(t => [Number(t.latitude), Number(t.longitude)] as [number, number]);
      
    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [traps, map]);
  
  return null;
}

const defaultCenter: [number, number] = [14.5995, 120.9842];

export default function MacroGeospatialHeatmapPage() {
  const [deployedTraps, setDeployedTraps] = useState<OvitrapDevice[]>([]);
  const [trapsLoading, setTrapsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setTrapsLoading(true);
      try {
        const { data, error } = await supabase
          .from("ovitrap_devices")
          .select(
            `id, device_code, serial_number, description, barangay_id,
             latitude, longitude, device_status_id, notes,
             installation_date, last_seen_at, created_at, deployed_by,
             device_statuses (id, status_name, description),
             barangays (id, barangay_name),
             users:deployed_by (first_name, last_name)`
          )
          .order("device_code");

        if (error) throw error;
        
        const allTraps = (data as unknown as OvitrapDevice[]) ?? [];
        
        const deployed = allTraps.filter(
          t => t.latitude != null && t.longitude != null
        );
        
        setDeployedTraps(deployed);
      } catch (err) {
        console.error("Failed to load deployed traps.", err);
      } finally {
        setTrapsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-5rem)]">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Macro Geospatial Heatmap
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View all deployed Smart Ovi Traps locations and status
          </p>
        </div>
      </div>

      {/* Main layout: full map */}
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md relative">
        {trapsLoading ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading traps map…
            </div>
          </div>
        ) : null}

        <div className="relative flex-1">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBoundsFitter traps={deployedTraps} />
            {deployedTraps.map((trap) => {
              const lat = Number(trap.latitude);
              const lng = Number(trap.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;
              
              return (
                <Marker
                  key={trap.id}
                  position={[lat, lng]}
                  icon={createCustomMarker(trap.device_statuses?.status_name ?? "Active")}
                >
                  <Popup>
                    <div className="w-48 p-1">
                      <h3 className="font-bold text-slate-800 text-sm mb-1">{trap.device_code}</h3>
                      {trap.description && <p className="text-xs text-slate-600 mb-2">{trap.description}</p>}
                      
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="font-semibold">Barangay:</span>
                          <span>{trap.barangays?.barangay_name ?? "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Status:</span>
                          <span>{trap.device_statuses?.status_name ?? "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Battery:</span>
                          <span>89%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Last Sync:</span>
                          <span>2 mins ago</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}