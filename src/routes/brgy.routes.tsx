import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";

const BhwDashboard = lazy(() => import("@/pages/brgy/BhwDashboard"));
const BarangaySurveillancePage = lazy(() => import("@/pages/brgy/BarangaySurveillancePage"));
const TrapsOverview = lazy(() => import("@/pages/brgy/TrapsOverview"));
const ActionLogs = lazy(() => import("@/pages/brgy/ActionLogs"));

export const brgyRoutes: RouteObject[] = [
  {
    path: "/bhw",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.BHW]}>
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
        element: <TrapsOverview />,
      },
      {
        path: "triage",
        element: <ActionLogs />,
      },
    ],
  },
];
