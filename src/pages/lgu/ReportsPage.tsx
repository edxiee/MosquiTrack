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
  AlertTriangle,
  Bug,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { supabase } from "@/lib/supabase";
import { fetchEpidemiologicalReportData } from "@/services/reports.service";
import type {
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
          <span className="text-slate-500">Mosquitoes detected:</span>
          <span className="font-bold text-emerald-700 text-sm tabular-nums">
            {point.mosquitoCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Avg. Mosquitoes / Trap / Day:</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {point.dvi.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Readings received:</span>
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

export default function ReportsAnalyticsPage() {
  const [selectedTrap, setSelectedTrap] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangePreset>("7d");
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
          barangayId: "all",
          deviceId: selectedTrap || "all",
          dateRange,
        });
        setReportData(res);
        if (!selectedTrap && res.trapOptions.length > 0 && res.trapOptions[0]) {
          setSelectedTrap(res.trapOptions[0].id);
        }
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
    [selectedTrap, dateRange],
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

  const trapSelectOptions = useMemo(() => {
    const dbTraps = reportData?.trapOptions ?? [];
    return dbTraps.map((t) => ({
      value: t.id,
      deviceCode: t.deviceCode,
      label: t.barangayName
        ? `${t.deviceCode} (${formatBarangayDisplay(t.barangayName)})`
        : t.deviceCode,
    }));
  }, [reportData?.trapOptions]);

  const currentTrapIndex = useMemo(() => {
    if (!selectedTrap || trapSelectOptions.length === 0) return -1;
    return trapSelectOptions.findIndex((t) => t.value === selectedTrap);
  }, [selectedTrap, trapSelectOptions]);

  const handlePrevTrap = () => {
    if (trapSelectOptions.length === 0) return;
    const nextIdx =
      currentTrapIndex <= 0
        ? trapSelectOptions.length - 1
        : currentTrapIndex - 1;
    const target = trapSelectOptions[nextIdx];
    if (target) setSelectedTrap(target.value);
  };

  const handleNextTrap = () => {
    if (trapSelectOptions.length === 0) return;
    const nextIdx =
      currentTrapIndex === -1 || currentTrapIndex >= trapSelectOptions.length - 1
        ? 0
        : currentTrapIndex + 1;
    const target = trapSelectOptions[nextIdx];
    if (target) setSelectedTrap(target.value);
  };

  const kpis = reportData?.kpis ?? {
    totalSuccessCount: 0,
    failedCount: 0,
    dangerLevel: "Low" as const,
    daysBeforeCycleEnd: 7,
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
    periodDays: 7,
  };

  const vectorTrend = reportData?.vectorTrend ?? [];
  const interventionDistribution = reportData?.interventionDistribution ?? [];
  const barangayRankings = reportData?.barangayRankings ?? [];
  const selectedTrapOption = useMemo(
    () => trapSelectOptions.find((option) => option.value === selectedTrap) ?? null,
    [trapSelectOptions, selectedTrap],
  );

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
    const selectedTrapLabel = selectedTrapOption?.label ?? "All Traps";

    lines.push('"EPIDEMIOLOGICAL REPORTS & ANALYTICS"');
    lines.push(
      `"Scope","${selectedTrapLabel}","Period","${DATE_RANGE_LABELS[dateRange]}","Generated","${dateStamp}"`,
    );
    lines.push("");

    lines.push('"KPI SUMMARY"');
    lines.push('"Metric","Value","Details"');
    lines.push(
      `"Total Successful Mosquito Count","${kpis.totalSuccessCount}","Hz and ms matched thresholds"`,
    );
    lines.push(
      `"Failed to Count","${kpis.failedCount}","Hz and ms outside mosquito threshold"`,
    );
    lines.push(
      `"Danger Level","${kpis.dangerLevel}","Current trap risk status"`,
    );
    lines.push(
      `"Days Before 7-Day Cycle End","${kpis.daysBeforeCycleEnd} days","Surveillance cycle remaining"`,
    );
    lines.push("");

    lines.push('"BARANGAY RISK RANKING TABLE"');
    lines.push(
      '"Rank","Barangay Name","Municipality","Active Traps","Total Traps","Total Detections","Average Mosquitoes per Active Trap per Day","Danger Level","7-Day Trend (%)"',
    );
    for (const row of barangayRankings) {
      lines.push(
        [
          row.rank,
          `"${formatBarangayDisplay(row.barangayName)}"`,
          `"${row.municipality ?? ""}"`,
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
      '"Date","Confirmed Mosquito Count","Daily Detections per Active Trap","Completed Interventions"',
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
            In-depth mosquito population surveillance trends, barangay risk rankings, and
            intervention efficacy.
          </p>

          {/* Trap Filter Dropdown with Left & Right Navigation Arrows */}
          <div className="mt-3.5 flex items-center gap-1.5 print:hidden">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handlePrevTrap}
              disabled={isLoading || trapSelectOptions.length === 0}
              title="Previous trap"
              aria-label="Previous trap"
              className="h-9 w-9 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Select value={selectedTrap} onValueChange={setSelectedTrap}>
              <SelectTrigger
                aria-label="Select Trap"
                className="h-9 min-w-[220px] sm:min-w-[260px] bg-white border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <Bug className="size-3.5 text-emerald-600 shrink-0 mr-1" />
                <SelectValue placeholder="Select trap…" />
              </SelectTrigger>
              <SelectContent align="start">
                {trapSelectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleNextTrap}
              disabled={isLoading || trapSelectOptions.length === 0}
              title="Next trap"
              aria-label="Next trap"
              className="h-9 w-9 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Right-aligned Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden self-start xl:self-center">
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
      {/* 2. 4 KPI SUMMARY CONTAINERS                                          */}
      {/* ==================================================================== */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Container 1: Total Success Count of Mosquito */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Success Count of Mosquito
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.totalSuccessCount.toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full gap-1"
                    >
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Counted
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
                <Bug className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Container 2: Failed to Count */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Failed to Count
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.failedCount.toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full gap-1"
                    >
                      <AlertTriangle className="size-3 text-emerald-600" />
                      Hz/ms Mismatch
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Container 3: Danger Level */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Danger Level
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2.5 pt-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                      {kpis.dangerLevel}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full gap-1"
                    >
                      <ShieldAlert className="size-3 text-emerald-600" />
                      {kpis.dangerLevel === "Critical"
                        ? "Action Needed"
                        : kpis.dangerLevel === "High"
                          ? "High Activity"
                          : kpis.dangerLevel === "Moderate"
                            ? "Moderate"
                            : "Normal"}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
                <ShieldAlert className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Container 4: Days Before 7 Days Cycle End */}
        <Card className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Days Before 7 Days Cycle End
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-24 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {kpis.daysBeforeCycleEnd}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {kpis.daysBeforeCycleEnd === 1 ? "day left" : "days left"}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full gap-1 ml-1"
                    >
                      <Clock className="size-3 text-emerald-600" />
                      Day {Math.max(1, 7 - kpis.daysBeforeCycleEnd + 1)} of 7
                    </Badge>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
                <Clock className="size-5" />
              </div>
            </div>
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
                  Mosquito Population Growth Trend & Intervention Impact
                </CardTitle>
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
                No Mosquito count data recorded for the selected period.
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
                    <Tooltip content={<VectorTrendTooltip />} wrapperStyle={{ zIndex: 50 }}/>

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
                  Completed Intervention Markers
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
                    <Tooltip content={<InterventionPieTooltip />} wrapperStyle={{ zIndex: 50 }}/>
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
    </div>
  );
}
