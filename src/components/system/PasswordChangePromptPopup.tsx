import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function PasswordChangePromptPopup() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile?.must_change_password) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="password-action-required-title"
      aria-describedby="password-action-required-desc"
      className="fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-2xl border border-amber-200 border-t-4 border-t-amber-500 bg-white p-5 shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3
            id="password-action-required-title"
            className="text-base font-bold leading-tight text-slate-900"
          >
            Action Required
          </h3>
          <p
            id="password-action-required-desc"
            className="text-sm text-slate-600"
          >
            Change password to fully secure the account.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <Button
          onClick={() => navigate("/change-password")}
          className="w-full rounded-lg bg-amber-600 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Change Password
        </Button>
      </div>
    </div>
  );
}
