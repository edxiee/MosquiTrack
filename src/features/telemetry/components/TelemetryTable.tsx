import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TelemetryReading } from "../types/telemetry";

interface TelemetryTableProps {
  readings: TelemetryReading[];
  isLoading: boolean;
}

function DeviceStatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    Active: "bg-green-100 text-green-700",
    Offline: "bg-red-100 text-red-700",
    Maintenance: "bg-yellow-100 text-yellow-700",
  };
  const style = styles[status ?? ""] ?? "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {status ?? "Unknown"}
    </span>
  );
}

export default function TelemetryTable({
  readings,
  isLoading,
}: TelemetryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading telemetry...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Barangay</TableHead>
              <TableHead>Egg Count</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Humidity</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>AI Confidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-muted-foreground"
                >
                  No telemetry readings found.
                </TableCell>
              </TableRow>
            ) : (
              readings.map((reading) => (
                <TableRow key={reading.id}>
                  <TableCell>
                    {new Date(reading.captured_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {reading.device_code}
                  </TableCell>
                  <TableCell>{reading.barangay_name ?? "—"}</TableCell>
                  <TableCell>{reading.egg_count ?? "—"}</TableCell>
                  <TableCell>
                    {reading.temperature_c !== null
                      ? `${reading.temperature_c}°C`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {reading.humidity_percent !== null
                      ? `${reading.humidity_percent}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {reading.battery_level !== null
                      ? `${reading.battery_level}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {reading.ai_confidence !== null
                      ? `${(reading.ai_confidence * 100).toFixed(0)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DeviceStatusBadge status={reading.status_name} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}