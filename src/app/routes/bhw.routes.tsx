import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import { lazy } from "react";
import BhwDashboard from "@/features/dashboard/pages/BhwDashboard";

const BarangaySurveillancePage = lazy(() => import("@/features/surveillance/pages/BarangaySurveillancePage"));
const HardwareNodesPage = lazy(() => import("@/features/nodes/pages/HardwareNodesPage"));
const ActionTriageLogPage = lazy(() => import("@/features/triage/pages/ActionTriageLogPage"));

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