import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLogo from "@/components/auth/AuthLogo";
import LoginForm from "@/components/auth/LoginForm";
import { getDashboardPath } from "@/utils/getDashboardPath";

export default function LoginPage() {
  const { loading, isAuthenticated, profile } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500">
        Checking session...
      </main>
    );
  }

  if (isAuthenticated && profile?.role?.role_code) {
    return (
      <Navigate
        to={getDashboardPath(profile.role.role_code)}
        replace
      />
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <AuthBackground />

      <AuthCard>
        <div className="space-y-8">
          <AuthLogo />

          <AuthHeader
            title="Welcome back"
            description="Please enter your credentials to access the dashboard."
          />

          <LoginForm />
        </div>
      </AuthCard>
    </main>
  );
}
