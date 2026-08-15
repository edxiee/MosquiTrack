import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportsFilterValues } from "@/types/reports.types";

interface ReportsFiltersProps {
  filters: ReportsFilterValues;
  onFiltersChange: (filters: ReportsFilterValues) => void;
  barangayOptions: string[];
  deviceOptions: string[];
  statusOptions: string[];
}

export default function ReportsFilters({
  filters,
  onFiltersChange,
  barangayOptions,
  deviceOptions,
  statusOptions,
}: ReportsFiltersProps) {
  function update(partial: Partial<ReportsFilterValues>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
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
        value={filters.device}
        onValueChange={(value) => update({ device: value })}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Devices" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Devices</SelectItem>
          {deviceOptions.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
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
    </div>
  );
}
