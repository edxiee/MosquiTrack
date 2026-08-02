import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TelemetryFilterValues } from "../types/telemetry";

interface TelemetryFiltersProps {
  filters: TelemetryFilterValues;
  onFiltersChange: (filters: TelemetryFilterValues) => void;
  barangayOptions: string[];
  statusOptions: string[];
}

export default function TelemetryFilters({
  filters,
  onFiltersChange,
  barangayOptions,
  statusOptions,
}: TelemetryFiltersProps) {
  function update(partial: Partial<TelemetryFilterValues>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
      <Input
        placeholder="Search by Device ID..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="w-full md:max-w-xs"
      />

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

      <Select
        value={filters.status}
        onValueChange={(value) => update({ status: value })}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {statusOptions.map((name) => (
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