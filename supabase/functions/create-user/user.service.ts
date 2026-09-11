import { CreateUserRequest } from "./types.ts";

// Cryptographically random — never hardcoded, never chosen by the
// admin. Generated fresh per account, server-side only.
function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/[+/=]/g, "").slice(0, 16);
}

export async function createUser(
  body: CreateUserRequest,
  supabaseAdmin: any
) {
  // Validate role exists BEFORE creating the auth account, so we fail
  // fast instead of leaving an orphaned auth user behind.
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_code", body.role)
    .single();

  if (roleError || !roleData) {
    throw new Error(roleError?.message ?? "Role not found.");
  }

  const temporaryPassword = generateTemporaryPassword();

  // handle_new_user() (a DB trigger on auth.users) creates the matching
  // profiles row automatically using this metadata, including setting
  // must_change_password = true for new accounts.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: temporaryPassword,
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
    temporaryPassword,
    message: "User created successfully.",
  };
}