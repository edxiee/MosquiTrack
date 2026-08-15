import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFormProps {
  password: string;
  confirmPassword: string;
  passwordError: string | undefined;
  confirmPasswordError: string | undefined;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export default function PasswordForm({
  password,
  confirmPassword,
  passwordError,
  confirmPasswordError,
  onPasswordChange,
  onConfirmPasswordChange,
}: PasswordFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        {passwordError && (
          <p className="text-sm text-red-500">{passwordError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
        />
        {confirmPasswordError && (
          <p className="text-sm text-red-500">{confirmPasswordError}</p>
        )}
      </div>
    </div>
  );
}
