import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

import type { RoleCode } from "../constants/roles";

interface RoleGuardProps {
  allow: RoleCode[];
  children: React.ReactNode;
}

export default function RoleGuard({
  allow,
  children,
}: RoleGuardProps) {
  const {
    loading,
    profile,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (!allow.includes(profile.role.role_code)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}