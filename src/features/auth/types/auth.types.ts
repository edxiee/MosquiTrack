import type { Session, User } from "@supabase/supabase-js";

import type { LoginRequest } from "./login.type";

export interface AuthRole {
  id: string;
  role_code: string;
  role_name: string;
}

export interface AuthBarangay {
  id: string;
  barangay_name: string;
}

export interface AuthProfile {
  id: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;

  email: string;

  phone_number: string | null;

  is_active: boolean;

  role: AuthRole;

  barangay: AuthBarangay | null;
}

export interface AuthContextValue {
  session: Session | null;

  user: User | null;

  profile: AuthProfile | null;

  loading: boolean;

  isAuthenticated: boolean;

  login(data: LoginRequest): Promise<void>;

  logout(): Promise<void>;

  refreshProfile(): Promise<void>;
}