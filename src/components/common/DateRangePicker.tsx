import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  dateFrom: string; // "YYYY-MM-DD" or ""
  dateTo: string; // "YYYY-MM-DD" or ""
  onRangeChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
}

function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYMD(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    isNaN(y) ||
    isNaN(m) ||
    isNaN(d)
  ) {
    return null;
  }
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str: string): string {
  const d = parseYMD(str);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onRangeChange,
  className,
  placeholder = "Filter by date range...",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  // Determine initial view year and month
  const initialDate = useMemo(() => {
    return parseYMD(dateFrom) || parseYMD(dateTo) || new Date();
  }, [dateFrom, dateTo]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync view when opening
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const base = parseYMD(dateFrom) || parseYMD(dateTo) || new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setHoverDate(null);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] =
      [];

    // Empty padding cells for previous month days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dateStr: "", dayNum: 0, isCurrentMonth: false });
    }

    // Days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      days.push({
        dateStr: formatYMD(date),
        dayNum: day,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Click on a date in calendar
  const handleDayClick = (dayStr: string) => {
    if (!dayStr) return;

    if (!dateFrom || (dateFrom && dateTo)) {
      // 1st click: set first date, reset second date
      onRangeChange(dayStr, "");
    } else if (dateFrom && !dateTo) {
      // 2nd click: set second date and form the range
      if (dayStr < dateFrom) {
        onRangeChange(dayStr, dateFrom);
      } else {
        onRangeChange(dateFrom, dayStr);
      }
      setHoverDate(null);
    }
  };

  // Quick preset shortcuts
  const applyPreset = (preset: "today" | "last7" | "last30" | "thisMonth") => {
    const today = new Date();
    const todayStr = formatYMD(today);

    switch (preset) {
      case "today":
        onRangeChange(todayStr, todayStr);
        break;
      case "last7": {
        const past7 = new Date();
        past7.setDate(today.getDate() - 6);
        onRangeChange(formatYMD(past7), todayStr);
        break;
      }
      case "last30": {
        const past30 = new Date();
        past30.setDate(today.getDate() - 29);
        onRangeChange(formatYMD(past30), todayStr);
        break;
      }
      case "thisMonth": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        onRangeChange(formatYMD(startOfMonth), formatYMD(endOfMonth));
        break;
      }
    }
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onRangeChange("", "");
    setHoverDate(null);
  };

  // Text label for the trigger button
  const triggerLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) {
        return formatDisplayDate(dateFrom);
      }
      return `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`;
    }
    if (dateFrom && !dateTo) {
      return `${formatDisplayDate(dateFrom)} – Pick end date`;
    }
    return placeholder;
  }, [dateFrom, dateTo, placeholder]);

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth]);

  const todayStr = useMemo(() => formatYMD(new Date()), []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer h-9.5",
            dateFrom
              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon
              className={cn(
                "size-3.5 shrink-0",
                dateFrom ? "text-emerald-600" : "text-slate-400"
              )}
            />
            <span className="truncate">{triggerLabel}</span>
          </div>

          {dateFrom && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear()}
              className="p-0.5 rounded-full hover:bg-emerald-200/60 text-emerald-800 transition-colors shrink-0"
              title="Clear date range"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[320px] p-0 rounded-2xl border-slate-200 shadow-xl bg-white overflow-hidden"
      >
        {/* Quick Range Presets Bar */}
        <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 font-medium transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last7")}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 font-medium transition-colors cursor-pointer"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last30")}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 font-medium transition-colors cursor-pointer"
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => applyPreset("thisMonth")}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 font-medium transition-colors cursor-pointer"
          >
            This month
          </button>
        </div>

        {/* Calendar Header: Month / Year & Prev / Next navigation */}
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="text-xs font-bold text-slate-800">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="px-3 grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <span
              key={d}
              className="text-[10px] font-semibold text-slate-400 uppercase py-1"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="px-3 pb-3 grid grid-cols-7 gap-y-1">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={`empty-${idx}`} className="h-8 w-full" />;
            }

            const { dateStr, dayNum } = item;
            const isToday = dateStr === todayStr;
            const isStart = dateStr === dateFrom;
            const isEnd = dateStr === dateTo;

            // In range between selected start and end
            const isInRange =
              dateFrom &&
              dateTo &&
              dateStr >= dateFrom &&
              dateStr <= dateTo;

            // In hover range preview when start is selected and end is pending
            const isInHoverRange =
              dateFrom &&
              !dateTo &&
              hoverDate &&
              ((hoverDate >= dateFrom &&
                dateStr >= dateFrom &&
                dateStr <= hoverDate) ||
                (hoverDate < dateFrom &&
                  dateStr >= hoverDate &&
                  dateStr <= dateFrom));

            const isHighlighted = isInRange || isInHoverRange;

            return (
              <div
                key={dateStr}
                className={cn(
                  "relative flex items-center justify-center h-8",
                  isHighlighted && "bg-emerald-50",
                  (isStart || (isInHoverRange && dateStr === dateFrom)) &&
                    "rounded-l-lg",
                  (isEnd || (isInHoverRange && dateStr === hoverDate)) &&
                    "rounded-r-lg"
                )}
                onMouseEnter={() => {
                  if (dateFrom && !dateTo) {
                    setHoverDate(dateStr);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    "size-7.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer",
                    isStart || isEnd
                      ? "bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700"
                      : isHighlighted
                      ? "text-emerald-900 font-semibold hover:bg-emerald-200/60"
                      : "text-slate-700 hover:bg-slate-100",
                    isToday && !isStart && !isEnd && "border border-emerald-400 font-bold text-emerald-700"
                  )}
                >
                  {dayNum}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Helper Bar & Clear / Done */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500">
            {!dateFrom && "Click to select start date"}
            {dateFrom && !dateTo && "Click to select end date"}
            {dateFrom && dateTo && (
              <span className="text-emerald-700 font-medium">
                {dateFrom === dateTo ? "1 day selected" : "Date range applied"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {dateFrom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 cursor-pointer"
              >
                <RotateCcw className="size-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
