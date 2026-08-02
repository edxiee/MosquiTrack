import { useEffect, useMemo, useState } from "react";
import TelemetryStatistics from "../components/TelemetryStatistics";
import TelemetryFilters from "../components/TelemetryFilters";
import TelemetryTable from "../components/TelemetryTable";
import type {
  TelemetryFilterValues,
  TelemetryReading,
  TelemetryStats,
} from "../types/telemetry";
import {
  getBarangayOptions,
  getDeviceStatusCounts,
  getDeviceStatusOptions,
  getTelemetry,
  subscribeToNewReadings,
} from "../services/telemetry.service";

const DEFAULT_FILTERS: TelemetryFilterValues = {
  search: "",
  barangay: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

export default function RawTelemetryHubPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceCounts, setDeviceCounts] = useState({ online: 0, offline: 0 });
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<TelemetryFilterValues>(DEFAULT_FILTERS);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [readingsData, counts, barangays, statuses] = await Promise.all([
          getTelemetry(),
          getDeviceStatusCounts(),
          getBarangayOptions(),
          getDeviceStatusOptions(),
        ]);
        if (!isMounted) return;
        setReadings(readingsData);
        setDeviceCounts(counts);
        setBarangayOptions(barangays);
        setStatusOptions(statuses);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialData();

    // Live feed: prepend new readings as they arrive
    const unsubscribe = subscribeToNewReadings((newReading) => {
      setReadings((prev) => [newReading, ...prev]);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredReadings = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return readings.filter((r) => {
      const matchesSearch =
        q === "" || r.device_code.toLowerCase().includes(q);
      const matchesBarangay =
        filters.barangay === "all" || r.barangay_name === filters.barangay;
      const matchesStatus =
        filters.status === "all" || r.status_name === filters.status;

      const capturedDate = r.captured_at.slice(0, 10); // "YYYY-MM-DD"
      const matchesFrom = !filters.dateFrom || capturedDate >= filters.dateFrom;
      const matchesTo = !filters.dateTo || capturedDate <= filters.dateTo;

      return (
        matchesSearch && matchesBarangay && matchesStatus && matchesFrom && matchesTo
      );
    });
  }, [readings, filters]);

  const stats: TelemetryStats = useMemo(() => {
    const withTemp = filteredReadings.filter((r) => r.temperature_c !== null);
    const withHumidity = filteredReadings.filter(
      (r) => r.humidity_percent !== null,
    );

    return {
      totalReadings: filteredReadings.length,
      onlineDevices: deviceCounts.online,
      offlineDevices: deviceCounts.offline,
      avgTemperature: withTemp.length
        ? withTemp.reduce((sum, r) => sum + (r.temperature_c ?? 0), 0) /
          withTemp.length
        : null,
      avgHumidity: withHumidity.length
        ? withHumidity.reduce((sum, r) => sum + (r.humidity_percent ?? 0), 0) /
          withHumidity.length
        : null,
    };
  }, [filteredReadings, deviceCounts]);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-4xl font-bold">Raw Telemetry Hub</h1>
        <p className="mt-2 text-slate-600">
          Live feed of incoming ovitrap sensor readings.
        </p>
      </div>

      <TelemetryStatistics stats={stats} />

      <TelemetryFilters
        filters={filters}
        onFiltersChange={setFilters}
        barangayOptions={barangayOptions}
        statusOptions={statusOptions}
      />

      <TelemetryTable readings={filteredReadings} isLoading={isLoading} />
    </div>
  );
}