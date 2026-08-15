import { supabase } from "@/lib/supabase";
import type {
  TriageAction,
  TriageFilterValues,
  UpdateActionStatusInput,
} from "@/types/triage.types";

interface RawActionRow {
  id: string;
  barangay_id: string;
  device_id: string | null;
  trigger_source: string;
  priority: TriageAction["priority"];
  status: TriageAction["status"];
  assigned_to: string | null;
  assigned_date: string;
  due_date: string | null;
  completed_at: string | null;
  remarks: string | null;
  created_at: string;
  barangay: { barangay_name: string } | null;
  device: { device_code: string } | null;
  assignee: { first_name: string; last_name: string } | null;
}

const ACTION_SELECT = `
  id,
  barangay_id,
  device_id,
  trigger_source,
  priority,
  status,
  assigned_to,
  assigned_date,
  due_date,
  completed_at,
  remarks,
  created_at,
  barangay:barangays ( barangay_name ),
  device:ovitrap_devices ( device_code ),
  assignee:profiles!action_triage_log_assigned_to_fkey ( first_name, last_name )
`;

function flattenAction(row: RawActionRow): TriageAction {
  return {
    id: row.id,
    barangayId: row.barangay_id,
    barangayName: row.barangay?.barangay_name ?? "Unknown",
    deviceId: row.device_id,
    deviceCode: row.device?.device_code ?? null,
    triggerSource: row.trigger_source,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assignee
      ? `${row.assignee.first_name} ${row.assignee.last_name}`
      : null,
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    remarks: row.remarks,
    createdAt: row.created_at,
  };
}

/**
 * Fetches action items. Pass currentUserId to scope results to a
 * specific BHW (e.g. from your AuthContext's profile.id) — otherwise
 * this returns everything the caller's RLS policy allows.
 */
export async function getAssignedActions(
  currentUserId?: string,
): Promise<TriageAction[]> {
  let query = supabase
    .from("action_triage_log")
    .select(ACTION_SELECT)
    .order("assigned_date", { ascending: false });

  if (currentUserId) {
    query = query.eq("assigned_to", currentUserId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawActionRow[]).map(flattenAction);
}

export async function getActionById(id: string): Promise<TriageAction | null> {
  const { data, error } = await supabase
    .from("action_triage_log")
    .select(ACTION_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch action:", error);
    return null;
  }
  return flattenAction(data as unknown as RawActionRow);
}

export async function updateActionStatus(
  id: string,
  input: UpdateActionStatusInput,
): Promise<void> {
  const { error } = await supabase
    .from("action_triage_log")
    .update({
      status: input.status,
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      ...(input.status === "Completed"
        ? { completed_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function addActionRemarks(
  id: string,
  remarks: string,
): Promise<void> {
  const { error } = await supabase
    .from("action_triage_log")
    .update({ remarks, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function getBarangayOptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("barangay_name")
    .order("barangay_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.barangay_name);
}

export type { TriageFilterValues };
