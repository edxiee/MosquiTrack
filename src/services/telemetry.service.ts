import { supabase } from "@/lib/supabase";
import type { TelemetryReading } from "@/types/telemetry.types";

// Raw shape as it comes back from Supabase before flattening the joins
interface RawReadingRow {
  id: string;
  captured_at: string;
  mosquito_count?: number | null;
  image_path: string | null;
  ai_confidence: number | null;
  battery_level: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  device_id: string;
  device: {
    device_code: string;
    barangay: { barangay_name: string } | null;
    device_status: { status_name: string } | null;
  } | null;
}

const READING_SELECT = `
  id,
  captured_at,
  created_at,
  updated_at,
  mosquito_count,
  image_path,
  ai_confidence,
  battery_level,
  temperature_c,
  humidity_percent,
  device_id,
  ovitrap_devices (
    id,
    device_code,
    latitude,
    longitude,
    barangays ( id, barangay_name ),
    device_statuses ( id, status_name )
  )
`;

function flattenReading(row: any): TelemetryReading {
  const rawDevice = row.ovitrap_devices ?? row.device;
  const device = Array.isArray(rawDevice) ? rawDevice[0] : rawDevice;

  const rawBarangay = device?.barangays ?? device?.barangay;
  const barangay = Array.isArray(rawBarangay) ? rawBarangay[0] : rawBarangay;

  const rawStatus = device?.device_statuses ?? device?.device_status;
  const deviceStatus = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;

  const count = row.mosquito_count ?? null;

  return {
    id: row.id,
    captured_at: row.captured_at,
    created_at: row.created_at ?? row.captured_at,
    updated_at: row.updated_at ?? null,
    mosquito_count: count,
    image_path: row.image_path,
    ai_confidence: row.ai_confidence,
    battery_level: row.battery_level,
    temperature_c: row.temperature_c,
    humidity_percent: row.humidity_percent,
    device_id: row.device_id,
    device_code: device?.device_code ?? "Unknown",
    latitude: device?.latitude ?? null,
    longitude: device?.longitude ?? null,
    barangay_name: barangay?.barangay_name ?? null,
    status_name: deviceStatus?.status_name ?? null,
  };
}

/** Most recent readings, newest first. */
export async function getTelemetry(limit = 200): Promise<TelemetryReading[]> {
  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select(READING_SELECT)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as unknown as RawReadingRow[]).map(flattenReading);
}

export interface DeviceReadingSummary {
  id: string;
  device_id?: string;
  captured_at: string;
  created_at?: string;
  updated_at?: string | null;
  mosquito_count: number | null;
  battery_level: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  ai_confidence: number | null;
  image_path?: string | null;
  device_code?: string;
  barangay_name?: string | null;
  status_name?: string | null;
}

/** Latest readings for a single trap, newest first. */
export async function getDeviceReadings(
  deviceId: string,
  limit = 100,
): Promise<DeviceReadingSummary[]> {
  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select(
      "id, device_id, captured_at, created_at, updated_at, mosquito_count, battery_level, temperature_c, humidity_percent, ai_confidence, image_path",
    )
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    captured_at: r.captured_at || r.created_at,
  })) as DeviceReadingSummary[];
}

export interface DeviceMosquitoStats {
  todaySum: number;
  todayPingsCount: number;
  allTimeSum: number;
  allTimePingsCount: number;
  latestCount: number | null;
}

/**
 * Calculates accurate mosquito counts and ping metrics directly from ovitrap_readings table for a device.
 */
export async function getDeviceMosquitoStats(
  deviceId: string,
): Promise<DeviceMosquitoStats> {
  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select("captured_at, created_at, mosquito_count")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch device mosquito stats:", error);
    return {
      todaySum: 0,
      todayPingsCount: 0,
      allTimeSum: 0,
      allTimePingsCount: 0,
      latestCount: null,
    };
  }

  const readings = data ?? [];
  const todayDateStr = new Date().toISOString().slice(0, 10);

  let todaySum = 0;
  let todayPingsCount = 0;
  let allTimeSum = 0;
  const latestCount = readings.length > 0 ? readings[0]?.mosquito_count ?? 0 : null;

  for (const r of readings) {
    const time = r.captured_at || r.created_at || "";
    const count = r.mosquito_count ?? 0;
    allTimeSum += count;

    if (time.startsWith(todayDateStr)) {
      todaySum += count;
      todayPingsCount++;
    }
  }

  return {
    todaySum,
    todayPingsCount,
    allTimeSum,
    allTimePingsCount: readings.length,
    latestCount,
  };
}


/** Fetch one reading (with joins) by id — used to hydrate realtime inserts. */
export async function getTelemetryById(
  id: string,
): Promise<TelemetryReading | null> {
  const { data, error } = await supabase
    .from("ovitrap_readings")
    .select(READING_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch telemetry reading:", error);
    return null;
  }
  return flattenReading(data as unknown as RawReadingRow);
}

/** Counts devices by whether their current status is "Active" or not. */
export async function getDeviceStatusCounts(): Promise<{
  online: number;
  offline: number;
}> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select("device_status:device_statuses ( status_name )");

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    device_status: { status_name: string } | null;
  }[];

  const online = rows.filter(
    (r) =>
      r.device_status?.status_name === "Active" ||
      r.device_status?.status_name === "Online",
  ).length;
  const offline = rows.length - online;

  return { online, offline };
}

export async function getBarangayOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("barangay_name")
    .order("barangay_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => r.barangay_name);
}

export async function getDeviceStatusOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("device_statuses")
    .select("status_name")
    .order("status_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => r.status_name);
}

/**
 * Subscribes to new ovitrap_readings rows as they're inserted.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToNewReadings(
  onInsert: (reading: TelemetryReading) => void,
  onUpdate?: (reading: TelemetryReading) => void,
): () => void {
  const channel = supabase
    .channel("ovitrap_readings-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ovitrap_readings" },
      async (payload) => {
        // Handle both INSERT and UPDATE
        const record = payload.new as { id?: string };
        if (!record || !record.id) return;
        
        const reading = await getTelemetryById(record.id);
        if (!reading) return;

        if (payload.eventType === "INSERT") {
          onInsert(reading);
        } else if (payload.eventType === "UPDATE" && onUpdate) {
          onUpdate(reading);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
