import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/utils/navigation";

export const TRIAGE_BADGE_EVENT = "mosquitrack:triage-badge-change";

// Module-level global state shared across all Sidebar instances (desktop, mobile drawer, etc.)
let globalTriageCount = 0;
let globalTriageHasNew = false;
let globalRequestActionsCount = 0;
let globalRequestsHasNew = false;

const subscribers = new Set<() => void>();
let channelsInitialized = false;

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("Error in sidebar badge subscriber:", err);
    }
  });
}

// Fetch current count of Pending tasks in action_triage_log
export async function fetchTriageCount() {
  try {
    const { count, error } = await supabase
      .from("action_triage_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending");

    if (!error && typeof count === "number") {
      globalTriageCount = count;
      notifySubscribers();
    }
  } catch (err) {
    console.error("Failed to fetch triage notification count:", err);
  }
}

// Fetch current count of Pending requests in request_actions
export async function fetchRequestActionsCount() {
  try {
    const { count, error } = await supabase
      .from("request_actions")
      .select("req_id", { count: "exact", head: true })
      .eq("status", "Pending");

    if (!error && typeof count === "number") {
      globalRequestActionsCount = count;
      notifySubscribers();
    }
  } catch (err) {
    console.error("Failed to fetch request actions notification count:", err);
  }
}

// Explicit refresh helper callable from any page or component
export function triggerTriageBadgeRefresh() {
  fetchTriageCount();
  fetchRequestActionsCount();
}

// Immediate optimistic dispatcher
export function dispatchTriageStatusChange(
  actionId: string,
  newStatus: string,
  previousStatus?: string
) {
  if (previousStatus === "Pending" && newStatus !== "Pending") {
    globalTriageCount = Math.max(0, globalTriageCount - 1);
    notifySubscribers();
  } else if (newStatus === "Pending" && previousStatus !== "Pending") {
    globalTriageCount += 1;
    globalTriageHasNew = true;
    notifySubscribers();
    setTimeout(() => {
      globalTriageHasNew = false;
      notifySubscribers();
    }, 5000);
  }

  // Also notify via CustomEvent if any listeners exist
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRIAGE_BADGE_EVENT, {
        detail: { actionId, newStatus, previousStatus },
      })
    );
  }

  // Re-verify with DB in background
  setTimeout(() => {
    fetchTriageCount();
  }, 300);
}

// Initialize persistent real-time channels EXACTLY ONCE for the whole app
function initGlobalChannels() {
  if (channelsInitialized) return;
  channelsInitialized = true;

  fetchTriageCount();
  fetchRequestActionsCount();

  // Single persistent channel for action_triage_log
  supabase
    .channel("global_sidebar_action_triage_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "action_triage_log" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          globalTriageHasNew = true;
          notifySubscribers();
          setTimeout(() => {
            globalTriageHasNew = false;
            notifySubscribers();
          }, 5000);
        }
        fetchTriageCount();
      }
    )
    .subscribe();

  // Single persistent channel for request_actions
  supabase
    .channel("global_sidebar_request_actions_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "request_actions" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          globalRequestsHasNew = true;
          notifySubscribers();
          setTimeout(() => {
            globalRequestsHasNew = false;
            notifySubscribers();
          }, 5000);
        }
        fetchRequestActionsCount();
      }
    )
    .subscribe();
}

export interface BadgeInfo {
  count: number;
  hasNew: boolean;
}

export function useSidebarBadges() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Ensures real-time channels are subscribed once globally, never duplicated
    initGlobalChannels();

    const update = () => setTick((t) => t + 1);
    subscribers.add(update);

    // Re-verify on window focus (e.g. user returns to tab)
    const handleFocus = () => {
      fetchTriageCount();
      fetchRequestActionsCount();
    };
    window.addEventListener("focus", handleFocus);

    const handleLocalBadgeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        actionId: string;
        newStatus: string;
        previousStatus?: string;
      }>;
      const { newStatus, previousStatus } = customEvent.detail || {};

      if (previousStatus === "Pending" && newStatus !== "Pending") {
        globalTriageCount = Math.max(0, globalTriageCount - 1);
        notifySubscribers();
      } else if (newStatus === "Pending" && previousStatus !== "Pending") {
        globalTriageCount += 1;
        globalTriageHasNew = true;
        notifySubscribers();
        setTimeout(() => {
          globalTriageHasNew = false;
          notifySubscribers();
        }, 5000);
      }
    };

    window.addEventListener(TRIAGE_BADGE_EVENT, handleLocalBadgeChange);

    return () => {
      // Detach only this component's render subscriber, keep global realtime channel alive
      subscribers.delete(update);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(TRIAGE_BADGE_EVENT, handleLocalBadgeChange);
    };
  }, []);

  const getBadgeForPath = (path: string): BadgeInfo | null => {
    if (path === ROUTES.bhw.actionLogs) {
      return {
        count: globalTriageCount,
        hasNew: globalTriageHasNew,
      };
    }
    if (
      path === ROUTES.admin.requestActionsOverview ||
      path.includes("request-actions") ||
      path === "/admin/request-actions"
    ) {
      return {
        count: globalRequestActionsCount,
        hasNew: globalRequestsHasNew,
      };
    }
    return null;
  };

  return {
    triageCount: globalTriageCount,
    triageHasNew: globalTriageHasNew,
    requestActionsCount: globalRequestActionsCount,
    requestsHasNew: globalRequestsHasNew,
    getBadgeForPath,
  };
}

