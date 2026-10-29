import { Card, CardContent } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, Timer } from "lucide-react";
import type { TelemetryStats } from "@/types/telemetry.types";

interface TelemetryStatisticsProps {
  stats: TelemetryStats;
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "N/A";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function TelemetryStatistics({
  stats,
}: TelemetryStatisticsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Packets Today</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">{stats.totalPacketsToday}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Successful Uploads</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">{stats.successfulUploads}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Latest Packet</p>
            <h2 className="mt-2 text-xl font-bold text-emerald-600">{formatTimeAgo(stats.latestPacketTime)}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Clock className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Interval</p>
            <h2 className="mt-2 text-xl font-bold text-emerald-600">{stats.avgUploadInterval}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Timer className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
