import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar";
import AppLogo from "@/components/common/AppLogo";

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-slate-100">
      {/* Mobile Header (visible only on small screens) */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar 
                isMobile 
                className="flex h-full w-full flex-col bg-white" 
                onMobileClose={() => setMobileMenuOpen(false)} 
              />
            </SheetContent>
          </Sheet>
          <AppLogo variant="full" className="h-8 w-auto ml-2" />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <section className="flex-1 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(236,253,245,0.7))] p-4 md:p-6 overflow-auto">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-sm font-medium text-slate-500 animate-pulse">
                Loading module...
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </section>
    </main>
  );
}
