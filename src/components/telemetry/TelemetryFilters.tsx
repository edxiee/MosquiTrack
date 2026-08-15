import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TelemetryFilterValues } from "@/types/telemetry.types";

interface TelemetryFiltersProps {
  filters: TelemetryFilterValues;
  onFiltersChange: (filters: TelemetryFilterValues) => void;
  barangayOptions: string[];
}

export default function TelemetryFilters({
  filters,
  onFiltersChange,
  barangayOptions,
}: TelemetryFiltersProps) {
  function update(partial: Partial<TelemetryFilterValues>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
      <Input
        placeholder="Search by Trap ID..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="w-full md:max-w-xs"
      />

      <Select
        value={filters.barangay}
        onValueChange={(value) => update({ barangay: value })}
      >
        <SelectTrigger className="w-full md:w-48 bg-white">
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

      <Select
        value={filters.uploadStatus}
        onValueChange={(value) => update({ uploadStatus: value })}
      >
        <SelectTrigger className="w-full md:w-44 bg-white">
          <SelectValue placeholder="All Upload Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Upload Status</SelectItem>
          <SelectItem value="Success">Success</SelectItem>
          <SelectItem value="Failed">Failed</SelectItem>
          <SelectItem value="Retrying">Retrying</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="w-full md:w-40 bg-white"
        />
        <span className="text-sm text-slate-400 font-medium">to</span>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="w-full md:w-40 bg-white"
        />
      </div>
    </div>
  );
}
