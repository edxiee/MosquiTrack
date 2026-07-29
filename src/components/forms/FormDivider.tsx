import { Separator } from "@/components/ui/separator";

interface FormDividerProps {
  text?: string;
}

export default function FormDivider({
  text = "OR",
}: FormDividerProps) {
  return (
    <div className="flex items-center gap-4">
      <Separator className="flex-1" />

      <span className="text-xs text-muted-foreground">
        {text}
      </span>

      <Separator className="flex-1" />
    </div>
  );
}