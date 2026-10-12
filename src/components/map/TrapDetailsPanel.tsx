import { useEffect, useState } from "react";
import {
  BatteryMedium,
  Bug,
  CalendarDays,
  Cpu,
  Droplets,
  MapPin,
  Radio,
  StickyNote,
  Thermometer,
  User,
  X,
} from "lucide-react";

import type { OvitrapDevice } from "@/types/device.types";
import {
  getDeviceReadings,
  type DeviceReadingSummary,
} from "@/services/telemetry.service";
import { formatRelativeTime, formatTelemetryTimestamp } from "@/utils/dateHelpers";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Online: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Maintenance: "bg-amber-50 text-amber-700 ring-amber-200",
  Offline: "bg-rose-50 text-rose-700 ring-rose-200",
};

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="text-sm text-slate-800 break-words">{children}</div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function TrapDetailsPanel({
  trap,
  onClose,
}: {
  trap: OvitrapDevice;
  onClose: () => void;
}) {
  const [readings, setReadings] = useState<DeviceReadingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeviceReadings(trap.id, 14)
      .then((rows) => {
        if (!cancelled) setReadings(rows);
      })
      .catch((err) => {
        console.error("Failed to load trap readings:", err);
        if (!cancelled) setReadings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trap.id]);

  const status = trap.device_statuses?.status_name ?? "Unknown";
  const latest = readings[0];
  const lastActivity = latest?.captured_at ?? trap.last_seen_at;
  const deployer = [trap.users?.first_name, trap.users?.last_name]
    .filter(Boolean)
    .join(" ");

  // oldest -> newest for the sparkline bars
  const bars = [...readings].reverse();
  const maxCount = Math.max(1, ...bars.map((r) => r.mosquito_count ?? 0));

  return (
    <aside
      aria-label={`Details for trap ${trap.device_code}`}
      className="flex h-full w-full flex-col overflow-hidden border-l border-slate-200 bg-white md:w-96"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Smart Ovi Trap
          </p>
          <h2 className="mt-0.5 truncate text-xl font-bold text-slate-900">
            {trap.device_code}
          </h2>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}
          >
            {status}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close trap details"
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {trap.description && (
          <p className="text-sm text-slate-600">{trap.description}</p>
        )}

        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Latest reading
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !latest ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
              No readings recorded for this trap yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  icon={Bug}
                  label="Mosquitoes"
                  value={latest.mosquito_count != null ? String(latest.mosquito_count) : "—"}
                />
                <Stat
                  icon={BatteryMedium}
                  label="Battery"
                  value={latest.battery_level != null ? `${latest.battery_level}%` : "—"}
                />
                <Stat
                  icon={Thermometer}
                  label="Temp"
                  value={latest.temperature_c != null ? `${latest.temperature_c}°C` : "—"}
                />
                <Stat
                  icon={Droplets}
                  label="Humidity"
                  value={
                    latest.humidity_percent != null ? `${latest.humidity_percent}%` : "—"
                  }
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Captured {formatTelemetryTimestamp(latest.captured_at)}
              </p>
            </>
          )}
        </section>

        {bars.length > 1 && (
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Mosquito count, last {bars.length} readings
            </h3>
            <div className="flex h-24 items-end gap-1 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              {bars.map((r) => {
                const v = r.mosquito_count ?? 0;
                return (
                  <div
                    key={r.id}
                    title={`${v} · ${formatTelemetryTimestamp(r.captured_at)}`}
                    className="flex-1 rounded-t bg-emerald-500/80 transition-all hover:bg-emerald-600"
                    style={{ height: `${Math.max(6, (v / maxCount) * 100)}%` }}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Trap information
          </h3>
          <div className="space-y-4">
            <InfoRow icon={MapPin} label="Location">
              {trap.barangays?.barangay_name ?? "Unknown barangay"}
              {trap.barangays?.municipality ? `, ${trap.barangays.municipality}` : ""}
              <span className="block text-xs text-slate-400">
                {Number(trap.latitude).toFixed(5)}, {Number(trap.longitude).toFixed(5)}
              </span>
            </InfoRow>
            <InfoRow icon={Radio} label="Last activity">
              {lastActivity ? formatRelativeTime(lastActivity) : "Never"}
            </InfoRow>
            <InfoRow icon={Cpu} label="Serial number">
              {trap.serial_number ?? "—"}
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Installed">
              {trap.installation_date
                ? new Date(trap.installation_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </InfoRow>
            <InfoRow icon={User} label="Deployed by">
              {deployer || "—"}
            </InfoRow>
            {trap.notes && (
              <InfoRow icon={StickyNote} label="Notes">
                {trap.notes}
              </InfoRow>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
