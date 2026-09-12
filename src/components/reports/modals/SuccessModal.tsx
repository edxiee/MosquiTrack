import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  details?: React.ReactNode;
}

export function SuccessModal({
  open,
  onClose,
  title = "Request Submitted Successfully",
  description = "Your request has been recorded and is now pending review.",
  details,
}: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 p-0 overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-6 px-6 py-8">
          {/* Success Icon */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
            <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {description}
            </DialogDescription>
          </div>

          {/* Optional details card */}
          {details && (
            <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs space-y-2">
              {details}
            </div>
          )}

          {/* Action */}
          <Button
            className="w-full h-10 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}