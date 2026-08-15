import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthContextValue, AuthProfile } from "@/types/auth.types";
import type { LoginRequest } from "@/types/login.type";
import {
  login as loginService,
  logout as logoutService,
} from "@/services/auth.service";
import { getCurrentProfile } from "@/services/profile.service";

export const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const p = await getCurrentProfile();
      setProfile(p);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
    }
  }

  async function login(data: LoginRequest) {
    await loginService(data);
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
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          await refreshProfile();
        }
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true);

      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession) {
          await refreshProfile();
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

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
        isAuthenticated: !!session && !!profile,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

export default AuthProvider;
