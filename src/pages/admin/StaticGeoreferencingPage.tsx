import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import {
  Navigation,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { OvitrapDevice } from "@/types/device.types";
import { ACTIVE_STATUS_ID } from "@/constants/device";
import { ROUTES } from "@/utils/navigation";
import { fetchDevices } from "@/services/device.service";

import "leaflet/dist/leaflet.css";

// Status → colour mapping for map markers
const createCustomMarker = (status: string) => {
  const colorMap = {
    Active: { bg: "emerald", ping: true },
    Maintenance: { bg: "amber", ping: false },
    Offline: { bg: "rose", ping: false },
    Default: { bg: "sky", ping: false },
  };
  const { bg, ping } = colorMap[status as keyof typeof colorMap] ?? colorMap.Default;
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="flex items-center justify-center -translate-y-4">
        <div class="relative w-10 h-10 flex items-center justify-center">
          ${ping ? `<div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-40 animate-ping"></div>` : ""}
          <div class="absolute inset-2 bg-${bg}-100 rounded-full shadow-inner"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-${bg}-600 relative z-10 filter drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const defaultCenter: [number, number] = [14.5995, 120.9842];

// Pans / zooms map when center or zoom state changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// Captures map clicks and passes lat/lng up
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StaticGeoreferencingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paramTrapId = searchParams.get("trapId");
  const viewId = searchParams.get("viewId");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // ── coordinate state ──────────────────────────────────────────────────────
  const [latInput, setLatInput] = useState<string>(
    () => localStorage.getItem("georef_lat") || defaultCenter[0].toString()
  );
  const [lngInput, setLngInput] = useState<string>(
    () => localStorage.getItem("georef_lng") || defaultCenter[1].toString()
  );
  const [markerPos, setMarkerPos] = useState<[number, number]>(() => {
    const lat = parseFloat(localStorage.getItem("georef_lat") || "");
    const lng = parseFloat(localStorage.getItem("georef_lng") || "");
    return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : defaultCenter;
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(markerPos);
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Helper to get today's date in YYYY-MM-DD local format
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ── form state ────────────────────────────────────────────────────────────
  const [selectedTrapId, setSelectedTrapId] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [barangay, setBarangay] = useState<string>("");
  const [deploymentDate, setDeploymentDate] = useState<string>(getTodayDateString());
  const [deployedBy, setDeployedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // ── trap data from Supabase ───────────────────────────────────────────────
  const [unassignedTraps, setUnassignedTraps] = useState<OvitrapDevice[]>([]);
  const [deployedTraps, setDeployedTraps] = useState<OvitrapDevice[]>([]);
  const [trapsLoading, setTrapsLoading] = useState<boolean>(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ───────────────────────────────────────────────────────────────
  const showToast = (type: "success" | "error" | "info", message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Helper to auto-fill form fields when a trap is selected ──────────────────
  const applyTrapToForm = useCallback((trap: OvitrapDevice | null) => {
    if (!trap) {
      setSelectedTrapId("");
      setLocationName("");
      setBarangay("");
      setNotes("");
      setDeploymentDate(getTodayDateString());
      setDeployedBy("");
      return;
    }

    setSelectedTrapId(trap.id);
    setLocationName(trap.description || "");
    setBarangay(trap.barangays?.barangay_name || "");
    setNotes(trap.notes || "");

    const formattedDate =
      (trap.installation_date ? String(trap.installation_date).split("T")[0] : null) ||
      getTodayDateString();
    setDeploymentDate(formattedDate);

    const deployedByName = trap.users
      ? `${trap.users.first_name || ""} ${trap.users.last_name || ""}`.trim()
      : trap.deployed_by || "";
    setDeployedBy(deployedByName);

    if (trap.latitude != null && trap.longitude != null) {
      setLatInput(trap.latitude.toString());
      setLngInput(trap.longitude.toString());
      setMarkerPos([trap.latitude, trap.longitude]);
      setMapCenter([trap.latitude, trap.longitude]);
    }
  }, []);

  // ── fetch unassigned traps on mount ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setTrapsLoading(true);
      try {
        let allTraps = await fetchDevices();

        if (paramTrapId && !allTraps.some((t) => t.id === paramTrapId)) {
          const { data: singleTrap } = await supabase
            .from("ovitrap_devices")
            .select(
              `id, device_code, serial_number, description, barangay_id,
               latitude, longitude, device_status_id, notes,
               installation_date, last_seen_at, created_at, deployed_by,
               device_statuses (id, status_name, description),
               barangays (id, barangay_name)`
            )
            .eq("id", paramTrapId)
            .maybeSingle();

          if (singleTrap) {
            allTraps = [singleTrap as unknown as OvitrapDevice, ...allTraps];
          }
        }

        const unassigned = allTraps.filter((t) => t.latitude == null);
        const deployed = allTraps.filter((t) => t.latitude != null);

        setUnassignedTraps(unassigned);
        setDeployedTraps(deployed);

        if (paramTrapId) {
          const selected = allTraps.find((t) => t.id === paramTrapId);
          if (selected) {
            applyTrapToForm(selected);
          } else {
            setSelectedTrapId(paramTrapId);
          }
        }

        if (viewId) {
          const trapToView = allTraps.find((t) => t.id === viewId);
          if (trapToView && trapToView.latitude != null && trapToView.longitude != null) {
            setMapCenter([trapToView.latitude, trapToView.longitude]);
            setMapZoom(16);

            setTimeout(() => {
              if (markerRefs.current[viewId]) {
                markerRefs.current[viewId]?.openPopup();
              }
            }, 500);
          }
        }
      } catch (err) {
        console.error("Georeferencing trap load error:", err);
        showToast("error", "Failed to load unassigned traps.");
      } finally {
        setTrapsLoading(false);
      }
    };
    load();
  }, [paramTrapId, viewId, applyTrapToForm]);

  const selectedTrap =
    unassignedTraps.find((t) => t.id === selectedTrapId) ??
    deployedTraps.find((t) => t.id === selectedTrapId) ??
    null;

  const handleTrapSelect = (trapId: string) => {
    const trap =
      unassignedTraps.find((t) => t.id === trapId) ??
      deployedTraps.find((t) => t.id === trapId) ??
      null;
    applyTrapToForm(trap);
  };

  // ── map handlers ──────────────────────────────────────────────────────────
  const handleMapClick = (lat: number, lng: number) => {
    const rLat = parseFloat(lat.toFixed(6));
    const rLng = parseFloat(lng.toFixed(6));
    setLatInput(rLat.toString());
    setLngInput(rLng.toString());
    setMarkerPos([rLat, rLng]);
    setIsSaved(false);
    showToast("info", "Coordinates selected from map.");
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return showToast("error", "Geolocation not supported.");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLatInput(latitude.toFixed(6));
        setLngInput(longitude.toFixed(6));
        setMarkerPos([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(16);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        showToast("error", "Could not get location.");
      }
    );
  };

  // ── form actions ──────────────────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!selectedTrapId) {
      showToast("error", "Please select a trap first.");
      return;
    }
    if (!latInput || !lngInput) {
      showToast("error", "Please set coordinates on the map.");
      return;
    }

    try {
      let activeStatusId = ACTIVE_STATUS_ID;
      const { data: statusData } = await supabase
        .from("device_statuses")
        .select("id")
        .or("status_name.ilike.Active,status_name.ilike.Online")
        .limit(1)
        .maybeSingle();

      if (statusData?.id) {
        activeStatusId = statusData.id;
      }

      const { error } = await supabase
        .from("ovitrap_devices")
        .update({
          latitude: parseFloat(latInput),
          longitude: parseFloat(lngInput),
          description: locationName || null,
          notes: notes || null,
          installation_date: deploymentDate || null,
          device_status_id: activeStatusId,
        })
        .eq("id", selectedTrapId);

      if (error) throw error;

      setIsSaved(true);
      showToast("success", `${selectedTrap?.device_code} deployed & set to Online!`);
      const deployedTrap = unassignedTraps.find((t) => t.id === selectedTrapId);
      if (deployedTrap) {
        setDeployedTraps((prev) => [
          ...prev,
          {
            ...deployedTrap,
            latitude: parseFloat(latInput),
            longitude: parseFloat(lngInput),
            device_statuses: {
              id: activeStatusId,
              status_name: "Active",
              description: ""
            }
          },
        ]);
      }
      setUnassignedTraps((prev) => prev.filter((t) => t.id !== selectedTrapId));
      handleClearForm();
    } catch {
      showToast("error", "Failed to deploy trap. Please try again.");
    }
  };

  const handleClearForm = () => {
    applyTrapToForm(null);
    setIsSaved(false);
  };

  const handlePickUp = async (trap: OvitrapDevice) => {
    try {
      let offlineStatusId = trap.device_status_id;
      const { data: statusData } = await supabase
        .from("device_statuses")
        .select("id")
        .ilike("status_name", "Offline")
        .limit(1)
        .maybeSingle();

      if (statusData?.id) {
        offlineStatusId = statusData.id;
      }

      const { error } = await supabase
        .from("ovitrap_devices")
        .update({
          latitude: null,
          longitude: null,
          deployed_by: null,
          device_status_id: offlineStatusId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trap.id);

      if (error) throw error;

      showToast("success", `${trap.device_code} picked up from the map.`);
      
      setDeployedTraps((prev) => prev.filter((t) => t.id !== trap.id));
      setUnassignedTraps((prev) => [
        ...prev,
        {
          ...trap,
          latitude: null,
          longitude: null,
          device_statuses: offlineStatusId
            ? { id: offlineStatusId, status_name: "Offline", description: "" }
            : trap.device_statuses,
        },
      ]);
    } catch {
      showToast("error", "Failed to pick up trap. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-5rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Static Georeferencing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Deploy and register Smart Ovi Traps on the map
          </p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            <Check className="w-3.5 h-3.5" /> Trap Deployed
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <aside className="w-96 flex-shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col gap-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-0.5">
              Deployment Information
            </h2>
            <p className="text-xs text-slate-500">Configure Smart Ovi Trap deployment</p>
          </section>

          <section className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Select Trap
            </label>
            {trapsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading traps…
              </div>
            ) : (
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-slate-50 text-sm px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={selectedTrapId}
                onChange={(e) => handleTrapSelect(e.target.value)}
              >
                <option value="">— Choose an Unassigned Trap —</option>
                {unassignedTraps.map((trap) => (
                  <option key={trap.id} value={trap.id}>
                    {trap.device_code}
                  </option>
                ))}
              </select>
            )}

            {selectedTrap && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-600">Status</span>
                  <span className="ml-auto flex items-center gap-1 text-amber-700 font-semibold">
                    🟡 {selectedTrap.device_statuses?.status_name ?? "Unassigned"}
                  </span>
                </div>
                {selectedTrap.description && (
                  <div className="flex items-start gap-1.5">
                    <span className="font-medium text-slate-600">Description</span>
                    <span className="ml-auto text-slate-500 text-right">{selectedTrap.description}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Location Information
            </h3>
            <div>
              <Label className="text-xs mb-1 block">Location Name</Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Near Central Park"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Barangay</Label>
              <Input
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                placeholder="e.g. Barangay 123"
                className="h-9"
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Coordinates
            </h3>
            <p className="text-xs text-slate-400">
              Click the map or use "Get My Location" to fill these fields.
            </p>
            <div>
              <Label className="text-xs mb-1 block">Latitude</Label>
              <Input readOnly value={latInput} className="h-9 bg-slate-100 text-slate-600 cursor-default" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Longitude</Label>
              <Input readOnly value={lngInput} className="h-9 bg-slate-100 text-slate-600 cursor-default" />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Deployment Details
            </h3>
            <div>
              <Label className="text-xs mb-1 block">Deployment Date</Label>
              <Input
                type="date"
                value={deploymentDate}
                onChange={(e) => setDeploymentDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Deployed By</Label>
              <Input
                value={deployedBy}
                onChange={(e) => setDeployedBy(e.target.value)}
                placeholder="e.g. Juan Espira"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes (Optional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes…"
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleDeploy}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Deploy Trap
            </Button>
            <Button
              onClick={handleClearForm}
              variant="outline"
              className="flex-1"
            >
              Clear Form
            </Button>
          </div>
        </aside>

        <div className="relative flex-1">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />
            {deployedTraps.map((trap) => (
              <Marker
                key={trap.id}
                ref={(r) => { markerRefs.current[trap.id] = r; }}
                position={[trap.latitude!, trap.longitude!]}
                icon={createCustomMarker(trap.device_statuses?.status_name ?? "Active")}
              >
                <Popup>
                  <div className="w-48 p-1">
                    <h3 className="font-bold text-slate-800 text-sm mb-1">{trap.device_code}</h3>
                    {trap.description && <p className="text-xs text-slate-600 mb-2">{trap.description}</p>}
                    
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">Barangay:</span>
                        <span>{trap.barangays?.barangay_name ?? "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Status:</span>
                        <span>{trap.device_statuses?.status_name ?? "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Battery:</span>
                        <span>89%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Last Sync:</span>
                        <span>2 mins ago</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-7 text-xs px-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(ROUTES.admin.nodes);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-7 text-xs px-1 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickUp(trap);
                        }}
                      >
                        Pick up
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-7 text-xs px-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(ROUTES.admin.nodes);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            <Marker position={markerPos} icon={createCustomMarker("Default")} />
          </MapContainer>

          <div className="absolute left-4 bottom-4 z-[999]">
            <Button
              onClick={handleGetMyLocation}
              disabled={isLocating}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-lg text-xs font-semibold transition-all"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span>Locating…</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-emerald-600 rotate-45" />
                  <span>Get My Location</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all
            ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : ""}
            ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : ""}
            ${toast.type === "info" ? "bg-sky-50 border-sky-200 text-sky-800" : ""}
          `}
        >
          {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
          {toast.type === "success" && <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
