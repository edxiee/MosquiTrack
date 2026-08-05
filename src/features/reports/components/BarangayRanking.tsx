import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarangayRankingEntry } from "../types/reports.types";

interface BarangayRankingProps {
  entries: BarangayRankingEntry[];
  isLoading: boolean;
}

export default function BarangayRanking({
  entries,
  isLoading,
}: BarangayRankingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Barangay Risk Ranking</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Loading ranking...
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No risk assessments available.
          </p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry, index) => (
              <li
                key={entry.barangayId}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{entry.barangayName}</p>
                    <p className="text-xs text-muted-foreground">
                      Assessed{" "}
                      {new Date(entry.assessmentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {entry.calculatedScore !== null && (
                    <span className="text-sm text-muted-foreground">
                      Score: {entry.calculatedScore}
                    </span>
                  )}
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: entry.riskLevelColor }}
                  >
                    {entry.riskLevelName}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}