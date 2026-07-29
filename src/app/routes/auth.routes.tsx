import type { RouteObject } from "react-router-dom";

import RootLayout from "@/app/layouts/RootLayout";

import LoginPage from "@/features/auth/pages/LoginPage";

export const authRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
    ],
  },
];