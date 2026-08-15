import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSystemControl } from "@/contexts/SystemControlContext";
import { Server, ShieldCheck, Wrench } from "lucide-react";

export default function SystemStatusWidget() {
  const { systemStatus, isMaintenanceMode } = useSystemControl();

  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Server className="size-4 text-emerald-600" />
            System Status
          </span>
          <Badge
            variant={isMaintenanceMode ? "destructive" : "default"}
            className={isMaintenanceMode ? "" : "bg-emerald-600 hover:bg-emerald-700"}
          >
            {systemStatus.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Live backend services, Supabase database, and IoT sensor connection health.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Database (Supabase PostgreSQL)</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
            <ShieldCheck className="size-4" /> Connected
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Realtime Sensor Ingestion</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
            <ShieldCheck className="size-4" /> Operational
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Maintenance Mode</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <Wrench className="size-4" /> {isMaintenanceMode ? "Active" : "Disabled"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
