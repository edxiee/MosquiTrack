import { CreateUserRequest } from "./types.ts";

export async function createUser(
  body: CreateUserRequest,
  supabaseAdmin: any
) {
  // Validate the role exists BEFORE creating the auth account, so we
  // fail fast instead of leaving an orphaned auth user behind.
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_code", body.role)
    .single();

  if (roleError || !roleData) {
    throw new Error(roleError?.message ?? "Role not found.");
  }

  // handle_new_user() — a trigger on auth.users — automatically creates
  // the matching profiles row using this metadata. Do NOT also insert
  // into users/profiles here: that's what was colliding with the
  // trigger's own insert and causing every creation to fail.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      first_name: body.firstName,
      middle_name: body.middleName || null,
      last_name: body.lastName,
      username: body.username,
      phone_number: body.phoneNumber,
      role: body.role,
      municipality: body.municipality,
      barangay: body.barangay,
    },
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? "Failed to create authentication user."
    );
  }

  return {
    userId: data.user.id,
    message: "User created successfully.",
  };
}