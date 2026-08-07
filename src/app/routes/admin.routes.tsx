import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import { lazy } from "react";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";

const UserAccessControlPage = lazy(() => import("@/features/users/pages/UserAccessControlPage"));
const StaticGeoreferencingPage = lazy(() => import("@/features/georeferencing/pages/StaticGeoreferencingPage"));
const NodeProvisioningPage = lazy(() => import("@/features/nodes/pages/NodeProvisioningPage"));
const RawTelemetryHubPage = lazy(() => import("@/features/telemetry/pages/RawTelemetryHubPage"));
const LiveMonitoringPage = lazy(() => import("@/features/monitoring/pages/LiveMonitoringPage"));

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <RoleGuard allow={[ROLES.SYSTEM_ADMIN]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
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
    ],
  },
];