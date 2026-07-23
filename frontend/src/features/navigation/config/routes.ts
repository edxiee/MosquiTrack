export const ROUTES = {
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    georeferencing: "/admin/georeferencing",
    nodes: "/admin/nodes",
    telemetry: "/admin/telemetry",
  },

  lgu: {
    dashboard: "/lgu/dashboard",
    heatmap: "/lgu/heatmap",
    analytics: "/lgu/analytics",
    reports: "/lgu/reports",
  },

  bhw: {
    dashboard: "/bhw/dashboard",
    surveillance: "/bhw/surveillance",
    hardware: "/bhw/hardware",
    triage: "/bhw/triage",
  },
} as const;