export interface UpdateUserRequest {
  id: string;

  firstName: string;
  middleName: string;
  lastName: string;

  email: string;
  username: string;
  phoneNumber: string;

  role: "SYS_ADMIN" | "MHO" | "BHW";

  municipality: string;
  barangay: string;
}