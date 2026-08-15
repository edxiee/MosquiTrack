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

  if (!profile.role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowed.includes(profile.role.role_code)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
