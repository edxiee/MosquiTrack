import type { RouteObject } from "react-router-dom";

import AuthLayout from "@/app/layouts/AuthLayout";

import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";

export const authRoutes: RouteObject = {
  element: <AuthLayout />,
  children: [
    {
      path: "/",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      path: "/forgot-password",
      element: <ForgotPasswordPage />,
    },
  ],
};