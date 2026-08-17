/**
 * Safely extracts a user-readable error message from an unknown error object,
 * handling standard Error instances, Supabase PostgrestError objects, and string errors.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }
    if (typeof obj.error_description === "string" && obj.error_description.trim()) {
      return obj.error_description;
    }
    if (typeof obj.details === "string" && obj.details.trim()) {
      return obj.details;
    }
    if (typeof obj.hint === "string" && obj.hint.trim()) {
      return obj.hint;
    }
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback;
}
