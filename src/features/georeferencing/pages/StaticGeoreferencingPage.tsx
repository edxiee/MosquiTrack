import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Compass,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import "leaflet/dist/leaflet.css";

// Fix for default leaflet marker icon resolution in Vite
// We use a custom, highly styled divIcon using Tailwind for a premium feel
const createCustomMarker = (isActive: boolean) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="flex items-center justify-center -translate-y-4">
        <div class="relative w-10 h-10 flex items-center justify-center">
          ${
            isActive
              ? `<div class="absolute inset-0 bg-emerald-500 rounded-full opacity-40 animate-ping"></div>`
              : ""
          }
          <div class="absolute inset-2 bg-emerald-100 rounded-full shadow-inner"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-emerald-600 relative z-10 filter drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const defaultCenter: [number, number] = [14.5995, 120.9842]; // Manila, Philippines

// Component to handle map view updates (pan/zoom)
function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// Component to listen to map clicks and set coordinates
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StaticGeoreferencingPage() {
  // Load saved coordinates from localStorage if they exist, else use default
  const [latInput, setLatInput] = useState<string>(() => {
    return localStorage.getItem("georef_lat") || defaultCenter[0].toString();
  });
  const [lngInput, setLngInput] = useState<string>(() => {
    return localStorage.getItem("georef_lng") || defaultCenter[1].toString();
  });

  const [markerPos, setMarkerPos] = useState<[number, number]>(() => {
    const lat = parseFloat(localStorage.getItem("georef_lat") || "");
    const lng = parseFloat(localStorage.getItem("georef_lng") || "");
    return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : defaultCenter;
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>(markerPos);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setLatInput(roundedLat.toString());
    setLngInput(roundedLng.toString());
    setMarkerPos([roundedLat, roundedLng]);
    setIsSaved(false);
    showToast("info", "Coordinates selected from map");
  };

  // Handle manual "Set" button confirmation
  const handleSetCoordinates = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      showToast("error", "Please enter a valid Latitude between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      showToast("error", "Please enter a valid Longitude between -180 and 180.");
      return;
    }

    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    setMarkerPos([roundedLat, roundedLng]);
    setMapCenter([roundedLat, roundedLng]);
    setMapZoom(15);
    localStorage.setItem("georef_lat", roundedLat.toString());
    localStorage.setItem("georef_lng", roundedLng.toString());
    setIsSaved(true);
    showToast("success", "Georeferenced coordinates saved successfully!");
  };

  // Handle Browser Geolocation
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      showToast("error", "Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    showToast("info", "Requesting device location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const roundedLat = parseFloat(latitude.toFixed(6));
        const roundedLng = parseFloat(longitude.toFixed(6));

        setLatInput(roundedLat.toString());
        setLngInput(roundedLng.toString());
        setMarkerPos([roundedLat, roundedLng]);
        setMapCenter([roundedLat, roundedLng]);
        setMapZoom(16);
        setIsLocating(false);
        setIsSaved(false);
        showToast("success", "Location retrieved successfully!");
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow access in browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        showToast("error", errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-5rem)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Static Georeferencing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pinpoint and confirm the exact spatial coordinates for mosquito monitoring nodes and analysis.
          </p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 self-start md:self-auto animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            Coordinates Synchronized
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-md">
        {/* Leaflet Map */}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false} // Disable default top-left zoom so we don't conflict with our custom UI
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />
          <Marker position={markerPos} icon={createCustomMarker(true)} />
        </MapContainer>

        {/* Floating Custom Zoom Controls (Top Right) */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1 shadow-md rounded-lg overflow-hidden bg-white/90 border border-slate-200 backdrop-blur">
          {/* Zoom controls handled implicitly or via custom map calls, 
              but standard mouse wheel/double click and touch zoom remain active.
              We also keep a beautiful scale indicator. */}
        </div>

        {/* Toast Feedback Overlay */}
        {toast && (
          <div
            className={`absolute top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur transition-all duration-300 transform translate-y-0 scale-100 ${
              toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50/95 border-rose-200 text-rose-800"
                : "bg-slate-900/95 border-slate-800 text-white"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            ) : toast.type === "success" ? (
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <Compass className="w-5 h-5 flex-shrink-0 text-emerald-500 animate-spin-slow" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* Floating Coordinate Input Panel (Top-Left Corner) */}
        <div className="absolute left-4 top-4 z-10 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Coordinate Reference</h2>
              <p className="text-[10px] text-slate-500">Configure or select site coordinates</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="latitude" className="text-xs font-semibold text-slate-600">
                Latitude (X Coordinate)
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g. 14.5995"
                value={latInput}
                onChange={(e) => {
                  setLatInput(e.target.value);
                  setIsSaved(false);
                }}
                className="h-9 text-sm focus-visible:ring-emerald-500 bg-slate-50/50 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="longitude" className="text-xs font-semibold text-slate-600">
                Longitude (Y Coordinate)
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g. 120.9842"
                value={lngInput}
                onChange={(e) => {
                  setLngInput(e.target.value);
                  setIsSaved(false);
                }}
                className="h-9 text-sm focus-visible:ring-emerald-500 bg-slate-50/50 border-slate-200"
              />
            </div>

            <Button
              onClick={handleSetCoordinates}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs tracking-wide shadow-sm transition-colors rounded-lg flex items-center justify-center gap-1.5"
            >
              Set Coordinates
            </Button>
          </div>
        </div>

        {/* Floating Current Location Button (Bottom-Left Corner) */}
        <div className="absolute left-4 bottom-4 z-10">
          <Button
            onClick={handleGetMyLocation}
            disabled={isLocating}
            className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 shadow-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-85 disabled:pointer-events-none"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>Locating...</span>
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
  );
}