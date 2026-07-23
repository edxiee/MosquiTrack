import {
  ROLES,
  type RoleCode,
} from "@/features/auth/constants/roles";

import { ROUTES } from "./routes";

export interface NavigationItem {
  name: string;
  path: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const SIDEBAR_CONFIG: Record<
  RoleCode,
  NavigationSection[]
> = {
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