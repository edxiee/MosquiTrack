import { supabase } from "@/lib/supabase";
import type { DatabaseUser } from "@/types/user.types";

export async function getUsers(): Promise<DatabaseUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as DatabaseUser[]) ?? [];
}
