import type { TriageAction, TriageStats } from "@/types/triage.types";

export function computeTriageStats(actions: TriageAction[]): TriageStats {
  return {
    totalAssigned: actions.length,
    pending: actions.filter((a) => a.status === "Pending").length,
    inProgress: actions.filter((a) => a.status === "In Progress").length,
    completed: actions.filter((a) => a.status === "Completed").length,
    highPriority: actions.filter(
      (a) => a.priority === "High" || a.priority === "Critical",
    ).length,
  };
}

export const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-slate-100 text-slate-500",
};
