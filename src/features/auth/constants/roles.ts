export const ROLES = {
  SYSTEM_ADMIN: "SYS_ADMIN",
  LGU_ADMIN: "MHO",
  BHW: "BHW",
} as const;

export type RoleCode =
  (typeof ROLES)[keyof typeof ROLES];