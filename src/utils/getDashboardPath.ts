import { ROLES, type RoleCode } from "@/constants/roles";

export function getDashboardPath(role: RoleCode | string | null | undefined): string {
  switch (role) {
    case ROLES.SYSTEM_ADMIN:
    case ROLES.ADMIN:
      return "/admin/dashboard";

    case ROLES.BARANGAY_ADMIN:
    case "MHO":
      return "/barangay/dashboard";

    case ROLES.FIELD_OPERATIVE:
    case "BHW":
      return "/field-ops/dashboard";

    default:
      return "/login";
  }
}
