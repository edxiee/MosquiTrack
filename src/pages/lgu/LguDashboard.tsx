import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bug,
  ChevronDown,
  Clock,
  Droplets,
  FileText,
  Loader2,
  MapPin,
  MapPinned,
  Moon,
  Sun,
  Thermometer,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { type AlertTier } from "@/hooks/useLguDashboardData";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fetchDevices } from "@/services/device.service";
import { getTrapWeather } from "@/services/weather.service";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getConsecutiveCriticalDays,
  getDangerTier,
  type DangerTier,
} from "@/utils/dangerTiers";
import { formatTelemetryTimestamp, getLocalDateKey } from "@/utils/dateHelpers";
import { getDeviceStatusName } from "@/utils/deviceHelpers";
import { ROUTES } from "@/utils/navigation";

const TRAP_DANGER_CONFIG: Record<
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

const TIER_STYLES: Record<
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

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;

  const parts = email.split("@");
  const localPart = parts[0];
  const domain = parts[1];

  if (!localPart || !domain) return email;

  if (localPart.length <= 3) {
    return `${localPart}@${domain}`;
  }

  const firstThree = localPart.slice(0, 3);
  const remainingLength = localPart.length - 3;
  const maskedStars = "*".repeat(remainingLength);

  return `${firstThree}${maskedStars}@${domain}`;
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface ReadingRow {
  device_id: string;
  mosquito_count: number | null;
  temperature_c?: number | null;
  humidity_percent?: number | null;
  captured_at: string;
  created_at?: string;
}

interface MosquitoSurgePrediction {
  possibilityPct: number;
  level: "Very High" | "High" | "Moderate" | "Low";
  headline: string;
  summary: string;
  recommendation: string;
  tempScore: number;
  tempCondition: string;
  humidityScore: number;
  humidityCondition: string;
  isNight: boolean;
  periodLabel: "Nighttime" | "Daytime";
  timeScore: number;
  timeCondition: string;
  formattedTime: string;
  badgeClass: string;
  barClass: string;
  accentClass: string;
}

/**
 * Entomological microclimate & circadian algorithm that evaluates the probability of
 * elevated mosquito flight, host-seeking, and breeding activity based on ambient
 * temperature (°C), relative humidity (%), and the latest time of upload (Day vs Night).
 *
 * Reference thresholds:
 * - Optimal Temperature: 26°C – 31°C (peak ~28.5°C); drops sharply <18°C or >36°C
 * - Optimal Relative Humidity: 65% – 88% (peak ~78%); desiccation stress <45%
 * - Circadian Activity (Time of Upload):
 *   - Night / Dusk / Dawn (6:00 PM – 5:59 AM): Higher mosquito activity
 *   - Daytime (6:00 AM – 5:59 PM): Less mosquito activity due to sunlight and heat
 */
function computeMosquitoSurgePossibility(
  temperatureC: number | null,
  humidityPercent: number | null,
  latestUploadAt: string | null
): MosquitoSurgePrediction | null {
  if (temperatureC === null && humidityPercent === null) {
    return null;
  }

  const temp = temperatureC ?? 28.0;
  const hum = humidityPercent ?? 75.0;

  // Determine hour from latest upload timestamp (or fallback to current local time)
  const parsedUpload = latestUploadAt ? new Date(latestUploadAt) : new Date();
  const validUploadDate = Number.isNaN(parsedUpload.getTime())
    ? new Date()
    : parsedUpload;
  const uploadHour = validUploadDate.getHours();
  const formattedTime = validUploadDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // Night is 6:00 PM (18) to 5:59 AM (5); Daytime is 6:00 AM (6) to 5:59 PM (17)
  const isNight = uploadHour >= 18 || uploadHour < 6;
  const periodLabel: "Nighttime" | "Daytime" = isNight ? "Nighttime" : "Daytime";

  // 1. Time of Upload Suitability Score (0 - 100) — Daytime has fewer mosquitoes
  let timeScore = 50;
  let timeCondition = "Daytime (Reduced Activity)";

  if (uploadHour >= 18 && uploadHour <= 22) {
    timeScore = 96;
    timeCondition = "Night / Dusk Peak (High Activity)";
  } else if (uploadHour >= 23 || uploadHour < 4) {
    timeScore = 88;
    timeCondition = "Nighttime Active Hours";
  } else if (uploadHour >= 4 && uploadHour < 6) {
    timeScore = 94;
    timeCondition = "Dawn Peak (High Activity)";
  } else if (uploadHour >= 6 && uploadHour < 9) {
    timeScore = 52;
    timeCondition = "Morning (Daytime — Less Mosquitoes)";
  } else if (uploadHour >= 9 && uploadHour < 16) {
    timeScore = 26;
    timeCondition = "Midday Sun (Daytime — Less Mosquitoes)";
  } else {
    timeScore = 48;
    timeCondition = "Late Afternoon (Daytime — Less Mosquitoes)";
  }

  // 2. Temperature Suitability Score (0 - 100)
  let tempScore = 50;
  let tempCondition = "Moderate";

  if (temp >= 26 && temp <= 31.5) {
    const distFromPeak = Math.abs(temp - 28.5);
    tempScore = Math.round(100 - distFromPeak * 4);
    tempCondition = "Optimal (26–31.5°C)";
  } else if (temp >= 23 && temp < 26) {
    tempScore = Math.round(68 + ((temp - 23) / 3) * 20);
    tempCondition = "Favorable Warm (23–25.9°C)";
  } else if (temp > 31.5 && temp <= 35) {
    tempScore = Math.round(88 - ((temp - 31.5) / 3.5) * 28);
    tempCondition = "Warm / Hot (31.6–35°C)";
  } else if (temp >= 18 && temp < 23) {
    tempScore = Math.round(30 + ((temp - 18) / 5) * 35);
    tempCondition = "Cool (18–22.9°C)";
  } else if (temp > 35 && temp <= 38) {
    tempScore = Math.round(55 - ((temp - 35) / 3) * 30);
    tempCondition = "High Heat Stress (>35°C)";
  } else {
    tempScore = 15;
    tempCondition = temp < 18 ? "Too Cold (<18°C)" : "Extreme Heat (>38°C)";
  }

  // 3. Relative Humidity Suitability Score (0 - 100)
  let humidityScore = 50;
  let humidityCondition = "Moderate";

  if (hum >= 65 && hum <= 88) {
    const distFromPeak = Math.abs(hum - 78);
    humidityScore = Math.round(100 - distFromPeak * 0.9);
    humidityCondition = "Optimal Humid (65–88%)";
  } else if (hum >= 52 && hum < 65) {
    humidityScore = Math.round(60 + ((hum - 52) / 13) * 26);
    humidityCondition = "Favorable (52–64%)";
  } else if (hum > 88 && hum <= 100) {
    humidityScore = Math.round(88 - ((hum - 88) / 12) * 18);
    humidityCondition = "Very Humid / Saturated (>88%)";
  } else if (hum >= 38 && hum < 52) {
    humidityScore = Math.round(28 + ((hum - 38) / 14) * 30);
    humidityCondition = "Dry (38–51%)";
  } else {
    humidityScore = 15;
    humidityCondition = "Too Dry (<38%)";
  }

  tempScore = Math.max(5, Math.min(100, tempScore));
  humidityScore = Math.max(5, Math.min(100, humidityScore));

  // 4. Weighted Combination (Temp 40%, Humidity 35%, Time of Upload 25%) + Day/Night Adjustment
  let combined = tempScore * 0.4 + humidityScore * 0.35 + timeScore * 0.25;

  if (isNight) {
    // Nighttime synergy when warm and humid
    if (tempScore >= 75 && humidityScore >= 75) {
      combined += 6;
    }
  } else {
    // Daytime reduction: during daytime there are significantly fewer active mosquitoes
    combined *= uploadHour >= 9 && uploadHour < 16 ? 0.68 : 0.78;
  }

  // Limiting factor penalty if either climate parameter is severely unfavorable
  if (tempScore < 30 || humidityScore < 30) {
    combined *= 0.75;
  }

  const possibilityPct = Math.max(5, Math.min(98, Math.round(combined)));
  const timeContextText = isNight
    ? `latest upload was at Night (${formattedTime}), when mosquitoes are most active`
    : `latest upload was during the Day (${formattedTime}), when mosquitoes shelter from sunlight and fewer mosquitoes are active`;

  if (possibilityPct >= 80) {
    return {
      possibilityPct,
      level: "Very High",
      headline: "High Possibility of Many Mosquitoes Today",
      summary: `Current conditions (${temp.toFixed(1)}°C, ${hum.toFixed(0)}% RH) combined with ${timeContextText}, creating peak conditions for mosquito flight and host-seeking.`,
      recommendation:
        "Expect peak vector density—prioritize larviciding, misting readiness, and stagnant water inspection around this trap.",
      tempScore,
      tempCondition,
      humidityScore,
      humidityCondition,
      isNight,
      periodLabel,
      timeScore,
      timeCondition,
      formattedTime,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      barClass: "bg-rose-500",
      accentClass: "text-rose-600",
    };
  }

  if (possibilityPct >= 65) {
    return {
      possibilityPct,
      level: "High",
      headline: "Elevated Possibility of Mosquito Activity Today",
      summary: `With ${temp.toFixed(1)}°C and ${hum.toFixed(0)}% humidity, and because the ${timeContextText}, environmental conditions support elevated mosquito activity.`,
      recommendation:
        "Monitor trap counts closely during evening and dawn peak biting hours.",
      tempScore,
      tempCondition,
      humidityScore,
      humidityCondition,
      isNight,
      periodLabel,
      timeScore,
      timeCondition,
      formattedTime,
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      barClass: "bg-orange-500",
      accentClass: "text-orange-600",
    };
  }

  if (possibilityPct >= 45) {
    return {
      possibilityPct,
      level: "Moderate",
      headline: "Moderate Possibility of Mosquito Activity Today",
      summary: `Temperature (${temp.toFixed(1)}°C) and humidity (${hum.toFixed(0)}% RH) are favorable, but the ${timeContextText}, moderating current active counts.`,
      recommendation:
        "Expect activity to rise after sunset as daytime heat subsides into evening.",
      tempScore,
      tempCondition,
      humidityScore,
      humidityCondition,
      isNight,
      periodLabel,
      timeScore,
      timeCondition,
      formattedTime,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      barClass: "bg-amber-500",
      accentClass: "text-amber-600",
    };
  }

  return {
    possibilityPct,
    level: "Low",
    headline: "Low Possibility of Many Mosquitoes Right Now",
    summary: `With ${temp.toFixed(1)}°C and ${hum.toFixed(0)}% RH, and because the ${timeContextText}, active mosquito presence is currently low.`,
    recommendation:
      "Fewer mosquitoes are active during daytime hours; continue standard routine surveillance.",
    tempScore,
    tempCondition,
    humidityScore,
    humidityCondition,
    isNight,
    periodLabel,
    timeScore,
    timeCondition,
    formattedTime,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    barClass: "bg-emerald-500",
    accentClass: "text-emerald-600",
  };
}

function TrapExpandedAnalytics({
  device,
  readings,
  isLoading,
}: {
  device: OvitrapDevice;
  readings: ReadingRow[];
  isLoading: boolean;
}) {
  const [fallbackWeather, setFallbackWeather] = useState<{
    temperature: number;
    humidity: number;
  } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Find latest telemetry reading with temperature / humidity / timestamp for this trap
  const latestClimateReading = useMemo(() => {
    const deviceReadings = readings.filter((r) => r.device_id === device.id);
    const latestAny = deviceReadings[0];
    const withTemp = deviceReadings.find((r) => r.temperature_c != null);
    const withHum = deviceReadings.find((r) => r.humidity_percent != null);
    return {
      temperature:
        withTemp?.temperature_c != null ? Number(withTemp.temperature_c) : null,
      humidity:
        withHum?.humidity_percent != null
          ? Number(withHum.humidity_percent)
          : null,
      capturedAt:
        latestAny?.captured_at ||
        latestAny?.created_at ||
        withTemp?.captured_at ||
        withHum?.captured_at ||
        device.last_seen_at ||
        null,
    };
  }, [device.id, device.last_seen_at, readings]);

  // Fetch location weather if trap telemetry doesn't have temperature or humidity
  useEffect(() => {
    let cancelled = false;
    if (
      latestClimateReading.temperature !== null &&
      latestClimateReading.humidity !== null
    ) {
      return;
    }

    const lat =
      device.latitude != null && Number(device.latitude) !== 0
        ? Number(device.latitude)
        : 14.561;
    const lng =
      device.longitude != null && Number(device.longitude) !== 0
        ? Number(device.longitude)
        : 121.118;

    setIsWeatherLoading(true);
    getTrapWeather(lat, lng)
      .then((weather) => {
        if (!cancelled && weather) {
          setFallbackWeather(weather);
        }
      })
      .finally(() => {
        if (!cancelled) setIsWeatherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    device.id,
    device.latitude,
    device.longitude,
    latestClimateReading.temperature,
    latestClimateReading.humidity,
  ]);

  const effectiveTemp =
    latestClimateReading.temperature ?? fallbackWeather?.temperature ?? null;
  const effectiveHumidity =
    latestClimateReading.humidity ?? fallbackWeather?.humidity ?? null;
  const isFromSensor =
    latestClimateReading.temperature !== null ||
    latestClimateReading.humidity !== null;

  const surgePrediction = useMemo(
    () =>
      computeMosquitoSurgePossibility(
        effectiveTemp,
        effectiveHumidity,
        latestClimateReading.capturedAt
      ),
    [effectiveTemp, effectiveHumidity, latestClimateReading.capturedAt]
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

  const locationName =
    [device.barangays?.barangay_name, device.barangays?.municipality]
      .filter(Boolean)
      .join(", ") || "Trap Location";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Minimalist: Today's Mosquito Activity Possibility */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          {isLoading || (isWeatherLoading && !surgePrediction) ? (
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ) : !surgePrediction ? (
            <p className="text-sm text-slate-500">
              Waiting for temperature and humidity data for {device.device_code}…
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Today's Mosquito Activity Possibility ({device.device_code})
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {locationName} · {isFromSensor ? "Trap sensor" : "Live weather"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${surgePrediction.badgeClass}`}
                >
                  <span className={`size-1.5 rounded-full ${surgePrediction.barClass}`} />
                  {surgePrediction.level}
                </span>
              </div>

              <div>
                <p
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${surgePrediction.accentClass}`}
                >
                  {surgePrediction.level} Possibility
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {surgePrediction.headline}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-sm">
                <div>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Thermometer className="size-3" /> Temp
                  </p>
                  <p className="font-semibold tabular-nums text-slate-900">
                    {effectiveTemp !== null ? `${effectiveTemp.toFixed(1)}°C` : "—"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Droplets className="size-3" /> Humidity
                  </p>
                  <p className="font-semibold tabular-nums text-slate-900">
                    {effectiveHumidity !== null
                      ? `${effectiveHumidity.toFixed(0)}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    {surgePrediction.isNight ? (
                      <Moon className="size-3" />
                    ) : (
                      <Sun className="size-3" />
                    )}
                    Upload
                  </p>
                  <p className="font-semibold text-slate-900">
                    {surgePrediction.formattedTime}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      {surgePrediction.isNight ? "Night" : "Day"}
                    </span>
                  </p>
                </div>
              </div>
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
                      id={`lguTrendFill-${device.id}`}
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
                    fill={`url(#lguTrendFill-${device.id})`}
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

export default function LguDashboard() {
  const { profile, user } = useAuth();

  const userEmail = profile?.email ?? user?.email ?? "";
  const maskedUserEmail = maskEmail(userEmail);

  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const devicesList = await fetchDevices();
      setDevices(devicesList);

      const deviceIds = devicesList.map((d) => d.id);
      if (deviceIds.length > 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: readingsData } = await supabase
          .from("ovitrap_readings")
          .select(
            "device_id, mosquito_count, temperature_c, humidity_percent, captured_at, created_at"
          )
          .in("device_id", deviceIds)
          .gte("captured_at", sevenDaysAgo.toISOString())
          .order("captured_at", { ascending: false })
          .limit(5000);

        setReadings((readingsData as ReadingRow[]) ?? []);
      } else {
        setReadings([]);
      }
    } catch (err) {
      console.error("Failed to load LGU dashboard traps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const channel = supabase
      .channel("lgu_dashboard_traps_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTrap = (id: string) => {
    setSelectedTrapId((prev) => (prev === id ? null : id));
  };

  const selectedTrap = useMemo(
    () => devices.find((d) => d.id === selectedTrapId) ?? null,
    [devices, selectedTrapId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            LGU Health Administrator
          </p>
          <h1 className="mt-1 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent lg:text-4xl">
            Mosquito Surveillance Overview
          </h1>
          <p className="mt-1 text-slate-600">
            {profile ? `Welcome back, ${profile.first_name}. ` : ""}
            Track mosquito activity and get early warning on high-alert barangays.
          </p>
        </div>

        {/* Upper right: masked email + action buttons */}
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {userEmail && (
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-base font-medium text-slate-700 shadow-sm">
              <User className="size-4 text-slate-500" />
              <span>{maskedUserEmail}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700"
            >
              <Link to={ROUTES.lgu.trapMap}>
                <MapPinned className="mr-1 size-4" />
                Trap map
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-full px-4"
            >
              <Link to={ROUTES.lgu.reports}>
                <FileText className="mr-1 size-4" />
                Generate report
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Traps Rectangle Containers (Side-by-Side Columns) */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Loading traps data…</span>
          </div>
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          No monitored traps found.
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {devices.map((device) => {
            const isSelected = selectedTrapId === device.id;
            const todayCount = device.today_mosquito_count ?? 0;
            const dangerTier = getDangerTier(
              todayCount,
              device.consecutive_critical_days ?? 0
            );
            const dangerConfig = TRAP_DANGER_CONFIG[dangerTier];
            const statusName = getDeviceStatusName(device);
            const isOnline = statusName === "Online";
            const barangayLabel = [
              device.barangays?.barangay_name,
              device.barangays?.municipality,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <Card
                key={device.id}
                onClick={() => toggleTrap(device.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                )}
              >
                <CardContent className="flex h-full flex-col justify-between p-5">
                  <div className="space-y-3">
                    {/* Top Row: Trap Code & Danger Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Monitored Trap
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-lg font-bold tracking-tight text-slate-900">
                            {device.device_code}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${dangerConfig.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dangerConfig.dot}`}
                        />
                        {dangerConfig.label}
                      </span>
                    </div>

                    {/* Location & Description */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <MapPin className="size-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">
                          {barangayLabel || "Unassigned Barangay"}
                        </span>
                      </div>
                      {(device.description || device.notes) && (
                        <p className="truncate pl-5 text-slate-500">
                          {device.description || device.notes}
                        </p>
                      )}
                    </div>

                    {/* Data Metrics Box */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-2.5">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <Bug className="size-3 text-emerald-600" />
                          Today's Count
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums leading-tight text-slate-900">
                          {todayCount}
                          <span className="ml-1 text-[11px] font-normal text-slate-400">
                            mosq
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              isOnline
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-slate-400"
                            )}
                          />
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {statusName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 truncate">
                      <Clock className="size-3 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {device.last_seen_at
                          ? formatTelemetryTimestamp(device.last_seen_at)
                          : "No readings yet"}
                      </span>
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold transition-colors",
                        isSelected ? "text-emerald-700" : "text-slate-500"
                      )}
                    >
                      <span>{isSelected ? "Hide" : "View"}</span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-200",
                          isSelected && "rotate-180"
                        )}
                      />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Selected Trap Analytics: Mosquito Activity Graph & Risk Level Distribution */}
      {selectedTrap && (
        <TrapExpandedAnalytics
          device={selectedTrap}
          readings={readings}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
