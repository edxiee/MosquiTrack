import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const BhwDashboard = lazyWithRetry(() => import("@/pages/brgy/BhwDashboard"));
const BarangaySurveillancePage = lazyWithRetry(() => import("@/pages/brgy/BarangaySurveillancePage"));
const TrapsOverview = lazyWithRetry(() => import("@/pages/brgy/TrapsOverview"));
const ActionLogs = lazyWithRetry(() => import("@/pages/brgy/ActionLogs"));

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
        path: "traps-overview",
        element: <TrapsOverview />,
      },
      {
        path: "action-logs",
        element: <ActionLogs />,
      },
    ],
  },
];
