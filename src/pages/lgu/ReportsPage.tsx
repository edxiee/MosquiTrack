import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bug,
  Calendar,
  CheckCircle2,
  Download,
  Droplets,
  MapPin,
  Minus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { fetchEpidemiologicalReportData } from "@/services/reports.service";
import type {
  BarangayRiskTableRow,
  DateRangePreset,
  EpidemiologicalReportData,
  InterventionDistributionItem,
  VectorGrowthTrendPoint,
} from "@/types/reports.types";
import { getErrorMessage } from "@/utils/errorHelpers";

const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  quarter: "This Quarter",
};

function formatBarangayDisplay(name: string): string {
  const trimmed = name.trim();
  if (/^brgy\.?\s/i.test(trimmed)) return trimmed;
  return `Brgy. ${trimmed}`;
}

function getCategoryIcon(
  category: "Solution Misting" | "Clean-up Drive" | "Monitoring Personnel",
) {
  switch (category) {
    case "Solution Misting":
      return Droplets;
    case "Clean-up Drive":
      return Sparkles;
    case "Monitoring Personnel":
      return UserCheck;
  }
}

// ─── Custom Tooltip for Vector Growth AreaChart ──────────────────────────────
function VectorTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: VectorGrowthTrendPoint }>;
}) {
  if (!active || !payload?.length || !payload[0]) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-bold text-slate-900">{point.label}</span>
        <span className="text-[11px] font-mono text-slate-400">{point.date}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Confirmed Vectors:</span>
          <span className="font-bold text-emerald-700 text-sm tabular-nums">
            {point.mosquitoCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Daily Vector Index (DVI):</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {point.dvi.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Telemetry Packets:</span>
          <span className="font-medium text-slate-600 tabular-nums">
            {point.readingsCount}
          </span>
        </div>
      </div>

      {point.interventions.length > 0 && (
        <div className="border-t border-emerald-100 bg-emerald-50/70 -mx-3.5 -mb-3.5 px-3.5 py-2 rounded-b-xl space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Completed Interventions ({point.interventions.length})
          </p>
          {point.interventions.slice(0, 3).map((intv) => (
            <div
              key={intv.id}
              className="flex items-center justify-between gap-2 text-[11px] text-emerald-900"
            >
              <span className="font-semibold truncate">{intv.type}</span>
              <span className="text-emerald-700 shrink-0">
                {formatBarangayDisplay(intv.barangayName)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip for Intervention Donut Chart ─────────────────────────────
function InterventionPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: InterventionDistributionItem }>;
}) {
  if (!active || !payload?.length || !payload[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span className="font-bold text-slate-900">{item.category}</span>
      </div>
      <p className="text-slate-600">
        Total Tasks:{" "}
        <span className="font-bold text-slate-900">{item.count}</span> (
        {item.percentage}%)
      </p>
      <p className="text-emerald-600 font-medium">
        Completed / Approved: {item.completedCount}
      </p>
    </div>
  );
}

// ─── Risk Level Badge (using display_color from risk_levels) ─────────────────
function RiskLevelBadge({
  levelName,
  displayColor,
}: {
  levelName: string;
  displayColor: string;
}) {
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs"
      style={{
        backgroundColor: `${displayColor}15`,
        borderColor: `${displayColor}45`,
        color: displayColor,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: displayColor }}
      />
      {levelName}
    </Badge>
  );
}

// ─── 7-Day Trend Cell ────────────────────────────────────────────────────────
function Trend7DayBadge({ row }: { row: BarangayRiskTableRow }) {
  const pct = row.trend7DayPct;
  if (pct === null || pct === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        <Minus className="size-3" />
        <span>0% (Stable)</span>
      </div>
    );
  }

  const isRising = pct > 0;
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isRising
          ? "bg-rose-50 text-rose-700 border border-rose-200/70"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
      }`}
    >
      {isRising ? (
        <TrendingUp className="size-3.5 text-rose-600" />
      ) : (
        <TrendingDown className="size-3.5 text-emerald-600" />
      )}
      <span>
        {isRising ? `+${pct}%` : `${pct}%`}
      </span>
      <span className="text-[10px] font-normal opacity-75">
        ({row.recent7DayCount} vs {row.prev7DayCount})
      </span>
    </div>
  );
}

export default function ReportsAnalyticsPage() {
  const [selectedBarangay, setSelectedBarangay] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangePreset>("30d");
  const [reportData, setReportData] =
    useState<EpidemiologicalReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const res = await fetchEpidemiologicalReportData({
          barangayId: selectedBarangay,
          dateRange,
        });
        setReportData(res);
      } catch (err) {
        console.error("Failed to load epidemiological report data:", err);
        setError(
          getErrorMessage(
            err,
            "Failed to load epidemiological surveillance analytics.",
          ),
        );
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [selectedBarangay, dateRange],
  );

  useEffect(() => {
    loadData(true);

    // Subscribe to realtime changes for live updates
    const channel = supabase
      .channel("lgu-epidemiological-reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_triage_log" },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "risk_assessments" },
        () => loadData(false),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Ensure barangay dropdown options include database barangays + "Brgy. San Juan" if not already present
  const barangaySelectOptions = useMemo(() => {
    const dbOptions = reportData?.barangayOptions ?? [];
    const list: Array<{ value: string; label: string }> = dbOptions.map(
      (b) => ({
        value: b.id,
        label: formatBarangayDisplay(b.name),
      }),
    );

    const hasSanJuan = list.some((item) =>
      item.label.toLowerCase().includes("san juan"),
    );
    if (!hasSanJuan) {
      list.push({ value: "San Juan", label: "Brgy. San Juan" });
    }
    return list;
  }, [reportData?.barangayOptions]);

  const kpis = reportData?.kpis ?? {
    avgDvi: 0,
    dviTrendPct: 12,
    totalConfirmedVectors: 0,
    vectorsTrendPct: null,
    totalReadingsCount: 0,
    criticalHighRiskZones: 0,
    criticalCount: 0,
    highRiskCount: 0,
    triageCompletionRate: 0,
    completedTriageCount: 0,
    totalTriageCount: 0,
    activeDeployedTraps: 0,
    periodDays: 30,
  };

  const vectorTrend = reportData?.vectorTrend ?? [];
  const interventionDistribution = reportData?.interventionDistribution ?? [];
  const barangayRankings = reportData?.barangayRankings ?? [];

  // Points on the AreaChart that have completed misting or clean-up interventions
  const interventionPoints = useMemo(() => {
    return vectorTrend.filter((pt) => pt.hasIntervention);
  }, [vectorTrend]);

  const totalInterventionsCount = useMemo(() => {
    return interventionDistribution.reduce((acc, item) => acc + item.count, 0);
  }, [interventionDistribution]);

  // Non-zero pie data or placeholder for empty state
  const pieChartData = useMemo(() => {
    if (totalInterventionsCount === 0) {
      return [
        {
          category: "Solution Misting" as const,
          count: 1,
          completedCount: 0,
          percentage: 34,
          color: "#10b981",
        },
        {
          category: "Clean-up Drive" as const,
          count: 1,
          completedCount: 0,
          percentage: 33,
          color: "#0ea5e9",
        },
        {
          category: "Monitoring Personnel" as const,
          count: 1,
          completedCount: 0,
          percentage: 33,
          color: "#f59e0b",
        },
      ];
    }
    return interventionDistribution;
  }, [interventionDistribution, totalInterventionsCount]);

  // ─── Export CSV Handler ────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!reportData) return;

    const lines: string[] = [];
    const dateStamp = new Date().toISOString().slice(0, 10);
    const selectedBarangayLabel =
      selectedBarangay === "all"
        ? "All Barangays"
        : barangaySelectOptions.find((o) => o.value === selectedBarangay)
            ?.label ?? selectedBarangay;

    lines.push('"EPIDEMIOLOGICAL REPORTS & ANALYTICS"');
    lines.push(
      `"Scope","${selectedBarangayLabel}","Period","${DATE_RANGE_LABELS[dateRange]}","Generated","${dateStamp}"`,
    );
    lines.push("");

    lines.push('"KPI SUMMARY"');
    lines.push('"Metric","Value","Details"');
    lines.push(
      `"Average Daily Vector Index (DVI)","${kpis.avgDvi.toFixed(2)}","${kpis.dviTrendPct >= 0 ? `+${kpis.dviTrendPct}%` : `${kpis.dviTrendPct}%`} vs last period (${kpis.activeDeployedTraps} active traps / ${kpis.periodDays} days)"`,
    );
    lines.push(
      `"Total Confirmed Vectors","${kpis.totalConfirmedVectors}","${kpis.totalReadingsCount} telemetry packets"`,
    );
    lines.push(
      `"Critical / High-Risk Zones","${kpis.criticalHighRiskZones}","${kpis.criticalCount} Critical, ${kpis.highRiskCount} High-Risk"`,
    );
    lines.push(
      `"Triage Completion Rate","${kpis.triageCompletionRate}%","${kpis.completedTriageCount} of ${kpis.totalTriageCount} completed"`,
    );
    lines.push("");

    lines.push('"BARANGAY RISK RANKING TABLE"');
    lines.push(
      '"Rank","Barangay Name","Active Traps","Total Traps","Total Detections","Calculated Score (DVI)","Risk Level","7-Day Trend (%)"',
    );
    for (const row of barangayRankings) {
      lines.push(
        [
          row.rank,
          `"${formatBarangayDisplay(row.barangayName)}"`,
          row.activeTraps,
          row.totalTraps,
          row.totalDetections,
          row.calculatedScoreDvi.toFixed(2),
          `"${row.riskLevelName}"`,
          row.trend7DayPct !== null ? `${row.trend7DayPct}%` : "0%",
        ].join(","),
      );
    }
    lines.push("");

    lines.push('"DAILY VECTOR GROWTH TREND & INTERVENTIONS"');
    lines.push(
      '"Date","Confirmed Mosquito Count","Daily Vector Index (DVI)","Completed Interventions"',
    );
    for (const pt of vectorTrend) {
      const intvNames = pt.interventions
        .map((i) => `${i.type} (${i.barangayName})`)
        .join("; ");
      lines.push(
        [
          pt.date,
          pt.mosquitoCount,
          pt.dvi.toFixed(2),
          `"${intvNames || "None"}"`,
        ].join(","),
      );
    }

    const csvBlob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lgu_epidemiological_report_${dateStamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Print PDF Report Handler ──────────────────────────────────────────────
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-8 print:space-y-4">
      {/* ==================================================================== */}
      {/* 1. HEADER & CONTROLS                                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2">
            <Activity className="size-3.5 text-emerald-600" />
            LGU Epidemiological Intelligence
            {reportData?.municipality ? ` • ${reportData.municipality}` : ""}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Epidemiological Reports 
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Macro-level vector surveillance trends, barangay risk rankings, and
            intervention efficacy.
          </p>
        </div>

        {/* Right-aligned Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Barangay Filter Select */}
          <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
            <SelectTrigger
              aria-label="Filter by Barangay"
              className="h-9 min-w-[175px] bg-white border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
            >
              <MapPin className="size-3.5 text-emerald-600 shrink-0" />
              <SelectValue placeholder="All Barangays" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Barangays</SelectItem>
              {barangaySelectOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Select */}
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRangePreset)}
          >
            <SelectTrigger
              aria-label="Select Date Range"
              className="h-9 min-w-[150px] bg-white border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
            >
              <Calendar className="size-3.5 text-emerald-600 shrink-0" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || !reportData}
            className="h-9 px-3.5 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 gap-1.5"
          >
            <Download className="size-3.5 text-emerald-600" />
            Export CSV
          </Button>

          {/* Print PDF Report Button */}
          <Button
            size="sm"
            onClick={handlePrintPdf}
            className="h-9 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
          >
            <Printer className="size-3.5" />
            Print PDF Report
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => loadData(true)}
            disabled={isLoading}
            title="Refresh analytics"
            className="h-9 w-9 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. 4 KPI SUMMARY CARDS                                               */}
      {/* ==================================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Average Daily Vector Index (DVI) */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Average Daily Vector Index (DVI)
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.avgDvi.toFixed(2)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full gap-0.5 ${
                        kpis.dviTrendPct >= 0
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {kpis.dviTrendPct >= 0 ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      {kpis.dviTrendPct >= 0
                        ? `+${kpis.dviTrendPct}%`
                        : `${kpis.dviTrendPct}%`}{" "}
                      vs last period
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
                <Activity className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
               Mosq. count ÷ {kpis.activeDeployedTraps} active deployed traps ÷{" "}
              {kpis.periodDays} days
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Confirmed Vectors */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Confirmed Vectors
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-28 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.totalConfirmedVectors.toLocaleString()}
                    </span>
                    {kpis.vectorsTrendPct !== null && (
                      <span
                        className={`inline-flex items-center text-xs font-semibold ${
                          kpis.vectorsTrendPct > 0
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {kpis.vectorsTrendPct > 0
                          ? `+${kpis.vectorsTrendPct}%`
                          : `${kpis.vectorsTrendPct}%`}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-sky-50 p-3 text-sky-700 border border-sky-100 shrink-0">
                <Bug className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Cumulative detections across {kpis.totalReadingsCount.toLocaleString()}{" "}
              ovitrap readings
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Critical / High-Risk Zones */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Critical / High-Risk Zones
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-20 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.criticalHighRiskZones}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        kpis.criticalHighRiskZones > 0
                          ? "bg-rose-50 text-rose-700 border-rose-200 text-[11px]"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                      }
                    >
                      {kpis.criticalCount} Critical · {kpis.highRiskCount} High
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-rose-600 border border-rose-100 shrink-0">
                <ShieldAlert className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Barangays in <code className="text-[11px]">risk_assessments</code>{" "}
              at High or Critical tier
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Triage Completion Rate */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Triage Completion Rate
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.triageCompletionRate}%
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]"
                    >
                      {kpis.completedTriageCount} / {kpis.totalTriageCount} done
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700 border border-amber-100 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Completed field interventions in{" "}
              <code className="text-[11px]">action_triage_log</code>
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ==================================================================== */}
      {/* 3. MAIN CHARTS GRID (Left 60% AreaChart | Right 40% Donut PieChart)  */}
      {/* ==================================================================== */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Left (60% -> 3 of 5 cols): Vector Growth Trend & Intervention Impact */}
        <Card className="lg:col-span-3 rounded-2xl border-slate-200 bg-white shadow-xs flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="size-4 text-emerald-600" />
                  Vector Growth Trend & Intervention Impact
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-slate-500">
                  Daily confirmed <code className="text-[11px]">mosquito_count</code>{" "}
                  with markers for completed misting & clean-up interventions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Daily Mosquito Count
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Intervention ({interventionPoints.length})
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 flex-1 flex flex-col justify-between gap-4">
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : vectorTrend.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
                No vector telemetry recorded for the selected period.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={vectorTrend}
                    margin={{ top: 18, right: 16, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="vectorGrowthGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
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
                    <Tooltip content={<VectorTrendTooltip />} />

                    {/* Reference lines & dots for completed misting / clean-up interventions */}
                    {interventionPoints.map((pt) => (
                      <ReferenceLine
                        key={`line-${pt.date}`}
                        x={pt.label}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      />
                    ))}

                    <Area
                      type="monotone"
                      dataKey="mosquitoCount"
                      name="Mosquito Count"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#vectorGrowthGradient)"
                      activeDot={{
                        r: 5,
                        fill: "#059669",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                    />

                    {interventionPoints.map((pt) => (
                      <ReferenceDot
                        key={`dot-${pt.date}`}
                        x={pt.label}
                        y={pt.mosquitoCount}
                        r={5}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Intervention Reference Badges Strip */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Completed Intervention Markers (action_triage_log)
                </span>
                <span className="text-[11px] text-slate-500">
                  {reportData?.interventions.length ?? 0} logged in period
                </span>
              </div>

              {!reportData || reportData.interventions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No completed misting or clean-up interventions recorded within
                  this date window.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {reportData.interventions.slice(0, 6).map((marker) => (
                    <Badge
                      key={marker.id}
                      variant="outline"
                      className="bg-amber-50/70 text-amber-900 border-amber-200/80 text-[11px] font-medium px-2.5 py-1 gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="font-semibold">{marker.type}</span>
                      <span className="text-amber-700">
                        • {formatBarangayDisplay(marker.barangayName)}
                      </span>
                      <span className="text-amber-600/80 font-mono text-[10px]">
                        ({marker.date.slice(5)})
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right (40% -> 2 of 5 cols): Intervention Distribution Donut Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 bg-white shadow-xs flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Intervention Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Task breakdown across <code className="text-[11px]">action_triage_log</code>{" "}
              and <code className="text-[11px]">request_actions</code>.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 flex-1 flex flex-col justify-between gap-4">
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <div className="relative h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {pieChartData.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={entry.color}
                          opacity={totalInterventionsCount === 0 ? 0.35 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<InterventionPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Donut Label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold tabular-nums text-slate-900">
                    {totalInterventionsCount}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total Tasks
                  </span>
                </div>
              </div>
            )}

            {/* Category Breakdown List */}
            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              {interventionDistribution.map((item) => {
                const Icon = getCategoryIcon(item.category);
                return (
                  <div
                    key={item.category}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0"
                        style={{ backgroundColor: item.color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {item.category}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.completedCount} completed / approved
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="font-bold text-slate-900 text-sm tabular-nums">
                        {item.count}
                      </span>
                      <span className="ml-1.5 inline-block rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ==================================================================== */}
      {/* 4. BARANGAY RISK RANKING DATA TABLE                                  */}
      {/* ==================================================================== */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Barangay Risk Ranking Table
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Aggregated surveillance ranking joining{" "}
              <code className="text-[11px]">barangays</code>,{" "}
              <code className="text-[11px]">ovitrap_devices</code>,{" "}
              <code className="text-[11px]">ovitrap_readings</code>, and{" "}
              <code className="text-[11px]">risk_assessments</code> /{" "}
              <code className="text-[11px]">risk_levels</code>.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-semibold self-start sm:self-auto"
          >
            {barangayRankings.length}{" "}
            {barangayRankings.length === 1 ? "Barangay" : "Barangays"} Evaluated
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="barangay-risk-ranking-caption"
            className="overflow-auto max-w-full max-h-[min(560px,80vh)] [container-type:inline-size]"
          >
            <Table>
              <caption id="barangay-risk-ranking-caption" className="sr-only">
                Barangay Risk Ranking Table showing rank, barangay name, active
                traps, total detections, calculated DVI score, risk level badge,
                and 7-day trend.
              </caption>
              <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-20 pl-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rank
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Barangay Name
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Traps
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Detections
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Calculated Score (DVI)
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    Risk Level Badge
                  </TableHead>
                  <TableHead className="pr-6 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    7-Day Trend
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="py-4 px-6">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : barangayRankings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      No barangay surveillance records found for the selected
                      filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  barangayRankings.map((row) => (
                    <TableRow
                      key={row.barangayId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Rank */}
                      <TableCell className="pl-6 py-3.5 font-mono text-xs font-bold text-slate-500">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-rose-100 text-rose-700"
                              : row.rank === 2
                                ? "bg-orange-100 text-orange-700"
                                : row.rank === 3
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          #{row.rank}
                        </span>
                      </TableCell>

                      {/* Barangay Name (Sticky row header for accessibility) */}
                      <th
                        scope="row"
                        className="sticky left-0 bg-white px-2 py-3.5 text-left font-semibold text-slate-900 whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-slate-400 shrink-0" />
                          <span>{formatBarangayDisplay(row.barangayName)}</span>
                        </div>
                      </th>

                      {/* Active Traps */}
                      <TableCell className="py-3.5 text-center tabular-nums">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              row.activeTraps > 0
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {row.activeTraps}
                          <span className="text-slate-400 font-normal">
                            / {row.totalTraps}
                          </span>
                        </span>
                      </TableCell>

                      {/* Total Detections */}
                      <TableCell className="py-3.5 text-right font-bold tabular-nums text-slate-900">
                        {row.totalDetections.toLocaleString()}{" "}
                        <span className="text-[11px] font-normal text-slate-400">
                          mosq
                        </span>
                      </TableCell>

                      {/* Calculated Score (DVI) */}
                      <TableCell className="py-3.5 text-right font-mono font-bold tabular-nums text-slate-800">
                        {row.calculatedScoreDvi.toFixed(2)}
                      </TableCell>

                      {/* Risk Level Badge (using display_color) */}
                      <TableCell className="py-3.5 text-center">
                        <RiskLevelBadge
                          levelName={row.riskLevelName}
                          displayColor={row.displayColor}
                        />
                      </TableCell>

                      {/* 7-Day Trend */}
                      <TableCell className="pr-6 py-3.5 text-right">
                        <Trend7DayBadge row={row} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
