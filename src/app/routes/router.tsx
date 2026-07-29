import { createBrowserRouter } from "react-router-dom";

import { adminRoutes } from "./admin.routes";
import { authRoutes } from "./auth.routes";
import { bhwRoutes } from "./bhw.routes";
import { lguRoutes } from "./lgu.routes";
import { sharedRoutes } from "./shared.routes";

export const router = createBrowserRouter([
  ...authRoutes,
  ...adminRoutes,
  ...lguRoutes,
  ...bhwRoutes,
  ...sharedRoutes,
]);