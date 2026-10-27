import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CheckCircle2,
  Cpu,
  Inbox,
  MapPin,
  MessageSquare,
  Play,
  Settings2,
  UserRound,
} from "lucide-react";
import type { TriageAction, TriageStatus } from "@/types/triage.types";
import {
  DOT_STYLES,
  PRIORITY_BORDER,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from "@/utils/triageHelpers";

interface TriageTableProps {
  actions: TriageAction[];
  isLoading: boolean;
  onUpdateStatus: (action: TriageAction) => void;
  onQuickStatus: (action: TriageAction, status: TriageStatus) => void;
  borderless?: boolean;
  newActionIds?: Set<string>;
}

function Badge({
  label,
  styles,
}: {
  label: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[label] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[label] ?? "bg-slate-400"}`} />
      {label}
    </span>
  );
}

function formatDate(d: string | null) {
  const date = d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

export default function TriageTable({
  actions,
  isLoading,
  onUpdateStatus,
  onQuickStatus,
  borderless = false,
  newActionIds,
}: TriageTableProps) {
  if (isLoading) {
    if (borderless) {
      return (
        <div className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      );
    }
    return (
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const tableElement = (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="text-xs uppercase tracking-wide">Task</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Location</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Priority</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Posted</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Due</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Requested By</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Taken By</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">
              Actions
            </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                    <div className="rounded-full bg-slate-100 p-4">
                      <Inbox className="h-7 w-7" />
                    </div>
                    <p className="font-medium text-slate-700">No action items found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action) => {
                const closed =
                  action.status === "Completed" || action.status === "Cancelled";
                const isNew = Boolean(newActionIds?.has(action.id));
                return (
                  <TableRow
                    key={action.id}
                    className={`group border-l-4 transition-colors ${
                      isNew
                        ? "bg-rose-50/50 hover:bg-rose-50/80"
                        : "hover:bg-slate-50"
                    } ${PRIORITY_BORDER[action.priority] ?? ""} ${closed ? "opacity-70" : ""}`}
                  >
                    <TableCell className="min-w-[200px] max-w-[360px]">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">
                          {action.triggerSource}
                        </p>
                        {isNew && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white tracking-wider animate-pulse shadow-xs">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-slate-400">
                        #{action.id.slice(0, 8)}
                      </p>
                      {action.remarks && (
                        <p
                          className="mt-1 flex items-start gap-1 truncate text-xs text-slate-500"
                          title={action.remarks}
                        >
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="truncate">{action.remarks}</span>
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                    <p
  className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
  title={[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
>
  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
  <span>
    {[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
  </span>
</p>
                      {action.deviceCode && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Cpu className="h-3.5 w-3.5 text-slate-400" />
                          {action.deviceCode}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge label={action.priority} styles={PRIORITY_STYLES} />
                    </TableCell>
                    <TableCell>
                      <Badge label={action.status} styles={STATUS_STYLES} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </span>
                        {action.requestedByName ? (
                          action.requestedByName
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </span>
                        {action.assignedToName ? (
                          action.assignedToName
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center justify-start gap-2">
                        {action.status === "Pending" && (
                          <Button
                            size="sm"
                            className="bg-sky-600 text-white transition-transform hover:-translate-y-0.5 hover:bg-sky-700"
                            onClick={() => onQuickStatus(action, "In Progress")}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start
                          </Button>
                        )}
                        {action.status === "In Progress" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white transition-transform hover:-translate-y-0.5 hover:bg-emerald-700"
                            onClick={() => onQuickStatus(action, "Completed")}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateStatus(action)}
                          aria-label="Manage action"
                        >
                          <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
  );

  if (borderless) {
    return <div className="overflow-x-auto">{tableElement}</div>;
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        {tableElement}
      </CardContent>
    </Card>
  );
}
