import { UpdateUserRequest } from "./types.ts";

export function validateUpdateUser(
  body: UpdateUserRequest
): string | null {
  if (
    !body.id ||
    !body.firstName ||
    !body.lastName ||
    !body.email ||
    !body.username ||
    !body.phoneNumber ||
    !body.role
  ) {
    return "Required fields are missing.";
  }

  if (
    (body.role === "MHO" ||
      body.role === "BHW") &&
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