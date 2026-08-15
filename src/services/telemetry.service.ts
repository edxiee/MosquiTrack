import { supabase } from "@/lib/supabase";
import type { TelemetryReading } from "@/types/telemetry.types";

// Raw shape as it comes back from Supabase before flattening the joins
interface RawReadingRow {
  id: string;
  captured_at: string;
  egg_count: number | null;
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
  egg_count,
  image_path,
  ai_confidence,
  battery_level,
  temperature_c,
  humidity_percent,
  device_id,
  device:ovitrap_devices (
    device_code,
    barangay:barangays ( barangay_name ),
    device_status:device_statuses ( status_name )
  )
`;

function flattenReading(row: RawReadingRow): TelemetryReading {
  return {
    id: row.id,
    captured_at: row.captured_at,
    egg_count: row.egg_count,
    image_path: row.image_path,
    ai_confidence: row.ai_confidence,
    battery_level: row.battery_level,
    temperature_c: row.temperature_c,
    humidity_percent: row.humidity_percent,
    device_id: row.device_id,
    device_code: row.device?.device_code ?? "Unknown",
    barangay_name: row.device?.barangay?.barangay_name ?? null,
    status_name: row.device?.device_status?.status_name ?? null,
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
    (r) => r.device_status?.status_name === "Active",
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
): () => void {
  const channel = supabase
    .channel("ovitrap_readings-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ovitrap_readings" },
      async (payload) => {
        const newId = (payload.new as { id: string }).id;
        const reading = await getTelemetryById(newId);
        if (reading) onInsert(reading);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
