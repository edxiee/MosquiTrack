import { createBrowserRouter } from "react-router-dom";

import ProtectedRoute from "@/app/guards/ProtectedRoute";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import RootLayout from "@/app/layouts/RootLayout";

import LoginPage from "@/features/auth/pages/LoginPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";

import BarangaysPage from "@/features/barangays/pages/BarangaysPage";
import OvitrapsPage from "@/features/ovitraps/pages/OvitrapsPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
      {
        element: (
          <ProtectedRoute>
            <DashboardLayout />
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
    ],
  },
]);

