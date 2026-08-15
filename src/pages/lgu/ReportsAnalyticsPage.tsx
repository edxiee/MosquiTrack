import { useEffect, useMemo, useState } from "react";
import SummaryCards from "@/components/reports/SummaryCards";
import TelemetryTrendChart from "@/components/reports/TelemetryTrendChart";
import BarangayRanking from "@/components/reports/BarangayRanking";
import DeviceStatusChart from "@/components/reports/DeviceStatusChart";
import ReportsFilters from "@/components/reports/ReportsFilters";
import type {
  BarangayRankingEntry,
  DeviceStatusSummaryEntry,
  RawTelemetryRow,
  ReportsFilterValues,
  SummaryStats,
} from "@/types/reports.types";
import {
  getActiveOfflineDeviceCounts,
  getBarangayOptions,
  getBarangayRanking,
  getDeviceOptions,
  getDeviceStatusOptions,
  getDeviceStatusSummary,
  getFilteredReadings,
  getHighRiskBarangayCount,
} from "@/services/reports.service";
import {
  computeAvgHumidity,
  computeAvgTemperature,
  computeTelemetryTrend,
} from "@/utils/reportCalculations";

const DEFAULT_FILTERS: ReportsFilterValues = {
  dateFrom: "",
  dateTo: "",
  barangay: "all",
  device: "all",
  status: "all",
};

export default function ReportsAnalyticsPage() {
  const [filters, setFilters] = useState<ReportsFilterValues>(DEFAULT_FILTERS);

  const [readings, setReadings] = useState<RawTelemetryRow[]>([]);
  const [deviceStatusSummary, setDeviceStatusSummary] = useState<
    DeviceStatusSummaryEntry[]
  >([]);
  const [deviceCounts, setDeviceCounts] = useState({ active: 0, offline: 0 });
  const [barangayRanking, setBarangayRanking] = useState<BarangayRankingEntry[]>(
    [],
  );
  const [highRiskCount, setHighRiskCount] = useState(0);

  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [deviceOptions, setDeviceOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [barangays, devices, statuses] = await Promise.all([
          getBarangayOptions(),
          getDeviceOptions(),
          getDeviceStatusOptions(),
        ]);
        setBarangayOptions(barangays);
        setDeviceOptions(devices);
        setStatusOptions(statuses);
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadReportData() {
      setIsLoading(true);
      try {
        const [
          readingsData,
          statusSummary,
          counts,
          ranking,
          highRisk,
        ] = await Promise.all([
          getFilteredReadings(filters),
          getDeviceStatusSummary(filters),
          getActiveOfflineDeviceCounts(),
          getBarangayRanking(10),
          getHighRiskBarangayCount(),
        ]);

        if (!isMounted) return;
        setReadings(readingsData);
        setDeviceStatusSummary(statusSummary);
        setDeviceCounts(counts);
        setBarangayRanking(ranking);
        setHighRiskCount(highRisk);
      } catch (err) {
        console.error("Failed to load report data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReportData();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const trend = useMemo(() => computeTelemetryTrend(readings), [readings]);

  const summaryStats: SummaryStats = useMemo(
    () => ({
      totalReadings: readings.length,
      activeDevices: deviceCounts.active,
      offlineDevices: deviceCounts.offline,
      avgTemperature: computeAvgTemperature(readings),
      avgHumidity: computeAvgHumidity(readings),
      highRiskBarangays: highRiskCount,
    }),
    [readings, deviceCounts, highRiskCount],
  );

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-4xl font-bold">Reports & Analytics</h1>
        <p className="mt-2 text-slate-600">
          Aggregated mosquito surveillance analytics across your municipality.
        </p>
      </div>

      <ReportsFilters
        filters={filters}
        onFiltersChange={setFilters}
        barangayOptions={barangayOptions}
        deviceOptions={deviceOptions}
        statusOptions={statusOptions}
      />

      <SummaryCards stats={summaryStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TelemetryTrendChart data={trend} isLoading={isLoading} />
        </div>
        <DeviceStatusChart data={deviceStatusSummary} isLoading={isLoading} />
      </div>

      <BarangayRanking entries={barangayRanking} isLoading={isLoading} />
    </div>
  );
}
