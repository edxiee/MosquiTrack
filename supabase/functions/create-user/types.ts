export interface CreateUserRequest {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phoneNumber: string;
  role: "ADMIN" | "MHO" | "BHW";
  municipality: string;
  barangay: string;
}