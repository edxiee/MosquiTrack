import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UserAccessControlPage = lazy(() => import("@/pages/admin/UserAccessControlPage"));
const StaticGeoreferencingPage = lazy(() => import("@/pages/admin/StaticGeoreferencingPage"));
const NodeProvisioningPage = lazy(() => import("@/pages/admin/NodeProvisioningPage"));
const RawTelemetryHubPage = lazy(() => import("@/pages/admin/RawTelemetryHubPage"));
const LiveMonitoringPage = lazy(() => import("@/pages/admin/LiveMonitoringPage"));
const Announcements = lazy(() => import("@/pages/admin/Announcements"));
const SystemControls = lazy(() => import("@/pages/admin/SystemControls"));

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "users",
        element: <UserAccessControlPage />,
      },
      {
        path: "georeferencing",
        element: <StaticGeoreferencingPage />,
      },
      {
        path: "nodes",
        element: <NodeProvisioningPage />,
      },
      {
        path: "telemetry",
        element: <RawTelemetryHubPage />,
      },
      {
        path: "live-monitoring",
        element: <LiveMonitoringPage />,
      },
      {
        path: "announcements",
        element: <Announcements />,
      },
      {
        path: "system-controls",
        element: <SystemControls />,
      },
    ],
  },
];
