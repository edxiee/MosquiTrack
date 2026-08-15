import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSystemControl } from "@/contexts/SystemControlContext";
import { AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function SystemControlPanel() {
  const { isMaintenanceMode, setMaintenanceMode, announcements } = useSystemControl();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            Global Maintenance & Operational Overrides
          </CardTitle>
          <CardDescription>
            Toggle maintenance mode across the MosquiTrack network to restrict field operations during scheduled system updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance-mode" className="text-base font-semibold text-slate-900">
                System Maintenance Mode
              </Label>
              <p className="text-sm text-slate-500">
                When enabled, non-admin accounts will see a maintenance notice.
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={isMaintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="size-4" />
              Flush Client Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="size-5 text-sky-500" />
            Active Announcements ({announcements.length})
          </CardTitle>
          <CardDescription>
            Broadcast notices dispatched to LGU and Barangay field workers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No active announcements.
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-white shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <h4 className="font-semibold text-slate-900">{ann.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600">{ann.message}</p>
                    <p className="text-xs text-slate-400">
                      Dispatched on {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
