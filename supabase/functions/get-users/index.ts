import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { getUsers } from "./user.service.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (_req, ctx) => {
    try {
      const users = await getUsers(ctx.supabaseAdmin);

      return Response.json({
        success: true,
        users,
      });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        },
        {
          status: 500,
        }
      );
    }
  }),
};