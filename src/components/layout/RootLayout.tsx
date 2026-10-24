import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function RootLayout() {
  return (
    <main className="min-h-screen bg-slate-100">
      <Outlet />
      <Toaster richColors position="top-right" closeButton />
    </main>
  );
}
