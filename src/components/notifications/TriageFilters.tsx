import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import DateRangePicker from "@/components/common/DateRangePicker";
import type { TriageFilterValues } from "@/types/triage.types";

interface TriageFiltersProps {
  filters: TriageFilterValues;
  onFiltersChange: (filters: TriageFilterValues) => void;
  className?: string;
}

export default function TriageFilters({
  filters,
  onFiltersChange,
  className,
}: TriageFiltersProps) {
  function update(partial: Partial<TriageFilterValues>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <div className="relative flex h-10 min-w-0 items-center rounded-md border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          placeholder="Search"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-full min-w-0 flex-1 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0"
        />
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onRangeChange={(from, to) => update({ dateFrom: from, dateTo: to })}
          className="h-full w-11 shrink-0 rounded-none border-0 border-l border-slate-200 bg-transparent px-2 shadow-none hover:bg-slate-50"
          placeholder="Select date range..."
          iconOnly
        />
      </div>
    </div>
  );
}
