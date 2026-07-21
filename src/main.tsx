import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";

import { QueryProvider } from "./app/providers/QueryProvider";
import { router } from "./app/routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <RouterProvider router={router} />
  </QueryProvider>
);