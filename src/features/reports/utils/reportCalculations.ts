import type {
  RawTelemetryRow,
  TelemetryTrendPoint,
} from "../types/reports.types";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeAvgTemperature(readings: RawTelemetryRow[]): number | null {
  return average(
    readings
      .map((r) => r.temperature_c)
      .filter((v): v is number => v !== null),
  );
}

export function computeAvgHumidity(readings: RawTelemetryRow[]): number | null {
  return average(
    readings
      .map((r) => r.humidity_percent)
      .filter((v): v is number => v !== null),
  );
}

/** Groups readings by captured date and averages each metric per day. */
export function computeTelemetryTrend(
  readings: RawTelemetryRow[],
): TelemetryTrendPoint[] {
  const byDate = new Map<string, RawTelemetryRow[]>();

  for (const reading of readings) {
    const date = reading.captured_at.slice(0, 10); // "YYYY-MM-DD"
    const bucket = byDate.get(date);
    if (bucket) {
      bucket.push(reading);
    } else {
      byDate.set(date, [reading]);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({
      date,
      avgTemperature: computeAvgTemperature(rows),
      avgHumidity: computeAvgHumidity(rows),
      avgEggCount: average(
        rows.map((r) => r.egg_count).filter((v): v is number => v !== null),
      ),
    }));
}