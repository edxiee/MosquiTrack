import type { UpdateUserForm } from "../types/update-user-form";
import type { UserFormErrors } from "../types/user-form-errors";

export function validateUpdateUserForm(
  formData: UpdateUserForm
): UserFormErrors {
  const errors: UserFormErrors = {};

  // Personal Information
  if (!formData.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!formData.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  // Contact Information
  if (!formData.email.trim()) {
    errors.email = "Email is required.";
  }

  if (!formData.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  }

  // Username
  if (!formData.username.trim()) {
    errors.username = "Username is required.";
  }

  // Role
  if (!formData.role) {
    errors.role = "Please select a role.";
  }

  // Location
  if (
    (formData.role === "MHO" ||
      formData.role === "BHW") &&
    !formData.municipality.trim()
  ) {
    errors.municipality = "Municipality is required.";
  }

  if (
    formData.role === "BHW" &&
    !formData.barangay.trim()
  ) {
    errors.barangay = "Barangay is required.";
  }

  return errors;
}