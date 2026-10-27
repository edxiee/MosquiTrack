import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";

export const TRIAGE_BADGE_EVENT = "mosquitrack:triage-badge-change";

// Module-level global state shared across all Sidebar instances (desktop, mobile drawer, etc.)
let globalTriageCount = 0;
let globalTriageHasNew = false;
let globalRequestActionsCount = 0;
let globalRequestsHasNew = false;

let currentScopedBarangayId: string | undefined = undefined;
let isCurrentSysAdmin = false;

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

// Fetch current count of Pending tasks in action_triage_log scoped to the barangay
export async function fetchTriageCount(barangayId?: string) {
  try {
    const targetId = barangayId ?? currentScopedBarangayId;

    let query = supabase
      .from("action_triage_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending");

    if (!isCurrentSysAdmin) {
      if (targetId) {
        query = query.eq("barangay_id", targetId);
      } else {
        // Non-admin without a resolved barangay scope should not count other barangays
        globalTriageCount = 0;
        notifySubscribers();
        return;
      }
    }

    const { count, error } = await query;

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
export function triggerTriageBadgeRefresh(barangayId?: string) {
  fetchTriageCount(barangayId);
  fetchRequestActionsCount();
}

// Immediate optimistic dispatcher
export function dispatchTriageStatusChange(
  actionId: string,
  newStatus: string,
  previousStatus?: string,
  barangayId?: string
) {
  // If not a system administrator and the action belongs to a different barangay, ignore
  if (
    !isCurrentSysAdmin &&
    currentScopedBarangayId &&
    barangayId &&
    barangayId !== currentScopedBarangayId
  ) {
    return;
  }

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
        detail: { actionId, newStatus, previousStatus, barangayId },
      })
    );
  }

  // Re-verify with DB in background
  setTimeout(() => {
    fetchTriageCount(currentScopedBarangayId);
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
        const row = (payload.new ?? payload.old) as
          | { barangay_id?: string; status?: string }
          | undefined;
        const rowBarangayId = row?.barangay_id;

        // If the user is scoped to a specific barangay and the event is for another barangay, ignore it!
        if (!isCurrentSysAdmin) {
          if (!currentScopedBarangayId || rowBarangayId !== currentScopedBarangayId) {
            return;
          }
        }

        if (payload.eventType === "INSERT") {
          const newRow = payload.new as { status?: string } | undefined;
          if (newRow?.status === "Pending") {
            globalTriageHasNew = true;
            notifySubscribers();
            setTimeout(() => {
              globalTriageHasNew = false;
              notifySubscribers();
            }, 5000);
          }
        }
        fetchTriageCount(currentScopedBarangayId);
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
  const { profile } = useAuth();
  const isSysAdmin =
    profile?.role?.role_code === "SYS_ADMIN" ||
    profile?.role?.role_code === "ADMIN";
  const scopedBarangayId = isSysAdmin ? undefined : profile?.barangay?.id;

  const [, setTick] = useState(0);

  useEffect(() => {
    isCurrentSysAdmin = isSysAdmin;
    currentScopedBarangayId = scopedBarangayId;

    // Ensures real-time channels are subscribed once globally, never duplicated
    initGlobalChannels();
    fetchTriageCount(scopedBarangayId);
    fetchRequestActionsCount();

    const update = () => setTick((t) => t + 1);
    subscribers.add(update);

    // Re-verify on window focus (e.g. user returns to tab)
    const handleFocus = () => {
      fetchTriageCount(scopedBarangayId);
      fetchRequestActionsCount();
    };
    window.addEventListener("focus", handleFocus);

    const handleLocalBadgeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        actionId: string;
        newStatus: string;
        previousStatus?: string;
        barangayId?: string;
      }>;
      const { newStatus, previousStatus, barangayId } = customEvent.detail || {};

      if (!isSysAdmin && scopedBarangayId && barangayId && barangayId !== scopedBarangayId) {
        return;
      }

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
  }, [scopedBarangayId, isSysAdmin]);

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

