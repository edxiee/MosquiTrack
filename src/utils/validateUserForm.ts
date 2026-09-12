import type {
  CreateUserForm,
  UpdateUserForm,
  UserFormErrors,
} from "@/types/user.types";

export function validateCreateUserForm(formData: CreateUserForm): UserFormErrors {
  const errors: UserFormErrors = {};

  // Personal Information
  if (!(formData.firstName ?? "").trim()) {
    errors.firstName = "First name is required.";
  }

  if (!(formData.lastName ?? "").trim()) {
    errors.lastName = "Last name is required.";
  }

  // Contact Information
  if (!(formData.email ?? "").trim()) {
    errors.email = "Email is required.";
  }

  if (!(formData.phoneNumber ?? "").trim()) {
    errors.phoneNumber = "Phone number is required.";
  }

  // Username
  if (!(formData.username ?? "").trim()) {
    errors.username = "Username is required.";
  }

  // --- REMOVED PASSWORD VALIDATION ---
  // Per Feature 5, the admin does NOT manually enter a password.
  // The Edge Function auto-generates a secure temporary password.

  // Role
  if (!formData.role) {
    errors.role = "Please select a role.";
  }

  // Location
  if (!formData.municipality?.trim()) {
    errors.municipality = "Municipality is required";
  }

  // FIXED: Added parentheses for correct logical grouping
  if (
    (formData.role === "BHW" || formData.role === "SYS_ADMIN") &&
    !formData.barangay?.trim()
  ) {
    errors.barangay = "Barangay is required";
  }

  return errors;
}

export function validateUpdateUserForm(
  formData: UpdateUserForm
): UserFormErrors {
  const errors: UserFormErrors = {};

  // Personal Information
  if (!(formData.firstName ?? "").trim()) {
    errors.firstName = "First name is required.";
  }

  if (!(formData.lastName ?? "").trim()) {
    errors.lastName = "Last name is required.";
  }

  // Contact Information
  if (!(formData.email ?? "").trim()) {
    errors.email = "Email is required.";
  }

  if (!(formData.phoneNumber ?? "").trim()) {
    errors.phoneNumber = "Phone number is required.";
  }

  // Username
  if (!(formData.username ?? "").trim()) {
    errors.username = "Username is required.";
  }

  // Role
  if (!formData.role) {
    errors.role = "Please select a role.";
  }

  // Location
  if (!formData.municipality?.trim()) {
    errors.municipality = "Municipality is required";
  }

  // FIXED: Added parentheses for correct logical grouping
  if (
    (formData.role === "BHW" || formData.role === "SYS_ADMIN") &&
    !formData.barangay?.trim()
  ) {
    errors.barangay = "Barangay is required";
  }

  return errors;
}