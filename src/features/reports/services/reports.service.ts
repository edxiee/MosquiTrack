import { supabase } from "@/lib/supabase";
import type {
  BarangayRankingEntry,
  DeviceStatusSummaryEntry,
  RawTelemetryRow,
  ReportsFilterValues,
} from "../types/reports.types";

// ---------- Telemetry readings (for trend + summary calculations) ----------

interface RawReadingRow {
  captured_at: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  egg_count: number | null;
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
  egg_count,
  device_id,
  device:ovitrap_devices (
    device_code,
    barangay_id,
    barangay:barangays ( barangay_name )
  )
`;

function flattenReading(row: RawReadingRow): RawTelemetryRow {
  return {
    captured_at: row.captured_at,
    temperature_c: row.temperature_c,
    humidity_percent: row.humidity_percent,
    egg_count: row.egg_count,
    device_id: row.device_id,
    device_code: row.device?.device_code ?? "Unknown",
    barangay_id: row.device?.barangay_id ?? null,
    barangay_name: row.device?.barangay?.barangay_name ?? null,
  };
}

/**
 * Readings within the filter's date range, further narrowed by
 * barangay/device client-side (dataset size here is small enough
 * that this stays simple and reliable).
 */
export async function getFilteredReadings(
  filters: Pick<ReportsFilterValues, "dateFrom" | "dateTo" | "barangay" | "device">,
): Promise<RawTelemetryRow[]> {
  let query = supabase
    .from("ovitrap_readings")
    .select(READING_SELECT)
    .order("captured_at", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("captured_at", `${filters.dateFrom}T00:00:00`);
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
  const summary = await getDeviceStatusSummary({ barangay: "all", status: "all" });
  const active = summary.find((s) => s.statusName === "Active")?.count ?? 0;
  const total = summary.reduce((sum, s) => sum + s.count, 0);
  return { active, offline: total - active };
}

// ---------- Barangay risk ranking ----------

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

/**
 * Each barangay's most recent risk assessment, ranked by risk level
 * priority (then score), highest risk first.
 */
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

  // Keep only the latest assessment per barangay
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
  return ranking.filter((e) => e.riskLevelName === "High").length;
}

// ---------- Filter option lists ----------

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