import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Sliders,
  Cpu,
  Radio,
  Clock,
  Activity,
  Zap,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  Waves,
  Gauge,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

interface IntervalPreset {
  label: string;
  seconds: number;
  ms: number;
}

const INTERVAL_PRESETS: IntervalPreset[] = [
  { label: "10s (Testing)", seconds: 10, ms: 10_000 },
  { label: "30s (Default)", seconds: 30, ms: 30_000 },
  { label: "1 min", seconds: 60, ms: 60_000 },
  { label: "5 min", seconds: 300, ms: 300_000 },
  { label: "15 min", seconds: 900, ms: 900_000 },
  { label: "30 min", seconds: 1800, ms: 1_800_000 },
  { label: "1 hr", seconds: 3600, ms: 3_600_000 },
];

export default function SystemControls() {
  const [devices, setDevices] = useState<ConfigurableOvitrapDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loadingDevices, setLoadingDevices] = useState<boolean>(true);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [rebooting, setRebooting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Editable form state
  const [isActive, setIsActive] = useState<boolean>(DEFAULT_DEVICE_CONFIG.is_active);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(
    DEFAULT_DEVICE_CONFIG.send_interval_ms / 1000
  );
  const [minFreqHz, setMinFreqHz] = useState<number>(DEFAULT_DEVICE_CONFIG.min_freq_hz);
  const [maxFreqHz, setMaxFreqHz] = useState<number>(DEFAULT_DEVICE_CONFIG.max_freq_hz);
  const [maxBeamBreakMs, setMaxBeamBreakMs] = useState<number>(
    DEFAULT_DEVICE_CONFIG.max_beam_break_ms
  );
  const [forceReboot, setForceReboot] = useState<boolean>(
    DEFAULT_DEVICE_CONFIG.force_reboot
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Live device telemetry tracking to verify if changes have reached the physical trap
  const [deviceLastSeen, setDeviceLastSeen] = useState<string | null>(null);
  const [waitingForTrapSync, setWaitingForTrapSync] = useState<boolean>(false);

  // Tracks when a queued reboot transitions from true -> false
  const [rebootCompletedBanner, setRebootCompletedBanner] = useState<boolean>(false);
  const prevForceRebootRef = useRef<boolean>(false);

  const applyConfigToState = useCallback((cfg: DeviceConfig) => {
    setIsActive(cfg.is_active);
    setIntervalSeconds(Math.max(5, Math.round(cfg.send_interval_ms / 1000)));
    setMinFreqHz(cfg.min_freq_hz);
    setMaxFreqHz(cfg.max_freq_hz);
    setMaxBeamBreakMs(cfg.max_beam_break_ms);
    setUpdatedAt(cfg.updated_at ?? null);

    if (prevForceRebootRef.current === true && cfg.force_reboot === false) {
      setRebootCompletedBanner(true);
      toast.success("Device rebooted successfully!");
    }
    prevForceRebootRef.current = cfg.force_reboot;
    setForceReboot(cfg.force_reboot);
  }, []);

  // 1. Load all devices on mount and default to DEFAULT_DEVICE_UUID if present
  useEffect(() => {
    let mounted = true;

    async function initDevices() {
      setLoadingDevices(true);
      setError(null);
      try {
        const list = await fetchConfigurableDevices();
        if (!mounted) return;
        setDevices(list);

        if (list.length > 0) {
          const preferred = list.find((d) => d.id === DEFAULT_DEVICE_UUID);
          const initial = preferred ? preferred : list[0]!;
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
    }

    initDevices();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync selected device's initial last_seen_at
  useEffect(() => {
    const dev = devices.find((d) => d.id === selectedDeviceId);
    if (dev) {
      setDeviceLastSeen(dev.last_seen_at);
    }
  }, [selectedDeviceId, devices]);

  // 2. Fetch or create device_configs row when selectedDeviceId changes
  const loadDeviceConfig = useCallback(
    async (deviceId: string, silent = false) => {
      if (!deviceId) return;
      if (!silent) {
        setLoadingConfig(true);
        setError(null);
        setRebootCompletedBanner(false);
      }
      try {
        const cfg = await fetchOrCreateDeviceConfig(deviceId);
        if (!silent) {
          prevForceRebootRef.current = cfg.force_reboot;
        }
        applyConfigToState(cfg);
      } catch (err) {
        const msg = getErrorMessage(
          err,
          "Failed to load or initialize device configuration."
        );
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

  // Helper to fetch latest device last_seen_at
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
      // Non-critical
    }
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    loadDeviceConfig(selectedDeviceId, false);
    refreshDeviceLastSeen(selectedDeviceId);

    // Subscribe to Realtime updates on device_configs for this device
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
            const updated = normalizeDeviceConfig(
              payload.new as Record<string, any>,
              selectedDeviceId
            );
            applyConfigToState(updated);
          }
        }
      )
      .subscribe();

    // Subscribe to ovitrap_devices updates and new readings to detect when the trap syncs
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
          const newSeen = (payload.new as any)?.last_seen_at;
          if (newSeen) {
            setDeviceLastSeen(newSeen);
          }
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
          const captured =
            (payload.new as any)?.captured_at ||
            (payload.new as any)?.created_at ||
            new Date().toISOString();
          setDeviceLastSeen(captured);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(deviceChannel);
    };
  }, [selectedDeviceId, loadDeviceConfig, applyConfigToState, refreshDeviceLastSeen]);

  // Check if changes have been pulled by the trap:
  // If lastSeen timestamp is newer than when the config was updated, the trap has synced the new settings.
  const isTrapSynchronized = (() => {
    if (!updatedAt) return true;
    if (!deviceLastSeen) return false;
    const updatedTime = new Date(updatedAt).getTime();
    const seenTime = new Date(deviceLastSeen).getTime();
    // Allow a 2-second grace for clock differences
    return seenTime >= updatedTime - 2000;
  })();

  // Clear waiting status once trap syncs
  useEffect(() => {
    if (waitingForTrapSync && isTrapSynchronized) {
      setWaitingForTrapSync(false);
      toast.success("Trap has downloaded and applied the new configuration!", {
        description: `Synced at ${deviceLastSeen ? new Date(deviceLastSeen).toLocaleTimeString() : "just now"}`,
      });
    }
  }, [waitingForTrapSync, isTrapSynchronized, deviceLastSeen]);

  // While waiting for the trap to sync, poll device_last_seen every 4s
  useEffect(() => {
    if (!selectedDeviceId || !waitingForTrapSync) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshDeviceLastSeen(selectedDeviceId);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedDeviceId, waitingForTrapSync, refreshDeviceLastSeen]);

  // 3. When force_reboot is true, poll so we catch the ESP32 setting force_reboot = false
  useEffect(() => {
    if (!selectedDeviceId || !forceReboot) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDeviceConfig(selectedDeviceId, true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedDeviceId, forceReboot, loadDeviceConfig]);

  // Validation
  const freqValidationError = (() => {
    if (Number.isNaN(minFreqHz) || Number.isNaN(maxFreqHz)) {
      return "Minimum and maximum frequencies must be valid numbers.";
    }
    if (minFreqHz < 100 || minFreqHz > 2000 || maxFreqHz < 100 || maxFreqHz > 2000) {
      return "Both frequencies must be between 100 Hz and 2000 Hz.";
    }
    if (minFreqHz >= maxFreqHz) {
      return "Minimum frequency (Hz) must be strictly less than maximum frequency (Hz).";
    }
    return null;
  })();

  const intervalValidationError =
    Number.isNaN(intervalSeconds) || intervalSeconds < 5
      ? "Upload interval must be at least 5 seconds (5,000 ms)."
      : null;

  const beamValidationError =
    Number.isNaN(maxBeamBreakMs) || maxBeamBreakMs < 20 || maxBeamBreakMs > 500
      ? "IR Time-of-Flight filter must be between 20 ms and 500 ms."
      : null;

  const hasValidationErrors = Boolean(
    freqValidationError || intervalValidationError || beamValidationError
  );

  const handleSaveConfig = async () => {
    if (!selectedDeviceId) return;
    if (hasValidationErrors) {
      toast.error(
        freqValidationError ||
          intervalValidationError ||
          beamValidationError ||
          "Please fix validation errors before saving."
      );
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

      // Check current connection state
      const isOnline =
        deviceLastSeen &&
        Date.now() - new Date(deviceLastSeen).getTime() <= 16 * 60 * 1000;

      toast.success("Configuration saved to database!", {
        description: isOnline
          ? "Waiting for the trap's next telemetry cycle to download and apply changes..."
          : "Saved in database. Trap is currently offline and will apply changes when it reconnects.",
      });
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to save device configuration.");
      setError(msg);
      toast.error(msg, {
        description: "Could not save to Supabase. Check network connection.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQueueReboot = async () => {
    if (!selectedDeviceId) return;
    setRebooting(true);
    setRebootCompletedBanner(false);
    setError(null);
    try {
      prevForceRebootRef.current = true;
      const updated = await queueDeviceReboot(selectedDeviceId);
      applyConfigToState(updated);
      toast.warning(
        "Remote reboot queued! Waiting for the ESP32's next sync cycle..."
      );
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to queue remote reboot.");
      setError(msg);
      toast.error(msg);
    } finally {
      setRebooting(false);
    }
  };

  const handleResetTargetVectorFreq = () => {
    setMinFreqHz(300);
    setMaxFreqHz(700);
    toast.info("Reset ZCI acoustic range to 300–700 Hz (Target Vector).");
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;
  const currentIntervalMs = Math.round((intervalSeconds || 0) * 1000);

  // Check if device is considered currently online (within 16 min threshold)
  const isDeviceOnline =
    deviceLastSeen &&
    Date.now() - new Date(deviceLastSeen).getTime() <= 16 * 60 * 1000;

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Sliders className="size-8 text-emerald-600 shrink-0" />
            IoT System Controls
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Remotely configure ESP32 smart ovitrap sensor parameters, acoustic ZCI thresholds, and telemetry sync intervals over-the-air without reflashing via USB.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedDeviceId && loadDeviceConfig(selectedDeviceId, false)}
            disabled={!selectedDeviceId || loadingConfig}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${loadingConfig ? "animate-spin" : ""}`} />
            Refresh Config
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Device Selector Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="size-5 text-emerald-600" />
                Target ESP32 Ovitrap Device
              </CardTitle>
              <CardDescription>
                Select an ovitrap node to inspect or modify its live hardware configuration in{" "}
                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  public.device_configs
                </code>
                .
              </CardDescription>
            </div>
            {selectedDevice && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={
                    isDeviceOnline
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5"
                      : "bg-slate-100 text-slate-700 border-slate-300 gap-1.5"
                  }
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isDeviceOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  {isDeviceOnline ? "Trap Online" : "Trap Offline"}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-slate-200 bg-slate-50 text-slate-700"
                >
                  UUID: {selectedDevice.id.slice(0, 8)}…
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingDevices ? (
            <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              Loading registered ESP32 devices…
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No devices found in <code>ovitrap_devices</code>. Register a trap first in Trap Management.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr] items-center">
              <div className="space-y-1.5">
                <Label htmlFor="iot-device-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Select Ovitrap Node
                </Label>
                <select
                  id="iot-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={loadingConfig || saving}
                  className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {devices.map((dev) => {
                    const locationLabel =
                      dev.barangay_name || dev.description || dev.notes || "Unassigned Location";
                    const isDefault = dev.id === DEFAULT_DEVICE_UUID;
                    return (
                      <option key={dev.id} value={dev.id}>
                        {dev.device_code} — {locationLabel}
                        {dev.serial_number ? ` (SN: ${dev.serial_number})` : ""}
                        {isDefault ? " ★ [Default Node]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedDevice && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Device Code:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDevice.device_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Barangay / Location:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">
                      {selectedDevice.barangay_name
                        ? `${selectedDevice.barangay_name}${
                            selectedDevice.municipality ? `, ${selectedDevice.municipality}` : ""
                          }`
                        : selectedDevice.description || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Last Trap Telemetry:</span>
                    <span className="font-medium text-slate-700">
                      {deviceLastSeen
                        ? new Date(deviceLastSeen).toLocaleString()
                        : "Never connected"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trap Sync Status Alert Banner */}
      {selectedDeviceId && !loadingConfig && (
        <>
          {waitingForTrapSync ? (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 shadow-xs flex items-start sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-200 text-amber-800 shrink-0">
                  <Radio className="size-6 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-amber-950 text-base">
                      Configuration Saved to Cloud — Awaiting Trap Fetch
                    </h3>
                    <Badge className="bg-amber-600 text-white text-xs">
                      Syncing with Trap…
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-amber-800">
                    The parameters have been saved in Supabase. The ESP32 ovitrap checks for new settings every{" "}
                    <strong>{intervalSeconds}s</strong>. This banner will turn green automatically once the trap acknowledges and applies the changes.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshDeviceLastSeen(selectedDeviceId)}
                className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Check Now
              </Button>
            </div>
          ) : isTrapSynchronized ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    Configuration Active on Trap
                  </p>
                  <p className="text-xs text-emerald-700">
                    The trap successfully connected at{" "}
                    {deviceLastSeen
                      ? new Date(deviceLastSeen).toLocaleTimeString()
                      : "recent sync"}{" "}
                    and is running with the current cloud parameters.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                In Sync
              </Badge>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-200 text-slate-700 shrink-0">
                  <Wifi className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Pending Device Check-in
                  </p>
                  <p className="text-xs text-slate-600">
                    The trap has not sent telemetry since the last configuration edit (
                    {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "recently"}
                    ). New settings will be applied on its next wake cycle.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-slate-600 border-slate-300 shrink-0">
                Pending Next Sync
              </Badge>
            </div>
          )}
        </>
      )}

      {loadingConfig ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">
              Synchronizing hardware configuration from Supabase…
            </p>
          </CardContent>
        </Card>
      ) : (
        selectedDeviceId && (
          <>
            {/* 2. Master Sensor Toggle Card */}
            <Card
              className={`border-2 transition-colors ${
                isActive
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-amber-200 bg-amber-50/30"
              }`}
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl shrink-0 ${
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Power className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Label
                          htmlFor="master-sensor-toggle"
                          className="text-base sm:text-lg font-bold text-slate-900 cursor-pointer"
                        >
                          Master Sensor Detection (is_active)
                        </Label>
                        <Badge
                          className={
                            isActive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-600 hover:bg-amber-700 text-white"
                          }
                        >
                          {isActive ? "ACTIVE — SENSORS ARMED" : "PAUSED — STANDBY"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {isActive
                          ? "IR beam-break interrupt and I2S MEMS microphone wingbeat sampling are enabled on the ESP32."
                          : "Detection is paused. The ESP32 will ignore IR triggers and microphone sampling while continuing periodic config syncs."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {isActive ? "Enabled" : "Paused"}
                    </span>
                    <Switch
                      id="master-sensor-toggle"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Controls Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* 3. Telemetry Upload Interval Card */}
              <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="size-5 text-emerald-600" />
                    Telemetry Upload Interval
                  </CardTitle>
                  <CardDescription>
                    Controls how frequently the ESP32 transmits mosquito counts, DHT22 climate data, and battery status to Supabase (<code>send_interval_ms</code>).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Quick-Select Presets
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {INTERVAL_PRESETS.map((preset) => {
                        const isSelected = intervalSeconds === preset.seconds;
                        return (
                          <Button
                            key={preset.seconds}
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setIntervalSeconds(preset.seconds)}
                            className={
                              isSelected
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                : "border-slate-200 text-slate-700 hover:bg-slate-100"
                            }
                          >
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-interval-sec" className="text-sm font-medium text-slate-700">
                        Custom Interval (Seconds)
                      </Label>
                      <Input
                        id="custom-interval-sec"
                        type="number"
                        min={5}
                        step={1}
                        value={intervalSeconds}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setIntervalSeconds(Number.isNaN(val) ? 0 : val);
                        }}
                      />
                      <p className="text-xs text-slate-500">
                        Minimum enforced: <strong>5 seconds</strong> (5,000 ms)
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Database Value (send_interval_ms)
                      </span>
                      <span className="mt-1 text-xl font-bold font-mono text-slate-900">
                        {currentIntervalMs.toLocaleString()} ms
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        {intervalSeconds >= 60
                          ? `≈ ${(intervalSeconds / 60).toFixed(
                              intervalSeconds % 60 === 0 ? 0 : 1
                            )} minute(s) per cycle`
                          : `${intervalSeconds} second(s) per cycle`}
                      </span>
                    </div>
                  </div>

                  {intervalValidationError && (
                    <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {intervalValidationError}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 4. ZCI Acoustic Target Range Card */}
              <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Waves className="size-5 text-emerald-600" />
                        ZCI Acoustic Target Range
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Zero-Crossing Interval (ZCI) wingbeat frequency passband used by the I2S microphone to classify target mosquito vectors.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetTargetVectorFreq}
                      className="shrink-0 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <RotateCcw className="size-3.5" />
                      Reset to 300–700 Hz (Target Vector)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="min-freq-hz" className="text-sm font-medium text-slate-700">
                        Minimum Frequency (Hz)
                      </Label>
                      <Input
                        id="min-freq-hz"
                        type="number"
                        min={100}
                        max={2000}
                        step={10}
                        value={minFreqHz}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMinFreqHz(Number.isNaN(val) ? 0 : val);
                        }}
                      />
                      <p className="text-xs text-slate-400">
                        Column: <code>min_freq_hz</code> (100–2000 Hz)
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max-freq-hz" className="text-sm font-medium text-slate-700">
                        Maximum Frequency (Hz)
                      </Label>
                      <Input
                        id="max-freq-hz"
                        type="number"
                        min={100}
                        max={2000}
                        step={10}
                        value={maxFreqHz}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMaxFreqHz(Number.isNaN(val) ? 0 : val);
                        }}
                      />
                      <p className="text-xs text-slate-400">
                        Column: <code>max_freq_hz</code> (100–2000 Hz)
                      </p>
                    </div>
                  </div>

                  {/* Visual Passband Bar */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Active Acoustic Passband
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {minFreqHz} Hz – {maxFreqHz} Hz (Δ{" "}
                        {Math.max(0, maxFreqHz - minFreqHz)} Hz)
                      </span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-500 rounded-full transition-all"
                        style={{
                          left: `${Math.min(
                            100,
                            Math.max(0, ((minFreqHz - 100) / 1900) * 100)
                          )}%`,
                          width: `${Math.min(
                            100,
                            Math.max(
                              2,
                              ((Math.max(minFreqHz, maxFreqHz) - minFreqHz) / 1900) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>100 Hz</span>
                      <span>300–700 Hz (Ae. aegypti)</span>
                      <span>2000 Hz</span>
                    </div>
                  </div>

                  {freqValidationError && (
                    <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {freqValidationError}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 5. IR Time-of-Flight Filter Card */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Gauge className="size-5 text-emerald-600" />
                        IR Time-of-Flight Filter
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Maximum infrared beam-break duration (<code>max_beam_break_ms</code>) before an event is rejected as slow-crawling debris or non-flying insects.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaxBeamBreakMs(100)}
                      className="text-xs text-slate-600 hover:text-slate-900 shrink-0"
                    >
                      Default (100 ms)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="beam-break-slider" className="text-sm font-medium text-slate-700">
                        Max Beam Break Duration
                      </Label>
                      <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                        {maxBeamBreakMs} ms
                      </span>
                    </div>

                    <input
                      id="beam-break-slider"
                      type="range"
                      min={20}
                      max={500}
                      step={5}
                      value={Math.min(500, Math.max(20, maxBeamBreakMs || 20))}
                      onChange={(e) => setMaxBeamBreakMs(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />

                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>20 ms (Strict / Fast Flight)</span>
                      <span>100 ms (Default)</span>
                      <span>500 ms (Lenient)</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr] items-center pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <Label htmlFor="beam-break-input" className="text-xs font-medium text-slate-600">
                        Exact Threshold (ms)
                      </Label>
                      <Input
                        id="beam-break-input"
                        type="number"
                        min={20}
                        max={500}
                        step={1}
                        value={maxBeamBreakMs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setMaxBeamBreakMs(Number.isNaN(val) ? 0 : val);
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Beam breaks longer than <strong>{maxBeamBreakMs} ms</strong> (such as spiders, ants, or falling leaves) are automatically discarded before acoustic verification.
                    </p>
                  </div>

                  {beamValidationError && (
                    <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {beamValidationError}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 6. Remote Hardware Actions (force_reboot) Card */}
              <Card className="border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="size-5 text-amber-600" />
                    Remote Hardware Actions
                  </CardTitle>
                  <CardDescription>
                    Queue a soft reset (<code>ESP.restart()</code>) on the selected ESP32 node. The device will reboot on its next sync cycle and clear the flag automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Live Reboot Status Banner */}
                  {forceReboot ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-100/80 p-4 flex items-center gap-3 animate-pulse">
                      <Radio className="size-5 text-amber-700 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-amber-900">
                          Reboot queued — waiting for ESP32 next sync cycle...
                        </p>
                        <p className="text-xs text-amber-800">
                          Listening for <code>force_reboot</code> to reset to{" "}
                          <code>false</code> via Supabase Realtime.
                        </p>
                      </div>
                    </div>
                  ) : rebootCompletedBanner ? (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900">
                            Device rebooted successfully!
                          </p>
                          <p className="text-xs text-emerald-700">
                            The ESP32 acknowledged the reboot command and cleared{" "}
                            <code>force_reboot = false</code>.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRebootCompletedBanner(false)}
                        className="text-xs text-emerald-700"
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Activity className="size-4 text-emerald-600" />
                        <span className="text-sm font-medium text-slate-700">
                          Reboot Flag Status (<code>force_reboot</code>)
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Idle (false)
                      </Badge>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      type="button"
                      onClick={handleQueueReboot}
                      disabled={rebooting || forceReboot}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2 shadow-xs"
                    >
                      {rebooting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      {forceReboot
                        ? "Reboot Queued (Awaiting ESP32 Sync…)"
                        : "Queue Remote Reboot"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 7. Save & Sync Footer Bar */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      Database Configuration:{" "}
                      {updatedAt
                        ? new Date(updatedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })
                        : "Not recorded yet"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      Trap Status:{" "}
                      <strong className={isDeviceOnline ? "text-emerald-700" : "text-slate-700"}>
                        {isDeviceOnline ? "Online" : "Offline / Sleeping"}
                      </strong>{" "}
                      · Last Seen:{" "}
                      {deviceLastSeen
                        ? new Date(deviceLastSeen).toLocaleTimeString()
                        : "Never"}
                    </span>
                    <span>·</span>
                    <span className={isTrapSynchronized ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                      {waitingForTrapSync
                        ? "Sync in progress..."
                        : isTrapSynchronized
                        ? "✓ Live on Trap"
                        : "⏳ Pending Trap Fetch"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={handleSaveConfig}
                  disabled={saving || hasValidationErrors}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6 shrink-0"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "Saving Configuration…" : "Save Configuration"}
                </Button>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}
