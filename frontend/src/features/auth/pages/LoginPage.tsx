import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import AuthHeader from "../components/AuthHeader";
import AuthLogo from "../components/AuthLogo";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Checking session...
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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