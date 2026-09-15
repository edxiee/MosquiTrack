import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import { MapErrorBoundary } from "@/components/system/MapErrorBoundary";
import L from "leaflet";
import {
  AlertTriangle,
  Bug,
  Battery,
  MapPin,
  Activity,
  ShieldAlert,
  Bell,
  Flame,
  ChevronRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Thermometer,
  Send,
  X,
  ListTodo,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/errorHelpers";
import {
  fetchBarangaySurveillanceData,
  submitTriageRequest,
  type BarangaySurveillanceData,
  type BarangaySurveillanceDevice,
} from "@/services/barangaySurveillance.service";

import "leaflet/dist/leaflet.css";

function hasValidCoords(trap: { lat: number; lng: number } | null | undefined): boolean {
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
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "Online":
      return "emerald";
    case "Delayed":
      return "amber";
    case "Offline":
      return "rose";
    default:
      return "slate";
  }
};

const createCustomMarker = (activity: string) => {
  const bg = getActivityColor(activity);
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-30 animate-ping"></div>
        <div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-20"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-${bg}-600 relative z-10 drop-shadow-sm">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

export default function BarangaySurveillancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = searchParams.get("viewId");
  const urlBarangayId = searchParams.get("barangayId");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const [selectedBarangayId, setSelectedBarangayId] = useState<string>(urlBarangayId || "");
  const [data, setData] = useState<BarangaySurveillanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrap, setSelectedTrap] = useState<BarangaySurveillanceDevice | null>(null);

  // Modals state
  const [isFoggingModalOpen, setIsFoggingModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionPriority, setActionPriority] = useState<"Low" | "Medium" | "High" | "Critical">("High");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Ref to the map card so we can scroll it into view
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchBarangaySurveillanceData(selectedBarangayId || undefined);
      setData(res);

      if (!selectedBarangayId && res.barangayId) {
        setSelectedBarangayId(res.barangayId);
      }

      // Prefer the trap coming from ?viewId=...
      if (viewId) {
        const trapFromUrl =
          res.traps.find((t) => t.id === viewId) ||
          res.traps.find((t) => t.device_code === viewId);

        if (trapFromUrl) {
          setSelectedTrap(trapFromUrl);

          setTimeout(() => {
            mapSectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 300);

          setTimeout(() => {
            const marker = markerRefs.current[trapFromUrl.id];
            if (marker) {
              marker.openPopup();
            }
          }, 1600);

          return;
        }
      }

      // Fallback: keep previous selection or pick first trap
      setSelectedTrap((prev) => {
        const next =
          prev && res.traps.find((t) => t.id === prev.id)
            ? res.traps.find((t) => t.id === prev.id)!
            : res.traps.find((t) => hasValidCoords(t)) ?? null;

        return next && hasValidCoords(next) ? next : null;
      });
    } catch (err) {
      console.error("Failed to load barangay surveillance data:", err);
      setError(getErrorMessage(err, "Failed to load database surveillance data."));
    } finally {
      setLoading(false);
    }
  }, [viewId, selectedBarangayId]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime database changes for all relevant tables
    const readingsSub = supabase
      .channel("brgy-surveillance-readings-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const devicesSub = supabase
      .channel("brgy-surveillance-devices-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const actionsSub = supabase
      .channel("brgy-surveillance-actions-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_triage_log" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const riskSub = supabase
      .channel("brgy-surveillance-risk-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risk_assessments" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(readingsSub);
      supabase.removeChannel(devicesSub);
      supabase.removeChannel(actionsSub);
      supabase.removeChannel(riskSub);
    };
  }, [loadData]);

  const handleBarangayChange = (newBarangayId: string) => {
    setSelectedBarangayId(newBarangayId);
    setSearchParams((prev) => {
      prev.set("barangayId", newBarangayId);
      return prev;
    });
  };

  const handleRequestFoggingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.barangayId) return;

    setActionSubmitting(true);
    try {
      await submitTriageRequest({
        barangayId: data.barangayId,
        deviceId: selectedTrap?.id || null,
        triggerSource: "BHW Fogging Request",
        priority: "High",
        remarks:
          actionRemarks.trim() ||
          `Emergency thermal fogging and misting requested by BHW for ${data.barangayName} due to elevated vector index (${data.vectorIndex}).`,
      });

      setIsFoggingModalOpen(false);
      setActionRemarks("");
      setActionSuccessMsg("Fogging request successfully logged in Action Triage Log!");
      setTimeout(() => setActionSuccessMsg(null), 5000);
      loadData();
    } catch (err) {
      alert("Failed to submit request: " + getErrorMessage(err));
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleNotifyLguSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.barangayId) return;

    setActionSubmitting(true);
    try {
      await submitTriageRequest({
        barangayId: data.barangayId,
        deviceId: selectedTrap?.id || null,
        triggerSource: "BHW Surveillance Alert",
        priority: actionPriority,
        remarks:
          actionRemarks.trim() ||
          `Surveillance alert for ${data.barangayName}: Vector risk is at ${data.riskLevel} with ${data.todayCount} mosquitoes captured today.`,
      });

      setIsNotifyModalOpen(false);
      setActionRemarks("");
      setActionSuccessMsg("Incident notification dispatched to LGU and logged in database!");
      setTimeout(() => setActionSuccessMsg(null), 5000);
      loadData();
    } catch (err) {
      alert("Failed to dispatch alert: " + getErrorMessage(err));
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Connecting to Barangay Surveillance database...</p>
      </div>
    );
  }

  const barangayName = data?.barangayName ?? "Barangay Surveillance";
  const municipality = data?.municipality ?? "";
  const province = data?.province ?? "";
  const riskLevel = data?.riskLevel ?? "Low Risk";
  const todayCount = data?.todayCount ?? 0;
  const totalHistoricalCount = data?.totalHistoricalCount ?? 0;
  const activeCount = data?.activeCount ?? 0;
  const totalTrapsCount = data?.totalTrapsCount ?? 0;
  const vectorIndex = data?.vectorIndex ?? 0;
  const recommendation = data?.recommendation ?? "No recommendation available.";
  const traps = data?.traps ?? [];
  const trend = data?.trend ?? [];

  const sortedTraps = [...traps].sort((a, b) => {
    const aHasLoc = hasValidCoords(a) ? 0 : 1;
    const bHasLoc = hasValidCoords(b) ? 0 : 1;
    if (aHasLoc !== bHasLoc) return aHasLoc - bHasLoc;

    const statusRank = (s: string) =>
      s === "Online" ? 0 : s === "Delayed" ? 1 : 2;
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;

    return (b.count ?? 0) - (a.count ?? 0);
  });

  const latestDetections = data?.latestDetections ?? [];
  const recentActions = data?.recentActions ?? [];
  const availableBarangays = data?.availableBarangays ?? [];
  const barangayCenter = data?.barangayCenter ?? { lat: 0, lng: 0 };

  const getRiskColor = (level: string) => {
    if (level.includes("Critical")) return "rose";
    if (level.includes("High")) return "orange";
    if (level.includes("Moderate")) return "amber";
    return "emerald";
  };

  const riskColor = getRiskColor(riskLevel);

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto min-h-full">
      {/* Header & Barangay Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Barangay Surveillance</h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold px-3 py-1 text-sm">
              {barangayName}
            </Badge>
            {municipality && (
              <Badge variant="outline" className="text-slate-600 border-slate-300 font-medium">
                {municipality}{province ? `, ${province}` : ""}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time IoT telemetry, automated mosquito index, and vector triage for field health workers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableBarangays.length > 1 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="barangay-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Select Barangay:
              </Label>
              <select
                id="barangay-select"
                value={selectedBarangayId}
                onChange={(e) => handleBarangayChange(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableBarangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.barangay_name} {b.municipality ? `(${b.municipality})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3.5 text-xs font-medium border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            Sync Database
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={`border-l-4 border-l-${riskColor}-500 shadow-sm bg-white`}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Risk Tier</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full bg-${riskColor}-500 animate-pulse`} />
                <h2 className={`text-2xl font-bold text-${riskColor}-600`}>{riskLevel}</h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">From real-time vector model</p>
            </div>
            <div className={`h-12 w-12 rounded-xl bg-${riskColor}-50 flex items-center justify-center`}>
              <ShieldAlert className={`h-6 w-6 text-${riskColor}-600`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Mosquitoes</p>
              <h2 className="mt-2 text-3xl font-bold text-rose-600">{todayCount}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Historical total: {totalHistoricalCount}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
              <Bug className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Ovi Traps</p>
              <h2 className="mt-2 text-3xl font-bold text-emerald-600">
                {activeCount} <span className="text-sm font-medium text-slate-400">/ {totalTrapsCount} deployed</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">Live database connectivity</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Vector Index</p>
              <h2 className="mt-2 text-3xl font-bold text-amber-600">{vectorIndex}</h2>
              <p className="text-[11px] text-slate-400 mt-1">Mosquitoes per active trap</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Overview & Traps List */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="bg-gradient-to-br from-white to-orange-50/30 border-orange-100 shadow-sm">
            <CardHeader className="pb-3 border-b border-orange-50/50">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Barangay Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Barangay</span>
                <span className="font-bold text-slate-900">{barangayName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Traps</span>
                <span className="font-bold text-slate-900">{traps.length} Nodes</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Risk Level</span>
                <Badge className={`bg-${riskColor}-100 text-${riskColor}-700 hover:bg-${riskColor}-100 border-none font-bold`}>
                  {riskLevel}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Vector Index</span>
                <span className="font-bold text-slate-900">{vectorIndex} DVI</span>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-100/60">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Prescriptive Recommendation</p>
                <div className="bg-white p-3.5 rounded-xl border border-orange-100 shadow-xs text-xs text-slate-700 leading-relaxed font-medium">
                  {recommendation}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-[420px] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                Trap Fleet ({traps.length})
              </CardTitle>
              <span className="text-xs font-medium text-slate-400">Click to locate</span>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[500px]">
              {traps.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 space-y-2">
                  <p className="font-semibold text-slate-700">No traps registered yet.</p>
                  <p className="text-xs">Traps assigned to {barangayName} in the database will display here automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedTraps.map((trap) => {
                    const isSelected = selectedTrap?.id === trap.id;
                    const sColor = getStatusColor(trap.status);
                    const canLocate = hasValidCoords(trap);

                    return (
                      <button
                        key={trap.id}
                        type="button"
                        disabled={!canLocate}
                        onClick={() => {
                          if (!canLocate) return; // block selection
                          setSelectedTrap(trap);
                          mapSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                        className={`w-full text-left px-5 py-4 flex flex-col gap-2 transition-all border-l-[4px] ${
                          !canLocate
                            ? "opacity-50 cursor-not-allowed border-l-transparent bg-slate-50/50"
                            : isSelected
                            ? `cursor-pointer bg-${sColor}-50/60 border-l-${sColor}-500 shadow-xs`
                            : "cursor-pointer hover:bg-slate-50 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full bg-${sColor}-500 ${
                                trap.status === "Online" ? "animate-pulse" : ""
                              }`}
                            />
                            <span className="font-bold text-slate-900 text-sm">
                              {trap.device_code}
                            </span>
                          </div>
                          <Badge
                            className={`text-[10px] font-bold uppercase tracking-wider bg-${sColor}-100 text-${sColor}-700 border-none`}
                          >
                            {trap.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {canLocate ? trap.location : "No location — map access disabled"}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-1.5 pt-2 border-t border-slate-100/80 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">
                              Today Count
                            </p>
                            <p
                              className={`font-bold ${
                                trap.count > 0 ? "text-rose-600" : "text-slate-700"
                              }`}
                            >
                              {trap.count}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">
                              Battery
                            </p>
                            <p className="font-semibold text-slate-700 flex items-center gap-1">
                              <Battery className="h-3 w-3 text-slate-400" /> {trap.battery}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">
                              Status
                            </p>
                            <p className="font-medium text-slate-600 truncate">
                              {trap.lastComm}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Leaflet Map */}
        <div className="lg:col-span-8 flex flex-col" ref={mapSectionRef}>
          <Card className="flex-1 flex flex-col overflow-hidden min-h-[550px] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white z-10 shadow-xs relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Barangay Interactive GIS Map
                </CardTitle>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500"/> Low</span>
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-amber-500"/> Moderate</span>
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-orange-500"/> High</span>
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-rose-500"/> Critical</span>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 relative z-0 min-h-[480px]">
              <MapErrorBoundary>
                <MapContainer
                  center={[barangayCenter.lat, barangayCenter.lng]}
                  zoom={15}
                  zoomControl={false}
                  className="w-full h-full min-h-[480px]"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {selectedTrap && hasValidCoords(selectedTrap) && (
                    <MapFlyTo lat={selectedTrap.lat} lng={selectedTrap.lng} />
                  )}

                  {traps.filter(hasValidCoords).map((trap) => {
                    const sColor = getStatusColor(trap.status);
                    const aColor = getActivityColor(trap.activityLevel);
                    const hexColor = getHexColor(aColor);

                    return (
                      <div key={trap.id}>
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
                        <Marker
                          ref={(r) => {
                            markerRefs.current[trap.id] = r;
                          }}
                          position={[trap.lat, trap.lng]}
                          icon={createCustomMarker(trap.activityLevel)}
                          eventHandlers={{
                            click: () => setSelectedTrap(trap),
                          }}
                        >
                          <Popup className="custom-popup">
                            <div className="p-2 space-y-3 min-w-[220px]">
                              <div className="flex items-center justify-between border-b pb-2">
                                <p className="font-bold text-slate-900 text-sm">
                                  {trap.device_code}
                                </p>
                                <Badge
                                  className={`bg-${sColor}-100 text-${sColor}-700 border-none px-2 py-0.5 text-[10px]`}
                                >
                                  {trap.status}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-xs text-slate-600">
                                <p className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="font-medium">{trap.location}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <Bug className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>Today's Count: </span>
                                  <span className={`font-bold text-${aColor}-600`}>
                                    {trap.count}
                                  </span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <Battery className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>Battery Level: {trap.battery}%</span>
                                </p>
                                {trap.temperature !== null && (
                                  <p className="flex items-center gap-2">
                                    <Thermometer className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      Temp / Humidity: {trap.temperature}°C /{" "}
                                      {trap.humidity}%
                                    </span>
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-400 pt-1.5 border-t">
                                  Last Communication: {trap.lastComm}
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
                                View Complete Telemetry
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
          </Card>
        </div>
      </div>

      {/* Bottom Section: Trend Chart & Latest Detections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" />
              7-Day Mosquito Oviposition Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Daily aggregates calculated from database ovitrap readings.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-2 pl-0 pr-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Mosquitoes Count"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#0284c7", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Bug className="h-4 w-4 text-rose-500" />
              Latest Ingested Telemetry Detections
            </CardTitle>
            <CardDescription className="text-xs">
              Most recent optical / acoustic telemetry readings recorded for this barangay.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[300px]">
            {latestDetections.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No telemetry packets recorded for this barangay yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-bold text-slate-500">Captured At</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500">Trap Node</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500">Location Notes</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 text-center">Mosquitoes</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500">AI Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestDetections.map((det) => (
                    <TableRow key={det.id} className="hover:bg-slate-50 transition-colors text-xs">
                      <TableCell className="text-slate-600 font-medium whitespace-nowrap">{det.time}</TableCell>
                      <TableCell className="font-bold text-slate-900">{det.trapId}</TableCell>
                      <TableCell className="text-slate-600 max-w-[140px] truncate">{det.location}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600">{det.count}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            det.status === "Verified"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          } border-none shadow-none`}
                        >
                          {det.status}
                          {det.confidence !== null ? ` (${(det.confidence * 100).toFixed(0)}%)` : ""}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Action Triage History */}
      {recentActions.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-emerald-600" />
                Active Field Intervention Requests ({recentActions.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time records from `action_triage_log` for {barangayName}.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-500">Date Assigned</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Trigger Source</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Target Trap</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Priority</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Remarks / Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActions.map((action) => (
                  <TableRow key={action.id} className="text-xs hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-600">{action.assignedDate}</TableCell>
                    <TableCell className="font-bold text-slate-800">{action.triggerSource}</TableCell>
                    <TableCell className="text-slate-600">{action.deviceCode ?? "Barangay Wide"}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] font-bold ${
                          action.priority === "Critical"
                            ? "bg-rose-100 text-rose-700"
                            : action.priority === "High"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-amber-100 text-amber-700"
                        } border-none`}
                      >
                        {action.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          action.status === "Completed"
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                            : action.status === "In Progress"
                            ? "border-sky-300 text-sky-700 bg-sky-50"
                            : "border-amber-300 text-amber-700 bg-amber-50"
                        }`}
                      >
                        {action.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-xs truncate">{action.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Interactive Quick Actions Bar */}
      <Card className="bg-slate-50 border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-slate-500" />
            <div>
              <span className="text-sm font-bold text-slate-700 uppercase tracking-wider block">Field Operations & Triage</span>
              <span className="text-xs text-slate-500">Dispatch live interventions directly to database action log.</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (traps.length > 0) {
                  setIsDetailsModalOpen(true);
                } else {
                  alert("No deployed traps in this barangay.");
                }
              }}
              className="bg-white hover:bg-slate-100 h-10 px-4 border-slate-200 text-slate-700 font-medium text-xs rounded-xl"
            >
              <ChevronRight className="mr-2 h-4 w-4 text-emerald-600" />
              View Trap Telemetry Details
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsNotifyModalOpen(true)}
              className="bg-white hover:bg-slate-100 h-10 px-4 border-slate-200 text-slate-700 font-medium text-xs rounded-xl"
            >
              <Bell className="mr-2 h-4 w-4 text-amber-600" />
              Notify LGU Health Officer
            </Button>
            <Button
              onClick={() => setIsFoggingModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm h-10 px-5 font-semibold text-xs rounded-xl gap-2"
            >
              <Flame className="h-4 w-4" />
              Request Emergency Fogging
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: Request Emergency Fogging */}
      {isFoggingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Request Emergency Fogging</h2>
                  <p className="text-xs text-slate-500">Submit an urgent misting work order to Action Triage Log.</p>
                </div>
              </div>
              <button
                onClick={() => setIsFoggingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestFoggingSubmit} className="space-y-4 mt-4">
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Barangay: {barangayName}</p>
                <p>Current Vector Index: <span className="font-bold">{vectorIndex} DVI</span> | Today's Count: <span className="font-bold">{todayCount}</span></p>
                <p>Target Trap: {selectedTrap?.device_code || "Barangay-wide"}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fogging-remarks" className="text-xs font-semibold text-slate-700">
                  Field Notes & Justification
                </Label>
                <Textarea
                  id="fogging-remarks"
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="e.g. Cluster of stagnant water containers and rising mosquito counts detected near the public school..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFoggingModalOpen(false)}
                  disabled={actionSubmitting}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionSubmitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 font-semibold gap-2"
                >
                  {actionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit to Action Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Notify LGU Health Officer */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Notify LGU Health Officer</h2>
                  <p className="text-xs text-slate-500">Dispatch surveillance findings to Municipal Health Office.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleNotifyLguSubmit} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="notify-priority" className="text-xs font-semibold text-slate-700">
                  Priority Level
                </Label>
                <select
                  id="notify-priority"
                  value={actionPriority}
                  onChange={(e) => setActionPriority(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="Low">Low - Informational Update</option>
                  <option value="Medium">Medium - Elevated Activity</option>
                  <option value="High">High - Vector Proliferation Alert</option>
                  <option value="Critical">Critical - Urgent Emergency Response</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notify-remarks" className="text-xs font-semibold text-slate-700">
                  Surveillance Notes & Observations
                </Label>
                <Textarea
                  id="notify-remarks"
                  rows={4}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder={`Describe observations for ${barangayName}...`}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNotifyModalOpen(false)}
                  disabled={actionSubmitting}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-2"
                >
                  {actionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Dispatch Notification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Detailed Trap Telemetry Modal */}
      {isDetailsModalOpen && selectedTrap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedTrap.device_code}</h2>
                  <Badge className={`bg-${getStatusColor(selectedTrap.status)}-100 text-${getStatusColor(selectedTrap.status)}-700 border-none text-[10px]`}>
                    {selectedTrap.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">Hardware Node Diagnostics & Real-time Telemetry</p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 uppercase font-semibold text-[10px]">Today's Mosquito Count</p>
                  <p className="text-xl font-bold text-rose-600 mt-0.5">{selectedTrap.count}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400 uppercase font-semibold text-[10px]">Battery Status</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{selectedTrap.battery}%</p>
                </div>
              </div>

              <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Location:</span>
                  <span className="font-semibold text-slate-800">{selectedTrap.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {hasValidCoords(selectedTrap)
                      ? `${selectedTrap.lat.toFixed(5)}, ${selectedTrap.lng.toFixed(5)}`
                      : "Not available"}
                  </span>
                </div>
                {selectedTrap.temperature !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Ambient Temperature:</span>
                    <span className="font-semibold text-slate-800">{selectedTrap.temperature}°C</span>
                  </div>
                )}
                {selectedTrap.humidity !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Relative Humidity:</span>
                    <span className="font-semibold text-slate-800">{selectedTrap.humidity}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Last Ingested Communication:</span>
                  <span className="font-semibold text-slate-800">{selectedTrap.lastComm}</span>
                </div>
                {selectedTrap.deployed_by_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Deployed By:</span>
                    <span className="font-semibold text-slate-800">{selectedTrap.deployed_by_name}</span>
                  </div>
                )}
                {selectedTrap.installation_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Installation Date:</span>
                    <span className="font-semibold text-slate-800">{selectedTrap.installation_date}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}