import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
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
  getTelemetry,
  subscribeToNewReadings,
} from "../services/telemetry.service";

const DEFAULT_FILTERS: TelemetryFilterValues = {
  search: "",
  barangay: "all",
  uploadStatus: "all",
  dateFrom: "",
  dateTo: "",
};

export default function RawTelemetryHubPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<TelemetryFilterValues>(DEFAULT_FILTERS);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [readingsData, barangays] = await Promise.all([
          getTelemetry(),
          getBarangayOptions(),
        ]);
        if (!isMounted) return;
        setReadings(readingsData);
        setBarangayOptions(barangays);
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
      
      const rStatus = r.upload_status || "Success";
      const matchesStatus =
        filters.uploadStatus === "all" || rStatus === filters.uploadStatus;

      const capturedDate = r.captured_at.slice(0, 10); // "YYYY-MM-DD"
      const matchesFrom = !filters.dateFrom || capturedDate >= filters.dateFrom;
      const matchesTo = !filters.dateTo || capturedDate <= filters.dateTo;

      return (
        matchesSearch && matchesBarangay && matchesStatus && matchesFrom && matchesTo
      );
    });
  }, [readings, filters]);

  const stats: TelemetryStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayReadings = filteredReadings.filter(r => r.captured_at.startsWith(todayStr));
    
    let success = 0;
    let failed = 0;
    
    todayReadings.forEach(r => {
      if (r.upload_status === "Failed") failed++;
      else success++; // Treat Retrying/Success/Null as successful uploads conceptually, or split them out.
    });

    return {
      totalPacketsToday: todayReadings.length,
      successfulUploads: success,
      failedUploads: failed,
      latestPacketTime: filteredReadings[0]?.captured_at || null,
      avgUploadInterval: "15 minutes", // Mocked as requested
    };
  }, [filteredReadings]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Raw Telemetry Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Backend telemetry console for diagnostics and server communication verification.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="bg-white gap-2 h-9 text-sm text-slate-600">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button variant="outline" className="bg-white gap-2 h-9 text-sm text-slate-600">
            <FileJson className="h-4 w-4 text-sky-600" />
            Export JSON
          </Button>
          <Button variant="outline" className="bg-white gap-2 h-9 text-sm text-slate-600">
            <Download className="h-4 w-4 text-slate-400" />
            Download Logs
          </Button>
        </div>
      </div>

      <TelemetryStatistics stats={stats} />

      <TelemetryFilters
        filters={filters}
        onFiltersChange={setFilters}
        barangayOptions={barangayOptions}
      />

      <TelemetryTable readings={filteredReadings} isLoading={isLoading} />
    </div>
  );
}