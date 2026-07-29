import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { UserFormErrors } from "../types/user-form-errors";
import type { BaseUserForm } from "../types/base-user-form";

interface RoleAssignmentFormProps {
  role: BaseUserForm["role"];
  errors: UserFormErrors;
  onRoleChange: (value: BaseUserForm["role"]) => void;
}

export default function RoleAssignmentForm({
  role,
  errors,
  onRoleChange,
}: RoleAssignmentFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Role Assignment
      </h3>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role
        </Label>

        <Select
          value={role}
          onValueChange={(value) =>
            onRoleChange(value as BaseUserForm["role"])
          }
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="SYS_ADMIN">
              System Administrator
            </SelectItem>

            <SelectItem value="MHO">
              Municipal Health Officer
            </SelectItem>

            <SelectItem value="BHW">
              Barangay Health Worker
            </SelectItem>
          </SelectContent>
        </Select>

        {errors.role && (
          <p className="text-sm text-destructive">
            {errors.role}
          </p>
        )}
      </div>
    </div>
  );
}