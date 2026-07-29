import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";

import { QueryProvider } from "./app/providers/QueryProvider";
import { router } from "./app/routes";

import AuthProvider from "./features/auth/context/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryProvider>
);