import type { User } from "../types/user";

export const mockUsers: User[] = [
  {
    id: "1",
    firstName: "Ed Christian",
    lastName: "Villanueva",
    email: "sysadmin@mosquitrack.com",
    role: "SYS_ADMIN",
    assignedArea: "System",
    status: "Active",
  },
  {
    id: "2",
    firstName: "Maria",
    lastName: "Santos",
    email: "mho@mosquitrack.com",
    role: "MHO",
    assignedArea: "Villanueva",
    status: "Active",
  },
  {
    id: "3",
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "bhw@mosquitrack.com",
    role: "BHW",
    assignedArea: "Barangay San Isidro",
    status: "Inactive",
  },
];