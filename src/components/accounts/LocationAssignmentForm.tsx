import { useState, useEffect, useMemo } from "react";
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
  municipality,
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
          .order("municipality")
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

  // Unique list of municipalities
  const municipalities = useMemo(() => {
    const set = new Set(barangays.map((b) => b.municipality).filter(Boolean));
    return Array.from(set).sort();
  }, [barangays]);

  // Barangays that belong to the currently selected municipality
  const filteredBarangays = useMemo(() => {
    if (!municipality) return [];
    return barangays
      .filter((b) => b.municipality === municipality)
      .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name));
  }, [barangays, municipality]);

  // When municipality changes, clear barangay if it no longer belongs
  const handleMunicipalityChange = (value: string) => {
    onMunicipalityChange(value);

    // Clear barangay if it doesn't belong to the new municipality
    const stillValid = barangays.some(
      (b) => b.municipality === value && b.barangay_name === barangay
    );
    if (!stillValid) {
      onBarangayChange("");
    }
  };

  if (role === "") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Location Assignment</h3>

      {/* Municipality */}
      <div className="space-y-2">
        <Label htmlFor="municipality">
          Municipality <span className="text-rose-500">*</span>
        </Label>
        <select
          id="municipality"
          value={municipality ?? ""}
          onChange={(e) => handleMunicipalityChange(e.target.value)}
          disabled={loading}
          className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
        >
          <option value="" disabled>
            {loading ? "Loading municipalities…" : "Select municipality"}
          </option>
          {municipalities.map((muni) => (
            <option key={muni} value={muni}>
              {muni}
            </option>
          ))}
        </select>
        {errors.municipality && (
          <p className="text-sm text-destructive">{errors.municipality}</p>
        )}
      </div>

      {/* Barangay – only for BHW / SYS_ADMIN */}
      {(role === "BHW" || role === "SYS_ADMIN") && (
        <div className="space-y-2">
          <Label htmlFor="barangay">
            Barangay <span className="text-rose-500">*</span>
          </Label>
          <select
            id="barangay"
            value={barangay ?? ""}
            onChange={(e) => onBarangayChange(e.target.value)}
            disabled={!municipality || loading}
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              {!municipality
                ? "Select a municipality first"
                : filteredBarangays.length === 0
                ? "No barangays found"
                : "Select barangay"}
            </option>
            {filteredBarangays.map((b) => (
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