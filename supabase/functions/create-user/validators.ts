import { CreateUserRequest } from "./types.ts";

export function validateCreateUser(
  body: CreateUserRequest
): string | null {
  if (
    !body.firstName ||
    !body.lastName ||
    !body.email ||
    !body.username ||
    !body.password ||
    !body.phoneNumber ||
    !body.role
  ) {
    return "Required fields are missing.";
  }

  if (
    (body.role === "MHO" || body.role === "BHW") &&
    !body.municipality
  ) {
    return "Municipality is required.";
  }

  if (
    body.role === "BHW" &&
    !body.barangay
  ) {
    return "Barangay is required.";
  }

  return null;
}