import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import RoleGuard from "@/components/layout/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ROLES } from "@/constants/roles";
import RequestActionsOverviewPage from "@/pages/shared/RequestActionsOverviewPage";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const AdminDashboard = lazyWithRetry(() => import("@/pages/admin/AdminDashboard"));
const UserAccessControlPage = lazyWithRetry(() => import("@/pages/admin/UserAccessControlPage"));
const TrapLocation = lazyWithRetry(() => import("@/pages/admin/TrapLocation"));
const TrapManagement = lazyWithRetry(() => import("@/pages/admin/TrapManagement"));
const TrapDataOverview = lazyWithRetry(() => import("@/pages/admin/TrapDataOverview"));
const LiveMonitoringPage = lazyWithRetry(() => import("@/pages/admin/LiveMonitoringPage"));
const Announcements = lazyWithRetry(() => import("@/pages/admin/Announcements"));
const SystemControls = lazyWithRetry(() => import("@/pages/admin/SystemControls"));

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.ADMIN]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "request-actions-overview",
        element: <RequestActionsOverviewPage />,
      },
      {
        path: "users",
        element: <UserAccessControlPage />,
      },
      {
        path: "trap-location",
        element: <TrapLocation />,
      },
      {
        path: "trap-management",
        element: <TrapManagement />,
      },
      {
        path: "trap-data-overview",
        element: <TrapDataOverview />,
      },
      {
        path: "live-monitoring",
        element: <LiveMonitoringPage />,
      },
      {
        path: "announcements",
        element: <Announcements />,
      },
      {
        path: "system-controls",
        element: <SystemControls />,
      },
    ],
  },
];
