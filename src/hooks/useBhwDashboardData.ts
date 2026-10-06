import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchBarangaySurveillanceData } from "@/services/barangaySurveillance.service";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";

export interface BhwDashboardMetrics {
  barangayName: string;
  barangayDvi: number;
  activeTrapNodes: number;
  lowBatteryNodes: number;
  openTriageActions: number;
  hotspotCount: number;
  queueRisk: number;
  fieldSpots: number;
  criticalNodes: number;
  recentAlerts: Array<{
    location: string;
    type: string;
    timestamp: string;
  }>;
  actionLog: Array<{
    action: string;
    detail: string;
    timestamp: string;
  }>;
}

export function useBhwDashboardData() {
  return useQuery({
    queryKey: ["bhw-dashboard"],
    queryFn: async (): Promise<BhwDashboardMetrics> => {
      const surveillanceData = await fetchBarangaySurveillanceData();

      const { count, error } = await supabase
        .from("action_triage_log")
        .select("id", { count: "exact", head: true })
        .eq("barangay_id", surveillanceData.barangayId)
        .in("status", ["Pending", "In Progress"]);

      if (error) {
        console.warn("Failed to count open triage actions for BHW dashboard:", error.message);
      }

      const lowBatteryNodes = surveillanceData.traps.filter(
        (trap) => (trap.battery ?? 100) < 20,
      ).length;

      const hotspotCount = surveillanceData.traps.filter(
        (trap) => trap.activityLevel === "High" || trap.activityLevel === "Critical",
      ).length;

      const queueRisk = surveillanceData.recentActions.filter(
        (action) => action.status === "Pending" || action.status === "In Progress",
      ).length;

      const fieldSpots = surveillanceData.traps.filter(
        (trap) => (trap.count ?? 0) >= 10,
      ).length;

      const criticalNodes = surveillanceData.traps.filter(
        (trap) => trap.activityLevel === "Critical" || (trap.battery ?? 100) < 15,
      ).length;

      const recentAlerts = surveillanceData.latestDetections.slice(0, 3).map((item) => ({
        location: item.location || surveillanceData.barangayName,
        type:
          item.count >= 20
            ? "High mosquito detection"
            : item.status === "Unverified"
              ? "Unverified detection"
              : "Surveillance alert",
        timestamp: item.time || "—",
      }));

      const actionLog = surveillanceData.recentActions.slice(0, 3).map((item) => ({
        action: item.triggerSource || "Field action",
        detail: item.remarks || "Open triage item pending response.",
        timestamp: item.assignedDate ? formatTelemetryTimestamp(item.assignedDate) : "—",
      }));

      return {
        barangayName: surveillanceData.barangayName,
        barangayDvi: Number(surveillanceData.vectorIndex || 0),
        activeTrapNodes: surveillanceData.totalTrapsCount || surveillanceData.activeCount || 0,
        lowBatteryNodes,
        openTriageActions: count ?? queueRisk ?? 0,
        hotspotCount,
        queueRisk,
        fieldSpots,
        criticalNodes,
        recentAlerts,
        actionLog,
      };
    },
    refetchInterval: 60_000,
  });
}
