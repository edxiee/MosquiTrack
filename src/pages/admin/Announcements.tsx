import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSystemControl } from "@/contexts/SystemControlContext";
import { Megaphone, Send, Trash2 } from "lucide-react";

export default function Announcements() {
  const { announcements, addAnnouncement, removeAnnouncement } = useSystemControl();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "critical">("info");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    addAnnouncement({
      title: title.trim(),
      message: message.trim(),
      level,
    });
    setTitle("");
    setMessage("");
  };

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Megaphone className="size-8 text-emerald-600" />
          Broadcast Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Publish critical alerts, vector control notices, and instructions to LGU and Barangay field workers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  placeholder="e.g. Dengue Alert: Barangay San Jose Cluster"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-level">Severity Level</Label>
                <select
                  id="ann-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as "info" | "warning" | "critical")}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="info">Info / General Notice</option>
                  <option value="warning">Warning / Elevated Risk</option>
                  <option value="critical">Critical / Urgent Action Required</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-msg">Announcement Message</Label>
                <Textarea
                  id="ann-msg"
                  placeholder="Provide detailed instructions or updates for field officers..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Send className="size-4" />
                Publish Announcement
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Published Announcements ({announcements.length})</CardTitle>
            <CardDescription>
              Active broadcasts currently visible to health administrators and BHWs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No active announcements published.
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{ann.title}</h4>
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
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{ann.message}</p>
                      <p className="text-xs text-slate-400">
                        Published on {new Date(ann.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAnnouncement(ann.id)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="size-4" />
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
