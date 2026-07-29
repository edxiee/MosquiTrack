import { Mail } from "lucide-react";
import type { FieldError, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { LoginSchema } from "@/features/auth/schemas/login.schema";

interface EmailFieldProps {
  register: UseFormRegister<LoginSchema>;
  error?: FieldError | undefined;
}

export default function EmailField({
  register,
  error,
}: EmailFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email Address</Label>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          className="pl-10"
          {...register("email")}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}