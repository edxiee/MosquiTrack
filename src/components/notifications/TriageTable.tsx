import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Image as ImageIcon,
  Inbox,
  MapPin,
  MessageSquare,
  Play,
  Settings2,
  UserRound,
} from "lucide-react";
import type { TriageAction, TriageStatus } from "@/types/triage.types";
import type { TriageView } from "@/components/notifications/TriageStatistics";
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
  onCompleteAction?: (action: TriageAction) => void;
  onCancelAction: (action: TriageAction) => void;
  view: TriageView;
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
  onCompleteAction,
  onCancelAction,
  view,
  borderless = false,
  newActionIds,
}: TriageTableProps) {
  const [detailAction, setDetailAction] = useState<TriageAction | null>(null);
  const showPriority = view !== "closed";
  const showPosted = view === "pending";
  const showDue = view !== "closed";
  const showTakenBy = view !== "pending";
  const columnCount =
    5 + Number(showPriority) + Number(showPosted) + Number(showDue) + Number(showTakenBy);

  if (isLoading) {
    if (borderless) {
      return (
        <>
          <div className="divide-y divide-slate-100 md:hidden" aria-label="Loading actions">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2 px-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <span className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                </div>
                <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <span className="block h-3 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="hidden space-y-3 p-6 md:block" aria-label="Loading actions">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </>
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
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="text-xs uppercase tracking-wide">Task</TableHead>
          <TableHead className="text-xs uppercase tracking-wide">Location</TableHead>
          {showPriority && <TableHead className="text-xs uppercase tracking-wide">Priority</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
          {showPosted && <TableHead className="text-xs uppercase tracking-wide">Posted</TableHead>}
          {showDue && <TableHead className="text-xs uppercase tracking-wide">Due</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">Requested By</TableHead>
          {showTakenBy && <TableHead className="text-xs uppercase tracking-wide">Taken By</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">
              Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
            {actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-16">
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
                    onClick={() => setDetailAction(action)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailAction(action);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View details for ${action.triggerSource}`}
                    className={`group border-l-4 transition-colors ${
                      isNew
                        ? "bg-rose-50/50 hover:bg-rose-50/80"
                        : "hover:bg-slate-50"
                    } ${PRIORITY_BORDER[action.priority] ?? ""} ${closed ? "opacity-70" : ""} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600`}
                  >
                    <TableCell className="min-w-[200px] max-w-[360px]">
                      <div className="flex items-center gap-2">
                        <span className="text-left font-semibold text-slate-800 group-hover:text-emerald-700">
                          {action.triggerSource}
                        </span>
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
                      {action.imageUrl && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <ImageIcon className="h-3 w-3 shrink-0" />
                          Proof photo attached
                        </span>
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
                    {showPriority && <TableCell>
                      <Badge label={action.priority} styles={PRIORITY_STYLES} />
                    </TableCell>}
                    <TableCell>
                      <Badge label={action.status} styles={STATUS_STYLES} />
                    </TableCell>
                    {showPosted && <TableCell className="text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.createdAt)}
                      </span>
                    </TableCell>}
                    {showDue && <TableCell className="whitespace-nowrap text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.dueDate)}
                      </span>
                    </TableCell>}
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
                    {showTakenBy && <TableCell>
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
                    </TableCell>}
                    <TableCell
                      className="whitespace-nowrap"
                      onClick={(event) => event.stopPropagation()}
                    >
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
                            onClick={() =>
                              onCompleteAction
                                ? onCompleteAction(action)
                                : onQuickStatus(action, "Completed")
                            }
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                        {view === "inProgress" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            onClick={() => onCancelAction(action)}
                          >
                            Cancel
                          </Button>
                        ) : view === "closed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus(action)}
                            aria-label="Manage action"
                          >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                            Manage
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
  );

  const details = detailAction
    ? [
        ["Task", detailAction.triggerSource],
        ["Status", detailAction.status],
        ["Priority", detailAction.priority],
        ["Barangay", detailAction.barangayName],
        ["Municipality", detailAction.municipalityName],
        ["Requested By", detailAction.requestedByName],
        ["Taken By", detailAction.assignedToName],
        ["Posted", formatDate(detailAction.createdAt)],
        ["Due", formatDate(detailAction.dueDate)],
        ["Remarks", detailAction.remarks],
      ]
    : [];

  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <div className="rounded-full bg-slate-100 p-3 text-slate-500">
              <Inbox className="size-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No action items found</p>
            <p className="text-xs">Try adjusting your filters.</p>
          </div>
        ) : (
          actions.map((action) => (
            <article key={action.id} className="bg-white px-3 py-3.5">
              <button
                type="button"
                className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                onClick={() => setDetailAction(action)}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold leading-5 text-slate-900">
                    {action.triggerSource}
                    {newActionIds?.has(action.id) && (
                      <span className="ml-2 inline-flex rounded bg-rose-500 px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                  </span>
                  <Badge label={action.status} styles={STATUS_STYLES} />
                </div>
                <div className="mt-2 flex min-w-0 items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-words">
                    {[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
                    {action.deviceCode ? ` · ${action.deviceCode}` : ""}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {showPriority && <Badge label={action.priority} styles={PRIORITY_STYLES} />}
                  <span>{showPosted ? `Posted ${formatDate(action.createdAt)}` : `Due ${formatDate(action.dueDate)}`}</span>
                  {showTakenBy && action.assignedToName && <span>Taken by {action.assignedToName}</span>}
                  {action.requestedByName && <span>By {action.requestedByName}</span>}
                </div>
                {action.remarks && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <MessageSquare className="mt-0.5 size-3 shrink-0" />
                    <span className="line-clamp-2">{action.remarks}</span>
                  </p>
                )}
              </button>
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {action.status === "Pending" && (
                  <Button
                    size="sm"
                    className="min-h-9 bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => onQuickStatus(action, "In Progress")}
                  >
                    <Play className="mr-1.5 size-3.5" />
                    Start
                  </Button>
                )}
                {action.status === "In Progress" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-9 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => onCancelAction(action)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="min-h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onCompleteAction ? onCompleteAction(action) : onQuickStatus(action, "Completed")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Complete
                    </Button>
                  </>
                )}
                {(action.status === "Completed" || action.status === "Cancelled") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9"
                    onClick={() => onUpdateStatus(action)}
                  >
                    <Settings2 className="mr-1.5 size-3.5" />
                    Manage
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      {borderless ? (
        <div className="hidden overflow-x-auto md:block">{tableElement}</div>
      ) : (
        <Card className="hidden overflow-hidden rounded-2xl border-slate-200 shadow-sm md:block">
          <CardContent className="overflow-x-auto p-0">{tableElement}</CardContent>
        </Card>
      )}
      <Dialog
        open={!!detailAction}
        onOpenChange={(open) => {
          if (!open) setDetailAction(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[65dvh] overflow-y-auto rounded-xl p-4 sm:max-h-[90dvh] sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>Review the action and choose an available action.</DialogDescription>
          </DialogHeader>
          {detailAction && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6">
                {details.map(([label, value]) => (
                  <div
                    key={label}
                    className={`min-w-0 border-b border-slate-100 pb-2 ${label === "Task" || label === "Remarks" ? "col-span-2" : ""}`}
                  >
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-slate-900">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {detailAction.imageUrl && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Proof of Completion
                  </h3>
                  <img
                    src={detailAction.imageUrl}
                    alt="Proof of completion"
                    className="max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
          )}
          {detailAction && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4">
              {detailAction.status === "Pending" && (
                <Button
                  className="min-h-10 w-full bg-sky-600 text-white hover:bg-sky-700 sm:w-auto"
                  onClick={() => {
                    setDetailAction(null);
                    onQuickStatus(detailAction, "In Progress");
                  }}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Start
                </Button>
              )}
              {detailAction.status === "In Progress" && (
                <>
                  <Button
                    variant="outline"
                    className="min-h-10 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-auto"
                    onClick={() => {
                      setDetailAction(null);
                      onCancelAction(detailAction);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="min-h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                    onClick={() => {
                      setDetailAction(null);
                      if (onCompleteAction) {
                        onCompleteAction(detailAction);
                      } else {
                        onQuickStatus(detailAction, "Completed");
                      }
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Complete
                  </Button>
                </>
              )}
              {(detailAction.status === "Completed" || detailAction.status === "Cancelled") && (
                <Button
                  variant="outline"
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => {
                    setDetailAction(null);
                    onUpdateStatus(detailAction);
                  }}
                >
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  Manage
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
