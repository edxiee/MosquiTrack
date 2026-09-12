import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";

interface ContactInformationFormProps {
  email: string;
  phoneNumber: string;
  errors: UserFormErrors;
  onEmailChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  isEditing?: boolean; // ← add this
}

export default function ContactInformationForm({
  email,
  phoneNumber,
  errors,
  onEmailChange,
  onPhoneNumberChange,
  isEditing = false, // ← default false (create mode)
}: ContactInformationFormProps) {
  const handlePhoneChange = (value: string) => {
    // Keep only numbers and limit to 11 digits
    const numbersOnly = value.replace(/\D/g, "").slice(0, 11);
    onPhoneNumberChange(numbersOnly);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">-- Contact Information </h3>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={email ?? ""}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={isEditing}          // ← cannot change when editing
          className={isEditing ? "bg-muted cursor-not-allowed" : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">
          Phone Number <span className="text-rose-500">*</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={11}
          placeholder="09XXXXXXXXXX"
          value={phoneNumber ?? ""}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
        {errors.phoneNumber && (
          <p className="text-sm text-destructive">{errors.phoneNumber}</p>
        )}
      </div>
    </div>
  );
}