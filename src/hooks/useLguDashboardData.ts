import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getConsecutiveCriticalDays, getDangerTier } from "@/utils/dangerTiers";

export type AlertTier = "green" | "yellow" | "orange" | "red";

export interface DailyMosquitoTrendPoint {
  date: string; // YYYY-MM-DD
  avg: number;
  readings: number;
  total: number;
}

export interface BarangayMosquitoStatus {
  id: string;
  name: string;
  tier: AlertTier | null;
  avg3Day: number;
  avgPrev3Day: number;
  changePct: number | null;
  lastReadingAt: string | null;
}

export interface LguDashboardMetrics {
  dviAverage3Day: number;
  dviAveragePrev3Day: number;
  barangaysMonitored: number;
  pendingApprovals: number;
  pendingActions: number;
  inProgressActions: number;
  completedActions: number;
  cancelledActions: number;
  dohCases7Day: number | null;
  alertTierCounts: {
    green: number;
    yellow: number;
    orange: number;
    red: number;
  };
  recentEscalations: Array<{
    barangay: string;
    transition: string;
    timestamp: string;
  }>;
  dailyTrend: DailyMosquitoTrendPoint[];
  barangayStatus: BarangayMosquitoStatus[];
}

const EMPTY_METRICS: LguDashboardMetrics = {
  dviAverage3Day: 0,
  dviAveragePrev3Day: 0,
  barangaysMonitored: 0,
  pendingApprovals: 0,
  pendingActions: 0,
  inProgressActions: 0,
  completedActions: 0,
  cancelledActions: 0,
  dohCases7Day: null,
  alertTierCounts: {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  },
  recentEscalations: [],
  dailyTrend: [],
  barangayStatus: [],
};

type RiskAssessmentRow = {
  barangay_id: string;
  assessment_period_end: string | null;
  barangay:
    | {
        barangay_name: string | null;
      }
    | Array<{
        barangay_name: string | null;
      }>
    | null;
  risk_level:
    | {
        level_name: string | null;
      }
    | Array<{
        level_name: string | null;
      }>
    | null;
};

function getRiskLevelName(row: RiskAssessmentRow): string | null {
  if (!row.risk_level) return null;
  if (Array.isArray(row.risk_level)) {
    return row.risk_level[0]?.level_name ?? null;
  }
  return row.risk_level.level_name;
}

function getBarangayName(row: RiskAssessmentRow): string {
  if (!row.barangay) return "Unknown";
  if (Array.isArray(row.barangay)) {
    return row.barangay[0]?.barangay_name ?? "Unknown";
  }
  return row.barangay.barangay_name ?? "Unknown";
}

function normalizeAlertTier(levelName: string | null | undefined):
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | null {
  if (!levelName) return null;

  const normalized = levelName.toLowerCase();

  if (normalized.includes("critical") || normalized.includes("red")) {
    return "red";
  }
  if (normalized.includes("high") || normalized.includes("orange")) {
    return "orange";
  }
  if (normalized.includes("moderate") || normalized.includes("yellow")) {
    return "yellow";
  }
  if (normalized.includes("low") || normalized.includes("green")) {
    return "green";
  }

  return null;
}

function getAlertTierRank(tier: "green" | "yellow" | "orange" | "red"): number {
  if (tier === "green") return 1;
  if (tier === "yellow") return 2;
  if (tier === "orange") return 3;
  return 4;
}

function formatTierLabel(tier: "green" | "yellow" | "orange" | "red"): string {
  return `${tier.slice(0, 1).toUpperCase()}${tier.slice(1)}`;
}

async function fetchLguDashboardMetrics(): Promise<LguDashboardMetrics> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    return EMPTY_METRICS;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("municipality")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const municipality = profile?.municipality;
  if (!municipality) {
    return EMPTY_METRICS;
  }

  const { data: barangaysData, error: barangaysError } = await supabase
    .from("barangays")
    .select("id, barangay_name")
    .eq("municipality", municipality);

  if (barangaysError) {
    throw barangaysError;
  }

  const barangayRows =
    (barangaysData as Array<{ id: string; barangay_name: string | null }>) ?? [];
  const barangayIds = barangayRows.map((b) => b.id);
  if (barangayIds.length === 0) {
    return EMPTY_METRICS;
  }

  const { data: devicesData, error: devicesError } = await supabase
    .from("ovitrap_devices")
    .select("id, barangay_id")
    .in("barangay_id", barangayIds);

  if (devicesError) {
    throw devicesError;
  }

  const devices =
    (devicesData as Array<{ id: string; barangay_id: string | null }>) ?? [];
  const monitoredBarangayIds = new Set(
    devices
      .map((d) => d.barangay_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const deviceIds = devices.map((d) => d.id);
  const deviceToBarangay = new Map<string, string>();
  const devicesPerBarangay = new Map<string, number>();
  for (const d of devices) {
    if (d.barangay_id) {
      deviceToBarangay.set(d.id, d.barangay_id);
      devicesPerBarangay.set(d.barangay_id, (devicesPerBarangay.get(d.barangay_id) ?? 0) + 1);
    }
  }

  let dviAverage3Day = 0;
  let dviAveragePrev3Day = 0;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const trendDays = 7;

  // Seed the weekly trend buckets (oldest -> newest)
  const trendBuckets = new Map<string, { total: number; readings: number }>();
  for (let i = trendDays - 1; i >= 0; i -= 1) {
    trendBuckets.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), {
      total: 0,
      readings: 0,
    });
  }

  const perBarangay = new Map<
    string,
    { recentTotal: number; recentN: number; prevTotal: number; prevN: number; last: string | null }
  >();
  const dailyDetectionsPerBarangay = new Map<string, Map<string, number>>();

  if (deviceIds.length > 0) {
    const sinceIso = new Date(now - trendDays * DAY_MS).toISOString();
    const { data: readingsData, error: readingsError } = await supabase
      .from("ovitrap_readings")
      .select("device_id, mosquito_count, captured_at")
      .in("device_id", deviceIds)
      .gte("captured_at", sinceIso)
      .order("captured_at", { ascending: false })
      .limit(5000);

    if (readingsError) {
      throw readingsError;
    }

    const readings =
      (readingsData as Array<{
        device_id: string;
        mosquito_count?: number | null;
        captured_at: string;
      }>) ?? [];

    let recentTotal = 0;
    let recentN = 0;
    let prevTotal = 0;
    let prevN = 0;

    for (const row of readings) {
      const value = row.mosquito_count ?? 0;
      const ts = Date.parse(row.captured_at);
      if (Number.isNaN(ts)) continue;

      const bucket = trendBuckets.get(new Date(ts).toISOString().slice(0, 10));
      if (bucket) {
        bucket.total += value;
        bucket.readings += 1;
      }

      const isRecent = ts >= now - 3 * DAY_MS;
      const isPrev = !isRecent && ts >= now - 6 * DAY_MS;

      if (isRecent) {
        recentTotal += value;
        recentN += 1;
      } else if (isPrev) {
        prevTotal += value;
        prevN += 1;
      }

      const brgyId = deviceToBarangay.get(row.device_id);
      if (brgyId) {
        const day = new Date(ts).toISOString().slice(0, 10);
        const dailyCounts = dailyDetectionsPerBarangay.get(brgyId) ?? new Map<string, number>();
        dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + value);
        dailyDetectionsPerBarangay.set(brgyId, dailyCounts);

        const agg = perBarangay.get(brgyId) ?? {
          recentTotal: 0,
          recentN: 0,
          prevTotal: 0,
          prevN: 0,
          last: null,
        };
        if (isRecent) {
          agg.recentTotal += value;
          agg.recentN += 1;
        } else if (isPrev) {
          agg.prevTotal += value;
          agg.prevN += 1;
        }
        if (!agg.last || ts > Date.parse(agg.last)) agg.last = row.captured_at;
        perBarangay.set(brgyId, agg);
      }
    }

    dviAverage3Day = recentN > 0 ? recentTotal / recentN : 0;
    dviAveragePrev3Day = prevN > 0 ? prevTotal / prevN : 0;
  }

 const dailyTrend: DailyMosquitoTrendPoint[] = Array.from(trendBuckets.entries()).map(
  ([date, b]) => ({
    date,
    avg: b.readings > 0 ? Number((b.total / b.readings).toFixed(1)) : 0,
    readings: b.readings,
    total: b.total,
  }),
);
  const { count: pendingCount, error: pendingError } = await supabase
    .from("action_triage_log")
    .select("id", { count: "exact", head: true })
    .in("barangay_id", barangayIds)
    .in("status", ["Pending", "In Progress"]);

  if (pendingError) {
    throw pendingError;
  }

  const { data: actionStatusRows, error: actionStatusError } = await supabase
    .from("action_triage_log")
    .select("status")
    .in("barangay_id", barangayIds);

  if (actionStatusError) {
    throw actionStatusError;
  }

  const actionCounts = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of
    (actionStatusRows as Array<{ status: string | null }> | null) ?? []) {
    const status = (row.status ?? "").toLowerCase();
    if (status === "pending") {
      actionCounts.pending += 1;
    } else if (status === "in progress") {
      actionCounts.inProgress += 1;
    } else if (status === "completed") {
      actionCounts.completed += 1;
    } else if (status === "cancelled") {
      actionCounts.cancelled += 1;
    }
  }

  const { data: riskAssessmentsData, error: riskAssessmentsError } = await supabase
    .from("risk_assessments")
    .select("barangay_id, assessment_period_end, barangay:barangays(barangay_name), risk_level:risk_levels(level_name)")
    .in("barangay_id", barangayIds)
    .order("assessment_period_end", { ascending: false })
    .limit(500);

  if (riskAssessmentsError) {
    throw riskAssessmentsError;
  }

  const riskRows = (riskAssessmentsData as RiskAssessmentRow[]) ?? [];

  const alertTierCounts = {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  };

  const riskRowsByBarangay = new Map<string, RiskAssessmentRow[]>();
  for (const row of riskRows) {
    const existing = riskRowsByBarangay.get(row.barangay_id) ?? [];
    existing.push(row);
    riskRowsByBarangay.set(row.barangay_id, existing);
  }

  const currentTierByBarangay = new Map<string, AlertTier | null>();
  for (const barangayId of monitoredBarangayIds) {
    const agg = perBarangay.get(barangayId);
    if (!agg || agg.recentN === 0) {
      currentTierByBarangay.set(barangayId, null);
      continue;
    }
    const deviceCount = Math.max(1, devicesPerBarangay.get(barangayId) ?? 0);
    const dailyAverages = Array.from({ length: 3 }, (_, offset) => {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      return (dailyDetectionsPerBarangay.get(barangayId)?.get(day.toISOString().slice(0, 10)) ?? 0) / deviceCount;
    });
    const dangerTier = getDangerTier(
      dailyAverages[0],
      getConsecutiveCriticalDays(dailyAverages),
    );
    const tier: AlertTier =
      dangerTier === "Critical" ? "red" :
        dangerTier === "High" ? "orange" :
          dangerTier === "Moderate" ? "yellow" : "green";
    currentTierByBarangay.set(barangayId, tier);
    if (tier) {
      alertTierCounts[tier] += 1;
    }
  }

  const recentEscalations: Array<{
    barangay: string;
    transition: string;
    timestamp: string;
  }> = [];

  for (const rows of riskRowsByBarangay.values()) {
    const sortedRows = [...rows].sort((a, b) => {
      const aTs = a.assessment_period_end ? Date.parse(a.assessment_period_end) : 0;
      const bTs = b.assessment_period_end ? Date.parse(b.assessment_period_end) : 0;
      return bTs - aTs;
    });

    for (let i = 0; i < sortedRows.length - 1; i += 1) {
      const current = sortedRows[i];
      const previous = sortedRows[i + 1];
      if (!current || !previous) continue;

      const currentTier = normalizeAlertTier(getRiskLevelName(current));
      const previousTier = normalizeAlertTier(getRiskLevelName(previous));

      if (!currentTier || !previousTier) continue;
      if (getAlertTierRank(currentTier) <= getAlertTierRank(previousTier)) continue;

      recentEscalations.push({
        barangay: getBarangayName(current),
        transition: `${formatTierLabel(previousTier)} to ${formatTierLabel(currentTier)}`,
        timestamp: current.assessment_period_end ?? previous.assessment_period_end ?? new Date(0).toISOString(),
      });
      break;
    }
  }

  recentEscalations.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const barangayStatus: BarangayMosquitoStatus[] = barangayRows
    .filter((b) => monitoredBarangayIds.has(b.id))
    .map((b) => {
      const agg = perBarangay.get(b.id);
      const avg3Day = agg && agg.recentN > 0 ? agg.recentTotal / agg.recentN : 0;
      const avgPrev3Day = agg && agg.prevN > 0 ? agg.prevTotal / agg.prevN : 0;
      const changePct =
        avgPrev3Day > 0 ? ((avg3Day - avgPrev3Day) / avgPrev3Day) * 100 : null;
      const tier = currentTierByBarangay.get(b.id) ?? null;

      return {
        id: b.id,
        name: b.barangay_name ?? "Unknown",
        tier,
        avg3Day,
        avgPrev3Day,
        changePct,
        lastReadingAt: agg?.last ?? null,
      };
    })
    .sort((a, b) => {
      const rankA = a.tier ? getAlertTierRank(a.tier) : 0;
      const rankB = b.tier ? getAlertTierRank(b.tier) : 0;
      if (rankA !== rankB) return rankB - rankA;
      return b.avg3Day - a.avg3Day;
    });

  return {
    dviAverage3Day,
    dviAveragePrev3Day,
    barangaysMonitored: monitoredBarangayIds.size,
    pendingApprovals: pendingCount ?? 0,
    pendingActions: actionCounts.pending,
    inProgressActions: actionCounts.inProgress,
    completedActions: actionCounts.completed,
    cancelledActions: actionCounts.cancelled,
    dohCases7Day: null,
    alertTierCounts,
    recentEscalations: recentEscalations.slice(0, 8),
    dailyTrend,
    barangayStatus,
  };
}

export function useLguDashboardData() {
  return useQuery({
    queryKey: ["lgu-dashboard", "metrics"],
    queryFn: fetchLguDashboardMetrics,
    refetchInterval: 30_000,
  });
}
