import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
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

/**
 * Converts an uploaded image File into a compressed Data URL string
 * so it can be stored directly in the PostgreSQL `image_url` TEXT column.
 */
export async function convertImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressedDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface CompleteActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: TriageAction | null;
  onConfirmComplete: (
    actionId: string,
    imageUrl: string,
    remarks: string,
  ) => Promise<void>;
}

export default function CompleteActionDialog({
  open,
  onOpenChange,
  action,
  onConfirmComplete,
}: CompleteActionDialogProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && action) {
      setImageUrl(action.imageUrl ?? "");
      setFileName("");
      setRemarks(action.remarks ?? "");
      setError(null);
    }
  }, [open, action]);

  async function handleFileSelect(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP, etc.).");
      return;
    }

    setError(null);
    setIsProcessingImage(true);
    try {
      const dataUrl = await convertImageFileToDataUrl(file);
      setImageUrl(dataUrl);
      setFileName(file.name);
    } catch (err) {
      console.error("Failed to convert image:", err);
      setError("Could not process the selected image. Please try another photo.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  async function handleSubmit() {
    if (!action) return;
    if (!imageUrl.trim()) {
      setError("Please upload a photo as proof of completion before submitting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirmComplete(action.id, imageUrl.trim(), remarks.trim());
      toast.success("Action marked as Completed with proof image.");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to complete action:", err);
      setError("Failed to save completion proof. Please make sure the image_url column exists in action_triage_log.");
      toast.error("Failed to complete action.");
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
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Complete Action & Upload Proof
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Upload a photo as proof of completion for this field request. The image will be converted into a URL and saved to the database.
          </DialogDescription>
        </DialogHeader>

        {action && (
          <div className="space-y-4">
            {/* Action Summary Banner */}
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-800 text-sm">
                  {action.triggerSource}
                </p>
                <span className="font-mono text-xs text-slate-400">
                  #{action.id.slice(0, 8)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {[action.municipalityName, action.barangayName]
                  .filter(Boolean)
                  .join(", ")}{" "}
                · <span className="font-medium">{action.priority}</span> priority
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {/* Image Upload Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Proof of Completion Photo <span className="text-rose-500">*</span>
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
                  disabled={isProcessingImage || isSubmitting}
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-400 px-4 py-8 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isProcessingImage ? (
                    <>
                      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                      <span className="text-xs font-medium text-slate-600">
                        Converting photo to URL…
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          Click to upload proof image
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          JPG, PNG, or WEBP — automatically converted to database URL
                        </p>
                      </div>
                    </>
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center max-h-60">
                    <img
                      src={imageUrl}
                      alt="Proof of completion preview"
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 truncate">
                      {fileName || "Uploaded completion proof image"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingImage || isSubmitting}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImageUrl("");
                          setFileName("");
                        }}
                        disabled={isSubmitting}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Remarks Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Remarks / Field Notes
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any completion notes or observations..."
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
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isProcessingImage || !imageUrl}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Completion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

