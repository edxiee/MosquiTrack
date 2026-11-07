import { CreateUserRequest } from "./types.ts";

export async function createUser(
  body: CreateUserRequest,
  supabaseAdmin: any
) {
  // Normalize legacy role codes if present
  const normalizedRole =
    body.role === "MHO"
      ? "BRGY_ADMIN"
      : body.role === "BHW"
      ? "FIELD_OP"
      : body.role;

  // Validate the role exists BEFORE creating the auth account, so we
  // fail fast instead of leaving an orphaned auth user behind.
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_code", normalizedRole)
    .single();

  if (roleError || !roleData) {
    throw new Error(roleError?.message ?? `Role "${normalizedRole}" not found.`);
  }

  // Generate a dynamic default password (e.g. Default842!)
  const randomNum = Math.floor(Math.random() * 900) + 100; // 100 to 999
  const dynamicPassword = `Default${randomNum}!`;

  // handle_new_user() — a trigger on auth.users — automatically creates
  // the matching profiles row using this metadata. Do NOT also insert
  // into users/profiles here: that's what was colliding with the
  // trigger's own insert and causing every creation to fail.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: dynamicPassword,
    email_confirm: false, // Ensure email confirmation is required
    user_metadata: {
      first_name: body.firstName,
      middle_name: body.middleName || null,
      last_name: body.lastName,
      username: body.username,
      phone_number: body.phoneNumber,
      role: normalizedRole,
      municipality: body.municipality || null,
      barangay: body.barangay || null,
      temp_password: dynamicPassword, // To be used in the email template
    },
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? "Failed to create authentication user."
    );
  }

  // Trigger Supabase to send the confirmation email containing the default password
  const { error: resendError } = await supabaseAdmin.auth.resend({
    type: "signup",
    email: body.email,
  });

  if (resendError) {
    console.error("Failed to send confirmation email:", resendError);
    // We don't throw here because the user was already created successfully.
  }

  // Confirm the email in auth.users immediately AFTER sending the signup email
  // so the user can directly log in on the MosquiTrack login page using the
  // default password from the email (without being blocked by "Email not confirmed"),
  // while their profile status in public.profiles remains 'PENDING' until first login.
  const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user.id,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error("Failed to auto-confirm user email:", confirmError);
  }

  return {
    userId: data.user.id,
    message: "User created with PENDING status. A confirmation email has been sent.",
  };
}

export async function resendDefaultPasswordEmail(
  email: string,
  supabaseAdmin: any
) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? `User with email "${email}" not found.`);
  }

  // Temporarily unconfirm so Supabase auth.resend({ type: 'signup' }) sends the email template
  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email_confirm: false,
  });

  const { error: resendError } = await supabaseAdmin.auth.resend({
    type: "signup",
    email,
  });

  // Immediately re-confirm so the user can log in directly with their default password
  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email_confirm: true,
  });

  if (resendError) {
    throw new Error(resendError.message);
  }

  return {
    userId: profile.id,
    message: "Default password email resent successfully.",
  };
}