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
  // Mocked fields for Raw Telemetry Hub
  upload_status?: "Success" | "Failed" | "Retrying";
  http_response?: number;
  latency_ms?: number;
  lte_signal?: string;
}

export interface TelemetryFilterValues {
  search: string;
  barangay: string; // barangay_name, or "all"
  uploadStatus: string; // "Success", "Failed", "Retrying", or "all"
  dateFrom: string; // "YYYY-MM-DD", or ""
  dateTo: string; // "YYYY-MM-DD", or ""
}

export interface TelemetryStats {
  totalPacketsToday: number;
  successfulUploads: number;
  failedUploads: number;
  latestPacketTime: string | null;
  avgUploadInterval: string;
}
