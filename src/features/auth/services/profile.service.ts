import { supabase } from "@/lib/supabase";

import type {
  AuthBarangay,
  AuthProfile,
  AuthRole,
} from "../types/auth.types";

interface ProfileQueryResult {
  id: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;

  email: string;

  phone_number: string | null;

  is_active: boolean;

  role: AuthRole | AuthRole[];

  barangay: AuthBarangay | AuthBarangay[] | null;
}

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
    .select(`
      id,
      first_name,
      middle_name,
      last_name,
      email,
      phone_number,
      is_active,
      role:roles (
        id,
        role_code,
        role_name
      ),
      barangay:barangays (
        id,
        barangay_name
      )
    `)
    .eq("id", user.id)
    .single<ProfileQueryResult>();

  if (error) {
    throw error;
  }

  const role = Array.isArray(data.role)
    ? data.role[0]
    : data.role;

  if (!role) {
    throw new Error("User has no assigned role.");
  }

  const barangay = Array.isArray(data.barangay)
    ? data.barangay[0] ?? null
    : data.barangay;

  return {
    id: data.id,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    email: data.email,
    phone_number: data.phone_number,
    is_active: data.is_active,
    role,
    barangay,
  };
}