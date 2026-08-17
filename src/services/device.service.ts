import { supabase } from "@/lib/supabase";
import type { OvitrapDevice, DeviceStatus, Barangay, UserName } from "@/types/device.types";

export async function fetchDevices(): Promise<OvitrapDevice[]> {
  const { data: devicesData, error: devicesError } = await supabase
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
      barangays (
        id,
        barangay_name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (devicesError) throw devicesError;
  if (!devicesData || devicesData.length === 0) return [];

  const userIds = Array.from(
    new Set(devicesData.map((d) => d.deployed_by).filter(Boolean))
  ) as string[];

  const userMap = new Map<string, UserName>();
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    if (profilesData) {
      for (const p of profilesData) {
        userMap.set(p.id, {
          first_name: p.first_name,
          last_name: p.last_name,
        });
      }
    }
  }

  return devicesData.map((d: any) => {
    const rawStatus = d.device_statuses;
    const rawBarangay = d.barangays;
    return {
      ...d,
      device_statuses: Array.isArray(rawStatus) ? rawStatus[0] ?? null : rawStatus ?? null,
      barangays: Array.isArray(rawBarangay) ? rawBarangay[0] ?? null : rawBarangay ?? null,
      users: d.deployed_by ? userMap.get(d.deployed_by) ?? null : null,
    };
  }) as unknown as OvitrapDevice[];
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
    const { data: activeStatus } = await supabase
      .from("device_statuses")
      .select("id")
      .ilike("status_name", "Active")
      .maybeSingle();

    if (activeStatus) {
      await supabase
        .from("ovitrap_devices")
        .update({
          device_status_id: activeStatus.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deviceId);
    }
  }
}

export async function setDeployedBy(deviceId: string, userId: string) {
  const { error } = await supabase
    .from("ovitrap_devices")
    .update({
      deployed_by: userId,
      updated_at: new Date().toISOString(),
    } as any)
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
    } as any)
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

  // 2. Get the user’s profile (barangay, municipality, barangay_id)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("barangay, municipality, barangay_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile error:", profileError);
    throw profileError;
  }

  if (!profile) {
    return [];
  }

  const userProfile = profile as {
    barangay: string | null;
    municipality: string | null;
    barangay_id: string | null;
  };

  let targetBarangayId = userProfile.barangay_id;

  if (!targetBarangayId && userProfile.barangay) {
    // 3. Find the matching barangay record by name if barangay_id is not on profile
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

    const { data: barangayRow } = await barangayQuery.maybeSingle();
    if (barangayRow) {
      targetBarangayId = (barangayRow as { id: string }).id;
    }
  }

  if (!targetBarangayId) {
    return [];
  }

  // 4. Fetch devices that belong to this barangay
  const { data: devicesData, error: devicesError } = await supabase
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
      barangays (
        id,
        barangay_name
      )
    `
    )
    .eq("barangay_id", targetBarangayId)
    .order("created_at", { ascending: false });

  if (devicesError) throw devicesError;
  if (!devicesData || devicesData.length === 0) return [];

  // 5. Hydrate user profiles
  const userIds = Array.from(
    new Set(devicesData.map((d) => d.deployed_by).filter(Boolean))
  ) as string[];

  const userMap = new Map<string, UserName>();
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    if (profilesData) {
      for (const p of profilesData) {
        userMap.set(p.id, {
          first_name: p.first_name,
          last_name: p.last_name,
        });
      }
    }
  }

  return devicesData.map((d: any) => {
    const rawStatus = d.device_statuses;
    const rawBarangay = d.barangays;
    return {
      ...d,
      device_statuses: Array.isArray(rawStatus) ? rawStatus[0] ?? null : rawStatus ?? null,
      barangays: Array.isArray(rawBarangay) ? rawBarangay[0] ?? null : rawBarangay ?? null,
      users: d.deployed_by ? userMap.get(d.deployed_by) ?? null : null,
    };
  }) as unknown as OvitrapDevice[];
}
