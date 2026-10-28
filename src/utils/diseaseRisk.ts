// src/utils/diseaseRisk.ts
import type {
  DiseaseCaseRow,
  DiseaseRiskLevel,
  MosquitoDisease,
  RegionalDiseaseRiskRow,
} from "@/types/diseaseReports.types";

type ThresholdBand = {
  maxScore: number;
  minPct: number;
  maxPct: number;
  level: DiseaseRiskLevel;
};

const THRESHOLDS: Record<MosquitoDisease, ThresholdBand[]> = {
  Dengue: [
    { maxScore: 700, minPct: 0, maxPct: 24, level: "Low" },
    { maxScore: 2000, minPct: 25, maxPct: 49, level: "Moderate" },
    { maxScore: 4000, minPct: 50, maxPct: 74, level: "High" },
    { maxScore: Infinity, minPct: 75, maxPct: 100, level: "Critical" },
  ],
  Chikungunya: [
    { maxScore: 5, minPct: 0, maxPct: 24, level: "Low" },
    { maxScore: 20, minPct: 25, maxPct: 49, level: "Moderate" },
    { maxScore: 50, minPct: 50, maxPct: 74, level: "High" },
    { maxScore: Infinity, minPct: 75, maxPct: 100, level: "Critical" },
  ],
  "Japanese Encephalitis": [
    { maxScore: 0, minPct: 0, maxPct: 24, level: "Low" },
    { maxScore: 2, minPct: 25, maxPct: 49, level: "Moderate" },
    { maxScore: 5, minPct: 50, maxPct: 74, level: "High" },
    { maxScore: Infinity, minPct: 75, maxPct: 100, level: "Critical" },
  ],
};

/** Average cases for a region in a given calendar month (sum weeks → per year, then average). */
function monthScore(
  rows: DiseaseCaseRow[],
  region: string,
  month: number,
): number {
  const monthRows = rows.filter(
    (r) => r.region === region && r.month === month,
  );
  if (monthRows.length === 0) return 0;

  const byYear = new Map<number, number>();
  for (const r of monthRows) {
    byYear.set(r.year, (byYear.get(r.year) ?? 0) + r.cases);
  }

  const yearlyTotals = Array.from(byYear.entries());
  if (yearlyTotals.length === 0) return 0;

  const seasonalAvg =
    yearlyTotals.reduce((sum, [, c]) => sum + c, 0) / yearlyTotals.length;

  const maxYear = Math.max(...yearlyTotals.map(([y]) => y));
  const recent = yearlyTotals.filter(([y]) => y >= maxYear - 2);
  const recentAvg =
    recent.length === 0
      ? seasonalAvg
      : recent.reduce((sum, [, c]) => sum + c, 0) / recent.length;

  return Number((0.6 * seasonalAvg + 0.4 * recentAvg).toFixed(2));
}

function scoreToRiskPctAndLevel(
  disease: MosquitoDisease,
  score: number,
): { pct: number; level: DiseaseRiskLevel } {
  const bands = THRESHOLDS[disease];
  let prevMax = 0;

  for (const band of bands) {
    if (score <= band.maxScore) {
      const span =
        band.maxScore === Infinity
          ? Math.max(score - prevMax, 1)
          : band.maxScore - prevMax;

      const t =
        band.maxScore === Infinity
          ? Math.min(1, (score - prevMax) / (prevMax + 50 || 50))
          : span <= 0
            ? 1
            : (score - prevMax) / span;

      const pct = Number(
        (band.minPct + t * (band.maxPct - band.minPct)).toFixed(1),
      );

      return {
        pct: Math.max(0, Math.min(100, pct)),
        level: band.level,
      };
    }
    if (band.maxScore !== Infinity) prevMax = band.maxScore;
  }

  return { pct: 100, level: "Critical" };
}

export function buildRegionalRiskRanking(
  rows: DiseaseCaseRow[],
  disease: MosquitoDisease,
  asOf: Date = new Date(),
): RegionalDiseaseRiskRow[] {
  const currentMonth = asOf.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  const diseaseRows = rows.filter((r) => r.disease === disease);

  const totals = new Map<string, number>();
  for (const r of diseaseRows) {
    totals.set(r.region, (totals.get(r.region) ?? 0) + r.cases);
  }

  return Array.from(totals.keys())
    .map((region) => {
      const currentMonthScore = monthScore(diseaseRows, region, currentMonth);
      const nextMonthScore = monthScore(diseaseRows, region, nextMonth);
      const current = scoreToRiskPctAndLevel(disease, currentMonthScore);
      const next = scoreToRiskPctAndLevel(disease, nextMonthScore);

      return {
        region,
        totalCases: totals.get(region) ?? 0,
        currentMonthScore,
        currentMonthRiskPct: current.pct,
        currentMonthRisk: current.level,
        nextMonthScore,
        nextMonthRiskPct: next.pct,
        nextMonthRisk: next.level,
      };
    })
    .sort((a, b) => b.currentMonthRiskPct - a.currentMonthRiskPct)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}