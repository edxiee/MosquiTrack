export type DangerTier = "Low" | "Moderate" | "High" | "Critical";

export function getDangerTier(
  count: number | null | undefined,
  consecutiveCriticalDays = 0,
): DangerTier {
  const dailyCount = count ?? 0;

  if (consecutiveCriticalDays >= 3) return "Critical";
  if (dailyCount >= 30) {
    return "High";
  }
  if (dailyCount >= 16) return "High";
  if (dailyCount >= 6) return "Moderate";
  return "Low";
}

export function getConsecutiveCriticalDays(
  dailyCounts: readonly number[],
): number {
  let days = 0;
  for (const count of dailyCounts) {
    if (count < 30) break;
    days += 1;
  }
  return days;
}