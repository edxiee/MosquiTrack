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
    .select(`id, first_name, middle_name, last_name, email, phone_number, is_active, must_change_password, role, role_id, barangay, municipality, barangay_id, roles:role_id ( id, role_code, role_name ), barangays:barangay_id ( id, barangay_name, municipality )`)
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

  const rawBarangay = (data as any).barangays as
    | { id: string; barangay_name: string; municipality?: string | null }
    | { id: string; barangay_name: string; municipality?: string | null }[]
    | null;
  const barangayRecord = Array.isArray(rawBarangay) ? rawBarangay[0] : rawBarangay;

  const rawBarangayName: string =
    (data as any).barangay ||
    (user.user_metadata?.barangay as string | undefined) ||
    "";
  const rawMunicipality: string =
    (data as any).municipality ||
    (user.user_metadata?.municipality as string | undefined) ||
    "";

  let resolvedBarangay: { id: string; barangay_name: string; municipality?: string | null } | null = barangayRecord
    ? {
        id: barangayRecord.id,
        barangay_name: barangayRecord.barangay_name,
        municipality: barangayRecord.municipality ?? rawMunicipality ?? null,
      }
    : null;

  // If the profile's text barangay differs from the joined barangayRecord (e.g. admin edited it),
  // invalidate the stale joined record so we resolve and sync the newly assigned barangay.
  if (
    resolvedBarangay &&
    rawBarangayName.trim() &&
    resolvedBarangay.barangay_name.trim().toLowerCase() !== rawBarangayName.trim().toLowerCase()
  ) {
    resolvedBarangay = null;
  }

  // Fallback / Re-sync: resolve ID from barangays table using the assigned barangay name
  if (!resolvedBarangay && rawBarangayName.trim()) {
    try {
      let bQuery = supabase
        .from("barangays")
        .select("id, barangay_name, municipality")
        .ilike("barangay_name", rawBarangayName.trim());

      if (rawMunicipality.trim()) {
        bQuery = bQuery.ilike("municipality", rawMunicipality.trim());
      }

      const { data: bData } = await bQuery.limit(1).maybeSingle();
      if (bData) {
        resolvedBarangay = {
          id: bData.id,
          barangay_name: bData.barangay_name,
          municipality: bData.municipality ?? rawMunicipality ?? null,
        };

        // Sync updated barangay_id back to profiles if missing or changed
        if (data.barangay_id !== bData.id) {
          supabase
            .from("profiles")
            .update({ barangay_id: bData.id })
            .eq("id", data.id)
            .then();
        }
      } else {
        resolvedBarangay = {
          id: data.barangay_id ?? "",
          barangay_name: rawBarangayName.trim(),
          municipality: rawMunicipality || null,
        };
      }
    } catch (e) {
      console.warn("Failed to resolve barangay info:", e);
      resolvedBarangay = {
        id: data.barangay_id ?? "",
        barangay_name: rawBarangayName.trim(),
        municipality: rawMunicipality || null,
      };
    }
  }

  return {
    id: data.id,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    email: data.email,
    phone_number: data.phone_number,
    is_active: data.is_active ?? false,
    must_change_password: data.must_change_password ?? false,
    role: authRole,
    barangay: resolvedBarangay,
    municipality: resolvedBarangay?.municipality ?? rawMunicipality ?? null,
  };
}