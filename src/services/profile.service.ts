import { supabase } from "@/lib/supabase";
import type {
  AuthProfile,
  AuthRole,
} from "@/types/auth.types";

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
      role:roles!fk_profiles_role (
        id,
        role_code,
        role_name
      )
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Profile not found.");
  }

  return {
    id: data.id,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    email: data.email,
    phone_number: data.phone_number,
    is_active: data.is_active ?? false,
    role: data.role as AuthRole,
    barangay: null,
  };
}
