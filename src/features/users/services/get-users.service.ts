import { supabase } from "@/lib/supabase";

import type { DatabaseUser } from "../types/database-user";

export async function getUsers(): Promise<DatabaseUser[]> {
  const { data, error } = await supabase.functions.invoke("get-users");

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.users as DatabaseUser[];
}