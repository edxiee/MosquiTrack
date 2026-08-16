import { ROLES, type RoleCode } from "@/constants/roles";

export const ROUTES = {
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    georeferencing: "/admin/georeferencing",
    nodes: "/admin/nodes",
    telemetry: "/admin/telemetry",
    liveMonitoring: "/admin/live-monitoring",
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

export interface NavigationItem {
  name: string;
  path: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const SIDEBAR_CONFIG: Record<RoleCode, NavigationSection[]> = {
  [ROLES.SYSTEM_ADMIN]: [
    {
      title: "",
      items: [
        {
          name: "Dashboard",
          path: ROUTES.admin.dashboard,
        },
      ],
    },
    {
      title: "SYSTEM ADMINISTRATION",
      items: [
        {
          name: "User Access Control",
          path: ROUTES.admin.users,
        },
        {
          name: "Static Georeferencing",
          path: ROUTES.admin.georeferencing,
        },
        {
          name: "Node Provisioning",
          path: ROUTES.admin.nodes,
        },
        {
          name: "Raw Telemetry Hub",
          path: ROUTES.admin.telemetry,
        },
        {
          name: "Live Monitoring",
          path: ROUTES.admin.liveMonitoring,
        },
      ],
    },
  ],

  [ROLES.ADMIN]: [
    {
      title: "",
      items: [
        {
          name: "Dashboard",
          path: ROUTES.admin.dashboard,
        },
      ],
    },
    {
      title: "SYSTEM ADMINISTRATION",
      items: [
        {
          name: "User Access Control",
          path: ROUTES.admin.users,
        },
        {
          name: "Static Georeferencing",
          path: ROUTES.admin.georeferencing,
        },
        {
          name: "Node Provisioning",
          path: ROUTES.admin.nodes,
        },
        {
          name: "Raw Telemetry Hub",
          path: ROUTES.admin.telemetry,
        },
        {
          name: "Live Monitoring",
          path: ROUTES.admin.liveMonitoring,
        },
      ],
    },
  ],

  [ROLES.LGU_ADMIN]: [
    {
      title: "",
      items: [
        {
          name: "Dashboard",
          path: ROUTES.lgu.dashboard,
        },
      ],
    },
    {
      title: "LGU MONITORING",
      items: [
        {
          name: "Macro Geospatial Heatmap",
          path: ROUTES.lgu.heatmap,
        },
        {
          name: "Prescriptive Analytics",
          path: ROUTES.lgu.analytics,
        },
        {
          name: "Reports & Analytics",
          path: ROUTES.lgu.reports,
        },
      ],
    },
  ],

  [ROLES.BHW]: [
    {
      title: "",
      items: [
        {
          name: "Dashboard",
          path: ROUTES.bhw.dashboard,
        },
      ],
    },
    {
      title: "BARANGAY OPERATIONS",
      items: [
        {
          name: "Barangay Surveillance",
          path: ROUTES.bhw.surveillance,
        },
        {
          name: "Hardware Nodes",
          path: ROUTES.bhw.hardware,
        },
        {
          name: "Action Triage Log",
          path: ROUTES.bhw.triage,
        },
      ],
    },
  ],
};
