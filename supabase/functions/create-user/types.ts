export interface CreateUserRequest {
  action?: "create" | "resend";
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string;
  role: "SYS_ADMIN" | "ADMIN" | "BRGY_ADMIN" | "FIELD_OP" | "MHO" | "BHW";
  municipality?: string | null;
  barangay?: string | null;
}