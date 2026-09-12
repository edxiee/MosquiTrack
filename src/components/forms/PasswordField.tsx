// src/components/forms/PasswordField.tsx
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import type { FieldError, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          className="h-12 text-base pl-12 pr-12"
          {...register("password")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 text-slate-500 hover:text-slate-900"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}