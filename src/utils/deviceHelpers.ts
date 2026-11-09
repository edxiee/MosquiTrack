import type { UserName, Barangay, OvitrapDevice } from "@/types/device.types";

export const formatDeployedBy = (user: UserName | null) => {
  if (!user?.first_name || !user?.last_name) return "—";
  return `${user.first_name.charAt(0).toUpperCase()}. ${user.last_name}`;
};

export const ONLINE_THRESHOLD_MINUTES = 16;
export const ONLINE_THRESHOLD_MS = ONLINE_THRESHOLD_MINUTES * 60 * 1000;

export function isTrapInStorage(device: any): boolean {
  if (!device) return false;

  // 1. Check operational_status
  const op = String(device.operational_status || "").trim().toLowerCase();
  if (op === "in storage" || op === "in_storage") return true;

  // 2. Check device_status_name or device_statuses
  const rawStatus = Array.isArray(device.device_statuses)
    ? device.device_statuses[0]?.status_name
    : device.device_statuses?.status_name;
  const sName = String(device.device_status_name || rawStatus || device.status || "").trim().toLowerCase();
  if (sName === "in storage" || sName === "in_storage") return true;

  return false;
}

export function isTrapDeployed(device: any): boolean {
  if (!device) return false;

  if (isTrapInStorage(device)) return false;

  // 1. Check operational_status
  const op = String(device.operational_status || "").trim().toLowerCase();
  if (op === "deployed") return true;
  if (op === "pending") return false;

  // 2. Check status name
  const rawStatus = Array.isArray(device.device_statuses)
    ? device.device_statuses[0]?.status_name
    : device.device_statuses?.status_name;
  const sName = String(device.device_status_name || rawStatus || device.status || "").trim().toLowerCase();
  if (sName === "pending") return false;

  // 3. Coordinate check
  const lat = Number(device.latitude ?? device.lat);
  const lng = Number(device.longitude ?? device.lng);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  return hasCoords;
}

export function getTrapDisplayStatus(
  device: any
): "Online" | "Offline" | "Offline (In Storage)" | "Maintenance" {
  if (!device) return "Offline";

  if (isTrapInStorage(device) || !isTrapDeployed(device)) {
    return "Offline (In Storage)";
  }

  return getDeviceStatusName(device);
}

export const isDeviceActive = (device: OvitrapDevice | null | undefined): boolean => {
  return getDeviceStatusName(device) === "Online";
};

export const getDeviceStatusName = (device: OvitrapDevice | null | undefined): "Online" | "Offline" | "Maintenance" => {
  if (!device) return "Offline";
  if (isTrapInStorage(device) || !isTrapDeployed(device)) return "Offline";

  // 1. Direct status column from ovitrap_devices table
  if (device.status) {
    const s = device.status.toLowerCase();
    if (s === "active" || s === "online") return "Online";
    if (s === "maintenance") return "Maintenance";
    if (s === "offline") return "Offline";
  }

  // 2. device_statuses join
  const rawStatus = Array.isArray(device.device_statuses)
    ? (device.device_statuses as any)[0]?.status_name
    : device.device_statuses?.status_name;

  if (rawStatus === "Maintenance") return "Maintenance";

  // 3. Fallback based on last_seen_at
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

/** Returns the next Trap ID based on existing device codes (e.g. TRAP-001 → TRAP-002) */
export function getNextDeviceCode(devices: { device_code?: string | null }[]): string {
  let maxNum = 0;

  for (const d of devices) {
    const code = d.device_code?.trim() ?? "";
    // Matches TRAP-001, TRAP-12, trap-003, etc.
    const match = code.match(/^TRAP-(\d+)$/i);

    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const next = maxNum + 1;
  return `TRAP-${String(next).padStart(3, "0")}`;
}