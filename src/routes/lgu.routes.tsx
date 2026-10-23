import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const LguDashboard = lazyWithRetry(() => import("@/pages/lgu/LguDashboard"));
const MosquitoTrapMap = lazyWithRetry(() => import("@/pages/lgu/MosquitoTrapMap"));
const TrapActionRequest = lazyWithRetry(() => import("@/pages/lgu/TrapActionRequest"));
const ReportsPage = lazyWithRetry(() => import("@/pages/lgu/ReportsPage"));

export const lguRoutes: RouteObject[] = [
  {
    path: "/lgu",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.LGU_ADMIN]}>
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
        path: "trap-map",
        element: <MosquitoTrapMap />,
      },
      {
        path: "trap-action-requests",
        element: <TrapActionRequest />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
    ],
  },
];
