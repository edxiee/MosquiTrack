export interface CreateUserRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string;
  role: "SYS_ADMIN" | "ADMIN" | "MHO" | "BHW";
  municipality?: string | null;
  barangay?: string | null;
}