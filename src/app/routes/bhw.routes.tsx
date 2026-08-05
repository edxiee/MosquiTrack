import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import BhwDashboard from "@/features/dashboard/pages/BhwDashboard";
import BarangaySurveillancePage from "@/features/surveillance/pages/BarangaySurveillancePage";
import HardwareNodesPage from "@/features/nodes/pages/HardwareNodesPage";
import ActionTriageLogPage from "@/features/triage/pages/ActionTriageLogPage";

export const bhwRoutes: RouteObject[] = [
  {
    path: "/bhw",
    element: (
      <ProtectedRoute>
        <RoleGuard allow={[ROLES.BHW]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <BhwDashboard />,
      },
      {
        path: "surveillance",
        element: <BarangaySurveillancePage />,
      },
      {
        path: "hardware",
        element: <HardwareNodesPage />,
      },
      {
        path: "triage",
        element: <ActionTriageLogPage />,
      },
    ],
  },
];