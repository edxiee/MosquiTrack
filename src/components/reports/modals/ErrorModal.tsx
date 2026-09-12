import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { XCircle } from "lucide-react";

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  errorMessage?: string | null;
}

export function ErrorModal({
  open,
  onClose,
  title = "Request Failed",
  description = "Something went wrong while submitting your request.",
  errorMessage,
}: ErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 p-0 overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-6 px-6 py-8">
          {/* Error Icon */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5">
            <XCircle className="w-8 h-8" strokeWidth={2.5} />
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

          {/* Error details */}
          {errorMessage && (
            <div className="w-full rounded-xl bg-rose-50 border border-rose-200 p-4 text-left text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Action */}
          <Button
            variant="outline"
            className="w-full h-10 rounded-lg text-sm font-medium"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}