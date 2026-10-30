import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import type { TelemetryReading } from "@/types/telemetry.types";

const ITEMS_PER_PAGE = 15;

interface TelemetryTableProps {
  readings: TelemetryReading[];
  isLoading: boolean;
}

export default function TelemetryTable({
  readings,
  isLoading,
}: TelemetryTableProps) {
  const [selectedPayload, setSelectedPayload] = useState<TelemetryReading | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(readings.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReadings = readings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500 font-medium">
          Loading Trap Data stream...
        </CardContent>
      </Card>
    );
  }

  const handleRowClick = (reading: TelemetryReading) => {
    setSelectedPayload(reading);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="font-semibold text-slate-500">Timestamp</TableHead>
                <TableHead className="font-semibold text-slate-500">Trap ID</TableHead>
                <TableHead className="font-semibold text-slate-500">Barangay</TableHead>
                <TableHead className="font-semibold text-slate-500">Mosquito Count</TableHead>
                <TableHead className="font-semibold text-slate-500">Temp (°C)</TableHead>
                <TableHead className="font-semibold text-slate-500">Humidity (%)</TableHead>
                <TableHead className="font-semibold text-slate-500">Battery (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-16 text-center text-slate-500"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-semibold text-slate-700 text-lg">No telemetry packets have been received yet.</p>
                      <p className="text-sm">Power on a deployed Smart Ovi Trap and ensure telemetry ingestion is active to transmit readings to Cloud Firestore / Supabase.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReadings.map((reading) => (
                  <TableRow 
                    key={reading.id} 
                    className="cursor-pointer hover:bg-slate-50 border-slate-50 transition-colors"
                    onClick={() => handleRowClick(reading)}
                  >
                    <TableCell className="text-slate-600 font-medium whitespace-nowrap">
                      {formatTelemetryTimestamp(reading.created_at || reading.captured_at)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      {reading.device_code}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reading.barangay_name ? (
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {reading.barangay_name}
                          </span>
                          {reading.municipality && (
                            <span className="text-xs text-slate-400 block">
                              {reading.municipality}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">{reading.mosquito_count ?? "0"}</TableCell>
                    <TableCell className="text-slate-600">
                      {reading.temperature_c != null ? `${reading.temperature_c}°C` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reading.humidity_percent != null ? `${reading.humidity_percent}%` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reading.battery_level != null ? `${reading.battery_level}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {readings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/40">
              <p className="text-xs font-medium text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(startIndex + ITEMS_PER_PAGE, readings.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {readings.length}
                </span>{" "}
                records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 px-3 text-xs gap-1 bg-white"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>

                <span className="text-xs font-medium text-slate-600 px-2">
                  Page{" "}
                  <span className="font-semibold text-slate-900">
                    {safeCurrentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {totalPages}
                  </span>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="h-8 px-3 text-xs gap-1 bg-white"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayload} onOpenChange={(open) => !open && setSelectedPayload(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Database Record (Raw JSON)</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-900 rounded-md p-4 overflow-x-auto mt-2">
            <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
              {selectedPayload && JSON.stringify(selectedPayload, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
