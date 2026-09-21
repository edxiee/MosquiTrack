import { useState, useEffect } from "react";
import { getActiveAnnouncements, logAnnouncementView } from "@/services/announcement.service";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Announcement } from "@/types/announcement.types";
import { Megaphone, X } from "lucide-react";

export default function GlobalAnnouncementPopup() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("dismissed_announcements");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleDismiss = async (id: string) => {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    localStorage.setItem("dismissed_announcements", JSON.stringify(Array.from(next)));
  };

  // Fetch previously viewed announcements from the database on login
  useEffect(() => {
    if (!profile?.id) return;
    
    let isMounted = true;
    async function loadViewed() {
      const { data, error } = await supabase
        .from("announcement_views")
        .select("announcement_id")
        .eq("user_id", profile!.id);
        
      if (!error && data && isMounted) {
        setDismissed(prev => {
          const next = new Set(prev);
          data.forEach(v => next.add(v.announcement_id));
          return next;
        });
      }
    }
    loadViewed();
    
    return () => { isMounted = false; };
  }, [profile?.id]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getActiveAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();

    const channel = supabase
      .channel("global_announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          load();
        }
      )
      .subscribe();

    const intervalId = setInterval(() => {
      load();
    }, 5000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = announcements.filter((ann) => {
    if (dismissed.has(ann.id)) return false;
    if (ann.target_audience === "all") return true;
    
    const userRole = profile?.role?.role_code?.toUpperCase();
    if (ann.target_audience === "lgu" && userRole === "MHO") return true;
    if (ann.target_audience === "bhw" && userRole === "BHW") return true;
    
    return false;
  });

  const current = visible.length > 0 ? visible[0] : null; // Show them one by one

  // Log view automatically when it appears on screen
  useEffect(() => {
    if (current?.id && profile?.id) {
      let roleCode = profile.role?.role_code?.toLowerCase() || "bhw";
      if (roleCode === "sys_admin") roleCode = "admin";
      if (roleCode === "mho") roleCode = "lgu";
      logAnnouncementView(current.id, profile.id, roleCode).catch(console.error);
    }
  }, [current?.id, profile?.id, profile?.role?.role_code]);

  if (!profile || !current) return null;

  const themeColors = {
    info: { border: "border-t-sky-500", bg: "bg-sky-100", text: "text-sky-600" },
    warning: { border: "border-t-amber-500", bg: "bg-amber-100", text: "text-amber-600" },
    critical: { border: "border-t-rose-500", bg: "bg-rose-100", text: "text-rose-600" },
  }[current.level];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-2xl border-t-4 ${themeColors.border} bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className={`rounded-full ${themeColors.bg} p-2 ${themeColors.text} mt-0.5 shrink-0`}>
              <Megaphone className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg leading-tight pr-2">{current.title}</h4>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{current.message}</p>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(current.id)}
            className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md p-1 transition-colors shrink-0"
            title="Dismiss Announcement"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              current.level === "critical"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : current.level === "warning"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-sky-50 text-sky-700 border-sky-200"
            }`}
          >
            {current.level}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {new Date(current.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
