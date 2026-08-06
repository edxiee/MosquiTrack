import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Wifi,
  WifiOff,
  Clock,
  Search,
  RefreshCw,
  MapPin,
  Activity,
  Battery,
  Cpu,
  Radio,
  Eye,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ListTodo
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { OvitrapDevice } from "@/features/nodes/types/device";
import { ROUTES } from "@/features/navigation/config/routes";
import { useNavigate } from "react-router-dom";

import "leaflet/dist/leaflet.css";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never Connected";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "Never Connected";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

type ConnectionState = "Online" | "Delayed" | "Offline" | "Not Connected";

function getConnectionStatus(lastSeenStr: string | null | undefined) {
  if (!lastSeenStr) {
    return { state: "Not Connected" as ConnectionState, bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", ping: false, border: "border-slate-300" };
  }
  const diffMinutes = (Date.now() - new Date(lastSeenStr).getTime()) / (1000 * 60);
  if (diffMinutes < 30) {
    return { state: "Online" as ConnectionState, bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ping: true, border: "border-emerald-300" };
  } else if (diffMinutes < 1440) { // 24 hours
    return { state: "Delayed" as ConnectionState, bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", ping: false, border: "border-amber-300" };
  } else {
    return { state: "Offline" as ConnectionState, bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", ping: false, border: "border-rose-300" };
  }
}

function getRiskClassification(count: number | null) {
  if (count === null) return { label: "N/A", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" };
  if (count >= 100) return { label: "Red", color: "text-red-700", bg: "bg-red-100 border-red-200" };
  if (count >= 50) return { label: "Orange", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" };
  if (count >= 20) return { label: "Yellow", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" };
  return { label: "Green", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" };
}

// ── Map marker icon ─────────────────────────────────────────────────────────
const createCustomMarker = (status: ConnectionState) => {
  const colorMap: Record<ConnectionState, string> = {
    "Online": "emerald",
    "Delayed": "amber",
    "Offline": "rose",
    "Not Connected": "slate",
  };
  const bg = colorMap[status] ?? colorMap["Not Connected"];
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-25"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-${bg}-600 relative z-10 drop-shadow-md">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// ── Map controller ──────────────────────────────────────────────────────────
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (
      !lastCoords.current ||
      lastCoords.current.lat !== lat ||
      lastCoords.current.lng !== lng
    ) {
      lastCoords.current = { lat, lng };
      map.flyTo([lat, lng], 16, { animate: false });
    }
  }, [lat, lng, map]);

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function LiveMonitoringPage() {
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [deviceLatestReadings, setDeviceLatestReadings] = useState<Record<string, { battery_level: number | null; captured_at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<OvitrapDevice | null>(null);

  // ── Detail telemetry state for selected device ──────────────────────────
  const [latestReading, setLatestReading] = useState<{
    battery_level: number | null;
    egg_count: number | null;
    captured_at: string;
  } | null>(null);
  const [deviceTodayCount, setDeviceTodayCount] = useState<number | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // ── Live-sync state ─────────────────────────────────────────────────────
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [lastSyncLabel, setLastSyncLabel] = useState("just now");
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reading counts (today) ──────────────────────────────────────────────
  // Removed global todayDetections as it's no longer used in summary cards

  // ── Fetch devices ───────────────────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ovitrap_devices")
        .select(
          `id, device_code, serial_number, description, barangay_id,
           latitude, longitude, device_status_id, notes,
           installation_date, last_seen_at, created_at, deployed_by,
           device_statuses (id, status_name, description),
           barangays (id, barangay_name)`
        )
        .order("device_code");

      if (error) throw error;
      const allDevices = (data as unknown as OvitrapDevice[]) ?? [];
      setDevices(allDevices);

      // Fetch a bulk of recent readings to determine last seen / battery for the list
      const { data: readings } = await supabase
        .from("ovitrap_readings")
        .select("device_id, battery_level, captured_at")
        .order("captured_at", { ascending: false })
        .limit(1000);

      if (readings) {
        const latestMap: Record<string, { battery_level: number | null; captured_at: string }> = {};
        for (const r of readings) {
          if (!latestMap[r.device_id]) {
            latestMap[r.device_id] = r;
          }
        }
        setDeviceLatestReadings(latestMap);
      }

      // Keep selected device reference fresh
      setSelectedDevice(prev => {
        if (!prev) return prev;
        const updated = allDevices.find(d => d.id === prev.id);
        return updated ?? prev;
      });
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      setLoading(false);
    }
  }, []);



  // ── Fetch specific telemetry for selected device ───────────────────────
  useEffect(() => {
    if (!selectedDevice) {
      setLatestReading(null);
      setDeviceTodayCount(null);
      return;
    }

    let isMounted = true;

    async function fetchDeviceTelemetry() {
      try {
        // Fetch latest reading for battery and last detection
        const { data: latest } = await supabase
          .from("ovitrap_readings")
          .select("battery_level, egg_count, captured_at")
          .eq("device_id", selectedDevice!.id)
          .order("captured_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;
        setLatestReading(latest ?? null);

        // Fetch today's readings for this device
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: todayReadings } = await supabase
          .from("ovitrap_readings")
          .select("egg_count")
          .eq("device_id", selectedDevice!.id)
          .gte("captured_at", todayStart.toISOString());

        if (!isMounted) return;
        if (todayReadings && todayReadings.length > 0) {
          const sum = todayReadings.reduce((acc, r) => acc + (r.egg_count ?? 0), 0);
          setDeviceTodayCount(sum);
        } else {
          setDeviceTodayCount(0);
        }
      } catch (err) {
        console.error("Failed to fetch device telemetry:", err);
      }
    }

    fetchDeviceTelemetry();

    return () => {
      isMounted = false;
    };
  }, [selectedDevice?.id]);

  // ── Initial load + realtime subscriptions ──────────────────────────────
  useEffect(() => {
    fetchDevices();

    const deviceChannel = supabase
      .channel("live-monitoring-devices")
      .on("postgres_changes", { event: "*", schema: "public", table: "ovitrap_devices" }, () => {
        fetchDevices();
        setLastSync(new Date());
      })
      .subscribe();

    const readingsChannel = supabase
      .channel("live-monitoring-readings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ovitrap_readings" }, () => {
        fetchDevices(); // re-fetch battery for list
        setLastSync(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(readingsChannel);
    };
  }, [fetchDevices]);

  // ── Tick the "last sync" label every second ─────────────────────────────
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - lastSync.getTime()) / 1000);
      if (diff < 5) setLastSyncLabel("just now");
      else if (diff < 60) setLastSyncLabel(`${diff} seconds ago`);
      else setLastSyncLabel(`${Math.floor(diff / 60)} minutes ago`);
    }, 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [lastSync]);

  // ── Derived counts ──────────────────────────────────────────────────────
  const devicesWithStatus = devices.map(d => {
    const lastSeenStr = deviceLatestReadings[d.id]?.captured_at || d.last_seen_at;
    const status = getConnectionStatus(lastSeenStr);
    return { ...d, computedStatus: status, lastSeenStr, latestBattery: deviceLatestReadings[d.id]?.battery_level };
  });

  const onlineCount = devicesWithStatus.filter(d => d.computedStatus.state === "Online").length;
  const delayedCount = devicesWithStatus.filter(d => d.computedStatus.state === "Delayed").length;
  const offlineCount = devicesWithStatus.filter(d => d.computedStatus.state === "Offline").length;

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = devicesWithStatus.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      d.device_code.toLowerCase().includes(q) ||
      (d.description ?? "").toLowerCase().includes(q) ||
      (d.barangays?.barangay_name ?? "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "All" || d.computedStatus.state === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Mock Events Generator ───────────────────────────────────────────────
  const getMockTimeline = () => {
    if (!latestReading?.captured_at) return null;
    const baseTime = new Date(latestReading.captured_at).getTime();
    return [
      { time: new Date(baseTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), event: "Telemetry Uploaded", color: "bg-emerald-500" },
      { time: new Date(baseTime - 1 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), event: "Battery Updated", color: "bg-emerald-400" },
      { time: new Date(baseTime - 5 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), event: "Mosquito Detected", color: "bg-amber-500" },
      { time: new Date(baseTime - 15 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), event: "Heartbeat Received", color: "bg-sky-500" },
    ];
  };
  const timelineEvents = getMockTimeline();

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Live Monitoring
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Monitor the operational status and recent activity of deployed Smart Ovi Trap devices.
        </p>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Online Devices</p>
              <h2 className="mt-1 text-3xl font-bold text-emerald-600">{onlineCount}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <Wifi className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delayed</p>
              <h2 className="mt-1 text-3xl font-bold text-amber-600">{delayedCount}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Offline Devices</p>
              <h2 className="mt-1 text-3xl font-bold text-rose-600">{offlineCount}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
              <WifiOff className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Data Sync</p>
              <h2 className="mt-1 text-lg font-bold text-sky-600">{lastSyncLabel}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
              <Clock className="h-6 w-6 text-sky-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Layout: Left (Device List) + Right (Detail) ────────── */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* ── LEFT PANEL: Device List ─────────────────────────────── */}
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm">Device List</h2>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search trap ID, location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Online", "Delayed", "Offline", "Not Connected"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    statusFilter === f
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable device list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">No devices found.</p>
            ) : (
              filtered.map(d => {
                const isSelected = selectedDevice?.id === d.id;
                const status = d.computedStatus;
                
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDevice(d)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? `${status.bg} border-l-[3px] border-l-${status.dot.replace('bg-', '')}`
                        : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${status.dot} ${status.ping ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-800 truncate">{d.device_code}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${status.text}`}>
                          {status.state}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {d.description || d.barangays?.barangay_name || "N/A"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-slate-400">
                          {formatTimeAgo(d.lastSeenStr)}
                        </p>
                        {d.latestBattery != null && (
                          <div className="flex items-center text-[10px] font-medium text-slate-500">
                            <Battery className="h-3 w-3 mr-1" />
                            {d.latestBattery}%
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* ── RIGHT PANEL: Device Detail ──────────────────────────── */}
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto min-h-0">
          {!selectedDevice ? (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400 space-y-4 max-w-sm mx-auto">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                  <Activity className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">No Trap Selected</h3>
                <p className="text-sm leading-relaxed">
                  Select a deployed Smart Ovi Trap from the list to view its latest telemetry, device health, battery status, LTE connectivity, mosquito detections, and communication history.
                </p>
              </div>
            </Card>
          ) : (
            (() => {
              const lastSeenStr = latestReading?.captured_at || selectedDevice.last_seen_at;
              const status = getConnectionStatus(lastSeenStr);
              const hasTelemetry = !!latestReading;
              
              return (
              <>
                {/* Row 1: Device Info + Device Health */}
                <div className="grid gap-5 xl:grid-cols-2">
                  {/* Device Information */}
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Device Information</h3>
                        <Badge variant="outline" className={`text-xs border ${status.border} ${status.text} ${status.bg}`}>
                          <div className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.state}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        {[
                          ["Trap ID", selectedDevice.device_code],
                          ["Last Seen", formatTimeAgo(lastSeenStr)],
                          ["Battery", latestReading?.battery_level != null ? `${latestReading.battery_level}%` : "Waiting for first telemetry"],
                          ["Signal Strength", hasTelemetry ? "Excellent (-68 dBm)" : "Waiting for first telemetry"], // Mocking as requested since no DB col
                          ["Firmware Version", hasTelemetry ? "v2.4.1" : "N/A"], // Mocking
                          ["SIM Network", hasTelemetry ? "Smart LTE" : "N/A"], // Mocking
                          ["Deployment Date", selectedDevice.installation_date ? String(selectedDevice.installation_date).split("T")[0] : "N/A"],
                          ["Last Telemetry Upload", latestReading?.captured_at ? new Date(latestReading.captured_at).toLocaleString() : "Waiting for first telemetry"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs text-slate-400 font-medium">{label}</p>
                            <p className="font-semibold text-slate-700 mt-0.5 truncate pr-2">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Device Health */}
                  <Card>
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Device Health</h3>
                      
                      {!hasTelemetry ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-4">
                          <AlertCircle className="h-8 w-8 text-slate-300" />
                          <p className="font-medium text-slate-500">Status Unknown</p>
                          <p className="text-xs">Waiting for first telemetry</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { icon: Cpu, label: "ESP32", status: "Running", ok: true },
                            { icon: Eye, label: "Infrared Break-Beam Sensor", status: "Operational", ok: true },
                            { icon: Radio, label: "LTE Module", status: "Connected", ok: true },
                            { icon: Battery, label: "Battery", status: `${latestReading.battery_level}%`, ok: (latestReading.battery_level ?? 0) > 20 },
                          ].map(({ icon: Icon, label, status, ok }) => (
                            <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {ok && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                <span className={`text-xs font-bold ${ok ? "text-emerald-600" : "text-red-600"}`}>{status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Live Mosquito Data + Event Log */}
                <div className="grid gap-5 xl:grid-cols-2">
                  {/* Live Mosquito Data */}
                  <Card>
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Latest Telemetry</h3>
                      
                      {!hasTelemetry ? (
                        <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                           <p className="text-sm text-slate-400 font-medium">No mosquito detections yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium">Today's Mosquito Count</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">
                              {deviceTodayCount !== null ? deviceTodayCount : "0"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium">Daily Vector Index (DVI)</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">
                              {deviceTodayCount !== null ? (deviceTodayCount / 50).toFixed(2) : "0.00"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium">Last Detection Time</p>
                            <p className="text-sm font-semibold text-slate-700 mt-2">
                              {formatTimeAgo(latestReading?.captured_at)}
                            </p>
                          </div>
                          <div className={`rounded-lg border p-4 text-center ${getRiskClassification(deviceTodayCount).bg}`}>
                            <p className="text-xs font-medium text-slate-500 opacity-80">Risk Classification</p>
                            <p className={`text-xl font-bold mt-1 ${getRiskClassification(deviceTodayCount).color}`}>
                              {getRiskClassification(deviceTodayCount).label}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Device Activity */}
                  <Card>
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Recent Device Activity</h3>
                      {!timelineEvents ? (
                        <div className="flex-1 flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200 min-h-[160px]">
                          <p className="text-sm text-slate-400 font-medium">No telemetry events have been received yet.</p>
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-slate-100 ml-3 py-2 space-y-6">
                          {timelineEvents.map((evt, idx) => (
                            <div key={idx} className="relative pl-6">
                              <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-4 border-white ${evt.color}`} />
                              <p className="text-xs font-bold text-slate-400">{evt.time}</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5">{evt.event}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 3: Map + Quick Actions */}
                <div className="grid gap-5 xl:grid-cols-3">
                  {/* Device Location Map */}
                  <Card className="xl:col-span-2">
                    <CardContent className="p-0 overflow-hidden rounded-xl">
                      <div className="p-4 pb-0 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Device Location</h3>
                      </div>
                      {selectedDevice.latitude != null && selectedDevice.longitude != null ? (
                        <div className="h-64">
                          <MapContainer
                            center={[Number(selectedDevice.latitude), Number(selectedDevice.longitude)]}
                            zoom={16}
                            zoomControl={false}
                            className="w-full h-full rounded-b-xl"
                            key={selectedDevice.id}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapFlyTo lat={Number(selectedDevice.latitude)} lng={Number(selectedDevice.longitude)} />
                            <Marker
                              position={[Number(selectedDevice.latitude), Number(selectedDevice.longitude)]}
                              icon={createCustomMarker(status.state)}
                            >
                              <Popup>
                                <div className="text-xs space-y-1">
                                  <p className="font-bold text-sm">{selectedDevice.device_code}</p>
                                  <p>{selectedDevice.description || "N/A"}</p>
                                  <p>{status.state}</p>
                                  <p>Last seen: {formatTimeAgo(lastSeenStr)}</p>
                                </div>
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-sm">
                          <MapPin className="h-8 w-8 mb-2 opacity-50" />
                          <p>No location data available (N/A)</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardContent className="p-5 space-y-4 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Actions</h3>
                      <div className="space-y-2.5 flex-1">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-11 text-sm bg-white"
                          onClick={() => {
                            fetchDevices();
                            setLastSync(new Date());
                          }}
                        >
                          <RefreshCw className="h-4 w-4 text-emerald-600" />
                          Refresh Status
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-11 text-sm bg-white"
                          onClick={() => navigate(ROUTES.admin.georeferencing)}
                        >
                          <MapPin className="h-4 w-4 text-sky-600" />
                          View on Risk Map
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-11 text-sm bg-white"
                          onClick={() => navigate(ROUTES.admin.telemetry)}
                        >
                          <ListTodo className="h-4 w-4 text-amber-600" />
                          Open Telemetry Logs
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-11 text-sm bg-white"
                          onClick={() => {
                            // In a real app, this would trigger a download or open a modal
                            alert(`Generating device report for ${selectedDevice.device_code}...`);
                          }}
                        >
                          <FileText className="h-4 w-4 text-rose-600" />
                          Generate Device Report
                        </Button>
                      </div>

                      {/* Connection indicator */}
                      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-slate-600">Live telemetry connection active</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
