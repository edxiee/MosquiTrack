import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Megaphone, Send, Loader2, Archive, Eye } from "lucide-react";
import type { Announcement, AnnouncementLevel, AnnouncementTargetAudience } from "@/types/announcement.types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  isAnnouncementActive,
} from "@/services/announcement.service";
import { getErrorMessage } from "@/utils/errorHelpers";
import { supabase } from "@/lib/supabase";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("info");
  const [targetAudience, setTargetAudience] = useState<AnnouncementTargetAudience>("all");
  const [announceNow, setAnnounceNow] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const loadAnnouncements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError(getErrorMessage(err, "Failed to load announcements"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();

    // Realtime: listen to announcements AND views table
    const channel = supabase
      .channel("announcements_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => { loadAnnouncements(true); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_views" },
        () => { loadAnnouncements(true); }
      )
      .subscribe();

    // Polling fallback every 5 seconds
    const interval = setInterval(() => {
      loadAnnouncements(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (!announceNow && !startDate) return;

    setSubmitting(true);
    setError(null);

    try {
      // Prefer real auth user when available
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        level,
        target_audience: targetAudience,
        start_date: announceNow ? new Date().toISOString() : new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        posted_by: user?.email ?? user?.id ?? "system",
      });

      setTitle("");
      setMessage("");
      setLevel("info");
      setTargetAudience("all");
      setAnnounceNow(true);
      setStartDate("");
      setEndDate("");
      // Realtime will refresh the list; this is a safe fallback
      await loadAnnouncements(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to publish announcement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to delete announcement"));
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const isActive = isAnnouncementActive(ann.start_date, ann.end_date);
    if (activeTab === "active") return isActive;
    return !isActive;
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Megaphone className="size-8 text-emerald-600" />
          Broadcast Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Publish critical alerts, vector control notices, and instructions to
          LGU and Barangay field workers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Publish form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publish New Announcement</CardTitle>
            <CardDescription>
              Dispatched instantly across all active dashboard sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">Title <span className="text-rose-500">*</span></Label>
                <Input
                  id="ann-title"
                  placeholder="e.g. Dengue Alert: Barangay San Jose Cluster"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-level">Severity Level <span className="text-rose-500">*</span></Label>
                <select
                  id="ann-level"
                  value={level}
                  onChange={(e) =>
                    setLevel(e.target.value as AnnouncementLevel)
                  }
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="info">Info / General Notice</option>
                  <option value="warning">Warning / Elevated Risk</option>
                  <option value="critical">
                    Critical / Urgent Action Required
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-audience">Target Audience <span className="text-rose-500">*</span></Label>
                <select
                  id="ann-audience"
                  value={targetAudience}
                  onChange={(e) =>
                    setTargetAudience(e.target.value as AnnouncementTargetAudience)
                  }
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Users</option>
                  <option value="lgu">LGU / MHO Only</option>
                  <option value="bhw">Barangay Field Workers Only</option>
                </select>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center gap-6">
                  <Label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="timing"
                      checked={announceNow}
                      onChange={() => setAnnounceNow(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Announce Right Now
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="timing"
                      checked={!announceNow}
                      onChange={() => setAnnounceNow(false)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Schedule for Later
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!announceNow && (
                    <div className="space-y-2">
                      <Label htmlFor="ann-start">Start Date <span className="text-rose-500">*</span></Label>
                      <Input
                        id="ann-start"
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required={!announceNow}
                      />
                    </div>
                  )}
                  <div className={`space-y-2 ${announceNow ? 'col-span-2' : ''}`}>
                    <Label htmlFor="ann-end">End Date / Expiry (Optional)</Label>
                    <Input
                      id="ann-end"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-msg">Announcement Message <span className="text-rose-500">*</span>  </Label>
                <Textarea
                  id="ann-msg"
                  placeholder="Provide detailed instructions or updates for field officers..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitting ? "Publishing…" : "Publish Announcement"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Published list */}
        <Card className="flex flex-col h-[650px]">
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Published Announcements ({filteredAnnouncements.length})
                </CardTitle>
                <CardDescription>
                  Active broadcasts currently visible to health administrators and BHWs.
                </CardDescription>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-4">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2 h-full">
                <Loader2 className="size-4 animate-spin" />
                Loading announcements…
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm h-full flex items-center justify-center">
                No {activeTab} announcements found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50"
                  >
                    <div className="space-y-2 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base">
                          {ann.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            ann.level === "critical"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : ann.level === "warning"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {ann.level}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-300">
                          {ann.target_audience === "all" ? "All Users" : ann.target_audience === "lgu" ? "LGU Only" : "BHW Only"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Starts: {new Date(ann.start_date).toLocaleString()} 
                        {ann.end_date && ` · Ends: ${new Date(ann.end_date).toLocaleString()}`}
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {ann.message}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-slate-400">
                          Posted by {ann.posted_by} ·{" "}
                          {new Date(ann.created_at).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {/* Barangay (BHW) — yellow */}
                          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200" title="Barangay Field Workers Viewed">
                            <Eye className="size-3" />
                            <span className="font-bold">{ann.announcement_views?.filter(v => v.user_role === "bhw").length ?? 0}</span>
                            <span className="text-[10px] uppercase tracking-wide">BHW</span>
                          </div>
                          {/* LGU — blue */}
                          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200" title="LGU / MHO Viewed">
                            <Eye className="size-3" />
                            <span className="font-bold">{ann.announcement_views?.filter(v => v.user_role === "lgu" || v.user_role === "mho").length ?? 0}</span>
                            <span className="text-[10px] uppercase tracking-wide">LGU</span>
                          </div>
                          {/* Admin — violet */}
                          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200" title="Admins Viewed">
                            <Eye className="size-3" />
                            <span className="font-bold">{ann.announcement_views?.filter(v => v.user_role === "admin").length ?? 0}</span>
                            <span className="text-[10px] uppercase tracking-wide">Admin</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(ann.id)}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex-shrink-0"
                      title="Archive Announcement"
                    >
                      <Archive className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}