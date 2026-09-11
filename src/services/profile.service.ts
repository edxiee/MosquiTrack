// src/services/profile.service.ts

import { supabase } from "@/lib/supabase";
import type {
  AuthProfile,
  AuthRole,
} from "@/types/auth.types";
import type { RoleCode } from "@/constants/roles";

export async function getCurrentProfile(): Promise<AuthProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const { data, error } = await supabase
    .from("profiles")
    // <--- ADDED must_change_password TO THE SELECT LIST
    .select(`id, first_name, middle_name, last_name, email, phone_number, is_active, must_change_password, role, role_id, roles:role_id ( id, role_code, role_name )`)
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Profile not found.");
  }

  const roleCodeFromColumn = data.role as RoleCode | undefined;
  const roleCodeFromJoin = (data.roles as any)?.role_code as RoleCode | undefined;
  const effectiveRoleCode: RoleCode = roleCodeFromColumn ?? roleCodeFromJoin ?? "BHW";

  const roleNameMap: Record<string, string> = {
    SYS_ADMIN: "System Administrator",
    ADMIN: "Administrator",
    MHO: "Municipal Health Officer",
    BHW: "Barangay Health Worker",
  };

  const authRole: AuthRole = {
    id: (data.roles as any)?.id ?? data.role_id ?? "",
    role_code: effectiveRoleCode,
    role_name: (data.roles as any)?.role_name ?? roleNameMap[effectiveRoleCode] ?? effectiveRoleCode,
  };

  return {
    id: data.id,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    email: data.email,
    phone_number: data.phone_number,
    is_active: data.is_active ?? false,
    must_change_password: data.must_change_password ?? false, // <--- ADDED THIS LINE
    role: authRole,
    barangay: null,
  };
}