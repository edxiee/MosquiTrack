import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NoticeDialogProps {
  open: boolean;
  variant: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}

export default function NoticeDialog({
  open,
  variant,
  title,
  message,
  onClose,
}: NoticeDialogProps) {
  const isSuccess = variant === "success";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center text-center space-y-5 py-2">
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-full ring-8 ${
              isSuccess
                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/5"
                : "bg-rose-500/10 text-rose-600 ring-rose-500/5"
            }`}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {isSuccess ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              )}
            </svg>
          </div>

          <div className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold tracking-tight text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
              {message}
            </DialogDescription>
          </div>

          <Button
            className={`w-full h-10 rounded-lg text-sm font-medium text-white ${
              isSuccess
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-rose-500 hover:bg-rose-600"
            }`}
            onClick={onClose}
          >
            Okay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
