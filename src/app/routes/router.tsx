import { createBrowserRouter } from "react-router-dom";

import RootLayout from "@/app/layouts/RootLayout";
import LoginPage from "@/features/auth/pages/LoginPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
    ],
  },
]);