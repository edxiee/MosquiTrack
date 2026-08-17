import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import type { TelemetryReading } from "@/types/telemetry.types";

interface TelemetryTableProps {
  readings: TelemetryReading[];
  isLoading: boolean;
}

function StatusBadge({ status }: { status: string | null }) {
  const isOk = status === "Active";
  return (
    <Badge
      className={`border-none shadow-none font-medium ${
        isOk
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${
          isOk ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {status ?? "Unknown"}
    </Badge>
  );
}

export default function TelemetryTable({
  readings,
  isLoading,
}: TelemetryTableProps) {
  const [selectedPayload, setSelectedPayload] = useState<TelemetryReading | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500 font-medium">
          Loading telemetry stream...
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
                <TableHead className="font-semibold text-slate-500">Egg Count</TableHead>
                <TableHead className="font-semibold text-slate-500">Temp (°C)</TableHead>
                <TableHead className="font-semibold text-slate-500">Humidity (%)</TableHead>
                <TableHead className="font-semibold text-slate-500">Battery (%)</TableHead>
                <TableHead className="font-semibold text-slate-500">AI Confidence</TableHead>
                <TableHead className="font-semibold text-slate-500">Device Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-16 text-center text-slate-500"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-semibold text-slate-700 text-lg">No telemetry packets have been received yet.</p>
                      <p className="text-sm">Power on a deployed Smart Ovi Trap and ensure telemetry ingestion is active to transmit readings to Cloud Firestore / Supabase.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                readings.map((reading) => (
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
                    <TableCell className="text-slate-600">{reading.barangay_name ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{reading.egg_count ?? "0"}</TableCell>
                    <TableCell className="text-slate-600">
                      {reading.temperature_c != null ? `${reading.temperature_c}°C` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reading.humidity_percent != null ? `${reading.humidity_percent}%` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {reading.battery_level != null ? `${reading.battery_level}%` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {reading.ai_confidence != null ? `${(reading.ai_confidence * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={reading.status_name} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
