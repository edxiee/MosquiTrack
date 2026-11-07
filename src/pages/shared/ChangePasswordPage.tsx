// src/pages/shared/ChangePasswordPage.tsx

import { useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Check, X } from "lucide-react";
import { changePassword, logout as logoutService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ChangePasswordPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [errors, setErrors] = useState<{ new?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // Requirement criteria checks
  const criteria = useMemo(() => {
    return [
      {
        id: "length",
        label: "At least 8 characters",
        valid: newPassword.length >= 8,
      },
      {
        id: "uppercase",
        label: "At least one uppercase letter",
        valid: /[A-Z]/.test(newPassword),
      },
      {
        id: "lowercase",
        label: "At least one lowercase letter",
        valid: /[a-z]/.test(newPassword),
      },
      {
        id: "number",
        label: "At least one number",
        valid: /\d/.test(newPassword),
      },
      {
        id: "special",
        label: "At least one special character",
        valid: /[^A-Za-z0-9]/.test(newPassword),
      },
    ];
  }, [newPassword]);

  const allCriteriaMet = useMemo(() => {
    return criteria.every((c) => c.valid);
  }, [criteria]);

  const validate = () => {
    const newErrors: { new?: string; confirm?: string } = {};

    if (!newPassword) {
      newErrors.new = "New password is required.";
    } else if (!allCriteriaMet) {
      newErrors.new = "Password does not meet all the requirements.";
    }

    if (!confirmPassword) {
      newErrors.confirm = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // 1. Update Supabase Auth and Database flag
      await changePassword(newPassword);

      // 2. Refresh the AuthContext profile so must_change_password becomes false
      await refreshProfile();

      // 3. End the recovery session and show the success confirmation
      await logoutService();
      setSuccessOpen(true);
    } catch (error: any) {
      console.error("Password change failed:", error);
      // Show a user-friendly error message
      setApiError(
        error.message || "Failed to change password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setSuccessOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-emerald-100 ring-1 ring-slate-900/5">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Change Your Password
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              You are currently using a temporary password. Create your own
              password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.new) {
                      setErrors((prev) => {
                        const { new: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 pr-16 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    newPassword.length > 0
                      ? allCriteriaMet
                        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                        : "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  placeholder="Enter new password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
              {errors.new && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.new}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirm) {
                      setErrors((prev) => {
                        const { confirm: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 pr-16 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    confirmPassword.length > 0
                      ? confirmPassword === newPassword
                        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                        : "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  placeholder="Confirm new password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {errors.confirm && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.confirm}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
              <p className="mb-2 font-semibold text-slate-700">
                Password requirements:
              </p>
              <ul className="space-y-1.5">
                {criteria.map((item) => {
                  const hasInput = newPassword.length > 0;
                  const isMet = item.valid;

                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-2 font-medium transition-colors ${
                        hasInput
                          ? isMet
                            ? "text-emerald-700"
                            : "text-red-600"
                          : "text-slate-500"
                      }`}
                    >
                      {hasInput ? (
                        isMet ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-500 shrink-0 stroke-[2.5]" />
                        )
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0 ml-1 mr-1" />
                      )}
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* Submit Button */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300 transition-colors"
              >
                {isSubmitting ? "Changing Password..." : "Change Password"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => navigate("/dashboard")}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 p-0 overflow-hidden" showCloseButton={false}>
          <div className="flex flex-col items-center space-y-6 px-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
            </div>

            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Password Successfully Changed!
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Your password has been updated. You can now log in using your new password.
              </DialogDescription>
            </div>

            <Button
              className="h-10 w-full rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={handleBackToLogin}
            >
              Back to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}