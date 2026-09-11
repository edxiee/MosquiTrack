// src/pages/shared/ChangePasswordPage.tsx

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { changePassword } from "@/services/auth.service";
import { getDashboardPath } from "@/utils/getDashboardPath";

export default function ChangePasswordPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [errors, setErrors] = useState<{ new?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  const validate = () => {
    const newErrors: { new?: string; confirm?: string } = {};

    if (!newPassword) {
      newErrors.new = "New password is required.";
    } else if (!passwordRegex.test(newPassword)) {
      newErrors.new = "Password does not meet the requirements.";
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

      // 3. Redirect to the correct dashboard based on their role
      if (profile) {
        const dashboardPath = getDashboardPath(profile.role.role_code);
        navigate(dashboardPath, { replace: true });
      } else {
        // Fallback if profile is somehow missing
        navigate("/", { replace: true });
      }
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
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
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter new password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {errors.new && (
              <p className="mt-1 text-xs text-red-600">{errors.new}</p>
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Confirm new password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirm && (
              <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">
              Password requirements:
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>At least 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>

          {/* API Error Message */}
          {apiError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}