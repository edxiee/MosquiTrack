import { NavLink } from "react-router-dom";

const navigationItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    name: "Barangays",
    path: "/barangays",
  },
  {
    name: "Ovitraps",
    path: "/ovitraps",
  },
  {
    name: "Reports",
    path: "/reports",
  },
  {
    name: "Settings",
    path: "/settings",
  },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
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
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
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
      </nav>
    </aside>
  );
}