import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bug,
  ClipboardList,
  FileText,
  MapPinned,
  Minus,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLguDashboardData,
  type AlertTier,
  type BarangayMosquitoStatus,
} from "@/hooks/useLguDashboardData";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import { ROUTES } from "@/utils/navigation";

const TIER_STYLES: Record<
  AlertTier,
  { label: string; badge: string; dot: string; bar: string }
> = {
  green: {
    label: "Low",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  yellow: {
    label: "Moderate",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    dot: "bg-yellow-400",
    bar: "bg-yellow-400",
  },
  orange: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },
  red: {
    label: "Critical",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500 animate-pulse",
    bar: "bg-rose-500",
  },
};

const quickLinks = [
  {
    label: "Traps Reports and Request",
    description: "Review municipal trend recommendations.",
    href: ROUTES.lgu.trapActionRequests,
    icon: BarChart3,
  },
  {
    label: "Mosquito Trap Map",
    description: "Open the barangay-level spatial view.",
    href: ROUTES.lgu.trapMap,
    icon: MapPinned,
  },
  {
    label: "Trap Reports",
    description: "Export municipal summaries and case reports.",
    href: ROUTES.lgu.reports,
    icon: FileText,
  },
] as const;

function TierBadge({ tier }: { tier: AlertTier | null }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
        No data
      </span>
    );
  }
  const s = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ChangeIndicator({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const rounded = Math.round(changePct);
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
        <Minus className="size-3.5" /> 0%
      </span>
    );
  }
  const rising = rounded > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${rising ? "text-rose-600" : "text-emerald-600"}`}
    >
      {rising ? (
        <ArrowUpRight className="size-3.5" />
      ) : (
        <ArrowDownRight className="size-3.5" />
      )}
      {Math.abs(rounded)}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          <div className="mt-1 text-sm text-slate-500">{detail}</div>
        </div>
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function LguDashboard() {
  const { profile } = useAuth();
  const { data: metrics, isLoading } = useLguDashboardData();

  const tierCounts = metrics?.alertTierCounts ?? {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  };
  const barangayStatus: BarangayMosquitoStatus[] = metrics?.barangayStatus ?? [];
  const dailyTrend = metrics?.dailyTrend ?? [];
  const recentEscalations = metrics?.recentEscalations ?? [];

  const redCount = tierCounts.red;
  const orangeCount = tierCounts.orange;
  const highAlertCount = redCount + orangeCount;
  const totalTiered =
    tierCounts.green + tierCounts.yellow + tierCounts.orange + tierCounts.red;

  const avg3 = metrics?.dviAverage3Day ?? 0;
  const prev3 = metrics?.dviAveragePrev3Day ?? 0;
  const overallChange = prev3 > 0 ? ((avg3 - prev3) / prev3) * 100 : null;
  const actionMetrics = metrics as
    | {
        pendingActions?: number;
        inProgressActions?: number;
        completedActions?: number;
        cancelledActions?: number;
      }
    | undefined;
  const pendingActions = actionMetrics?.pendingActions ?? 0;
  const inProgressActions = actionMetrics?.inProgressActions ?? 0;
  const completedActions = actionMetrics?.completedActions ?? 0;
  const cancelledActions = actionMetrics?.cancelledActions ?? 0;

  const watchlist = barangayStatus.filter(
    (b) => b.tier === "red" || b.tier === "orange",
  );
  const risingBarangays = barangayStatus.filter(
    (b) => b.changePct !== null && b.changePct >= 25 && b.tier !== "red" && b.tier !== "orange",
  );

  const banner =
    redCount > 0
      ? {
          level: "Critical alert",
          text: `${redCount} barangay${redCount === 1 ? " is" : "s are"} at critical mosquito risk${orangeCount > 0 ? `, plus ${orangeCount} at high risk` : ""}. Coordinate field response immediately.`,
          style: "border-rose-200 bg-gradient-to-r from-rose-50 to-white text-rose-900",
          icon: Siren,
          iconStyle: "bg-rose-100 text-rose-600",
        }
      : orangeCount > 0
        ? {
            level: "High alert",
            text: `${orangeCount} barangay${orangeCount === 1 ? " is" : "s are"} at high mosquito risk. Prepare intervention and monitor closely.`,
            style: "border-orange-200 bg-gradient-to-r from-orange-50 to-white text-orange-900",
            icon: ShieldAlert,
            iconStyle: "bg-orange-100 text-orange-600",
          }
        : {
            level: "All clear",
            text: "No barangays are currently at high or critical mosquito risk.",
            style: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white text-emerald-900",
            icon: ShieldCheck,
            iconStyle: "bg-emerald-100 text-emerald-600",
          };
  const BannerIcon = banner.icon;

  const show = (v: string) => (isLoading ? "…" : v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            LGU Health Administrator
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent lg:text-4xl">
            Mosquito Surveillance Overview
          </h1>
          <p className="mt-1 text-slate-600">
            {profile ? `Welcome back, ${profile.first_name}. ` : ""}
            Track mosquito activity and get early warning on high-alert barangays.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700"
          >
            <Link to={ROUTES.lgu.trapMap}>
              <MapPinned className="mr-1 size-4" />
              Trap map
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full px-4">
            <Link to={ROUTES.lgu.reports}>
              <FileText className="mr-1 size-4" />
              Generate report
            </Link>
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      <div
        role="status"
        className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${banner.style}`}
      >
        <div className={`rounded-xl p-3 ${banner.iconStyle}`}>
          <BannerIcon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            {isLoading ? "Checking alert status…" : banner.level}
          </p>
          <p className="mt-0.5 text-sm font-medium sm:text-base">
            {isLoading ? "Loading latest risk assessments." : banner.text}
          </p>
        </div>
        {highAlertCount > 0 && (
          <Button asChild size="sm" variant="outline" className="hidden rounded-full sm:inline-flex">
            <Link to={ROUTES.lgu.reports}>
              Review <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Bug}
          label="Avg mosquito count (3-day)"
          value={show(Math.round(avg3).toString())}
          tone="bg-emerald-50 text-emerald-700"
          detail={
            <span className="inline-flex items-center gap-1.5">
              <ChangeIndicator changePct={overallChange} />
              <span>vs previous 3 days</span>
            </span>
          }
        />
        <KpiCard
          icon={Siren}
          label="Barangays on high alert"
          value={show(String(highAlertCount))}
          tone={
            highAlertCount > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-emerald-50 text-emerald-700"
          }
          detail={`${redCount} critical · ${orangeCount} high`}
        />
        <KpiCard
          icon={MapPinned}
          label="Barangays monitored"
          value={show(String(metrics?.barangaysMonitored ?? 0))}
          tone="bg-sky-50 text-sky-700"
          detail={`${risingBarangays.length} showing a rising trend`}
        />
        <KpiCard
  icon={ClipboardList}
  label="Response Actions"
  value=""
  tone="bg-amber-50 text-amber-700"
  detail={
    <div className="grid grid-cols-4 divide-x divide-gray-200 mt-2 w-full">
      <div className="min-w-0 text-center px-1">
        <p className="text-xs font-medium text-amber-700">Pending</p>
        <p className="text-lg font-bold">
          {show(String(pendingActions))}
        </p>
      </div>

      <div className="min-w-0 text-center px-1">
        <p className="text-xs font-medium text-blue-700">In Progress</p>
        <p className="text-lg font-bold">
          {show(String(inProgressActions))}
        </p>
      </div>

      <div className="min-w-0 text-center px-1">
        <p className="text-xs font-medium text-emerald-700">Completed</p>
        <p className="text-lg font-bold">
          {show(String(completedActions))}
        </p>
      </div>

      <div className="min-w-0 text-center px-1">
        <p className="text-xs font-medium text-red-700">Cancelled</p>
        <p className="text-lg font-bold">
          {show(String(cancelledActions))}
        </p>
      </div>
    </div>
  }
/>
      </section>

      {/* Trend + tier distribution */}
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Mosquito activity, last 7 days</CardTitle>
            <CardDescription>
              Daily average mosquito count across all monitored traps.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : dailyTrend.every((d) => d.readings === 0) ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No trap readings in the last 7 days.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyTrend}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="lguTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(v) => formatShortDate(String(v))}
                      formatter={(value) => [String(value), "Avg count"]}
                      contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#lguTrendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Risk level distribution</CardTitle>
            <CardDescription>Latest assessment per barangay.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {(["red", "orange", "yellow", "green"] as const).map((tier) => {
              const count = tierCounts[tier];
              const pct = totalTiered > 0 ? (count / totalTiered) * 100 : 0;
              const s = TIER_STYLES[tier];
              return (
                <div key={tier}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {show(String(count))}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Watchlist */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <CardTitle>Barangay watchlist</CardTitle>
            <CardDescription>
              Sorted by risk level, then by recent mosquito count. Trend compares the last 3
              days with the 3 days before.
            </CardDescription>
          </div>
          {watchlist.length > 0 && (
            <Badge variant="destructive" className="shrink-0">
              {watchlist.length} need attention
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-xs uppercase tracking-wide">Barangay</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Risk level</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Avg count (3d)</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Trend</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Last reading</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    Loading barangay data…
                  </TableCell>
                </TableRow>
              ) : barangayStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No monitored barangays found.
                  </TableCell>
                </TableRow>
              ) : (
                barangayStatus.slice(0, 10).map((b) => (
                  <TableRow
                    key={b.id}
                    className={
                      b.tier === "red"
                        ? "bg-rose-50/40"
                        : b.tier === "orange"
                          ? "bg-orange-50/40"
                          : ""
                    }
                  >
                    <TableCell className="font-medium text-slate-900">{b.name}</TableCell>
                    <TableCell>
                      <TierBadge tier={b.tier} />
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">
                      {b.avg3Day.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <ChangeIndicator changePct={b.changePct} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {b.lastReadingAt ? formatTelemetryTimestamp(b.lastReadingAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Escalations + quick links */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Recent alert escalations</CardTitle>
            <CardDescription>Barangays whose risk level recently increased.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Tier transition</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                      Loading escalation history…
                    </TableCell>
                  </TableRow>
                ) : recentEscalations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                      No recent escalations. Risk levels are stable.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentEscalations.map((item) => (
                    <TableRow key={`${item.barangay}-${item.timestamp}`}>
                      <TableCell className="font-medium text-slate-900">
                        {item.barangay}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.transition}</Badge>
                      </TableCell>
                      <TableCell>{formatTelemetryTimestamp(item.timestamp)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="h-auto justify-start rounded-2xl border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <Link to={item.href}>
                  <div className="flex w-full items-start gap-4">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-950">{item.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
