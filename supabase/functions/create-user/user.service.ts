import { CreateUserRequest } from "./types.ts";

export async function createUser(
  body: CreateUserRequest,
  supabaseAdmin: any
) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? "Failed to create authentication user."
    );
  }

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_code", body.role)
    .single();

  if (roleError || !roleData) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    throw new Error(
      roleError?.message ?? "Role not found."
    );
  }

  const { error: profileError } = await supabaseAdmin
  .from("users")
  .insert({
    id: data.user.id,
    first_name: body.firstName,
    middle_name: body.middleName || null,
    last_name: body.lastName,
    email: body.email,
    username: body.username,
    phone_number: body.phoneNumber,
    role: body.role,
    municipality: body.municipality,
    barangay: body.barangay,
    status: "PENDING",
  });

if (profileError) {
  await supabaseAdmin.auth.admin.deleteUser(data.user.id);

  throw new Error(profileError.message);
}

  const { error: authProfileError } = await supabaseAdmin
  .from("profiles")
  .update({
    first_name: body.firstName,
    middle_name: body.middleName || null,
    last_name: body.lastName,
    email: body.email,
    phone_number: body.phoneNumber,
    role_id: roleData.id,
    barangay_id: null,
    is_active: true,
  })
  .eq("id", data.user.id);

  if (authProfileError) {
    await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", data.user.id);

    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

    throw new Error(authProfileError.message);
  }

  return {
    userId: data.user.id,
    message: "User created successfully.",
  };
}