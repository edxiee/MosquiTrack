import { Link } from "react-router-dom";
import {
  ArrowRight,
  BatteryLow,
  Droplets,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  User,
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
import { useBhwDashboardData } from "@/hooks/useBhwDashboardData";
import { ROUTES } from "@/utils/navigation";

const RISK_LEVELS = ["low", "moderate", "high", "critical"] as const;

const severityStyles: Record<string, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  moderate: "border-yellow-200 bg-yellow-50 text-yellow-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

// Normalizes whatever the backend sends into one of the 4 risk levels
function normalizeRisk(level: string): string {
  const key = (level ?? "").trim().toLowerCase();
  if (key === "medium") return "moderate"; // alias, if your data uses it
  return (RISK_LEVELS as readonly string[]).includes(key) ? key : "";
}

function severityLabel(level: string) {
  const key = normalizeRisk(level);
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : level;
}

function severityClass(level: string) {
  return (
    severityStyles[normalizeRisk(level)] ??
    "border-slate-200 bg-slate-50 text-slate-700"
  );
}

// 1 -> "Trap-001", "trap-7" -> "Trap-007", "Trap-012" -> "Trap-012"
function formatTrapLabel(trapId?: string | number | null): string {
  if (trapId === undefined || trapId === null || trapId === "") return "—";
  const digits = String(trapId).match(/\d+/)?.[0];
  return digits ? `Trap-${digits.padStart(3, "0")}` : String(trapId);
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;

  const parts = email.split("@");
  const localPart = parts[0];
  const domain = parts[1];

  if (!localPart || !domain) return email;

  // If username is 3 characters or less, show what's available without masking
  if (localPart.length <= 3) {
    return `${localPart}@${domain}`;
  }

  // Get first 3 characters
  const firstThree = localPart.slice(0, 3);

  // Calculate exact remaining length for matching asterisks
  const remainingLength = localPart.length - 3;
  const maskedStars = "*".repeat(remainingLength);

  return `${firstThree}${maskedStars}@${domain}`;
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
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
  }[accent];

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </div>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>

        <div className={`rounded-xl p-3 ${accentStyles}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BhwDashboard() {
  const { profile, user } = useAuth();
  const scopedBarangayId = profile?.barangay?.id;
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError,
    error,
  } = useBhwDashboardData(scopedBarangayId);

  // Retrieve user email from profile or auth user object
  const userEmail = profile?.email ?? user?.email ?? "";
  const maskedUserEmail = maskEmail(userEmail);

  const recentAlerts = metrics?.recentAlerts ?? [];
  const actionLog = (metrics?.actionLog ?? []).slice(0, 2);

  const heroMetrics = {
    barangayDvi: metricsLoading ? "..." : (metrics?.barangayDvi ?? 0).toFixed(1),
    activeTrapNodes: metricsLoading ? "..." : String(metrics?.activeTrapNodes ?? 0),
    lowBatteryNodes: metricsLoading ? "..." : String(metrics?.lowBatteryNodes ?? 0),
    openTriageActions: metricsLoading ? "..." : String(metrics?.openTriageActions ?? 0),
  };

  const criticalNodes = metrics?.criticalNodes ?? 0;
  const openTriageActions = metrics?.openTriageActions ?? 0;

  const banner =
    criticalNodes > 0
      ? {
        level: "Critical alert",
        text: `${criticalNodes} trap node${criticalNodes === 1 ? " is" : "s are"} in critical state. Prioritize immediate on-site checks and battery replacement.`,
        style: "border-rose-200 bg-gradient-to-r from-rose-50 to-white text-rose-900",
        icon: Siren,
        iconStyle: "bg-rose-100 text-rose-600",
      }
      : openTriageActions > 0
        ? {
          level: "Action required",
          text: `${openTriageActions} action${openTriageActions === 1 ? " is" : "s are"} still open. Keep field follow-ups moving to closure.`,
          style: "border-orange-200 bg-gradient-to-r from-orange-50 to-white text-orange-900",
          icon: ShieldAlert,
          iconStyle: "bg-orange-100 text-orange-600",
        }
        : {
          level: "All clear",
          text: "No critical nodes and no open triage actions right now.",
          style: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white text-emerald-900",
          icon: ShieldCheck,
          iconStyle: "bg-emerald-100 text-emerald-600",
        };
  const BannerIcon = banner.icon;

  return (
    <div className="space-y-6">
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error instanceof Error
            ? error.message
            : "Failed to load barangay dashboard metrics."}
        </div>
      )}

      {/* Page header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Barangay Health Worker
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">
            Barangay overview
          </h1>
          <p className="mt-1 text-base text-slate-600">
            {profile
              ? `Welcome back, ${profile.first_name}. Monitor trap nodes and log field actions for your barangay.`
              : "Welcome back. Monitor trap nodes and log field actions for your barangay."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
          {/* Upper right email display */}
          {userEmail && (
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm sm:self-start">
              <User className="size-4 text-slate-500" />
              <span>{maskedUserEmail}</span>
            </div>
          )}
        </div>
      </header>

      {/* Status banner */}
      <section
        role="status"
        className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${banner.style}`}
      >
        <div className={`rounded-xl p-3 ${banner.iconStyle}`}>
          <BannerIcon className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            {metricsLoading ? "Checking barangay status..." : banner.level}
          </p>
          <p className="mt-0.5 text-sm font-medium sm:text-base">
            {metricsLoading
              ? "Loading latest trap and triage updates."
              : banner.text}
          </p>
        </div>

        {(criticalNodes > 0 || openTriageActions > 0) && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden rounded-full sm:inline-flex"
          >
            <Link to={ROUTES.bhw.actionLogs}>
              Review <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        )}
      </section>

      {/* Metric cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Droplets}
          label="Barangay DVI"
          value={heroMetrics.barangayDvi}
          detail="Current reading for the active coverage area."
          accent="emerald"
        />

        <MetricCard
          icon={MapPinned}
          label="Active trap nodes"
          value={heroMetrics.activeTrapNodes}
          detail="Nodes currently reporting in the barangay."
          accent="sky"
        />

        <MetricCard
          icon={BatteryLow}
          label="Low-battery alerts"
          value={heroMetrics.lowBatteryNodes}
          detail="Nodes below the safe voltage threshold."
          accent="amber"
        />

        <MetricCard
          icon={TriangleAlert}
          label="Open actions"
          value={heroMetrics.openTriageActions}
          detail="Unresolved or pending log items."
          accent="slate"
        />
      </section>

      {/* Recent field alerts + triage log */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Recent field alerts</CardTitle>
            <CardDescription>
              Most recent trap detections and their risk levels in your barangay.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trap</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Risk level</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                      Loading recent alerts...
                    </TableCell>
                  </TableRow>
                ) : recentAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                      No recent field alerts.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAlerts.map((item) => (
                    <TableRow key={`${item.trapId}-${item.location}-${item.timestamp}`}>
                      <TableCell className="font-mono text-sm text-slate-700">
                        {formatTrapLabel(item.trapId)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-950">
                        {item.location}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={severityClass(item.type)}>
                          {severityLabel(item.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.timestamp}</TableCell>
                    </TableRow>
                  ))
                )}
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

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Action Log</CardTitle>
            <CardDescription>
              Action log entries and field action statuses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {metricsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading action log...
              </div>
            ) : actionLog.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No recent Action logs.
              </div>
            ) : (
              actionLog.map((item) => (
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
              ))
            )}

            <Button
              asChild
              className="w-full justify-between rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Link to={ROUTES.bhw.actionLogs}>
                Log new action
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}