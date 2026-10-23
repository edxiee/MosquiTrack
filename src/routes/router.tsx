import { createBrowserRouter } from "react-router-dom";
import RootLayout from "@/components/layout/RootLayout";
import RouteErrorBoundary from "@/components/common/RouteErrorBoundary";
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { lguRoutes } from "./lgu.routes";
import { brgyRoutes } from "./brgy.routes";
import { sharedRoutes } from "./shared.routes";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      ...authRoutes,
      ...adminRoutes,
      ...lguRoutes,
      ...brgyRoutes,
      ...sharedRoutes,
    ],
  },
]);
