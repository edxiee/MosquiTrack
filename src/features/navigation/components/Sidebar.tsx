import { NavLink } from "react-router-dom";

import { SIDEBAR_CONFIG } from "../config/sidebar.config";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLES } from "@/features/auth/constants/roles";

export default function Sidebar() {
  const { profile } = useAuth();

  const role =
    profile?.role.role_code ?? ROLES.SYSTEM_ADMIN;

  const navigationSections =
    SIDEBAR_CONFIG[role];

  return (
    <aside className="flex w-72 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-emerald-600">
          🦟 MosquiTrack
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Early Warning System
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {navigationSections.map((section) => (
          <div key={section.title} className="mb-6">
            {section.title && (
              <h2 className="mb-2 px-3 text-xs font-bold tracking-wider text-slate-400">
                {section.title}
              </h2>
            )}

            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 transition ${
                        isActive
                          ? "bg-emerald-100 font-semibold text-emerald-700"
                          : "text-slate-600 hover:bg-slate-100"
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
    </aside>
  );
}