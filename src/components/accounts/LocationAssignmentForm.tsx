import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";

interface LocationAssignmentFormProps {
  role: string;
  municipality: string;
  barangay: string;
  errors: UserFormErrors;
  onMunicipalityChange: (value: string) => void;
  onBarangayChange: (value: string) => void;
}

export default function LocationAssignmentForm({
  role,
  municipality,
  barangay,
  errors,
  onMunicipalityChange,
  onBarangayChange,
}: LocationAssignmentFormProps) {
  if (role === "SYS_ADMIN" || role === "") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Location Assignment</h3>

      <div className="space-y-2">
        <Label htmlFor="municipality">Municipality</Label>
        <Input
          id="municipality"
          placeholder="Enter municipality"
          value={municipality ?? ""}
          onChange={(e) => onMunicipalityChange(e.target.value)}
        />
        {errors.municipality && (
          <p className="text-sm text-destructive">{errors.municipality}</p>
        )}
      </div>

      {role === "BHW" && (
        <div className="space-y-2">
          <Label htmlFor="barangay">Barangay</Label>
          <Input
            id="barangay"
            placeholder="Enter barangay"
            value={barangay ?? ""}
            onChange={(e) => onBarangayChange(e.target.value)}
          />
          {errors.barangay && (
            <p className="text-sm text-destructive">{errors.barangay}</p>
          )}
        </div>
      )}
    </div>
  );
}
