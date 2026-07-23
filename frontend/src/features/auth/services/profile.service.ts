import { supabase } from "@/lib/supabase";

import type {
  AuthProfile,
  AuthRole,
} from "../types/auth.types";

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

  console.log("Authenticated User ID:", user.id);

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
    .single();

    console.log("Query finished");
    console.log("Error:", error);
    console.log("Data:", data);

  if (error) {
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
    barangay: data.barangay,
  };
}