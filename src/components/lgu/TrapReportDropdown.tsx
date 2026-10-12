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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getDeviceReadings,
  type DeviceReadingSummary,
} from "@/services/telemetry.service";
import { getActionsByDeviceId } from "@/services/triage.service";
import type { TriageAction } from "@/types/triage.types";
import { formatRelativeTime, formatTelemetryTimestamp } from "@/utils/dateHelpers";
import { cn } from "@/lib/utils";

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
  badge: "bg-rose-50 text-rose-700 border-rose-200",
  dot: "bg-rose-500",
};

const STATUS_STYLES: Record<string, StatusMeta> = {
  Online: {
    label: "Online",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
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

const PRIORITY_BADGES: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-rose-50 text-rose-700 border-rose-200",
};

const ACTION_STATUS_BADGES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-sky-50 text-sky-700 border-sky-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Dismissed: "bg-slate-100 text-slate-600 border-slate-200",
};

export function getTrapDangerLevel(count: number | null | undefined): {
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
  if (count >= 30) {
    return {
      level: "Critical",
      label: "Critical Danger",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      barColor: "bg-rose-500",
    };
  }
  if (count >= 15) {
    return {
      level: "High",
      label: "High Danger",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
      barColor: "bg-orange-500",
    };
  }
  if (count >= 5) {
    return {
      level: "Moderate",
      label: "Moderate Danger",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      barColor: "bg-amber-500",
    };
  }
  return {
    level: "Low",
    label: "Low Risk",
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
  const [actions, setActions] = useState<TriageAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reports" | "actions" | "specs">("reports");
  const [error, setError] = useState<string | null>(null);

  const loadTrapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [readingsData, actionsData] = await Promise.all([
        getDeviceReadings(device.id, 14),
        getActionsByDeviceId(device.id),
      ]);
      setReadings(readingsData);
      setActions(actionsData);
    } catch (err) {
      console.error(`Failed to load reports for trap ${device.device_code}:`, err);
      setError("Failed to load telemetry reports for this trap.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrapData();
  }, [device.id]);

  const latestReading = readings[0] ?? null;
  const mosquitoCount = latestReading?.mosquito_count ?? device.latest_mosquito_count;
  const danger = getTrapDangerLevel(mosquitoCount);

  const connectionStatus =
    (device as any).connection_status ||
    device.device_statuses?.status_name ||
    "Offline";
  const statusMeta: StatusMeta =
    (connectionStatus && STATUS_STYLES[connectionStatus]) ?? DEFAULT_STATUS_META;

  // Sparkline calculation
  const reversedReadings = useMemo(() => [...readings].reverse(), [readings]);
  const maxMosquitoCount = useMemo(() => {
    const counts = readings.map((r) => r.mosquito_count ?? 0);
    return Math.max(1, ...counts);
  }, [readings]);

  const hasLocation = device.latitude != null && device.longitude != null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 animate-in fade-in-50 duration-200">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Trap Telemetry & Field Reports
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
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
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
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
          <span>Telemetry Reports</span>
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
          <span>Request Actions Log</span>
          <span className="rounded-full bg-slate-200/70 px-1.5 py-0.2 text-[10px] text-slate-700 font-bold">
            {actions.length}
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
          {loading ? (
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
                Once the sensor reports telemetry via IoT, readings and trends will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Mosquito Count Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <Bug className="size-3.5 text-emerald-600" />
                      Mosquito Count
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
                    {latestReading.mosquito_count != null
                      ? latestReading.mosquito_count
                      : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Captured {formatRelativeTime(latestReading.captured_at)}
                  </p>
                </div>

                {/* Battery Level Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <BatteryMedium className="size-3.5 text-sky-600" />
                    Battery Health
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {latestReading.battery_level != null
                      ? `${latestReading.battery_level}%`
                      : "—"}
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        (latestReading.battery_level ?? 100) > 40
                          ? "bg-emerald-500"
                          : (latestReading.battery_level ?? 100) > 20
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, latestReading.battery_level ?? 0))}%`,
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
                    {latestReading.temperature_c != null
                      ? `${latestReading.temperature_c}°C`
                      : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Thermal condition</p>
                </div>

                {/* Humidity Card */}
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <Droplets className="size-3.5 text-indigo-500" />
                    Humidity
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {latestReading.humidity_percent != null
                      ? `${latestReading.humidity_percent}%`
                      : "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {latestReading.ai_confidence != null
                      ? `AI Conf: ${(latestReading.ai_confidence * 100).toFixed(0)}%`
                      : "Relative moisture"}
                  </p>
                </div>
              </div>

              {/* Sparkline Visualisation */}
              {reversedReadings.length > 1 && (
                <div className="rounded-xl bg-slate-50/60 p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Catch Activity Trend (Last {reversedReadings.length} Reports)
                    </span>
                    <span className="text-xs text-slate-400">
                      Max: {maxMosquitoCount} mosquitoes
                    </span>
                  </div>

                  <div className="flex h-20 items-end gap-1.5 pt-2">
                    {reversedReadings.map((r) => {
                      const count = r.mosquito_count ?? 0;
                      const heightPct = Math.max(8, (count / maxMosquitoCount) * 100);
                      const isHigh = count >= 15;
                      const isMed = count >= 5;

                      return (
                        <div
                          key={r.id}
                          className="group relative flex-1 flex flex-col items-center h-full justify-end"
                        >
                          {/* Tooltip on Hover */}
                          <div className="pointer-events-none absolute -top-8 z-10 hidden group-hover:flex flex-col items-center whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg">
                            <span>{count} mosquitoes</span>
                            <span className="text-slate-400">
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

              {/* Recent Readings Table */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Recent Reading Log
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="text-left font-semibold px-4 py-2">Timestamp</th>
                        <th className="text-left font-semibold px-4 py-2">Mosquito Count</th>
                        <th className="text-left font-semibold px-4 py-2">Temp</th>
                        <th className="text-left font-semibold px-4 py-2">Humidity</th>
                        <th className="text-left font-semibold px-4 py-2">Battery</th>
                        <th className="text-left font-semibold px-4 py-2">AI Conf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {readings.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2 font-mono text-slate-600 whitespace-nowrap">
                            {formatTelemetryTimestamp(r.captured_at)}
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-800">
                            {r.mosquito_count ?? 0}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {r.temperature_c != null ? `${r.temperature_c}°C` : "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {r.humidity_percent != null ? `${r.humidity_percent}%` : "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {r.battery_level != null ? `${r.battery_level}%` : "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {r.ai_confidence != null
                              ? `${(r.ai_confidence * 100).toFixed(0)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Action Requests Log */}
      {activeTab === "actions" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 border border-slate-200"
                />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No action requests logged for this trap.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can submit a dispatch or intervention command directly for this active node.
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
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Request Type</th>
                    <th className="text-left font-semibold px-4 py-2.5">Priority</th>
                    <th className="text-left font-semibold px-4 py-2.5">Status</th>
                    <th className="text-left font-semibold px-4 py-2.5">Assigned Date</th>
                    <th className="text-left font-semibold px-4 py-2.5">Remarks / Directive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {act.triggerSource}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            PRIORITY_BADGES[act.priority] || "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {act.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            ACTION_STATUS_BADGES[act.status] || "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {act.assignedDate || formatRelativeTime(act.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-xs break-words">
                        {act.remarks || "—"}
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
                <span className="text-slate-500">Device ID</span>
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
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-slate-800">
                  {device.device_statuses?.status_name ?? "Unknown"}
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
    </div>
  );
}
