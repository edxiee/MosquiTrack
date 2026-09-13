// services/requestActions.service.ts
import { supabase } from "@/lib/supabase";

export interface RequestActionRow {
  req_id: string;
  request: string;
  descriptions: string | null;
  notes: string | null;
  remarks: string | null;
  created_at: string;
  approved_at: string | null;
  due_date: string | null;
  completed_at: string | null;

  device_code: string | null;
  device_municipality: string | null;
  device_barangay: string | null;

  requester_first_name: string | null;
  requester_last_name: string | null;
  requester_role: string | null;

  approver_first_name: string | null;
  approver_last_name: string | null;
}

export async function fetchRequestActions(): Promise<RequestActionRow[]> {
  // 1. Fetch all request actions
  const { data: actions, error: actionsError } = await supabase
    .from("request_actions")
    .select("*")
    .order("created_at", { ascending: false });

  if (actionsError) throw actionsError;
  if (!actions || actions.length === 0) return [];

  // 2. Collect IDs
  const deviceIds = [
    ...new Set(actions.map((a) => a.device_id).filter(Boolean)),
  ];

  const userIds = [
    ...new Set(
      actions
        .flatMap((a) => [a.requested_by, a.approved_by, a.created_by])
        .filter(Boolean)
    ),
  ];

  // 3. Fetch devices (now we only need id, device_code, barangay_id)
  let devices: any[] = [];
  if (deviceIds.length > 0) {
    const { data, error } = await supabase
      .from("ovitrap_devices")
      .select("id, device_code, barangay_id")
      .in("id", deviceIds);

    if (error) throw error;
    devices = data ?? [];
  }

  // 4. Collect barangay IDs from devices
  const barangayIds = [
    ...new Set(devices.map((d) => d.barangay_id).filter(Boolean)),
  ];

  // 5. Fetch barangays
  let barangays: any[] = [];
  if (barangayIds.length > 0) {
    const { data, error } = await supabase
      .from("barangays")
      .select("id, barangay_name, municipality")
      .in("id", barangayIds);

    if (error) throw error;
    barangays = data ?? [];
  }

  // 6. Fetch profiles
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("id", userIds);

    if (error) throw error;
    profiles = data ?? [];
  }

  // 7. Build lookup maps
  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  const barangayMap = new Map(barangays.map((b) => [b.id, b]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // 8. Merge everything
  return actions.map((item) => {
    const device = deviceMap.get(item.device_id);
    const barangay = device ? barangayMap.get(device.barangay_id) : null;
    const requester = profileMap.get(item.requested_by);
    const approver = profileMap.get(item.approved_by);

    return {
      req_id: item.req_id,
      request: item.request,
      descriptions: item.descriptions,
      notes: item.notes,
      remarks: item.remarks,
      created_at: item.created_at,
      approved_at: item.approved_at,
      due_date: item.due_date,
      completed_at: item.completed_at,

      device_code: device?.device_code ?? null,
      device_municipality: barangay?.municipality ?? null,
      device_barangay: barangay?.barangay_name ?? null,

      requester_first_name: requester?.first_name ?? null,
      requester_last_name: requester?.last_name ?? null,
      requester_role: requester?.role ?? null,

      approver_first_name: approver?.first_name ?? null,
      approver_last_name: approver?.last_name ?? null,
    };
  });
}