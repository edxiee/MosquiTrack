import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserFormErrors, BaseUserForm } from "@/types/user.types";

interface RoleAssignmentFormProps {
  role: BaseUserForm["role"];
  errors: UserFormErrors;
  onRoleChange: (value: BaseUserForm["role"]) => void;
  /** Role of the currently logged-in user */
  currentUserRole?: string | null | undefined;
  disabled?: boolean;
}

export default function RoleAssignmentForm({
  role,
  errors,
  onRoleChange,
  currentUserRole,
  disabled = false,
}: RoleAssignmentFormProps) {

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Role
      </h3>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-rose-500">*</span>
        </Label>

        <Select
          value={role ?? ""}
          onValueChange={(value) => onRoleChange(value as BaseUserForm["role"])}
          disabled={disabled}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>

          <SelectContent>
            {(currentUserRole === "SYS_ADMIN" || role === "SYS_ADMIN") && (
              <SelectItem
                value="SYS_ADMIN"
                disabled={currentUserRole !== "SYS_ADMIN"}
              >
                System Administrator
              </SelectItem>
            )}

            {(currentUserRole === "SYS_ADMIN" ||
              currentUserRole === "ADMIN" ||
              role === "ADMIN") && (
              <SelectItem value="ADMIN" disabled={currentUserRole !== "SYS_ADMIN"}>
                Site Administrator
              </SelectItem>
            )}

            <SelectItem value="MHO">Municipal Health Officer</SelectItem>
            <SelectItem value="BHW">Barangay Health Worker</SelectItem>
          </SelectContent>
        </Select>

        {errors.role && (
          <p className="text-sm text-destructive">{errors.role}</p>
        )}
      </div>
    </div>
  );
}