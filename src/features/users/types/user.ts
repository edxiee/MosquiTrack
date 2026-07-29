export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  role: "SYS_ADMIN" | "MHO" | "BHW";

  assignedArea: string;

  status: "Active" | "Inactive";
}