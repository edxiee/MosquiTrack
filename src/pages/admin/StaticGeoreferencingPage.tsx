import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import {
  Navigation,
  Loader2,
  RefreshCw,
  Search,
  MapPin,
  Radio,
  Activity,
  Clock,
  ShieldCheck,
  Pencil,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { OvitrapDevice } from "@/types/device.types";
import { ROUTES } from "@/utils/navigation";
import { fetchDevices } from "@/services/device.service";
import { isDeviceActive } from "@/utils/deviceHelpers";
import { formatRelativeTime } from "@/utils/dateHelpers";

import "leaflet/dist/leaflet.css";

interface MarkerColorConfig {
  bg: string;
  text: string;
  ping: boolean;
}

const colorMap: Record<string, MarkerColorConfig> = {
  Active: { bg: "emerald", text: "text-emerald-600", ping: true },
  Online: { bg: "emerald", text: "text-emerald-600", ping: true },
  Maintenance: { bg: "amber", text: "text-amber-600", ping: false },
  Offline: { bg: "rose", text: "text-rose-600", ping: false },
  Default: { bg: "sky", text: "text-sky-600", ping: false },
};

// Status → colour mapping for map markers
const createCustomMarker = (status: string, isSelected: boolean = false) => {
  const config: MarkerColorConfig = colorMap[status] ?? colorMap.Default!;

  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="flex items-center justify-center -translate-y-4 ${isSelected ? "scale-125 z-50" : "hover:scale-110 transition-transform"}">
        <div class="relative w-11 h-11 flex items-center justify-center">
          ${config.ping ? `<div class="absolute inset-0 bg-${config.bg}-500 rounded-full opacity-40 animate-ping"></div>` : ""}
          <div class="absolute inset-1.5 bg-${config.bg}-100 rounded-full shadow-inner border-2 ${isSelected ? "border-emerald-600 ring-4 ring-emerald-400/40" : `border-${config.bg}-400`}"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 ${config.text} relative z-10 filter drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const defaultCenter: [number, number] = [14.5995, 120.9842];

// Pans / zooms map when center or zoom state changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function StaticGeoreferencingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewId = searchParams.get("viewId");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(viewId);

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // ── Load devices ──────────────────────────────────────────────────────────
  const loadTraps = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const allTraps = await fetchDevices();
      setDevices(allTraps);

      // If viewId provided or selected trap, center on it
      const targetId = viewId || selectedTrapId;
      if (targetId) {
        const target = allTraps.find((t) => t.id === targetId);
        if (target && target.latitude != null && target.longitude != null) {
          setMapCenter([Number(target.latitude), Number(target.longitude)]);
          setMapZoom(16);
          setSelectedTrapId(target.id);
          setTimeout(() => {
            if (markerRefs.current[target.id]) {
              markerRefs.current[target.id]?.openPopup();
            }
          }, 400);
        }
      } else if (allTraps.length > 0) {
        const firstWithCoords = allTraps.find(
          (t) => t.latitude != null && t.longitude != null
        );
        if (firstWithCoords) {
          setMapCenter([
            Number(firstWithCoords.latitude),
            Number(firstWithCoords.longitude),
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load devices for georeferencing:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [viewId, selectedTrapId]);

  useEffect(() => {
    loadTraps(true);

    // Supabase realtime subscription for automatic GPS updates and telemetry from hardware
    const channel = supabase
      .channel("ovitrap_devices_gps_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => {
          loadTraps(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ovitrap_readings" },
        () => {
          loadTraps(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTraps]);

  // Handle URL query changes
  useEffect(() => {
    if (viewId && devices.length > 0) {
      const target = devices.find((t) => t.id === viewId);
      if (target && target.latitude != null && target.longitude != null) {
        setSelectedTrapId(target.id);
        setMapCenter([Number(target.latitude), Number(target.longitude)]);
        setMapZoom(16);
        setTimeout(() => {
          markerRefs.current[target.id]?.openPopup();
        }, 300);
      }
    }
  }, [viewId, devices]);

  // ── Computed Lists ────────────────────────────────────────────────────────
  const isValidCoordinate = (lat: any, lng: any) => {
    if (lat == null || lng == null) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat !== 0 && nLng !== 0;
  };

  const deployedTraps = useMemo(() => {
    return devices.filter((t) => isValidCoordinate(t.latitude, t.longitude));
  }, [devices]);

  const awaitingGpsTraps = useMemo(() => {
    return devices.filter((t) => !isValidCoordinate(t.latitude, t.longitude));
  }, [devices]);

  const filteredDeployedTraps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deployedTraps.filter((t) => {
      const matchesSearch =
        !q ||
        t.device_code?.toLowerCase().includes(q) ||
        (t.barangays?.barangay_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Online" || statusFilter === "Active"
          ? isDeviceActive(t)
          : !isDeviceActive(t));

      return matchesSearch && matchesStatus;
    });
  }, [deployedTraps, search, statusFilter]);

  const activeCount = useMemo(() => {
    return deployedTraps.filter((t) => isDeviceActive(t)).length;
  }, [deployedTraps]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSelectTrap = (trap: OvitrapDevice) => {
    if (trap.latitude != null && trap.longitude != null) {
      setSelectedTrapId(trap.id);
      setMapCenter([Number(trap.latitude), Number(trap.longitude)]);
      setMapZoom(16);
      setTimeout(() => {
        markerRefs.current[trap.id]?.openPopup();
      }, 200);
    }
  };

  const handleFitAll = () => {
    if (deployedTraps.length === 0) return;
    const firstTrap = deployedTraps[0];
    if (deployedTraps.length === 1 && firstTrap && firstTrap.latitude != null && firstTrap.longitude != null) {
      setMapCenter([
        Number(firstTrap.latitude),
        Number(firstTrap.longitude),
      ]);
      setMapZoom(15);
      return;
    }
    const lats = deployedTraps.map((t) => Number(t.latitude));
    const lngs = deployedTraps.map((t) => Number(t.longitude));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    setMapCenter([(minLat + maxLat) / 2, (minLng + maxLng) / 2]);
    setMapZoom(13);
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(16);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trap Location
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Realtime GPS tracking and spatial telemetry for smart ovitrap devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTraps(true)}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-medium text-slate-700 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFitAll}
            disabled={deployedTraps.length === 0}
            className="h-9 px-3 gap-1.5 text-xs font-medium text-slate-700 bg-white"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
            Fit All Traps
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left Sidebar: Live GPS Device Directory */}
        <aside className="w-80 md:w-96 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden">
          {/* Quick Metrics Bar */}
          <div className="p-4 border-b border-slate-200/80 bg-white space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-center">
                <span className="text-[11px] font-medium text-slate-500 block">Total GPS</span>
                <span className="text-lg font-bold text-slate-900">{deployedTraps.length}</span>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-center">
                <span className="text-[11px] font-medium text-emerald-700 block">Online</span>
                <span className="text-lg font-bold text-emerald-700">{activeCount}</span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 text-center">
                <span className="text-[11px] font-medium text-amber-700 block">Awaiting</span>
                <span className="text-lg font-bold text-amber-700">{awaitingGpsTraps.length}</span>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trap ID, barangay…"
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                {["ALL", "Online", "Offline"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trap List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Loading GPS traps…</span>
              </div>
            ) : filteredDeployedTraps.length === 0 && awaitingGpsTraps.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs px-4">
                No ovitrap devices found in database.
              </div>
            ) : (
              <>
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-1">
                  GPS Active Traps ({filteredDeployedTraps.length})
                </div>

                {filteredDeployedTraps.map((trap) => {
                  const isSelected = selectedTrapId === trap.id;
                  const active = isDeviceActive(trap);

                  return (
                    <div
                      key={trap.id}
                      onClick={() => handleSelectTrap(trap)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                active
                                  ? "bg-emerald-500 shadow-xs ring-2 ring-emerald-400/40"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span className="font-semibold text-slate-900 text-xs">
                              {trap.device_code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {active ? "Online" : "Offline"}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {trap.barangays?.barangay_name || trap.description || "Unassigned Location"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            GPS Fix
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="font-mono text-[10px] text-slate-400">
                          {Number(trap.latitude).toFixed(4)}, {Number(trap.longitude).toFixed(4)}
                        </div>
                        {trap.last_seen_at && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatRelativeTime(trap.last_seen_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Traps Awaiting GPS Fix */}
                {awaitingGpsTraps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[11px] font-bold tracking-wider text-amber-700 uppercase px-1 mb-2 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                      Awaiting GPS Transmission ({awaitingGpsTraps.length})
                    </div>
                    <div className="space-y-2">
                      {awaitingGpsTraps.map((trap) => (
                        <div
                          key={trap.id}
                          className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{trap.device_code}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                              No Coordinates
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Hardware has not transmitted GPS fix to database yet.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Right Area: Interactive Leaflet Map */}
        <div className="relative flex-1">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {deployedTraps.map((trap) => {
              const isSelected = selectedTrapId === trap.id;
              const statusName = trap.device_statuses?.status_name ?? "Active";

              return (
                <Marker
                  key={trap.id}
                  ref={(r) => {
                    markerRefs.current[trap.id] = r;
                  }}
                  position={[Number(trap.latitude), Number(trap.longitude)]}
                  icon={createCustomMarker(statusName, isSelected)}
                  eventHandlers={{
                    click: () => {
                      setSelectedTrapId(trap.id);
                    },
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="w-56 p-1">
                      <div className="flex items-center justify-between gap-1 mb-1.5 pb-1.5 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {trap.device_code}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isDeviceActive(trap)
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isDeviceActive(trap) ? "Online" : "Offline"}
                        </span>
                      </div>

                      {trap.description && (
                        <p className="text-xs text-slate-600 mb-2">
                          {trap.description}
                        </p>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Barangay:</span>
                          <span className="font-semibold text-slate-800">
                            {trap.barangays?.barangay_name ?? "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Latitude:</span>
                          <span className="font-mono text-slate-700">{Number(trap.latitude).toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Longitude:</span>
                          <span className="font-mono text-slate-700">{Number(trap.longitude).toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">GPS Signal:</span>
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Hardware Locked
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs px-1 gap-1 border-slate-200 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${ROUTES.admin.nodes}`);
                          }}
                        >
                          <Pencil className="w-3 h-3 text-slate-500" />
                          Edit Trap
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs px-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${ROUTES.admin.telemetry}?trapId=${trap.id}`);
                          }}
                        >
                          <Activity className="w-3 h-3" />
                          Telemetry
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating Location Controls */}
          <div className="absolute left-4 bottom-4 z-[999] flex items-center gap-2">
            <Button
              onClick={handleGetMyLocation}
              disabled={isLocating}
              className="flex items-center gap-2 px-3.5 h-9 rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-md text-xs font-semibold transition-all"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span>Locating…</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 rotate-45" />
                  <span>My Location</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
