import { supabase } from "@/lib/supabase";

export type TrapRequestType = string; 

export interface TrapRequest {
  req_id: string;
  requested_by: string | null;
  device_id: string;
  request: TrapRequestType;
  descriptions: string | null;
  notes: string | null;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Insert a new request into request_actions */
export async function createTrapRequest(
  deviceId: string,
  request: TrapRequestType,
  descriptions: string | null = null,
  notes: string | null = null
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("request_actions")
    .insert({
      device_id: deviceId,
      request,
      descriptions,
      notes,
      requested_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TrapRequest;
}

/** Fetch all requests */
export async function fetchTrapRequests(): Promise<TrapRequest[]> {
  const { data, error } = await supabase
    .from("request_actions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TrapRequest[]) ?? [];
}

/** Fetch requests for a specific device */
export async function fetchTrapRequestsByDevice(
  deviceId: string
): Promise<TrapRequest[]> {
  const { data, error } = await supabase
    .from("request_actions")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TrapRequest[]) ?? [];
}

// Add this to the bottom of src/services/trapRequest.service.ts

export interface TriageLogRow {
  id: string;
  trigger_source: string;
  priority: string;
  status: string;
  remarks: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  barangay_name: string | null;
  assigned_to_name: string | null;
}

export async function fetchMySubmittedTriageLogs(userId: string): Promise<TriageLogRow[]> {
  const { data: logs, error } = await supabase
    .from("action_triage_log")
    .select(
      `id, trigger_source, priority, status, remarks, due_date, created_at, updated_at,
       barangays(barangay_name),
       assignee:profiles!action_triage_log_assigned_to_fkey ( first_name, last_name )`
    )
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (logs || []).map((log: any) => {
    const assignee = Array.isArray(log.assignee) ? log.assignee[0] : log.assignee;
    const assigneeName = assignee
      ? `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim()
      : "";

    return {
      id: log.id,
      trigger_source: log.trigger_source,
      priority: log.priority,
      status: log.status,
      remarks: log.remarks,
      due_date: log.due_date,
      created_at: log.created_at,
      updated_at: log.updated_at,
      barangay_name: log.barangays?.barangay_name || null,
      assigned_to_name: assigneeName || null, // new
    };
  });
}
export interface TrapActionLogEntry {
  id: string;
  trigger_source: string;
  priority: string;
  status: string;
  remarks: string | null;
  due_date: string | null;
  created_at: string;
}

export async function fetchTriageRequestsByDevice(
  barangayId: string | null,
  deviceCode: string,
): Promise<TrapActionLogEntry[]> {
  if (!barangayId) return [];

  const { data, error } = await supabase
    .from("action_triage_log")
    .select("id, trigger_source, priority, status, remarks, due_date, created_at")
    .eq("barangay_id", barangayId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const trapRemark = `Trap: ${deviceCode}`;
  return ((data ?? []) as TrapActionLogEntry[]).filter((entry) =>
    entry.remarks?.split(" | ").includes(trapRemark),
  );
}