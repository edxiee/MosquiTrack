import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "../types/user-form-errors";

interface PersonalInformationFormProps {
  firstName: string;
  middleName: string;
  lastName: string;

  errors: UserFormErrors;

  onFirstNameChange: (value: string) => void;
  onMiddleNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}

export default function PersonalInformationForm({
  firstName,
  middleName,
  lastName,
  errors,
  onFirstNameChange,
  onMiddleNameChange,
  onLastNameChange,
}: PersonalInformationFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Personal Information
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name
          </Label>

          <Input
            id="firstName"
            placeholder="Enter first name"
            value={firstName}
            onChange={(e) =>
              onFirstNameChange(e.target.value)
            }
          />
          {errors.firstName && (
          <p className="text-sm text-destructive">
            {errors.firstName}
          </p>
        )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleName">
            Middle Name
          </Label>

          <Input
            id="middleName"
            placeholder="Enter middle name"
            value={middleName}
            onChange={(e) =>
              onMiddleNameChange(e.target.value)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">
          Last Name
        </Label>

        <Input
          id="lastName"
          placeholder="Enter last name"
          value={lastName}
          onChange={(e) =>
            onLastNameChange(e.target.value)
          }
        />
        {errors.lastName && (
        <p className="text-sm text-destructive">
          {errors.lastName}
        </p>
      )}
      </div>
    </div>
  );
}