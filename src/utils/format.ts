/**
 * Common formatting helpers for dates, numbers, currency, rates, and voltages.
 */

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export function formatVoltage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)} V`;
}

export function formatRate(value: number): string {
  return `${value.toFixed(1)} readings/min`;
}

export function formatCurrency(
  value: number | null | undefined,
  currency = "PHP"
): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat().format(value);
}

export function truncateText(text: string, maxLength = 30): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
