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
    .order("created_at", { ascending: true });

  if (devicesError) throw devicesError;
  if (!devicesData || devicesData.length === 0) return [];

  const deviceIds = devicesData.map((d: any) => d.id);
  const userIds = Array.from(
    new Set(devicesData.map((d) => d.deployed_by).filter(Boolean))
  ) as string[];

  const [profilesRes, readingsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: null }),
    deviceIds.length > 0
      ? supabase
          .from("ovitrap_readings")
          .select("device_id, captured_at, created_at")
          .in("device_id", deviceIds)
          .order("captured_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const userMap = new Map<string, UserName>();
  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      userMap.set(p.id, {
        first_name: p.first_name,
        last_name: p.last_name,
      });
    }
  }

  const latestReadingMap = new Map<string, string>();
  if (readingsRes.data) {
    for (const r of readingsRes.data) {
      if (!latestReadingMap.has(r.device_id)) {
        latestReadingMap.set(r.device_id, r.captured_at || r.created_at);
      }
    }
  }

  const ONLINE_THRESHOLD_MS = 16 * 60 * 1000;

  return devicesData.map((d: any) => {
    const latestTimestamp = latestReadingMap.get(d.id) || d.last_seen_at || null;
    const isOnline = latestTimestamp
      ? Date.now() - new Date(latestTimestamp).getTime() <= ONLINE_THRESHOLD_MS
      : false;

    const rawStatus = d.device_statuses;
    const statusObj = Array.isArray(rawStatus) ? rawStatus[0] ?? null : rawStatus ?? null;
    const realStatusName = statusObj?.status_name ?? "Unknown";

    let computedStatusName: string;

    if (realStatusName === "Maintenance") {
      computedStatusName = "Maintenance";
    } else if (realStatusName === "Active") {
      // Only Active devices can become Online / Unreachable
      computedStatusName = isOnline ? "Online" : "Unreachable";
    } else {
      // Offline, Provisioning, or anything else → keep Offline-style
      computedStatusName = "Offline";
    }

    const rawBarangay = d.barangays;
    return {
      ...d,
      last_seen_at: latestTimestamp,
      device_statuses: statusObj
      ? { ...statusObj, status_name: realStatusName }
      : { id: "unknown", status_name: "Unknown", description: null },
    // Computed connection status (for badges / Online-Offline display)
    connection_status: computedStatusName,
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

export async function createDevice(payload: Record<string, unknown>): Promise<{ id: string; device_code: string }> {
  const { data, error } = await supabase
    .from("ovitrap_devices")
    .insert({
      ...payload,
      latitude: null as number | null,
      longitude: null as number | null,
    } as any)
    .select("id, device_code")
    .single();

  if (error) throw error;
  return data as { id: string; device_code: string };
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
        barangay_name,
        municipality
      )
    `
    )
    .eq("barangay_id", targetBarangayId)
    .order("created_at", { ascending: true });

  if (devicesError) throw devicesError;
  if (!devicesData || devicesData.length === 0) return [];

  // 5. Hydrate user profiles & latest readings
  const deviceIds = devicesData.map((d: any) => d.id);
  const userIds = Array.from(
    new Set(devicesData.map((d) => d.deployed_by).filter(Boolean))
  ) as string[];

  const [profilesRes, readingsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: null }),
    deviceIds.length > 0
      ? supabase
          .from("ovitrap_readings")
          .select("device_id, captured_at, created_at")
          .in("device_id", deviceIds)
          .order("captured_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const userMap = new Map<string, UserName>();
  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      userMap.set(p.id, {
        first_name: p.first_name,
        last_name: p.last_name,
      });
    }
  }

  const latestReadingMap = new Map<string, string>();
  if (readingsRes.data) {
    for (const r of readingsRes.data) {
      if (!latestReadingMap.has(r.device_id)) {
        latestReadingMap.set(r.device_id, r.captured_at || r.created_at);
      }
    }
  }

  const ONLINE_THRESHOLD_MS = 16 * 60 * 1000;

  return devicesData.map((d: any) => {
    const latestTimestamp = latestReadingMap.get(d.id) || d.last_seen_at || null;
    const isOnline = latestTimestamp
      ? Date.now() - new Date(latestTimestamp).getTime() <= ONLINE_THRESHOLD_MS
      : false;

    const rawStatus = d.device_statuses;
    const statusObj = Array.isArray(rawStatus) ? rawStatus[0] ?? null : rawStatus ?? null;
    const realStatusName = statusObj?.status_name ?? "Unknown";

    let computedStatusName: string;

    if (realStatusName === "Maintenance") {
      computedStatusName = "Maintenance";
    } else if (realStatusName === "Active") {   
      // Only Active devices can become Online / Unreachable
      computedStatusName = isOnline ? "Online" : "Unreachable";
    } else {    
      // Offline, Provisioning, or anything else → keep Offline-style
      computedStatusName = "Offline";
    }

    const rawBarangay = d.barangays;
    return {
      ...d,
      last_seen_at: latestTimestamp,
      device_statuses: statusObj
      ? { ...statusObj, status_name: realStatusName }
      : { id: "unknown", status_name: "Unknown", description: null },
    // Computed connection status (for badges / Online-Offline display)
    connection_status: computedStatusName,
    barangays: Array.isArray(rawBarangay) ? rawBarangay[0] ?? null : rawBarangay ?? null,
    users: d.deployed_by ? userMap.get(d.deployed_by) ?? null : null,
    };
  }) as unknown as OvitrapDevice[];
}

/** Fetch all devices that belong to the logged-in user’s municipality */
export async function fetchDevicesForCurrentMunicipality(): Promise<OvitrapDevice[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Get user's municipality
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("municipality")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.municipality) return [];

  const userMunicipality = profile.municipality;

  // Fetch all devices + their barangay (including municipality)
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
        barangay_name,
        municipality
      )
    `
    )
    .order("created_at", { ascending: false });

  if (devicesError) throw devicesError;
  if (!devicesData || devicesData.length === 0) return [];

  // Filter by municipality
  const filtered = devicesData.filter((d: any) => {
    const brgy = Array.isArray(d.barangays) ? d.barangays[0] : d.barangays;
    return brgy?.municipality === userMunicipality;
  });

  if (filtered.length === 0) return [];

  // Hydrate users + latest readings (same logic as fetchDevices)
  const deviceIds = filtered.map((d: any) => d.id);
  const userIds = Array.from(
    new Set(filtered.map((d: any) => d.deployed_by).filter(Boolean))
  ) as string[];

  const [profilesRes, readingsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: null }),
    deviceIds.length > 0
      ? supabase
          .from("ovitrap_readings")
          .select("device_id, captured_at, created_at")
          .in("device_id", deviceIds)
          .order("captured_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const userMap = new Map<string, any>();
  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      userMap.set(p.id, {
        first_name: p.first_name,
        last_name: p.last_name,
      });
    }
  }

  const latestReadingMap = new Map<string, string>();
  if (readingsRes.data) {
    for (const r of readingsRes.data) {
      if (!latestReadingMap.has(r.device_id)) {
        latestReadingMap.set(r.device_id, r.captured_at || r.created_at);
      }
    }
  }

  const ONLINE_THRESHOLD_MS = 16 * 60 * 1000;

  return filtered.map((d: any) => {
    const latestTimestamp = latestReadingMap.get(d.id) || d.last_seen_at || null;
    const isOnline = latestTimestamp
      ? Date.now() - new Date(latestTimestamp).getTime() <= ONLINE_THRESHOLD_MS
      : false;

    const rawStatus = d.device_statuses;
    const statusObj = Array.isArray(rawStatus) ? rawStatus[0] ?? null : rawStatus ?? null;

    const realStatusName = statusObj?.status_name ?? "Unknown";

    let computedStatusName: string;
    if (realStatusName === "Maintenance") {
      computedStatusName = "Maintenance";
    } else if (realStatusName === "Active") {
      computedStatusName = isOnline ? "Online" : "Unreachable";
    } else {
      computedStatusName = "Offline";
    }

    const rawBarangay = d.barangays;

    return {
      ...d,
      last_seen_at: latestTimestamp,
     device_statuses: statusObj
        ? { ...statusObj, status_name: realStatusName }
        : { id: "unknown", status_name: "Unknown", description: null },
      connection_status: computedStatusName,
      barangays: Array.isArray(rawBarangay) ? rawBarangay[0] ?? null : rawBarangay ?? null,
      users: d.deployed_by ? userMap.get(d.deployed_by) ?? null : null,
    };
  }) as unknown as OvitrapDevice[];
}