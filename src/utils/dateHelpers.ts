/**
 * Utility functions for formatting database timestamps in MosquiTrack telemetry console.
 */

/** Formats ISO timestamp string into local date & time (e.g., "Aug 18, 2026, 04:15:22 AM") */
export function formatTelemetryTimestamp(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** Formats ISO timestamp string into compact YYYY-MM-DD HH:mm:ss format */
export function formatTimestampCompact(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
