import { supabase } from "@/lib/supabase";
import type {
  TriageAction,
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
  image_url?: string | null;
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
  image_url,
  created_at,
  created_by,
  barangay:barangays ( barangay_name, municipality ),
  assignee:profiles!action_triage_log_assigned_to_fkey ( first_name, last_name ),
  requester:profiles!action_triage_log_created_by_fkey ( first_name, last_name )
`;

const ACTION_SELECT_FALLBACK = `
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
    imageUrl: row.image_url ?? null,
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

  const buildQuery = (selectCols: string) => {
    let q = supabase
      .from("action_triage_log")
      .select(selectCols)
      .order("assigned_date", { ascending: false });

    if (options?.assignedTo) {
      q = q.eq("assigned_to", options.assignedTo);
    }
    if (targetBarangayId) {
      q = q.eq("barangay_id", targetBarangayId);
    }
    return q;
  };

  if (
    !targetBarangayId &&
    options?.barangayName &&
    options.barangayName.trim().toLowerCase() !== "all"
  ) {
    return [];
  }

  let { data, error } = await buildQuery(ACTION_SELECT);
  if (error && error.message?.includes("image_url")) {
    const fallbackRes = await buildQuery(ACTION_SELECT_FALLBACK);
    data = fallbackRes.data as any;
    error = fallbackRes.error;
  }
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
  let { data, error } = await supabase
    .from("action_triage_log")
    .select(ACTION_SELECT)
    .eq("id", id)
    .single();

  if (error && error.message?.includes("image_url")) {
    const fallbackRes = await supabase
      .from("action_triage_log")
      .select(ACTION_SELECT_FALLBACK)
      .eq("id", id)
      .single();
    data = fallbackRes.data as any;
    error = fallbackRes.error;
  }

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
  const patch: Record<string, unknown> = {
    status: input.status,
    ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
    ...(input.status === "Completed"
      ? { completed_at: new Date().toISOString() }
      : {}),
    updated_at: new Date().toISOString(),
  };

  // Record who took the action
  if (input.status === "In Progress" || input.status === "Completed") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (input.status === "In Progress") {
        // Whoever clicks Start takes it
        patch.assigned_to = user.id;
      } else {
        // Completing directly: only fill it in if nobody took it yet,
        // so the original taker is preserved
        const { data: existing } = await supabase
          .from("action_triage_log")
          .select("assigned_to")
          .eq("id", id)
          .maybeSingle();

        if (!existing?.assigned_to) {
          patch.assigned_to = user.id;
        }
      }
    }
  }

  const { error } = await supabase
    .from("action_triage_log")
    .update(patch)
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

export interface BarangayFilterOption {
  value: string; // "Municipality::Barangay", unique even if two municipalities share a barangay name
  label: string; // "Municipality / Barangay"
}

export async function getBarangayOptions(): Promise<BarangayFilterOption[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("barangay_name, municipality")
    .order("municipality", { ascending: true })
    .order("barangay_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    value: `${r.municipality ?? ""}::${r.barangay_name}`,
    label: r.municipality
      ? `${r.municipality} , ${r.barangay_name}`
      : r.barangay_name,
  }));
}
