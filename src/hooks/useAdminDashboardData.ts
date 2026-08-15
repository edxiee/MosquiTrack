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
  egg_count: number;
  battery_level: number | null;
  captured_at: string;
  created_at: string;
  humidity_percent: number | null;
  temperature_c: number | null;
  ai_confidence: number | null;
  image_path: string | null;
};

const ONLINE_WINDOW_MINUTES = 15;
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
      "id, device_id, egg_count, battery_level, captured_at, created_at, humidity_percent, temperature_c, ai_confidence, image_path"
    )
    .order("captured_at", { ascending: false })
    .limit(RECENT_FEED_LIMIT);

  if (error) {
    throw error;
  }

  return data ?? [];
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

  const telemetryRateQuery = useQuery({
    queryKey: ["admin-dashboard", "telemetry-rate"],
    queryFn: fetchTelemetryRate,
    refetchInterval: 30_000,
  });

  const devices = devicesQuery.data ?? [];
  const recentReadings = recentReadingsQuery.data ?? [];

  const onlineDevices = devices.filter((device) => {
    if (!device.last_seen_at) {
      return false;
    }

    const lastSeenAt = Date.parse(device.last_seen_at);

    if (Number.isNaN(lastSeenAt)) {
      return false;
    }

    return (
      Date.now() - lastSeenAt <= ONLINE_WINDOW_MINUTES * 60_000
    );
  });

  const deviceMap = new Map(
    devices.map((device) => [device.id, device])
  );

  const latestReadingsByDevice = new Map<string, ReadingRow>();

  for (const reading of recentReadings) {
    if (!latestReadingsByDevice.has(reading.device_id)) {
      latestReadingsByDevice.set(reading.device_id, reading);
    }
  }

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
    telemetryRateQuery,
    devices,
    recentReadings,
    onlineDevices,
    deviceMap,
    lowBatteryDevices,
    counts: {
      registeredNodes: devices.length,
      onlineNodes: onlineDevices.length,
      activeAccounts: activeAccountsQuery.data ?? 0,
      telemetryRatePerMinute: telemetryRateQuery.data ?? 0,
      lowBatteryNodes: lowBatteryDevices.length,
    },
  };
}
