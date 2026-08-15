export interface ReportsFilterValues {
  dateFrom: string; // "YYYY-MM-DD", or ""
  dateTo: string; // "YYYY-MM-DD", or ""
  barangay: string; // barangay_name, or "all"
  device: string; // device_code, or "all"
  status: string; // device status_name, or "all"
}

export interface RawTelemetryRow {
  captured_at: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  egg_count: number | null;
  device_id: string;
  device_code: string;
  barangay_id: string | null;
  barangay_name: string | null;
}

export interface SummaryStats {
  totalReadings: number;
  activeDevices: number;
  offlineDevices: number;
  avgTemperature: number | null;
  avgHumidity: number | null;
  highRiskBarangays: number;
}

export interface TelemetryTrendPoint {
  date: string; // "YYYY-MM-DD"
  avgTemperature: number | null;
  avgHumidity: number | null;
  avgEggCount: number | null;
}

export interface BarangayRankingEntry {
  barangayId: string;
  barangayName: string;
  riskLevelName: string;
  riskLevelColor: string;
  riskPriority: number;
  calculatedScore: number | null;
  assessmentPeriodEnd: string;
}

export interface DeviceStatusSummaryEntry {
  statusName: string;
  count: number;
}
