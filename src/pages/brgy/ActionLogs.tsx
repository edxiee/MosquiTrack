import { useEffect, useMemo, useState } from "react";
import TriageStatistics, { type TriageView } from "@/components/notifications/TriageStatistics";
import TriageFilters from "@/components/notifications/TriageFilters";
import TriageTable from "@/components/notifications/TriageTable";
import UpdateStatusDialog from "@/components/notifications/UpdateStatusDialog";
import CompleteActionDialog from "@/components/notifications/CompleteActionDialog";
import CancelActionDialog from "@/components/notifications/CancelActionDialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TriageAction,
  TriageFilterValues,
  TriageStatus,
} from "@/types/triage.types";
import {
  getActionById,
  getAssignedActions,
  updateActionStatus,
} from "@/services/triage.service";
import { supabase } from "@/lib/supabase";
import { dispatchTriageStatusChange } from "@/hooks/useSidebarBadges";
import { useAuth } from "@/contexts/AuthContext";


const DEFAULT_FILTERS: TriageFilterValues = {
  search: "",
  priority: "all",
  status: "all",
  barangay: "all",
  dateFrom: "",
  dateTo: "",
};

function canViewAction(action: TriageAction, userId: string): boolean {
  return action.status !== "In Progress" || action.assignedTo === userId;
}

function viewForStatus(status: TriageStatus): TriageView {
  if (status === "Pending") return "pending";
  if (status === "In Progress") return "inProgress";
  return "closed";
}

export default function ActionTriageLogPage() {
  const [actions, setActions] = useState<TriageAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TriageFilterValues>(DEFAULT_FILTERS);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<TriageAction | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [actionToComplete, setActionToComplete] = useState<TriageAction | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [actionToCancel, setActionToCancel] = useState<TriageAction | null>(null);
  const { profile, loading: authLoading } = useAuth();
  const [selectedView, setSelectedView] = useState<TriageView>("pending");

  async function loadActions() {
    if (authLoading || !profile?.id) return;
    setIsLoading(true);
    try {
      const data = await getAssignedActions({ visibleInProgressTo: profile.id });
      setActions(data.filter((action) => canViewAction(action, profile.id)));
    } catch (err) {
      console.error("Failed to load action items:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !profile?.id) return;

    let cancelled = false;

    getAssignedActions({ visibleInProgressTo: profile.id })
      .then((data) => {
        if (!cancelled) {
          setActions(data.filter((action) => canViewAction(action, profile.id)));
        }
      })
      .catch((err) => console.error("Failed to load action items:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const channel = supabase
      .channel("action_triage_log_page_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_triage_log",
        },
        async (payload) => {
          const newRow = payload.new as
            | { id?: string; status?: string; assigned_to?: string | null }
            | undefined;
          const isAnotherUsersInProgressAction =
            newRow?.status === "In Progress" && newRow.assigned_to !== profile.id;

          if (payload.eventType === "INSERT" && newRow?.id) {
            if (isAnotherUsersInProgressAction) return;
            const newId = newRow.id;
            const newAction = await getActionById(newId);
            if (newAction && canViewAction(newAction, profile.id)) {
              setActions((prev) => {
                if (prev.some((a) => a.id === newAction.id)) return prev;
                return [newAction, ...prev];
              });
              if (newAction.status === "Pending") {
                dispatchTriageStatusChange(
                  newAction.id,
                  "Pending",
                  undefined,
                  newAction.barangayId
                );
              }
            }
          } else if (payload.eventType === "UPDATE" && newRow?.id) {
            const updatedId = newRow.id;
            if (isAnotherUsersInProgressAction) {
              setActions((prev) => prev.filter((action) => action.id !== updatedId));
              return;
            }
            const updated = await getActionById(updatedId);
            if (updated && canViewAction(updated, profile.id)) {
              setActions((prev) =>
                prev.some((action) => action.id === updated.id)
                  ? prev.map((action) => (action.id === updated.id ? updated : action))
                  : [updated, ...prev]
              );
            } else {
              setActions((prev) => prev.filter((action) => action.id !== updatedId));
            }
          } else if (payload.eventType === "DELETE" && payload.old && (payload.old as { id?: string }).id) {
            const deletedId = (payload.old as { id: string }).id;
            setActions((prev) => prev.filter((a) => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [authLoading, profile?.id]);

  const baseFilteredActions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const statusOrder: Record<string, number> = {
      Pending: 0,
      "In Progress": 1,
      Cancelled: 3,
      Completed: 2,
    };
    const priorityOrder: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return actions.filter((a) => {
      const matchesSearch =
        q === "" ||
        a.priority.toLowerCase().includes(q) ||
        a.barangayName.toLowerCase().includes(q) ||
        (a.deviceCode ?? "").toLowerCase().includes(q) ||
        (a.requestedByName ?? "").toLowerCase().includes(q);
      const matchesPriority =
        filters.priority === "all" || a.priority === filters.priority;
      const actionDate = (a.assignedDate ?? "").slice(0, 10);
      const matchesFrom =
        !filters.dateFrom || (actionDate !== "" && actionDate >= filters.dateFrom);
      const matchesTo =
        !filters.dateTo || (actionDate !== "" && actionDate <= filters.dateTo);

      return (
        matchesSearch &&
        matchesPriority &&
        matchesFrom &&
        matchesTo
      );
    }).sort((a, b) =>
      (statusOrder[a.status] ?? Number.MAX_SAFE_INTEGER) -
      (statusOrder[b.status] ?? Number.MAX_SAFE_INTEGER) ||
      (priorityOrder[a.priority] ?? Number.MAX_SAFE_INTEGER) -
      (priorityOrder[b.priority] ?? Number.MAX_SAFE_INTEGER),
    );
  }, [actions, filters]);

  const filteredActions = useMemo(
    () =>
      baseFilteredActions.filter((action) => {
        if (selectedView === "pending") return action.status === "Pending";
        if (selectedView === "inProgress") return action.status === "In Progress";
        return action.status === "Completed" || action.status === "Cancelled";
      }),
    [baseFilteredActions, selectedView],
  );

  const sectionActionCount = useMemo(
    () =>
      actions.filter((action) => {
        if (selectedView === "pending") return action.status === "Pending";
        if (selectedView === "inProgress") return action.status === "In Progress";
        return action.status === "Completed" || action.status === "Cancelled";
      }).length,
    [actions, selectedView],
  );

  const triageCounts = useMemo(
    () => ({
      pending: baseFilteredActions.filter((action) => action.status === "Pending")
        .length,
      inProgress: baseFilteredActions.filter(
        (action) => action.status === "In Progress",
      ).length,
      closed: baseFilteredActions.filter(
        (action) => action.status === "Completed" || action.status === "Cancelled",
      ).length,
    }),
    [baseFilteredActions],
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  function handleUpdateStatus(action: TriageAction) {
    setSelectedAction(action);
    setIsDialogOpen(true);
  }

  function handleOpenCompleteDialog(action: TriageAction) {
    setActionToComplete(action);
    setIsCompleteDialogOpen(true);
  }

  function handleOpenCancelDialog(action: TriageAction) {
    setActionToCancel(action);
    setIsCancelDialogOpen(true);
  }

  async function handleConfirmCancel(actionId: string, remarks: string) {
    const previousAction = actions.find((action) => action.id === actionId);
    if (previousAction?.status === "Pending") {
      dispatchTriageStatusChange(
        actionId,
        "Cancelled",
        previousAction.status,
        previousAction.barangayId,
      );
    }
    await updateActionStatus(actionId, { status: "Cancelled", remarks });
    setSelectedView("closed");
    await loadActions();
  }

  async function handleConfirmComplete(
    actionId: string,
    imageUrl: string,
    remarks: string,
  ) {
    const prev = actions.find((a) => a.id === actionId);
    if (prev?.status === "Pending") {
      dispatchTriageStatusChange(actionId, "Completed", prev.status, prev.barangayId);
    }
    await updateActionStatus(actionId, {
      status: "Completed",
      imageUrl,
      remarks,
    });
    setSelectedView("closed");
    await loadActions();
  }

  async function handleSubmitUpdate(
    actionId: string,
    status: TriageStatus,
    remarks: string,
    imageUrl?: string | null,
  ) {
    const prev = actions.find((a) => a.id === actionId);
    if (prev?.status === "Pending" && status !== "Pending") {
      dispatchTriageStatusChange(actionId, status, prev.status, prev.barangayId);
    }
    await updateActionStatus(actionId, {
      status,
      remarks,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    });
    setSelectedView(viewForStatus(status));
    await loadActions();
  }

  async function handleQuickStatus(action: TriageAction, status: TriageStatus) {
    if (status === "Completed") {
      handleOpenCompleteDialog(action);
      return;
    }

    // Immediate optimistic decrement for the sidebar notification badge
    if (action.status === "Pending" && status !== "Pending") {
      dispatchTriageStatusChange(action.id, status, action.status, action.barangayId);
    }

    // optimistic update in table
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, status } : a)),
    );
    const previousView = selectedView;
    setSelectedView(viewForStatus(status));
    try {
      await updateActionStatus(action.id, {
        status,
        ...(action.remarks ? { remarks: action.remarks } : {}),
      });
      await loadActions();
    } catch (err) {
      console.error("Failed to update action:", err);
      setSelectedView(previousView);
      await loadActions();
    }
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ClipboardList className="size-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Action Logs
            </h1>
          </div>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">
            Field response actions assigned based on surveillance findings.
          </p>
        </div>

        <div className="flex w-full items-center gap-2">
          <TriageFilters
            className="min-w-0 flex-1"
            filters={filters}
            onFiltersChange={setFilters}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              hasActiveFilters
                ? setFilters(DEFAULT_FILTERS)
                : loadActions()
            }
            disabled={isLoading}
            className="h-10 w-10 shrink-0 rounded-lg border-slate-200 bg-white p-0 text-slate-700 hover:bg-slate-50"
            aria-label={hasActiveFilters ? "Reset filters" : "Refresh"}
          >
            {hasActiveFilters ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            )}
          </Button>
        </div>
      </div>

      {/* Overview Metric Stats */}
      <TriageStatistics
        counts={triageCounts}
        selectedView={selectedView}
        onViewChange={setSelectedView}
        isLoading={isLoading}
      />

      {/* Main Unified Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
        {/* Seamless Table Content */}
        <TriageTable
          actions={filteredActions}
          view={selectedView}
          isLoading={isLoading}
          onUpdateStatus={handleUpdateStatus}
          onQuickStatus={handleQuickStatus}
          onCompleteAction={handleOpenCompleteDialog}
          onCancelAction={handleOpenCancelDialog}
          borderless
        />

        {/* Container Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 px-3 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-[11px] text-slate-400">
            MosquiTrack Field Response Operations
          </span>
          {isLoading ? (
            <span className="h-6 w-36 animate-pulse rounded-full bg-slate-200" />
          ) : (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs ring-1 ring-slate-200">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              Showing {filteredActions.length} of {sectionActionCount} Actions
            </span>
          )}
        </div>
      </div>

      <UpdateStatusDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        action={selectedAction}
        onSubmit={handleSubmitUpdate}
      />

      <CompleteActionDialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
        action={actionToComplete}
        onConfirmComplete={handleConfirmComplete}
      />

      <CancelActionDialog
        key={`${actionToCancel?.id ?? "none"}-${isCancelDialogOpen}`}
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        action={actionToCancel}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}
