import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BatteryLow,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Network,
  Wifi,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/utils/navigation";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import { formatDateTime, formatVoltage } from "@/utils/format";

// ─── Priority badge styles ───────────────────────────────────────────────────
const priorityConfig = {
  High: {
    pill: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  Med: {
    pill: "bg-amber-100 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  Low: {
    pill: "bg-sky-100 text-sky-700 border border-sky-200",
    dot: "bg-sky-400",
  },
} as const;

// ─── Custom tooltip for Recharts ─────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { fullDate: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  const fullDate = item.payload?.fullDate;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-950">
        {label} {fullDate ? `(${fullDate})` : ""}
      </p>
      <p className="text-emerald-600 font-medium">
        {item.value} {item.value === 1 ? "mosquito" : "mosquitoes"} detected
      </p>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = "emerald",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  accent?: "emerald" | "amber" | "sky" | "slate";
}) {
  const accentMap = {
    emerald: {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    },
    amber: {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    },
    sky: {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      bar: "bg-sky-500",
    },
    slate: {
      badge: "border-slate-200 bg-slate-50 text-slate-700",
      bar: "bg-slate-400",
    },
  }[accent];

  return (
    <Card className="relative overflow-hidden border-slate-200 bg-white shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute left-0 top-0 h-1 w-full ${accentMap.bar}`} />
      <CardContent className="flex items-start gap-4 p-5 pt-6">
        <div className={`rounded-2xl border p-3 ${accentMap.badge}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile } = useAuth();
  const {
    counts,
    deviceMap,
    devices,
    latestReadingsByDevice,
    recentReadings,
    weeklyReadings,
    triageActions,
    activeAccountsQuery,
    devicesQuery,
    recentReadingsQuery,
    triageActionsQuery,
    telemetryRateQuery,
    weeklyReadingsQuery,
    telemetry24hQuery,
  } = useAdminDashboardData();

  const loading =
    activeAccountsQuery.isLoading ||
    devicesQuery.isLoading ||
    recentReadingsQuery.isLoading ||
    triageActionsQuery.isLoading ||
    telemetryRateQuery.isLoading ||
    weeklyReadingsQuery.isLoading ||
    telemetry24hQuery.isLoading;

  const errorMessage =
    activeAccountsQuery.error?.message ||
    devicesQuery.error?.message ||
    recentReadingsQuery.error?.message ||
    triageActionsQuery.error?.message ||
    telemetryRateQuery.error?.message ||
    weeklyReadingsQuery.error?.message ||
    telemetry24hQuery.error?.message ||
    null;

  // Derive real-time pending triage actions based on trap levels (High, Med, Low)
  const computedPendingActions = useMemo(() => {
    const list: {
      id: string;
      priority: "High" | "Med" | "Low";
      task: string;
      meta: string;
      status: string;
      sortOrder: number;
    }[] = [];

    // 1. Process explicit triage actions from action_triage_log if present
    if (triageActions && triageActions.length > 0) {
      for (const action of triageActions) {
        const p: "High" | "Med" | "Low" =
          action.priority === "Critical" || action.priority === "High"
            ? "High"
            : action.priority === "Medium"
            ? "Med"
            : "Low";

        const devCode = action.device?.device_code;
        const taskText = action.trigger_source
          ? action.trigger_source
          : devCode
          ? `Triage alert on ${devCode}`
          : "System triage alert";

        list.push({
          id: `action-${action.id}`,
          priority: p,
          task: taskText,
          meta: action.due_date ? `Due: ${action.due_date}` : "Due: Today",
          status: action.status || "Pending Assignment",
          sortOrder: p === "High" ? 1 : p === "Med" ? 2 : 3,
        });
      }
    }

    // 2. Classify traps by level (High, Med, Low) from real telemetry readings
    for (const device of devices) {
      const reading = latestReadingsByDevice.get(device.id);
      const code = device.device_code || `TRAP-${device.id.slice(0, 4)}`;
      const count = reading?.mosquito_count ?? reading?.egg_count ?? 0;
      const battery = reading?.battery_level ?? null;

      if (count >= 30) {
        list.push({
          id: `trap-high-${device.id}`,
          priority: "High",
          task: `Inspect ${code}: High vector detection (${count} mosquitoes)`,
          meta: "Due: Today",
          status: "Requires Field Inspection",
          sortOrder: 1,
        });
      } else if (battery !== null && battery < 3.4) {
        list.push({
          id: `trap-bat-${device.id}`,
          priority: "High",
          task: `Critical Battery: ${code} (${formatVoltage(battery)})`,
          meta: "Due: Today",
          status: "Low Voltage Alert",
          sortOrder: 1,
        });
      } else if (count >= 10) {
        list.push({
          id: `trap-med-${device.id}`,
          priority: "Med",
          task: `Monitor ${code}: Moderate detection (${count} mosquitoes)`,
          meta: "Due: Routine",
          status: "Elevated Activity",
          sortOrder: 2,
        });
      } else {
        list.push({
          id: `trap-low-${device.id}`,
          priority: "Low",
          task: `Routine Check: ${code} (${count} mosquitoes)`,
          meta: "Status: Normal",
          status: "Baseline Active",
          sortOrder: 3,
        });
      }
    }

    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [triageActions, devices, latestReadingsByDevice]);

  const latestTelemetry = useMemo(() => {
    return recentReadings.map((reading) => {
      const device = deviceMap.get(reading.device_id);
      return {
        ...reading,
        deviceCode: device?.device_code ?? reading.device_id,
      };
    });
  }, [deviceMap, recentReadings]);

  // Compute 7-day trend from real readings
  const trendData = useMemo(() => {
    const days: { day: string; dateKey: string; count: number; fullDate: string }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const fullDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ day: dayName, dateKey, count: 0, fullDate });
    }

    const dayMap = new Map(days.map((item) => [item.dateKey, item]));

    let todayCount = 0;
    const todayDateKey = days[days.length - 1]?.dateKey;

    for (const r of weeklyReadings) {
      if (!r.captured_at) continue;
      const rDate = new Date(r.captured_at);
      const rKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, "0")}-${String(rDate.getDate()).padStart(2, "0")}`;
      const target = dayMap.get(rKey);
      if (target) {
        target.count += r.mosquito_count ?? 0;
      }
      if (rKey === todayDateKey) {
        todayCount += r.mosquito_count ?? 0;
      }
    }

    const weeklyTotal = days.reduce((sum, item) => sum + item.count, 0);
    const dailyAverage = (weeklyTotal / 7).toFixed(1);

    let peakDay = "—";
    let maxCount = 0;
    for (const d of days) {
      if (d.count > maxCount) {
        maxCount = d.count;
        peakDay = d.day;
      }
    }

    return {
      trend: days,
      todayCount,
      weeklyTotal,
      dailyAverage,
      peakDay,
      peakCount: maxCount,
    };
  }, [weeklyReadings]);

  return (
    <div className="space-y-6">
      {/* ── Clean flat header ────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 pb-5">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <LayoutDashboard className="size-3" />
          IoT Command Center
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          MosquiTrack Overview
        </h1>

        <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
          {profile
            ? `Welcome back, ${profile.first_name}. Monitor node uptime, detection events, and hardware alerts.`
            : "Monitor node uptime, detection events, and hardware alerts from a single operations view."}
        </p>
      </section>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div>
        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Wifi}
            label="Active Nodes"
            value={
              loading
                ? "—"
                : `${counts.onlineNodes} of ${counts.registeredNodes} Online`
            }
            detail="Nodes seen within the last 15 min."
            accent="emerald"
          />

          <MetricCard
            icon={Activity}
            label="Mosquitoes Detected Today"
            value={loading ? "—" : `${trendData.todayCount}`}
            detail="Cumulative count across all traps."
            accent="sky"
          />

          <MetricCard
            icon={BarChart3}
            label="Telemetry Packets 24h"
            value={loading ? "—" : `${counts.telemetry24h}`}
            detail="Packets received in the last 24 hours."
            accent="slate"
          />

          <MetricCard
            icon={BatteryLow}
            label="Hardware Alerts"
            value={
              loading
                ? "—"
                : counts.lowBatteryNodes === 0
                ? "0 Critical"
                : `${counts.lowBatteryNodes} Critical`
            }
            detail="Low-battery nodes below 3.40 V."
            accent={counts.lowBatteryNodes > 0 ? "amber" : "slate"}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Live feeds row ─────────────────────────────────────────────────── */}
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Recent telemetry feed */}
          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Activity className="size-4" />
                </div>
                <div>
                  <CardTitle>Recent telemetry feed</CardTitle>
                  <CardDescription className="mt-0.5">
                    Live raw packets received from deployed ovitraps.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto max-h-[340px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50">
                    <TableHead className="font-semibold text-slate-600 text-xs py-3 pl-5">TRAP NODE</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs py-3">COUNT</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs py-3">BATTERY</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs py-3 pr-5 text-right">CAPTURED</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {latestTelemetry.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-12 text-center text-slate-500"
                      >
                        No telemetry rows available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestTelemetry.map((reading) => (
                      <TableRow key={reading.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-medium text-slate-950 py-3.5 pl-5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                            {reading.deviceCode}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                            {reading.mosquito_count ?? reading.egg_count ?? 0}
                            <span className="text-xs font-normal text-slate-400">pcs</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {reading.battery_level !== null &&
                          reading.battery_level < 3.4 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-medium text-rose-700">
                              <BatteryLow className="size-3 text-rose-600" />
                              {formatVoltage(reading.battery_level)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              {formatVoltage(reading.battery_level)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 pr-5 text-right whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(reading.captured_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="border-t border-slate-100 p-4">
              <Button asChild variant="outline" size="sm" className="w-full justify-between rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700">
                <Link to={ROUTES.admin.telemetry}>
                  <span className="inline-flex items-center gap-2 text-xs font-medium">
                    <Activity className="size-3.5 text-emerald-600" />
                    Open raw telemetry hub
                  </span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Pending Triage Actions */}
          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <ClipboardList className="size-4" />
                </div>
                <div>
                  <CardTitle>Pending Triage Actions</CardTitle>
                  <CardDescription className="mt-0.5">
                    Actionable tasks generated from real-time trap triggers.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 divide-y divide-slate-100 p-0">
              {computedPendingActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <CheckCircle2 className="size-8 text-emerald-500 mb-2 opacity-80" />
                  <p className="text-sm font-medium text-slate-700">
                    No pending triage actions
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    All trap nodes are reporting normal baseline metrics.
                  </p>
                </div>
              ) : (
                computedPendingActions.slice(0, 4).map((action) => {
                  const cfg = priorityConfig[action.priority] || priorityConfig.Low;
                  return (
                    <div
                      key={action.id}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80"
                    >
                      {/* Priority badge */}
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${cfg.pill}`}
                      >
                        <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                        {action.priority}
                      </span>

                      {/* Task body */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {action.task}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {action.meta}
                          <span className="mx-1.5 text-slate-300">·</span>
                          {action.status}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── 7-Day Detection Trend bar chart ────────────────────────────────── */}
        <section>
          <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="size-4 text-emerald-600" />
                    7-Day Detection Trend
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Daily mosquito detection counts across all active trap nodes
                    over the past week.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
                >
                  Last 7 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={trendData.trend}
                  margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(16,185,129,0.06)", radius: 8 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* summary strip */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Peak Day
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {trendData.peakDay}
                  </p>
                  <p className="text-xs text-slate-500">
                    {trendData.peakCount > 0
                      ? `${trendData.peakCount} detections`
                      : "No detections"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Weekly Total
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {trendData.weeklyTotal}
                  </p>
                  <p className="text-xs text-slate-500">across all traps</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Daily Average
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {trendData.dailyAverage}
                  </p>
                  <p className="text-xs text-slate-500">mosquitoes / day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
