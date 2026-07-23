import { ROLES, type RoleCode } from "../constants/roles";

export function getDashboardPath(role: RoleCode): string {
  switch (role) {
    case ROLES.SYSTEM_ADMIN:
      return "/dashboard";

    case ROLES.LGU_ADMIN:
      return "/lgu/dashboard";

    case ROLES.BHW:
      return "/bhw/dashboard";

    default:
      return "/";
  }
}