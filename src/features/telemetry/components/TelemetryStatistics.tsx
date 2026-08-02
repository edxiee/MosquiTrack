import { Card, CardContent } from "@/components/ui/card";
import { Activity, Wifi, WifiOff, Thermometer, Droplets } from "lucide-react";
import type { TelemetryStats } from "../types/telemetry";

interface TelemetryStatisticsProps {
  stats: TelemetryStats;
}

export default function TelemetryStatistics({
  stats,
}: TelemetryStatisticsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Readings</p>
            <h2 className="mt-2 text-3xl font-bold">{stats.totalReadings}</h2>
          </div>
          <Activity className="h-8 w-8 text-muted-foreground" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Online Devices</p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {stats.onlineDevices}
            </h2>
          </div>
          <Wifi className="h-8 w-8 text-green-600" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Offline Devices</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.offlineDevices}
            </h2>
          </div>
          <WifiOff className="h-8 w-8 text-red-600" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Avg Temperature</p>
            <h2 className="mt-2 text-3xl font-bold">
              {stats.avgTemperature !== null
                ? `${stats.avgTemperature.toFixed(1)}°C`
                : "—"}
            </h2>
          </div>
          <Thermometer className="h-8 w-8 text-orange-500" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Avg Humidity</p>
            <h2 className="mt-2 text-3xl font-bold">
              {stats.avgHumidity !== null
                ? `${stats.avgHumidity.toFixed(1)}%`
                : "—"}
            </h2>
          </div>
          <Droplets className="h-8 w-8 text-blue-500" />
        </CardContent>
      </Card>
    </div>
  );
}