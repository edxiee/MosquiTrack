import type { RouteObject } from "react-router-dom";

import DashboardLayout from "@/app/layouts/DashboardLayout";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

export const dashboardRoutes: RouteObject = {
  path: "/dashboard",
  element: <DashboardLayout />,
  children: [
    {
      index: true,
      element: <DashboardPage />,
    },
  ],
};