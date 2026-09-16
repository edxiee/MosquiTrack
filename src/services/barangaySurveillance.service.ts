import { supabase } from "@/lib/supabase";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";

export interface BarangaySurveillanceDevice {
  id: string;
  device_code: string;
  serial_number: string | null;
  location: string;
  status: "Online" | "Offline";
  count: number;
  lastComm: string;
  lastSeenAt: string | null;
  battery: number;
  temperature: number | null;
  humidity: number | null;
  lat: number;
  lng: number;
  activityLevel: "Critical" | "High" | "Moderate" | "Low";
  device_status_name: string;
  deployed_by_name: string | null;
  installation_date: string | null;
  notes: string | null;
}

export interface SurveillanceTrendPoint {
  date: string;
  count: number;
}

export interface SurveillanceDetection {
  id: string;
  time: string;
  trapId: string;
  location: string;
  count: number;
  temperature: number | null;
  humidity: number | null;
  battery: number | null;
  confidence: number | null;
  status: string;
}

export interface BarangayOption {
  id: string;
  barangay_name: string;
  municipality: string | null;
  province: string | null;
}

export interface RecentTriageActionSummary {
  id: string;
  triggerSource: string;
  priority: string;
  status: string;
  assignedDate: string;
  remarks: string | null;
  deviceCode: string | null;
}

export interface BarangaySurveillanceData {
  barangayId: string;
  barangayName: string;
  municipality: string | null;
  province: string | null;
  availableBarangays: BarangayOption[];
  barangayCenter: { lat: number; lng: number };
  riskLevel: "Critical Risk" | "High Risk" | "Moderate Risk" | "Low Risk";
  riskScore: number | null;
  riskColor: string;
  todayCount: number;
  totalHistoricalCount: number;
  activeCount: number;
  totalTrapsCount: number;
  vectorIndex: number;
  recommendation: string;
  traps: BarangaySurveillanceDevice[];
  trend: SurveillanceTrendPoint[];
  latestDetections: SurveillanceDetection[];
  recentActions: RecentTriageActionSummary[];
}

export async function fetchAvailableBarangays(): Promise<BarangayOption[]> {
  const { data, error } = await supabase
    .from("barangays")
    .select("id, barangay_name, municipality, province")
    .order("barangay_name", { ascending: true });

  if (error) {
    console.error("Failed to fetch barangays:", error);
    return [];
  }
  return data ?? [];
}

export async function fetchBarangaySurveillanceData(
  targetBarangayId?: string
): Promise<BarangaySurveillanceData> {
  // 1. Fetch available barangays list from real database
  const availableBarangays = await fetchAvailableBarangays();

  // 2. Identify the logged in user & profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let resolvedBarangayId: string | null = targetBarangayId || null;
  let userBarangayName: string | null = null;
  let userMunicipality: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, barangay, municipality, barangay_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      if (!resolvedBarangayId && profile.barangay_id) {
        resolvedBarangayId = profile.barangay_id;
      }
      if (profile.barangay) userBarangayName = profile.barangay;
      if (profile.municipality) userMunicipality = profile.municipality;
    }
  }

  // 3. Fallback resolution: lookup by profile barangay name or pick first available barangay
  if (!resolvedBarangayId && userBarangayName) {
    const match = availableBarangays.find(
      (b) =>
        b.barangay_name.toLowerCase() === userBarangayName!.toLowerCase() &&
        (!userMunicipality ||
          !b.municipality ||
          b.municipality.toLowerCase() === userMunicipality.toLowerCase())
    );
    if (match) {
      resolvedBarangayId = match.id;
    }
  }

  if (!resolvedBarangayId && availableBarangays.length > 0 && availableBarangays[0]) {
    resolvedBarangayId = availableBarangays[0].id;
  }

  // 4. Resolve current barangay details
  const currentBarangay = availableBarangays.find(
    (b) => b.id === resolvedBarangayId
  ) || {
    id: resolvedBarangayId || "unknown",
    barangay_name: userBarangayName || "Barangay Surveillance",
    municipality: userMunicipality || null,
    province: null,
  };

  const barangayId = currentBarangay.id;
  const barangayName = currentBarangay.barangay_name;

  // 5. Query ovitrap_devices for this barangay from database
  const { data: devicesData, error: devicesError } = await supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      serial_number,
      description,
      notes,
      latitude,
      longitude,
      last_seen_at,
      installation_date,
      created_at,
      deployed_by,
      device_status_id,
      device_statuses ( id, status_name, description ),
      barangays ( id, barangay_name, municipality )
    `
    )
    .eq("barangay_id", barangayId)
    .order("created_at", { ascending: false });

  if (devicesError) {
    console.error("Failed to query ovitrap devices:", devicesError);
    throw devicesError;
  }

  const rawDevices = (devicesData ?? []) as any[];

  // 6. Fetch profiles for deployed_by names
  const deployerIds = Array.from(
    new Set(rawDevices.map((d) => d.deployed_by).filter(Boolean))
  ) as string[];

  const userMap = new Map<string, string>();
  if (deployerIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", deployerIds);

    if (profilesData) {
      for (const p of profilesData) {
        userMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim());
      }
    }
  }

  // 7. Query ovitrap_readings for devices belonging to this barangay
  const deviceIds = rawDevices.map((d) => d.id).filter(Boolean);

  let readings: any[] = [];
  if (deviceIds.length > 0) {
    const { data: readingsData, error: readingsError } = await supabase
      .from("ovitrap_readings")
      .select(
        `
        id,
        device_id,
        captured_at,
        created_at,
        mosquito_count,
        egg_count,
        battery_level,
        ai_confidence,
        temperature_c,
        humidity_percent,
        image_path,
        device:ovitrap_devices ( id, device_code, description, notes )
      `
      )
      .in("device_id", deviceIds)
      .order("captured_at", { ascending: false })
      .limit(300);

    if (readingsError) {
      console.error("Failed to fetch ovitrap readings:", readingsError);
    } else {
      readings = readingsData ?? [];
    }
  }

  // 8. Query latest risk_assessment from database for this barangay
  let latestAssessmentScore: number | null = null;
  let latestAssessmentLevel: string | null = null;
  let latestAssessmentColor: string | null = null;
  let latestAssessmentNotes: string | null = null;

  const { data: riskData } = await supabase
    .from("risk_assessments")
    .select(
      `
      id,
      calculated_score,
      assessment_notes,
      assessment_period_start,
      assessment_period_end,
      risk_level:risk_levels (
        id,
        level_name,
        priority,
        display_color,
        description
      )
    `
    )
    .eq("barangay_id", barangayId)
    .order("assessment_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (riskData) {
    latestAssessmentScore = riskData.calculated_score;
    latestAssessmentNotes = riskData.assessment_notes;
    const rawRLevel = (riskData as any).risk_level;
    const rLevel = Array.isArray(rawRLevel) ? rawRLevel[0] : rawRLevel;
    if (rLevel) {
      latestAssessmentLevel = rLevel.level_name;
      latestAssessmentColor = rLevel.display_color;
    }
  }

  // 9. Query recent action_triage_log for this barangay from database
  let recentActions: RecentTriageActionSummary[] = [];
  const { data: actionsData } = await supabase
    .from("action_triage_log")
    .select(
      `
      id,
      trigger_source,
      priority,
      status,
      assigned_date,
      remarks,
      created_at,
      device:ovitrap_devices ( device_code )
    `
    )
    .eq("barangay_id", barangayId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (actionsData) {
    recentActions = (actionsData as any[]).map((a) => {
      const dev = Array.isArray(a.device) ? a.device[0] : a.device;
      return {
        id: a.id,
        triggerSource: a.trigger_source || "Triage Action",
        priority: a.priority || "Medium",
        status: a.status || "Pending",
        assignedDate: a.assigned_date,
        remarks: a.remarks,
        deviceCode: dev?.device_code ?? null,
      };
    });
  }

    // 10. Process per-device telemetry and metrics
  const latestReadingsMap = new Map<string, any>();
  const todayReadingsMap = new Map<string, number>();

  const todayStartStr = new Date().toISOString().slice(0, 10);

  for (const r of readings) {
    if (!latestReadingsMap.has(r.device_id)) {
      latestReadingsMap.set(r.device_id, r);
    }

    if (r.captured_at && r.captured_at.startsWith(todayStartStr)) {
      const current = todayReadingsMap.get(r.device_id) ?? 0;
      const countVal = r.mosquito_count ?? r.egg_count ?? 0;
      todayReadingsMap.set(r.device_id, current + countVal);
    }
  }

  const validLats: number[] = [];
  const validLngs: number[] = [];

  const traps: BarangaySurveillanceDevice[] = rawDevices.map((d) => {
    const rawStatus = Array.isArray(d.device_statuses)
      ? d.device_statuses[0]
      : d.device_statuses;
    const statusName = rawStatus?.status_name ?? "Offline";

    const latestReading = latestReadingsMap.get(d.id);
    const todayCountForDevice =
      todayReadingsMap.get(d.id) ??
      (latestReading?.mosquito_count ?? latestReading?.egg_count ?? 0);

    const lastCommDate = latestReading?.captured_at || d.last_seen_at;
    let statusLabel: "Online" | "Offline" = "Offline";
    let lastCommText = "Never Connected";

    if (lastCommDate) {
      const diffMinutes =
        (Date.now() - new Date(lastCommDate).getTime()) / (1000 * 60);
      if (diffMinutes <= 16) {
        statusLabel = "Online";
        lastCommText = "Active (Live)";
      } else {
        statusLabel = "Offline";
        if (diffMinutes < 60) {
          lastCommText = `${Math.floor(diffMinutes)}m ago`;
        } else if (diffMinutes < 1440) {
          lastCommText = `${Math.floor(diffMinutes / 60)}h ago`;
        } else {
          lastCommText = `${Math.floor(diffMinutes / 1440)}d ago`;
        }
      }
    }

    // Use real coordinates only — no default / fake center
    let lat = Number(d.latitude);
    let lng = Number(d.longitude);

    const hasValidCoords =
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat !== 0 &&
      lng !== 0;

    if (hasValidCoords) {
      validLats.push(lat);
      validLngs.push(lng);
    } else {
      lat = 0;
      lng = 0;
    }

    let activityLevel: "Critical" | "High" | "Moderate" | "Low" = "Low";
    if (todayCountForDevice >= 50) activityLevel = "Critical";
    else if (todayCountForDevice >= 30) activityLevel = "High";
    else if (todayCountForDevice >= 10) activityLevel = "Moderate";

    return {
      id: d.id,
      device_code: d.device_code || `TRAP-${d.id.slice(0, 4)}`,
      serial_number: d.serial_number ?? null,
      location: d.description || d.notes || "Monitoring Station",
      status: statusLabel,
      count: todayCountForDevice,
      lastComm: lastCommText,
      lastSeenAt: lastCommDate || null,
      battery: latestReading?.battery_level ?? 100,
      temperature: latestReading?.temperature_c ?? null,
      humidity: latestReading?.humidity_percent ?? null,
      lat,
      lng,
      activityLevel,
      device_status_name: statusName,
      deployed_by_name: d.deployed_by
        ? userMap.get(d.deployed_by) ?? null
        : null,
      installation_date: d.installation_date ?? null,
      notes: d.notes ?? null,
    };
  });

  // Barangay center = average of real device coords only
  const barangayCenter =
    validLats.length > 0 && validLngs.length > 0
      ? {
          lat: validLats.reduce((a, b) => a + b, 0) / validLats.length,
          lng: validLngs.reduce((a, b) => a + b, 0) / validLngs.length,
        }
      : { lat: 0, lng: 0 };

  // 11. 7-Day Trend Timeline
  const trendMap = new Map<string, number>();
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    trendMap.set(dateKey, 0);
  }

  for (const r of readings) {
    if (!r.captured_at) continue;
    const rDate = new Date(r.captured_at);
    const diffDays = (now.getTime() - rDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      const dateKey = rDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (trendMap.has(dateKey)) {
        const countVal = r.mosquito_count ?? r.egg_count ?? 0;
        trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + countVal);
      }
    }
  }

  const trend: SurveillanceTrendPoint[] = Array.from(trendMap.entries()).map(
    ([date, count]) => ({
      date,
      count,
    })
  );

  // 12. Latest Detections Feed
  const latestDetections: SurveillanceDetection[] = readings
    .slice(0, 10)
    .map((r) => {
      const dev = Array.isArray(r.device) ? r.device[0] : r.device;
      const timeStr = formatTelemetryTimestamp(r.captured_at || r.created_at);
      const conf = r.ai_confidence != null ? Number(r.ai_confidence) : null;

      let status = "Verified";
      if (conf != null && conf < 0.6) {
        status = "Unverified";
      }

      return {
        id: r.id,
        time: timeStr,
        trapId: dev?.device_code ?? "TRAP",
        location: dev?.description || dev?.notes || "Monitoring Node",
        count: r.mosquito_count ?? r.egg_count ?? 0,
        temperature: r.temperature_c ?? null,
        humidity: r.humidity_percent ?? null,
        battery: r.battery_level ?? null,
        confidence: conf,
        status,
      };
    });

  // 13. Aggregate Metrics & Risk Determination
  const todayCount = traps.reduce((sum, t) => sum + t.count, 0);
  const totalHistoricalCount = readings.reduce(
    (sum, r) => sum + (r.mosquito_count ?? r.egg_count ?? 0),
    0
  );

  const activeCount = traps.filter(
    (t) => t.status === "Online" || t.device_status_name === "Active"
  ).length;

  const totalTrapsCount = traps.length;

  const vectorIndex = Number(
    (todayCount / (activeCount || 1)).toFixed(1)
  );

  let riskLevel: "Critical Risk" | "High Risk" | "Moderate Risk" | "Low Risk" =
    "Low Risk";
  let riskColor = "#10b981";

  if (latestAssessmentLevel) {
    if (latestAssessmentLevel.toLowerCase().includes("critical")) {
      riskLevel = "Critical Risk";
      riskColor = latestAssessmentColor || "#f43f5e";
    } else if (latestAssessmentLevel.toLowerCase().includes("high")) {
      riskLevel = "High Risk";
      riskColor = latestAssessmentColor || "#f97316";
    } else if (latestAssessmentLevel.toLowerCase().includes("moderate") || latestAssessmentLevel.toLowerCase().includes("medium")) {
      riskLevel = "Moderate Risk";
      riskColor = latestAssessmentColor || "#f59e0b";
    } else {
      riskLevel = "Low Risk";
      riskColor = latestAssessmentColor || "#10b981";
    }
  } else {
    // Dynamic computation based on daily vector index
    if (vectorIndex >= 25 || todayCount >= 80) {
      riskLevel = "Critical Risk";
      riskColor = "#f43f5e";
    } else if (vectorIndex >= 18 || todayCount >= 50) {
      riskLevel = "High Risk";
      riskColor = "#f97316";
    } else if (vectorIndex >= 10 || todayCount >= 20) {
      riskLevel = "Moderate Risk";
      riskColor = "#f59e0b";
    }
  }

  let recommendation =
    latestAssessmentNotes ||
    "Mosquito population density is stable. Maintain standard routine surveillance.";

  if (!latestAssessmentNotes) {
    if (riskLevel === "Critical Risk") {
      recommendation = `CRITICAL mosquito activity in ${barangayName}. Immediate targeted thermal fogging / misting and emergency community clean-up drive strongly advised.`;
    } else if (riskLevel === "High Risk") {
      recommendation = `High mosquito proliferation detected across ${barangayName}. Dispatch field teams for standing water inspection and container abatement.`;
    } else if (riskLevel === "Moderate Risk") {
      recommendation = `Moderate oviposition activity detected in ${barangayName}. Inspect outdoor containers and public drainage areas near active traps.`;
    }
  }

  return {
    barangayId,
    barangayName,
    municipality: currentBarangay.municipality,
    province: currentBarangay.province,
    availableBarangays,
    barangayCenter,
    riskLevel,
    riskScore: latestAssessmentScore,
    riskColor,
    todayCount,
    totalHistoricalCount,
    activeCount,
    totalTrapsCount,
    vectorIndex,
    recommendation,
    traps,
    trend,
    latestDetections,
    recentActions,
  };
}

export async function submitTriageRequest(payload: {
  barangayId: string;
  deviceId?: string | null;
  triggerSource: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  remarks: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayStr = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("action_triage_log").insert({
    barangay_id: payload.barangayId,
    device_id: payload.deviceId || null,
    trigger_source: payload.triggerSource,
    priority: payload.priority,
    status: "Pending",
    assigned_date: todayStr,
    remarks: payload.remarks,
    created_by: user?.id || null,
  } as any);

  if (error) {
    console.error("Failed to insert triage action request:", error);
    throw error;
  }
}
