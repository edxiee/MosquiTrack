import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: "SYS_ADMIN" | "MHO" | "BHW";
}

export default function RoleBadge({
  role,
}: RoleBadgeProps) {
  switch (role) {
    case "SYS_ADMIN":
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700">
          System Administrator
        </Badge>
      );

    case "MHO":
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700">
          Municipal Health Officer
        </Badge>
      );

    case "BHW":
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          Barangay Health Worker
        </Badge>
      );

    default:
      return <Badge>{role}</Badge>;
  }
}