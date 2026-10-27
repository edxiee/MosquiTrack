import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  CreateUserForm,
  DatabaseUser,
  UpdateUserForm,
} from "@/types/user.types";

interface UpdateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  error?: string;
}

export async function getUsers(): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as DatabaseUser[]) ?? [];
}

export async function createUser(formData: CreateUserForm) {
  const body = {
    firstName: formData.firstName,
    middleName: formData.middleName,
    lastName: formData.lastName,
    email: formData.email,
    username: formData.username,
    phoneNumber: formData.phoneNumber,
    role: formData.role,
    municipality: formData.municipality,
    barangay: formData.barangay,
  };

  const { data, error } = await supabase.functions.invoke("create-user", {
    body,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json();
      console.error("Edge Function Response:", errorBody);
    }
    console.error("Function invoke error:", error);
    throw error;
  }
  if (!data.success) {
    throw new Error(data.error);
  }
  return data;
}

export async function updateUser(
  formData: UpdateUserForm,
): Promise<UpdateUserResponse> {
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

  // Lookup the matching barangay_id from the barangays table
  let barangayId: string | null = null;
  if (formData.barangay && formData.barangay.trim()) {
    try {
      let bQuery = supabase
        .from("barangays")
        .select("id")
        .ilike("barangay_name", formData.barangay.trim());

      if (formData.municipality && formData.municipality.trim()) {
        bQuery = bQuery.ilike("municipality", formData.municipality.trim());
      }

      const { data: bData } = await bQuery.limit(1).maybeSingle();
      if (bData?.id) {
        barangayId = bData.id;
      }
    } catch (e) {
      console.warn("Failed to lookup barangay_id during update:", e);
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
      municipality: formData.municipality || null,
      barangay: formData.barangay || null,
      barangay_id: barangayId,
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

export async function deleteUser(userId: string) {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json();
      console.error("Edge Function Response:", errorBody);
    }
    throw error;
  }
  if (!data.success) {
    throw new Error(data.error);
  }
  return data;
}

// action: "deactivate" locks the account and sets status to INACTIVE.
// "activate" unlocks it, restoring ACTIVE if they'd logged in before,
// or PENDING if they hadn't (the Edge Function decides which).
export async function setUserStatus(
  userId: string,
  action: "activate" | "deactivate",
) {
  const { data, error } = await supabase.functions.invoke(
    "toggle-user-status",
    { body: { userId, action } },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorBody = await error.context.json();
      console.error("Edge Function Response:", errorBody);
    }
    throw error;
  }
  if (!data.success) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Marks the current user's users.status ACTIVE if (and only if) it's
 * currently PENDING — i.e. this is their first successful login.
 * A no-op for anyone already ACTIVE or INACTIVE (deactivated accounts
 * are never touched by this, by design — see the DB function).
 *
 * Intentionally swallows errors: this is a best-effort side effect of
 * logging in, not something that should ever block or break the
 * login flow itself if it fails for any reason.
 */
export async function markFirstLoginActive(): Promise<void> {
  try {
    const { error } = await supabase.rpc("mark_user_active_on_login");
    if (error) {
      console.error("Failed to mark user active on login:", error);
    }
  } catch (err) {
    console.error("Failed to mark user active on login:", err);
  }
}

export async function resendConfirmationEmail(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    throw error;
  }
  return data;
}
