import { supabase } from "@/lib/supabase";

import type { UpdateUserForm } from "../types/update-user-form";

interface UpdateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  error?: string;
}

export async function updateUser(
  formData: UpdateUserForm
): Promise<UpdateUserResponse> {
  const { data, error } =
    await supabase.functions.invoke<UpdateUserResponse>(
      "update-user",
      {
        body: formData,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.success) {
    throw new Error(
      data?.error ?? "Failed to update user."
    );
  }

  return data;
}