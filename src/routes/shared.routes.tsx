// src/routes/shared.routes.tsx

import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const SettingsPage = lazyWithRetry(() => import("@/pages/shared/SettingsPage"));
const UnauthorizedPage = lazyWithRetry(() => import("@/pages/shared/UnauthorizedPage"));
const NotFoundPage = lazyWithRetry(() => import("@/pages/shared/NotFoundPage"));

// <--- ADDED LAZY IMPORT FOR CHANGE PASSWORD PAGE
const ChangePasswordPage = lazyWithRetry(() => import("@/pages/shared/ChangePasswordPage"));

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
