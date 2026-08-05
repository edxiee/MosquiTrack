import { supabase } from "@/lib/supabase";
import { ACTIVE_STATUS_ID } from "../constants/device";
import type { OvitrapDevice, DeviceStatus, Barangay } from "../types/device";

export async function fetchDevices(): Promise<OvitrapDevice[]> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      serial_number,
      description,
      barangay_id,
      latitude,
      longitude,
      device_status_id,
      notes,
      installation_date,
      last_seen_at,
      created_at,
      deployed_by,
      device_statuses (
        id,
        status_name,
        description
      ),
      users:deployed_by (
        first_name,
        last_name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as OvitrapDevice[]) ?? [];
}

export async function fetchStatuses(): Promise<DeviceStatus[]> {
  const { data, error } = await supabase
    .from("device_statuses")
    .select("id, status_name, description")
    .order("status_name");

  if (error) throw error;
  return (data as DeviceStatus[]) ?? [];
}

export async function fetchBarangays(): Promise<Barangay[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("id, barangay_name, municipality, province")
    .order("barangay_name");

  if (error) throw error;
  return (data as Barangay[]) ?? [];
}

/** Only force Active when status is Offline AND lat+lng+deployed_by exist */
export async function maybeForceActive(
  deviceId: string,
  currentStatusName: string | undefined,
  lat: number | null,
  lng: number | null,
  deployedBy: string | null
) {
  if (
    currentStatusName === "Offline" &&
    lat != null &&
    lng != null &&
    deployedBy != null
  ) {
    await supabase
      .from("ovitrap_devices")
      .update({
        device_status_id: ACTIVE_STATUS_ID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deviceId);
  }
}

export async function setDeployedBy(deviceId: string, userId: string) {
  const { error } = await supabase
    .from("ovitrap_devices")
    .update({
      deployed_by: userId,
      updated_at: new Date().toISOString(),
    } as any )
    .eq("id", deviceId);

  if (error) throw error;
}

export async function pickUpDevice(deviceId: string, offlineStatusId: string) {
  const { error } = await supabase
    .from("ovitrap_devices")
    .update({
      device_status_id: offlineStatusId,
      latitude: null,
      longitude: null,
      deployed_by: null,
      updated_at: new Date().toISOString(),
    } as any )
    .eq("id", deviceId);

  if (error) throw error;
}

export async function createDevice(payload: Record<string, unknown>) {
  const { error } = await supabase.from("ovitrap_devices").insert({
    ...payload,
    latitude: null as number | null,
    longitude: null as number | null,
  } as any);
  if (error) throw error;
}

export async function updateDevice(
  deviceId: string,
  payload: Record<string, unknown>
) {
  const { error } = await supabase
    .from("ovitrap_devices")
    .update(payload as any)
    .eq("id", deviceId);
  if (error) throw error;
}

/** Fetch only devices that belong to the logged-in user’s barangay */
export async function fetchDevicesForCurrentUser(): Promise<OvitrapDevice[]> {
  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 2. Get the user’s profile (barangay + municipality)
  const { data: profile, error: profileError } = await supabase
    .from("users" as any)
    .select("barangay, municipality")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile error:", profileError);
    throw new Error("Could not load user profile");
  }

  const userProfile = profile as any as {
    barangay: string | null;
    municipality: string | null;
  };

  if (!userProfile.barangay) {
    // User has no barangay assigned → return empty list
    return [];
  }

  // 3. Find the matching barangay record
  let barangayQuery = supabase
    .from("barangays")
    .select("id")
    .eq("barangay_name", userProfile.barangay);

  if (userProfile.municipality) {
    barangayQuery = barangayQuery.eq(
      "municipality",
      userProfile.municipality
    );
  }

  const { data: barangayRow, error: barangayError } =
    await barangayQuery.maybeSingle();

  if (barangayError) {
    throw barangayError;
  }

  if (!barangayRow) {
    return [];
  }

  const matchedBarangay = barangayRow as { id: string };

  // 4. Fetch devices that belong to this barangay
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      serial_number,
      description,
      barangay_id,
      latitude,
      longitude,
      device_status_id,
      notes,
      installation_date,
      last_seen_at,
      created_at,
      deployed_by,
      device_statuses (
        id,
        status_name,
        description
      ),
      users:deployed_by (
        first_name,
        last_name
      )
    `
    )
    .eq("barangay_id", matchedBarangay.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as OvitrapDevice[]) ?? [];
}