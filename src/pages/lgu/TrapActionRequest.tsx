// src/pages/lgu/PrescriptiveAnalyticsPage.tsx
import { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Send,
  X,
  MapPin,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { ROUTES } from "@/utils/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDeployedBy } from "@/utils/deviceHelpers";
import { fetchDevicesForCurrentMunicipality } from "@/services/device.service";
import type { OvitrapDevice } from "@/types/device.types";
import { submitTriageRequest } from "@/services/barangaySurveillance.service";
import { getErrorMessage } from "@/utils/errorHelpers";
import { SuccessModal } from "@/components/reports/modals/SuccessModal";
import { ErrorModal } from "@/components/reports/modals/ErrorModal";
import TrapReportDropdown, { getTrapDangerLevel } from "@/components/lgu/TrapReportDropdown";
import { getDangerTier } from "@/utils/dangerTiers";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMySubmittedTriageLogs, type TriageLogRow } from "@/services/trapRequest.service";

// --- HELPER FUNCTION FOR TIME AGO ---
function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const created = new Date(dateStr).getTime();
  if (Number.isNaN(created)) return "—";
  const seconds = Math.floor((Date.now() - created) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

const REQUEST_TYPES = ["Send Monitoring Personnel", "Clean-up Drive", "Solution Misting"] as const;
type RequestType = (typeof REQUEST_TYPES)[number];
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
type PriorityType = (typeof PRIORITIES)[number];

// --- REQUEST ACTION MODAL COMPONENT ---
interface RequestActionModalProps {
  open: boolean;
  device: OvitrapDevice | null;
  onClose: () => void;
  onSubmit: (payload: {
    deviceId: string;
    barangayId: string | null;
    description: string;
    notes: string;
    requestType: RequestType;
    priority: PriorityType;
  }) => Promise<void>;
}

function RequestActionModal({ open, device, onClose, onSubmit }: RequestActionModalProps) {
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [requestType, setRequestType] = useState<RequestType | "">("");
  const [priority, setPriority] = useState<PriorityType | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && device) {
      setDescription(device.description || device.notes || "");
      setNotes("");
      setRequestType("");
      const tier = getDangerTier(
        device.today_mosquito_count,
        device.consecutive_critical_days,
      );
      setPriority(tier === "Moderate" ? "Medium" : tier);
      setError(null);
    }
  }, [open, device]);

  if (!open || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!requestType) { setError("Please select a Request Type."); return; }
    if (!priority) { setError("Please select a Priority."); return; }
    setSaving(true);
    try {
      await onSubmit({
        deviceId: device.id,
        barangayId: device.barangay_id,
        description: description.trim(),
        notes: notes.trim(),
        requestType,
        priority: priority as PriorityType,
      });
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to submit request");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Post Request Action</h2>
            <p className="text-xs text-slate-500 mt-0.5">Submit a prescribed action for this active node</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">{error}</div>}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Device ID <span className="text-rose-500">*</span></Label>
            <Input value={device.device_code} readOnly className="h-9 text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Request Type <span className="text-rose-500">*</span></Label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType | "")} className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
              <option value="" disabled>Select request type…</option>
              {REQUEST_TYPES.map((type) => (<option key={type} value={type}>{type}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Priority <span className="text-rose-500">*</span></Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityType | "")} className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
              <option value="" disabled>Select priority…</option>
              {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the situation or observation" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes (optional)" className="h-9 text-sm" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-9 px-4 text-sm">Cancel</Button>
            <Button type="submit" disabled={saving || !requestType} className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium gap-1.5">
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>) : (<><Send className="w-4 h-4" />Submit Request</>)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function PrescriptiveAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- EXISTING STATE (First Container) ---
  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<OvitrapDevice | null>(null);
  const [expandedTrapIds, setExpandedTrapIds] = useState<Set<string>>(new Set());
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRequestType, setLastRequestType] = useState<string>("");

  // --- NEW STATE (Second Container: My Submitted Requests) ---
  const [myRequests, setMyRequests] = useState<TriageLogRow[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(true);
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null);
  const [myRequestsSearch, setMyRequestsSearch] = useState("");
  const [myRequestsStatusFilter, setMyRequestsStatusFilter] = useState("all");
  const [myRequestDetailOpen, setMyRequestDetailOpen] = useState(false);
  const [selectedMyRequest, setSelectedMyRequest] = useState<TriageLogRow | null>(null);

  // --- EXISTING LOGIC (First Container) ---
  const toggleExpand = (deviceId: string) => {
    setExpandedTrapIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchDevicesForCurrentMunicipality();
      const sorted = [...all].sort((a, b) => {
        const aDeployed = a.latitude != null && a.longitude != null ? 0 : 1;
        const bDeployed = b.latitude != null && b.longitude != null ? 0 : 1;
        if (aDeployed !== bDeployed) return aDeployed - bDeployed;
        return (a.device_code || "").localeCompare(b.device_code || "");
      });
      setDevices(sorted);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to load devices");
      setError(msg);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel("prescriptive_analytics_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ovitrap_readings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "ovitrap_devices" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => {
      const trapId = d.device_code?.toLowerCase() ?? "";
      const description = (d.description || d.notes || "").toLowerCase();
      const deployedBy = formatDeployedBy(d.users).toLowerCase();
      const status = (d.device_statuses?.status_name ?? "").toLowerCase();
      return trapId.includes(q) || description.includes(q) || deployedBy.includes(q) || status.includes(q);
    });
  }, [devices, search]);

  const handleViewLocation = (device: OvitrapDevice) => {
    if (!device.latitude || !device.longitude) return;
    navigate(`${ROUTES.lgu.trapMap}?viewId=${device.id}`);
  };

  const openRequestModal = (device: OvitrapDevice) => {
    setSelectedDevice(device);
    setModalOpen(true);
  };

  const handleSubmitRequest = async (payload: {
    deviceId: string;
    barangayId: string | null;
    description: string;
    notes: string;
    requestType: RequestType;
    priority: PriorityType;
  }) => {
    try {
      if (!payload.barangayId) {
        throw new Error("Cannot submit triage log: device has no barangay assigned.");
      }

      const targetDevice = selectedDevice || devices.find((d) => d.id === payload.deviceId);
      const devLabel = targetDevice?.device_code ? `Trap: ${targetDevice.device_code}` : null;
      const combinedRemarks = [devLabel, payload.description, payload.notes].filter(Boolean).join(" | ") || "No additional remarks.";
      
      await submitTriageRequest({
        barangayId: payload.barangayId,
        deviceId: payload.deviceId,
        triggerSource: payload.requestType,
        priority: payload.priority,
        remarks: combinedRemarks,
      });

      setLastRequestType(payload.requestType);
      setSuccessOpen(true);
      
      loadData();
      setTimeout(() => loadMyRequests(), 500); 
    } catch (err) {
      console.error(err);
      const msg = getErrorMessage(err, "Failed to submit request");
      setErrorMessage(msg);
      setErrorOpen(true);
      throw err;
    }
  };

  // --- NEW LOGIC (Second Container) ---
  const loadMyRequests = async () => {
    if (!user?.id) {
      setMyRequestsLoading(false);
      return;
    }
    setMyRequestsLoading(true);
    setMyRequestsError(null);
    try {
      const data = await fetchMySubmittedTriageLogs(user.id);
      setMyRequests(data);
    } catch (err) {
      setMyRequestsError(getErrorMessage(err, "Failed to load your requests"));
      setMyRequests([]);
    } finally {
      setMyRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadMyRequests();
      const channel = supabase
        .channel("my_submitted_triage_realtime")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "action_triage_log",
          filter: `created_by=eq.${user.id}`
        }, () => loadMyRequests())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user?.id]);

  const filteredMyRequests = useMemo(() => {
    let filtered = myRequests;
    if (myRequestsStatusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === myRequestsStatusFilter);
    }
    const q = myRequestsSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) => {
        const remarks = (r.remarks || "").toLowerCase();
        const request = (r.trigger_source || "").toLowerCase();
        const barangay = (r.barangay_name || "").toLowerCase();
        return remarks.includes(q) || request.includes(q) || barangay.includes(q);
      });
    }
    return filtered;
  }, [myRequests, myRequestsStatusFilter, myRequestsSearch]);

  const openMyRequestDetail = (row: TriageLogRow) => {
    setSelectedMyRequest(row);
    setMyRequestDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ==================================================================== */}
      {/* FIRST CONTAINER: EXISTING TRAPS REPORTS & REQUESTS                   */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Traps Reports & Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Active Traps ready for Reports and Request actions. Click any trap to expand detailed reports.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trap, description, status…" className="pl-9 h-10 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-10 px-3 shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2"><Loader2 className="w-5 h-5 animate-spin" />Loading devices…</div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">Trap ID</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">Description</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">Deployed by</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">Danger Level</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">Location</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => {
                  const hasLocation = device.latitude != null;
                  const isExpanded = expandedTrapIds.has(device.id);
                  const countForDanger = device.today_mosquito_count ?? 0;
                  const danger = getTrapDangerLevel(
                    countForDanger,
                    device.consecutive_critical_days,
                  );
                  return (
                    <Fragment key={device.id}>
                      <tr onClick={() => toggleExpand(device.id)} className={cn("cursor-pointer transition-colors border-b border-slate-100", isExpanded ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-slate-50/70")}>
                        <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span className={cn("flex items-center justify-center size-6 rounded-md border text-slate-500 transition-all", isExpanded ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "bg-white border-slate-200 hover:border-slate-300")}>
                              <ChevronDown className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
                            </span>
                            <span className="font-semibold">{device.device_code}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 max-w-xs">{device.description || device.notes || "—"}</td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{formatDeployedBy(device.users)}</td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", danger.badge)}>
                            <span className={cn("size-1.5 rounded-full", danger.barColor)} />{danger.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Button variant="outline" size="sm" disabled={!hasLocation} onClick={(e) => { e.stopPropagation(); handleViewLocation(device); }} className={`h-8 px-3 text-xs font-medium rounded-lg gap-1.5 transition-all ${hasLocation ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300" : "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"}`}>
                            {hasLocation ? <MapPin className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {hasLocation ? "View on Map" : "No Location"}
                          </Button>
                        </td>
                        <td className="px-5 py-4">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); openRequestModal(device); }} className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer">
                            <Send className="w-3.5 h-3.5" />Post Request Action
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/30 border-b border-slate-200">
                          <td colSpan={6} className="p-4 sm:px-6 sm:py-5">
                            <TrapReportDropdown device={device} onPostRequest={(d) => openRequestModal(d)} onViewLocation={(d) => handleViewLocation(d)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredDevices.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">{search.trim() ? "No active devices match your search." : "No active devices found."}</div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SECOND CONTAINER: MY SUBMITTED REQUESTS (UPDATED FOR action_triage_log) */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              My Submitted Requests
            </h2>
            <p className="text-sm text-slate-500 mt-1">Track your submitted trap requests, monitor their progress, and review actions taken.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadMyRequests} disabled={myRequestsLoading} className="h-9 px-3 shrink-0">
            <RefreshCw className={`w-4 h-4 ${myRequestsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={myRequestsSearch} onChange={(e) => setMyRequestsSearch(e.target.value)} placeholder="Search remarks, request type, barangay..." className="pl-9 h-9 text-sm" />
          </div>
          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={myRequestsStatusFilter} onChange={(e) => setMyRequestsStatusFilter(e.target.value)} className="w-full h-9 pl-9 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {myRequestsLoading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : myRequestsError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600 mb-3">{myRequestsError}</p>
            <Button variant="outline" size="sm" onClick={loadMyRequests}>Retry</Button>
          </div>
        ) : filteredMyRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {myRequestsSearch || myRequestsStatusFilter !== "all" ? "No requests match your filters." : "You haven't submitted any requests yet."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {!myRequestsSearch && myRequestsStatusFilter === "all" && "Use the 'Post Request Action' button above to submit a new request."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Request ID</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3">Request Type & Remarks</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Location</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Date Submitted</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Last Updated</th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMyRequests.map((row) => {
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button onClick={() => openMyRequestDetail(row)} className="font-mono text-xs font-semibold text-emerald-700 hover:underline" title="View details">
                          REQ-{row.id.slice(0, 4).toUpperCase()}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-medium text-slate-900 text-xs">{row.trigger_source || "—"}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{row.remarks || "No remarks"}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-xs">{row.barangay_name || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {row.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3" /> Completed
                          </span>
                        ) : row.status === "In Progress" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Loader2 className="size-3" /> In Progress
                          </span>
                        ) : row.status === "Cancelled" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle className="size-3" /> Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="size-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">{formatTimeAgo(row.updated_at || row.created_at)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openMyRequestDetail(row)} className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1">
                          <Eye className="size-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODALS                                                               */}
      {/* ==================================================================== */}
      <RequestActionModal open={modalOpen} device={selectedDevice} onClose={() => { setModalOpen(false); setSelectedDevice(null); }} onSubmit={handleSubmitRequest} />
      
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} title="Request Submitted Successfully" description={lastRequestType ? `Your "${lastRequestType}" request has been recorded and is now pending review.` : "Your request has been recorded and is now pending review."} details={selectedDevice ? (<div className="space-y-2"><div className="flex justify-between"><span className="text-slate-500">Trap ID</span><span className="font-medium text-slate-800">{selectedDevice.device_code}</span></div><div className="flex justify-between"><span className="text-slate-500">Request Type</span><span className="font-medium text-slate-800">{lastRequestType}</span></div></div>) : null} />
      
      <ErrorModal open={errorOpen} onClose={() => { setErrorOpen(false); setErrorMessage(null); }} errorMessage={errorMessage} />

      {/* Simple Details Modal for Triage Log */}
      {myRequestDetailOpen && selectedMyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMyRequestDetailOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Request Details</h3>
              <button onClick={() => setMyRequestDetailOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Request ID</span>
                <span className="font-mono font-semibold text-slate-900">{selectedMyRequest.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900">{selectedMyRequest.trigger_source}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Priority</span>
                <span className="font-medium text-slate-900">{selectedMyRequest.priority}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-900">{selectedMyRequest.barangay_name || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-slate-900">{selectedMyRequest.status}</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-1">Remarks:</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs whitespace-pre-wrap">
                  {selectedMyRequest.remarks || "No remarks provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}