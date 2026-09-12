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

  // Deactivated accounts never reach protected pages
  if (!profile.is_active) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!profile.role) {
    return <Navigate to="/unauthorized" replace />;
  }

  const roleCode = profile.role.role_code;

  // Not allowed for this route
  if (!allowed.includes(roleCode)) {
    // Special redirect for BHW and MHO
    if (roleCode === "BHW") {
      return <Navigate to="/bhw/dashboard" replace />;
    }
    if (roleCode === "MHO") {
      return <Navigate to="/lgu/dashboard" replace />;
    }

    // Everyone else
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}