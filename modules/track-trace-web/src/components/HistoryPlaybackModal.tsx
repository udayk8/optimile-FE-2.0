import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Truck,
  X,
} from 'lucide-react';

export interface PlaybackPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
}

export interface PlaybackAlertPoint {
  lat: number;
  lng: number;
  timestamp: string;
  label: string;
  severity: 'High' | 'Medium' | 'Low';
}

interface HistoryPlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleRegistration: string;
  driverName: string;
  points: PlaybackPoint[];
  alertPoints?: PlaybackAlertPoint[];
}

// Compact marker — visually appropriate for a zoomed-in playback view
const playbackMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:44px;border-radius:6px;
    background:#2563eb;border:2px solid #fff;
    box-shadow:0 4px 14px rgba(37,99,235,.45);
    display:flex;align-items:flex-start;justify-content:center;
    position:relative;
  ">
    <div style="margin-top:4px;width:18px;height:7px;background:#93c5fd;border-radius:3px"></div>
    <div style="position:absolute;bottom:4px;font-size:13px;line-height:1">🚚</div>
  </div>`,
  iconSize: [28, 44],
  iconAnchor: [14, 40],
});

const severityColor = (s: 'High' | 'Medium' | 'Low') =>
  s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e0b' : '#3b82f6';

const dayKey = (ts: string) => new Date(ts).toISOString().slice(0, 10);

const fmt = (ts: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(ts).toLocaleTimeString([], opts);

const fmtShort = (ts: string) => fmt(ts, { hour: '2-digit', minute: '2-digit' });
const fmtFull = (ts: string) =>
  fmt(ts, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

// Small reusable icon button for the control bar
function CtrlBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

export const HistoryPlaybackModal: React.FC<HistoryPlaybackModalProps> = ({
  isOpen,
  onClose,
  vehicleRegistration,
  driverName,
  points,
  alertPoints = [],
}) => {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const mapRef = useRef<L.Map | null>(null);

  const fallback = useMemo<PlaybackPoint[]>(
    () => [{ lat: 18.5204, lng: 73.8567, speed: 0, timestamp: new Date().toISOString() }],
    [],
  );

  const availableDays = useMemo(
    () =>
      Array.from(new Set(points.map((p) => dayKey(p.timestamp)))).sort((a, b) =>
        a < b ? 1 : -1,
      ),
    [points],
  );

  const filteredPoints = useMemo(
    () => (selectedDay === 'all' ? points : points.filter((p) => dayKey(p.timestamp) === selectedDay)),
    [points, selectedDay],
  );

  const filteredAlerts = useMemo(
    () =>
      selectedDay === 'all'
        ? alertPoints
        : alertPoints.filter((p) => dayKey(p.timestamp) === selectedDay),
    [alertPoints, selectedDay],
  );

  const safePoints = useMemo(
    () => (filteredPoints.length > 0 ? filteredPoints : fallback),
    [filteredPoints, fallback],
  );

  const clampedIndex = Math.min(index, safePoints.length - 1);
  const active = safePoints[clampedIndex];
  const total = safePoints.length;
  const progressPct = total > 1 ? Math.round((clampedIndex / (total - 1)) * 100) : 0;

  // Two-tone route: traveled (blue, solid) drawn after remaining (slate, dashed) so it renders on top
  const traveledLine = useMemo(
    () => safePoints.slice(0, clampedIndex + 1).map((p) => [p.lat, p.lng] as [number, number]),
    [safePoints, clampedIndex],
  );
  const remainingLine = useMemo(
    () => safePoints.slice(clampedIndex).map((p) => [p.lat, p.lng] as [number, number]),
    [safePoints, clampedIndex],
  );

  // Reset everything on open/close
  useEffect(() => {
    if (!isOpen) {
      setIndex(0);
      setIsPlaying(false);
      setSelectedDay('all');
    }
  }, [isOpen]);

  // Reset on day change
  useEffect(() => {
    setIndex(0);
    setIsPlaying(false);
  }, [selectedDay]);

  // Leaflet must be told to recalculate its container dimensions after the modal
  // animates into view — otherwise tiles render misaligned or the canvas is blank.
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 160);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Ticker — auto-stops at end
  useEffect(() => {
    if (!isPlaying || !isOpen) return undefined;
    const timer = setInterval(() => {
      setIndex((cur) => {
        if (cur >= safePoints.length - 1) {
          setIsPlaying(false);
          return cur;
        }
        return cur + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [isPlaying, isOpen, safePoints.length]);

  // Pan map to current point
  useEffect(() => {
    mapRef.current?.flyTo([active.lat, active.lng], Math.max(mapRef.current.getZoom(), 13), {
      duration: 0.5,
      easeLinearity: 0.5,
    });
  }, [active]);

  if (!isOpen) return null;

  const scrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setIndex(Number(e.target.value));
  };

  const jumpStart = () => { setIndex(0); setIsPlaying(false); };
  const jumpEnd = () => { setIndex(total - 1); setIsPlaying(false); };
  const stepBack = () => { setIsPlaying(false); setIndex((v) => Math.max(0, v - 1)); };
  const stepFwd = () => { setIsPlaying(false); setIndex((v) => Math.min(total - 1, v + 1)); };

  return (
    <>
      {/*
        Scoped CSS for the timeline slider.
        accent-color alone doesn't fill the track — we use a gradient background
        on the input + custom thumb via pseudo-element overrides.
      */}
      <style>{`
        .pb-track {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          transition: height 0.1s;
        }
        .pb-track:hover { height: 4px; }
        .pb-track::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #2563eb;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.18);
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .pb-track:hover::-webkit-slider-thumb {
          box-shadow: 0 0 0 5px rgba(37,99,235,0.22);
          transform: scale(1.15);
        }
        .pb-track::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #2563eb;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.18);
        }
      `}</style>

      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[1200] bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        ── Modal shell ────────────────────────────────────────────────────────
        inset-3 (12 px gap) gives a floating feel without wasting space.
        flex-col: header (fixed) → map (flex-1) → controls (fixed).
        overflow-hidden keeps rounded corners clean on the map tiles.
      */}
      <div
        className="fixed inset-3 z-[1201] flex flex-col overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header bar ──────────────────────────────────────────────────── */}
        <header className="flex flex-shrink-0 items-center gap-3 bg-[#0b1120] px-4 py-2.5">
          {/* Vehicle icon badge */}
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-blue-600">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>

          {/* Vehicle + driver */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                {vehicleRegistration}
              </span>
              <span className="text-slate-600">·</span>
              <span className="truncate text-sm text-slate-400">{driverName}</span>
            </div>
          </div>

          {/* Day filter */}
          {availableDays.length > 0 && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="h-7 rounded-md border border-slate-700 bg-slate-800 px-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Days</option>
              {availableDays.map((d) => (
                <option key={d} value={d}>
                  {fmtDate(d)}
                </option>
              ))}
            </select>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        {/*
          min-h-0 allows this flex child to shrink below its content height.
          Without it, the map would overflow the modal on short screens.
        */}
        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={[active.lat, active.lng]}
            zoom={13}
            zoomControl={false}
            className="h-full w-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Remaining route */}
            {remainingLine.length > 1 && (
              <Polyline
                positions={remainingLine}
                pathOptions={{ color: '#94a3b8', dashArray: '7 7', weight: 2.5, opacity: 0.6 }}
              />
            )}

            {/* Traveled route — drawn on top */}
            {traveledLine.length > 1 && (
              <Polyline
                positions={traveledLine}
                pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.9 }}
              />
            )}

            {/* Alert markers */}
            {filteredAlerts.map((alert, i) => (
              <CircleMarker
                key={`a-${alert.timestamp}-${i}`}
                center={[alert.lat, alert.lng]}
                radius={6}
                pathOptions={{
                  color: '#fff',
                  weight: 1.5,
                  fillOpacity: 1,
                  fillColor: severityColor(alert.severity),
                }}
              >
                <Popup>
                  <p className="text-xs font-semibold">{alert.label}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </Popup>
              </CircleMarker>
            ))}

            <Marker position={[active.lat, active.lng]} icon={playbackMarkerIcon} />
          </MapContainer>

          {/* Zoom controls — top left, minimal */}
          <div className="absolute left-3 top-3 z-[1000] overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Zoom in"
              className="flex h-8 w-8 items-center justify-center border-b border-gray-200/80 text-slate-600 hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Zoom out"
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-gray-50"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/*
            Speed + time pill — centered at top of map.
            Centered so it doesn't compete with zoom (top-left) or attribution (bottom-right).
            Semi-transparent dark pill is non-intrusive and always readable.
          */}
          <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
              <span className="font-bold tabular-nums text-blue-300">{active.speed} km/h</span>
              <span className="text-white/30">·</span>
              <span className="tabular-nums text-white/80">{fmtFull(active.timestamp)}</span>
            </div>
          </div>

          {/* Alert chip — bottom left of map, appears only when alerts exist */}
          {filteredAlerts.length > 0 && (
            <div className="absolute bottom-3 left-3 z-[1000]">
              <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs shadow backdrop-blur-sm">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                <span className="text-slate-600">
                  {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                </span>
                <div className="ml-1 flex items-center gap-1">
                  {(['High', 'Medium', 'Low'] as const).map((sev) => {
                    const c = filteredAlerts.filter((a) => a.severity === sev).length;
                    if (!c) return null;
                    return (
                      <span
                        key={sev}
                        className="flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                        style={{ background: severityColor(sev) }}
                        title={`${sev}: ${c}`}
                      >
                        {c}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Playback control bar ─────────────────────────────────────────── */}
        {/*
          Single-row design: [buttons] [timeline] [metadata]
          Dark background matches the header — frames the map cleanly top and bottom.
          Height is ~52px: enough for a comfortable touch target without eating map space.
        */}
        <footer className="flex flex-shrink-0 items-center gap-3 bg-[#0b1120] px-4 py-2.5">
          {/* Playback buttons — compact group */}
          <div className="flex flex-shrink-0 items-center">
            <CtrlBtn onClick={jumpStart} label="Jump to start">
              <SkipBack className="h-3.5 w-3.5" />
            </CtrlBtn>
            <CtrlBtn onClick={stepBack} label="Step back">
              <ChevronLeft className="h-3.5 w-3.5" />
            </CtrlBtn>

            {/* Play / Pause — primary action, slightly elevated */}
            <button
              type="button"
              onClick={() => setIsPlaying((v) => !v)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="mx-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-500 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 translate-x-px" />
              )}
            </button>

            <CtrlBtn onClick={stepFwd} label="Step forward">
              <ChevronRight className="h-3.5 w-3.5" />
            </CtrlBtn>
            <CtrlBtn onClick={jumpEnd} label="Jump to end">
              <SkipForward className="h-3.5 w-3.5" />
            </CtrlBtn>
          </div>

          {/*
            Timeline — fills all remaining horizontal space.
            Two sub-rows:
              1. The range slider (primary visual)
              2. Start / end time labels (secondary, lightweight)
          */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <input
              type="range"
              min={0}
              max={Math.max(0, total - 1)}
              value={clampedIndex}
              onChange={scrub}
              className="pb-track w-full"
              style={{
                background: `linear-gradient(to right, #2563eb ${progressPct}%, #1e293b ${progressPct}%)`,
              }}
            />
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] tabular-nums text-slate-600">
                {total > 0 ? fmtShort(safePoints[0].timestamp) : '--:--'}
              </span>
              <span className="text-[10px] tabular-nums text-slate-600">
                {total > 0 ? fmtShort(safePoints[total - 1].timestamp) : '--:--'}
              </span>
            </div>
          </div>

          {/*
            Right metadata strip — current time, speed, progress.
            Fixed width so the timeline doesn't jump when values change.
            tabular-nums prevents layout shift on digit changes.
          */}
          <div className="flex w-36 flex-shrink-0 flex-col items-end gap-0.5 text-right">
            <span className="text-xs font-medium tabular-nums text-white">
              {total > 0 ? fmtFull(active.timestamp) : '--:--:--'}
            </span>
            <div className="flex items-center gap-2 text-[10px] tabular-nums text-slate-500">
              <span className="font-medium text-blue-400">{active.speed} km/h</span>
              <span className="text-slate-700">·</span>
              <span>{progressPct}%</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
