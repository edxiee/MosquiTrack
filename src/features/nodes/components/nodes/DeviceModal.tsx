import { useState, useEffect } from "react";
import { Plus, Pencil, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { emptyDeviceForm } from "../../constants/device";
import { formatBarangayLabel } from "../../utils/deviceHelpers";
import {
  createDevice,
  updateDevice,
  maybeForceActive,
} from "../../services/deviceService";
import type {
  OvitrapDevice,
  DeviceStatus,
  Barangay,
  DeviceFormData,
} from "../../types/device";

interface DeviceModalProps {
  open: boolean;
  mode: "create" | "edit";
  device?: OvitrapDevice | null;
  statuses: DeviceStatus[];
  barangays: Barangay[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeviceModal({
  open,
  mode,
  device,
  statuses,
  barangays,
  onClose,
  onSuccess,
}: DeviceModalProps) {
  const [form, setForm] = useState<DeviceFormData>(emptyDeviceForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStatusName =
    mode === "edit" && device
      ? device.device_statuses?.status_name ?? "Offline"
      : "Offline";

  const isStatusLocked = currentStatusName === "Offline";

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (mode === "edit" && device) {
      setForm({
        device_code: device.device_code ?? "",
        serial_number: device.serial_number ?? "",
        barangay_id: device.barangay_id ?? "",
        description: device.description ?? "",
        notes: device.notes ?? "",
        device_status_id: device.device_status_id ?? "",
      });
    } else {
      const offline = statuses.find((s) => s.status_name === "Offline");
      setForm({
        ...emptyDeviceForm,
        device_status_id: offline?.id ?? "",
      });
    }
  }, [open, mode, device, statuses]);

  if (!open) return null;

  const handleChange = (field: keyof DeviceFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.device_code.trim()) {
      setError("Trap ID is required.");
      return;
    }
    if (!form.device_status_id) {
      setError("Please select a status.");
      return;
    }

    const selectedStatus = statuses.find((s) => s.id === form.device_status_id);
    if (selectedStatus?.status_name === "Active") {
      const hasCoords =
        mode === "edit" &&
        device?.latitude != null &&
        device?.longitude != null;

      if (!hasCoords) {
        setError(
          "Cannot set status to Active. The device must have latitude and longitude first (use Set Location)."
        );
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        device_code: form.device_code.trim(),
        serial_number: form.serial_number.trim() || null,
        barangay_id: form.barangay_id || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        device_status_id: form.device_status_id,
        deployed_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      if (mode === "create") {
        await createDevice(payload);
      } else {
        await updateDevice(device!.id, payload);

        await maybeForceActive(
          device!.id,
          device!.device_statuses?.status_name,
          device!.latitude,
          device!.longitude,
          user?.id ?? null
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === "create" ? "Create Node" : "Edit Trap"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "create"
                ? "Add a new ovitrap device"
                : `Editing ${device?.device_code}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Trap ID <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={form.device_code}
              onChange={(e) => handleChange("device_code", e.target.value)}
              placeholder="e.g. TRAP-005"
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Serial Number
            </Label>
            <Input
              value={form.serial_number}
              onChange={(e) => handleChange("serial_number", e.target.value)}
              placeholder="Optional"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Barangay
            </Label>
            <select
              value={form.barangay_id}
              onChange={(e) => handleChange("barangay_id", e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select barangay…</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatBarangayLabel(b)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Description
            </Label>
            <Input
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="e.g. Near barangay hall"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Optional extra notes"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Status</Label>
            <select
              value={form.device_status_id}
              onChange={(e) => handleChange("device_status_id", e.target.value)}
              disabled={isStatusLocked}
              className={`w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isStatusLocked ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
              }`}
            >
              <option value="" disabled>
                Select status…
              </option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.status_name}
                </option>
              ))}
            </select>
            {isStatusLocked && (
              <p className="text-[11px] text-slate-500 mt-1">
                Status is locked to Offline until the device has coordinates
                (use Set Location).
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : mode === "create" ? (
                <>
                  <Plus className="w-4 h-4" />
                  Create Node
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}