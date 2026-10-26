import { useEffect, useMemo, useState } from "react";
import TriageStatistics from "@/components/notifications/TriageStatistics";
import TriageFilters from "@/components/notifications/TriageFilters";
import TriageTable from "@/components/notifications/TriageTable";
import UpdateStatusDialog from "@/components/notifications/UpdateStatusDialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Filter, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TriageAction,
  TriageFilterValues,
  TriageStatus,
} from "@/types/triage.types";
import {
  getActionById,
  getAssignedActions,
  getBarangayOptions,
  updateActionStatus,
} from "@/services/triage.service";
import { supabase } from "@/lib/supabase";
import { computeTriageStats } from "@/utils/triageHelpers";
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

export default function ActionTriageLogPage() {
  const [actions, setActions] = useState<TriageAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<TriageFilterValues>(DEFAULT_FILTERS);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<TriageAction | null>(null);
  const { profile, loading: authLoading } = useAuth();
  const isSysAdmin =
    profile?.role?.role_code === "SYS_ADMIN" ||
    profile?.role?.role_code === "ADMIN";
  const scopedBarangayId = isSysAdmin ? undefined : profile?.barangay?.id;
  const scopedBarangayName = isSysAdmin
    ? undefined
    : profile?.barangay?.barangay_name;

  async function loadActions(barangayId: string | undefined, barangayName: string | undefined) {
    if (authLoading || !profile) return;
    setIsLoading(true);
    try {
      const data = await getAssignedActions({ barangayId, barangayName });
      setActions(data);
    } catch (err) {
      console.error("Failed to load action items:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !profile) return;

    let cancelled = false;

    // Barangay changed: drop old rows and any stale barangay filter right away
    setActions([]);
    setFilters((prev) => ({ ...prev, barangay: "all" }));
    setIsLoading(true);

    getAssignedActions({ barangayId: scopedBarangayId, barangayName: scopedBarangayName })
      .then((data) => {
        if (!cancelled) setActions(data);
      })
      .catch((err) => console.error("Failed to load action items:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Only fetch all barangay options for SYS_ADMIN.
    // For barangay-scoped users (BHW, etc.) restrict the list strictly to their own barangay.
    if (!isSysAdmin && scopedBarangayName) {
      setBarangayOptions([scopedBarangayName]);
    } else if (isSysAdmin) {
      getBarangayOptions()
        .then(setBarangayOptions)
        .catch((err) => console.error("Failed to load barangays:", err));
    }

    const channel = supabase
      .channel("action_triage_log_page_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_triage_log",
          ...(scopedBarangayId
            ? { filter: `barangay_id=eq.${scopedBarangayId}` }
            : {}),
        },
        async (payload) => {
          if (payload.eventType === "INSERT" && payload.new && (payload.new as { id?: string }).id) {
            const newId = (payload.new as { id: string }).id;
            const newAction = await getActionById(newId);
            if (newAction) {
              const matchesScope =
                isSysAdmin ||
                (scopedBarangayId && newAction.barangayId === scopedBarangayId) ||
                (scopedBarangayName &&
                  newAction.barangayName.trim().toLowerCase() ===
                    scopedBarangayName.trim().toLowerCase());
              if (!matchesScope) return;

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
          } else if (payload.eventType === "UPDATE" && payload.new && (payload.new as { id?: string }).id) {
            const updatedId = (payload.new as { id: string }).id;
            const updated = await getActionById(updatedId);
            if (updated) {
              const matchesScope =
                isSysAdmin ||
                (scopedBarangayId && updated.barangayId === scopedBarangayId) ||
                (scopedBarangayName &&
                  updated.barangayName.trim().toLowerCase() ===
                    scopedBarangayName.trim().toLowerCase());
              if (!matchesScope) {
                setActions((prev) => prev.filter((a) => a.id !== updated.id));
                return;
              }

              setActions((prev) =>
                prev.map((a) => (a.id === updated.id ? updated : a))
              );
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
  }, [authLoading, scopedBarangayId, scopedBarangayName, isSysAdmin, profile]);

  const filteredActions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const statusOrder: Record<string, number> = {
      Pending: 0,
      "In Progress": 1,
      Cancelled: 2,
      Completed: 3,
    };
    const priorityOrder: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return actions.filter((a) => {
      // Hard scope guard: when the user is not a system administrator,
      // strictly focus ONLY on their assigned barangay.
      // Under no circumstances should actions from other barangays be visible.
      const matchesScope = isSysAdmin
        ? true
        : Boolean(
            (scopedBarangayId && a.barangayId === scopedBarangayId) ||
            (scopedBarangayName &&
              a.barangayName.trim().toLowerCase() ===
                scopedBarangayName.trim().toLowerCase())
          );

      const matchesSearch =
        q === "" ||
        a.barangayName.toLowerCase().includes(q) ||
        (a.deviceCode ?? "").toLowerCase().includes(q) ||
        (a.requestedByName ?? "").toLowerCase().includes(q);
      const matchesPriority =
        filters.priority === "all" || a.priority === filters.priority;
      const matchesStatus =
        filters.status === "all" || a.status === filters.status;
      const matchesBarangay =
        filters.barangay === "all" || a.barangayName === filters.barangay;
      const actionDate = (a.assignedDate ?? "").slice(0, 10);
      const matchesFrom =
        !filters.dateFrom || (actionDate !== "" && actionDate >= filters.dateFrom);
      const matchesTo =
        !filters.dateTo || (actionDate !== "" && actionDate <= filters.dateTo);

      return (
        matchesScope &&
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesBarangay &&
        matchesFrom &&
        matchesTo
      );
    }).sort((a, b) =>
      (statusOrder[a.status] ?? Number.MAX_SAFE_INTEGER) -
      (statusOrder[b.status] ?? Number.MAX_SAFE_INTEGER) ||
      (priorityOrder[a.priority] ?? Number.MAX_SAFE_INTEGER) -
      (priorityOrder[b.priority] ?? Number.MAX_SAFE_INTEGER),
    );
  }, [actions, filters, scopedBarangayId, scopedBarangayName, isSysAdmin]);

  const stats = useMemo(
    () => computeTriageStats(filteredActions),
    [filteredActions],
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.priority !== "all" ||
    filters.status !== "all" ||
    filters.barangay !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  function handleUpdateStatus(action: TriageAction) {
    setSelectedAction(action);
    setIsDialogOpen(true);
  }

  async function handleSubmitUpdate(
    actionId: string,
    status: TriageStatus,
    remarks: string,
  ) {
    const prev = actions.find((a) => a.id === actionId);
    if (prev?.status === "Pending" && status !== "Pending") {
      dispatchTriageStatusChange(actionId, status, prev.status, prev.barangayId);
    }
    await updateActionStatus(actionId, { status, remarks });
    await loadActions(scopedBarangayId, scopedBarangayName);
  }

  async function handleQuickStatus(action: TriageAction, status: TriageStatus) {
    // Immediate optimistic decrement for the sidebar notification badge
    if (action.status === "Pending" && status !== "Pending") {
      dispatchTriageStatusChange(action.id, status, action.status, action.barangayId);
    }

    // optimistic update in table
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, status } : a)),
    );
    try {
      await updateActionStatus(action.id, {
        status,
        ...(action.remarks ? { remarks: action.remarks } : {}),
      });
      await loadActions(scopedBarangayId, scopedBarangayName);
    } catch (err) {
      console.error("Failed to update action:", err);
      await loadActions(scopedBarangayId, scopedBarangayName);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ClipboardList className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Action Logs
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Field response actions assigned based on surveillance findings.
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadActions(scopedBarangayId, scopedBarangayName)}
            disabled={isLoading}
            className="h-9 px-3 gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Stats */}
      <TriageStatistics stats={stats} />

      {/* Main Unified Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Container Filter & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">
                  Filter & Search Action Log
                </span>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="size-3 mr-1.5" />
                  Reset Filters
                </Button>
              )}
            </div>

            <TriageFilters
              filters={filters}
              onFiltersChange={setFilters}
              barangayOptions={barangayOptions}
              hideBarangayFilter={!isSysAdmin}
            />
          </div>
        </div>

        {/* Seamless Table Content */}
        <TriageTable
          actions={filteredActions}
          isLoading={isLoading}
          onUpdateStatus={handleUpdateStatus}
          onQuickStatus={handleQuickStatus}
          borderless
        />

        {/* Container Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] text-slate-400">
            MosquiTrack Field Response Operations
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs ring-1 ring-slate-200">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Showing {filteredActions.length} of {actions.length} Actions
          </span>
        </div>
      </div>

      <UpdateStatusDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        action={selectedAction}
        onSubmit={handleSubmitUpdate}
      />
    </div>
  );
}