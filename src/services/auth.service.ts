// src/services/auth.service.ts

import { supabase } from "@/lib/supabase";
import type { LoginRequest } from "@/types/login.type";

export async function login(data: LoginRequest) {
  const { data: authData, error } =
    await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

  if (error) {
    throw error;
  }

  return authData;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

// --- NEW FUNCTION FOR STEP 3 ---
export async function changePassword(newPassword: string): Promise<void> {
  // 1. Update the actual Supabase Auth password.
  // This invalidates the temporary password immediately.
  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (authError) {
    // If the password update fails (e.g., weak password), throw immediately.
    // We DO NOT update the database flag if this fails.
    throw authError;
  }

  // 2. Get the current authenticated user's ID to update their profile.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Failed to retrieve user session after password update.");
  }

  // 3. Update the profile flag in the database.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) {
    console.error("Failed to update must_change_password flag:", profileError);
    // Throw the error so the UI can report the database/RLS issue clearly.
    throw profileError; 
  }
}