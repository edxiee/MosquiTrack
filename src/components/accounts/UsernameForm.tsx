import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UsernameFormProps {
  username: string;
  error: string | undefined;
  onUsernameChange: (value: string) => void;
}

export default function UsernameForm({
  username,
  error,
  onUsernameChange,
}: UsernameFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Username</h3>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter username"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
