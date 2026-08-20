import { useState, useEffect, useMemo } from "react";
import {
  Package,
  MapPin,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { ROUTES } from "@/utils/navigation";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchDevicesForCurrentUser } from "@/services/device.service";
import { formatDeployedBy, isDeviceActive } from "@/utils/deviceHelpers";
import type { OvitrapDevice } from "@/types/device.types";

import { getErrorMessage } from "@/utils/errorHelpers";

export default function HardwareNodesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
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
      navigate(`${ROUTES.bhw.surveillance}?viewId=${device.id}`);
    };

  const handleRequestPickup = async (device: OvitrapDevice) => {
    console.log("Request Pick-up for", device.device_code, device.id);
    alert(`Pick-up request submitted for ${device.device_code}`);
  };

  const handleRequestDeployment = async (device: OvitrapDevice) => {
    console.log("Request Deployment for", device.device_code, device.id);
    alert(`Deployment request submitted for ${device.device_code}`);
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
                        {active ? (
                          <Button
                            size="sm"
                            onClick={() => handleRequestPickup(device)}
                            className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Request Pick-up
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRequestDeployment(device)}
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
    </div>
  );
}
