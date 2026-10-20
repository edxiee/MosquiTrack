// src/services/requestActions.service.ts
import { supabase } from "@/lib/supabase";

export interface RequestActionRow {
  req_id: string;
  request: string;
  descriptions: string | null;
  notes: string | null;
  remarks: string | null;
  status: "Pending" | "Approved" | "Declined" | string;
  created_at: string;
  approved_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  updated_at: string | null;
  device_id: string | null;
  device_code: string | null;
  device_municipality: string | null;
  device_barangay: string | null;
  requester_first_name: string | null;
  requester_last_name: string | null;
  requester_role: string | null;
  approver_first_name: string | null;
  approver_last_name: string | null;
}

// --- HELPER FUNCTION ---
async function mapActionsToRows(actions: any[]): Promise<RequestActionRow[]> {
  if (!actions || actions.length === 0) return [];

  const deviceIds = [...new Set(actions.map((a) => a.device_id).filter(Boolean))];
  const userIds = [
    ...new Set(
      actions.flatMap((a) => [a.requested_by, a.approved_by, a.created_by]).filter(Boolean)
    ),
  ];

  let devices: any[] = [];
  if (deviceIds.length > 0) {
    const { data } = await supabase.from("ovitrap_devices").select("id, device_code, barangay_id").in("id", deviceIds);
    devices = data ?? [];
  }

  const barangayIds = [...new Set(devices.map((d) => d.barangay_id).filter(Boolean))];
  let barangays: any[] = [];
  if (barangayIds.length > 0) {
    const { data } = await supabase.from("barangays").select("id, barangay_name, municipality").in("id", barangayIds);
    barangays = data ?? [];
  }

  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, first_name, last_name, role").in("id", userIds);
    profiles = data ?? [];
  }

  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  const barangayMap = new Map(barangays.map((b) => [b.id, b]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return actions.map((item) => {
    const device = deviceMap.get(item.device_id);
    const barangay = device ? barangayMap.get(device.barangay_id) : null;
    const requester = profileMap.get(item.requested_by);
    const approver = profileMap.get(item.approved_by);

    const resolvedStatus = item.status || (item.approved_at ? "Approved" : item.completed_at ? "Declined" : "Pending");

    return {
      req_id: item.req_id,
      request: item.request,
      descriptions: item.descriptions,
      notes: item.notes,
      remarks: item.remarks,
      status: resolvedStatus,
      created_at: item.created_at,
      approved_at: item.approved_at,
      due_date: item.due_date,
      completed_at: item.completed_at,
      updated_at: item.updated_at ?? null,
      device_id: item.device_id ?? null,
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

export async function fetchRequestActions(): Promise<RequestActionRow[]> {
  const { data: actions, error: actionsError } = await supabase
    .from("request_actions")
    .select("*")
    .order("created_at", { ascending: false });

  if (actionsError) throw actionsError;
  return mapActionsToRows(actions || []);
}

// --- NEW FUNCTION FOR LGU/MHO TRACKING ---
export async function fetchMySubmittedRequests(userId: string): Promise<RequestActionRow[]> {
  const { data: actions, error: actionsError } = await supabase
    .from("request_actions")
    .select("*")
    .eq("requested_by", userId)
    .order("created_at", { ascending: false });

  if (actionsError) throw actionsError;
  return mapActionsToRows(actions || []);
}

// --- EXISTING FUNCTION (RESTORED) ---
export async function updateRequestActionStatus(
  reqId: string,
  newStatus: "Approved" | "Declined",
  deviceId?: string | null,
  requestType?: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  const payload: any = {
    updated_at: now,
    status: newStatus,
  };
  if (newStatus === "Approved") {
    payload.approved_at = now;
    if (user?.id) payload.approved_by = user.id;
  } else {
    payload.completed_at = now;
  }

  let { data: updatedRows, error } = await supabase
    .from("request_actions")
    .update(payload)
    .eq("req_id", reqId)
    .select();

  if (error && (error.message.includes("approved_by") || error.message.includes("foreign key") || (error as any).code === "23503")) {
    console.warn("Retrying update without approved_by:", error.message);
    delete payload.approved_by;
    const retry = await supabase
      .from("request_actions")
      .update(payload)
      .eq("req_id", reqId)
      .select();
    updatedRows = retry.data;
    error = retry.error;
  }

  if (error && error.message.includes("status")) {
    console.warn("Retrying update without status column:", error.message);
    delete payload.status;
    const retry = await supabase
      .from("request_actions")
      .update(payload)
      .eq("req_id", reqId)
      .select();
    updatedRows = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("Supabase request_actions update error:", error);
    throw new Error(error.message || "Failed to update request action in database");
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn("0 rows updated in request_actions for req_id:", reqId);
    throw new Error(
      "Update failed: 0 rows affected. Supabase Row-Level Security (RLS) is likely blocking UPDATE on request_actions."
    );
  }

  let targetDeviceId = deviceId;
  let targetRequestType = requestType;
  if (!targetDeviceId) {
    try {
      const { data: reqRow } = await supabase
        .from("request_actions")
        .select("device_id, request")
        .eq("req_id", reqId)
        .maybeSingle();
      if (reqRow?.device_id) {
        targetDeviceId = reqRow.device_id;
        if (!targetRequestType && reqRow.request) {
          targetRequestType = reqRow.request;
        }
      }
    } catch (e) {
      console.warn("Could not lookup device for request action:", e);
    }
  }

  if (targetDeviceId) {
    try {
      const reqTypeLower = (targetRequestType || "").toLowerCase();
      const isPickUp = reqTypeLower.includes("pick") || reqTypeLower.includes("storage");
      let targetOperational: "Deployed" | "In Storage" = "Deployed";
      let statusNames: string[] = ["Active", "Deployed"];
      if (newStatus === "Approved") {
        if (isPickUp) {
          targetOperational = "In Storage";
          statusNames = ["In Storage", "Offline"];
        } else {
          targetOperational = "Deployed";
          statusNames = ["Active", "Deployed"];
        }
      } else {
        if (isPickUp) {
          targetOperational = "Deployed";
          statusNames = ["Active", "Deployed"];
        } else {
          targetOperational = "In Storage";
          statusNames = ["In Storage", "Offline"];
        }
      }
      const { data: st } = await supabase
        .from("device_statuses")
        .select("id")
        .in("status_name", statusNames)
        .limit(1)
        .maybeSingle();
      const devPayload: any = {
        updated_at: now,
        operational_status: targetOperational,
      };
      if (st?.id) devPayload.device_status_id = st.id;
      const { error: devErr } = await supabase
        .from("ovitrap_devices")
        .update(devPayload)
        .eq("id", targetDeviceId);
      if (devErr && devErr.message.includes("operational_status")) {
        if (st?.id) {
          await supabase
            .from("ovitrap_devices")
            .update({ device_status_id: st.id, updated_at: now })
            .eq("id", targetDeviceId);
        }
      }
    } catch (e) {
      console.warn("Could not synchronize device operational status:", e);
    }
  }
}