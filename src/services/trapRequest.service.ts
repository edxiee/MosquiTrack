import { supabase } from "@/lib/supabase";

export type TrapRequestType = "Request Pick-up" | "Request Deployment";

export interface TrapDeploymentRequest {
  req_id: string;
  requested_by: string | null;
  device_id: string;
  request: TrapRequestType;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

/** Insert a new trap deployment / pick-up request */
export async function createTrapRequest(
  deviceId: string,
  requestType: TrapRequestType
): Promise<TrapDeploymentRequest> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to submit a request.");
  }

  const { data, error } = await supabase
    .from("trap_deployment_requests")
    .insert({
      requested_by: user.id,
      device_id: deviceId,
      request: requestType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TrapDeploymentRequest;
}

/** Fetch all requests (optionally filter by device or user later) */
export async function fetchTrapRequests(): Promise<TrapDeploymentRequest[]> {
  const { data, error } = await supabase
    .from("trap_deployment_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TrapDeploymentRequest[]) ?? [];
}

/** Fetch requests for a specific device */
export async function fetchTrapRequestsByDevice(
  deviceId: string
): Promise<TrapDeploymentRequest[]> {
  const { data, error } = await supabase
    .from("trap_deployment_requests")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TrapDeploymentRequest[]) ?? [];
}