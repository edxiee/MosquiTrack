import { useState, useEffect, useCallback, useRef } from "react";
import { MapErrorBoundary } from "@/components/system/MapErrorBoundary";
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
  Radio,
  Satellite,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { OvitrapDevice } from "@/types/device.types";
import { ONLINE_THRESHOLD_MINUTES } from "@/utils/deviceHelpers";
import { getConsecutiveCriticalDays, getDangerTier } from "@/utils/dangerTiers";

import "leaflet/dist/leaflet.css";

// --- HARD CODED SIM NETWORK MAP ---
// This allows us to set TRAP-001 to "GoMo" without needing a database migration.
// You can easily add other devices here in the future (e.g., "TRAP-002": "Smart LTE").
const DEVICE_SIM_NETWORK: Record<string, string> = {
  "TRAP-001": "GoMo",
};

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

type ConnectionState = "Online" | "Offline" | "Not Connected";

function getConnectionStatus(lastSeenStr: string | null | undefined) {
  if (!lastSeenStr) {
    return { state: "Not Connected" as ConnectionState, bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", ping: false, border: "border-slate-300" };
  }
  const diffMinutes = (Date.now() - new Date(lastSeenStr).getTime()) / (1000 * 60);
  if (diffMinutes <= ONLINE_THRESHOLD_MINUTES) {
    return { state: "Online" as ConnectionState, bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ping: true, border: "border-emerald-300" };
  } else {
    return { state: "Offline" as ConnectionState, bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", ping: false, border: "border-rose-300" };
  }
}

function getRiskClassification(count: number | null, consecutiveCriticalDays = 0) {
  if (count === null) return { label: "N/A", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" };
  const tier = getDangerTier(count, consecutiveCriticalDays);
  if (tier === "Critical") return { label: tier, color: "text-rose-700", bg: "bg-rose-100 border-rose-200" };
  if (tier === "High") return { label: tier, color: "text-orange-700", bg: "bg-orange-100 border-orange-200" };
  if (tier === "Moderate") return { label: tier, color: "text-amber-700", bg: "bg-amber-100 border-amber-200" };
  return { label: tier, color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" };
}

const createCustomMarker = (status: ConnectionState) => {
  const colorMap: Record<ConnectionState, string> = {
    "Online": "emerald",
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

export default function LiveMonitoringPage() {
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [deviceLatestReadings, setDeviceLatestReadings] = useState<Record<string, { battery_level: number | null; captured_at: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<OvitrapDevice | null>(null);

  const [latestReading, setLatestReading] = useState<{
    battery_level: number | null;
    mosquito_count?: number | null;
    temperature_c?: number | null;
    humidity_percent?: number | null;
    captured_at: string;
    created_at?: string;
    updated_at?: string | null;
  } | null>(null);
  const [latestBatteryReading, setLatestBatteryReading] = useState<{
    battery_level: number;
    captured_at: string;
    created_at?: string;
    updated_at?: string | null;
  } | null>(null);
  const [deviceTodayCount, setDeviceTodayCount] = useState<number | null>(null);
  const [deviceCriticalDays, setDeviceCriticalDays] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [lastDataSync, setLastDataSync] = useState<Date | null>(null);
  const [lastSyncLabel, setLastSyncLabel] = useState<string>("Loading...");
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [deviceSevenDayCount, setDeviceSevenDayCount] = useState<number | null>(null);

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

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: readings } = await supabase
        .from("ovitrap_readings")
        .select("device_id, battery_level, captured_at, created_at")
        .gte("captured_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (readings && readings.length > 0) {
        const latestMap: Record<string, { battery_level: number | null; captured_at: string }> = {};
        for (const r of readings) {
          if (!latestMap[r.device_id]) {
            latestMap[r.device_id] = r;
          }
        }
        setDeviceLatestReadings(latestMap);

        const newest = readings[0];
        if (newest) {
          const rawTs = (newest as any).created_at || newest.captured_at;
          if (rawTs) {
            setLastDataSync(new Date(rawTs));
          }
        }
      }

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

  useEffect(() => {
    if (!selectedDevice) {
      setLatestReading(null);
      setLatestBatteryReading(null);
      setDeviceTodayCount(null);
      setDeviceSevenDayCount(null);
      setDeviceCriticalDays(0);
      return;
    }

    let isMounted = true;
    const deviceId = selectedDevice.id;

    async function fetchDeviceTelemetry() {
      try {
        const [{ data: latest }, { data: latestBattery }] = await Promise.all([
          supabase
            .from("ovitrap_readings")
            .select("battery_level, mosquito_count, temperature_c, humidity_percent, captured_at, created_at, updated_at")
            .eq("device_id", deviceId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("ovitrap_readings")
            .select("battery_level, captured_at, created_at, updated_at")
            .eq("device_id", deviceId)
            .not("battery_level", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        setLatestReading(latest ?? null);
        setLatestBatteryReading(
          latestBattery && latestBattery.battery_level != null
            ? (latestBattery as {
                battery_level: number;
                captured_at: string;
                created_at?: string;
                updated_at?: string | null;
              })
            : null
        );

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const sevenDayStart = new Date(todayStart);
        sevenDayStart.setUTCDate(sevenDayStart.getUTCDate() - 6);

        const { data: recentReadings } = await supabase
          .from("ovitrap_readings")
          .select("mosquito_count, captured_at, created_at")
          .eq("device_id", deviceId)
          .gte("captured_at", sevenDayStart.toISOString());

        if (!isMounted) return;

        const dailyCounts = new Map<string, number>();
        let sevenDayTotal = 0;

        for (const reading of recentReadings ?? []) {
          const timestamp = reading.captured_at || reading.created_at;
          if (!timestamp) continue;

          const count = reading.mosquito_count ?? 0;
          sevenDayTotal += count;

          const day = timestamp.slice(0, 10);
          dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + count);
        }

        // Last 3 days for critical streak (newest first)
        const days = Array.from({ length: 3 }, (_, offset) => {
          const day = new Date(todayStart);
          day.setUTCDate(day.getUTCDate() - offset);
          return dailyCounts.get(day.toISOString().slice(0, 10)) ?? 0;
        });

        setDeviceTodayCount(days[0] ?? 0);
        setDeviceSevenDayCount(sevenDayTotal);
        setDeviceCriticalDays(getConsecutiveCriticalDays(days));
      } catch (err) {
        console.error("Failed to fetch device telemetry:", err);
      }
    }
    fetchDeviceTelemetry();

    const selectedDeviceChannel = supabase
      .channel(`selected-device-readings-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovitrap_readings",
          filter: `device_id=eq.${deviceId}`,
        },
        () => {
          fetchDeviceTelemetry();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(selectedDeviceChannel);
    };
  }, [selectedDevice?.id]);

  useEffect(() => {
    fetchDevices();

    const deviceChannel = supabase
      .channel("live-monitoring-devices-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    const readingsChannel = supabase
      .channel("live-monitoring-readings-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        (payload) => {
          fetchDevices();
          const rawTs =
            payload.new && typeof payload.new === "object"
              ? (payload.new as Record<string, unknown>).created_at ||
                (payload.new as Record<string, unknown>).captured_at
              : null;
          if (rawTs) {
            setLastDataSync(new Date(rawTs as string));
          } else {
            setLastDataSync(new Date());
          }
        }
      )
      .subscribe();

    // 5-second automatic heartbeat polling fallback
    const pollInterval = setInterval(() => {
      fetchDevices();
    }, 5000);

    return () => {
      supabase.removeChannel(deviceChannel);
      supabase.removeChannel(readingsChannel);
      clearInterval(pollInterval);
    };
  }, [fetchDevices]);

  useEffect(() => {
    function updateSyncLabel() {
      if (!lastDataSync) {
        setLastSyncLabel("No telemetry received yet");
        return;
      }
      const diffSecs = Math.floor((Date.now() - lastDataSync.getTime()) / 1000);
      if (diffSecs < 0 || diffSecs < 5) {
        setLastSyncLabel("just now");
      } else if (diffSecs < 60) {
        setLastSyncLabel(`${diffSecs} seconds ago`);
      } else if (diffSecs < 3600) {
        const mins = Math.floor(diffSecs / 60);
        setLastSyncLabel(`${mins} minute${mins > 1 ? "s" : ""} ago`);
      } else if (diffSecs < 86400) {
        const hrs = Math.floor(diffSecs / 3600);
        setLastSyncLabel(`${hrs} hour${hrs > 1 ? "s" : ""} ago`);
      } else {
        const days = Math.floor(diffSecs / 86400);
        setLastSyncLabel(`${days} day${days > 1 ? "s" : ""} ago`);
      }
    }

    updateSyncLabel();
    syncIntervalRef.current = setInterval(updateSyncLabel, 1000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [lastDataSync]);

  const devicesWithStatus = devices.map(d => {
    const lastSeenStr = deviceLatestReadings[d.id]?.captured_at || d.last_seen_at;
    const status = getConnectionStatus(lastSeenStr);
    return { ...d, computedStatus: status, lastSeenStr, latestBattery: deviceLatestReadings[d.id]?.battery_level };
  });

  const onlineCount = devicesWithStatus.filter(d => d.computedStatus.state === "Online").length;
  const offlineCount = devicesWithStatus.filter(d => d.computedStatus.state === "Offline").length;

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

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Live Monitoring
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor the current status and real-time trap data of deployed Smart Trap devices.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin-slow" />
            Last synced: <strong className="text-slate-700 font-semibold">{lastSyncLabel}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDevices();
            }}
            className="h-8 px-3 text-xs font-medium border-slate-200"
          >
            Refresh Now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Data Updated</p>
              <h2 className="mt-1 text-lg font-bold text-sky-600">{lastSyncLabel}</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
              <Clock className="h-6 w-6 text-sky-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm">Device List</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search trap ID, location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Online", "Offline", "Not Connected"] as const).map(f => (
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

        <div className="flex-1 flex flex-col gap-5 overflow-y-auto min-h-0">
          {!selectedDevice ? (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400 space-y-4 max-w-sm mx-auto">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                  <Activity className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">No Trap Selected</h3>
                <p className="text-sm leading-relaxed">
                  Select a deployed Smart Ovi Trap from the list to view its latest trap data, device health, battery status, LTE connectivity, mosquito detections, and data history.
                </p>
              </div>
            </Card>
          ) : (
            (() => {
              const lastHttpPostStr =
                latestReading?.created_at ||
                latestReading?.captured_at ||
                selectedDevice.last_seen_at;
              const status = getConnectionStatus(lastHttpPostStr);
              const hasTelemetry = !!latestReading;

              const batteryValue =
                latestReading?.battery_level ??
                latestBatteryReading?.battery_level ??
                null;
              const hasBatteryData =
                batteryValue !== null && batteryValue !== undefined;
              const batteryUpdatedStr =
                latestBatteryReading?.updated_at ||
                latestBatteryReading?.created_at ||
                latestBatteryReading?.captured_at ||
                latestReading?.captured_at ||
                null;

              const hasGpsFix =
                selectedDevice.latitude != null &&
                selectedDevice.longitude != null &&
                !Number.isNaN(Number(selectedDevice.latitude)) &&
                !Number.isNaN(Number(selectedDevice.longitude)) &&
                Number(selectedDevice.latitude) !== 0 &&
                Number(selectedDevice.longitude) !== 0;

              const healthItems = [
                {
                  icon: Radio,
                  label: "Connectivity Status",
                  detail: lastHttpPostStr
                    ? `Last HTTP POST: ${formatTimeAgo(lastHttpPostStr)}`
                    : "No HTTP POST received in Supabase",
                  status: status.state,
                  ok: status.state === "Online",
                },
                {
                  icon: Battery,
                  label: "Battery",
                  detail: hasBatteryData
                    ? `Updated ${formatTimeAgo(batteryUpdatedStr)}`
                    : "No battery data inserted or updated",
                  status: hasBatteryData ? `${batteryValue}%` : "No Data",
                  ok: hasBatteryData && batteryValue > 20,
                },
                {
                  icon: Satellite,
                  label: "GPS Satellite",
                  detail: hasGpsFix
                    ? `${Number(selectedDevice.latitude).toFixed(5)}, ${Number(selectedDevice.longitude).toFixed(5)}`
                    : "Waiting for latitude & longitude",
                  status: hasGpsFix ? "Okay" : "No Signal",
                  ok: hasGpsFix,
                },
              ];
              
              return (
              <>
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Device Information</h3>
                        <Badge variant="outline" className={`text-xs border ${status.border} ${status.text} ${status.bg}`}>
                          <div className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.state}
                        </Badge>
                      </div>
                      
                      {/* UPDATED DEVICE INFORMATION GRID */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        {(() => {
                          const simNetwork = DEVICE_SIM_NETWORK[selectedDevice.device_code] ?? "N/A";
                          return [
                            ["Trap ID", selectedDevice.device_code],
                            ["Last Seen", formatTimeAgo(lastHttpPostStr)],
                            ["Battery", hasBatteryData ? `${batteryValue}%` : "N/A"],
                            ["Signal Strength", "N/A"], // No DB column exists, so we must show N/A
                            ["Firmware Version", "N/A"], // No DB column exists, so we must show N/A
                            ["SIM Network", simNetwork], // Hardcoded via our config map above
                            ["Temperature", latestReading?.temperature_c != null ? `${latestReading.temperature_c}°C` : "N/A"],
                            ["Humidity", latestReading?.humidity_percent != null ? `${latestReading.humidity_percent}%` : "N/A"],
                            ["Deployment Date", selectedDevice.installation_date ? new Date(selectedDevice.installation_date).toLocaleDateString() : "N/A"],
                            ["Last Telemetry Upload", lastHttpPostStr ? new Date(lastHttpPostStr).toLocaleString() : "N/A"],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-slate-400 font-medium">{label}</p>
                              <p className="font-semibold text-slate-700 mt-0.5 truncate pr-2">{value}</p>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Device Health</h3>
                      <div className="space-y-3">
                        {healthItems.map(({ icon: Icon, label, detail, status: itemStatus, ok }) => (
                          <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-slate-700 block">{label}</span>
                                <span className="text-[11px] text-slate-400 block truncate">{detail}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              {ok ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                              )}
                              <span className={`text-xs font-bold ${ok ? "text-emerald-600" : "text-rose-600"}`}>
                                {itemStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Card>
                    <CardContent className="p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Latest Trap Data</h3>
                      
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
                            <p className="text-xs text-slate-500 font-medium">7-days Mosquito Count</p>
                            <p className="text-3xl font-bold text-slate-800 mt-1">
                              {deviceSevenDayCount !== null ? deviceSevenDayCount : "—"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium">Last Detection Time</p>
                            <p className="text-sm font-semibold text-slate-700 mt-2">
                              {formatTimeAgo(latestReading?.captured_at)}
                            </p>
                          </div>
                          <div className={`rounded-lg border p-4 text-center ${getRiskClassification(deviceTodayCount, deviceCriticalDays).bg}`}>
                            <p className="text-xs font-medium text-slate-500 opacity-80">Risk Classification</p>
                            <p className={`text-xl font-bold mt-1 ${getRiskClassification(deviceTodayCount, deviceCriticalDays).color}`}>
                              {getRiskClassification(deviceTodayCount, deviceCriticalDays).label}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

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

                <Card>
                  <CardContent className="p-0 overflow-hidden rounded-xl">
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Device Location</h3>
                    </div>
                    {hasGpsFix ? (
                      <div className="h-64 flex-1 relative z-0">
                        <MapErrorBoundary>
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
                                  <p>Last seen: {formatTimeAgo(lastHttpPostStr)}</p>
                                </div>
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </MapErrorBoundary>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-sm">
                        <MapPin className="h-8 w-8 mb-2 opacity-50" />
                        <p>No location data available (N/A)</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}