import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bug,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MapPinned,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fetchDevices } from "@/services/device.service";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getDangerTier,
} from "@/utils/dangerTiers";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import { getDeviceStatusName } from "@/utils/deviceHelpers";
import { ROUTES } from "@/utils/navigation";
import {
  TrapExpandedAnalytics,
  TRAP_DANGER_CONFIG,
  type ReadingRow,
} from "@/components/common/TrapExpandedAnalytics";

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
