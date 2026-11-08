import { useCallback, useEffect, useMemo, useState } from "react";
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
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrapExpandedAnalytics,
  TRAP_DANGER_CONFIG,
  type ReadingRow,
} from "@/components/common/TrapExpandedAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fetchDevicesForCurrentUser } from "@/services/device.service";
import { getAssignedActions } from "@/services/triage.service";
import { getDangerTier } from "@/utils/dangerTiers";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";
import { getDeviceStatusName, isDeviceActive } from "@/utils/deviceHelpers";
import { formatDateTime } from "@/utils/format";
import { ROUTES } from "@/utils/navigation";
import type { OvitrapDevice } from "@/types/device.types";
import type { TriageAction } from "@/types/triage.types";

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

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function BhwDashboard() {
  const { profile, user, loading: authLoading } = useAuth();

  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [actions, setActions] = useState<TriageAction[]>([]);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userEmail = profile?.email || user?.email || "";
  const maskedUserEmail = useMemo(() => maskEmail(userEmail), [userEmail]);

  const toggleTrap = (id: string) => {
    setSelectedTrapId((prev) => (prev === id ? null : id));
  };

  const selectedTrap = useMemo(
    () => devices.find((d) => d.id === selectedTrapId) ?? null,
    [devices, selectedTrapId]
  );

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setErrorMessage(null);
    }

    try {
      const [devicesRes, actionsRes] = await Promise.allSettled([
        fetchDevicesForCurrentUser(),
        getAssignedActions({ visibleInProgressTo: profile?.id }),
      ]);

      if (devicesRes.status === "fulfilled") {
        const fetchedDevices = devicesRes.value;
        setDevices(fetchedDevices);

        const deviceIds = fetchedDevices.map((d) => d.id);
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
      if (actionsRes.status === "fulfilled") {
        setActions(actionsRes.value);
      }

      const firstRejected = [devicesRes, actionsRes].find(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult | undefined;

      if (firstRejected && !silent) {
        console.error("Field ops dashboard load error:", firstRejected.reason);
      }
    } catch (err) {
      if (!silent) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to load field operations data."
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authLoading) return;
    void loadDashboardData(false);

    const channel = supabase
      .channel("field-ops-overview-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_devices" },
        () => void loadDashboardData(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovitrap_readings" },
        () => void loadDashboardData(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_triage_log" },
        () => void loadDashboardData(true)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, loadDashboardData]);

  // 1. Online Traps
  const onlineTraps = useMemo(
    () => devices.filter((d) => isDeviceActive(d)),
    [devices]
  );

  // 2. Pending Action Logs
  const pendingActions = useMemo(
    () => actions.filter((a) => a.status === "Pending"),
    [actions]
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <LayoutDashboard className="size-3 text-emerald-600" />
            Field Operations
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Field Operations Overview
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {profile
              ? `Welcome back, ${profile.first_name}. Monitor active trap nodes and manage pending field action logs.`
              : "Monitor active trap nodes and manage pending field action logs."}
          </p>
        </div>

        {/* Upper right email display */}
        {userEmail && (
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-base font-medium text-slate-700 shadow-sm sm:self-start">
            <User className="size-4 text-slate-500" />
            <span>{maskedUserEmail}</span>
          </div>
        )}
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* ── 2 Main Data Containers: Traps Deployment Status & Pending Action Logs ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* CONTAINER 1: TRAPS DEPLOYMENT STATUS */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Wifi className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    Traps Deployment Status
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Ovitraps deployment and telemetry transmission status
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
              >
                {loading
                  ? "—"
                  : `${onlineTraps.length} of ${devices.length} Online`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-auto max-h-[380px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 text-xs py-3 pl-5">
                    TRAP CODE
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs py-3">
                    LOCATION
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs py-3">
                    STATUS
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs py-3 pr-5 text-right">
                    LAST SEEN
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-sm text-slate-400"
                    >
                      Loading traps deployment status...
                    </TableCell>
                  </TableRow>
                ) : onlineTraps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      No traps are currently online (transmitting within the last 16 minutes).
                    </TableCell>
                  </TableRow>
                ) : (
                  onlineTraps.map((trap) => (
                    <TableRow
                      key={trap.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="py-3.5 pl-5 font-medium text-slate-950">
                        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">
                          {trap.device_code}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-slate-600">
                        {trap.barangays?.barangay_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <MapPin className="size-3 text-slate-400 shrink-0" />
                            {trap.barangays.barangay_name}
                            {trap.barangays.municipality
                              ? `, ${trap.barangays.municipality}`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 pr-5 text-right whitespace-nowrap text-xs text-slate-500">
                        {trap.last_seen_at
                          ? formatDateTime(trap.last_seen_at)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          <div className="border-t border-slate-100 p-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full justify-between rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Link to={ROUTES.fieldOps.trapOverview}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <Wifi className="size-3.5 text-emerald-600" />
                  Open Traps Deployment
                </span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* CONTAINER 2: PENDING ACTION LOGS */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    Pending Action Logs
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Field response action items awaiting execution
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
              >
                {loading ? "—" : `${pendingActions.length} Pending`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 divide-y divide-slate-100 p-0 overflow-auto max-h-[380px]">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading pending action logs...
              </div>
            ) : pendingActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-slate-500">
                <CheckCircle2 className="size-8 text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">
                  No pending action logs
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All assigned field response actions have been addressed or taken.
                </p>
              </div>
            ) : (
              pendingActions.map((item) => {
                const priorityKey = (item.priority || "medium").toLowerCase();
                const priorityBadgeClass =
                  PRIORITY_STYLES[priorityKey] ?? PRIORITY_STYLES.medium;
                const locationText = [item.barangayName, item.municipalityName]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.triggerSource || "Field Action"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${priorityBadgeClass}`}
                        >
                          {item.priority}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Clock className="size-3" />
                          Pending
                        </span>
                      </div>

                      {item.remarks && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {item.remarks}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        {locationText && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3 text-slate-400 shrink-0" />
                            {locationText}
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>
                          Assigned: {formatDateTime(item.assignedDate || item.createdAt)}
                        </span>
                        {item.dueDate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-700">
                              Due: {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>

          <div className="border-t border-slate-100 p-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full justify-between rounded-xl hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800"
            >
              <Link to={ROUTES.fieldOps.actionLogs}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <ClipboardList className="size-3.5 text-amber-600" />
                  Open Action Logs
                </span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Monitored Traps Section ────────────────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
            Monitored Traps
          </h2>
          <p className="text-xs text-slate-500">
            Real-time status and telemetry activity of deployed ovitraps
          </p>
        </div>

        {loading ? (
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
            isLoading={loading}
          />
        )}
      </div>
    </div>
  );
}

export { BhwDashboard };
