import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";

interface AccountInformationFormProps {
  username: string;
  password: string;
  confirmPassword: string;
  errors: UserFormErrors;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export default function AccountInformationForm({
  username,
  password,
  confirmPassword,
  errors,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: AccountInformationFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Account Information</h3>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Enter username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        {errors.username && (
          <p className="text-sm text-destructive">{errors.username}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
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
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>
    </div>
  );
}
