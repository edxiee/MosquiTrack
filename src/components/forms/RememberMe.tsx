import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RememberMeProps {
  id?: string;
}

export default function RememberMe({
  id = "remember-me",
}: RememberMeProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} />

      <Label
        className="text-sm font-normal"
        htmlFor={id}
      >
        Remember me
      </Label>
    </div>
  );
}