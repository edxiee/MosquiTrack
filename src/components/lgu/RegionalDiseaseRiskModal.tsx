import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { fetchRegionalRiskRanking } from "../../services/diseaseReports.service";
import type {
  MosquitoDisease,
  RegionalDiseaseRiskRow,
} from "../../types/diseaseReports.types";
import { cn } from "@/lib/utils";

const DISEASES: MosquitoDisease[] = [
  "Dengue",
  "Chikungunya",
  "Japanese Encephalitis",
];

function riskBadgeClass(level: string) {
  switch (level) {
    case "Critical":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Moderate":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

function RiskPctBar({ pct, level }: { pct: number; level: string }) {
  const bar =
    level === "Critical"
      ? "bg-rose-500"
      : level === "High"
        ? "bg-orange-500"
        : level === "Moderate"
          ? "bg-amber-500"
          : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-700 w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

export default function RegionalDiseaseRiskButton() {
  const [open, setOpen] = useState(false);
  const [disease, setDisease] = useState<MosquitoDisease>("Dengue");
  const [rows, setRows] = useState<RegionalDiseaseRiskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRegionalRiskRanking(disease);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load regional risk");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, disease]);

  const now = new Date();
  const currentMonthLabel = now.toLocaleString("en-US", { month: "long" });
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthLabel = next.toLocaleString("en-US", { month: "long" });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <ShieldAlert className="size-3.5 text-rose-600" />
        Regional Disease Risk
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0 rounded-2xl border border-slate-200 z-[5000]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Regional Disease Risk
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Current month ({currentMonthLabel}) and predicted next month (
                {nextMonthLabel}) risk by region. Based on historical case
                seasonality.
              </DialogDescription>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Disease tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
            {DISEASES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDisease(d)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  disease === d
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-[min(60vh,520px)] px-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading {disease} risk…
              </div>
            ) : error ? (
              <p className="px-5 py-10 text-center text-sm text-rose-600">{error}</p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No case data for {disease}.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Rank
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Region
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Cases
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {currentMonthLabel}
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {nextMonthLabel} (Predicted)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.region} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        #{r.rank}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[220px]">
                        <span className="line-clamp-2">{r.region}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                        {r.totalCases.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold",
                              riskBadgeClass(r.currentMonthRisk),
                            )}
                          >
                            {r.currentMonthRisk}
                          </Badge>
                          <RiskPctBar
                            pct={r.currentMonthRiskPct}
                            level={r.currentMonthRisk}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold",
                              riskBadgeClass(r.nextMonthRisk),
                            )}
                          >
                            {r.nextMonthRisk}
                          </Badge>
                          <RiskPctBar
                            pct={r.nextMonthRiskPct}
                            level={r.nextMonthRisk}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
            Risk % uses disease-specific thresholds on a seasonal score (60%
            historical month average + 40% last 3 years). Not a clinical
            forecast.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}