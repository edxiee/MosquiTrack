import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TriageFilterValues } from "@/types/triage.types";

interface TriageFiltersProps {
  filters: TriageFilterValues;
  onFiltersChange: (filters: TriageFilterValues) => void;
  barangayOptions: string[];
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

export default function TriageFilters({
  filters,
  onFiltersChange,
  barangayOptions,
}: TriageFiltersProps) {
  function update(partial: Partial<TriageFilterValues>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
      <Input
        placeholder="Search barangay or device..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="w-full md:max-w-xs"
      />

      <Select
        value={filters.priority}
        onValueChange={(value) => update({ priority: value })}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => update({ status: value })}
      >
        <SelectTrigger className="w-full md:w-40">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.barangay}
        onValueChange={(value) => update({ barangay: value })}
      >
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="All Barangays" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Barangays</SelectItem>
          {barangayOptions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="w-full md:w-40"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="w-full md:w-40"
        />
      </div>
    </div>
  );
}
