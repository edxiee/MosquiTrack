import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TriageAction, TriageStatus } from "@/types/triage.types";
import { DOT_STYLES, STATUS_STYLES } from "@/utils/triageHelpers";

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: TriageAction | null;
  onSubmit: (
    actionId: string,
    status: TriageStatus,
    remarks: string,
  ) => Promise<void>;
}

const STATUSES: TriageStatus[] = [
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled",
];

export default function UpdateStatusDialog({
  open,
  onOpenChange,
  action,
  onSubmit,
}: UpdateStatusDialogProps) {
  const [status, setStatus] = useState<TriageStatus>("Pending");
  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (action) {
      setStatus(action.status);
      setRemarks(action.remarks ?? "");
    }
  }, [action]);

  async function handleSave() {
    if (!action) return;
    setIsSaving(true);
    try {
      await onSubmit(action.id, status, remarks);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update action:", err);
      window.alert("Failed to update action. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Action</DialogTitle>
        </DialogHeader>

        {action && (
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="font-semibold text-slate-800">{action.triggerSource}</p>
              <p className="mt-1 text-sm text-slate-500">
                {action.barangayName}
                {action.deviceCode ? ` · ${action.deviceCode}` : ""} ·{" "}
                <span className="font-medium">{action.priority}</span> priority
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => {
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 ring-inset transition-all hover:-translate-y-0.5 ${
                        active
                          ? `${STATUS_STYLES[s]} shadow-sm ring-2`
                          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${DOT_STYLES[s]}`} />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes from field inspection..."
                rows={4}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
