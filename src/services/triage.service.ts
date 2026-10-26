import { supabase } from "@/lib/supabase";
import type {
  TriageAction,
  TriageFilterValues,
  UpdateActionStatusInput,
} from "@/types/triage.types";

interface RawActionRow {
  id: string;
  barangay_id: string;
  trigger_source: string;
  priority: TriageAction["priority"];
  status: TriageAction["status"];
  assigned_to: string | null;
  assigned_date: string;
  due_date: string | null;
  completed_at: string | null;
  remarks: string | null;
  created_at: string;
  created_by?: string | null;
  barangay: { barangay_name: string; municipality: string | null } | null;
  assignee: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
  requester?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
}

const ACTION_SELECT = `
  id,
  barangay_id,
  trigger_source,
  priority,
  status,
  assigned_to,
  assigned_date,
  due_date,
  completed_at,
  remarks,
  created_at,
  created_by,
  barangay:barangays ( barangay_name, municipality ),
  assignee:profiles!action_triage_log_assigned_to_fkey ( first_name, last_name ),
  requester:profiles!action_triage_log_created_by_fkey ( first_name, last_name )
`;

function flattenAction(row: RawActionRow): TriageAction {
  const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
  const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
  const requesterName = requester
    ? `${requester.first_name} ${requester.last_name}`.trim()
    : null;

  return {
    id: row.id,
    barangayId: row.barangay_id,
    barangayName: row.barangay?.barangay_name ?? "Unknown",
    municipalityName: row.barangay?.municipality ?? null,
    deviceId: null,
    deviceCode: null,
    triggerSource: row.trigger_source,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: assignee
      ? `${assignee.first_name} ${assignee.last_name}`.trim()
      : null,
    requestedBy: row.created_by ?? null,
    requestedByName: requesterName || null,
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
export async function getAssignedActions(options?: {
  assignedTo?: string | undefined;
  barangayId?: string | undefined;
  barangayName?: string | undefined;
}): Promise<TriageAction[]> {
  let targetBarangayId = options?.barangayId;

  // If barangayId is not provided but a specific barangayName was specified,
  // resolve its UUID from the barangays table so we can filter directly on barangay_id.
  if (
    !targetBarangayId &&
    options?.barangayName &&
    options.barangayName.trim().toLowerCase() !== "all"
  ) {
    try {
      const { data: bData } = await supabase
        .from("barangays")
        .select("id")
        .ilike("barangay_name", options.barangayName.trim())
        .limit(1)
        .maybeSingle();

      if (bData?.id) {
        targetBarangayId = bData.id;
      } else {
        // Barangay name was specified but does not exist in DB: return empty array rather than leaking records
        return [];
      }
    } catch {
      return [];
    }
  }

  let query = supabase
    .from("action_triage_log")
    .select(ACTION_SELECT)
    .order("assigned_date", { ascending: false });

  if (options?.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }
  if (targetBarangayId) {
    query = query.eq("barangay_id", targetBarangayId);
  } else if (
    options?.barangayName &&
    options.barangayName.trim().toLowerCase() !== "all"
  ) {
    return [];
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawActionRow[]).map(flattenAction);
}

export async function getActionsByDeviceId(
  _deviceId: string,
): Promise<TriageAction[]> {
  // device_id column has been removed from action_triage_log
  return [];
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
