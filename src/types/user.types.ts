export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "SYS_ADMIN" | "MHO" | "BHW";
  assignedArea: string;
  status: "Active" | "Inactive";
}

export interface DatabaseUser {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  username: string;
  phone_number: string | null;
  role: "SYS_ADMIN" | "MHO" | "BHW";
  municipality: string | null;
  barangay: string | null;
  email: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  invited_at: string;
  activated_at: string | null;
}

export interface BaseUserForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  username: string;
  role: "" | "SYS_ADMIN" | "MHO" | "BHW";
  municipality: string;
  barangay: string;
}

export interface CreateUserForm extends BaseUserForm {
  password: string;
  confirmPassword: string;
}

export interface UpdateUserForm extends BaseUserForm {
  id: string;
}

export interface UserFormErrors {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  role?: string;
  municipality?: string;
  barangay?: string;
  password?: string;
  confirmPassword?: string;
}
