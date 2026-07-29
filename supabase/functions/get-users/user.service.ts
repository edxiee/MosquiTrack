import { User } from "./types.ts";

export async function getUsers(
  supabaseAdmin: any
): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data as User[];
}