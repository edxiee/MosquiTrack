import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import { MapErrorBoundary } from "@/components/system/MapErrorBoundary";
import L from "leaflet";
import {
  Battery,
  Bug,
  Compass,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  Thermometer,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/errorHelpers";
import {
  fetchBarangaySurveillanceData,
  type BarangaySurveillanceData,
  type BarangaySurveillanceDevice,
} from "@/services/barangaySurveillance.service";
import { cn } from "@/lib/utils";
import RegionalDiseaseRiskButton from "@/components/lgu/RegionalDiseaseRiskModal";

import "leaflet/dist/leaflet.css";

function hasValidCoords(
  trap: { lat: number; lng: number } | null | undefined
): boolean {
  if (!trap) return false;
  const { lat, lng } = trap;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat !== 0 &&
    lng !== 0
  );
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!hasValidCoords({ lat, lng })) return;

    if (
      !lastCoords.current ||
      lastCoords.current.lat !== lat ||
      lastCoords.current.lng !== lng
    ) {
      lastCoords.current = { lat, lng };
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
    }
  }, [lat, lng, map]);

  return null;
}

const getActivityColor = (activity: string) => {
  switch (activity) {
    case "Critical":
      return "rose";
    case "High":
      return "orange";
    case "Moderate":
      return "amber";
    default:
      return "emerald";
  }
};

const getHexColor = (colorName: string) => {
  switch (colorName) {
    case "rose":
      return "#f43f5e";
    case "orange":
      return "#f97316";
    case "amber":
      return "#f59e0b";
    case "emerald":
      return "#10b981";
    default:
      return "#64748b";
  }
};

const markerColorClasses: Record<string, { ring: string; icon: string }> = {
  rose: { ring: "bg-rose-500", icon: "text-rose-600" },
  orange: { ring: "bg-orange-500", icon: "text-orange-600" },
  amber: { ring: "bg-amber-500", icon: "text-amber-600" },
  emerald: { ring: "bg-emerald-500", icon: "text-emerald-600" },
  slate: { ring: "bg-slate-400", icon: "text-slate-500" },
};

const createCustomMarker = (activity: string, isOffline: boolean = false) => {
  const colorKey = isOffline ? "slate" : getActivityColor(activity);
  const colors = markerColorClasses[colorKey] ?? markerColorClasses.slate!;
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        ${!isOffline ? `<div class="absolute inset-0 ${colors.ring} rounded-full opacity-30 animate-ping"></div>` : ""}
        <div class="absolute inset-0 ${colors.ring} rounded-full opacity-20"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 ${colors.icon} relative z-10 drop-shadow-sm">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function BarangaySurveillancePage() {
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get("viewId");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const hasAppliedViewId = useRef(false);

  const [data, setData] = useState<BarangaySurveillanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrap, setSelectedTrap] =
    useState<BarangaySurveillanceDevice | null>(null);

  // Filter state for deployed traps side list
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">(
    "online"
  );

  // Diagnostics modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Local clock tick every 15s to re-evaluate the 16-minute online/offline expiration in memory
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchBarangaySurveillanceData();
      setData(res);

      // Check URL query param ?viewId=... on initial load
      if (viewId && !hasAppliedViewId.current) {
        const trapFromUrl =
          res.traps.find((t) => t.id === viewId) ||
          res.traps.find((t) => t.device_code === viewId);

        if (trapFromUrl) {
          hasAppliedViewId.current = true;
          setSelectedTrap(trapFromUrl);
          setTimeout(() => {
            const marker = markerRefs.current[trapFromUrl.id];
            if (marker) marker.openPopup();
          }, 800);
          return;
        }
      }

      // Update currently selected trap in place or fallback to first valid trap
      setSelectedTrap((prev) => {
        const next =
          prev && res.traps.find((t) => t.id === prev.id)
            ? res.traps.find((t) => t.id === prev.id)!
            : res.traps.find((t) => hasValidCoords(t)) ?? null;

        return next && hasValidCoords(next) ? next : null;
      });
    } catch (err) {
      console.error("Failed to load barangay surveillance data:", err);
      setError(
        getErrorMessage(err, "Failed to load database surveillance data.")
      );
    } finally {
      setLoading(false);
    }
  }, [viewId]);

  useEffect(() => {
    loadData();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData();
      }, 300);
    };

    // Subscribe to realtime database changes
    const readingsSub = supabase
      .channel("brgy-surveillance-readings-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        scheduleReload
      )
      .subscribe();

    const devicesSub = supabase
      .channel("brgy-surveillance-devices-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        scheduleReload
      )
      .subscribe();

    const actionsSub = supabase
      .channel("brgy-surveillance-actions-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
        scheduleReload
      )
      .subscribe();

    // Local 15-second clock tick so traps transitioning online/offline
    // (including 16-minute timeout expiration) update automatically in memory without network polling
    const tickInterval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNowTick(Date.now());
        loadData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(readingsSub);
      supabase.removeChannel(devicesSub);
      supabase.removeChannel(actionsSub);
      clearInterval(tickInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  // Filter strictly to DEPLOYED traps and recompute 16-minute online/offline status from nowTick
  const deployedTraps = useMemo(() => {
    const all = data?.traps ?? [];
    return all
      .filter((t) => {
        // 1. If operational_status is explicitly recorded
        if (t.operational_status) {
          return t.operational_status.toLowerCase() === "deployed";
        }
        // 2. Otherwise check status not in storage and has valid coordinates
        const sName = (t.device_status_name || "").toLowerCase();
        if (sName === "in storage" || sName === "in_storage") {
          return false;
        }
        return hasValidCoords(t);
      })
      .map((t) => {
        if (!t.lastSeenAt) return t;
        const diffMinutes = (nowTick - new Date(t.lastSeenAt).getTime()) / (1000 * 60);
        let status: "Online" | "Offline" = "Offline";
        let lastComm = "Never Connected";
        if (diffMinutes <= 16) {
          status = "Online";
          lastComm = "Active (Live)";
        } else {
          status = "Offline";
          if (diffMinutes < 60) {
            lastComm = `${Math.floor(diffMinutes)}m ago`;
          } else if (diffMinutes < 1440) {
            lastComm = `${Math.floor(diffMinutes / 60)}h ago`;
          } else {
            lastComm = `${Math.floor(diffMinutes / 1440)}d ago`;
          }
        }
        return { ...t, status, lastComm };
      });
  }, [data, nowTick]);

  // Search & Status filter within deployed traps
  const filteredDeployedTraps = useMemo(() => {
    return deployedTraps.filter((trap) => {
      // Status filter
      if (statusFilter === "online" && trap.status !== "Online") return false;
      if (statusFilter === "offline" && trap.status !== "Offline") return false;

      // Search query
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const code = trap.device_code.toLowerCase();
      const loc = trap.location.toLowerCase();
      const serial = (trap.serial_number || "").toLowerCase();
      return code.includes(q) || loc.includes(q) || serial.includes(q);
    });
  }, [deployedTraps, search, statusFilter]);

  const onlineCount = useMemo(
    () => deployedTraps.filter((t) => t.status === "Online").length,
    [deployedTraps]
  );
  const offlineCount = useMemo(
    () => deployedTraps.filter((t) => t.status === "Offline").length,
    [deployedTraps]
  );

  useEffect(() => {
    setSelectedTrap((prev) => {
      if (!prev) return prev;
      const updated = deployedTraps.find((t) => t.id === prev.id);
      if (
        updated &&
        (updated.status !== prev.status || updated.lastComm !== prev.lastComm)
      ) {
        return updated;
      }
      return prev;
    });
  }, [deployedTraps]);

  const handleSelectTrap = (trap: BarangaySurveillanceDevice) => {
    setSelectedTrap(trap);
    if (hasValidCoords(trap)) {
      setTimeout(() => {
        const marker = markerRefs.current[trap.id];
        if (marker) {
          marker.openPopup();
        }
      }, 400);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">
          Loading Barangay Surveillance Geographic Information System Map…
        </p>
      </div>
    );
  }

  const barangayName = data?.barangayName ?? "Barangay Surveillance";
  const municipality = data?.municipality ?? "";
  const province = data?.province ?? "";
  const barangayCenter = data?.barangayCenter ?? { lat: 14.561, lng: 121.118 };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-[1700px] mx-auto p-3 sm:p-5 gap-3.5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80 shadow-xs">
            <Compass className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Barangay Surveillance
              </h1>
              <Badge className="bg-emerald-100/80 text-emerald-800 border-none font-bold px-2.5 py-0.5 text-xs">
                {barangayName}
              </Badge>
              {municipality && (
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  • {municipality}
                  {province ? `, ${province}` : ""}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Live Geographic Information System field deployment map & IoT monitoring page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Online Traps Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span
              className={cn(
                "flex h-2 w-2 rounded-full",
                onlineCount > 0
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-slate-400"
              )}
            />
            <span>{onlineCount} Online</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Main Screen: Side Panel (Deployed Traps) + Interactive Map */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-hidden">
        {/* ======================================================== */}
        {/* SIDEBAR: Deployed Traps List                             */}
        {/* ======================================================== */}
        <div className="w-full lg:w-96 xl:w-[410px] flex flex-col rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden shrink-0">
          {/* Sidebar Top: Search & Filters */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Deployed Traps
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {deployedTraps.length}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Click trap to locate
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trap ID or location…"
                className="pl-8 h-8 text-xs bg-slate-50/70 border-slate-200 rounded-lg focus-visible:ring-emerald-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                )}
              >
                All ({deployedTraps.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("online")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  statusFilter === "online"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/60"
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Online ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("offline")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                  statusFilter === "offline"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                )}
              >
                Offline ({offlineCount})
              </button>
            </div>
          </div>

          {/* Sidebar Body: Deployed Traps Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100/0">
            {filteredDeployedTraps.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 px-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MapPin className="size-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {search.trim()
                    ? "No matching deployed traps"
                    : "No deployed traps in this barangay"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {search.trim()
                    ? "Try adjusting your search terms or filters."
                    : "Traps must be deployed in Trap Deployment to appear on the surveillance map."}
                </p>
              </div>
            ) : (
              filteredDeployedTraps.map((trap) => {
                const isSelected = selectedTrap?.id === trap.id;
                const canLocate = hasValidCoords(trap);

                return (
                  <div
                    key={trap.id}
                    onClick={() => handleSelectTrap(trap)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all text-left flex flex-col gap-2.5 cursor-pointer",
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"
                    )}
                  >
                    {/* Top Row: Device Code & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            trap.status === "Online"
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-400"
                          )}
                        />
                        <span className="font-bold text-slate-900 text-sm tracking-tight">
                          {trap.device_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider border-none px-2 py-0.5",
                            trap.status === "Online"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {trap.status}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold border-none px-2 py-0.5",
                            trap.activityLevel === "Critical"
                              ? "bg-rose-100 text-rose-700"
                              : trap.activityLevel === "High"
                              ? "bg-orange-100 text-orange-700"
                              : trap.activityLevel === "Moderate"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {trap.activityLevel}
                        </Badge>
                      </div>
                    </div>

                    {/* Middle Row: Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate">
                      <MapPin className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {canLocate
                          ? trap.location
                          : "Location Pending Coordinates"}
                      </span>
                    </div>

                    {/* Status Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          Today Count
                        </p>
                        <p
                          className={cn(
                            "font-bold text-sm",
                            trap.count > 0 ? "text-rose-600" : "text-slate-700"
                          )}
                        >
                          {trap.count}{" "}
                          <span className="text-[10px] font-normal text-slate-400">
                            mosq
                          </span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          Battery
                        </p>
                        <p className="font-semibold text-slate-700 flex items-center gap-1">
                          <Battery className="size-3 text-slate-400" />
                          <span>{trap.battery != null ? `${trap.battery}%` : "—"}</span>
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          Current Status
                        </p>
                        <p className="font-medium text-slate-600 truncate text-[11px]">
                          {trap.lastComm}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN AREA: Interactive Leaflet Map                       */}
        {/* ======================================================== */}
        <div className="flex-1 relative rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden min-h-[500px] flex flex-col">
          {/* Floating Risk Tier Legend */}
          <div className="absolute top-3.5 right-3.5 z-20 flex flex-wrap justify-end items-center gap-2">
            <RegionalDiseaseRiskButton />
            <div className="flex flex-wrap justify-end items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md text-xs font-semibold text-slate-600">
              <span className="text-slate-400 text-[11px] uppercase mr-1">
                Daily Risk Tier:
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <div className="size-2.5 rounded-full bg-emerald-500" /> Low (0-5)
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <div className="size-2.5 rounded-full bg-amber-500" /> Moderate (6-15)
              </span>
              <span className="flex items-center gap-1 text-orange-700">
                <div className="size-2.5 rounded-full bg-orange-500" /> High (16-29)
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <div className="size-2.5 rounded-full bg-rose-500" /> Critical (30+, 3 days)
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <div className="size-2.5 rounded-full bg-slate-400" /> Offline
              </span>
            </div>
          </div>

          {/* Map Component */}
          <div className="flex-1 relative z-0 w-full h-full min-h-[500px]">
            <MapErrorBoundary>
              <MapContainer
                center={[barangayCenter.lat, barangayCenter.lng]}
                zoom={15}
                zoomControl={false}
                className="w-full h-full min-h-[500px]"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Map recenter / flyto hook */}
                {selectedTrap && hasValidCoords(selectedTrap) && (
                  <MapFlyTo lat={selectedTrap.lat} lng={selectedTrap.lng} />
                )}

                {/* Markers & Radars for Deployed Traps */}
                {deployedTraps.filter(hasValidCoords).map((trap) => {
                  const isOffline = trap.status !== "Online";
                  const aColor = getActivityColor(trap.activityLevel);
                  const hexColor = getHexColor(isOffline ? "slate" : aColor);

                  return (
                    <div key={trap.id}>
                      {/* Radar circle around trap */}
                      <Circle
                        center={[trap.lat, trap.lng]}
                        radius={85}
                        pathOptions={{
                          color: hexColor,
                          fillColor: hexColor,
                          fillOpacity: 0.18,
                          weight: 2,
                          dashArray: "4 4",
                        }}
                      />

                      {/* Trap Marker */}
                      <Marker
                        ref={(r) => {
                          markerRefs.current[trap.id] = r;
                        }}
                        position={[trap.lat, trap.lng]}
                        icon={createCustomMarker(trap.activityLevel, isOffline)}
                        eventHandlers={{
                          click: () => setSelectedTrap(trap),
                        }}
                      >
                        <Popup className="custom-popup">
                          <div className="p-2 space-y-3 min-w-[230px]">
                            <div className="flex items-center justify-between border-b pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm">
                                  {trap.device_code}
                                </span>
                              </div>
                              <Badge
                                className={cn(
                                  "border-none px-2 py-0.5 text-[10px]",
                                  trap.status === "Online"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {trap.status}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-xs text-slate-600">
                              <p className="flex items-center gap-2">
                                <MapPin className="size-3.5 text-slate-400 shrink-0" />
                                <span className="font-medium">
                                  {trap.location}
                                </span>
                              </p>

                              <p className="flex items-center gap-2">
                                <Bug className="size-3.5 text-slate-400 shrink-0" />
                                <span>Today's Mosquito Count: </span>
                                <span className={`font-bold text-${aColor}-600`}>
                                  {trap.count}
                                </span>
                              </p>

                              <p className="flex items-center gap-2">
                                <Battery className="size-3.5 text-slate-400 shrink-0" />
                                <span>Battery Level: {trap.battery != null ? `${trap.battery}%` : "—"}</span>
                              </p>

                              {trap.temperature !== null && (
                                <p className="flex items-center gap-2">
                                  <Thermometer className="size-3.5 text-slate-400 shrink-0" />
                                  <span>
                                    Temp: {trap.temperature}°C
                                    {trap.humidity !== null
                                      ? ` | Hum: ${trap.humidity}%`
                                      : ""}
                                  </span>
                                </p>
                              )}

                              <p className="text-[10px] text-slate-400 pt-1.5 border-t">
                                Current Status: {trap.lastComm}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTrap(trap);
                                setIsDetailsModalOpen(true);
                              }}
                              className="w-full text-xs h-7 mt-1 border-slate-200"
                            >
                              View Current Status Data
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  );
                })}
              </MapContainer>
            </MapErrorBoundary>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: Detailed Trap Diagnostics & Status Modal       */}
      {/* ======================================================== */}
      <Dialog open={isDetailsModalOpen && !!selectedTrap} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          {selectedTrap && (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 pr-8">
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-slate-900">
                      {selectedTrap.device_code}
                    </DialogTitle>
                    <Badge
                      className={cn(
                        "border-none text-[10px]",
                        selectedTrap.status === "Online"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {selectedTrap.status}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Hardware Node Diagnostics & Real-time Status Data
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-4 mt-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-400 uppercase font-semibold text-[10px]">
                      Today's Mosquito Count
                    </p>
                    <p className="text-xl font-bold text-rose-600 mt-0.5">
                      {selectedTrap.count}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-400 uppercase font-semibold text-[10px]">
                      Battery Status
                    </p>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">
                      {selectedTrap.battery != null ? `${selectedTrap.battery}%` : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Location:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedTrap.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">
                      GPS Coordinates:
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {hasValidCoords(selectedTrap)
                        ? `${selectedTrap.lat.toFixed(5)}, ${selectedTrap.lng.toFixed(5)}`
                        : "Not available"}
                    </span>
                  </div>
                  {selectedTrap.temperature !== null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">
                        Ambient Temperature:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedTrap.temperature}°C
                      </span>
                    </div>
                  )}
                  {selectedTrap.humidity !== null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">
                        Relative Humidity:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedTrap.humidity}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">
                      Last Ingested Communication:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedTrap.lastComm}
                    </span>
                  </div>
                  {selectedTrap.deployed_by_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">
                        Deployed By:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedTrap.deployed_by_name}
                      </span>
                    </div>
                  )}
                  {selectedTrap.installation_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">
                        Installation Date:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedTrap.installation_date}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
