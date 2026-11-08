import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  LayoutDashboard,
  MapPin,
  Megaphone,
  ShieldAlert,
  User,
  Users,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ROUTES } from "@/utils/navigation";
import { formatDateTime } from "@/utils/format";
import { fetchDevices } from "@/services/device.service";
import { getUsers } from "@/services/users.service";
import {
  fetchRequestActions,
  type RequestActionRow,
} from "@/services/requestActions.service";
import {
  ANNOUNCEMENT_PUBLISHED_EVENT,
  getAnnouncements,
  isAnnouncementActive,
} from "@/services/announcement.service";
import { isDeviceActive } from "@/utils/deviceHelpers";
import type { OvitrapDevice } from "@/types/device.types";
import type { DatabaseUser } from "@/types/user.types";
import type { Announcement, AnnouncementLevel } from "@/types/announcement.types";

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

const LEVEL_STYLES: Record<
  AnnouncementLevel,
  {
    badge: string;
    label: string;
    icon: typeof Info;
  }
> = {
  info: {
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    label: "Info",
    icon: Info,
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Warning",
    icon: AlertTriangle,
  },
  critical: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Critical",
    icon: ShieldAlert,
  },
};

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const isSiteAdmin = profile?.role?.role_code === "ADMIN";

  const [devices, setDevices] = useState<OvitrapDevice[]>([]);
  const [accounts, setAccounts] = useState<DatabaseUser[]>([]);
  const [requestActions, setRequestActions] = useState<RequestActionRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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
      const [devicesRes, usersRes, requestsRes, announcementsRes] =
        await Promise.allSettled([
          fetchDevices(),
          getUsers(),
          fetchRequestActions(),
          getAnnouncements(),
        ]);

      if (devicesRes.status === "fulfilled") {
        setDevices(devicesRes.value);
      }
      if (usersRes.status === "fulfilled") {
        setAccounts(usersRes.value);
      }
      if (requestsRes.status === "fulfilled") {
        setRequestActions(requestsRes.value);
      }
      if (announcementsRes.status === "fulfilled") {
        setAnnouncements(announcementsRes.value);
      }

      const firstRejected = [
        devicesRes,
        usersRes,
        requestsRes,
        announcementsRes,
      ].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;

      if (firstRejected && !silent) {
        console.error("Dashboard partial load error:", firstRejected.reason);
      }
    } catch (err) {
      if (!silent) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load dashboard data."
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboardData(false);

    const handleAnnouncementUpdate = () => {
      void loadDashboardData(true);
    };
    window.addEventListener(
      ANNOUNCEMENT_PUBLISHED_EVENT,
      handleAnnouncementUpdate
    );

    const channel = supabase
      .channel("admin-overview-containers-realtime")
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
        { event: "*", schema: "public", table: "profiles" },
        () => void loadDashboardData(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
        () => void loadDashboardData(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => void loadDashboardData(true)
      )
      .subscribe();

    return () => {
      window.removeEventListener(
        ANNOUNCEMENT_PUBLISHED_EVENT,
        handleAnnouncementUpdate
      );
      void supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  // 1. Active Traps
  const activeTraps = useMemo(
    () => devices.filter((d) => isDeviceActive(d)),
    [devices]
  );

  // 2. Accounts & Pending Accounts (respecting Site Admin visibility rule)
  const visibleAccounts = useMemo(() => {
    if (isSiteAdmin) {
      return accounts.filter((u) => u.role !== "SYS_ADMIN");
    }
    return accounts;
  }, [accounts, isSiteAdmin]);

  const pendingAccounts = useMemo(
    () =>
      visibleAccounts.filter(
        (u) => String(u.status || "").toUpperCase() === "PENDING"
      ),
    [visibleAccounts]
  );

  const activeAccountsCount = useMemo(
    () =>
      visibleAccounts.filter(
        (u) => String(u.status || "").toUpperCase() === "ACTIVE"
      ).length,
    [visibleAccounts]
  );

  // Sort accounts so PENDING accounts appear first
  const sortedAccounts = useMemo(() => {
    return [...visibleAccounts].sort((a, b) => {
      const aPending = String(a.status || "").toUpperCase() === "PENDING" ? 0 : 1;
      const bPending = String(b.status || "").toUpperCase() === "PENDING" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (
        new Date(b.invited_at || 0).getTime() -
        new Date(a.invited_at || 0).getTime()
      );
    });
  }, [visibleAccounts]);

  // 3. Pending Actions from Request Actions Overview
  const pendingRequestActions = useMemo(
    () =>
      requestActions.filter(
        (r) =>
          r.status === "Pending" ||
          (!r.status && !r.approved_at && !r.completed_at)
      ),
    [requestActions]
  );

  return (
    <div className="space-y-6">
      {/* ── Clean flat header ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <LayoutDashboard className="size-3" />
            IoT Management Center
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            MosquiTrack Overview
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {profile
              ? `Welcome back, ${profile.first_name}. Monitor trap uptime, detection events, and trap alerts.`
              : "Monitor trap uptime, detection events, and trap alerts from a single operations view."}
          </p>
        </div>

        {/* Upper right email display - Large + Masked */}
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

      {/* ── 4 Individual Data Containers ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 1. ACTIVE TRAPS CONTAINER */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Wifi className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    Active Traps
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
                  : `${activeTraps.length} of ${devices.length} Active`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-auto max-h-[360px]">
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
                      Loading active traps...
                    </TableCell>
                  </TableRow>
                ) : activeTraps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      No traps are currently active (online within the last 16
                      minutes).
                    </TableCell>
                  </TableRow>
                ) : (
                  activeTraps.map((trap) => (
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
              <Link to={ROUTES.admin.liveMonitoring}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <Wifi className="size-3.5 text-emerald-600" />
                  Open Live Trap Monitoring
                </span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* 2. ACCOUNTS & PENDING STATUS CONTAINER */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Users className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    User Accounts
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Total registered accounts and pending activation status
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700"
                >
                  {loading ? "—" : `${visibleAccounts.length} Total`}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
                >
                  {loading ? "—" : `${pendingAccounts.length} Pending`}
                </Badge>
              </div>
            </div>

            {/* Accounts KPI Strip */}
            <div className="mt-3 grid grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Accounts
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {loading ? "—" : visibleAccounts.length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Status Pending
                </p>
                <p className="mt-0.5 text-lg font-bold text-amber-700">
                  {loading ? "—" : pendingAccounts.length}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Active Accounts
                </p>
                <p className="mt-0.5 text-lg font-bold text-emerald-700">
                  {loading ? "—" : activeAccountsCount}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-auto max-h-[285px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50">
                  <TableHead className="font-semibold text-slate-600 text-xs py-3 pl-5">
                    USER
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs py-3">
                    ROLE
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs py-3 pr-5 text-right">
                    STATUS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-slate-400"
                    >
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : sortedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAccounts.map((acc) => {
                    const statusUpper = String(
                      acc.status || "PENDING"
                    ).toUpperCase();
                    const isPending = statusUpper === "PENDING";
                    const isActive = statusUpper === "ACTIVE";
                    return (
                      <TableRow
                        key={acc.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="py-3 pl-5">
                          <p className="text-xs font-semibold text-slate-900">
                            {acc.first_name} {acc.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {acc.email}
                          </p>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {acc.role}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 pr-5 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                              isPending
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isPending
                                  ? "bg-amber-500"
                                  : isActive
                                  ? "bg-emerald-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            {statusUpper}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
              <Link to={ROUTES.admin.users}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <Users className="size-3.5 text-emerald-600" />
                  Open User Access Control
                </span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* 3. PENDING ACTIONS FROM DEPLOYMENT REQUEST CONTAINER */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    Pending Actions
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Pending trap requests from Deployment Request
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
              >
                {loading ? "—" : `${pendingRequestActions.length} Pending`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 divide-y divide-slate-100 p-0 overflow-auto max-h-[360px]">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading pending request actions...
              </div>
            ) : pendingRequestActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-slate-500">
                <CheckCircle2 className="size-8 text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">
                  No pending request actions
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All submitted trap deployment and pickup requests have been
                  processed.
                </p>
              </div>
            ) : (
              pendingRequestActions.map((req) => {
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
                    className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                          {req.device_code || "UNASSIGNED"}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {req.request}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Clock className="size-3" />
                          Pending
                        </span>
                      </div>

                      {req.descriptions && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {req.descriptions}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        <span>
                          Requested by{" "}
                          <strong className="font-medium text-slate-700">
                            {requesterName}
                          </strong>
                          {req.requester_role ? ` (${req.requester_role})` : ""}
                        </span>
                        {locationText && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{locationText}</span>
                          </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>{formatDateTime(req.created_at)}</span>
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
              className="w-full justify-between rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Link to={ROUTES.admin.requestActionsOverview}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <ClipboardList className="size-3.5 text-emerald-600" />
                  Open Deployment Request
                </span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* 4. ALL ANNOUNCEMENTS CONTAINER */}
        <Card className="border-slate-200 bg-white/95 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <Megaphone className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-950">
                    All Announcements
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    All published broadcasts and advisories across the network
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
              >
                {loading ? "—" : `${announcements.length} Total`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 divide-y divide-slate-100 p-0 overflow-auto max-h-[360px]">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-slate-500">
                <Megaphone className="size-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No announcements published
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Create a broadcast to notify LGU and Barangay teams.
                </p>
              </div>
            ) : (
              announcements.map((item) => {
                const lvl = LEVEL_STYLES[item.level] ?? LEVEL_STYLES.info;
                const LevelIcon = lvl.icon;
                const active = isAnnouncementActive(
                  item.start_date,
                  item.end_date
                );

                return (
                  <div
                    key={item.id}
                    className="px-5 py-4 hover:bg-slate-50/80 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lvl.badge}`}
                        >
                          <LevelIcon className="size-3" />
                          {lvl.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              active ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {active ? "Active" : "Archived"}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          Audience: {item.target_audience}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-line">
                      {item.message}
                    </p>
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
              className="w-full justify-between rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Link to={ROUTES.admin.announcements}>
                <span className="inline-flex items-center gap-2 text-xs font-medium">
                  <Megaphone className="size-3.5 text-emerald-600" />
                  Manage Announcements
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

export { AdminDashboard };

