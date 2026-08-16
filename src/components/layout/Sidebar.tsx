import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIDEBAR_CONFIG } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppLogo from "@/components/common/AppLogo";

export default function Sidebar() {
  const { profile, logout } = useAuth();

  const role = profile?.role?.role_code;
  const navigationSections = role ? (SIDEBAR_CONFIG[role] ?? []) : [];

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      window.alert(message);
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-center">
          <AppLogo className="h-3- w-30" />
        </div>

        <p className="mt-0.5 text-center text-xs font-medium tracking-wide text-slate-500">
          Smart Early Warning System
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {navigationSections.map((section) => (
          <div key={section.title || "main"} className="mb-6">
            {section.title && (
              <h2 className="mb-2 px-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </h2>
            )}

            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-emerald-100 font-semibold text-emerald-800"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full justify-start border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
