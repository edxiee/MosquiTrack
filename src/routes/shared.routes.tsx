import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SettingsPage = lazy(() => import("@/pages/shared/SettingsPage"));
const UnauthorizedPage = lazy(() => import("@/pages/shared/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage"));

export const sharedRoutes: RouteObject[] = [
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/settings",
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
