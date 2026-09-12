import { useState, useEffect, useMemo } from "react";
import {
  Package,
  MapPin,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
  Send,
} from "lucide-react";

import { ROUTES } from "@/utils/navigation";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDevicesForCurrentUser } from "@/services/device.service";
import { formatDeployedBy } from "@/utils/deviceHelpers";
import type { OvitrapDevice } from "@/types/device.types";
import { createTrapRequest } from "@/services/trapRequest.service";

import { SuccessModal } from "@/components/reports/modals/SuccessModal";
import { ErrorModal } from "@/components/reports/modals/ErrorModal";

import { getErrorMessage } from "@/utils/errorHelpers";
import { supabase } from "@/lib/supabase";

type RequestType = "Request Pick-up" | "Request Deployment";

const REQUEST_TYPES: RequestType[] = [
  "Request Pick-up",
  "Request Deployment",
];

export default function HardwareNodesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<OvitrapDevice | null>(null);
  const [requestType, setRequestType] = useState<RequestType | "">("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRequestType, setLastRequestType] = useState<RequestType | "">("");

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const devs = await fetchDevicesForCurrentUser();
      setDevices(devs);
    } catch (err: unknown) {
      console.error("HardwareNodesPage load error:", err);
      const msg = getErrorMessage(err, "Failed to load devices");
      setError(msg);
      setDevices([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const channel = supabase
      .channel("bhw_devices_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => {
          loadData(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ovitrap_readings" },
        () => {
          loadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    navigate(`${ROUTES.bhw.surveillance}?viewId=${device.id}`);
  };

  const openRequestModal = (device: OvitrapDevice, type: RequestType) => {
    setSelectedDevice(device);
    setRequestType(type);
    setDescription("");
    setNotes("");
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelectedDevice(null);
    setRequestType("");
    setDescription("");
    setNotes("");
    setModalError(null);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedDevice || !requestType) return;

  setSaving(true);
  setModalError(null);

  try {
    await createTrapRequest(
      selectedDevice.id,
      requestType,
      description.trim() || null,
      notes.trim() || null
    );

    setLastRequestType(requestType);
    closeModal();           // close the form modal
    setSuccessOpen(true);   // show success modal
    loadData(false);
  } catch (err) {
    console.error(err);
    const msg = getErrorMessage(err, "Failed to submit request");
    setErrorMessage(msg);
    closeModal();
    setErrorOpen(true);     // show error modal
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trap Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View mosquito trap devices and request deployment or pick-up.
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
            onClick={() => loadData(true)}
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
            Loading devices…
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
                    Status
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
                  const realStatus =
                    device.device_statuses?.status_name ?? "Unknown";
                  const displayStatus =
                    (device as any).connection_status ?? realStatus;
                  const isDeployed =
                    realStatus === "Active" || realStatus === "Online";

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
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            displayStatus === "Online"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : displayStatus === "Maintenance"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isDeployed || device.latitude == null}
                          onClick={() => handleViewLocation(device)}
                          className={`h-8 px-3 text-xs font-medium rounded-lg gap-1.5 ${
                            isDeployed && device.latitude != null
                              ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                              : "opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </td>

                      <td className="px-5 py-4">
                        {isDeployed ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              openRequestModal(device, "Request Pick-up")
                            }
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Request Pick-up
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              openRequestModal(device, "Request Deployment")
                            }
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Request Deployment
                          </Button>
                        )}
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
              ? "No devices match your search."
              : "No devices found for your barangay."}
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Request Submitted Successfully"
        description={
          lastRequestType
            ? `Your "${lastRequestType}" has been recorded and is now pending review.`
            : "Your request has been recorded and is now pending review."
        }
        details={
          selectedDevice ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Trap ID</span>
                <span className="font-medium text-slate-800">
                  {selectedDevice.device_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Request Type</span>
                <span className="font-medium text-slate-800">{lastRequestType}</span>
              </div>
            </div>
          ) : null
        }
      />

      {/* Error Modal */}
      <ErrorModal
        open={errorOpen}
        onClose={() => {
          setErrorOpen(false);
          setErrorMessage(null);
        }}
        errorMessage={errorMessage}
      />

      {/* Request Action Modal */}
      {modalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Submit Request Action
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a new entry in request_actions
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="px-6 py-5 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">
                  Device ID <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={selectedDevice.device_code}
                  readOnly
                  className="h-9 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
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
                  required
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-9 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !requestType}
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
      )}
    </div>
  );
}