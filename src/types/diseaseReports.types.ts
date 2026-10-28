export type MosquitoDisease =
  | "Dengue"
  | "Chikungunya"
  | "Japanese Encephalitis";

export type DiseaseRiskLevel = "Low" | "Moderate" | "High" | "Critical";

export interface DiseaseCaseRow {
  disease: MosquitoDisease;
  year: number;
  region: string;
  month: number;
  morbidity_week: number | null;
  cases: number;
}

export interface RegionalDiseaseRiskRow {
  rank: number;
  region: string;
  totalCases: number;
  currentMonthScore: number;
  currentMonthRiskPct: number;
  currentMonthRisk: DiseaseRiskLevel;
  nextMonthScore: number;
  nextMonthRiskPct: number;
  nextMonthRisk: DiseaseRiskLevel;
}