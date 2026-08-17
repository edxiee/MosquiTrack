import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Send,
  X,
  MapPin,
} from "lucide-react";
import { ROUTES } from "@/utils/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDevices } from "@/services/device.service";
import { formatDeployedBy, isDeviceActive } from "@/utils/deviceHelpers";
import type { OvitrapDevice } from "@/types/device.types";

import { getErrorMessage } from "@/utils/errorHelpers";

const REQUEST_TYPES = [
  "Send Monitoring Personnel",
  "Clean-up Drive",
  "Solution Misting",
] as const;

type RequestType = (typeof REQUEST_TYPES)[number];

interface RequestActionModalProps {
  open: boolean;
  device: OvitrapDevice | null;
  onClose: () => void;
  onSubmit: (payload: {
    deviceId: string;
    description: string;
    notes: string;
    requestType: RequestType;
  }) => Promise<void>;
}

function RequestActionModal({
  open,
  device,
  onClose,
  onSubmit,
}: RequestActionModalProps) {
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [requestType, setRequestType] = useState<RequestType | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && device) {
      setDescription(device.description || device.notes || "");
      setNotes("");
      setRequestType("");
      setError(null);
    }
  }, [open, device]);

  if (!open || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!requestType) {
      setError("Please select a Request Type.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        deviceId: device.id,
        description: description.trim(),
        notes: notes.trim(),
        requestType,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit request";
      setError(msg);
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

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Post Request Action
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit a prescribed action for this active node
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
              Device ID
            </Label>
            <Input
              value={device.device_code}
              readOnly
              className="h-9 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation or observation"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Notes
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">
              Request Type <span className="text-rose-500">*</span>
            </Label>
            <select
              value={requestType}
              onChange={(e) =>
                setRequestType(e.target.value as RequestType | "")
              }
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Select request type…
              </option>
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PrescriptiveAnalyticsPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<OvitrapDevice | null>(
    null
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchDevices();
      const activeOnly = all.filter((d) => isDeviceActive(d));
      setDevices(activeOnly);
    } catch (err: unknown) {
      console.error("PrescriptiveAnalyticsPage load error:", err);
      const msg = getErrorMessage(err, "Failed to load devices");
      setError(msg);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;

    return devices.filter((d) => {
      const trapId = d.device_code?.toLowerCase() ?? "";
      const description = (d.description || d.notes || "").toLowerCase();
      const deployedBy = formatDeployedBy(d.users).toLowerCase();
      const status = (d.device_statuses?.status_name ?? "").toLowerCase();

      return (
        trapId.includes(q) ||
        description.includes(q) ||
        deployedBy.includes(q) ||
        status.includes(q)
      );
    });
  }, [devices, search]);

  const handleViewLocation = (device: OvitrapDevice) => {
    if (!device.latitude || !device.longitude) return;
    navigate(`${ROUTES.lgu.heatmap}?viewId=${device.id}`);
  };

  const openRequestModal = (device: OvitrapDevice) => {
    setSelectedDevice(device);
    setModalOpen(true);
  };

  const handleSubmitRequest = async (payload: {
    deviceId: string;
    description: string;
    notes: string;
    requestType: RequestType;
  }) => {
    console.log("Submitting request action:", payload);
    alert(
      `Request submitted!\nType: ${payload.requestType}\nDevice: ${selectedDevice?.device_code}`
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Prescriptive Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Active ovitrap nodes ready for prescribed actions.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trap, description, status…"
              className="pl-9 h-10 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-10 px-3 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading active devices…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Trap ID
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Description
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Deployed by
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Danger Level
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Location
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => {
                  const hasLocation = device.latitude != null;

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {device.device_code}
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-xs">
                        {device.description || device.notes || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {formatDeployedBy(device.users)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          To be added
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasLocation}
                          onClick={() => handleViewLocation(device)}
                          className={`h-8 px-3 text-xs font-medium rounded-lg gap-1.5 transition-all ${
                            hasLocation
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300"
                              : "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"
                          }`}
                        >
                          {hasLocation ? (
                            <MapPin className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          {hasLocation ? "View on Map" : "No Location"}
                        </Button>
                      </td>

                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          onClick={() => openRequestModal(device)}
                          className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Post Request Action
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredDevices.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">
            {search.trim()
              ? "No active devices match your search."
              : "No active devices found."}
          </div>
        )}
      </div>

      <RequestActionModal
        open={modalOpen}
        device={selectedDevice}
        onClose={() => {
          setModalOpen(false);
          setSelectedDevice(null);
        }}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
