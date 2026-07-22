import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

import { AuthContext } from "./AuthContext";

import type { AuthProfile } from "../types/auth.types";
import type { LoginRequest } from "../types/login.type";

import {
  login as loginService,
  logout as logoutService,
} from "../services/auth.service";

import { getCurrentProfile } from "../services/profile.service";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] =
    useState<AuthProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function refreshProfile() {
    try {
      const profile = await getCurrentProfile();

      setProfile(profile);
    } catch (error) {
      console.error("Failed to load profile:", error);

      setProfile(null);
    }
  }

  async function login(data: LoginRequest) {
    await loginService(data);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSession(session);

    setUser(session?.user ?? null);

    await refreshProfile();
  }

  async function logout() {
    await logoutService();

    setSession(null);

    setUser(null);

    setProfile(null);
  }

  useEffect(() => {
    async function initializeAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);

        setUser(session?.user ?? null);

        if (session) {
          await refreshProfile();
        }
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        setUser(session?.user ?? null);

        if (session) {
          await refreshProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,

        isAuthenticated: !!session,

        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}