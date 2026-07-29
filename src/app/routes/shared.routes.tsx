import type { RouteObject } from "react-router-dom";

import RootLayout from "@/app/layouts/RootLayout";

import UnauthorizedPage from "@/features/shared/pages/UnauthorizedPage";

export const sharedRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        path: "/unauthorized",
        element: <UnauthorizedPage />,
      },
    ],
  },
];