import { Link } from "react-router-dom";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLogo from "@/components/auth/AuthLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <AuthBackground />

      <AuthCard>
        <div className="space-y-6">
          <AuthLogo />

          <AuthHeader
            title="Reset Password"
            description="Enter your email address to receive password reset instructions."
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Password reset instructions sent if email exists.");
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
              Send Reset Link
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link to="/" className="font-medium text-emerald-600 hover:text-emerald-700">
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthCard>
    </main>
  );
}
