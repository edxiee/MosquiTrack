import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  Bug,
  Battery,
  MapPin,
  Activity,
  ShieldAlert,
  FileText,
  Bell,
  Flame,
  ChevronRight
} from "lucide-react";

import "leaflet/dist/leaflet.css";

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const BARANGAY_NAME = "San Juan";
const BARANGAY_CENTER = { lat: 14.605, lng: 121.030 };

const MOCK_TRAPS = [
  {
    id: "TRAP-001",
    location: "Public Market",
    status: "Online",
    count: 28,
    lastComm: "10 minutes ago",
    battery: 89,
    lat: 14.6045,
    lng: 121.0315,
    activityLevel: "High", // High Activity -> Orange
  },
  {
    id: "TRAP-002",
    location: "Barangay Plaza",
    status: "Delayed",
    count: 14,
    lastComm: "5 hours ago",
    battery: 45,
    lat: 14.6065,
    lng: 121.0325,
    activityLevel: "Moderate", // Moderate Activity -> Yellow
  },
  {
    id: "TRAP-003",
    location: "Elementary School",
    status: "Offline",
    count: 0,
    lastComm: "2 days ago",
    battery: 0,
    lat: 14.6080,
    lng: 121.0280,
    activityLevel: "Low", // Low Activity -> Green
  },
  {
    id: "TRAP-004",
    location: "Residential Block 4",
    status: "Online",
    count: 55,
    lastComm: "Just now",
    battery: 92,
    lat: 14.6030,
    lng: 121.0290,
    activityLevel: "Critical", // Critical Activity -> Red
  }
];

const MOCK_TREND = [
  { date: "Aug 1", count: 45 },
  { date: "Aug 2", count: 52 },
  { date: "Aug 3", count: 48 },
  { date: "Aug 4", count: 61 },
  { date: "Aug 5", count: 75 },
  { date: "Aug 6", count: 88 },
  { date: "Aug 7", count: 97 }, // Today's total count
];

const MOCK_DETECTIONS = [
  { time: "10:30 AM", trapId: "TRAP-004", location: "Residential Block 4", count: 18, status: "Verified" },
  { time: "09:45 AM", trapId: "TRAP-001", location: "Public Market", count: 12, status: "Verified" },
  { time: "08:15 AM", trapId: "TRAP-004", location: "Residential Block 4", count: 15, status: "Verified" },
  { time: "07:30 AM", trapId: "TRAP-002", location: "Barangay Plaza", count: 8, status: "Verified" },
  { time: "06:00 AM", trapId: "TRAP-001", location: "Public Market", count: 10, status: "Verified" },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!lastCoords.current || lastCoords.current.lat !== lat || lastCoords.current.lng !== lng) {
      lastCoords.current = { lat, lng };
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);

  return null;
}

const getActivityColor = (activity: string) => {
  switch (activity) {
    case 'Critical': return 'rose';
    case 'High': return 'orange';
    case 'Moderate': return 'amber';
    default: return 'emerald';
  }
};

const getHexColor = (colorName: string) => {
  switch (colorName) {
    case 'rose': return '#f43f5e';
    case 'orange': return '#f97316';
    case 'amber': return '#f59e0b';
    case 'emerald': return '#10b981';
    default: return '#64748b';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Online': return 'emerald';
    case 'Delayed': return 'amber';
    case 'Offline': return 'rose';
    default: return 'slate';
  }
};

const createCustomMarker = (activity: string) => {
  const bg = getActivityColor(activity);
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-30 animate-ping"></div>
        <div class="absolute inset-0 bg-${bg}-500 rounded-full opacity-20"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-${bg}-600 relative z-10 drop-shadow-sm">
          <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

export default function BarangaySurveillancePage() {
  const [selectedTrap, setSelectedTrap] = useState(MOCK_TRAPS[0]);

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto min-h-full">
      {/* ── PAGE TITLE ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Barangay Surveillance</h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
            Monitor mosquito activity and deployed Smart Ovi Traps within your assigned barangay.
          </p>
        </div>
      </div>

      {/* ── TOP SUMMARY CARDS ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Barangay Risk</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="text-2xl font-bold text-orange-600">Moderate Risk</h2>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Mosquito Count</p>
              <h2 className="mt-2 text-3xl font-bold text-rose-600">97</h2>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
              <Bug className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Smart Ovi Traps</p>
              <h2 className="mt-2 text-3xl font-bold text-emerald-600">2 Active</h2>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Daily Vector Index</p>
              <h2 className="mt-2 text-3xl font-bold text-amber-600">18</h2>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MAIN SECTION: 35/65 SPLIT ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* LEFT SIDE (35%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Barangay Overview */}
          <Card className="bg-gradient-to-br from-white to-orange-50/30 border-orange-100">
            <CardHeader className="pb-3 border-b border-orange-50/50">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                Barangay Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Barangay Name</p>
                <p className="text-lg font-black text-slate-800">{BARANGAY_NAME}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Current Risk Level</p>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Moderate Risk</Badge>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500 uppercase">Current DVI</p>
                <p className="text-base font-bold text-slate-700">18</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-orange-100/50">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Latest Recommendation</p>
                <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm text-sm text-slate-700 leading-relaxed font-medium">
                  Conduct community cleanup around the public market due to increased mosquito detections over the last three monitoring periods.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trap Summary List */}
          <Card className="flex-1 flex flex-col min-h-[400px]">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                Trap Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[500px]">
              <div className="divide-y divide-slate-100">
                {MOCK_TRAPS.map(trap => {
                  const isSelected = selectedTrap?.id === trap.id;
                  const sColor = getStatusColor(trap.status);
                  
                  return (
                    <button
                      key={trap.id}
                      onClick={() => setSelectedTrap(trap)}
                      className={`w-full text-left px-5 py-4 flex flex-col gap-2 transition-colors ${
                        isSelected ? `bg-${sColor}-50/50 border-l-[3px] border-l-${sColor}-500` : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full bg-${sColor}-500 ${trap.status === 'Online' ? 'animate-pulse' : ''}`} />
                          <span className="font-bold text-slate-800 text-sm">{trap.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider text-${sColor}-700`}>{trap.status}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {trap.location}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100/60">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase">Count</p>
                          <p className={`text-xs font-bold ${trap.count > 0 ? 'text-rose-600' : 'text-slate-600'}`}>{trap.count}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase">Battery</p>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Battery className="h-3 w-3" /> {trap.battery}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase">Last Comm</p>
                          <p className="text-xs font-medium text-slate-500 truncate">{trap.lastComm}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE (65%) */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden min-h-[500px]">
            <CardHeader className="pb-3 border-b border-slate-100 bg-white z-10 shadow-sm relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Barangay Interactive Map
                </CardTitle>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500"/> Low</span>
                  <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500"/> Mod</span>
                  <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-500"/> High</span>
                  <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500"/> Crit</span>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 relative z-0">
              <MapContainer
                center={[BARANGAY_CENTER.lat, BARANGAY_CENTER.lng]}
                zoom={16}
                zoomControl={false}
                className="w-full h-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {selectedTrap && <MapFlyTo lat={selectedTrap.lat} lng={selectedTrap.lng} />}
                
                {MOCK_TRAPS.map((trap) => {
                  const sColor = getStatusColor(trap.status);
                  const aColor = getActivityColor(trap.activityLevel);
                  const hexColor = getHexColor(aColor);

                  return (
                    <div key={trap.id}>
                      <Circle
                        center={[trap.lat, trap.lng]}
                        radius={75}
                        pathOptions={{
                          color: hexColor,
                          fillColor: hexColor,
                          fillOpacity: 0.15,
                          weight: 1.5,
                          dashArray: "4 4"
                        }}
                      />
                      <Marker
                        position={[trap.lat, trap.lng]}
                        icon={createCustomMarker(trap.activityLevel)}
                        eventHandlers={{
                          click: () => setSelectedTrap(trap),
                        }}
                      >
                        <Popup className="custom-popup">
                          <div className="p-1 space-y-3 min-w-[200px]">
                            <div className="flex items-center justify-between border-b pb-2">
                              <p className="font-bold text-slate-800">{trap.id}</p>
                              <Badge className={`bg-${sColor}-100 text-${sColor}-700 border-none px-1.5 py-0 text-[10px]`}>{trap.status}</Badge>
                            </div>
                            <div className="space-y-1.5 text-xs text-slate-600">
                              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {trap.location}</p>
                              <p className="flex items-center gap-2"><Bug className="h-3.5 w-3.5 text-slate-400" /> 
                                Count: <span className={`font-bold text-${aColor}-600`}>{trap.count}</span>
                              </p>
                              <p className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-slate-400" /> DVI: {(trap.count / 3.2).toFixed(1)}</p>
                              <p className="flex items-center gap-2"><Battery className="h-3.5 w-3.5 text-slate-400" /> Battery: {trap.battery}%</p>
                              <p className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t">Last Comm: {trap.lastComm}</p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  );
                })}
              </MapContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ── BOTTOM SECTION: TREND & TABLE ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mosquito Activity Trend */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              Mosquito Activity Trend (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-2 pl-0 pr-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6, fill: '#0284c7', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Latest Detections */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Bug className="h-4 w-4 text-slate-500" />
              Latest Detections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-semibold text-slate-500">Time</TableHead>
                  <TableHead className="font-semibold text-slate-500">Trap ID</TableHead>
                  <TableHead className="font-semibold text-slate-500">Location</TableHead>
                  <TableHead className="font-semibold text-slate-500 text-center">Count</TableHead>
                  <TableHead className="font-semibold text-slate-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DETECTIONS.map((det, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-slate-500 font-medium">{det.time}</TableCell>
                    <TableCell className="font-bold text-slate-800">{det.trapId}</TableCell>
                    <TableCell className="text-slate-600">{det.location}</TableCell>
                    <TableCell className="text-center font-bold text-rose-600">{det.count}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none">
                        {det.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="bg-white hover:bg-slate-100 h-10 px-5 border-slate-200 text-slate-700 font-medium">
              <FileText className="mr-2 h-4 w-4 text-sky-600" />
              Generate Barangay Report
            </Button>
            <Button variant="outline" className="bg-white hover:bg-slate-100 h-10 px-5 border-slate-200 text-slate-700 font-medium">
              <ChevronRight className="mr-2 h-4 w-4 text-emerald-600" />
              View Trap Details
            </Button>
            <Button variant="outline" className="bg-white hover:bg-slate-100 h-10 px-5 border-slate-200 text-slate-700 font-medium">
              <Bell className="mr-2 h-4 w-4 text-amber-600" />
              Notify LGU
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm h-10 px-5 font-semibold">
              <Flame className="mr-2 h-4 w-4" />
              Request Fogging
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}