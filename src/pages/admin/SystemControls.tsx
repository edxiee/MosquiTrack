import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/errorHelpers";
import {
  DEFAULT_DEVICE_UUID,
  DEFAULT_DEVICE_CONFIG,
  fetchConfigurableDevices,
  fetchOrCreateDeviceConfig,
  saveDeviceConfig,
  queueDeviceReboot,
  normalizeDeviceConfig,
  type ConfigurableOvitrapDevice,
  type DeviceConfig,
} from "@/services/deviceConfig.service";

const INTERVAL_PRESETS = [
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
];

const ONLINE_WINDOW_MS = 16 * 60 * 1000;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-rose-600">{message}</p>;
}

export default function SystemControls() {
  const [devices, setDevices] = useState<ConfigurableOvitrapDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isActive, setIsActive] = useState(DEFAULT_DEVICE_CONFIG.is_active);
  const [intervalSeconds, setIntervalSeconds] = useState(
    DEFAULT_DEVICE_CONFIG.send_interval_ms / 1000
  );
  const [minFreqHz, setMinFreqHz] = useState(DEFAULT_DEVICE_CONFIG.min_freq_hz);
  const [maxFreqHz, setMaxFreqHz] = useState(DEFAULT_DEVICE_CONFIG.max_freq_hz);
  const [maxBeamBreakMs, setMaxBeamBreakMs] = useState(
    DEFAULT_DEVICE_CONFIG.max_beam_break_ms
  );
  const [forceReboot, setForceReboot] = useState(DEFAULT_DEVICE_CONFIG.force_reboot);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [deviceLastSeen, setDeviceLastSeen] = useState<string | null>(null);
  const [waitingForTrapSync, setWaitingForTrapSync] = useState(false);
  const [rebootCompleted, setRebootCompleted] = useState(false);
  const prevForceRebootRef = useRef(false);

  const applyConfigToState = useCallback((cfg: DeviceConfig) => {
    setIsActive(cfg.is_active);
    setIntervalSeconds(Math.max(5, Math.round(cfg.send_interval_ms / 1000)));
    setMinFreqHz(cfg.min_freq_hz);
    setMaxFreqHz(cfg.max_freq_hz);
    setMaxBeamBreakMs(cfg.max_beam_break_ms);
    setUpdatedAt(cfg.updated_at ?? null);

    if (prevForceRebootRef.current === true && cfg.force_reboot === false) {
      setRebootCompleted(true);
      toast.success("Device rebooted successfully");
    }
    prevForceRebootRef.current = cfg.force_reboot;
    setForceReboot(cfg.force_reboot);
  }, []);

  // Load devices
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingDevices(true);
      setError(null);
      try {
        const list = await fetchConfigurableDevices();
        if (!mounted) return;
        setDevices(list);
        if (list.length > 0) {
          const initial = list.find((d) => d.id === DEFAULT_DEVICE_UUID) ?? list[0]!;
          setSelectedDeviceId(initial.id);
          setDeviceLastSeen(initial.last_seen_at);
        }
      } catch (err) {
        if (!mounted) return;
        const msg = getErrorMessage(err, "Failed to load ovitrap devices.");
        setError(msg);
        toast.error(msg);
      } finally {
        if (mounted) setLoadingDevices(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const dev = devices.find((d) => d.id === selectedDeviceId);
    if (dev) setDeviceLastSeen(dev.last_seen_at);
  }, [selectedDeviceId, devices]);

  const loadDeviceConfig = useCallback(
    async (deviceId: string, silent = false) => {
      if (!deviceId) return;
      if (!silent) {
        setLoadingConfig(true);
        setError(null);
        setRebootCompleted(false);
      }
      try {
        const cfg = await fetchOrCreateDeviceConfig(deviceId);
        if (!silent) prevForceRebootRef.current = cfg.force_reboot;
        applyConfigToState(cfg);
      } catch (err) {
        const msg = getErrorMessage(err, "Failed to load device configuration.");
        if (!silent) {
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!silent) setLoadingConfig(false);
      }
    },
    [applyConfigToState]
  );

  const refreshDeviceLastSeen = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    try {
      const { data } = await supabase
        .from("ovitrap_devices")
        .select("last_seen_at")
        .eq("id", deviceId)
        .maybeSingle();
      if (data?.last_seen_at) {
        setDeviceLastSeen(data.last_seen_at);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, last_seen_at: data.last_seen_at } : d
          )
        );
      }
    } catch {
      // non-critical
    }
  }, []);

  // Config + device realtime
  useEffect(() => {
    if (!selectedDeviceId) return;
    loadDeviceConfig(selectedDeviceId, false);
    refreshDeviceLastSeen(selectedDeviceId);

    const configChannel = supabase
      .channel(`device_configs_${selectedDeviceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "device_configs",
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            applyConfigToState(
              normalizeDeviceConfig(payload.new as Record<string, any>, selectedDeviceId)
            );
          }
        }
      )
      .subscribe();

    const deviceChannel = supabase
      .channel(`device_sync_${selectedDeviceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ovitrap_devices",
          filter: `id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          const seen = (payload.new as any)?.last_seen_at;
          if (seen) setDeviceLastSeen(seen);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ovitrap_readings",
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          const ts =
            (payload.new as any)?.captured_at ||
            (payload.new as any)?.created_at ||
            new Date().toISOString();
          setDeviceLastSeen(ts);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(deviceChannel);
    };
  }, [selectedDeviceId, loadDeviceConfig, applyConfigToState, refreshDeviceLastSeen]);

  // Trap has pulled the config if it reported in after the last save
  const isTrapSynchronized = (() => {
    if (!updatedAt) return true;
    if (!deviceLastSeen) return false;
    return new Date(deviceLastSeen).getTime() >= new Date(updatedAt).getTime() - 2000;
  })();

  useEffect(() => {
    if (waitingForTrapSync && isTrapSynchronized) {
      setWaitingForTrapSync(false);
      toast.success("Trap applied the new configuration");
    }
  }, [waitingForTrapSync, isTrapSynchronized]);

  useEffect(() => {
    if (!selectedDeviceId || !waitingForTrapSync) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refreshDeviceLastSeen(selectedDeviceId);
    }, 4000);
    return () => clearInterval(t);
  }, [selectedDeviceId, waitingForTrapSync, refreshDeviceLastSeen]);

  useEffect(() => {
    if (!selectedDeviceId || !forceReboot) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") loadDeviceConfig(selectedDeviceId, true);
    }, 5000);
    return () => clearInterval(t);
  }, [selectedDeviceId, forceReboot, loadDeviceConfig]);

  // Validation
  const freqError = (() => {
    if (Number.isNaN(minFreqHz) || Number.isNaN(maxFreqHz))
      return "Frequencies must be valid numbers.";
    if (minFreqHz < 100 || minFreqHz > 2000 || maxFreqHz < 100 || maxFreqHz > 2000)
      return "Frequencies must be between 100 and 2000 Hz.";
    if (minFreqHz >= maxFreqHz) return "Minimum must be lower than maximum.";
    return null;
  })();
  const intervalError =
    Number.isNaN(intervalSeconds) || intervalSeconds < 5
      ? "Interval must be at least 5 seconds."
      : null;
  const beamError =
    Number.isNaN(maxBeamBreakMs) || maxBeamBreakMs < 20 || maxBeamBreakMs > 500
      ? "Beam break must be between 20 and 500 ms."
      : null;
  const hasErrors = Boolean(freqError || intervalError || beamError);

  const isOnline =
    !!deviceLastSeen && Date.now() - new Date(deviceLastSeen).getTime() <= ONLINE_WINDOW_MS;

  const handleSave = async () => {
    if (!selectedDeviceId) return;
    if (hasErrors) {
      toast.error(freqError || intervalError || beamError || "Fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveDeviceConfig({
        device_id: selectedDeviceId,
        send_interval_ms: Math.max(5000, Math.round(intervalSeconds * 1000)),
        min_freq_hz: Number(minFreqHz),
        max_freq_hz: Number(maxFreqHz),
        max_beam_break_ms: Math.min(500, Math.max(20, Math.round(maxBeamBreakMs))),
        is_active: isActive,
        force_reboot: forceReboot,
      });
      applyConfigToState(saved);
      setWaitingForTrapSync(true);
      toast.success("Configuration saved", {
        description: isOnline
          ? "Waiting for the trap's next check-in to apply it."
          : "Trap is offline. It will apply changes when it reconnects.",
      });
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to save device configuration.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleQueueReboot = async () => {
    if (!selectedDeviceId) return;
    setRebooting(true);
    setRebootCompleted(false);
    setError(null);
    try {
      prevForceRebootRef.current = true;
      const updated = await queueDeviceReboot(selectedDeviceId);
      applyConfigToState(updated);
      toast.warning("Reboot queued. Waiting for the trap's next sync.");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to queue remote reboot.");
      setError(msg);
      toast.error(msg);
    } finally {
      setRebooting(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;
  const intervalMs = Math.round((intervalSeconds || 0) * 1000);

  const syncLabel = waitingForTrapSync
    ? "Saved. Waiting for trap to check in"
    : isTrapSynchronized
    ? "In sync with trap"
    : "Pending next trap check-in";
  const syncDot = waitingForTrapSync
    ? "bg-amber-500"
    : isTrapSynchronized
    ? "bg-emerald-500"
    : "bg-slate-300";

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900">
            <Sliders className="size-8 text-emerald-600" />
            IoT System Controls
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure ovitrap sensors remotely. No reflashing required.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => selectedDeviceId && loadDeviceConfig(selectedDeviceId, false)}
          disabled={!selectedDeviceId || loadingConfig}
          className="border-slate-200 text-slate-600"
        >
          <RefreshCw className={`size-4 ${loadingConfig ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* Device */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="device-select" className="text-sm font-semibold text-slate-900">
          Device
        </label>
        {loadingDevices ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading devices
          </div>
        ) : devices.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No devices registered. Add one in Trap Management first.
          </p>
        ) : (
          <>
            <select
              id="device-select"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={loadingConfig || saving}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {devices.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.device_code}
                  {" · "}
                  {dev.barangay_name || dev.description || "Unassigned"}
                </option>
              ))}
            </select>
            {selectedDevice && (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`size-1.5 rounded-full ${
                      isOnline ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {isOnline ? "Online" : "Offline"}
                </span>
                <span>
                  Last seen{" "}
                  {deviceLastSeen ? new Date(deviceLastSeen).toLocaleString() : "never"}
                </span>
                <span className="font-mono text-slate-400">
                  {selectedDevice.id.slice(0, 8)}
                </span>
              </p>
            )}
          </>
        )}
      </section>

      {loadingConfig ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="size-4 animate-spin" /> Loading configuration
        </div>
      ) : (
        selectedDeviceId && (
          <>
            <Section
              title="Sensor detection"
              description="Pause or resume the IR beam and microphone on the ESP32."
            >
              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  isActive ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"
                }`}
              >
                <label htmlFor="sensor-toggle" className="cursor-pointer text-sm text-slate-900">
                  {isActive ? "Active" : "Paused"}
                </label>
                <Switch id="sensor-toggle" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </Section>

            <Section
              title="Upload interval"
              description="How often the trap sends readings to Supabase. Minimum 5 seconds."
            >
              <div className="flex flex-wrap gap-1.5">
                {INTERVAL_PRESETS.map((p) => {
                  const selected = intervalSeconds === p.seconds;
                  return (
                    <button
                      key={p.seconds}
                      type="button"
                      onClick={() => setIntervalSeconds(p.seconds)}
                      className={`h-8 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        selected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  step={1}
                  aria-label="Custom interval in seconds"
                  value={intervalSeconds}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setIntervalSeconds(Number.isNaN(v) ? 0 : v);
                  }}
                  className="w-28"
                />
                <span className="text-sm text-slate-500">
                  seconds · {intervalMs.toLocaleString()} ms
                </span>
              </div>
              <FieldError message={intervalError} />
            </Section>

            <Section
              title="Wingbeat frequency"
              description="Acoustic range used to classify mosquito wingbeats (100–2000 Hz)."
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="min-freq" className="mb-1 block text-xs text-slate-500">
                    Min (Hz)
                  </label>
                  <Input
                    id="min-freq"
                    type="number"
                    min={100}
                    max={2000}
                    step={10}
                    value={minFreqHz}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMinFreqHz(Number.isNaN(v) ? 0 : v);
                    }}
                    className="w-28"
                  />
                </div>
                <span className="pb-2 text-slate-300">–</span>
                <div>
                  <label htmlFor="max-freq" className="mb-1 block text-xs text-slate-500">
                    Max (Hz)
                  </label>
                  <Input
                    id="max-freq"
                    type="number"
                    min={100}
                    max={2000}
                    step={10}
                    value={maxFreqHz}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMaxFreqHz(Number.isNaN(v) ? 0 : v);
                    }}
                    className="w-28"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setMinFreqHz(300);
                    setMaxFreqHz(700);
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
                >
                  Reset to 300–700 Hz
                </Button>
              </div>
              <FieldError message={freqError} />
            </Section>

            <Section
              title="Beam break limit"
              description="Longer beam breaks are ignored as debris or crawling insects."
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={20}
                  max={500}
                  step={5}
                  aria-label="Maximum beam break duration"
                  value={Math.min(500, Math.max(20, maxBeamBreakMs || 20))}
                  onChange={(e) => setMaxBeamBreakMs(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={20}
                    max={500}
                    aria-label="Maximum beam break in milliseconds"
                    value={maxBeamBreakMs}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setMaxBeamBreakMs(Number.isNaN(v) ? 0 : v);
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-500">ms</span>
                </div>
              </div>
              <FieldError message={beamError} />
            </Section>

            <Section
              title="Remote reboot"
              description="Restart the ESP32 on its next sync. The trap clears the flag when done."
            >
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQueueReboot}
                  disabled={rebooting || forceReboot}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                >
                  {rebooting && <Loader2 className="size-4 animate-spin" />}
                  {forceReboot ? "Rebooting" : "Reboot"}
                </Button>
                {forceReboot ? (
                  <span className="flex items-center gap-2 text-sm text-amber-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                    Reboot queued, waiting for ESP32 next sync cycle
                  </span>
                ) : rebootCompleted ? (
                  <span className="text-sm text-emerald-700">
                    Device rebooted successfully
                  </span>
                ) : null}
              </div>
            </Section>

            {/* Save bar */}
            <div className="sticky bottom-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="flex items-center gap-2 text-slate-700">
                  <span className={`size-1.5 rounded-full ${syncDot}`} />
                  {syncLabel}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {updatedAt
                    ? `Last saved ${new Date(updatedAt).toLocaleString()}`
                    : "Not saved yet"}
                  {" · "}Changes apply on the trap's next upload cycle.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || hasErrors}
                className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving" : "Save configuration"}
              </Button>
            </div>
          </>
        )
      )}
    </div>
  );
}
