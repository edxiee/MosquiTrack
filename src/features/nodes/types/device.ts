export interface DeviceStatus {
  id: string;
  status_name: string;
  description: string | null;
}

export interface UserName {
  first_name: string | null;
  last_name: string | null;
}

export interface Barangay {
  id: string;
  barangay_name: string;
  municipality: string | null;
  province: string | null;
}

export interface OvitrapDevice {
  id: string;
  device_code: string;
  serial_number: string | null;
  description: string | null;
  barangay_id: string | null;
  latitude: number | null;
  longitude: number | null;
  device_status_id: string;
  notes: string | null;
  installation_date: string | null;
  last_seen_at: string | null;
  created_at: string;
  deployed_by: string | null;
  device_statuses: DeviceStatus | null;
  users: UserName | null;
}

export interface DeviceFormData {
  device_code: string;
  serial_number: string;
  barangay_id: string;
  description: string;
  notes: string;
  device_status_id: string;
}