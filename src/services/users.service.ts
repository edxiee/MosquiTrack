import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { CreateUserForm } from "@/types/user.types";

export async function createUser(formData: CreateUserForm) {
  const body = {
    firstName: formData.firstName,
    middleName: formData.middleName,
    lastName: formData.lastName,
    email: formData.email,
    username: formData.username,
    password: formData.password,
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
