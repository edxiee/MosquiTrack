import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";

interface AccountInformationFormProps {
  username: string;
  errors: UserFormErrors;
  onUsernameChange: (value: string) => void;
}

export default function AccountInformationForm({
  username,
  errors,
  onUsernameChange,
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
    </div>
  );
}
