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