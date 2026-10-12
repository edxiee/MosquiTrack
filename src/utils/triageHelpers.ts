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
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
  Medium: "bg-blue-50 text-blue-700 ring-blue-200",
  High: "bg-orange-50 text-orange-700 ring-orange-200",
  Critical: "bg-red-50 text-red-700 ring-red-200",
};

export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  "In Progress": "bg-sky-50 text-sky-700 ring-sky-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export const DOT_STYLES: Record<string, string> = {
  Low: "bg-slate-400",
  Medium: "bg-blue-500",
  High: "bg-orange-500",
  Critical: "bg-red-500 animate-pulse",
  Pending: "bg-amber-500",
  "In Progress": "bg-sky-500 animate-pulse",
  Completed: "bg-emerald-500",
  Cancelled: "bg-slate-400",
};

export const PRIORITY_BORDER: Record<string, string> = {
  Low: "border-l-slate-300",
  Medium: "border-l-blue-400",
  High: "border-l-orange-400",
  Critical: "border-l-red-500",
};

export function isOverdue(
  dueDate: string | null,
  status: string,
): boolean {
  if (!dueDate || status === "Completed" || status === "Cancelled") return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}
