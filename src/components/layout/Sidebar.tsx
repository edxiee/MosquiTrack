import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIDEBAR_CONFIG } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppLogo from "@/components/common/AppLogo";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobile?: boolean;
  className?: string;
  onMobileClose?: () => void;
}

export default function Sidebar({ isMobile, className, onMobileClose }: SidebarProps = {}) {
  const { profile, logout } = useAuth();

  // 1. Initialize collapsed state from localStorage
  const [isCollapsedState, setIsCollapsedState] = useState(() => {
    return localStorage.getItem("mosquitrack-sidebar-collapsed") === "true";
  });

  const [isLgScreen, setIsLgScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const isCollapsed = isMobile ? false : (!isLgScreen || isCollapsedState);

  // 2. Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("mosquitrack-sidebar-collapsed", String(isCollapsedState));
    }
  }, [isCollapsedState, isMobile]);

  // 3. Track screen size for responsive sidebar
  useEffect(() => {
    if (isMobile) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLgScreen(window.innerWidth >= 1024);
      }, 50); // Small debounce for smoother resize
    };

    window.addEventListener("resize", handleResize);
    // Initial check
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [isMobile]);

  const role = profile?.role?.role_code;
  const navigationSections = role ? (SIDEBAR_CONFIG[role] ?? []) : [];
  const { getBadgeForPath } = useSidebarBadges();

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
    // Hidden on mobile (md:flex) to prevent layout breaking; mobile drawer handled in Step 4
    <aside 
      className={
        className !== undefined 
          ? className 
          : `sticky top-0 hidden md:flex h-screen flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out ${
              isCollapsed ? "w-20" : "w-[280px]"
            }`
      }
    >
      {/* Branding Area */}
      <div className="relative flex flex-col items-center border-b border-slate-200 p-4">
        <div className={`flex items-center justify-center transition-all duration-200 ${isCollapsed ? "w-10" : "w-full"}`}>
          <AppLogo 
            variant={isCollapsed ? "solo" : "full"} 
            className={`transition-all duration-200 ${isCollapsed ? "h-8 w-8" : "h-10 w-auto"}`} 
          />
        </div>
        
        {!isCollapsed && (
          <p className="mt-2 text-center text-xs font-medium tracking-wide text-slate-500">
            Smart Early Warning System
          </p>
        )}

        {/* Collapse/Expand Control */}
        {!isMobile && isLgScreen && (
          <button
            onClick={() => setIsCollapsedState(!isCollapsedState)}
            className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}

        {/* Mobile Close (X) Button */}
        {isMobile && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {navigationSections.map((section) => (
          <div key={section.title || "main"} className="mb-4">
            {section.title && !isCollapsed && (
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </h2>
            )}

            <ul className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const badgeInfo = getBadgeForPath(item.path);
                const showBadge = Boolean(badgeInfo && badgeInfo.count > 0);
                const badgeCount = badgeInfo?.count ?? 0;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={
                        isCollapsed
                          ? showBadge
                            ? `${item.name} (${badgeCount} pending)`
                            : item.name
                          : undefined
                      }
                      onClick={() => {
                        if (isMobile && onMobileClose) {
                          onMobileClose();
                        }
                      }}
                      className={({ isActive }) => {
                        let baseClasses =
                          "flex items-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ";

                        if (isCollapsed) {
                          baseClasses += "justify-center h-10 w-10 mx-auto relative ";
                          baseClasses += isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
                        } else {
                          baseClasses += "px-3 py-2.5 text-[15px] justify-between ";
                          baseClasses += isActive
                            ? "border-l-4 border-emerald-600 bg-emerald-50 pl-2 text-emerald-800 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium";
                        }

                        return baseClasses;
                      }}
                    >
                      {isCollapsed ? (
                        <div className="relative flex items-center justify-center">
                          <IconComponent className="h-5 w-5 flex-shrink-0" />
                          {showBadge && (
                            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                              {badgeInfo?.hasNew && (
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                              )}
                              <span className="relative">
                                {badgeCount > 9 ? "9+" : badgeCount}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <IconComponent className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {showBadge && (
                            <span
                              className={cn(
                                "ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-xs transition-all",
                                badgeInfo?.hasNew
                                  ? "bg-rose-600 animate-bounce"
                                  : "bg-rose-500 animate-pulse"
                              )}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-slate-200 p-3">
        <Button
          variant="outline"
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`
            w-full h-10 transition-all duration-200 
            bg-rose-50 text-rose-700 border border-rose-200 
            hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800
            ${isCollapsed ? "justify-center !px-0" : "justify-start gap-3 !px-3"}
          `}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-[15px] font-semibold">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
