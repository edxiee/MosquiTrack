import SystemControlPanel from "@/components/super-admin/SystemControlPanel";
import SystemStatusWidget from "@/components/system/SystemStatusWidget";
import { Sliders } from "lucide-react";

export default function SystemControls() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Sliders className="size-8 text-emerald-600" />
          System Controls
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Super Administrator control panel for global network operations, platform maintenance, and health metrics.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <SystemControlPanel />
        <div className="space-y-6">
          <SystemStatusWidget />
        </div>
      </div>
    </div>
  );
}
