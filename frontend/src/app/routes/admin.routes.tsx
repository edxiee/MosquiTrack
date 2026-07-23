import type { RouteObject } from "react-router-dom";

import RoleGuard from "@/features/auth/components/RoleGuard";
import { ROLES } from "@/features/auth/constants/roles";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import BarangaysPage from "@/features/barangays/pages/BarangaysPage";
import OvitrapsPage from "@/features/ovitraps/pages/OvitrapsPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";


export const adminRoutes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute>
        <RoleGuard allow={[ROLES.SYSTEM_ADMIN]}>
          <DashboardLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/barangays",
        element: <BarangaysPage />,
      },
      {
        path: "/ovitraps",
        element: <OvitrapsPage />,
      },
      {
        path: "/reports",
        element: <ReportsPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
    ],
  },
];