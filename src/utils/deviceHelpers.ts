import type { UserName, Barangay, OvitrapDevice } from "@/types/device.types";

export const formatDeployedBy = (user: UserName | null) => {
  if (!user?.first_name || !user?.last_name) return "—";
  return `${user.first_name.charAt(0).toUpperCase()}. ${user.last_name}`;
};

export const ONLINE_THRESHOLD_MINUTES = 16;
export const ONLINE_THRESHOLD_MS = ONLINE_THRESHOLD_MINUTES * 60 * 1000;

export const isDeviceActive = (device: OvitrapDevice | null | undefined): boolean => {
  if (!device) return false;

  const rawStatus = Array.isArray(device.device_statuses)
    ? (device.device_statuses as any)[0]?.status_name
    : device.device_statuses?.status_name;

  if (rawStatus === "Maintenance") return false;

  if (device.last_seen_at) {
    const lastSeenTime = new Date(device.last_seen_at).getTime();
    if (!isNaN(lastSeenTime)) {
      const diff = Date.now() - lastSeenTime;
      return diff >= 0 && diff <= ONLINE_THRESHOLD_MS;
    }
  }

  return false;
};

export const getDeviceStatusName = (device: OvitrapDevice | null | undefined): "Online" | "Offline" | "Maintenance" => {
  if (!device) return "Offline";

  const rawStatus = Array.isArray(device.device_statuses)
    ? (device.device_statuses as any)[0]?.status_name
    : device.device_statuses?.status_name;

  if (rawStatus === "Maintenance") return "Maintenance";

  if (device.last_seen_at) {
    const lastSeenTime = new Date(device.last_seen_at).getTime();
    if (!isNaN(lastSeenTime)) {
      const diff = Date.now() - lastSeenTime;
      if (diff >= 0 && diff <= ONLINE_THRESHOLD_MS) {
        return "Online";
      }
    }
  }

  return "Offline";
};

export const formatBarangayLabel = (b: Barangay) => {
  const parts = [b.barangay_name, b.municipality, b.province].filter(Boolean);
  return parts.join(" – ");
};

