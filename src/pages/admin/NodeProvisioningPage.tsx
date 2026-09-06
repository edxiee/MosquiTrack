import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Loader2,
  RefreshCw,
  Pencil,
  Radio,
  Copy,
  Check,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/navigation";
import DeviceModal from "@/components/reports/DeviceModal";
import {
  fetchDevices,
  fetchStatuses,
  fetchBarangays,
} from "@/services/device.service";
import { formatDeployedBy, isDeviceActive } from "@/utils/deviceHelpers";
import type { OvitrapDevice, DeviceStatus, Barangay } from "@/types/device.types";

import { getErrorMessage } from "@/utils/errorHelpers";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

export default function NodeProvisioningPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [statuses, setStatuses] = useState<DeviceStatus[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDevice, setEditingDevice] = useState<OvitrapDevice | null>(
    null
  );

  // Clipboard copy state & Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const copyUuid = async (uuid: string, trapCode: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedId(uuid);
      showToast(`Device UUID for ${trapCode} copied to clipboard!`, "success");
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error("Failed to copy UUID:", err);
    }
  };

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [devs, st, bg] = await Promise.all([
        fetchDevices(),
        fetchStatuses(),
        fetchBarangays(),
      ]);
      setDevices(devs);
      setStatuses(st);
      setBarangays(bg);
      setError(null);
    } catch (err: unknown) {
      console.error("NodeProvisioning load error:", err);
      const msg = getErrorMessage(err, "Failed to load devices");
      setError(msg);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const channel = supabase
      .channel("ovitrap_devices_provisioning_realtime")
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

  const openCreate = () => {
    setEditingDevice(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (device: OvitrapDevice) => {
    setEditingDevice(device);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleViewLocation = (device: OvitrapDevice) => {
    if (!device.latitude || !device.longitude) return;
    navigate(`${ROUTES.admin.georeferencing}?viewId=${device.id}`);
  };

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trap Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage ovitrap devices and view their hardware GPS locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className="h-10 px-3"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            onClick={openCreate}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Node
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
                  const active = isDeviceActive(device);
                  const rawStatus = device.device_statuses;
                  const statusName = Array.isArray(rawStatus)
                    ? (rawStatus as any)[0]?.status_name ?? "Unknown"
                    : rawStatus?.status_name ?? "Unknown";

                  const hasGps =
                    device.latitude != null &&
                    device.longitude != null &&
                    !isNaN(Number(device.latitude)) &&
                    !isNaN(Number(device.longitude)) &&
                    Number(device.latitude) !== 0 &&
                    Number(device.longitude) !== 0;

                  const isCopied = copiedId === device.id;

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
                            active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : statusName === "Maintenance"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {statusName}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {hasGps ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLocation(device)}
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            View
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <Radio className="w-3 h-3 text-slate-400 animate-pulse" />
                            No GPS Fix
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(device)}
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyUuid(device.id, device.device_code)}
                            className={`h-8 px-2.5 text-xs font-medium rounded-lg gap-1.5 transition-all ${
                              isCopied
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Copy UUID for ESP32 firmware"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                Copy UUID
                              </>
                            )}
                          </Button>
                        </div>
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
              ? "No active devices match your search. Click “Create Node” to add one."
              : "No devices found. Click “Create Node” to add one."}
          </div>
        )}
      </div>

      <DeviceModal
        open={modalOpen}
        mode={modalMode}
        device={editingDevice}
        statuses={statuses}
        barangays={barangays}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Floating Success Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border bg-emerald-50 border-emerald-200 text-emerald-900 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
