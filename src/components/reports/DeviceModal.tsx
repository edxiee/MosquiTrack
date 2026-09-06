import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { emptyDeviceForm } from "@/constants/device";
import { formatBarangayLabel } from "@/utils/deviceHelpers";
import {
  createDevice,
  updateDevice,
} from "@/services/device.service";
import type {
  OvitrapDevice,
  DeviceStatus,
  Barangay,
  DeviceFormData,
} from "@/types/device.types";

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

  // Success state after creating a new node
  const [createdResult, setCreatedResult] = useState<{
    id: string;
    device_code: string;
  } | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setError(null);
      setCreatedResult(null);

      const offlineStatus =
        statuses.find((s) => s.status_name === "Offline") ?? statuses[0];

      if (mode === "edit" && device) {
        setForm({
          device_code: device.device_code ?? "",
          serial_number: device.serial_number ?? "",
          barangay_id: device.barangay_id ?? "",
          description: device.description ?? "",
          notes: device.notes ?? "",
          device_status_id: device.device_status_id ?? offlineStatus?.id ?? "",
        });
      } else {
        setForm({
          ...emptyDeviceForm,
          device_status_id: offlineStatus?.id ?? "",
        });
      }
    }
    prevOpenRef.current = open;
  }, [open, mode, device, statuses]);

  if (!open) return null;

  const handleClose = () => {
    setCreatedResult(null);
    onClose();
  };

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

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const offlineStatus =
        statuses.find((s) => s.status_name === "Offline") ?? statuses[0];
      const targetStatusId = form.device_status_id || offlineStatus?.id || null;

      const payload = {
        device_code: form.device_code.trim(),
        serial_number: form.serial_number.trim() || null,
        barangay_id: form.barangay_id || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        device_status_id: targetStatusId,
        deployed_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      if (mode === "create") {
        const created = await createDevice(payload);
        setCreatedResult(created);
        onSuccess();
      } else {
        await updateDevice(device!.id, payload);
        onSuccess();
        handleClose();
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {createdResult
                ? "Trap Created"
                : mode === "create"
                ? "Create Node"
                : "Edit Trap"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {createdResult
                ? "New trap successfully registered"
                : mode === "create"
                ? "Add a new ovitrap device"
                : `Editing ${device?.device_code}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation Modal View when Created */}
        {createdResult ? (
          <div className="px-6 py-8 space-y-6">
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                <span className="text-emerald-600">{createdResult.device_code}</span> is created!
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                The device is now registered and ready in the system.
              </p>
            </div>

            {/* Okay Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleClose}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                Okay
              </Button>
            </div>
          </div>
        ) : (
          /* Create / Edit Form View */
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
                Barangay <span className="text-rose-500">*</span>
              </Label>
              <select
                value={form.barangay_id}
                onChange={(e) => handleChange("barangay_id", e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="" disabled selected>Select barangay…</option>
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
        )}
      </div>
    </div>
  );
}
