// src/components/forms/SubmitButton.tsx
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  text: string;
  loading?: boolean;
}

export default function SubmitButton({
  text,
  loading = false,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="h-12 w-full bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {text}
        </>
      ) : (
        <>
          {text}
          <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}