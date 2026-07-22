import { supabase } from "@/lib/supabase";

import type { LoginRequest } from "../types/login.type";

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