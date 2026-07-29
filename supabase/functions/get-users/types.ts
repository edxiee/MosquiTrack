export interface User {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  username: string;
  phone_number: string | null;
  role: string;
  municipality: string | null;
  barangay: string | null;
  email: string;
  status: string;
  invited_at: string;
  activated_at: string | null;
}