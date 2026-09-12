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