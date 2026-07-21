import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import type { FieldError, UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { LoginSchema } from "@/features/auth/schemas/login.schema";

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
      <Label htmlFor="password">Password</Label>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          className="px-10"
          {...register("password")}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
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