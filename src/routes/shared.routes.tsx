// src/routes/shared.routes.tsx

import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SettingsPage = lazy(() => import("@/pages/shared/SettingsPage"));
const UnauthorizedPage = lazy(() => import("@/pages/shared/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage"));

// <--- ADDED LAZY IMPORT FOR CHANGE PASSWORD PAGE
const ChangePasswordPage = lazy(() => import("@/pages/shared/ChangePasswordPage"));

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
    path: "/change-password",
    element: <ChangePasswordPage />,
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