import type { UserName, Barangay, OvitrapDevice } from "../types/device";

export const formatDeployedBy = (user: UserName | null) => {
  if (!user?.first_name || !user?.last_name) return "—";
  return `${user.first_name.charAt(0).toUpperCase()}. ${user.last_name}`;
};

export const isDeviceActive = (device: OvitrapDevice) =>
  device.device_statuses?.status_name === "Active";

export const formatBarangayLabel = (b: Barangay) => {
  const parts = [b.barangay_name, b.municipality, b.province].filter(Boolean);
  return parts.join(" – ");
};