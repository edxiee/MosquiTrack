import type { RouteObject } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const LoginPage = lazyWithRetry(() => import("@/pages/LoginPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("@/pages/ForgotPasswordPage"));

export const authRoutes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/",
        element: <LoginPage />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPasswordPage />,
      },
    ],
  },
];
