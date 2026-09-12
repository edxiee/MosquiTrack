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
  FileText 
} from "lucide-react";
import { ROLES, type RoleCode } from "@/constants/roles";

export const ROUTES = {
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    georeferencing: "/admin/georeferencing",
    nodes: "/admin/nodes",
    telemetry: "/admin/telemetry",
    liveMonitoring: "/admin/live-monitoring",
    announcements: "/admin/announcements",
    systemControls: "/admin/system-controls",
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
      items: [{ name: "Dashboard", path: ROUTES.admin.dashboard, icon: LayoutDashboard }],
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
        { name: "Trap Location", path: ROUTES.admin.georeferencing, icon: MapPin },
        { name: "Trap Management", path: ROUTES.admin.nodes, icon: Router },
        { name: "Trap Data Overview", path: ROUTES.admin.telemetry, icon: Activity },
        { name: "Live Monitoring", path: ROUTES.admin.liveMonitoring, icon: Monitor },
      ],
    },
    {
      title: "LGU MONITORING",
      items: [
        { name: "Mosquito Trap Map", path: ROUTES.lgu.heatmap, icon: Map },
        { name: "Traps Reports & Requests", path: ROUTES.lgu.analytics, icon: ClipboardList },
        { name: "Reports & Analytics", path: ROUTES.lgu.reports, icon: BarChart3 },
      ],
    },
    {
      title: "BARANGAY OPERATIONS",
      items: [
        { name: "Barangay Surveillance", path: ROUTES.bhw.surveillance, icon: Eye },
        { name: "Traps Overview", path: ROUTES.bhw.hardware, icon: Boxes },
        { name: "Action Triage Log", path: ROUTES.bhw.triage, icon: FileText },
      ],
    },
  ],

  [ROLES.ADMIN]: [
    {
      title: "",
      items: [{ name: "Dashboard", path: ROUTES.admin.dashboard, icon: LayoutDashboard }],
    },
    {
      title: "SITE ADMINISTRATION",
      items: [
        { name: "User Access Control", path: ROUTES.admin.users, icon: Users },
        { name: "Trap Location", path: ROUTES.admin.georeferencing, icon: MapPin },
        { name: "Trap Management", path: ROUTES.admin.nodes, icon: Router },
        { name: "Raw Telemetry Hub", path: ROUTES.admin.telemetry, icon: Activity },
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
        { name: "Mosquito Trap Map", path: ROUTES.lgu.heatmap, icon: Map },
        { name: "Traps Reports & Requests", path: ROUTES.lgu.analytics, icon: ClipboardList },
        { name: "Reports & Analytics", path: ROUTES.lgu.reports, icon: BarChart3 },
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
        { name: "Traps Overview", path: ROUTES.bhw.hardware, icon: Boxes },
        { name: "Action Triage Log", path: ROUTES.bhw.triage, icon: FileText },
      ],
    },
  ],
};