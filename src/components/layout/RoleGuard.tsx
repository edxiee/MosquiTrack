import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { RoleCode } from "@/constants/roles";

interface RoleGuardProps {
  allow?: RoleCode[];
  allowedRoles?: RoleCode[];
  children: ReactNode;
}

export default function RoleGuard({ allow, allowedRoles, children }: RoleGuardProps) {
  const { loading, profile } = useAuth();
  const allowed = allow ?? allowedRoles ?? [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  // A deactivated account must never reach protected pages, regardless
  // of role — this takes priority over the role check below.
  if (!profile.is_active) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!profile.role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowed.includes(profile.role.role_code)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}