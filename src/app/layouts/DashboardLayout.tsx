import { Outlet } from "react-router-dom";
import Sidebar from "@/features/navigation/components/Sidebar";

export default function DashboardLayout() {
  return (
    <main className="flex min-h-screen bg-slate-100">
      {/* Sidebar Placeholder */}
      <Sidebar />

      {/* Main Content */}
      <section className="flex-1 p-6">
        <Outlet />
      </section>
    </main>
  );
}