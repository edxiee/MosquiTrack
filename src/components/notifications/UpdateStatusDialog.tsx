import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
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
import { convertImageFileToDataUrl } from "@/components/notifications/CompleteActionDialog";

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: TriageAction | null;
  onSubmit: (
    actionId: string,
    status: TriageStatus,
    remarks: string,
    imageUrl?: string | null,
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
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (action) {
      setStatus(action.status);
      setRemarks(action.remarks ?? "");
      setImageUrl(action.imageUrl ?? "");
    }
  }, [action]);

  async function handleFileSelect(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setIsProcessingImage(true);
    try {
      const dataUrl = await convertImageFileToDataUrl(file);
      setImageUrl(dataUrl);
    } catch (err) {
      console.error("Failed to convert image:", err);
      toast.error("Failed to process image.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  async function handleSave() {
    if (!action) return;
    if (status === "Completed" && !imageUrl.trim()) {
      toast.error("Please upload an image for proof of completion.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(
        action.id,
        status,
        remarks,
        imageUrl.trim() ? imageUrl.trim() : null,
      );
      toast.success("Action status updated.");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update action:", err);
      toast.error("Failed to update action. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            {(status === "Completed" || Boolean(imageUrl)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Proof of Completion Image{" "}
                  {status === "Completed" && <span className="text-rose-500">*</span>}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFileSelect(file);
                    e.target.value = "";
                  }}
                />
                {!imageUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingImage || isSaving}
                    className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-400 px-4 py-5 transition-colors cursor-pointer"
                  >
                    {isProcessingImage ? (
                      <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6 text-emerald-600" />
                        <span className="text-xs font-semibold text-slate-700">
                          Upload Proof of Completion Image
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center max-h-48">
                      <img
                        src={imageUrl}
                        alt="Proof of completion"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage || isSaving}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        disabled={isSaving}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
          <Button onClick={handleSave} disabled={isSaving || isProcessingImage}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
