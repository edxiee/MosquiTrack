import { supabase } from "@/lib/supabase";
import { formatTelemetryTimestamp } from "@/utils/dateHelpers";

export interface BarangaySurveillanceDevice {
  id: string;
  device_code: string;
  location: string;
  status: "Online" | "Delayed" | "Offline";
  count: number;
  lastComm: string;
  battery: number;
  lat: number;
  lng: number;
  activityLevel: "Critical" | "High" | "Moderate" | "Low";
  device_status_name: string;
}

export interface SurveillanceTrendPoint {
  date: string;
  count: number;
}

export interface SurveillanceDetection {
  time: string;
  trapId: string;
  location: string;
  count: number;
  status: string;
}

export interface BarangaySurveillanceData {
  barangayName: string;
  barangayCenter: { lat: number; lng: number };
  riskLevel: "Critical Risk" | "High Risk" | "Moderate Risk" | "Low Risk";
  todayCount: number;
  activeCount: number;
  vectorIndex: number;
  recommendation: string;
  traps: BarangaySurveillanceDevice[];
  trend: SurveillanceTrendPoint[];
  latestDetections: SurveillanceDetection[];
}

export async function fetchBarangaySurveillanceData(): Promise<BarangaySurveillanceData> {
  // 1. Get logged-in user profile & assigned barangay
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let barangayName = "Barangay Surveillance";
  let barangayId: string | null = null;
  let userMunicipality: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("barangay, municipality, barangay_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      if (profile.barangay) barangayName = profile.barangay;
      if (profile.barangay_id) barangayId = profile.barangay_id;
      if (profile.municipality) userMunicipality = profile.municipality;
    }
  }

  // If barangayId is missing on profile, attempt lookup by name
  if (!barangayId && barangayName && barangayName !== "Barangay Surveillance") {
    let bQuery = supabase
      .from("barangays")
      .select("id, barangay_name")
      .eq("barangay_name", barangayName);

    if (userMunicipality) {
      bQuery = bQuery.eq("municipality", userMunicipality);
    }

    const { data: bRow } = await bQuery.maybeSingle();
    if (bRow) {
      barangayId = bRow.id;
    }
  }

  // 2. Query ovitrap_devices
  let devicesQuery = supabase
    .from("ovitrap_devices")
    .select(
      `
      id,
      device_code,
      description,
      notes,
      latitude,
      longitude,
      last_seen_at,
      created_at,
      barangay_id,
      device_statuses ( id, status_name ),
      barangays ( id, barangay_name )
    `
    )
    .order("created_at", { ascending: false });

  if (barangayId) {
    devicesQuery = devicesQuery.eq("barangay_id", barangayId);
  }

  const { data: devicesData, error: devicesError } = await devicesQuery;
  if (devicesError) throw devicesError;

  const devices = (devicesData ?? []) as any[];

  // 3. Query ovitrap_readings for devices
  const deviceIds = devices.map((d) => d.id).filter(Boolean);

  let readingsQuery = supabase
    .from("ovitrap_readings")
    .select(
      `
      id,
      device_id,
      captured_at,
      created_at,
      egg_count,
      battery_level,
      ai_confidence,
      temperature_c,
      humidity_percent,
      device:ovitrap_devices ( device_code, description, notes )
    `
    )
    .order("captured_at", { ascending: false });

  if (deviceIds.length > 0) {
    readingsQuery = readingsQuery.in("device_id", deviceIds);
  } else {
    readingsQuery = readingsQuery.limit(100);
  }

  const { data: readingsData } = await readingsQuery;
  const readings = (readingsData ?? []) as any[];

  // 4. Group readings and calculate per-trap metrics
  const latestReadingsMap = new Map<string, any>();
  const todayReadingsMap = new Map<string, number>();

  const todayStartStr = new Date().toISOString().slice(0, 10);

  for (const r of readings) {
    if (!latestReadingsMap.has(r.device_id)) {
      latestReadingsMap.set(r.device_id, r);
    }

    if (r.captured_at && r.captured_at.startsWith(todayStartStr)) {
      const current = todayReadingsMap.get(r.device_id) ?? 0;
      todayReadingsMap.set(r.device_id, current + (r.egg_count ?? 0));
    }
  }

  const defaultCenter = { lat: 14.605, lng: 121.03 };
  let validLats: number[] = [];
  let validLngs: number[] = [];

  const traps: BarangaySurveillanceDevice[] = devices.map((d, index) => {
    const rawStatus = Array.isArray(d.device_statuses)
      ? d.device_statuses[0]
      : d.device_statuses;
    const statusName = rawStatus?.status_name ?? "Offline";

    const latestReading = latestReadingsMap.get(d.id);
    const todayCountForDevice =
      todayReadingsMap.get(d.id) ?? (latestReading?.egg_count ?? 0);

    const lastCommDate = latestReading?.captured_at || d.last_seen_at;
    let statusLabel: "Online" | "Delayed" | "Offline" = "Offline";
    let lastCommText = "Never";

    if (lastCommDate) {
      const diffMinutes =
        (Date.now() - new Date(lastCommDate).getTime()) / (1000 * 60);
      if (diffMinutes < 30) {
        statusLabel = "Online";
        lastCommText = "Just now";
      } else if (diffMinutes < 1440) {
        statusLabel = "Delayed";
        lastCommText = `${Math.floor(diffMinutes / 60)}h ago`;
      } else {
        statusLabel = "Offline";
        lastCommText = `${Math.floor(diffMinutes / 1440)}d ago`;
      }
    }

    let lat = Number(d.latitude);
    let lng = Number(d.longitude);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      lat = defaultCenter.lat + (index * 0.002 - 0.003);
      lng = defaultCenter.lng + (index * 0.0025 - 0.003);
    } else {
      validLats.push(lat);
      validLngs.push(lng);
    }

    let activityLevel: "Critical" | "High" | "Moderate" | "Low" = "Low";
    if (todayCountForDevice >= 50) activityLevel = "Critical";
    else if (todayCountForDevice >= 30) activityLevel = "High";
    else if (todayCountForDevice >= 10) activityLevel = "Moderate";

    return {
      id: d.id,
      device_code: d.device_code || `TRAP-${d.id.slice(0, 4)}`,
      location: d.description || d.notes || "Deployed Station",
      status: statusLabel,
      count: todayCountForDevice,
      lastComm: lastCommText,
      battery: latestReading?.battery_level ?? 100,
      lat,
      lng,
      activityLevel,
      device_status_name: statusName,
    };
  });

  const barangayCenter =
    validLats.length > 0 && validLngs.length > 0
      ? {
          lat: validLats.reduce((a, b) => a + b, 0) / validLats.length,
          lng: validLngs.reduce((a, b) => a + b, 0) / validLngs.length,
        }
      : defaultCenter;

  // 5. 7-Day Trend Chart
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
        trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + (r.egg_count ?? 0));
      }
    }
  }

  const trend: SurveillanceTrendPoint[] = Array.from(trendMap.entries()).map(
    ([date, count]) => ({
      date,
      count,
    })
  );

  // 6. Latest Detections
  const latestDetections: SurveillanceDetection[] = readings
    .slice(0, 10)
    .map((r) => {
      const dev = Array.isArray(r.device) ? r.device[0] : r.device;
      const timeStr = formatTelemetryTimestamp(r.captured_at || r.created_at);

      return {
        time: timeStr,
        trapId: dev?.device_code ?? "TRAP",
        location: dev?.description || dev?.notes || "Monitoring Node",
        count: r.egg_count ?? 0,
        status:
          r.ai_confidence != null
            ? r.ai_confidence > 0.6
              ? "Verified"
              : "Unverified"
            : "Verified",
      };
    });

  // 7. Overall Stats & Recommendation
  const todayCount = traps.reduce((sum, t) => sum + t.count, 0);
  const activeCount = traps.filter(
    (t) => t.status === "Online" || t.device_status_name === "Active"
  ).length;

  const vectorIndex = Number(
    (todayCount / (activeCount || 1)).toFixed(1)
  );

  let riskLevel: "Critical Risk" | "High Risk" | "Moderate Risk" | "Low Risk" =
    "Low Risk";
  let recommendation =
    "Mosquito activity is low. Continue routine monitoring and vector surveillance.";

  if (vectorIndex >= 25 || todayCount >= 80) {
    riskLevel = "Critical Risk";
    recommendation = `Critical mosquito density in ${barangayName}. Immediate targeted fogging and community clean-up drive strongly advised.`;
  } else if (vectorIndex >= 12 || todayCount >= 30) {
    riskLevel = "Moderate Risk";
    recommendation = `Increased oviposition activity detected around high-count traps in ${barangayName}. Inspect stagnant water containers and public areas.`;
  }

  return {
    barangayName,
    barangayCenter,
    riskLevel,
    todayCount,
    activeCount,
    vectorIndex,
    recommendation,
    traps,
    trend,
    latestDetections,
  };
}
