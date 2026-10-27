export type DateRangePreset = "7d" | "30d" | "quarter";

export interface ReportsFilterValues {
  dateFrom: string; // "YYYY-MM-DD", or ""
  dateTo: string; // "YYYY-MM-DD", or ""
  barangay: string; // barangay_id or barangay_name, or "all"
  device: string; // device_code, or "all"
  status: string; // device status_name, or "all"
}

export interface RawTelemetryRow {
  captured_at: string;
  temperature_c: number | null;
  humidity_percent: number | null;
  mosquito_count: number | null;
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
  avgMosquitoCount: number | null;
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

// ─── Epidemiological Reports & Analytics Types ───────────────────────────────

export interface EpidemiologicalKpis {
  avgDvi: number;
  dviTrendPct: number;
  totalConfirmedVectors: number;
  vectorsTrendPct: number | null;
  totalReadingsCount: number;
  criticalHighRiskZones: number;
  criticalCount: number;
  highRiskCount: number;
  triageCompletionRate: number;
  completedTriageCount: number;
  totalTriageCount: number;
  activeDeployedTraps: number;
  periodDays: number;
}

export interface InterventionMarker {
  id: string;
  date: string; // "YYYY-MM-DD"
  type: "Solution Misting" | "Clean-up Drive" | "Monitoring Personnel";
  barangayName: string;
  title: string;
  status: string;
}

export interface VectorGrowthTrendPoint {
  date: string; // "YYYY-MM-DD"
  label: string; // e.g. "Oct 14"
  mosquitoCount: number;
  dvi: number;
  readingsCount: number;
  interventions: InterventionMarker[];
  hasIntervention: boolean;
}

export interface InterventionDistributionItem {
  category: "Solution Misting" | "Clean-up Drive" | "Monitoring Personnel";
  count: number;
  completedCount: number;
  percentage: number;
  color: string;
}

export interface BarangayRiskTableRow {
  rank: number;
  barangayId: string;
  barangayName: string;
  municipality?: string | null;
  activeTraps: number;
  totalTraps: number;
  totalDetections: number;
  calculatedScoreDvi: number;
  riskLevelName: string;
  displayColor: string;
  riskPriority: number;
  trend7DayPct: number | null;
  recent7DayCount: number;
  prev7DayCount: number;
  lastAssessedAt: string | null;
}

export interface EpidemiologicalReportData {
  municipality: string | null;
  barangayOptions: Array<{ id: string; name: string }>;
  kpis: EpidemiologicalKpis;
  vectorTrend: VectorGrowthTrendPoint[];
  interventions: InterventionMarker[];
  interventionDistribution: InterventionDistributionItem[];
  barangayRankings: BarangayRiskTableRow[];
}
