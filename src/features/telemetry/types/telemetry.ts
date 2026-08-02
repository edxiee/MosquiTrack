export interface TelemetryReading {
  id: string;
  captured_at: string;
  egg_count: number | null;
  image_path: string | null;
  ai_confidence: number | null;
  battery_level: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  device_id: string;
  device_code: string;
  barangay_name: string | null;
  status_name: string | null;
}

export interface TelemetryFilterValues {
  search: string;
  barangay: string; // barangay_name, or "all"
  status: string; // status_name, or "all"
  dateFrom: string; // "YYYY-MM-DD", or ""
  dateTo: string; // "YYYY-MM-DD", or ""
}

export interface TelemetryStats {
  totalReadings: number;
  onlineDevices: number;
  offlineDevices: number;
  avgTemperature: number | null;
  avgHumidity: number | null;
}