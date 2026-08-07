import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import Sidebar from "@/features/navigation/components/Sidebar";

export default function DashboardLayout() {
  return (
    <main className="flex min-h-screen bg-slate-100">
      {/* Sidebar Placeholder */}
      <Sidebar />

      {/* Main Content */}
      <section className="flex-1 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(236,253,245,0.7))] p-6">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-sm font-medium text-slate-500 animate-pulse">Loading module...</div>
          </div>
        }>
          <Outlet />
        </Suspense>
      </section>
    </main>
  );
}