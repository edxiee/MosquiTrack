import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import type { SummaryStats } from "@/types/reports.types";

interface SummaryCardsProps {
  stats: SummaryStats;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Readings",
      value: stats.totalReadings,
      icon: Activity,
      color: "text-muted-foreground",
    },
    {
      label: "Active Devices",
      value: stats.activeDevices,
      icon: Wifi,
      color: "text-green-600",
    },
    {
      label: "Offline Devices",
      value: stats.offlineDevices,
      icon: WifiOff,
      color: "text-red-600",
    },
    {
      label: "Avg Temperature",
      value:
        stats.avgTemperature !== null
          ? `${stats.avgTemperature.toFixed(1)}°C`
          : "—",
      icon: Thermometer,
      color: "text-orange-500",
    },
    {
      label: "Avg Humidity",
      value:
        stats.avgHumidity !== null ? `${stats.avgHumidity.toFixed(1)}%` : "—",
      icon: Droplets,
      color: "text-blue-500",
    },
    {
      label: "High Risk Barangays",
      value: stats.highRiskBarangays,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <h2 className={`mt-2 text-2xl font-bold ${color}`}>{value}</h2>
            </div>
            <Icon className={`h-8 w-8 ${color}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
