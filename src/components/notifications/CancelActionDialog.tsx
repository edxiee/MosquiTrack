import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TriageAction } from "@/types/triage.types";

interface CancelActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: TriageAction | null;
  onConfirmCancel: (actionId: string, remarks: string) => Promise<void>;
}

export default function CancelActionDialog({
  open,
  onOpenChange,
  action,
  onConfirmCancel,
}: CancelActionDialogProps) {
  const [remarks, setRemarks] = useState(action?.remarks ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!action) return;
    setIsSubmitting(true);
    try {
      await onConfirmCancel(action.id, remarks.trim());
      toast.success("Action cancelled.");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to cancel action:", error);
      toast.error("Failed to cancel action. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open && !!action}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[65dvh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:max-h-[90dvh] sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-7 text-base leading-5 text-rose-700 sm:text-lg">
            <Ban className="mt-0.5 size-5 shrink-0" />
            <span>Cancel Action</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Confirm cancellation of this field response action. This will move it to the cancelled section.
          </DialogDescription>
        </DialogHeader>

        {action && (
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold leading-5 text-slate-800">
                  {action.triggerSource}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {[action.municipalityName, action.barangayName]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Cancellation Remarks
              </label>
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Add a reason for cancellation..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="min-h-10 w-full sm:w-auto"
          >
            Keep Action
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-h-10 w-full sm:w-auto"
          >
            {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}