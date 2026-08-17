import type { UserName, Barangay, OvitrapDevice } from "@/types/device.types";

export const formatDeployedBy = (user: UserName | null) => {
  if (!user?.first_name || !user?.last_name) return "—";
  return `${user.first_name.charAt(0).toUpperCase()}. ${user.last_name}`;
};

export const isDeviceActive = (device: OvitrapDevice) => {
  if (!device) return false;
  const statusName = Array.isArray(device.device_statuses)
    ? (device.device_statuses as any)[0]?.status_name
    : device.device_statuses?.status_name;
  return statusName === "Active";
};

export const formatBarangayLabel = (b: Barangay) => {
  const parts = [b.barangay_name, b.municipality, b.province].filter(Boolean);
  return parts.join(" – ");
};
