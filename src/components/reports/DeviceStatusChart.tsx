import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DeviceStatusSummaryEntry } from "@/types/reports.types";

interface DeviceStatusChartProps {
  data: DeviceStatusSummaryEntry[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Offline: "#ef4444",
  Maintenance: "#eab308",
};

export default function DeviceStatusChart({
  data,
  isLoading,
}: DeviceStatusChartProps) {
  const chartData = data.map((d) => ({ name: d.statusName, value: d.count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Status</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading device status...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No devices found.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
