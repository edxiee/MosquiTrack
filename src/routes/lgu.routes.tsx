import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";

const LguDashboard = lazy(() => import("@/pages/lgu/LguDashboard"));
const MacroGeospatialHeatmapPage = lazy(() => import("@/pages/lgu/MacroGeospatialHeatmapPage"));
const PrescriptiveAnalyticsPage = lazy(() => import("@/pages/lgu/PrescriptiveAnalyticsPage"));
const ReportsAnalyticsPage = lazy(() => import("@/pages/lgu/ReportsAnalyticsPage"));

export const lguRoutes: RouteObject[] = [
  {
    path: "/lgu",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={[ROLES.LGU_ADMIN]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <LguDashboard />,
      },
      {
        path: "heatmap",
        element: <MacroGeospatialHeatmapPage />,
      },
      {
        path: "analytics",
        element: <PrescriptiveAnalyticsPage />,
      },
      {
        path: "reports",
        element: <ReportsAnalyticsPage />,
      },
    ],
  },
];
