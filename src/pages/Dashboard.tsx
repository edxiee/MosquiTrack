import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath } from "@/utils/getDashboardPath";

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!profile?.role?.role_code) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={getDashboardPath(profile.role.role_code)} replace />;
}
