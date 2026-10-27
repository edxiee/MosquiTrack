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
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Loader2,
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
    },
    {
      label: "High Priority",
      value: stats.highPriority,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card
          key={label}
          className="relative overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs transition hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardContent className="flex items-center justify-between p-5 pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </p>
              <h2 className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {value}
              </h2>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-100 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
