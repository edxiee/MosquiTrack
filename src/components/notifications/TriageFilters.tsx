import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import DateRangePicker from "@/components/common/DateRangePicker";
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
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          placeholder="Search barangay, device, or requester..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 h-9.5 text-sm bg-white"
        />
      </div>

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

      <DateRangePicker
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onRangeChange={(from, to) => update({ dateFrom: from, dateTo: to })}
        className="w-full md:w-64"
        placeholder="Select date range..."
      />
    </div>
  );
}
