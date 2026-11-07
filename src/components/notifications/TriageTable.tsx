import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { MapErrorBoundary } from "@/components/system/MapErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Play,
  Settings2,
  UserRound,
} from "lucide-react";
import type { TriageAction, TriageStatus } from "@/types/triage.types";
import type { TriageView } from "@/components/notifications/TriageStatistics";
import {
  DOT_STYLES,
  PRIORITY_BORDER,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from "@/utils/triageHelpers";
import "leaflet/dist/leaflet.css";

const trapMapPinIcon = L.divIcon({
  className: "custom-div-icon",
  html: `
    <div class="relative w-10 h-10 flex items-center justify-center -translate-y-3">
      <div class="absolute inset-0 bg-emerald-500 rounded-full opacity-35 animate-ping"></div>
      <div class="absolute inset-1.5 bg-emerald-100 rounded-full border-2 border-emerald-600 shadow-sm"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-emerald-700 relative z-10 drop-shadow-sm">
        <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface TriageTableProps {
  actions: TriageAction[];
  isLoading: boolean;
  onUpdateStatus: (action: TriageAction) => void;
  onQuickStatus: (action: TriageAction, status: TriageStatus) => void;
  onCompleteAction?: (action: TriageAction) => void;
  onCancelAction: (action: TriageAction) => void;
  view: TriageView;
  borderless?: boolean;
  newActionIds?: Set<string>;
}

function Badge({
  label,
  styles,
}: {
  label: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[label] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[label] ?? "bg-slate-400"}`} />
      {label}
    </span>
  );
}

function formatDate(d: string | null) {
  const date = d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

export default function TriageTable({
  actions,
  isLoading,
  onUpdateStatus,
  onQuickStatus,
  onCompleteAction,
  onCancelAction,
  view,
  borderless = false,
  newActionIds,
}: TriageTableProps) {
  const [detailAction, setDetailAction] = useState<TriageAction | null>(null);
  const [streetAddress, setStreetAddress] = useState<{
    street: string;
    fullAddress: string;
    loading: boolean;
  }>({ street: "", fullAddress: "", loading: false });

  const detailLat = detailAction?.deviceLatitude;
  const detailLng = detailAction?.deviceLongitude;
  const hasValidCoordinates =
    detailLat != null &&
    detailLng != null &&
    !Number.isNaN(Number(detailLat)) &&
    !Number.isNaN(Number(detailLng)) &&
    Number(detailLat) !== 0 &&
    Number(detailLng) !== 0;

  useEffect(() => {
    if (!detailAction || !hasValidCoordinates) {
      setStreetAddress({ street: "", fullAddress: "", loading: false });
      return;
    }

    let cancelled = false;
    setStreetAddress({ street: "", fullAddress: "", loading: true });

    const lat = Number(detailLat);
    const lng = Number(detailLng);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const addr = data?.address ?? {};
        const road =
          addr.road ||
          addr.street ||
          addr.pedestrian ||
          addr.residential ||
          addr.footway ||
          addr.path ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.village ||
          "";
        const houseNumber = addr.house_number ? `${addr.house_number} ` : "";
        const computedStreet = road ? `${houseNumber}${road}` : "";
        const display = data?.display_name || "";

        setStreetAddress({
          street:
            computedStreet ||
            detailAction.deviceDescription ||
            detailAction.deviceNotes ||
            detailAction.barangayName,
          fullAddress: display,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStreetAddress({
          street:
            detailAction.deviceDescription ||
            detailAction.deviceNotes ||
            detailAction.barangayName,
          fullAddress: "",
          loading: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [detailAction, hasValidCoordinates, detailLat, detailLng]);

  const showPriority = view !== "closed";
  const showPosted = view === "pending";
  const showDue = view !== "closed";
  const showTakenBy = view !== "pending";
  const columnCount =
    5 + Number(showPriority) + Number(showPosted) + Number(showDue) + Number(showTakenBy);

  if (isLoading) {
    if (borderless) {
      return (
        <>
          <div className="divide-y divide-slate-100 md:hidden" aria-label="Loading actions">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2 px-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <span className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                </div>
                <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <span className="block h-3 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="hidden space-y-3 p-6 md:block" aria-label="Loading actions">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </>
      );
    }
    return (
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-3 p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const tableElement = (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="text-xs uppercase tracking-wide">Task</TableHead>
          <TableHead className="text-xs uppercase tracking-wide">Location</TableHead>
          {showPriority && <TableHead className="text-xs uppercase tracking-wide">Priority</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
          {showPosted && <TableHead className="text-xs uppercase tracking-wide">Posted</TableHead>}
          {showDue && <TableHead className="text-xs uppercase tracking-wide">Due</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">Requested By</TableHead>
          {showTakenBy && <TableHead className="text-xs uppercase tracking-wide">Taken By</TableHead>}
          <TableHead className="text-xs uppercase tracking-wide">
              Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
            {actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                    <div className="rounded-full bg-slate-100 p-4">
                      <Inbox className="h-7 w-7" />
                    </div>
                    <p className="font-medium text-slate-700">No action items found</p>
                    <p className="text-sm">Try adjusting your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action) => {
                const closed =
                  action.status === "Completed" || action.status === "Cancelled";
                const isNew = Boolean(newActionIds?.has(action.id));
                return (
                  <TableRow
                    key={action.id}
                    onClick={() => setDetailAction(action)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailAction(action);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View details for ${action.triggerSource}`}
                    className={`group border-l-4 transition-colors ${
                      isNew
                        ? "bg-rose-50/50 hover:bg-rose-50/80"
                        : "hover:bg-slate-50"
                    } ${PRIORITY_BORDER[action.priority] ?? ""} ${closed ? "opacity-70" : ""} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600`}
                  >
                    <TableCell className="min-w-[200px] max-w-[360px]">
                      <div className="flex items-center gap-2">
                        <span className="text-left font-semibold text-slate-800 group-hover:text-emerald-700">
                          {action.triggerSource}
                        </span>
                        {isNew && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white tracking-wider animate-pulse shadow-xs">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-slate-400">
                        #{action.id.slice(0, 8)}
                      </p>
                      {action.remarks && (
                        <p
                          className="mt-1 flex items-start gap-1 truncate text-xs text-slate-500"
                          title={action.remarks}
                        >
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="truncate">{action.remarks}</span>
                        </p>
                      )}
                      {action.imageUrl && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <ImageIcon className="h-3 w-3 shrink-0" />
                          Proof photo attached
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
                        title={[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>
                          {[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
                        </span>
                      </p>
                      {(action.deviceDescription || action.deviceNotes) && (
                        <p className="mt-0.5 text-xs font-medium text-emerald-700 truncate max-w-[240px]">
                          {action.deviceDescription || action.deviceNotes}
                        </p>
                      )}
                      {action.deviceCode && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Cpu className="h-3.5 w-3.5 text-slate-400" />
                          {action.deviceCode}
                        </p>
                      )}
                    </TableCell>
                    {showPriority && <TableCell>
                      <Badge label={action.priority} styles={PRIORITY_STYLES} />
                    </TableCell>}
                    <TableCell>
                      <Badge label={action.status} styles={STATUS_STYLES} />
                    </TableCell>
                    {showPosted && <TableCell className="text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.createdAt)}
                      </span>
                    </TableCell>}
                    {showDue && <TableCell className="whitespace-nowrap text-sm text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(action.dueDate)}
                      </span>
                    </TableCell>}
                    <TableCell>
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </span>
                        {action.requestedByName ? (
                          action.requestedByName
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </span>
                    </TableCell>
                    {showTakenBy && <TableCell>
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound className="h-4 w-4" />
                        </span>
                        {action.assignedToName ? (
                          action.assignedToName
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </span>
                    </TableCell>}
                    <TableCell
                      className="whitespace-nowrap"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-start gap-2">
                        {action.status === "Pending" && (
                          <Button
                            size="sm"
                            className="bg-sky-600 text-white transition-transform hover:-translate-y-0.5 hover:bg-sky-700"
                            onClick={() => onQuickStatus(action, "In Progress")}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start
                          </Button>
                        )}
                        {action.status === "In Progress" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white transition-transform hover:-translate-y-0.5 hover:bg-emerald-700"
                            onClick={() =>
                              onCompleteAction
                                ? onCompleteAction(action)
                                : onQuickStatus(action, "Completed")
                            }
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                        {view === "inProgress" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                            onClick={() => onCancelAction(action)}
                          >
                            Cancel
                          </Button>
                        ) : view === "closed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus(action)}
                            aria-label="Manage action"
                          >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                            Manage
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
  );

  const details = detailAction
    ? [
        ["Task", detailAction.triggerSource],
        ["Status", detailAction.status],
        ["Priority", detailAction.priority],
        ["Barangay", detailAction.barangayName],
        ["Municipality", detailAction.municipalityName],
        ["Requested By", detailAction.requestedByName],
        ["Taken By", detailAction.assignedToName],
        ["Posted", formatDate(detailAction.createdAt)],
        ["Due", formatDate(detailAction.dueDate)],
        ["Remarks", detailAction.remarks],
      ]
    : [];

  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <div className="rounded-full bg-slate-100 p-3 text-slate-500">
              <Inbox className="size-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No action items found</p>
            <p className="text-xs">Try adjusting your filters.</p>
          </div>
        ) : (
          actions.map((action) => (
            <article key={action.id} className="bg-white px-3 py-3.5">
              <button
                type="button"
                className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                onClick={() => setDetailAction(action)}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold leading-5 text-slate-900">
                    {action.triggerSource}
                    {newActionIds?.has(action.id) && (
                      <span className="ml-2 inline-flex rounded bg-rose-500 px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                  </span>
                  <Badge label={action.status} styles={STATUS_STYLES} />
                </div>
                <div className="mt-2 flex min-w-0 items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-words">
                    {[action.municipalityName, action.barangayName].filter(Boolean).join(", ")}
                    {action.deviceCode ? ` · ${action.deviceCode}` : ""}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {showPriority && <Badge label={action.priority} styles={PRIORITY_STYLES} />}
                  <span>{showPosted ? `Posted ${formatDate(action.createdAt)}` : `Due ${formatDate(action.dueDate)}`}</span>
                  {showTakenBy && action.assignedToName && <span>Taken by {action.assignedToName}</span>}
                  {action.requestedByName && <span>By {action.requestedByName}</span>}
                </div>
                {action.remarks && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <MessageSquare className="mt-0.5 size-3 shrink-0" />
                    <span className="line-clamp-2">{action.remarks}</span>
                  </p>
                )}
              </button>
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {action.status === "Pending" && (
                  <Button
                    size="sm"
                    className="min-h-9 bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => onQuickStatus(action, "In Progress")}
                  >
                    <Play className="mr-1.5 size-3.5" />
                    Start
                  </Button>
                )}
                {action.status === "In Progress" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-9 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => onCancelAction(action)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="min-h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onCompleteAction ? onCompleteAction(action) : onQuickStatus(action, "Completed")}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Complete
                    </Button>
                  </>
                )}
                {(action.status === "Completed" || action.status === "Cancelled") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-9"
                    onClick={() => onUpdateStatus(action)}
                  >
                    <Settings2 className="mr-1.5 size-3.5" />
                    Manage
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      {borderless ? (
        <div className="hidden overflow-x-auto md:block">{tableElement}</div>
      ) : (
        <Card className="hidden overflow-hidden rounded-2xl border-slate-200 shadow-sm md:block">
          <CardContent className="overflow-x-auto p-0">{tableElement}</CardContent>
        </Card>
      )}
      <Dialog
        open={!!detailAction}
        onOpenChange={(open) => {
          if (!open) setDetailAction(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[85dvh] overflow-y-auto rounded-2xl p-4 sm:max-h-[90dvh] sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <span>Task & Trap Location Details</span>
              {detailAction?.deviceCode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Cpu className="h-3.5 w-3.5" />
                  {detailAction.deviceCode}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Review the exact street address, trap placement, and map location for field operations.
            </DialogDescription>
          </DialogHeader>
          {detailAction && (
            <div className="space-y-4">
              {/* Exact Trap Location & Street Box for Field Operatives */}
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          Exact Trap Location & Street
                        </p>
                        {streetAddress.loading ? (
                          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                            Identifying street address...
                          </p>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-900">
                              Street:{" "}
                              <span className="text-emerald-800">
                                {streetAddress.street ||
                                  detailAction.deviceDescription ||
                                  detailAction.deviceNotes ||
                                  detailAction.barangayName}
                              </span>
                            </p>
                            {streetAddress.fullAddress && (
                              <p className="text-xs leading-relaxed text-slate-600">
                                {streetAddress.fullAddress}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {hasValidCoordinates && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${Number(detailAction.deviceLatitude)},${Number(detailAction.deviceLongitude)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Directions
                        <ExternalLink className="h-3 w-3 opacity-80" />
                      </a>
                    )}
                  </div>

                  {/* Where is the trap / Placement Details */}
                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-200/80 bg-white p-3 text-xs sm:grid-cols-2">
                    <div>
                      <span className="font-semibold uppercase text-[10px] tracking-wider text-slate-400 block">
                        Where is the Trap (Landmark / Site)
                      </span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {detailAction.deviceDescription ||
                          detailAction.deviceNotes ||
                          `Deployed in ${detailAction.barangayName}`}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold uppercase text-[10px] tracking-wider text-slate-400 block">
                        Exact GPS Coordinates
                      </span>
                      <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                        {hasValidCoordinates
                          ? `${Number(detailAction.deviceLatitude).toFixed(5)}, ${Number(detailAction.deviceLongitude).toFixed(5)}`
                          : "Coordinates pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Map Pinpointing the Trap */}
                {hasValidCoordinates ? (
                  <div className="relative h-56 w-full border-t border-emerald-200">
                    <MapErrorBoundary>
                      <MapContainer
                        key={`${detailAction.id}-${detailAction.deviceLatitude}-${detailAction.deviceLongitude}`}
                        center={[
                          Number(detailAction.deviceLatitude),
                          Number(detailAction.deviceLongitude),
                        ]}
                        zoom={17}
                        scrollWheelZoom={false}
                        className="h-full w-full z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker
                          position={[
                            Number(detailAction.deviceLatitude),
                            Number(detailAction.deviceLongitude),
                          ]}
                          icon={trapMapPinIcon}
                        >
                          <Popup>
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-slate-900">
                                {detailAction.deviceCode || "Target Trap"}
                              </p>
                              <p className="font-medium text-emerald-700">
                                {streetAddress.street || detailAction.barangayName}
                              </p>
                              {(detailAction.deviceDescription || detailAction.deviceNotes) && (
                                <p className="text-slate-600">
                                  {detailAction.deviceDescription || detailAction.deviceNotes}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </MapErrorBoundary>
                  </div>
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center border-t border-emerald-200 bg-slate-50 text-xs text-slate-400">
                    <MapPin className="mb-1.5 h-6 w-6 opacity-50" />
                    <p>No GPS coordinates recorded for this trap yet.</p>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-6">
                {details.map(([label, value]) => (
                  <div
                    key={label}
                    className={`min-w-0 border-b border-slate-100 pb-2 ${label === "Task" || label === "Remarks" ? "col-span-2" : ""}`}
                  >
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-slate-900">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {detailAction.imageUrl && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Proof of Completion
                  </h3>
                  <img
                    src={detailAction.imageUrl}
                    alt="Proof of completion"
                    className="max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>
          )}
          {detailAction && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end sm:pt-4">
              {detailAction.status === "Pending" && (
                <Button
                  className="min-h-10 w-full bg-sky-600 text-white hover:bg-sky-700 sm:w-auto"
                  onClick={() => {
                    setDetailAction(null);
                    onQuickStatus(detailAction, "In Progress");
                  }}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Start
                </Button>
              )}
              {detailAction.status === "In Progress" && (
                <>
                  <Button
                    variant="outline"
                    className="min-h-10 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-auto"
                    onClick={() => {
                      setDetailAction(null);
                      onCancelAction(detailAction);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="min-h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                    onClick={() => {
                      setDetailAction(null);
                      if (onCompleteAction) {
                        onCompleteAction(detailAction);
                      } else {
                        onQuickStatus(detailAction, "Completed");
                      }
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Complete
                  </Button>
                </>
              )}
              {(detailAction.status === "Completed" || detailAction.status === "Cancelled") && (
                <Button
                  variant="outline"
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => {
                    setDetailAction(null);
                    onUpdateStatus(detailAction);
                  }}
                >
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  Manage
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
