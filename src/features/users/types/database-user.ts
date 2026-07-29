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