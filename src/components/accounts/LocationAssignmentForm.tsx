import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import type { UserFormErrors } from "@/types/user.types";
import { supabase } from "@/lib/supabase";

interface BarangayRow {
  id: string;
  barangay_name: string;
  municipality: string;
  province: string | null;
}

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
  barangay,
  errors,
  onMunicipalityChange,
  onBarangayChange,
}: LocationAssignmentFormProps) {
  const [barangays, setBarangays] = useState<BarangayRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all barangays once
  useEffect(() => {
    const loadBarangays = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("barangays")
          .select("id, barangay_name, municipality, province")
          .order("barangay_name");

        if (error) throw error;
        setBarangays(data ?? []);
      } catch (err) {
        console.error("Failed to load barangays:", err);
        setBarangays([]);
      } finally {
        setLoading(false);
      }
    };

    loadBarangays();
  }, []);

  const handleBarangayChange = (value: string) => {
    onBarangayChange(value);
    const selected = barangays.find((b) => b.barangay_name === value);
    if (selected?.municipality) {
      onMunicipalityChange(selected.municipality);
    }
  };

  if (role === "") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</h3>

      {/* Barangay – for FIELD_OP / BRGY_ADMIN / BHW / SYS_ADMIN / ADMIN */}
      {(role === "FIELD_OP" || role === "BRGY_ADMIN" || role === "BHW" || role === "SYS_ADMIN" || role === "ADMIN") && (
        <div className="space-y-2">
          <Label htmlFor="barangay">
            Barangay <span className="text-rose-500">*</span>
          </Label>
          <select
            id="barangay"
            value={barangay ?? ""}
            onChange={(e) => handleBarangayChange(e.target.value)}
            disabled={loading}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              {loading ? "Loading barangays…" : "Select barangay"}
            </option>
            {barangays.map((b) => (
              <option key={b.id} value={b.barangay_name}>
                {b.barangay_name}
              </option>
            ))}
          </select>
          {errors.barangay && (
            <p className="text-sm text-destructive">{errors.barangay}</p>
          )}
        </div>
      )}
    </div>
  );
}