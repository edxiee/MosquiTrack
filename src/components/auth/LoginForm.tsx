import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Mail, X } from "lucide-react";
import { toast } from "sonner";
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const [searchParams] = useSearchParams();
  const emailFromForgotPassword = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailFromForgotPassword,
      password: "",
    },
  });

  async function onSubmit(data: LoginSchema) {
    setUnconfirmedEmail(null);
    setAuthError(null);
    setResendSuccess(null);
    try {
      await login(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          setUnconfirmedEmail(data.email);
        } else {
          setAuthError(error.message);
        }
      } else {
        setAuthError("An unexpected error occurred while signing in.");
      }
    }
  }

  async function handleResend() {
    if (!unconfirmedEmail) return;
    setResending(true);
    setAuthError(null);
    try {
      await resendConfirmationEmail(unconfirmedEmail);
      const msg = "Confirmation email resent successfully! Please check your inbox.";
      setResendSuccess(msg);
      toast.success(msg);
      setUnconfirmedEmail(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to resend email.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (emailFromForgotPassword) {
      setValue("email", emailFromForgotPassword);
    }
  }, [emailFromForgotPassword, setValue]);

  const emailValue = watch("email");

  return (
    <form
      onSubmit={(event) => {
        handleSubmit(onSubmit)(event);
      }}
      className="space-y-5"
    >
      {authError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <span>{authError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            aria-label="Dismiss error"
            className="rounded p-0.5 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-700"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {resendSuccess && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{resendSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setResendSuccess(null)}
            aria-label="Dismiss notice"
            className="rounded p-0.5 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <EmailField register={register} error={errors.email} />
      <PasswordField register={register} error={errors.password} />

      <div className="flex items-center justify-between">
        <RememberMe />
        <Link
          to={
            emailValue?.trim()
              ? `/forgot-password?email=${encodeURIComponent(emailValue.trim())}`
              : "/forgot-password"
          }
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Forgot password?
        </Link>
      </div>

      {unconfirmedEmail && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border border-amber-200 rounded-md"
        >
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
