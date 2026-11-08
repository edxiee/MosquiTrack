import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Loader2,
  MapPin,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fetchDevices } from "@/services/device.service";
import {
  fetchRequestActions,
  type RequestActionRow,
} from "@/services/requestActions.service";
import type { OvitrapDevice } from "@/types/device.types";
import {
  getDangerTier,
} from "@/utils/dangerTiers";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import { getDeviceStatusName } from "@/utils/deviceHelpers";
import { formatDateTime } from "@/utils/format";
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
  const [requestActions, setRequestActions] = useState<RequestActionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);

  const pendingRequests = useMemo(
    () =>
      requestActions.filter(
        (r) =>
          r.status === "Pending" ||
          (!r.status && !r.approved_at && !r.completed_at)
      ),
    [requestActions]
  );

  const loadDashboardData = async () => {
    try {
      const [devicesRes, requestsRes] = await Promise.allSettled([
        fetchDevices(),
        fetchRequestActions(),
      ]);

      if (devicesRes.status === "fulfilled") {
        const devicesList = devicesRes.value;
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
      }

      if (requestsRes.status === "fulfilled") {
        setRequestActions(requestsRes.value);
      }
    } catch (err) {
      console.error("Failed to load LGU dashboard data:", err);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
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
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <LayoutDashboard className="size-3 text-emerald-600" />
            Barangay Administration
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
            Barangay Administration Dashboard
          </h1>
        </div>

        {/* Upper right: masked email */}
        {userEmail && (
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-base font-medium text-slate-700 shadow-sm sm:self-start">
            <User className="size-4 text-slate-500" />
            <span>{maskedUserEmail}</span>
          </div>
        )}
      </section>

      {/* ── Deployment Request Container (Compact) ────────────────────────── */}
      <Card className="border-slate-200 bg-white/95 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-100/80 p-1 text-amber-700">
              <ClipboardList className="size-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Deployment Requests
            </span>
            <Badge
              variant="outline"
              className={cn(
                "px-2 py-0 text-[10px] font-bold",
                pendingRequests.length > 0
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-500"
              )}
            >
              {isLoading ? "—" : `${pendingRequests.length} Pending`}
            </Badge>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
          >
            <Link to={ROUTES.barangay.requestActionsOverview}>
              <span>View All</span>
              <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-4 text-center text-xs text-slate-400">
              <div className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                <span>Loading requests...</span>
              </div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-3 px-4 text-xs text-slate-500">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>No pending deployment requests — all submitted requests are processed.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[160px] overflow-auto">
              {pendingRequests.map((req) => {
                const requesterName =
                  [req.requester_first_name, req.requester_last_name]
                    .filter(Boolean)
                    .join(" ") || "Unknown User";
                const locationText = [
                  req.device_barangay ? `Brgy. ${req.device_barangay}` : null,
                  req.device_municipality,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={req.req_id}
                    className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                        {req.device_code || "NEW TRAP"}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">
                        {req.request}
                      </span>
                      {locationText && (
                        <span className="text-slate-500 truncate">
                          • {locationText}
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">
                        • by {requesterName}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        • {formatDateTime(req.created_at)}
                      </span>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Clock className="size-2.5" />
                      Pending
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Monitored Mosquito Traps Header ── */}
      <div className="pt-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Monitored Mosquito Traps
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Real-time status and activity of deployed ovitraps across your barangay
        </p>
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
