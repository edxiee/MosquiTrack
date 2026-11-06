export const ROLES = {
  SYSTEM_ADMIN: "SYS_ADMIN",
  ADMIN: "ADMIN",
  BARANGAY_ADMIN: "BRGY_ADMIN", // Formerly LGU_ADMIN / MHO
  FIELD_OPERATIVE: "FIELD_OP", // Formerly BHW
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];
