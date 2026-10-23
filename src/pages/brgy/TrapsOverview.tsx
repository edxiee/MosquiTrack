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
  Clock,
  Boxes,
} from "lucide-react";

import { ROUTES } from "@/utils/navigation";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDevicesForCurrentUser } from "@/services/device.service";
import { formatDeployedBy } from "@/utils/deviceHelpers";
import type { OvitrapDevice } from "@/types/device.types";
import {
  createTrapRequest,
  fetchTrapRequests,
  type TrapRequest,
} from "@/services/trapRequest.service";

import { SuccessModal } from "@/components/reports/modals/SuccessModal";
import { ErrorModal } from "@/components/reports/modals/ErrorModal";

import { getErrorMessage } from "@/utils/errorHelpers";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type RequestType = "Request Pick-up" | "Request Deployment";

const REQUEST_TYPES: RequestType[] = [
  "Request Pick-up",
  "Request Deployment",
];

export type TrapOverviewTab = "deployed" | "pending" | "in_storage";

export default function HardwareNodesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TrapOverviewTab>("deployed");
  const [pendingRequests, setPendingRequests] = useState<
    Map<string, { request: string; created_at: string }>
  >(new Map());

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
      const [devs, reqs] = await Promise.all([
        fetchDevicesForCurrentUser(),
        fetchTrapRequests().catch(() => [] as TrapRequest[]),
      ]);
      setDevices(devs);

      // Build active pending requests map
      const pMap = new Map<string, { request: string; created_at: string }>();
      for (const r of reqs) {
        const isPending =
          r.status === "Pending" ||
          (!r.status && !r.approved_at && !r.completed_at);
        if (isPending && r.device_id && !pMap.has(r.device_id)) {
          pMap.set(r.device_id, {
            request: r.request,
            created_at: r.created_at,
          });
        }
      }
      setPendingRequests(pMap);
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
        { event: "*", schema: "public", table: "request_actions" },
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

  // Classify devices into Deployed, Pending, In Storage
  const { deployedDevices, pendingDevices, inStorageDevices } = useMemo(() => {
    const deployed: OvitrapDevice[] = [];
    const pending: OvitrapDevice[] = [];
    const inStorage: OvitrapDevice[] = [];

    for (const d of devices) {
      const hasPendingReq = pendingRequests.has(d.id);

      // If there is an active pending request in request_actions
      if (hasPendingReq) {
        pending.push(d);
        continue;
      }

      // Check operational status if set
      const op = (d.operational_status || "").toLowerCase();
      if (op === "pending") {
        pending.push(d);
        continue;
      }
      if (op === "deployed") {
        deployed.push(d);
        continue;
      }
      if (op === "in storage" || op === "in_storage") {
        inStorage.push(d);
        continue;
      }

      // Check device_statuses and geolocation
      const statusName = (d.device_statuses?.status_name ?? "").toLowerCase();
      if (statusName === "pending") {
        pending.push(d);
        continue;
      }
      if (statusName === "in storage" || statusName === "in_storage") {
        inStorage.push(d);
        continue;
      }

      // If status is Active or Online, or has coordinates and is online
      const isDeployed =
        statusName === "active" ||
        statusName === "online" ||
        (d.latitude != null && d.longitude != null && statusName !== "offline");

      if (isDeployed) {
        deployed.push(d);
      } else {
        inStorage.push(d);
      }
    }

    return {
      deployedDevices: deployed,
      pendingDevices: pending,
      inStorageDevices: inStorage,
    };
  }, [devices, pendingRequests]);

  const activeTabDevices = useMemo(() => {
    if (activeTab === "deployed") return deployedDevices;
    if (activeTab === "pending") return pendingDevices;
    return inStorageDevices;
  }, [activeTab, deployedDevices, pendingDevices, inStorageDevices]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeTabDevices;

    return activeTabDevices.filter((d) => {
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
  }, [activeTabDevices, search]);

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
      closeModal(); // close the form modal
      setSuccessOpen(true); // show success modal
      loadData(false);
    } catch (err) {
      console.error(err);
      const msg = getErrorMessage(err, "Failed to submit request");
      setErrorMessage(msg);
      closeModal();
      setErrorOpen(true); // show error modal
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trap Deployment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor deployed hardware nodes, manage storage inventory, and track pending requests.
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

      {/* Main Content Box with Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top 3 Tabs: Deployed, Pending, In Storage */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("deployed")}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === "deployed"
                ? "border-emerald-600 text-emerald-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            )}
          >
            <MapPin className="size-4 text-emerald-600" />
            <span>Deployed</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold transition-colors",
                activeTab === "deployed"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200/80 text-slate-700"
              )}
            >
              {deployedDevices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === "pending"
                ? "border-amber-500 text-amber-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            )}
          >
            <Clock className="size-4 text-amber-600" />
            <span>Pending</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold transition-colors",
                activeTab === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-200/80 text-slate-700"
              )}
            >
              {pendingDevices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_storage")}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer",
              activeTab === "in_storage"
                ? "border-sky-600 text-sky-700 bg-white shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
            )}
          >
            <Boxes className="size-4 text-sky-600" />
            <span>In storage</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold transition-colors",
                activeTab === "in_storage"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200/80 text-slate-700"
              )}
            >
              {inStorageDevices.length}
            </span>
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading {activeTab.replace("_", " ")} traps…
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
                    Location
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => {
                  const pendingReq = pendingRequests.get(device.id);
                  const hasLocation =
                    device.latitude != null && device.longitude != null;

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                        <span className="font-semibold">{device.device_code}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-xs">
                        {device.description || device.notes || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {formatDeployedBy(device.users)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {hasLocation ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLocation(device)}
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            View on Map
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {activeTab === "in_storage" ? "In Warehouse / Storage" : "No Coordinates"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {pendingReq ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50/80 border border-amber-200">
                            <Clock className="size-3.5 animate-pulse text-amber-600" />
                            Awaiting LGU Action
                          </span>
                        ) : activeTab === "deployed" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              openRequestModal(device, "Request Pick-up")
                            }
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Request Pick-up
                          </Button>
                        ) : activeTab === "in_storage" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              openRequestModal(device, "Request Deployment")
                            }
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Request Deployment
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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
            {search.trim() ? (
              "No traps in this tab match your search."
            ) : activeTab === "deployed" ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-700">No deployed traps currently in the field.</p>
                <p className="text-xs text-slate-400">Request deployment for traps in storage to see them here.</p>
              </div>
            ) : activeTab === "pending" ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-700">No pending trap requests.</p>
                <p className="text-xs text-slate-400">All deployment and pick-up requests have been fulfilled.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-slate-700">No traps currently in storage.</p>
                <p className="text-xs text-slate-400">All traps are either deployed or pending approval.</p>
              </div>
            )}
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