import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapPin, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapErrorBoundary } from "@/components/system/MapErrorBoundary";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type AlertTier } from "@/hooks/useLguDashboardData";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getConsecutiveCriticalDays,
  getDangerTier,
  type DangerTier,
} from "@/utils/dangerTiers";
import { getLocalDateKey } from "@/utils/dateHelpers";
import {
  isTrapInStorage,
  isTrapDeployed,
  getTrapDisplayStatus,
} from "@/utils/deviceHelpers";

export const TRAP_DANGER_CONFIG: Record<
  DangerTier,
  { label: string; badge: string; dot: string }
> = {
  Low: {
    label: "Low Risk (0-5)",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Moderate: {
    label: "Moderate (6-15)",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-200 border-yellow-200",
    dot: "bg-yellow-500",
  },
  High: {
    label: "High (16-29)",
    badge: "bg-orange-50 text-orange-700 ring-orange-200 border-orange-200",
    dot: "bg-orange-500",
  },
  Critical: {
    label: "Critical (30+, 3 days)",
    badge: "bg-rose-50 text-rose-700 ring-rose-200 border-rose-200",
    dot: "bg-rose-500 animate-pulse",
  },
};

export const TIER_STYLES: Record<
  AlertTier,
  { label: string; badge: string; dot: string; bar: string }
> = {
  green: {
    label: "Low (0-5)",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  yellow: {
    label: "Moderate (6-15)",
    badge: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    dot: "bg-yellow-400",
    bar: "bg-yellow-400",
  },
  orange: {
    label: "High (16-29)",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },
  red: {
    label: "Critical (3 Consecutive Days, 30+)",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500 animate-pulse",
    bar: "bg-rose-500",
  },
};

export function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface ReadingRow {
  device_id: string;
  mosquito_count: number | null;
  temperature_c?: number | null;
  humidity_percent?: number | null;
  captured_at: string;
  created_at?: string;
}

function createTrapMarkerIcon(isOnline: boolean) {
  const pinColor = isOnline ? "#059669" : "#64748b";
  const pingHtml = isOnline
    ? `<div class="absolute inset-0 bg-emerald-500 rounded-full opacity-40 animate-ping"></div>`
    : "";

  return L.divIcon({
    className: "custom-trap-pin",
    html: `
      <div class="flex items-center justify-center -translate-y-4">
        <div class="relative w-10 h-10 flex items-center justify-center">
          ${pingHtml}
          <div class="absolute inset-1 rounded-full shadow-md border-2 border-white bg-white flex items-center justify-center">
            <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background-color: ${pinColor}20;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${pinColor}" class="w-4 h-4">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export function TrapExpandedAnalytics({
  device,
  readings,
  isLoading,
}: {
  device: OvitrapDevice;
  readings: ReadingRow[];
  isLoading: boolean;
}) {
  const isInStorage = isTrapInStorage(device) || !isTrapDeployed(device);
  const statusName = getTrapDisplayStatus(device);
  const isOnline = statusName === "Online";

  const rawLat = device.latitude != null ? Number(device.latitude) : null;
  const rawLng = device.longitude != null ? Number(device.longitude) : null;
  const hasValidLocation =
    rawLat !== null &&
    rawLng !== null &&
    !Number.isNaN(rawLat) &&
    !Number.isNaN(rawLng) &&
    rawLat !== 0 &&
    rawLng !== 0;

  const lat = rawLat ?? 0;
  const lng = rawLng ?? 0;

  const locationName =
    [device.barangays?.barangay_name, device.barangays?.municipality]
      .filter(Boolean)
      .join(", ") || "Trap Location";

  const markerIcon = useMemo(
    () => createTrapMarkerIcon(isOnline),
    [isOnline]
  );

  const { dailyTrend, tierCounts, totalTiered } = useMemo(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const days: string[] = [];
    const buckets = new Map<string, { total: number; readings: number }>();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const dateKey = getLocalDateKey(d);
      days.push(dateKey);
      buckets.set(dateKey, { total: 0, readings: 0 });
    }

    const deviceReadings = readings.filter((r) => r.device_id === device.id);
    for (const r of deviceReadings) {
      const tsStr = r.captured_at || r.created_at;
      if (!tsStr) continue;
      const parsed = new Date(tsStr);
      if (Number.isNaN(parsed.getTime())) continue;
      const dateKey = getLocalDateKey(parsed);
      const bucket = buckets.get(dateKey);
      if (bucket) {
        bucket.total += r.mosquito_count ?? 0;
        bucket.readings += 1;
      }
    }

    const trend = days.map((date) => {
      const b = buckets.get(date) ?? { total: 0, readings: 0 };
      return {
        date,
        total: b.total,
        readings: b.readings,
      };
    });

    const counts: Record<AlertTier, number> = {
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
    };

    for (let idx = 0; idx < trend.length; idx++) {
      const dayItem = trend[idx]!;
      const prev1 = idx >= 1 ? trend[idx - 1]!.total : 0;
      const prev2 = idx >= 2 ? trend[idx - 2]!.total : 0;
      const consecutiveCrit = getConsecutiveCriticalDays([
        dayItem.total,
        prev1,
        prev2,
      ]);
      const danger = getDangerTier(dayItem.total, consecutiveCrit);
      const tier: AlertTier =
        danger === "Critical"
          ? "red"
          : danger === "High"
            ? "orange"
            : danger === "Moderate"
              ? "yellow"
              : "green";
      counts[tier] += 1;
    }

    const total = counts.green + counts.yellow + counts.orange + counts.red;

    return {
      dailyTrend: trend,
      tierCounts: counts,
      totalTiered: total,
    };
  }, [device.id, readings]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Trap Location Map Card */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-950">
                <MapPin className="size-4 text-emerald-600" />
                Trap Location Map ({device.device_code})
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {locationName}
                {hasValidLocation
                  ? ` · GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
                  : " · No GPS coordinates assigned"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  isOnline
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }
              >
                <span
                  className={`mr-1.5 size-1.5 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                {statusName}
              </Badge>
              {hasValidLocation && !isInStorage && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Navigation className="size-3 text-slate-500" />
                  <span>Google Maps</span>
                </a>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {isInStorage ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                <MapPin className="size-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Trap in Storage
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {device.device_code} is currently in storage and is not deployed on the map.
              </p>
            </div>
          ) : !hasValidLocation ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                <MapPin className="size-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                No GPS Coordinates Assigned
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {device.device_code} does not have valid latitude and longitude coordinates registered. You can set its location in Trap Management.
              </p>
            </div>
          ) : (
            <div className="h-72 sm:h-80 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
              <MapErrorBoundary>
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapRecenter lat={lat} lng={lng} />
                  <Marker position={[lat, lng]} icon={markerIcon}>
                    <Popup className="custom-trap-popup">
                      <div className="p-1 space-y-1 text-xs">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {device.device_code}
                        </div>
                        <p className="text-slate-600 font-medium">{locationName}</p>
                        <p className="text-slate-500 text-[11px]">
                          GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                          <span
                            className={`inline-block size-1.5 rounded-full ${
                              isOnline ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span className="font-semibold text-slate-700">
                            {statusName}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </MapErrorBoundary>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>
              Mosquito activity, last 7 days ({device.device_code})
            </CardTitle>
            <CardDescription>
              Daily mosquito count for {device.device_code}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : dailyTrend.every((d) => d.readings === 0) ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No trap readings in the last 7 days for {device.device_code}.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyTrend}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={`trapTrendFill-${device.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(v) => formatShortDate(String(v))}
                      formatter={(value) => [String(value), "Total count"]}
                      contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill={`url(#trapTrendFill-${device.id})`}
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Risk level distribution</CardTitle>
            <CardDescription>
              7-day risk level distribution for {device.device_code} based on daily
              mosquito counts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {(["red", "orange", "yellow", "green"] as const).map((tier) => {
              const count = tierCounts[tier];
              const pct = totalTiered > 0 ? (count / totalTiered) * 100 : 0;
              const s = TIER_STYLES[tier];
              return (
                <div key={tier}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {isLoading ? "…" : `${count} ${count === 1 ? "day" : "days"}`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
