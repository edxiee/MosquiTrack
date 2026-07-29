import { Link } from "react-router-dom";
import {
  ArrowRight,
  BatteryLow,
  ClipboardList,
  Droplets,
  MapPinned,
  MonitorDown,
  TriangleAlert,
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
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/features/navigation/config/routes";

const alertSummary = [
  {
    label: "High priority",
    count: 4,
    tone: "border-rose-200 bg-rose-50/80 text-rose-700",
  },
  {
    label: "Active warning",
    count: 8,
    tone: "border-amber-200 bg-amber-50/80 text-amber-800",
  },
  {
    label: "Under observation",
    count: 12,
    tone: "border-sky-200 bg-sky-50/80 text-sky-700",
  },
  {
    label: "Safe",
    count: 19,
    tone: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
  },
] as const;

const recentAlerts = [
  {
    location: "San Roque Elementary School",
    type: "Breeding ground detected",
    timestamp: "2026-07-29 09:12",
  },
  {
    location: "Public Market North Wing",
    type: "Low battery warning",
    timestamp: "2026-07-29 07:40",
  },
  {
    location: "Riverside Park",
    type: "Standing water hotspot",
    timestamp: "2026-07-28 18:25",
  },
] as const;

const actionLog = [
  {
    action: "Acknowledged warning",
    detail: "Barangay San Isidro hotspot marked for follow-up.",
    timestamp: "2026-07-29 10:02",
  },
  {
    action: "Search and Destroy",
    detail: "Cleaning and container removal conducted near the clinic.",
    timestamp: "2026-07-29 08:50",
  },
  {
    action: "Larvicide distribution",
    detail: "Larvicide packets issued to zone 3 household cluster.",
    timestamp: "2026-07-28 16:15",
  },
] as const;

const quickLinks = [
  {
    label: "Localized Surveillance",
    description: "Review barangay maps and alert points.",
    href: ROUTES.bhw.surveillance,
    icon: MapPinned,
  },
  {
    label: "Node & Battery Diagnostics",
    description: "Inspect trap health and voltage status.",
    href: ROUTES.bhw.hardware,
    icon: BatteryLow,
  },
  {
    label: "Action Triage Log",
    description: "Open the field action logging workflow.",
    href: ROUTES.bhw.triage,
    icon: ClipboardList,
  },
] as const;

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

export default function BhwDashboard() {
  const { profile } = useAuth();

  const heroMetrics = {
    barangayDvi: "3.8",
    activeTrapNodes: "14",
    lowBatteryNodes: "3",
    openTriageActions: "6",
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.95))] p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <Droplets className="size-3.5" />
              BARANGAY HEALTH WORKER
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Barangay overview
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {profile
                ? `Welcome back, ${profile.first_name}. Monitor trap nodes, track breeding hotspots, and log field actions for your barangay.`
                : "Welcome back. Monitor trap nodes, track breeding hotspots, and log field actions for your barangay."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="sm" className="rounded-full px-4">
                <Link to={ROUTES.bhw.surveillance}>
                  View barangay map
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button asChild size="sm" variant="outline" className="rounded-full px-4">
                <Link to={ROUTES.bhw.triage}>
                  Log action
                  <MonitorDown className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="w-full max-w-md border-emerald-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Live snapshot</CardTitle>
              <CardDescription>
                TODO: replace these placeholders with barangay-scoped Supabase metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Barangay DVI</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.barangayDvi}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Active trap nodes</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.activeTrapNodes}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Low-battery nodes</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.lowBatteryNodes}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Open triage actions</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.openTriageActions}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Droplets}
          label="Barangay DVI"
          value="3.8"
          detail="Current reading for the active coverage area."
          accent="emerald"
        />

        <MetricCard
          icon={MapPinned}
          label="Active trap nodes"
          value="14"
          detail="Nodes currently reporting in the barangay."
          accent="sky"
        />

        <MetricCard
          icon={BatteryLow}
          label="Low-battery alerts"
          value="3"
          detail="Nodes below the safe voltage threshold."
          accent="amber"
        />

        <MetricCard
          icon={TriangleAlert}
          label="Open triage actions"
          value="6"
          detail="Unresolved or pending log items."
          accent="slate"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
          <CardContent className="p-5 text-emerald-800">
            <p className="text-sm font-medium opacity-80">Breeding hotspot</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">11</p>
            <p className="mt-1 text-sm opacity-80">Sites flagged for inspection.</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/80 shadow-sm">
          <CardContent className="p-5 text-yellow-900">
            <p className="text-sm font-medium opacity-80">Queue risk</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">4</p>
            <p className="mt-1 text-sm opacity-80">Items needing same-day follow-up.</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/80 shadow-sm">
          <CardContent className="p-5 text-orange-800">
            <p className="text-sm font-medium opacity-80">Field spots</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">8</p>
            <p className="mt-1 text-sm opacity-80">Active hotspots under monitoring.</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/80 shadow-sm">
          <CardContent className="p-5 text-rose-800">
            <p className="text-sm font-medium opacity-80">Critical nodes</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">2</p>
            <p className="mt-1 text-sm opacity-80">Nodes requiring immediate attention.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Recent field alerts</CardTitle>
            <CardDescription>
              TODO: query barangay-scoped vector density alerts, breeding ground coordinates, and node battery warnings from Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Alert type</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAlerts.map((item) => (
                  <TableRow key={`${item.location}-${item.timestamp}`}>
                    <TableCell className="font-medium text-slate-950">
                      {item.location}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.type}</Badge>
                    </TableCell>
                    <TableCell>{item.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="border-t border-slate-100 p-5">
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to={ROUTES.bhw.surveillance}>
                <span className="inline-flex items-center gap-2">
                  <MapPinned className="size-4" />
                  View barangay map
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Action Triage Log</CardTitle>
            <CardDescription>
              TODO: wire the triage log entries and action statuses from Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {actionLog.map((item) => (
              <div
                key={`${item.action}-${item.timestamp}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{item.action}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </div>
                  <Badge variant="outline">Logged</Badge>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {item.timestamp}
                </p>
              </div>
            ))}

            <Button asChild className="w-full justify-between rounded-full">
              <Link to={ROUTES.bhw.triage}>
                Log new action
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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