import { supabase } from "@/lib/supabase";
import type { UpdateUserForm } from "@/types/user.types";

interface UpdateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  error?: string;
}

export async function updateUser(
  formData: UpdateUserForm
): Promise<UpdateUserResponse> {
  // Fetch role_id matching role code if role is present
  let roleId: string | null = null;
  if (formData.role) {
    const { data: roleData } = await supabase
      .from("roles")
      .select("id")
      .eq("role_code", formData.role)
      .maybeSingle();

    if (roleData) {
      roleId = roleData.id;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: formData.firstName,
      middle_name: formData.middleName || null,
      last_name: formData.lastName,
      email: formData.email,
      username: formData.username,
      phone_number: formData.phoneNumber,
      role: formData.role,
      role_id: roleId,
      municipality: formData.municipality,
      barangay: formData.barangay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", formData.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    userId: formData.id,
    message: "User updated successfully.",
  };
}
