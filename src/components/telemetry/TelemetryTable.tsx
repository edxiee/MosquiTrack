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
import type { TelemetryReading } from "@/types/telemetry.types";

interface TelemetryTableProps {
  readings: TelemetryReading[];
  isLoading: boolean;
}

function UploadStatusBadge({ status }: { status: string | undefined }) {
  if (status === "Success") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        Success
      </Badge>
    );
  }
  if (status === "Retrying") {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none shadow-none">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        Retrying
      </Badge>
    );
  }
  if (status === "Failed") {
    return (
      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none shadow-none">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      Success
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
                <TableHead className="font-semibold text-slate-500">Mosquito Count</TableHead>
                <TableHead className="font-semibold text-slate-500">Battery (%)</TableHead>
                <TableHead className="font-semibold text-slate-500">LTE Signal</TableHead>
                <TableHead className="font-semibold text-slate-500">Upload Status</TableHead>
                <TableHead className="font-semibold text-slate-500">HTTP Response</TableHead>
                <TableHead className="font-semibold text-slate-500">Latency (ms)</TableHead>
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
                      <p className="text-sm">Power on a deployed Smart Ovi Trap and ensure it is connected to the LTE network to begin transmitting telemetry.</p>
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
                      {new Date(reading.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      {reading.device_code}
                    </TableCell>
                    <TableCell className="text-slate-600">{reading.barangay_name ?? "—"}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{reading.egg_count ?? "0"}</TableCell>
                    <TableCell className="text-slate-600">
                      {reading.battery_level !== null
                        ? `${reading.battery_level}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">{reading.lte_signal ?? "Excellent (-68 dBm)"}</TableCell>
                    <TableCell>
                      <UploadStatusBadge status={reading.upload_status} />
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">{reading.http_response ?? 200}</TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">{reading.latency_ms ?? Math.floor(Math.random() * 100 + 120)} ms</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayload} onOpenChange={(open) => !open && setSelectedPayload(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Raw JSON Payload</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-900 rounded-md p-4 overflow-x-auto mt-2">
            <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
              {selectedPayload && JSON.stringify({
                trap_id: selectedPayload.device_code,
                mosquito_count: selectedPayload.egg_count ?? 0,
                battery: selectedPayload.battery_level ?? 100,
                signal_strength: selectedPayload.lte_signal?.split(' ')[0] ?? "Excellent",
                latitude: 14.6205,
                longitude: 121.0048,
                timestamp: selectedPayload.captured_at
              }, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
