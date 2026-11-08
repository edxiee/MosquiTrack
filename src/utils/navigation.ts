import {
  type LucideIcon,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
  MapPin,
  Router,
  Activity,
  Monitor,
  Map,
  ClipboardList,
  BarChart3,
  Eye,
  Boxes,
  FileText,
  StickyNote
} from "lucide-react";
import { ROLES, type RoleCode } from "@/constants/roles";

export const ROUTES = {
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    trapLocation: "/admin/trap-location",
    trapManagement: "/admin/trap-management",
    trapDataOverview: "/admin/trap-data-overview",
    liveMonitoring: "/admin/live-monitoring",
    announcements: "/admin/announcements",
    systemControls: "/admin/system-controls",
    requestActionsOverview: "/barangay/request-actions-overview",
  },
  barangay: {
    dashboard: "/barangay/dashboard",
    trapMap: "/barangay/trap-map",
    trapActionRequests: "/barangay/trap-action-requests",
    requestActionsOverview: "/barangay/request-actions-overview",
    reports: "/barangay/reports",
  },
  lgu: {
    dashboard: "/barangay/dashboard",
    trapMap: "/barangay/trap-map",
    trapActionRequests: "/barangay/trap-action-requests",
    requestActionsOverview: "/barangay/request-actions-overview",
    reports: "/barangay/reports",
  },
  fieldOps: {
    dashboard: "/field-ops/dashboard",
    surveillance: "/field-ops/surveillance",
    trapOverview: "/field-ops/traps-overview",
    actionLogs: "/field-ops/action-logs",
  },
  bhw: {
    dashboard: "/field-ops/dashboard",
    surveillance: "/field-ops/surveillance",
    trapOverview: "/field-ops/traps-overview",
    actionLogs: "/field-ops/action-logs",
  },
} as const;

export interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
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
        { name: "Dashboard", path: ROUTES.admin.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      title: "System Administration",
      items: [
        { name: "Announcements", path: ROUTES.admin.announcements, icon: Megaphone },
        { name: "IoT System Controls", path: ROUTES.admin.systemControls, icon: Settings },
      ],
    },
    {
      title: "SITE ADMINISTRATION",
      items: [
        { name: "User Access Control", path: ROUTES.admin.users, icon: Users },
        { name: "Trap Location", path: ROUTES.admin.trapLocation, icon: MapPin },
        { name: "Trap Management", path: ROUTES.admin.trapManagement, icon: Router },
        { name: "Trap Data Info", path: ROUTES.admin.trapDataOverview, icon: Activity },
        { name: "Live Monitoring", path: ROUTES.admin.liveMonitoring, icon: Monitor },
      ],
    },
    {
      title: "BARANGAY ADMINISTRATION",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.barangay.trapMap, icon: Map },
        { name: "Traps List & Requests", path: ROUTES.barangay.trapActionRequests, icon: ClipboardList },
        { name: "Deployment Request", path: ROUTES.barangay.requestActionsOverview, icon: StickyNote },
        { name: "Trap Reports", path: ROUTES.barangay.reports, icon: BarChart3 },
      ],
    },
    {
      title: "FIELD OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.fieldOps.surveillance, icon: Eye },
        { name: "Traps Deployment", path: ROUTES.fieldOps.trapOverview, icon: Boxes },
        { name: "Action Logs", path: ROUTES.fieldOps.actionLogs, icon: FileText },
      ],
    },
  ],

  [ROLES.ADMIN]: [
    {
      title: "",
      items: [
        { name: "Dashboard", path: ROUTES.admin.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      title: "SITE ADMINISTRATION",
      items: [
        { name: "User Access Control", path: ROUTES.admin.users, icon: Users },
        { name: "Trap Location", path: ROUTES.admin.trapLocation, icon: MapPin },
        { name: "Trap Management", path: ROUTES.admin.trapManagement, icon: Router },
        { name: "Trap Data Info", path: ROUTES.admin.trapDataOverview, icon: Activity },
        { name: "Live Monitoring", path: ROUTES.admin.liveMonitoring, icon: Monitor },
      ],
    },
    {
      title: "BARANGAY ADMINISTRATION",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.barangay.trapMap, icon: Map },
        { name: "Traps List & Requests", path: ROUTES.barangay.trapActionRequests, icon: ClipboardList },
        { name: "Deployment Request", path: ROUTES.barangay.requestActionsOverview, icon: StickyNote },
        { name: "Trap Reports", path: ROUTES.barangay.reports, icon: BarChart3 },
      ],
    },
    {
      title: "FIELD OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.fieldOps.surveillance, icon: Eye },
        { name: "Traps Deployment", path: ROUTES.fieldOps.trapOverview, icon: Boxes },
        { name: "Action Logs", path: ROUTES.fieldOps.actionLogs, icon: FileText },
      ],
    },
  ],

  [ROLES.BARANGAY_ADMIN]: [
    {
      title: "",
      items: [{ name: "Dashboard", path: ROUTES.barangay.dashboard, icon: LayoutDashboard }],
    },
    {
      title: "BARANGAY ADMINISTRATION",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.barangay.trapMap, icon: Map },
        { name: "Traps List & Requests", path: ROUTES.barangay.trapActionRequests, icon: ClipboardList },
        { name: "Deployment Request", path: ROUTES.barangay.requestActionsOverview, icon: StickyNote },
        { name: "Trap Reports", path: ROUTES.barangay.reports, icon: BarChart3 },
      ],
    },
  ],

  [ROLES.FIELD_OPERATIVE]: [
    {
      title: "",
      items: [{ name: "Dashboard", path: ROUTES.fieldOps.dashboard, icon: LayoutDashboard }],
    },
    {
      title: "FIELD OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.fieldOps.surveillance, icon: Eye },
        { name: "Traps Deployment", path: ROUTES.fieldOps.trapOverview, icon: Boxes },
        { name: "Action Logs", path: ROUTES.fieldOps.actionLogs, icon: FileText },
      ],
    },
  ],
};
