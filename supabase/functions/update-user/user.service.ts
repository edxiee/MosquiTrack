import { UpdateUserRequest } from "./types.ts";

export async function updateUser(
  body: UpdateUserRequest,
  supabaseAdmin: any
) {
  // Get the current user profile
  const { data: existingUser, error: fetchError } =
    await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", body.id)
      .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // Update the Auth email only if it changed
  if (existingUser.email !== body.email) {
    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(
        body.id,
        {
          email: body.email,
        }
      );

    if (authError) {
      throw new Error(authError.message);
    }
  }

  // Update the user's profile
  const { error: profileError } =
    await supabaseAdmin
      .from("users")
      .update({
        first_name: body.firstName,
        middle_name: body.middleName || null,
        last_name: body.lastName,
        email: body.email,
        username: body.username,
        phone_number: body.phoneNumber,
        role: body.role,
        municipality: body.municipality,
        barangay: body.barangay,
      })
      .eq("id", body.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    userId: body.id,
    message: "User updated successfully.",
  };
}