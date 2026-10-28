import { supabase } from "@/lib/supabase";

export const DEFAULT_DEVICE_UUID = "ad36e7ae-8a93-4c09-95cc-97ad348e6bfd";

export interface DeviceConfig {
  device_id: string;
  send_interval_ms: number;
  min_freq_hz: number;
  max_freq_hz: number;
  max_beam_break_ms: number;
  is_active: boolean;
  force_reboot: boolean;
  updated_at?: string | null;
}

export interface ConfigurableOvitrapDevice {
  id: string;
  device_code: string;
  serial_number: string | null;
  description: string | null;
  notes: string | null;
  last_seen_at: string | null;
  barangay_name: string | null;
  municipality: string | null;
}

export const DEFAULT_DEVICE_CONFIG: Omit<DeviceConfig, "device_id" | "updated_at"> = {
  send_interval_ms: 30000,
  min_freq_hz: 300.0,
  max_freq_hz: 700.0,
  max_beam_break_ms: 100,
  is_active: true,
  force_reboot: false,
};

export async function fetchConfigurableDevices(): Promise<ConfigurableOvitrapDevice[]> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      serial_number,
      description,
      notes,
      last_seen_at,
      barangays (
        barangay_name,
        municipality
      )
    `
    )
    .order("device_code", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as any[]).map((d) => {
    const rawBrgy = Array.isArray(d.barangays) ? d.barangays[0] : d.barangays;
    return {
      id: d.id,
      device_code: d.device_code || `TRAP-${String(d.id).slice(0, 6)}`,
      serial_number: d.serial_number ?? null,
      description: d.description ?? null,
      notes: d.notes ?? null,
      last_seen_at: d.last_seen_at ?? null,
      barangay_name: rawBrgy?.barangay_name ?? null,
      municipality: rawBrgy?.municipality ?? null,
    };
  });
}

/**
 * Fetches the matching config row from `device_configs` for `deviceId`.
 * If no row exists yet, automatically upserts a default row and returns it.
 */
export async function fetchOrCreateDeviceConfig(
  deviceId: string
): Promise<DeviceConfig> {
  const { data, error } = await supabase
    .from("device_configs")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return normalizeDeviceConfig(data as any, deviceId);
  }

  const defaultRow = {
    device_id: deviceId,
    ...DEFAULT_DEVICE_CONFIG,
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error: upsertError } = await supabase
    .from("device_configs")
    .upsert(defaultRow, { onConflict: "device_id" })
    .select("*")
    .single();

  if (upsertError) throw upsertError;

  return normalizeDeviceConfig(upserted as any, deviceId);
}

export async function saveDeviceConfig(
  config: Omit<DeviceConfig, "updated_at">
): Promise<DeviceConfig> {
  const payload = {
    device_id: config.device_id,
    send_interval_ms: Math.max(5000, Math.round(config.send_interval_ms)),
    min_freq_hz: Number(config.min_freq_hz),
    max_freq_hz: Number(config.max_freq_hz),
    max_beam_break_ms: Math.min(500, Math.max(20, Math.round(config.max_beam_break_ms))),
    is_active: Boolean(config.is_active),
    force_reboot: Boolean(config.force_reboot),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("device_configs")
    .upsert(payload, { onConflict: "device_id" })
    .select("*")
    .single();

  if (error) throw error;

  return normalizeDeviceConfig(data as any, config.device_id);
}

export async function queueDeviceReboot(deviceId: string): Promise<DeviceConfig> {
  const { data, error } = await supabase
    .from("device_configs")
    .update({
      force_reboot: true,
      updated_at: new Date().toISOString(),
    })
    .eq("device_id", deviceId)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeDeviceConfig(data as any, deviceId);
}

export function normalizeDeviceConfig(
  raw: Record<string, any>,
  fallbackDeviceId: string
): DeviceConfig {
  return {
    device_id: String(raw.device_id ?? fallbackDeviceId),
    send_interval_ms: Number(
      raw.send_interval_ms ?? DEFAULT_DEVICE_CONFIG.send_interval_ms
    ),
    min_freq_hz: Number(raw.min_freq_hz ?? DEFAULT_DEVICE_CONFIG.min_freq_hz),
    max_freq_hz: Number(raw.max_freq_hz ?? DEFAULT_DEVICE_CONFIG.max_freq_hz),
    max_beam_break_ms: Number(
      raw.max_beam_break_ms ?? DEFAULT_DEVICE_CONFIG.max_beam_break_ms
    ),
    is_active:
      raw.is_active !== undefined
        ? Boolean(raw.is_active)
        : DEFAULT_DEVICE_CONFIG.is_active,
    force_reboot:
      raw.force_reboot !== undefined
        ? Boolean(raw.force_reboot)
        : DEFAULT_DEVICE_CONFIG.force_reboot,
    updated_at: raw.updated_at ?? null,
  };
}

