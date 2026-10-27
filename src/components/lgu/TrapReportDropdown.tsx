import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  BatteryMedium,
  Bug,
  Cpu,
  Droplets,
  MapPin,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getDeviceReadings,
  getDeviceMosquitoStats,
  type DeviceReadingSummary,
  type DeviceMosquitoStats,
} from "@/services/telemetry.service";
import {
  fetchTrapRequestsByDevice,
  fetchTriageRequestsByDevice,
  type TrapRequest,
  type TrapActionLogEntry,
} from "@/services/trapRequest.service";
import { formatRelativeTime, formatTelemetryTimestamp, isSameLocalDay } from "@/utils/dateHelpers";
import { cn } from "@/lib/utils";
import { getDangerTier } from "@/utils/dangerTiers";
import { supabase } from "@/lib/supabase";

function StatusBadge({ status }: { status: string | null }) {
  const isOk = status === "Active" || status === "Online";
  return (
    <Badge
      className={`border-none shadow-none font-medium text-xs ${
        isOk
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${
          isOk ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {status ?? "Unknown"}
    </Badge>
  );
}

interface TrapReportDropdownProps {
  device: OvitrapDevice;
  onPostRequest: (device: OvitrapDevice) => void;
  onViewLocation: (device: OvitrapDevice) => void;
}

interface StatusMeta {
  label: string;
  badge: string;
  dot: string;
}

const DEFAULT_STATUS_META: StatusMeta = {
  label: "Offline",
  badge: "bg-slate-100 text-slate-700 border-slate-200",
  dot: "bg-slate-400",
};

const STATUS_STYLES: Record<string, StatusMeta> = {
  Online: {
    label: "Online",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  Active: {
    label: "Active",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Unreachable: {
    label: "Unreachable",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  Maintenance: {
    label: "Maintenance",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  Offline: DEFAULT_STATUS_META,
};

const ACTION_STATUS_BADGES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-sky-50 text-sky-700 border-sky-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Declined: "bg-rose-50 text-rose-700 border-rose-200",
  Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

export function getTrapDangerLevel(
  count: number | null | undefined,
  consecutiveCriticalDays = 0,
): {
  level: "Low" | "Moderate" | "High" | "Critical" | "No Data";
  label: string;
  badge: string;
  barColor: string;
} {
  if (count == null) {
    return {
      level: "No Data",
      label: "No Readings",
      badge: "bg-slate-100 text-slate-600 border-slate-200",
      barColor: "bg-slate-300",
    };
  }
  const level = getDangerTier(count, consecutiveCriticalDays);
  if (level === "Critical") {
    return {
      level: "Critical",
      label: "Critical Danger (30+, 3 days)",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      barColor: "bg-rose-500",
    };
  }
  if (level === "High") {
    return {
      level: "High",
      label: count >= 30 ? "High Danger (30+, needs 3 days)" : "High Danger (16-29)",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
      barColor: "bg-orange-500",
    };
  }
  if (level === "Moderate") {
    return {
      level: "Moderate",
      label: "Moderate Danger (6-15)",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      barColor: "bg-amber-500",
    };
  }
  return {
    level: "Low",
    label: "Low Risk (0-5)",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    barColor: "bg-emerald-500",
  };
}

export default function TrapReportDropdown({
  device,
  onPostRequest,
  onViewLocation,
}: TrapReportDropdownProps) {
  const [readings, setReadings] = useState<DeviceReadingSummary[]>([]);
  const [requests, setRequests] = useState<TrapRequest[]>([]);
  const [triageRequests, setTriageRequests] = useState<TrapActionLogEntry[]>([]);
  const [mosquitoStats, setMosquitoStats] = useState<DeviceMosquitoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reports" | "actions" | "specs">("reports");
  const [error, setError] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  const loadTrapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [readingsData, requestsData, triageRequestsData, statsData] = await Promise.all([
        getDeviceReadings(device.id, 50),
        fetchTrapRequestsByDevice(device.id),
        fetchTriageRequestsByDevice(device.barangay_id, device.device_code),
        getDeviceMosquitoStats(device.id),
      ]);
      setReadings(readingsData);
      setRequests(requestsData);
      setTriageRequests(triageRequestsData);
      setMosquitoStats(statsData);
    } catch (err) {
      console.error(`Failed to load reports for trap ${device.device_code}:`, err);
      setError("Failed to load telemetry reports for this trap.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrapData();

    // Subscribe to realtime updates on readings and requests for this specific trap
    const channel = supabase
      .channel(`trap_dropdown_realtime_${device.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovitrap_readings",
          filter: `device_id=eq.${device.id}`,
        },
        () => {
          loadTrapData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_actions",
          filter: `device_id=eq.${device.id}`,
        },
        () => {
          loadTrapData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_triage_log",
          ...(device.barangay_id ? { filter: `barangay_id=eq.${device.barangay_id}` } : {}),
        },
        () => {
          loadTrapData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [device.id, device.barangay_id, device.device_code]);

  const latestReading = readings[0] ?? null;

  // Calculate Today's Cumulative Mosquito Count from ovitrap_readings
  const todayReadings = readings.filter((r) =>
    isSameLocalDay(r.captured_at || r.created_at || "")
  );
  const fallbackTodaySum = todayReadings.reduce(
    (acc, r) => acc + (r.mosquito_count ?? 0),
    0
  );
  const effectiveTodayPings = mosquitoStats ? mosquitoStats.todayPingsCount : todayReadings.length;

  // The primary count to display: today's sum from ovitrap_readings (or device today/latest count fallback)
  const displayMosquitoCount = mosquitoStats
    ? mosquitoStats.todaySum
    : device.today_mosquito_count ?? fallbackTodaySum;

  const danger = getTrapDangerLevel(
    displayMosquitoCount,
    device.consecutive_critical_days,
  );

  // Compute live connection status
  const latestTimestamp =
    latestReading?.captured_at || latestReading?.created_at || device.last_seen_at;
  const isOnline = latestTimestamp
    ? Date.now() - new Date(latestTimestamp).getTime() <= 16 * 60 * 1000
    : false;

  const realStatus = Array.isArray(device.device_statuses)
    ? (device.device_statuses as any)[0]?.status_name
    : device.device_statuses?.status_name;

  let computedConnection = "Offline";
  if (realStatus === "Maintenance") {
    computedConnection = "Maintenance";
  } else if (isOnline) {
    computedConnection = "Online";
  } else {
    computedConnection = "Offline";
  }

  const statusMeta: StatusMeta =
    STATUS_STYLES[computedConnection] ?? DEFAULT_STATUS_META;

  // Best available sensor values across readings (in case single ping has sparse fields)
  const latestTemp =
    readings.find((r) => r.temperature_c != null)?.temperature_c ??
    latestReading?.temperature_c ??
    null;
  const latestHumidity =
    readings.find((r) => r.humidity_percent != null)?.humidity_percent ??
    latestReading?.humidity_percent ??
    null;
  const latestBattery =
    readings.find((r) => r.battery_level != null)?.battery_level ??
    latestReading?.battery_level ??
    null;
  const latestImage =
    readings.find((r) => !!r.image_path)?.image_path ??
    latestReading?.image_path ??
    null;

  // Activity trend (oldest to newest)
  const reversedReadings = useMemo(() => [...readings].reverse(), [readings]);
  const maxMosquitoCount = useMemo(() => {
    const counts = readings.map((r) => r.mosquito_count ?? 0);
    return Math.max(1, ...counts);
  }, [readings]);

  const requestLogEntries = useMemo(() => [
    ...requests.map((request) => ({
      id: request.req_id,
      type: request.request,
      priority: null as string | null,
      status: request.status || "Pending",
      created_at: request.created_at,
      due_date: request.due_date,
      details: [request.descriptions, request.notes, request.remarks]
        .filter(Boolean)
        .join(" | "),
    })),
    ...triageRequests.map((request) => ({
      id: request.id,
      type: request.trigger_source,
      priority: request.priority,
      status: request.status,
      created_at: request.created_at,
      due_date: request.due_date,
      details: request.remarks?.split(" | ").slice(1).join(" | ") ?? "",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [requests, triageRequests]);

  const hasLocation = device.latitude != null && device.longitude != null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 animate-in fade-in-50 duration-200">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Trap Data & Field Reports
            </span>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {device.device_code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                statusMeta.badge
              )}
            >
              <span className={cn("size-1.5 rounded-full", statusMeta.dot)} />
              {statusMeta.label}
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                danger.badge
              )}
            >
              {danger.level === "Critical" || danger.level === "High" ? (
                <ShieldAlert className="size-3 text-current" />
              ) : (
                <ShieldCheck className="size-3 text-current" />
              )}
              {danger.label}
            </span>

            {latestTimestamp && (
              <span className="text-[11px] text-slate-400 font-medium">
                Last Ping: {formatRelativeTime(latestTimestamp)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTrapData}
            disabled={loading}
            className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-800"
            title="Refresh reports for this trap"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>

          {hasLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLocation(device)}
              className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <MapPin className="size-3.5 text-emerald-600" />
              Map View
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => onPostRequest(device)}
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <Send className="size-3.5" />
            Post Request Action
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
            activeTab === "reports"
              ? "bg-emerald-50 text-emerald-800 font-bold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Activity className="size-3.5" />
          <span>Trap Data Readings</span>
          <span className="rounded-full bg-slate-200/70 px-1.5 py-0.2 text-[10px] text-slate-700 font-bold">
            {readings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
            activeTab === "actions"
              ? "bg-emerald-50 text-emerald-800 font-bold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Send className="size-3.5" />
          <span>Trap Request Log</span>
          <span className="rounded-full bg-slate-200/70 px-1.5 py-0.2 text-[10px] text-slate-700 font-bold">
            {requestLogEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
            activeTab === "specs"
              ? "bg-emerald-50 text-emerald-800 font-bold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Cpu className="size-3.5" />
          <span>Device Info & Location</span>
        </button>
      </div>

      {/* Tab 1: Telemetry Reports */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {loading && readings.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-slate-100 border border-slate-200"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
              {error}
            </div>
          ) : !latestReading ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No telemetry readings recorded for this trap yet.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Once the IoT device transmits data to ovitrap_readings, live metrics and trends will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Stat Cards from Real IoT Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Mosquito Count Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <Bug className="size-3.5 text-emerald-600" />
                      Today Count
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        danger.badge
                      )}
                    >
                      {danger.level}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {displayMosquitoCount}{" "}
                    <span className="text-sm font-semibold text-slate-500">mosq</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {effectiveTodayPings > 0
                      ? `${effectiveTodayPings} pings today (Latest: ${mosquitoStats?.latestCount ?? latestReading?.mosquito_count ?? 0})`
                      : latestReading
                      ? `Captured ${formatRelativeTime(latestReading.captured_at)}`
                      : "No readings"}
                  </p>
                </div>

                {/* Battery Level Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <BatteryMedium className="size-3.5 text-sky-600" />
                    Battery Health
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {latestBattery != null ? `${latestBattery}%` : "—"}
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        latestBattery == null
                          ? "bg-slate-300"
                          : latestBattery > 40
                          ? "bg-emerald-500"
                          : latestBattery > 20
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, latestBattery ?? 0))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Temperature Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Thermometer className="size-3.5 text-orange-500" />
                    Ambient Temp
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {latestTemp != null ? `${latestTemp}°C` : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {latestTemp != null
                      ? latestTemp >= 32
                        ? "High ambient heat"
                        : latestTemp >= 24
                        ? "Optimal range"
                        : "Cool condition"
                      : "Thermal sensor"}
                  </p>
                </div>

                {/* Humidity Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Droplets className="size-3.5 text-indigo-500" />
                    Humidity
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {latestHumidity != null ? `${latestHumidity}%` : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Relative moisture
                  </p>
                </div>
              </div>

              {/* Optional Camera Capture Preview if image_path exists */}
              {latestImage && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Camera className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Camera Snapshot Available
                      </p>
                      <p className="text-[11px] text-slate-400">
                        High-resolution mosquito optical capture stored on server
                      </p>
                    </div>
                  </div>
                  <a
                    href={latestImage}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                  >
                    View Snapshot
                  </a>
                </div>
              )}

              {/* Sparkline / Bar Trend Visualisation */}
              {reversedReadings.length > 1 && (
                <div className="rounded-xl bg-slate-50/60 p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Telemetry Catch Trend (Last {reversedReadings.length} Pings)
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Max: {maxMosquitoCount} mosquitoes
                    </span>
                  </div>

                  <div className="flex h-20 items-end gap-1.5 pt-2">
                    {reversedReadings.map((r) => {
                      const count = r.mosquito_count ?? 0;
                      const heightPct = Math.max(10, (count / maxMosquitoCount) * 100);
                      const isHigh = count >= 16;
                      const isMed = count >= 6;

                      return (
                        <div
                          key={r.id}
                          className="group relative flex-1 flex flex-col items-center h-full justify-end"
                        >
                          {/* Tooltip on Hover */}
                          <div className="pointer-events-none absolute -top-9 z-10 hidden group-hover:flex flex-col items-center whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg">
                            <span className="font-bold">{count} mosquitoes</span>
                            <span className="text-slate-400 text-[9px]">
                              {formatRelativeTime(r.captured_at)}
                            </span>
                          </div>

                          <div
                            className={cn(
                              "w-full rounded-t transition-all",
                              isHigh
                                ? "bg-rose-500 hover:bg-rose-600"
                                : isMed
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-emerald-500/80 hover:bg-emerald-600"
                            )}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Telemetry Readings Table (Based on ovitrap_readings, styled like Trap Data Overview TelemetryTable) */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recent Reading Log
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-medium">
                      {readings.length} {readings.length === 1 ? "packet" : "packets"}
                    </span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-500">
                    Real data from ovitrap_readings • Click row to inspect raw payload
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-xs">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-semibold text-slate-600 text-xs">Timestamp</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Trap ID</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Barangay</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Mosquito Count</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Temp (°C)</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Humidity (%)</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Battery (%)</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs">Device Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-12 text-center text-slate-500"
                          >
                            <div className="max-w-md mx-auto space-y-2">
                              <p className="font-semibold text-slate-700">
                                No telemetry packets have been received yet.
                              </p>
                              <p className="text-xs text-slate-500">
                                Power on this Smart Ovi Trap to transmit readings to ovitrap_readings.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        readings.map((r) => {
                          const payloadRecord = {
                            id: r.id,
                            device_id: r.device_id ?? device.id,
                            device_code: device.device_code,
                            barangay_name: device.barangays?.barangay_name ?? null,
                            captured_at: r.captured_at,
                            created_at: r.created_at ?? r.captured_at,
                            updated_at: r.updated_at ?? null,
                            mosquito_count: r.mosquito_count ?? 0,
                            temperature_c: r.temperature_c,
                            humidity_percent: r.humidity_percent,
                            battery_level: r.battery_level,
                            image_path: r.image_path ?? null,
                            status_name: computedConnection,
                          };

                          return (
                            <TableRow
                              key={r.id}
                              className="cursor-pointer hover:bg-slate-50 border-slate-100 transition-colors"
                              onClick={() => setSelectedPayload(payloadRecord)}
                            >
                              <TableCell className="font-mono text-slate-600 font-medium whitespace-nowrap text-xs">
                                {formatTelemetryTimestamp(r.created_at || r.captured_at)}
                              </TableCell>
                              <TableCell className="font-bold text-slate-800 text-xs">
                                {device.device_code}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs">
                                {device.barangays?.barangay_name ?? "—"}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800 text-xs">
                                {r.mosquito_count ?? 0}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs">
                                {r.temperature_c != null ? `${r.temperature_c}°C` : "—"}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs">
                                {r.humidity_percent != null ? `${r.humidity_percent}%` : "—"}
                              </TableCell>
                              <TableCell className="text-slate-600 text-xs">
                                {r.battery_level != null ? `${r.battery_level}%` : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                <StatusBadge status={computedConnection} />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Trap Request Log from request_actions */}
      {activeTab === "actions" && (
        <div className="space-y-3">
          {loading && requests.length === 0 ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 border border-slate-200"
                />
              ))}
            </div>
          ) : requestLogEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No action requests currently logged for this trap.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can submit a pick-up, inspection, clean-up drive, or misting request directly for this trap.
              </p>
              <Button
                size="sm"
                onClick={() => onPostRequest(device)}
                className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="size-3 mr-1.5" />
                Post Request Action
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 overflow-hidden">
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Field Requests for {device.device_code}</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Pickup, deployment, and field action requests
                </span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Request Type</th>
                    <th className="text-left font-semibold px-4 py-2.5">Priority</th>
                    <th className="text-left font-semibold px-4 py-2.5">Status</th>
                    <th className="text-left font-semibold px-4 py-2.5">Date Requested</th>
                    <th className="text-left font-semibold px-4 py-2.5">Due Date</th>
                    <th className="text-left font-semibold px-4 py-2.5">Details & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requestLogEntries.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {act.type}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {act.priority ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            ACTION_STATUS_BADGES[act.status] ||
                              "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {formatTelemetryTimestamp(act.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {act.due_date || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-xs break-words">
                        {act.details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Device Info & Location */}
      {activeTab === "specs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Deployment Metadata
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Barangay</span>
                <span className="font-medium text-slate-800">
                  {device.barangays?.barangay_name ?? "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Municipality</span>
                <span className="font-medium text-slate-800">
                  {device.barangays?.municipality ?? "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">GPS Coordinates</span>
                <span className="font-mono text-slate-800">
                  {hasLocation
                    ? `${Number(device.latitude).toFixed(5)}, ${Number(device.longitude).toFixed(5)}`
                    : "Not georeferenced"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Deployed By</span>
                <span className="font-medium text-slate-800">
                  {[device.users?.first_name, device.users?.last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Installation Date</span>
                <span className="font-medium text-slate-800">
                  {device.installation_date
                    ? new Date(device.installation_date).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Hardware & Notes
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Trap ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {device.device_code}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Serial Number</span>
                <span className="font-mono text-slate-800">
                  {device.serial_number ?? "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Operational Status</span>
                <span className="font-medium text-slate-800">
                  {device.operational_status ?? "Deployed"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Connection</span>
                <span className="font-medium text-slate-800">
                  {statusMeta.label}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block mb-1">Notes / Description:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 text-xs">
                  {device.description || device.notes || "No extra notes logged for this device."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Record (Raw JSON) Dialog - matches Trap Data Overview */}
      <Dialog
        open={!!selectedPayload}
        onOpenChange={(open) => !open && setSelectedPayload(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              Database Record (Raw JSON)
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-900 rounded-md p-4 overflow-x-auto mt-2">
            <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
              {selectedPayload && JSON.stringify(selectedPayload, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
