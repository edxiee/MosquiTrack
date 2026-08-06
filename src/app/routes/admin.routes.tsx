import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import UserAccessControlPage from "@/features/users/pages/UserAccessControlPage";
import StaticGeoreferencingPage from "@/features/georeferencing/pages/StaticGeoreferencingPage";
import NodeProvisioningPage from "@/features/nodes/pages/NodeProvisioningPage";
import RawTelemetryHubPage from "@/features/telemetry/pages/RawTelemetryHubPage";
import LiveMonitoringPage from "@/features/monitoring/pages/LiveMonitoringPage";

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