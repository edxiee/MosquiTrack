// src/components/forms/EmailField.tsx
import { Mail } from "lucide-react";
import type { FieldError, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginSchema } from "@/schemas/login.schema";

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
      <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
        Email Address
      </Label>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          className="h-12 text-base pl-12"
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