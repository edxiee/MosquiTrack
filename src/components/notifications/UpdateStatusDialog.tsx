import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TriageAction, TriageStatus } from "@/types/triage.types";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Action</DialogTitle>
        </DialogHeader>

        {action && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {action.barangayName}
              {action.deviceCode ? ` — ${action.deviceCode}` : ""}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TriageStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
