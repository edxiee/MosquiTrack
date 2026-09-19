import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type DeviceRow = {
  id: string;
  device_code: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReadingRow = {
  id: string;
  device_id: string;
  mosquito_count?: number;
  battery_level: number | null;
  captured_at: string;
  created_at: string;
  humidity_percent: number | null;
  temperature_c: number | null;
  ai_confidence: number | null;
  image_path: string | null;
};

export type TriageActionRow = {
  id: string;
  barangay_id?: string;
  device_id: string | null;
  trigger_source: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  assigned_to?: string | null;
  assigned_date?: string;
  due_date?: string | null;
  completed_at?: string | null;
  remarks?: string | null;
  created_at: string;
  device?: { device_code: string } | null;
};

const ONLINE_WINDOW_MINUTES = 16;
const TELEMETRY_WINDOW_MINUTES = 60;
const RECENT_FEED_LIMIT = 12;

function minutesAgoIso(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function fetchActiveAccountsCount() {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function fetchDevices() {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select("id, device_code, last_seen_at, created_at, updated_at")
    .order("device_code", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchRecentReadings() {
  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select(
      "id, device_id, mosquito_count, battery_level, captured_at, created_at, humidity_percent, temperature_c, ai_confidence, image_path"
    )
    .order("captured_at", { ascending: false })
    .limit(RECENT_FEED_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []).map((r: any) => ({
    ...r,
    mosquito_count: r.mosquito_count ?? 0,
  }));
}

async function fetchTelemetryRate() {
  const since = minutesAgoIso(TELEMETRY_WINDOW_MINUTES);

  const { count, error } = await supabase
    .from("ovitrap_readings")
    .select("id", { count: "exact", head: true })
    .gte("captured_at", since);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function fetchWeeklyReadings() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select("id, mosquito_count, captured_at, created_at")
    .gte("captured_at", sevenDaysAgo.toISOString())
    .order("captured_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    mosquito_count: r.mosquito_count ?? 0,
    captured_at: r.captured_at || r.created_at,
  }));
}

async function fetchTelemetry24hCount() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("ovitrap_readings")
    .select("id", { count: "exact", head: true })
    .gte("captured_at", since);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function fetchTriageActions(): Promise<TriageActionRow[]> {
  try {
    const { data, error } = await supabase
      .from("action_triage_log")
      .select(
        "id, barangay_id, device_id, trigger_source, priority, status, assigned_to, assigned_date, due_date, completed_at, remarks, created_at, device:ovitrap_devices ( device_code )"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Could not query action_triage_log:", error.message);
      return [];
    }
    return (data ?? []) as unknown as TriageActionRow[];
  } catch (err) {
    console.warn("Error fetching action_triage_log:", err);
    return [];
  }
}

export function useAdminDashboardData() {
  const activeAccountsQuery = useQuery({
    queryKey: ["admin-dashboard", "active-accounts"],
    queryFn: fetchActiveAccountsCount,
    refetchInterval: 30_000,
  });

  const devicesQuery = useQuery<DeviceRow[]>({
    queryKey: ["admin-dashboard", "devices"],
    queryFn: fetchDevices,
    refetchInterval: 30_000,
  });

  const recentReadingsQuery = useQuery<ReadingRow[]>({
    queryKey: ["admin-dashboard", "recent-readings"],
    queryFn: fetchRecentReadings,
    refetchInterval: 30_000,
  });

  const triageActionsQuery = useQuery<TriageActionRow[]>({
    queryKey: ["admin-dashboard", "triage-actions"],
    queryFn: fetchTriageActions,
    refetchInterval: 30_000,
  });

  const telemetryRateQuery = useQuery({
    queryKey: ["admin-dashboard", "telemetry-rate"],
    queryFn: fetchTelemetryRate,
    refetchInterval: 30_000,
  });

  const weeklyReadingsQuery = useQuery({
    queryKey: ["admin-dashboard", "weekly-readings"],
    queryFn: fetchWeeklyReadings,
    refetchInterval: 30_000,
  });

  const telemetry24hQuery = useQuery({
    queryKey: ["admin-dashboard", "telemetry-24h"],
    queryFn: fetchTelemetry24hCount,
    refetchInterval: 30_000,
  });

  const devices = devicesQuery.data ?? [];
  const recentReadings = recentReadingsQuery.data ?? [];
  const weeklyReadings = weeklyReadingsQuery.data ?? [];

  const latestReadingsByDevice = new Map<string, ReadingRow>();
  for (const reading of recentReadings) {
    if (!latestReadingsByDevice.has(reading.device_id)) {
      latestReadingsByDevice.set(reading.device_id, reading);
    }
  }

  const onlineDevices = devices.filter((device) => {
    const latestReading = latestReadingsByDevice.get(device.id);
    const lastSeenStr = latestReading?.captured_at || latestReading?.created_at || device.last_seen_at;

    if (!lastSeenStr) {
      return false;
    }

    const lastSeenAt = Date.parse(lastSeenStr);
    if (Number.isNaN(lastSeenAt)) {
      return false;
    }

    return Date.now() - lastSeenAt <= ONLINE_WINDOW_MINUTES * 60_000;
  });

  const deviceMap = new Map(
    devices.map((device) => [device.id, device])
  );

  const lowBatteryDevices = Array.from(
    latestReadingsByDevice.values()
  ).filter((reading) => {
    if (reading.battery_level === null) {
      return false;
    }

    return reading.battery_level < 3.4;
  });

  return {
    activeAccountsQuery,
    devicesQuery,
    recentReadingsQuery,
    triageActionsQuery,
    telemetryRateQuery,
    weeklyReadingsQuery,
    telemetry24hQuery,
    devices,
    recentReadings,
    weeklyReadings,
    onlineDevices,
    deviceMap,
    latestReadingsByDevice,
    lowBatteryDevices,
    triageActions: triageActionsQuery.data ?? [],
    counts: {
      registeredNodes: devices.length,
      onlineNodes: onlineDevices.length,
      activeAccounts: activeAccountsQuery.data ?? 0,
      telemetryRatePerMinute: telemetryRateQuery.data ?? 0,
      telemetry24h: telemetry24hQuery.data ?? 0,
      lowBatteryNodes: lowBatteryDevices.length,
    },
  };
}
