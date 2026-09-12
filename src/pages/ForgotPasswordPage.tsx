import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthLogo from "@/components/auth/AuthLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await sendPasswordResetEmail(email);
      setMessage(
        "If an account exists for that email address, check your inbox for the reset link."
      );
      setEmail("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to send the reset link. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <AuthBackground />

      <AuthCard>
        <div className="space-y-6">
          <AuthLogo />

          <AuthHeader
            title="Reset Password"
            description="Enter your email address to receive a reset link."
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {message && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
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
