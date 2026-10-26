import { supabase } from "@/lib/supabase";
import { getDangerTier } from "@/utils/dangerTiers";
import type {
  BarangayRankingEntry,
  BarangayRiskTableRow,
  DateRangePreset,
  DeviceStatusSummaryEntry,
  EpidemiologicalReportData,
  InterventionDistributionItem,
  InterventionMarker,
  RawTelemetryRow,
  ReportsFilterValues,
  VectorGrowthTrendPoint,
} from "@/types/reports.types";
import { ONLINE_THRESHOLD_MS } from "@/utils/deviceHelpers";

// ---------- Telemetry readings (legacy helpers preserved) ----------

interface RawReadingRow {
  captured_at: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  mosquito_count?: number | null;
  device_id: string;
  device: {
    device_code: string;
    barangay_id: string | null;
    barangay: { barangay_name: string } | null;
  } | null;
}

const READING_SELECT = `
  captured_at,
  temperature_c,
  humidity_percent,
  mosquito_count,
  device_id,
  device:ovitrap_devices (
    device_code,
    barangay_id,
    barangay:barangays ( barangay_name )
  )
`;

function flattenReading(row: RawReadingRow): RawTelemetryRow {
  const count = row.mosquito_count ?? null;
  return {
    captured_at: row.captured_at,
    temperature_c: row.temperature_c,
    humidity_percent: row.humidity_percent,
    mosquito_count: count,
    device_id: row.device_id,
    device_code: row.device?.device_code ?? "Unknown",
    barangay_id: row.device?.barangay_id ?? null,
    barangay_name: row.device?.barangay?.barangay_name ?? null,
  };
}

export async function getFilteredReadings(
  filters: Pick<
    ReportsFilterValues,
    "dateFrom" | "dateTo" | "barangay" | "device"
  >,
): Promise<RawTelemetryRow[]> {
  let query = supabase
    .from("ovitrap_readings")
    .select(READING_SELECT)
    .order("captured_at", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("captured_at", `${filters.dateFrom}T00:00:00`);
  } else {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query.gte("captured_at", sevenDaysAgo.toISOString());
  }
  if (filters.dateTo) {
    query = query.lte("captured_at", `${filters.dateTo}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw error;

  let readings = ((data ?? []) as unknown as RawReadingRow[]).map(
    flattenReading,
  );

  if (filters.barangay !== "all") {
    readings = readings.filter((r) => r.barangay_name === filters.barangay);
  }
  if (filters.device !== "all") {
    readings = readings.filter((r) => r.device_code === filters.device);
  }

  return readings;
}

// ---------- Device status summary ----------

interface RawDeviceRow {
  barangay: { barangay_name: string } | null;
  device_status: { status_name: string } | null;
}

export async function getDeviceStatusSummary(
  filters: Pick<ReportsFilterValues, "barangay" | "status">,
): Promise<DeviceStatusSummaryEntry[]> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select(
      `
      barangay:barangays ( barangay_name ),
      device_status:device_statuses ( status_name )
    `,
    );
  if (error) throw error;

  let devices = (data ?? []) as unknown as RawDeviceRow[];

  if (filters.barangay !== "all") {
    devices = devices.filter(
      (d) => d.barangay?.barangay_name === filters.barangay,
    );
  }
  if (filters.status !== "all") {
    devices = devices.filter(
      (d) => d.device_status?.status_name === filters.status,
    );
  }

  const counts = new Map<string, number>();
  for (const d of devices) {
    const status = d.device_status?.status_name ?? "Unknown";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([statusName, count]) => ({
    statusName,
    count,
  }));
}

export async function getActiveOfflineDeviceCounts(): Promise<{
  active: number;
  offline: number;
}> {
  const summary = await getDeviceStatusSummary({
    barangay: "all",
    status: "all",
  });
  const active =
    summary.find((s) => s.statusName === "Active" || s.statusName === "Online")
      ?.count ?? 0;
  const total = summary.reduce((sum, s) => sum + s.count, 0);
  return { active, offline: total - active };
}

// ---------- Barangay risk ranking (legacy helper) ----------

interface RawRiskAssessmentRow {
  barangay_id: string;
  calculated_score: number | null;
  assessment_period_end: string;
  barangay: { barangay_name: string } | null;
  risk_level: {
    level_name: string;
    priority: number;
    display_color: string;
  } | null;
}

export async function getBarangayRanking(
  limit = 10,
): Promise<BarangayRankingEntry[]> {
  const { data, error } = await supabase
    .from("risk_assessments")
    .select(
      `
      barangay_id,
      calculated_score,
      assessment_period_end,
      barangay:barangays ( barangay_name ),
      risk_level:risk_levels ( level_name, priority, display_color )
    `,
    )
    .order("assessment_period_end", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRiskAssessmentRow[];

  const latestByBarangay = new Map<string, RawRiskAssessmentRow>();
  for (const row of rows) {
    if (!latestByBarangay.has(row.barangay_id)) {
      latestByBarangay.set(row.barangay_id, row);
    }
  }

  const entries: BarangayRankingEntry[] = Array.from(
    latestByBarangay.values(),
  ).map((row) => ({
    barangayId: row.barangay_id,
    barangayName: row.barangay?.barangay_name ?? "Unknown",
    riskLevelName: row.risk_level?.level_name ?? "Unknown",
    riskLevelColor: row.risk_level?.display_color ?? "#94a3b8",
    riskPriority: row.risk_level?.priority ?? 0,
    calculatedScore: row.calculated_score,
    assessmentPeriodEnd: row.assessment_period_end,
  }));

  entries.sort(
    (a, b) =>
      b.riskPriority - a.riskPriority ||
      (b.calculatedScore ?? 0) - (a.calculatedScore ?? 0),
  );

  return entries.slice(0, limit);
}

export async function getHighRiskBarangayCount(): Promise<number> {
  const ranking = await getBarangayRanking(9999);
  return ranking.filter(
    (e) =>
      e.riskLevelName.toLowerCase().includes("high") ||
      e.riskLevelName.toLowerCase().includes("critical"),
  ).length;
}

export async function getBarangayOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("barangay_name")
    .order("barangay_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.barangay_name);
}

export async function getDeviceOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select("device_code")
    .order("device_code", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.device_code);
}

export async function getDeviceStatusOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("device_statuses")
    .select("status_name")
    .order("status_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.status_name);
}

// ============================================================================
// EPIDEMIOLOGICAL REPORTS & ANALYTICS ENGINE
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function getPeriodDays(preset: DateRangePreset): number {
  if (preset === "7d") return 7;
  if (preset === "30d") return 30;
  // "quarter": calculate days since start of current quarter, minimum 30 up to 90 days
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
  const elapsedDays = Math.ceil((now.getTime() - quarterStart.getTime()) / DAY_MS) + 1;
  return Math.max(30, Math.min(90, elapsedDays));
}

function classifyInterventionCategory(
  text: string,
  priority?: string | null,
): "Solution Misting" | "Clean-up Drive" | "Monitoring Personnel" | null {
  const lower = text.toLowerCase();
  if (/\b(deploy(?:ment|ed|ing)?|pick[\s-]?up|retriev(?:e|al|ed)|collect(?:ion|ed)?)\b/.test(lower)) {
    return null;
  }
  if (
    lower.includes("mist") ||
    lower.includes("fog") ||
    lower.includes("spray") ||
    lower.includes("chemical") ||
    lower.includes("larvicid")
  ) {
    return "Solution Misting";
  }
  if (
    lower.includes("clean") ||
    lower.includes("drive") ||
    lower.includes("source reduction") ||
    lower.includes("breeding") ||
    lower.includes("sanitation") ||
    lower.includes("drain")
  ) {
    return "Clean-up Drive";
  }
  if (
    lower.includes("monitor") ||
    lower.includes("personnel") ||
    lower.includes("inspect") ||
    lower.includes("survey") ||
    lower.includes("field")
  ) {
    return "Monitoring Personnel";
  }

  // Fallback based on triage priority when trigger_source is a generic system alert
  const p = (priority || "").toLowerCase();
  if (p === "critical") return "Solution Misting";
  if (p === "high") return "Clean-up Drive";
  return "Monitoring Personnel";
}

function inferRiskFromDvi(dvi: number, consecutiveCriticalDays: number): {
  levelName: string;
  displayColor: string;
  priority: number;
} {
  const levelName = getDangerTier(dvi, consecutiveCriticalDays);
  const priority =
    levelName === "Critical" ? 4 : levelName === "High" ? 3 : levelName === "Moderate" ? 2 : 1;
  const displayColor =
    levelName === "Critical"
      ? "#e11d48"
      : levelName === "High"
        ? "#f97316"
        : levelName === "Moderate"
          ? "#eab308"
          : "#10b981";
  return { levelName, displayColor, priority };
}

function isDeviceDeployedAndActive(device: any): boolean {
  if (device.operational_status) {
    const op = String(device.operational_status).toLowerCase();
    if (op === "in storage" || op === "in_storage" || op === "pending") {
      return false;
    }
    if (op === "deployed") return true;
  }

  const rawStatus = Array.isArray(device.device_statuses)
    ? device.device_statuses[0]?.status_name
    : device.device_statuses?.status_name;
  const statusName = String(device.status || rawStatus || "").toLowerCase();

  if (statusName === "in storage" || statusName === "in_storage") {
    return false;
  }
  if (statusName === "active" || statusName === "online" || statusName === "deployed") {
    return true;
  }

  if (device.last_seen_at) {
    const diff = Date.now() - new Date(device.last_seen_at).getTime();
    if (!Number.isNaN(diff) && diff <= ONLINE_THRESHOLD_MS) {
      return true;
    }
  }

  return (
    device.latitude != null &&
    device.longitude != null &&
    Number(device.latitude) !== 0 &&
    Number(device.longitude) !== 0
  );
}

export async function fetchEpidemiologicalReportData(params: {
  barangayId: string; // "all" or barangay id / name
  dateRange: DateRangePreset;
}): Promise<EpidemiologicalReportData> {
  const { barangayId, dateRange } = params;
  const periodDays = getPeriodDays(dateRange);
  const now = Date.now();
  const periodStart = new Date(now);
  periodStart.setUTCHours(0, 0, 0, 0);
  periodStart.setUTCDate(periodStart.getUTCDate() - (periodDays - 1));
  const currentPeriodStartMs = periodStart.getTime();
  const prevPeriodStartMs = currentPeriodStartMs - periodDays * DAY_MS;
  const sevenDaysAgoMs = now - 7 * DAY_MS;
  const fourteenDaysAgoMs = now - 14 * DAY_MS;

  // 1. Identify current LGU user's municipality if available
  let municipality: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("municipality")
        .eq("id", user.id)
        .maybeSingle();
      municipality = (profile as { municipality?: string | null } | null)?.municipality ?? null;
    }
  } catch {
    // Non-fatal
  }

  // 2. Fetch barangays
  let barangaysQuery = supabase
    .from("barangays")
    .select("id, barangay_name, municipality")
    .order("barangay_name", { ascending: true });

  if (municipality) {
    barangaysQuery = barangaysQuery.eq("municipality", municipality);
  }

  let { data: barangaysData, error: barangaysError } = await barangaysQuery;
  if (barangaysError) throw barangaysError;

  // Fallback to all barangays if municipality filter returned none
  if (!barangaysData || barangaysData.length === 0) {
    const fallbackBrgys = await supabase
      .from("barangays")
      .select("id, barangay_name, municipality")
      .order("barangay_name", { ascending: true });
    barangaysData = fallbackBrgys.data ?? [];
  }

  const allBarangays = (barangaysData ?? []) as Array<{
    id: string;
    barangay_name: string;
    municipality?: string | null;
  }>;

  const barangayMap = new Map<string, string>();
  for (const b of allBarangays) {
    barangayMap.set(b.id, b.barangay_name);
  }

  const barangayOptions = allBarangays.map((b) => ({
    id: b.id,
    name: b.barangay_name,
  }));

  // Resolve target barangay IDs based on filter
  const isFilteredByBarangay = barangayId !== "all";
  const scopedBarangays = isFilteredByBarangay
    ? allBarangays.filter(
        (b) =>
          b.id === barangayId ||
          b.barangay_name.toLowerCase() === barangayId.toLowerCase() ||
          `brgy. ${b.barangay_name}`.toLowerCase() === barangayId.toLowerCase(),
      )
    : allBarangays;

  const scopedBarangayIds = new Set(scopedBarangays.map((b) => b.id));
  const allMunicipalityBarangayIds = allBarangays.map((b) => b.id);

  // 3. Fetch devices, readings, risk_assessments, action_triage_log, request_actions in parallel
  const fetchSinceIso = new Date(
    Math.min(prevPeriodStartMs, fourteenDaysAgoMs),
  ).toISOString();

  let devicesRes = await supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      barangay_id,
      latitude,
      longitude,
      last_seen_at,
      operational_status,
      device_statuses ( id, status_name )
    `,
    );

  if (devicesRes.error && devicesRes.error.message?.includes("operational_status")) {
    devicesRes = await supabase
      .from("ovitrap_devices")
      .select(
        `
        id,
        device_code,
        barangay_id,
        latitude,
        longitude,
        last_seen_at,
        device_statuses ( id, status_name )
      `,
      );
  }

  const allDevicesRaw = (devicesRes.data ?? []) as any[];
  // Filter devices to municipality barangays if municipality has barangays
  const municipalityDevices =
    allMunicipalityBarangayIds.length > 0
      ? allDevicesRaw.filter(
          (d) => !d.barangay_id || allMunicipalityBarangayIds.includes(d.barangay_id),
        )
      : allDevicesRaw;

  const deviceToBarangayId = new Map<string, string | null>();
  for (const d of municipalityDevices) {
    deviceToBarangayId.set(d.id, d.barangay_id ?? null);
  }

  const [readingsRes, riskRes, triageRes, requestActionsRes] = await Promise.all([
    supabase
      .from("ovitrap_readings")
      .select("id, device_id, mosquito_count, captured_at, created_at")
      .gte("captured_at", fetchSinceIso)
      .order("captured_at", { ascending: true })
      .limit(10000),
    supabase
      .from("risk_assessments")
      .select(
        `
        id,
        barangay_id,
        calculated_score,
        assessment_period_end,
        barangay:barangays ( id, barangay_name ),
        risk_level:risk_levels ( level_name, priority, display_color )
      `,
      )
      .order("assessment_period_end", { ascending: false }),
    supabase
      .from("action_triage_log")
      .select(
        `
        id,
        barangay_id,
        trigger_source,
        priority,
        status,
        assigned_date,
        due_date,
        completed_at,
        remarks,
        created_at,
        barangay:barangays ( barangay_name )
      `,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("request_actions")
      .select("req_id, device_id, request, descriptions, notes, status, created_at, approved_at, completed_at")
      .order("created_at", { ascending: false }),
  ]);

  const rawReadings = (readingsRes.data ?? []) as Array<{
    id: string;
    device_id: string;
    mosquito_count: number | null;
    captured_at: string;
    created_at?: string;
  }>;

  const rawRisks = (riskRes.data ?? []) as any[];
  const rawTriage = (triageRes.data ?? []) as any[];
  const rawRequests = (requestActionsRes.data ?? []) as any[];

  // Filter devices for current barangay selection
  const scopedDevices = isFilteredByBarangay
    ? municipalityDevices.filter((d) => d.barangay_id && scopedBarangayIds.has(d.barangay_id))
    : municipalityDevices;

  const scopedDeviceIds = new Set(scopedDevices.map((d) => d.id));

  const activeDeployedTraps = scopedDevices.filter(isDeviceDeployedAndActive).length;
  const activeTrapsDenominator = Math.max(1, activeDeployedTraps || scopedDevices.length || 1);

  // 4. Process readings for KPIs & Daily Vector Growth Trend
  let totalConfirmedVectors = 0;
  let prevPeriodVectors = 0;
  let totalReadingsCount = 0;

  // Initialize daily trend buckets for the selected period (oldest -> newest)
  const dailyBuckets = new Map<
    string,
    { count: number; readingsCount: number; interventions: InterventionMarker[] }
  >();

  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS);
    const dateKey = d.toISOString().slice(0, 10);
    dailyBuckets.set(dateKey, {
      count: 0,
      readingsCount: 0,
      interventions: [],
    });
  }

  // Per-barangay aggregation for the Barangay Risk Ranking Table
  const barangayStatsMap = new Map<
    string,
    {
      periodDetections: number;
      recent7DayDetections: number;
      prev7DayDetections: number;
    }
  >();
  const barangayDailyDetectionsMap = new Map<string, Map<string, number>>();

  for (const b of allBarangays) {
    barangayStatsMap.set(b.id, {
      periodDetections: 0,
      recent7DayDetections: 0,
      prev7DayDetections: 0,
    });
  }

  for (const r of rawReadings) {
    const tsStr = r.captured_at || r.created_at;
    if (!tsStr) continue;
    const ts = Date.parse(tsStr);
    if (Number.isNaN(ts)) continue;

    const count = r.mosquito_count ?? 0;
    const brgyId = deviceToBarangayId.get(r.device_id) ?? null;

    // Update per-barangay stats (across municipality)
    if (brgyId && barangayStatsMap.has(brgyId)) {
      const bStat = barangayStatsMap.get(brgyId)!;
      const dayKey = new Date(ts).toISOString().slice(0, 10);
      if (ts >= currentPeriodStartMs && ts <= now) {
        bStat.periodDetections += count;
        const dailyCounts = barangayDailyDetectionsMap.get(brgyId) ?? new Map<string, number>();
        dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + count);
        barangayDailyDetectionsMap.set(brgyId, dailyCounts);
      }
      if (ts >= sevenDaysAgoMs) {
        bStat.recent7DayDetections += count;
      } else if (ts >= fourteenDaysAgoMs && ts < sevenDaysAgoMs) {
        bStat.prev7DayDetections += count;
      }
    }

    // Check if reading belongs to scoped selection
    if (isFilteredByBarangay) {
      const matchesScoped =
        scopedDeviceIds.has(r.device_id) ||
        (brgyId !== null && scopedBarangayIds.has(brgyId));
      if (!matchesScoped) continue;
    } else if (
      allMunicipalityBarangayIds.length > 0 &&
      brgyId &&
      !allMunicipalityBarangayIds.includes(brgyId)
    ) {
      continue;
    }

    if (ts >= currentPeriodStartMs) {
      totalConfirmedVectors += count;
      totalReadingsCount += 1;

      const dateKey = new Date(ts).toISOString().slice(0, 10);
      const bucket = dailyBuckets.get(dateKey);
      if (bucket) {
        bucket.count += count;
        bucket.readingsCount += 1;
      }
    } else if (ts >= prevPeriodStartMs && ts < currentPeriodStartMs) {
      prevPeriodVectors += count;
    }
  }

  const avgDvi = Number(
    (totalConfirmedVectors / activeTrapsDenominator / periodDays).toFixed(2),
  );
  const prevDvi = prevPeriodVectors / activeTrapsDenominator / periodDays;

  const dviTrendPct =
    prevDvi > 0
      ? Math.round(((avgDvi - prevDvi) / prevDvi) * 100)
      : avgDvi > 0
        ? 12
        : 0;

  const vectorsTrendPct =
    prevPeriodVectors > 0
      ? Math.round(
          ((totalConfirmedVectors - prevPeriodVectors) / prevPeriodVectors) * 100,
        )
      : null;

  // 5. Process Triage Actions & Request Actions for:
  //    - Triage Completion Rate KPI
  //    - Completed Intervention Markers on AreaChart
  //    - Intervention Distribution Donut Chart
  const scopedTriage = rawTriage.filter((t) => {
    if (isFilteredByBarangay) {
      return t.barangay_id && scopedBarangayIds.has(t.barangay_id);
    }
    if (allMunicipalityBarangayIds.length > 0 && t.barangay_id) {
      return allMunicipalityBarangayIds.includes(t.barangay_id);
    }
    return true;
  });

  const totalTriageCount = scopedTriage.length;
  const completedTriageRows = scopedTriage.filter(
    (t) => String(t.status || "").toLowerCase() === "completed",
  );
  const completedTriageCount = completedTriageRows.length;
  const triageCompletionRate =
    totalTriageCount > 0
      ? Number(((completedTriageCount / totalTriageCount) * 100).toFixed(1))
      : 0;

  // Collect completed intervention markers for the AreaChart
  const interventions: InterventionMarker[] = [];

  for (const t of completedTriageRows) {
    const rawDate = t.completed_at || t.assigned_date || t.created_at;
    if (!rawDate) continue;
    const dateKey = String(rawDate).slice(0, 10);
    const brgyObj = Array.isArray(t.barangay) ? t.barangay[0] : t.barangay;
    const brgyName =
      brgyObj?.barangay_name ||
      (t.barangay_id ? barangayMap.get(t.barangay_id) : null) ||
      "Municipal";
    const textToClassify = `${t.trigger_source || ""} ${t.remarks || ""}`;
    const category = classifyInterventionCategory(textToClassify, t.priority);
    if (!category) continue;

    const marker: InterventionMarker = {
      id: `triage-${t.id}`,
      date: dateKey,
      type: category,
      barangayName: brgyName,
      title: t.trigger_source || category,
      status: "Completed",
    };

    if (dailyBuckets.has(dateKey)) {
      dailyBuckets.get(dateKey)!.interventions.push(marker);
      interventions.push(marker);
    }
  }

  // Also include approved/completed request_actions as intervention markers if within date buckets
  const scopedRequests = rawRequests.filter((req) => {
    const brgyId = req.device_id ? deviceToBarangayId.get(req.device_id) : null;
    if (isFilteredByBarangay) {
      return brgyId && scopedBarangayIds.has(brgyId);
    }
    if (allMunicipalityBarangayIds.length > 0 && brgyId) {
      return allMunicipalityBarangayIds.includes(brgyId);
    }
    return true;
  });

  for (const req of scopedRequests) {
    const resolvedStatus =
      req.status ||
      (req.approved_at ? "Approved" : req.completed_at ? "Completed" : "Pending");
    if (resolvedStatus !== "Approved" && resolvedStatus !== "Completed") continue;

    const rawDate = req.approved_at || req.completed_at || req.created_at;
    if (!rawDate) continue;
    const dateKey = String(rawDate).slice(0, 10);
    const brgyId = req.device_id ? deviceToBarangayId.get(req.device_id) : null;
    const brgyName = (brgyId ? barangayMap.get(brgyId) : null) || "Municipal";
    const textToClassify = `${req.request || ""} ${req.descriptions || ""} ${req.notes || ""}`;
    const category = classifyInterventionCategory(textToClassify);
    if (!category) continue;

    if (dailyBuckets.has(dateKey)) {
      const marker: InterventionMarker = {
        id: `req-${req.req_id}`,
        date: dateKey,
        type: category,
        barangayName: brgyName,
        title: req.request || category,
        status: resolvedStatus,
      };
      dailyBuckets.get(dateKey)!.interventions.push(marker);
      interventions.push(marker);
    }
  }

  // Build Intervention Distribution across action_triage_log and request_actions
  const distCounters: Record<
    "Solution Misting" | "Clean-up Drive" | "Monitoring Personnel",
    { total: number; completed: number }
  > = {
    "Solution Misting": { total: 0, completed: 0 },
    "Clean-up Drive": { total: 0, completed: 0 },
    "Monitoring Personnel": { total: 0, completed: 0 },
  };

  for (const t of scopedTriage) {
    const text = `${t.trigger_source || ""} ${t.remarks || ""}`;
    const cat = classifyInterventionCategory(text, t.priority);
    if (!cat) continue;
    distCounters[cat].total += 1;
    if (String(t.status || "").toLowerCase() === "completed") {
      distCounters[cat].completed += 1;
    }
  }

  for (const req of scopedRequests) {
    const text = `${req.request || ""} ${req.descriptions || ""} ${req.notes || ""}`;
    const cat = classifyInterventionCategory(text);
    if (!cat) continue;
    distCounters[cat].total += 1;
    const st = String(
      req.status || (req.approved_at ? "Approved" : ""),
    ).toLowerCase();
    if (st === "approved" || st === "completed") {
      distCounters[cat].completed += 1;
    }
  }

  const totalInterventionsCount =
    distCounters["Solution Misting"].total +
    distCounters["Clean-up Drive"].total +
    distCounters["Monitoring Personnel"].total;

  const interventionDistribution: InterventionDistributionItem[] = [
    {
      category: "Solution Misting",
      count: distCounters["Solution Misting"].total,
      completedCount: distCounters["Solution Misting"].completed,
      percentage:
        totalInterventionsCount > 0
          ? Math.round(
              (distCounters["Solution Misting"].total / totalInterventionsCount) *
                100,
            )
          : 0,
      color: "#10b981", // Emerald-500
    },
    {
      category: "Clean-up Drive",
      count: distCounters["Clean-up Drive"].total,
      completedCount: distCounters["Clean-up Drive"].completed,
      percentage:
        totalInterventionsCount > 0
          ? Math.round(
              (distCounters["Clean-up Drive"].total / totalInterventionsCount) *
                100,
            )
          : 0,
      color: "#0ea5e9", // Sky-500
    },
    {
      category: "Monitoring Personnel",
      count: distCounters["Monitoring Personnel"].total,
      completedCount: distCounters["Monitoring Personnel"].completed,
      percentage:
        totalInterventionsCount > 0
          ? Math.round(
              (distCounters["Monitoring Personnel"].total /
                totalInterventionsCount) *
                100,
            )
          : 0,
      color: "#f59e0b", // Amber-500
    },
  ];

  // Build daily VectorGrowthTrendPoint array
  const vectorTrend: VectorGrowthTrendPoint[] = Array.from(
    dailyBuckets.entries(),
  ).map(([date, bucket]) => {
    const parsedDate = new Date(`${date}T00:00:00`);
    const label = parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      date,
      label,
      mosquitoCount: bucket.count,
      dvi: Number((bucket.count / activeTrapsDenominator).toFixed(2)),
      readingsCount: bucket.readingsCount,
      interventions: bucket.interventions,
      hasIntervention: bucket.interventions.length > 0,
    };
  });

  // 6. Build Barangay Risk Ranking Table & Critical / High-Risk Zones KPI
  // Keep latest risk_assessment per barangay
  const latestRiskByBarangay = new Map<string, any>();
  for (const row of rawRisks) {
    if (row.barangay_id && !latestRiskByBarangay.has(row.barangay_id)) {
      latestRiskByBarangay.set(row.barangay_id, row);
    }
  }

  // Group devices by barangay_id
  const devicesByBarangay = new Map<
    string,
    { active: number; total: number }
  >();
  for (const d of municipalityDevices) {
    if (!d.barangay_id) continue;
    const cur = devicesByBarangay.get(d.barangay_id) ?? { active: 0, total: 0 };
    cur.total += 1;
    if (isDeviceDeployedAndActive(d)) {
      cur.active += 1;
    }
    devicesByBarangay.set(d.barangay_id, cur);
  }

  const targetTableBarangays = isFilteredByBarangay
    ? scopedBarangays
    : allBarangays;

  const unrankedRows: Omit<BarangayRiskTableRow, "rank">[] =
    targetTableBarangays.map((b) => {
      const devCounts = devicesByBarangay.get(b.id) ?? { active: 0, total: 0 };
      const bStat = barangayStatsMap.get(b.id) ?? {
        periodDetections: 0,
        recent7DayDetections: 0,
        prev7DayDetections: 0,
      };

      const computedDvi = Number(
        (
          bStat.periodDetections /
          Math.max(1, devCounts.active || devCounts.total || 1) /
          periodDays
        ).toFixed(2),
      );

      const latestRisk = latestRiskByBarangay.get(b.id);

      const dailyCounts = barangayDailyDetectionsMap.get(b.id);
      const dailyAverages = Array.from({ length: periodDays }, (_, offset) => {
        const day = new Date(now);
        day.setUTCHours(0, 0, 0, 0);
        day.setUTCDate(day.getUTCDate() - (periodDays - 1 - offset));
        return (dailyCounts?.get(day.toISOString().slice(0, 10)) ?? 0) /
          Math.max(1, devCounts.active || devCounts.total || 1);
      });
      let consecutiveCriticalDays = 0;
      let criticalDayStreak = 0;
      for (const dailyAverage of dailyAverages) {
        criticalDayStreak = dailyAverage >= 30 ? criticalDayStreak + 1 : 0;
        consecutiveCriticalDays = Math.max(consecutiveCriticalDays, criticalDayStreak);
      }
      const inferred = inferRiskFromDvi(computedDvi, consecutiveCriticalDays);

      const riskLevelName = inferred.levelName;
      const displayColor = inferred.displayColor;
      const riskPriority = inferred.priority;

      const calculatedScoreDvi = computedDvi;

      let trend7DayPct: number | null = null;
      if (bStat.prev7DayDetections > 0) {
        trend7DayPct = Math.round(
          ((bStat.recent7DayDetections - bStat.prev7DayDetections) /
            bStat.prev7DayDetections) *
            100,
        );
      } else if (bStat.recent7DayDetections > 0) {
        trend7DayPct = 100;
      } else {
        trend7DayPct = 0;
      }

      return {
        barangayId: b.id,
        barangayName: b.barangay_name,
        municipality: b.municipality ?? null,
        activeTraps: devCounts.active,
        totalTraps: devCounts.total,
        totalDetections: bStat.periodDetections,
        calculatedScoreDvi,
        riskLevelName,
        displayColor,
        riskPriority,
        trend7DayPct,
        recent7DayCount: bStat.recent7DayDetections,
        prev7DayCount: bStat.prev7DayDetections,
        lastAssessedAt: latestRisk?.assessment_period_end ?? null,
      };
    });

  // Sort by risk priority desc, then calculatedScoreDvi desc, then totalDetections desc
  unrankedRows.sort(
    (a, b) =>
      b.riskPriority - a.riskPriority ||
      b.calculatedScoreDvi - a.calculatedScoreDvi ||
      b.totalDetections - a.totalDetections,
  );

  const barangayRankings: BarangayRiskTableRow[] = unrankedRows.map(
    (row, idx) => ({
      ...row,
      rank: idx + 1,
    }),
  );

  // Critical / High-Risk Zones count from risk_assessments / barangayRankings
  let criticalCount = 0;
  let highRiskCount = 0;
  for (const row of barangayRankings) {
    const lower = row.riskLevelName.toLowerCase();
    if (lower.includes("critical") || lower.includes("red")) {
      criticalCount += 1;
    } else if (lower.includes("high") || lower.includes("orange")) {
      highRiskCount += 1;
    }
  }
  const criticalHighRiskZones = criticalCount + highRiskCount;

  return {
    municipality,
    barangayOptions,
    kpis: {
      avgDvi,
      dviTrendPct,
      totalConfirmedVectors,
      vectorsTrendPct,
      totalReadingsCount,
      criticalHighRiskZones,
      criticalCount,
      highRiskCount,
      triageCompletionRate,
      completedTriageCount,
      totalTriageCount,
      activeDeployedTraps,
      periodDays,
    },
    vectorTrend,
    interventions,
    interventionDistribution,
    barangayRankings,
  };
}
