// src/components/forms/PasswordField.tsx
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import type { FieldError, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginSchema } from "@/schemas/login.schema";

interface PasswordFieldProps {
  register: UseFormRegister<LoginSchema>;
  error?: FieldError | undefined;
}

export default function PasswordField({
  register,
  error,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
        Password
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 pl-12 pr-12 text-base [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
          {...register("password")}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
