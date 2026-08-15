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
      color: "text-muted-foreground",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Loader2,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "High Priority",
      value: stats.highPriority,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
            </div>
            <Icon className={`h-8 w-8 ${color}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
