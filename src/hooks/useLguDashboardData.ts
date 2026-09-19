import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LguDashboardMetrics {
  dviAverage3Day: number;
  barangaysMonitored: number;
  pendingApprovals: number;
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
}

const EMPTY_METRICS: LguDashboardMetrics = {
  dviAverage3Day: 0,
  barangaysMonitored: 0,
  pendingApprovals: 0,
  dohCases7Day: null,
  alertTierCounts: {
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
  },
  recentEscalations: [],
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
    .select("id")
    .eq("municipality", municipality);

  if (barangaysError) {
    throw barangaysError;
  }

  const barangayIds = (barangaysData ?? []).map((b: { id: string }) => b.id);
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
  let dviAverage3Day = 0;

  if (deviceIds.length > 0) {
    const since3Days = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: readingsData, error: readingsError } = await supabase
      .from("ovitrap_readings")
      .select("mosquito_count")
      .in("device_id", deviceIds)
      .gte("captured_at", since3Days);

    if (readingsError) {
      throw readingsError;
    }

    const readings =
      (readingsData as Array<{ mosquito_count?: number | null }>) ?? [];
    const totalCount = readings.reduce((sum, row) => {
      const value = row.mosquito_count ?? 0;
      return sum + value;
    }, 0);

    dviAverage3Day = readings.length > 0 ? totalCount / readings.length : 0;
  }

  const { count: pendingCount, error: pendingError } = await supabase
    .from("action_triage_log")
    .select("id", { count: "exact", head: true })
    .in("barangay_id", barangayIds)
    .in("status", ["Pending", "In Progress"]);

  if (pendingError) {
    throw pendingError;
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

  const latestByBarangay = new Map<string, RiskAssessmentRow>();
  const riskRows = (riskAssessmentsData as RiskAssessmentRow[]) ?? [];
  for (const row of riskRows) {
    if (!latestByBarangay.has(row.barangay_id)) {
      latestByBarangay.set(row.barangay_id, row);
    }
  }

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

  for (const row of latestByBarangay.values()) {
    const tier = normalizeAlertTier(getRiskLevelName(row));
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

  return {
    dviAverage3Day,
    barangaysMonitored: monitoredBarangayIds.size,
    pendingApprovals: pendingCount ?? 0,
    dohCases7Day: null,
    alertTierCounts,
    recentEscalations: recentEscalations.slice(0, 8),
  };
}

export function useLguDashboardData() {
  return useQuery({
    queryKey: ["lgu-dashboard", "metrics"],
    queryFn: fetchLguDashboardMetrics,
    refetchInterval: 30_000,
  });
}
