import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { TriageStats } from "@/types/triage.types";

interface TriageStatisticsProps {
  stats: TriageStats;
}

export default function TriageStatistics({ stats }: TriageStatisticsProps) {
  const cards = [
    {
      label: "Total Assigned",
      value: stats.totalAssigned,
      icon: ClipboardList,
      text: "text-slate-700",
      bg: "from-slate-50 to-slate-100",
      chip: "bg-slate-200/70 text-slate-600",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      text: "text-amber-700",
      bg: "from-amber-50 to-amber-100/60",
      chip: "bg-amber-200/70 text-amber-700",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Loader2,
      text: "text-sky-700",
      bg: "from-sky-50 to-sky-100/60",
      chip: "bg-sky-200/70 text-sky-700",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      text: "text-emerald-700",
      bg: "from-emerald-50 to-emerald-100/60",
      chip: "bg-emerald-200/70 text-emerald-700",
    },
    {
      label: "High Priority",
      value: stats.highPriority,
      icon: AlertTriangle,
      text: "text-red-700",
      bg: "from-red-50 to-red-100/60",
      chip: "bg-red-200/70 text-red-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, text, bg, chip }) => (
        <Card
          key={label}
          className={`rounded-2xl border-0 bg-gradient-to-br ${bg} shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <h2 className={`mt-2 text-3xl font-bold tabular-nums ${text}`}>
                {value}
              </h2>
            </div>
            <div className={`rounded-xl p-3 ${chip}`}>
              <Icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
