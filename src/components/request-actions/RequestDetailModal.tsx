import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RequestActionRow } from "@/services/requestActions.service";

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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-slate-800 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

interface RequestDetailModalProps {
  open: boolean;
  row: RequestActionRow | null;
  onClose: () => void;
}

export function RequestDetailModal({
  open,
  row,
  onClose,
}: RequestDetailModalProps) {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Full information for this action
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {row.request}
            </span>
            {row.device_code && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {row.device_code}
              </span>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <DetailRow label="Description" value={row.descriptions || "—"} />
            <DetailRow label="Notes" value={row.notes || "—"} />
            <DetailRow label="Remarks" value={row.remarks || "—"} />

            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <DetailRow
                label="Requested by"
                value={formatPersonName(
                  row.requester_first_name,
                  row.requester_last_name
                )}
              />
              <DetailRow label="Role" value={row.requester_role || "—"} />
              <DetailRow
                label="Approved by"
                value={formatPersonName(
                  row.approver_first_name,
                  row.approver_last_name
                )}
              />
              <DetailRow
                label="Location"
                value={formatLocation(
                  row.device_municipality,
                  row.device_barangay
                )}
              />
            </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <DetailRow label="Created at" value={formatDate(row.created_at)} />
              <DetailRow
                label="Approved at"
                value={formatDate(row.approved_at)}
              />
              <DetailRow label="Due date" value={formatDate(row.due_date)} />
              <DetailRow
                label="Completed at"
                value={formatDate(row.completed_at)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full h-10" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}