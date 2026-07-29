import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { UpdateUserRequest } from "./types.ts";
import { validateUpdateUser } from "./validators.ts";
import { updateUser } from "./user.service.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    try {
      const body = (await req.json()) as UpdateUserRequest;

      const validationError = validateUpdateUser(body);

      if (validationError) {
        return Response.json(
          {
            success: false,
            error: validationError,
          },
          {
            status: 400,
          }
        );
      }

      const result = await updateUser(body, ctx.supabaseAdmin);

      return Response.json({
        success: true,
        ...result,
      });
    } catch (err) {
      return Response.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        },
        {
          status: 500,
        }
      );
    }
  }),
};