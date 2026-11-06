export type TriageView = "pending" | "inProgress" | "closed";

interface TriageStatisticsProps {
  counts: Record<TriageView, number>;
  selectedView: TriageView;
  onViewChange: (view: TriageView) => void;
}

export default function TriageStatistics({
  counts,
  selectedView,
  onViewChange,
}: TriageStatisticsProps) {
  const cards = [
    {
      label: "Pending",
      value: counts.pending,
      view: "pending" as const,
    },
    {
      label: "Total Assigned / In Progress",
      value: counts.inProgress,
      view: "inProgress" as const,
    },
    {
      label: "Completed / Cancelled",
      value: counts.closed,
      view: "closed" as const,
    },
  ];

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      role="group"
      aria-label="Action status"
    >
      {cards.map(({ label, value, view }) => {
        const selected = selectedView === view;

        return (
          <button
            key={view}
            type="button"
            aria-pressed={selected}
            onClick={() => onViewChange(view)}
            className={`relative flex min-h-20 min-w-0 w-full items-center overflow-hidden rounded-lg border bg-white px-2.5 py-3 text-left shadow-xs transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-24 sm:px-5 sm:py-4 ${
              selected
                ? "border-emerald-600 ring-1 ring-emerald-600"
                : "border-slate-200"
            }`}
          >
            <span
              className={`absolute inset-x-0 top-0 h-1 ${selected ? "bg-emerald-600" : "bg-slate-200"}`}
            />
            <span className="min-w-0">
              <span className="block text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-xs sm:tracking-wider">
                {label}
              </span>
              <span className="mt-1 block text-xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                {value}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
