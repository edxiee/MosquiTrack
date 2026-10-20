import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/utils/navigation";

export const TRIAGE_BADGE_EVENT = "mosquitrack:triage-badge-change";

export function dispatchTriageStatusChange(
  actionId: string,
  newStatus: string,
  previousStatus?: string
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRIAGE_BADGE_EVENT, {
        detail: { actionId, newStatus, previousStatus },
      })
    );
  }
}

export interface BadgeInfo {
  count: number;
  hasNew: boolean;
}

export function useSidebarBadges() {
  const [triageCount, setTriageCount] = useState<number>(0);
  const [requestActionsCount, setRequestActionsCount] = useState<number>(0);
  const [triageHasNew, setTriageHasNew] = useState<boolean>(false);
  const [requestsHasNew, setRequestsHasNew] = useState<boolean>(false);

  const fetchTriageCount = async () => {
    try {
      const { count, error } = await supabase
        .from("action_triage_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending");

      if (!error && typeof count === "number") {
        setTriageCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch triage notification count:", err);
    }
  };

  const fetchRequestActionsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("request_actions")
        .select("req_id", { count: "exact", head: true })
        .eq("status", "Pending");

      if (!error && typeof count === "number") {
        setRequestActionsCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch request actions notification count:", err);
    }
  };

  useEffect(() => {
    fetchTriageCount();
    fetchRequestActionsCount();

    const handleLocalBadgeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        actionId: string;
        newStatus: string;
        previousStatus?: string;
      }>;
      const { newStatus, previousStatus } = customEvent.detail || {};

      if (previousStatus === "Pending" && newStatus !== "Pending") {
        setTriageCount((prev) => Math.max(0, prev - 1));
      } else if (newStatus === "Pending" && previousStatus !== "Pending") {
        setTriageCount((prev) => prev + 1);
        setTriageHasNew(true);
        setTimeout(() => setTriageHasNew(false), 5000);
      }
    };

    window.addEventListener(TRIAGE_BADGE_EVENT, handleLocalBadgeChange);

    // We use "_v2" suffixes to force Supabase to create fresh channel instances 
    // and avoid the "already subscribed" HMR/StrictMode crash.
    const triageChannel = supabase
      .channel("sidebar_action_triage_channel_v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_triage_log" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTriageHasNew(true);
            setTimeout(() => setTriageHasNew(false), 5000);
          }
          fetchTriageCount();
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel("sidebar_request_actions_channel_v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_actions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRequestsHasNew(true);
            setTimeout(() => setRequestsHasNew(false), 5000);
          }
          fetchRequestActionsCount();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(TRIAGE_BADGE_EVENT, handleLocalBadgeChange);
      supabase.removeChannel(triageChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, []);

  const getBadgeForPath = (path: string): BadgeInfo | null => {
    // FIXED: Changed from ROUTES.bhw.triage to ROUTES.bhw.actionLogs
    if (path === ROUTES.bhw.actionLogs) {
      return {
        count: triageCount,
        hasNew: triageHasNew,
      };
    }
    if (path.includes("request-actions") || path === "/admin/request-actions") {
      return {
        count: requestActionsCount,
        hasNew: requestsHasNew,
      };
    }
    return null;
  };

  return {
    triageCount,
    triageHasNew,
    requestActionsCount,
    requestsHasNew,
    getBadgeForPath,
  };
}