import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BatteryLow,
  LayoutDashboard,
  MapPinned,
  Network,
  Users,
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
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/features/navigation/config/routes";

import { useAdminDashboardData } from "../hooks/useAdminDashboardData";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatVoltage(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(2)} V`;
}

function formatRate(value: number) {
  return `${value.toFixed(1)} readings/min`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = "emerald",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  accent?: "emerald" | "amber" | "sky" | "slate";
}) {
  const accentStyles = {
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/80 text-amber-700",
    sky: "border-sky-200 bg-sky-50/80 text-sky-700",
    slate: "border-slate-200 bg-slate-50/80 text-slate-700",
  }[accent];

  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <CardContent className="flex items-start gap-4 p-6">
        <div className={`rounded-2xl border p-3 ${accentStyles}`}>
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </div>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const {
    counts,
    deviceMap,
    lowBatteryDevices,
    recentReadings,
    activeAccountsQuery,
    devicesQuery,
    recentReadingsQuery,
    telemetryRateQuery,
  } = useAdminDashboardData();

  const loading =
    activeAccountsQuery.isLoading ||
    devicesQuery.isLoading ||
    recentReadingsQuery.isLoading ||
    telemetryRateQuery.isLoading;

  const errorMessage =
    activeAccountsQuery.error?.message ||
    devicesQuery.error?.message ||
    recentReadingsQuery.error?.message ||
    telemetryRateQuery.error?.message ||
    null;

  const latestTelemetry = useMemo(() => {
    return recentReadings.map((reading) => {
      const device = deviceMap.get(reading.device_id);

      return {
        ...reading,
        deviceCode: device?.device_code ?? reading.device_id,
      };
    });
  }, [deviceMap, recentReadings]);

  const quickLinks = [
    {
      label: "User Access Control",
      description: "Manage system accounts and permissions.",
      href: ROUTES.admin.users,
      icon: Users,
    },
    {
      label: "Static Georeferencing",
      description: "Review barangay and device placement data.",
      href: ROUTES.admin.georeferencing,
      icon: MapPinned,
    },
    {
      label: "Node Provisioning",
      description: "Register and maintain device inventory.",
      href: ROUTES.admin.nodes,
      icon: Network,
    },
    {
      label: "Raw Telemetry Hub",
      description: "Inspect the latest captured readings.",
      href: ROUTES.admin.telemetry,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.95))] p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <LayoutDashboard className="size-3.5" />
              System Administrator
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              MosquiTrack overview
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {profile
                ? `Welcome back, ${profile.first_name}. Track device uptime, recent telemetry, and low-battery alerts from a single operations view.`
                : "Track device uptime, recent telemetry, and low-battery alerts from a single operations view."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="sm" className="rounded-full px-4">
                <Link to={ROUTES.admin.telemetry}>
                  View telemetry hub
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="w-full max-w-md border-emerald-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Live snapshot</CardTitle>
              <CardDescription>
                Counts refresh every 30 seconds from Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Registered nodes</span>
                <span className="text-lg font-semibold text-slate-950">
                  {counts.registeredNodes}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Online nodes</span>
                <span className="text-lg font-semibold text-slate-950">
                  {counts.onlineNodes}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Active accounts</span>
                <span className="text-lg font-semibold text-slate-950">
                  {counts.activeAccounts}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Low battery alerts</span>
                <span className="text-lg font-semibold text-rose-600">
                  {counts.lowBatteryNodes}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Network}
          label="Registered nodes"
          value={loading ? "—" : `${counts.registeredNodes}`}
          detail="Devices in the active inventory."
          accent="emerald"
        />

        <MetricCard
          icon={Activity}
          label="Telemetry rate"
          value={loading ? "—" : formatRate(counts.telemetryRatePerMinute)}
          detail="Readings captured in the last hour."
          accent="sky"
        />

        <MetricCard
          icon={Users}
          label="Active accounts"
          value={loading ? "—" : `${counts.activeAccounts}`}
          detail="Profiles marked active in Supabase."
          accent="slate"
        />

        <MetricCard
          icon={BatteryLow}
          label="Low battery nodes"
          value={loading ? "—" : `${counts.lowBatteryNodes}`}
          detail="Latest readings below 3.40 V."
          accent="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Recent telemetry feed</CardTitle>
            <CardDescription>
              Latest raw rows exposed from ovitrap_readings and refreshed on a
              polling interval.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TRAP ID</TableHead>
                  <TableHead>Egg count</TableHead>
                  <TableHead>Battery / voltage</TableHead>
                  <TableHead>Captured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestTelemetry.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                      No telemetry rows available.
                    </TableCell>
                  </TableRow>
                ) : (
                  latestTelemetry.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell className="font-medium text-slate-950">
                        {reading.deviceCode}
                      </TableCell>
                      <TableCell>{reading.egg_count}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {formatVoltage(reading.battery_level)}
                          {reading.battery_level !== null &&
                          reading.battery_level < 3.4 ? (
                            <Badge variant="destructive">Low</Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(reading.captured_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Operational alerts</CardTitle>
            <CardDescription>
              Current conditions needing attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-950">
                    Low battery nodes
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {lowBatteryDevices.length === 0
                      ? "No nodes are currently below the 3.40 V threshold."
                      : `${lowBatteryDevices.length} node${lowBatteryDevices.length === 1 ? "" : "s"} need attention.`}
                  </p>
                </div>
              </div>

              {lowBatteryDevices.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {lowBatteryDevices.slice(0, 4).map((reading) => {
                    const device = deviceMap.get(reading.device_id);

                    return (
                      <div
                        key={reading.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-slate-950">
                            {device?.device_code ?? reading.device_id}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(reading.captured_at)}
                          </p>
                        </div>

                        <Badge variant="destructive">
                          {formatVoltage(reading.battery_level)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">
                Node uptime reference
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {counts.onlineNodes} of {counts.registeredNodes} registered nodes
                were seen within the last {15} minutes.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full justify-between">
              <Link to={ROUTES.admin.telemetry}>
                <span className="inline-flex items-center gap-2">
                  <Activity className="size-4" />
                  View telemetry hub
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              asChild
              variant="outline"
              className="h-auto justify-start rounded-2xl border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <Link to={item.href}>
                <div className="flex w-full items-start gap-4">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
          );
        })}
      </section>
    </div>
  );
}