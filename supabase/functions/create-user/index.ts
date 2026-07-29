import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { CreateUserRequest } from "./types.ts";
import { validateCreateUser } from "./validators.ts";
import { createUser } from "./user.service.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    try {
      const body = (await req.json()) as CreateUserRequest;

      const validationError = validateCreateUser(body);

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

      const result = await createUser(body, ctx.supabaseAdmin);

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