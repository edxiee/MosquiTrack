import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: "SYS_ADMIN" | "MHO" | "BHW" | "ADMIN";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  switch (role) {
    case "SYS_ADMIN":
      return (
        <Badge className="bg-gray-600 hover:bg-black text-white">
          System Administrator
        </Badge>
      );

    case "ADMIN":
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
          Site Administrator
        </Badge>
      );


    case "MHO":
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
          Municipal Health Officer
        </Badge>
      );

    case "BHW":
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white">
          Barangay Health Worker
        </Badge>
      );

    default:
      return <Badge>{role}</Badge>;
  }
}
