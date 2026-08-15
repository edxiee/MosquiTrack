import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MapPin,
  Package,
  Eye,
  Loader2,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/navigation";
import DeviceModal from "@/components/reports/DeviceModal";
import {
  fetchDevices,
  fetchStatuses,
  fetchBarangays,
  pickUpDevice,
} from "@/services/device.service";
import { formatDeployedBy, isDeviceActive } from "@/utils/deviceHelpers";
import type { OvitrapDevice, DeviceStatus, Barangay } from "@/types/device.types";

export default function NodeProvisioningPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [statuses, setStatuses] = useState<DeviceStatus[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDevice, setEditingDevice] = useState<OvitrapDevice | null>(
    null
  );

  const loadData = async () => {
    setLoading(true);
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
      const msg =
        err instanceof Error ? err.message : "Failed to load devices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleAction = async (device: OvitrapDevice) => {
    const active = isDeviceActive(device);

    try {
      if (active) {
        const offline = statuses.find((s) => s.status_name === "Offline");
        if (!offline) {
          console.error("Offline status not found");
          return;
        }
        await pickUpDevice(device.id, offline.id);
        await loadData();
      } else {
        navigate(`${ROUTES.admin.georeferencing}?trapId=${device.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Node Provisioning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage ovitrap devices and their georeferenced locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
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
                {devices.map((device) => {
                  const active = isDeviceActive(device);
                  const statusName =
                    device.device_statuses?.status_name ?? "Unknown";

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
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!active || device.latitude == null}
                          onClick={() => handleViewLocation(device)}
                          className={`h-8 px-3 text-xs font-medium rounded-lg gap-1.5 ${
                            active && device.latitude != null
                              ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                              : "opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
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
                            size="sm"
                            onClick={() => handleAction(device)}
                            className={`h-8 px-3 text-xs font-medium rounded-lg gap-1.5 ${
                              active
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {active ? (
                              <>
                                <Package className="w-3.5 h-3.5" />
                                Pick up
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5" />
                                Set Location
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

        {!loading && !error && devices.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">
            No devices found. Click “Create Node” to add one.
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
    </div>
  );
}
