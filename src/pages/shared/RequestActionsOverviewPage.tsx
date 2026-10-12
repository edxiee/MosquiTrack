import { useState, useEffect, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/utils/errorHelpers";
import { supabase } from "@/lib/supabase";
import {
  fetchRequestActions,
  updateRequestActionStatus,
  type RequestActionRow,
} from "@/services/requestActions.service";
import { RequestDetailModal } from "@/components/request-actions/RequestDetailModal";
import RoleBadge from "@/components/accounts/RoleBadge";
import { cn } from "@/lib/utils";

function formatPersonName(first?: string | null, last?: string | null) {
  if (!first && !last) return "—";
  const initial = first ? `${first.charAt(0).toUpperCase()}.` : "";
  const lastName = last ?? "";
  return `${initial} ${lastName}`.trim() || "—";
}

function formatLocation(municipality?: string | null, barangay?: string | null) {
  if (!municipality && !barangay) return "—";
  if (municipality && barangay) return `${municipality}, ${barangay}`;
  return municipality || barangay || "—";
}

/** e.g. "just now", "20 mins ago", "1 hour ago", "6 hours ago", "1 day ago", "2 days ago" */
function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";

  const created = new Date(dateStr).getTime();
  if (Number.isNaN(created)) return "—";

  const seconds = Math.floor((Date.now() - created) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 min ago" : `${minutes} mins ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export type RequestActionTab = "pending" | "history";

export default function RequestActionsOverviewPage() {
  const [rows, setRows] = useState<RequestActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<RequestActionTab>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RequestActionRow | null>(null);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await fetchRequestActions();
      setRows(data);
    } catch (err) {
      console.error("RequestActionsOverview load error:", err);
      setError(getErrorMessage(err, "Failed to load request actions"));
      setRows([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const channel = supabase
      .channel("shared_request_actions_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
        () => {
          loadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (
    row: RequestActionRow,
    newStatus: "Approved" | "Declined"
  ) => {
    setProcessingId(row.req_id);
    try {
      await updateRequestActionStatus(
        row.req_id,
        newStatus,
        row.device_id,
        row.request
      );

      const now = new Date().toISOString();

      // Immediately remove from pending list by updating status
      setRows((prev) =>
        prev.map((r) =>
          r.req_id === row.req_id
            ? {
                ...r,
                status: newStatus,
                approved_at: newStatus === "Approved" ? now : r.approved_at,
                completed_at: newStatus === "Declined" ? now : r.completed_at,
              }
            : r
        )
      );

      setFeedbackMessage({
        text: `Request for ${row.device_code || "trap"} has been ${
          newStatus === "Approved"
            ? "accepted and deployed"
            : "declined and returned to storage"
        }. Removed from pending list.`,
        type: "success",
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error(`Failed to update request action:`, err);
      setFeedbackMessage({
        text: getErrorMessage(err, `Failed to ${newStatus.toLowerCase()} request`),
        type: "error",
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const { pendingRows, historyRows } = useMemo(() => {
    const pending: RequestActionRow[] = [];
    const history: RequestActionRow[] = [];

    for (const r of rows) {
      const isPending =
        r.status === "Pending" ||
        (!r.status && !r.approved_at && !r.completed_at);

      if (isPending) {
        pending.push(r);
      } else {
        history.push(r);
      }
    }

    return { pendingRows: pending, historyRows: history };
  }, [rows]);

  const currentTabRows = activeTab === "pending" ? pendingRows : historyRows;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentTabRows;

    return currentTabRows.filter((r) => {
      const device = (r.device_code || "").toLowerCase();
      const desc = (r.descriptions || "").toLowerCase();
      const request = (r.request || "").toLowerCase();
      const requester = formatPersonName(
        r.requester_first_name,
        r.requester_last_name
      ).toLowerCase();
      const role = (r.requester_role || "").toLowerCase();
      const location = formatLocation(
        r.device_municipality,
        r.device_barangay
      ).toLowerCase();

      return (
        device.includes(q) ||
        desc.includes(q) ||
        request.includes(q) ||
        requester.includes(q) ||
        role.includes(q) ||
        location.includes(q)
      );
    });
  }, [currentTabRows, search]);

  const openDetail = (row: RequestActionRow) => {
    setSelectedRow(row);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Request Actions Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review submitted trap requests and take operational action.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search device, requester, type, location…"
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

      {feedbackMessage && (
        <div
          className={cn(
            "p-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all",
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="size-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all",
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Actions</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-bold rounded-full",
              activeTab === "pending"
                ? "bg-amber-600 text-white"
                : "bg-slate-200/80 text-slate-700"
            )}
          >
            {pendingRows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all",
            activeTab === "history"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Action History</span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-bold rounded-full",
              activeTab === "history"
                ? "bg-slate-700 text-white"
                : "bg-slate-200/80 text-slate-700"
            )}
          >
            {historyRows.length}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading request actions…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Device
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Description & Type
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Requested by
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Location
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Approved by
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Posted
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const isPending =
                    row.status === "Pending" ||
                    (!row.status && !row.approved_at && !row.completed_at);
                  const isApproved =
                    row.status === "Approved" || Boolean(row.approved_at);
                  const isDeclined =
                    row.status === "Declined" ||
                    (!row.approved_at && Boolean(row.completed_at));
                  const isProcessing = processingId === row.req_id;

                  return (
                    <tr
                      key={row.req_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetail(row)}
                          className="font-semibold text-emerald-700 hover:underline text-left"
                          title="Click to view full request details"
                        >
                          {row.device_code || "—"}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-xs">
                        <div className="line-clamp-2">
                          {row.descriptions || "—"}
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          {row.request}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 max-w-xs">
                        <div className="line-clamp-2">
                          {formatPersonName(
                            row.requester_first_name,
                            row.requester_last_name
                          )}
                        </div>
                        <div className="mt-0.5">
                          <RoleBadge role={row.requester_role} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {formatLocation(
                          row.device_municipality,
                          row.device_barangay
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3" />
                            Approved
                          </span>
                        ) : isDeclined ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="size-3" />
                            Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="size-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                        {formatPersonName(
                          row.approver_first_name,
                          row.approver_last_name
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">
                        {formatTimeAgo(row.created_at)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(row, "Approved")}
                              disabled={isProcessing}
                              className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                              title="Accept this request"
                            >
                              {isProcessing ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(row, "Declined")}
                              disabled={isProcessing}
                              className="h-8 px-2.5 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1"
                              title="Decline this request"
                            >
                              {isProcessing ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <X className="size-3.5" />
                              )}
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(row)}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1"
                          >
                            <Eye className="size-3.5" />
                            Details
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

        {!loading && !error && filteredRows.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">
            {search.trim() ? (
              "No request actions match your search."
            ) : activeTab === "pending" ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-700">No pending requests.</p>
                <p className="text-xs text-slate-400">All submitted trap requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-slate-700">No action history.</p>
                <p className="text-xs text-slate-400">Past accepted or declined requests will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <RequestDetailModal
        open={detailOpen}
        row={selectedRow}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRow(null);
        }}
      />
    </div>
  );
}