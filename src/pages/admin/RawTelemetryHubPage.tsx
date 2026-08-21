import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import TelemetryStatistics from "@/components/telemetry/TelemetryStatistics";
import TelemetryFilters from "@/components/telemetry/TelemetryFilters";
import TelemetryTable from "@/components/telemetry/TelemetryTable";
import type {
  TelemetryFilterValues,
  TelemetryReading,
  TelemetryStats,
} from "@/types/telemetry.types";
import {
  getBarangayOptions,
  getTelemetry,
  subscribeToNewReadings,
} from "@/services/telemetry.service";

const DEFAULT_FILTERS: TelemetryFilterValues = {
  search: "",
  barangay: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

import { getErrorMessage } from "@/utils/errorHelpers";

export default function RawTelemetryHubPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState<TelemetryFilterValues>(DEFAULT_FILTERS);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
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
        if (!isMounted) return;
        setError(getErrorMessage(err, "Failed to load telemetry from database."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitialData();

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
      
      const rStatus = r.status_name || "Unknown";
      const matchesStatus =
        filters.status === "all" || rStatus === filters.status;

      const capturedDate = r.captured_at.slice(0, 10);
      const matchesFrom = !filters.dateFrom || capturedDate >= filters.dateFrom;
      const matchesTo = !filters.dateTo || capturedDate <= filters.dateTo;

      return (
        matchesSearch && matchesBarangay && matchesStatus && matchesFrom && matchesTo
      );
    });
  }, [readings, filters]);

  const stats: TelemetryStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayReadings = filteredReadings.filter((r) =>
      (r.created_at || r.captured_at).startsWith(todayStr)
    );

    let intervalText = "N/A";
    const gapsMs: number[] = [];

    // 1. Group readings by device_id to calculate real per-device upload intervals
    const readingsByDevice = new Map<string, TelemetryReading[]>();
    for (const r of filteredReadings) {
      const list = readingsByDevice.get(r.device_id) ?? [];
      list.push(r);
      readingsByDevice.set(r.device_id, list);
    }

    readingsByDevice.forEach((deviceReadings) => {
      const sorted = [...deviceReadings].sort(
        (a, b) =>
          new Date(a.created_at || a.captured_at).getTime() -
          new Date(b.created_at || b.captured_at).getTime()
      );

      for (let i = 1; i < sorted.length; i++) {
        const prevItem = sorted[i - 1];
        const currItem = sorted[i];
        if (!prevItem || !currItem) continue;

        const prevTime = new Date(
          prevItem.created_at || prevItem.captured_at
        ).getTime();
        const currTime = new Date(
          currItem.created_at || currItem.captured_at
        ).getTime();

        if (!isNaN(prevTime) && !isNaN(currTime)) {
          const diff = currTime - prevTime;
          if (diff > 0) {
            gapsMs.push(diff);
          }
        }
      }
    });

    // 2. Fallback if devices have single uploads: use dataset-wide upload intervals
    if (gapsMs.length === 0 && filteredReadings.length >= 2) {
      const sortedAll = [...filteredReadings].sort(
        (a, b) =>
          new Date(a.created_at || a.captured_at).getTime() -
          new Date(b.created_at || b.captured_at).getTime()
      );

      for (let i = 1; i < sortedAll.length; i++) {
        const prevItem = sortedAll[i - 1];
        const currItem = sortedAll[i];
        if (!prevItem || !currItem) continue;

        const prevTime = new Date(
          prevItem.created_at || prevItem.captured_at
        ).getTime();
        const currTime = new Date(
          currItem.created_at || currItem.captured_at
        ).getTime();

        if (!isNaN(prevTime) && !isNaN(currTime)) {
          const diff = currTime - prevTime;
          if (diff > 0) {
            gapsMs.push(diff);
          }
        }
      }
    }

    if (gapsMs.length > 0) {
      const avgMs = gapsMs.reduce((sum, gap) => sum + gap, 0) / gapsMs.length;
      const totalSecs = Math.round(avgMs / 1000);

      if (totalSecs < 60) {
        intervalText = `${totalSecs} secs`;
      } else if (totalSecs < 3600) {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        intervalText = secs > 0 ? `${mins}m ${secs}s` : `${mins} mins`;
      } else {
        const hrs = (avgMs / (1000 * 60 * 60)).toFixed(1);
        intervalText = `${hrs} hrs`;
      }
    }

    return {
      totalPacketsToday: todayReadings.length,
      successfulUploads: filteredReadings.length,
      failedUploads: 0,
      latestPacketTime:
        filteredReadings[0]?.created_at ||
        filteredReadings[0]?.captured_at ||
        null,
      avgUploadInterval: intervalText,
    };
  }, [filteredReadings]);

  const handleExportCSV = () => {
    if (filteredReadings.length === 0) return;
    const headers = [
      "ID",
      "Captured At",
      "Created At",
      "Device Code",
      "Device ID",
      "Barangay",
      "Mosquito Count",
      "Temperature (C)",
      "Humidity (%)",
      "Battery (%)",
      "AI Confidence",
      "Latitude",
      "Longitude",
      "Status"
    ];
    const rows = filteredReadings.map(r => [
      r.id,
      r.captured_at,
      r.created_at ?? "",
      r.device_code,
      r.device_id,
      r.barangay_name ?? "",
      r.egg_count ?? 0,
      r.temperature_c ?? "",
      r.humidity_percent ?? "",
      r.battery_level ?? "",
      r.ai_confidence ?? "",
      r.latitude ?? "",
      r.longitude ?? "",
      r.status_name ?? ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `telemetry_raw_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (filteredReadings.length === 0) return;
    const jsonContent = JSON.stringify(filteredReadings, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `telemetry_raw_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadLogs = () => {
    if (filteredReadings.length === 0) return;
    const logLines = filteredReadings.map(
      r => `[${r.captured_at}] [DEVICE:${r.device_code}] [BARANGAY:${r.barangay_name ?? "N/A"}] EGGS:${r.egg_count ?? 0} TEMP:${r.temperature_c ?? "N/A"}C HUM:${r.humidity_percent ?? "N/A"}% BAT:${r.battery_level ?? "N/A"}% CONF:${r.ai_confidence ?? "N/A"}`
    );
    const blob = new Blob([logLines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `telemetry_logs_${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Raw Telemetry Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Backend telemetry console displaying authentic database records from Cloud Firestore / Supabase.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={filteredReadings.length === 0}
            className="bg-white gap-2 h-9 text-sm text-slate-600"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
            disabled={filteredReadings.length === 0}
            className="bg-white gap-2 h-9 text-sm text-slate-600"
          >
            <FileJson className="h-4 w-4 text-sky-600" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadLogs}
            disabled={filteredReadings.length === 0}
            className="bg-white gap-2 h-9 text-sm text-slate-600"
          >
            <Download className="h-4 w-4 text-slate-400" />
            Download Logs
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span className="font-semibold">Database Error:</span> {error}
        </div>
      )}

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
