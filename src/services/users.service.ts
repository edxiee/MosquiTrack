import { supabase } from "@/lib/supabase";
import type { CreateUserForm } from "@/types/user.types";

export async function createUser(formData: CreateUserForm) {
  // 1. Create the Auth user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName,
        username: formData.username,
        phone_number: formData.phoneNumber,
        role: formData.role,
        municipality: formData.municipality,
        barangay: formData.barangay,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  return {
    success: true,
    userId: authData.user?.id,
    message: "User account created successfully.",
  };
}

export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function setUserStatus(
  userId: string,
  action: "activate" | "deactivate"
) {
  const nextStatus = action === "deactivate" ? "INACTIVE" : "ACTIVE";

  const { error } = await supabase
    .from("profiles")
    .update({
      status: nextStatus,
      is_active: action === "activate",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, status: nextStatus };
}
