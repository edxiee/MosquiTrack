import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";

interface ContactInformationFormProps {
  email: string;
  phoneNumber: string;
  errors: UserFormErrors;
  onEmailChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
}

export default function ContactInformationForm({
  email,
  phoneNumber,
  errors,
  onEmailChange,
  onPhoneNumberChange,
}: ContactInformationFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contact Information</h3>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={email ?? ""}
          onChange={(e) => onEmailChange(e.target.value)}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          placeholder="09XXXXXXXXXX"
          value={phoneNumber ?? ""}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
        />
        {errors.phoneNumber && (
          <p className="text-sm text-destructive">{errors.phoneNumber}</p>
        )}
      </div>
    </div>
  );
}
