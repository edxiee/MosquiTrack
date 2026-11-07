import { CreateUserRequest } from "./types.ts";

const VALID_ROLES = [
  "SYS_ADMIN",
  "ADMIN",
  "BRGY_ADMIN",
  "FIELD_OP",
  "MHO",
  "BHW",
];

export function validateCreateUser(
  body: CreateUserRequest
): string | null {
  if (
    !body.firstName ||
    !body.lastName ||
    !body.email ||
    !body.username ||
    !body.phoneNumber ||
    !body.role
  ) {
    return "Required fields are missing.";
  }

  if (!VALID_ROLES.includes(body.role)) {
    return `Invalid role selected: ${body.role}`;
  }

  return null;
}