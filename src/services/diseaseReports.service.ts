import { supabase } from "@/lib/supabase";
import type {
  DiseaseCaseRow,
  MosquitoDisease,
  RegionalDiseaseRiskRow,
} from "@/types/diseaseReports.types";
import { buildRegionalRiskRanking } from "../utils/diseaseRisk";

export async function fetchDiseaseCases(
  disease: MosquitoDisease,
): Promise<DiseaseCaseRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: DiseaseCaseRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("disease_case_reports")
      .select("disease, year, region, month, morbidity_week, cases")
      .eq("disease", disease)
      .order("year", { ascending: true })
      .order("region", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    for (const r of batch) {
      all.push({
        disease: r.disease as MosquitoDisease,
        year: Number(r.year),
        region: String(r.region),
        month: Number(r.month),
        morbidity_week:
          r.morbidity_week == null ? null : Number(r.morbidity_week),
        cases: Number(r.cases) || 0,
      });
    }

    if (batch.length < pageSize) break; // last page
    from += pageSize;
  }

  return all;
}

export async function fetchRegionalRiskRanking(
  disease: MosquitoDisease,
): Promise<RegionalDiseaseRiskRow[]> {
  const rows = await fetchDiseaseCases(disease);
  return buildRegionalRiskRanking(rows, disease, new Date());
}