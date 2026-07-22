import { supabase } from "@/lib/supabase";
import type { RegisterRequest } from "../types/register.type";

export async function register(data: RegisterRequest) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw error;
  }

  return authData;
}