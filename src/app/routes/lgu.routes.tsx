import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import { lazy } from "react";
import LguDashboard from "@/features/dashboard/pages/LguDashboard";

const MacroGeospatialHeatmapPage = lazy(() => import("@/features/georeferencing/pages/MacroGeospatialHeatmapPage"));
const PrescriptiveAnalyticsPage = lazy(() => import("@/features/reports/pages/PrescriptiveAnalyticsPage"));
const ReportsAnalyticsPage = lazy(() => import("@/features/reports/pages/ReportsAnalyticsPage"));


export const lguRoutes: RouteObject[] = [
  {
    path: "/lgu",
    element: (
      <ProtectedRoute>
        <RoleGuard allow={[ROLES.LGU_ADMIN]}>
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
        path: "reports",
        element: <ReportsAnalyticsPage />,
      },
      {
        path: "heatmap",
        element: <MacroGeospatialHeatmapPage />,
      },
      {
        path: "analytics",
        element: <PrescriptiveAnalyticsPage />,
      },
    ]
  },
];