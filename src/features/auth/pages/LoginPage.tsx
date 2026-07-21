import AuthBackground from "../components/AuthBackground";
import AuthCard from "../components/AuthCard";
import AuthFooter from "../components/AuthFooter";
import AuthHeader from "../components/AuthHeader";
import AuthLogo from "../components/AuthLogo";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
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

          <AuthFooter
            text="Need access?"
            linkText="Request Account"
            href="/register"
          />
        </div>
      </AuthCard>
    </main>
  );
}