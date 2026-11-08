import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutDashboard,
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { fetchDevicesForCurrentUser } from "@/services/device.service";
import { getAssignedActions } from "@/services/triage.service";
import { isDeviceActive } from "@/utils/deviceHelpers";
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userEmail = profile?.email || user?.email || "";
  const maskedUserEmail = useMemo(() => maskEmail(userEmail), [userEmail]);

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
        setDevices(devicesRes.value);
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

      {/* ── 2 Main Data Containers: Online Traps & Pending Action Logs ─────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* CONTAINER 1: ONLINE TRAPS */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Wifi className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    Online Traps
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Ovitraps currently online and transmitting telemetry
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
                      Loading online traps...
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
    </div>
  );
}

export { BhwDashboard };
