import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import LguDashboard from "@/features/dashboard/pages/LguDashboard";
import MacroGeospatialHeatmapPage from "@/features/georeferencing/pages/MacroGeospatialHeatmapPage";
import PrescriptiveAnalyticsPage from "@/features/reports/pages/PrescriptiveAnalyticsPage";
import ReportsAnalyticsPage from "@/features/reports/pages/ReportsAnalyticsPage";


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