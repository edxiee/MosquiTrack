import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "PENDING" | "ACTIVE" | "INACTIVE";
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          Active
        </Badge>
      );

    case "PENDING":
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
          Pending
        </Badge>
      );

    case "INACTIVE":
      return (
        <Badge variant="destructive">
          Inactive
        </Badge>
      );

    default:
      return <Badge>{status}</Badge>;
  }
}