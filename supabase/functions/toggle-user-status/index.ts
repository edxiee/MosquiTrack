import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { userId, action } = await req.json();
    if (!userId || (action !== "activate" && action !== "deactivate")) {
      throw new Error(
        'userId and action ("activate" | "deactivate") are required',
      );
    }

    let nextStatus: "ACTIVE" | "INACTIVE" | "PENDING";

    if (action === "deactivate") {
      nextStatus = "INACTIVE";
    } else {
      // Reactivating: if they'd logged in before, go back to ACTIVE;
      // if they never had, they're still just PENDING.
      const { data: userRow, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("activated_at")
        .eq("id", userId)
        .single();
      if (fetchError) throw fetchError;
      nextStatus = userRow.activated_at ? "ACTIVE" : "PENDING";
    }

    // The actual table your Users list reads from
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .update({ status: nextStatus })
      .eq("id", userId);
    if (usersError) throw usersError;

    // Keep profiles.is_active in sync too, since that's what your
    // auth/RoleGuard flow relies on for access control
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: action === "activate" })
      .eq("id", userId);
    if (profileError) throw profileError;

    // Block/unblock sign-in at the Supabase Auth level too
    const { error: banError } = await supabaseAdmin.auth.admin
      .updateUserById(userId, {
        ban_duration: action === "deactivate" ? "876000h" : "none", // ~100 years
      });
    if (banError) throw banError;

    return new Response(
      JSON.stringify({ success: true, status: nextStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});