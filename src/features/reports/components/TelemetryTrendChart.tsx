import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TelemetryTrendPoint } from "../types/reports.types";

interface TelemetryTrendChartProps {
  data: TelemetryTrendPoint[];
  isLoading: boolean;
}

export default function TelemetryTrendChart({
  data,
  isLoading,
}: TelemetryTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading trend...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No data for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" label={{ value: "°C / %", angle: -90, position: "insideLeft" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: "Avg Egg Count", angle: 90, position: "insideRight" }}
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="right"
                dataKey="avgEggCount"
                name="Avg Egg Count"
                fill="#94a3b8"
                barSize={16}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgTemperature"
                name="Avg Temperature (°C)"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgHumidity"
                name="Avg Humidity (%)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}