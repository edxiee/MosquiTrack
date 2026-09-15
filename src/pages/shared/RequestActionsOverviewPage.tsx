import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/utils/errorHelpers";
import {
  fetchRequestActions,
  type RequestActionRow,
} from "@/services/requestActions.service";
import { RequestDetailModal } from "@/components/request-actions/RequestDetailModal";
import RoleBadge from "@/components/accounts/RoleBadge";

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

export default function RequestActionsOverviewPage() {
  const [rows, setRows] = useState<RequestActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RequestActionRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequestActions();
      setRows(data);
    } catch (err) {
      console.error("RequestActionsOverview load error:", err);
      setError(getErrorMessage(err, "Failed to load request actions"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
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
  }, [rows, search]);

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
            All submitted trap request actions and their status.
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
            onClick={loadData}
            disabled={loading}
            className="h-10 px-3 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
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
                    Description
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Requested by
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Location
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Approved by
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5 whitespace-nowrap">
                    Posted
                  </th>
                  <th className="text-left font-semibold text-slate-600 px-5 py-3.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.req_id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                      {row.device_code || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600 max-w-xs">
                      <div className="line-clamp-2">
                        {row.descriptions || "—"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
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
                    <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                      {formatPersonName(
                        row.approver_first_name,
                        row.approver_last_name
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">
                      {formatTimeAgo(row.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(row)}
                        className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                        More
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredRows.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">
            {search.trim()
              ? "No request actions match your search."
              : "No request actions found."}
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