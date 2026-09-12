import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import EmailField from "@/components/forms/EmailField";
import PasswordField from "@/components/forms/PasswordField";
import RememberMe from "@/components/forms/RememberMe";
import SubmitButton from "@/components/forms/SubmitButton";
import { useAuth } from "@/contexts/AuthContext";
import { resendConfirmationEmail } from "@/services/users.service";
import {
  loginSchema,
  type LoginSchema,
} from "@/schemas/login.schema";

export default function LoginForm() {
  const { login } = useAuth();
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginSchema) {
    setUnconfirmedEmail(null);
    try {
      await login(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          setUnconfirmedEmail(data.email);
        } else {
          alert(error.message);
        }
      } else {
        alert("An unexpected error occurred.");
      }
    }
  }

  async function handleResend() {
    if (!unconfirmedEmail) return;
    setResending(true);
    try {
      await resendConfirmationEmail(unconfirmedEmail);
      alert("Confirmation email resent successfully! Please check your inbox.");
      setUnconfirmedEmail(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to resend email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        handleSubmit(onSubmit)(event);
      }}
      className="space-y-6"
    >
      <EmailField register={register} error={errors.email} />
      <PasswordField register={register} error={errors.password} />

      <div className="flex items-center justify-between">
        <RememberMe />
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Forgot password?
        </Link>
      </div>

      {unconfirmedEmail && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800 mb-3">
            Your email address has not been confirmed yet. Please check your inbox for the confirmation link.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-amber-900 bg-amber-100 border border-transparent rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
          >
            <Mail className="w-4 h-4 mr-2" />
            {resending ? "Resending..." : "Resend Confirmation Email"}
          </button>
        </div>
      )}

      <SubmitButton
        text={isSubmitting ? "Signing In..." : "Sign In"}
        loading={isSubmitting}
      />
    </form>
  );
}
