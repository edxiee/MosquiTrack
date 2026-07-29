import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Gauge,
  MapPinned,
  Sparkles,
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

const alertTierSummary = [
  {
    tier: "Green",
    count: 18,
    tone:
      "border-emerald-200 bg-emerald-50/80 text-emerald-700",
  },
  {
    tier: "Yellow",
    count: 7,
    tone:
      "border-yellow-200 bg-yellow-50/80 text-yellow-800",
  },
  {
    tier: "Orange",
    count: 4,
    tone:
      "border-orange-200 bg-orange-50/80 text-orange-700",
  },
  {
    tier: "Red",
    count: 2,
    tone: "border-rose-200 bg-rose-50/80 text-rose-700",
  },
] as const;

const recentEscalations = [
  {
    barangay: "Barangay San Miguel",
    transition: "Yellow to Orange",
    timestamp: "2026-07-29 08:20",
  },
  {
    barangay: "Barangay Poblacion Norte",
    transition: "Green to Yellow",
    timestamp: "2026-07-29 06:45",
  },
  {
    barangay: "Barangay Sta. Cruz",
    transition: "Orange to Red",
    timestamp: "2026-07-28 17:05",
  },
] as const;

const quickLinks = [
  {
    label: "Prescriptive Analytics",
    description: "Review municipal trend recommendations.",
    href: ROUTES.lgu.analytics,
    icon: BarChart3,
  },
  {
    label: "Heatmap Surveillance",
    description: "Open the barangay-level spatial view.",
    href: ROUTES.lgu.heatmap,
    icon: MapPinned,
  },
  {
    label: "Reporting Hub",
    description: "Export municipal summaries and case reports.",
    href: ROUTES.lgu.reports,
    icon: FileText,
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

export default function LguDashboard() {
  const { profile } = useAuth();

  const heroMetrics = {
    dviAverage: "4.2",
    barangaysMonitored: "23",
    pendingApprovals: "5",
    dohCases7Day: "12",
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(236,253,245,0.95))] p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <Sparkles className="size-3.5" />
              LGU HEALTH ADMINISTRATOR
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Municipal overview
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {profile
                ? `Welcome back, ${profile.first_name}. Track vector index trends, alert escalations, and approvals across all barangays.`
                : "Welcome back. Track vector index trends, alert escalations, and approvals across all barangays."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="sm" className="rounded-full px-4">
                <Link to={ROUTES.lgu.heatmap}>
                  View heatmap
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button asChild size="sm" variant="outline" className="rounded-full px-4">
                <Link to={ROUTES.lgu.reports}>
                  Generate report
                  <Gauge className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="w-full max-w-md border-emerald-200 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">Live snapshot</CardTitle>
              <CardDescription>
                TODO: replace these placeholders with municipality metrics from Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">3-day DVI average</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.dviAverage}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Barangays monitored</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.barangaysMonitored}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Pending approvals</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.pendingApprovals}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">DOH case count (7-day)</span>
                <span className="text-lg font-semibold text-slate-950">
                  {heroMetrics.dohCases7Day}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Gauge}
          label="3-day DVI"
          value="4.2"
          detail="Municipal average across monitored barangays."
          accent="emerald"
        />

        <MetricCard
          icon={MapPinned}
          label="Barangays monitored"
          value="23"
          detail="Barangays currently included in the live coverage set."
          accent="sky"
        />

        <MetricCard
          icon={TriangleAlert}
          label="Pending approvals"
          value="5"
          detail="Aerial spraying and chemical treatment sign-offs."
          accent="amber"
        />

        <MetricCard
          icon={FileText}
          label="DOH cases, last 7 days"
          value="12"
          detail="Reported confirmed cases in the latest weekly window."
          accent="slate"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {alertTierSummary.map((tier) => (
          <Card key={tier.tier} className={`border ${tier.tone} shadow-sm`}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium opacity-80">{tier.tier}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {tier.count}
                </p>
                <p className="mt-1 text-sm opacity-80">
                  Barangays in this alert tier.
                </p>
              </div>
              <Badge variant="outline" className="border-current bg-white/60 text-current">
                {tier.tier}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Recent alert escalations</CardTitle>
            <CardDescription>
              TODO: query the municipal alert history and tier transitions from Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Tier transition</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEscalations.map((item) => (
                  <TableRow key={`${item.barangay}-${item.timestamp}`}>
                    <TableCell className="font-medium text-slate-950">
                      {item.barangay}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.transition}</Badge>
                    </TableCell>
                    <TableCell>{item.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="border-t border-slate-100 p-5">
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to={ROUTES.lgu.heatmap}>
                <span className="inline-flex items-center gap-2">
                  <MapPinned className="size-4" />
                  View heatmap
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Reporting</CardTitle>
            <CardDescription>
              TODO: wire in last export metadata and municipal report generation history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">
                Last export
              </p>
              <p className="mt-1 text-sm text-slate-600">
                January municipal vector summary exported on 2026-07-28 at 16:00.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                TODO: replace with Supabase export audit data
              </p>
            </div>

            <Button asChild className="w-full justify-between rounded-full">
              <Link to={ROUTES.lgu.reports}>
                Generate report
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