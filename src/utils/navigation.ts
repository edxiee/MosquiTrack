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
    requestActionsOverview: "/admin/request-actions-overview",
  },
  lgu: {
    dashboard: "/lgu/dashboard",
    trapMap: "/lgu/trap-map",
    trapActionRequests: "/lgu/trap-action-requests",
    reports: "/lgu/reports",
  },
  bhw: {
    dashboard: "/bhw/dashboard",
    surveillance: "/bhw/surveillance",
    trapOverview: "/bhw/traps-overview",
    actionLogs: "/bhw/action-logs",
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
        { name: "Request Actions Overview", path: ROUTES.admin.requestActionsOverview, icon: StickyNote },
      ],
    },
    {
      title: "System Administration",
      items: [
        { name: "Announcements", path: ROUTES.admin.announcements, icon: Megaphone },
        { name: "System Controls", path: ROUTES.admin.systemControls, icon: Settings },
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
      title: "LGU MONITORING",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.lgu.trapMap, icon: Map },
        { name: "Traps List & Requests", path: ROUTES.lgu.trapActionRequests, icon: ClipboardList },
        { name: "Trap Reports", path: ROUTES.lgu.reports, icon: BarChart3 },
      ],
    },
    {
      title: "BARANGAY OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.bhw.surveillance, icon: Eye },
        { name: "Traps Overview", path: ROUTES.bhw.trapOverview, icon: Boxes },
        { name: "Action Logs", path: ROUTES.bhw.actionLogs, icon: FileText },
      ],
    },
  ],

  [ROLES.ADMIN]: [
    {
      title: "",
      items: [
        { name: "Dashboard", path: ROUTES.admin.dashboard, icon: LayoutDashboard },
        { name: "Request Actions Overview", path: ROUTES.admin.requestActionsOverview, icon: StickyNote },
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
  ],

  [ROLES.LGU_ADMIN]: [
    {
      title: "",
      items: [{ name: "Dashboard", path: ROUTES.lgu.dashboard, icon: LayoutDashboard }],
    },
    {
      title: "LGU MONITORING",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.lgu.trapMap, icon: Map },
        { name: "Traps List & Requests", path: ROUTES.lgu.trapActionRequests, icon: ClipboardList },
        { name: "Trap Reports", path: ROUTES.lgu.reports, icon: BarChart3 },
      ],
    },
  ],

  [ROLES.BHW]: [
    {
      title: "",
      items: [{ name: "Dashboard", path: ROUTES.bhw.dashboard, icon: LayoutDashboard }],
    },
    {
      title: "BARANGAY OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.bhw.surveillance, icon: Eye },
        { name: "Traps Overview", path: ROUTES.bhw.trapOverview, icon: Boxes },
        { name: "Action Logs", path: ROUTES.bhw.actionLogs, icon: FileText },
      ],
    },
  ],
};