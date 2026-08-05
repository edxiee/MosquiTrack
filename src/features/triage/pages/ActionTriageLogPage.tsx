import { useEffect, useMemo, useState } from "react";
import TriageStatistics from "../components/TriageStatistics";
import TriageFilters from "../components/TriageFilters";
import TriageTable from "../components/TriageTable";
import UpdateStatusDialog from "../components/UpdateStatusDialog";
import type {
  TriageAction,
  TriageFilterValues,
  TriageStatus,
} from "../types/triage.types";
import {
  getAssignedActions,
  getBarangayOptions,
  updateActionStatus,
} from "../services/triage.service";
import { computeTriageStats } from "../utils/triageHelpers";

const DEFAULT_FILTERS: TriageFilterValues = {
  search: "",
  priority: "all",
  status: "all",
  barangay: "all",
  dateFrom: "",
  dateTo: "",
};

// TODO: replace with the signed-in BHW's profile id from your AuthContext
// (e.g. `const { profile } = useAuth();`) to scope this to their own
// assigned actions. Left undefined for now so MHO/SYS_ADMIN can see
// everything their RLS policy allows while you wire that in.
const CURRENT_USER_ID: string | undefined = undefined;

export default function ActionTriageLogPage() {
  const [actions, setActions] = useState<TriageAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<TriageFilterValues>(DEFAULT_FILTERS);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<TriageAction | null>(
    null,
  );

  async function loadActions() {
    setIsLoading(true);
    try {
      const data = await getAssignedActions(CURRENT_USER_ID);
      setActions(data);
    } catch (err) {
      console.error("Failed to load action items:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadActions();
    getBarangayOptions()
      .then(setBarangayOptions)
      .catch((err) => console.error("Failed to load barangays:", err));
  }, []);

  const filteredActions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return actions.filter((a) => {
      const matchesSearch =
        q === "" ||
        a.barangayName.toLowerCase().includes(q) ||
        (a.deviceCode ?? "").toLowerCase().includes(q);
      const matchesPriority =
        filters.priority === "all" || a.priority === filters.priority;
      const matchesStatus =
        filters.status === "all" || a.status === filters.status;
      const matchesBarangay =
        filters.barangay === "all" || a.barangayName === filters.barangay;
      const matchesFrom =
        !filters.dateFrom || a.assignedDate >= filters.dateFrom;
      const matchesTo = !filters.dateTo || a.assignedDate <= filters.dateTo;

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesBarangay &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [actions, filters]);

  const stats = useMemo(
    () => computeTriageStats(filteredActions),
    [filteredActions],
  );

  function handleUpdateStatus(action: TriageAction) {
    setSelectedAction(action);
    setIsDialogOpen(true);
  }

  async function handleSubmitUpdate(
    actionId: string,
    status: TriageStatus,
    remarks: string,
  ) {
    await updateActionStatus(actionId, { status, remarks });
    await loadActions();
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-4xl font-bold">Action Triage Log</h1>
        <p className="mt-2 text-slate-600">
          Field response actions assigned based on surveillance findings.
        </p>
      </div>

      <TriageStatistics stats={stats} />

      <TriageFilters
        filters={filters}
        onFiltersChange={setFilters}
        barangayOptions={barangayOptions}
      />

      <TriageTable
        actions={filteredActions}
        isLoading={isLoading}
        onUpdateStatus={handleUpdateStatus}
      />

      <UpdateStatusDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        action={selectedAction}
        onSubmit={handleSubmitUpdate}
      />
    </div>
  );
}