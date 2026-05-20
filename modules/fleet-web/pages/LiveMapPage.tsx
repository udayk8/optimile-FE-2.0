import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api';
import { BarChart3, Gauge, Minus, Navigation, Phone, Plus, Search, Truck, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HistoryPlaybackModal, PlaybackAlertPoint, PlaybackPoint } from '../components/HistoryPlaybackModal';
import { Driver, TelemetryEvent, Vehicle } from '../types';
import { DriverAPI, TelematicsAPI, VehicleAPI } from '../services/mockDatabase';

type LiveStatus = 'Moving' | 'Idle' | 'Stopped' | 'Offline';

interface LiveVehicle {
  vehicle: Vehicle;
  driver: Driver | null;
  latest: TelemetryEvent | null;
  history: TelemetryEvent[];
  status: LiveStatus;
  speed: number;
  ignitionOn: boolean;
  safetyScore: number;
  todaysRunKm: number;
  ignitionDurationText: string;
  position: [number, number];
}

interface VehicleCluster {
  position: [number, number];
  vehicles: LiveVehicle[];
  status: LiveStatus;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CENTER = { lat: 22.5, lng: 79 };

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  mapTypeControl: false,
  minZoom: 4,
  streetViewControl: false,
  zoomControl: false,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

const FALLBACK_POINTS: [number, number][] = [
  [18.5204, 73.8567],
  [19.076, 72.8777],
  [28.6139, 77.209],
  [12.9716, 77.5946],
  [22.5726, 88.3639],
  [17.385, 78.4867],
  [23.0225, 72.5714],
  [13.0827, 80.2707],
];

const mapToStatus = (latest: TelemetryEvent | null): LiveStatus => {
  if (!latest) return 'Offline';
  const ageMs = Date.now() - new Date(latest.event_timestamp).getTime();
  if (ageMs > 10 * 60 * 1000) return 'Offline';
  if (latest.speed > 5) return 'Moving';
  if (latest.speed <= 1 && !latest.ignition_status) return 'Stopped';
  return 'Idle';
};

const markerColor = (status: LiveStatus) => {
  if (status === 'Moving') return '#22c55e';
  if (status === 'Idle') return '#f59e0b';
  if (status === 'Stopped') return '#ef4444';
  return '#94a3b8';
};

const statusBadgeClass = (status: LiveStatus) => {
  if (status === 'Moving') return 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/70';
  if (status === 'Idle') return 'bg-amber-900/60 text-amber-300 border border-amber-700/70';
  if (status === 'Stopped') return 'bg-red-900/60 text-red-300 border border-red-700/70';
  return 'bg-slate-700/70 text-slate-200 border border-slate-500/70';
};

const buildPlaybackPoints = (history: TelemetryEvent[]): PlaybackPoint[] =>
  history
    .slice()
    .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime())
    .map((h) => ({ lat: h.latitude, lng: h.longitude, speed: Math.round(h.speed), timestamp: h.event_timestamp }));

const buildPlaybackAlerts = (history: TelemetryEvent[]): PlaybackAlertPoint[] => {
  const sorted = history.slice().sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());
  const alerts: PlaybackAlertPoint[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    if (current.speed > 90) {
      alerts.push({ lat: current.latitude, lng: current.longitude, timestamp: current.event_timestamp, label: 'Overspeed alert', severity: 'High' });
    } else if (prev.speed - current.speed > 35) {
      alerts.push({ lat: current.latitude, lng: current.longitude, timestamp: current.event_timestamp, label: 'Harsh braking alert', severity: 'Medium' });
    } else if (!current.ignition_status && current.speed <= 1) {
      alerts.push({ lat: current.latitude, lng: current.longitude, timestamp: current.event_timestamp, label: 'Vehicle stop event', severity: 'Low' });
    }
    if (alerts.length >= 6) break;
  }
  return alerts;
};

function VehicleMarker({
  vehicle,
  selected,
  showBadge,
  onSelect,
  onHover,
}: {
  vehicle: LiveVehicle;
  selected: boolean;
  showBadge: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  return (
    <OverlayView
      position={{ lat: vehicle.position[0], lng: vehicle.position[1] }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className="group relative -translate-x-1/2 -translate-y-[72px] bg-transparent"
        style={{ zIndex: selected ? 20 : 10 }}
      >
        {showBadge ? (
          <div className="absolute left-1/2 top-[-22px] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[10px] leading-none text-white shadow-lg">
            {vehicle.vehicle.registration_number}
          </div>
        ) : null}
        <div
          className={`relative flex h-[76px] w-12 items-start justify-center rounded-[10px] border-2 border-white shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${
            vehicle.status === 'Moving' ? 'truck-pulse' : ''
          }`}
          style={{
            background: markerColor(vehicle.status),
            outline: selected ? '3px solid #2563eb' : 'none',
          }}
        >
          <div className="mt-[5px] h-[13px] w-8 rounded bg-sky-400" />
          <div className="absolute bottom-[6px] text-[20px] leading-none">🚚</div>
        </div>
      </button>
    </OverlayView>
  );
}

function ClusterMarker({
  cluster,
  onClick,
}: {
  cluster: VehicleCluster;
  onClick: () => void;
}) {
  return (
    <OverlayView
      position={{ lat: cluster.position[0], lng: cluster.position[1] }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <button
        type="button"
        onClick={onClick}
        className="-translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)]"
        style={{
          background: markerColor(cluster.status),
          height: 44,
          width: 44,
          zIndex: 5,
        }}
      >
        {cluster.vehicles.length}
      </button>
    </OverlayView>
  );
}

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded: isMapLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'fleet-live-map-google',
  });

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);

  const selected = useMemo(() => {
    if (!selectedVehicle) return null;
    return vehicles.find((v) => v.vehicle.vehicle_id === selectedVehicle.vehicle.vehicle_id) || selectedVehicle;
  }, [vehicles, selectedVehicle]);

  const counts = useMemo(
    () => ({
      moving: vehicles.filter((v) => v.status === 'Moving').length,
      idle: vehicles.filter((v) => v.status === 'Idle').length,
      stopped: vehicles.filter((v) => v.status === 'Stopped').length,
      offline: vehicles.filter((v) => v.status === 'Offline').length,
      active: vehicles.filter((v) => v.status !== 'Offline').length,
    }),
    [vehicles],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      try {
        const [v, d, t] = await Promise.all([VehicleAPI.getAll(), DriverAPI.getAll(), TelematicsAPI.getHistory()]);
        const usedFallbackPositions: Array<[number, number]> = [];

        const live = v.map((vehicle, i) => {
          const history = t.filter((e) => e.vehicle_id === vehicle.vehicle_id).sort((a, b) => new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime());
          const latest = history[0] || null;
          const driver = d.find((x) => x.driver_id === vehicle.assigned_driver_id) || d.find((x) => x.assigned_vehicle_id === vehicle.vehicle_id) || null;
          const status = mapToStatus(latest);
          const fallback = FALLBACK_POINTS[i % FALLBACK_POINTS.length];
          const ring = Math.floor(i / FALLBACK_POINTS.length);
          const latJitter = ((i % 5) - 2) * 0.11 + ring * 0.34;
          const lngJitter = ((i % 7) - 3) * 0.11 + ring * 0.27;
          let fallbackPosition: [number, number] = [fallback[0] + latJitter, fallback[1] + lngJitter];
          while (
            usedFallbackPositions.some(
              (p) => Math.abs(p[0] - fallbackPosition[0]) < 0.18 && Math.abs(p[1] - fallbackPosition[1]) < 0.18,
            )
          ) {
            fallbackPosition = [fallbackPosition[0] + 0.21, fallbackPosition[1] + 0.19];
          }
          const position: [number, number] = latest ? [latest.latitude, latest.longitude] : fallbackPosition;
          if (!latest) usedFallbackPositions.push(position);
          const ignitionEvents = history.filter((h) => h.ignition_status === (latest?.ignition_status ?? false));
          const ignitionDurationMin = ignitionEvents.length > 0 ? Math.max(1, Math.round((Date.now() - new Date(ignitionEvents[ignitionEvents.length - 1].event_timestamp).getTime()) / 60000)) : 0;
          const safetyScore = 75 + ((i * 7) % 21);
          const todaysRunKm = Math.max(0, Math.round(history.reduce((acc, item) => acc + item.speed * 0.08, 0)));

          return {
            vehicle,
            driver,
            latest,
            history,
            status,
            speed: Math.round(latest?.speed || 0),
            ignitionOn: !!latest?.ignition_status,
            safetyScore,
            todaysRunKm,
            ignitionDurationText: ignitionDurationMin > 60 ? `${Math.floor(ignitionDurationMin / 60)}h ${ignitionDurationMin % 60}m` : `${ignitionDurationMin}m`,
            position,
          } as LiveVehicle;
        });

        if (mounted) {
          setVehicles(live);
          setSelectedVehicle((prev) => {
            if (!prev) return null;
            return live.find((v) => v.vehicle.vehicle_id === prev.vehicle.vehicle_id) || null;
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const visibleVehicles = useMemo(() => {
    if (!query.trim()) return vehicles;
    return vehicles.filter((v) => v.vehicle.registration_number.toLowerCase().includes(query.toLowerCase()));
  }, [vehicles, query]);

  // Build clusters only for zoom < 8. Each cluster must have 2+ vehicles.
  const clusteredVehicles = useMemo(() => {
    if (mapZoom >= 8) return [];
    const cellSize = mapZoom <= 5 ? 1.2 : mapZoom <= 6 ? 0.7 : 0.45;
    const buckets = new Map<string, { lat: number; lng: number; vehicles: LiveVehicle[] }>();
    visibleVehicles.forEach((v) => {
      const cellLat = Math.floor(v.position[0] / cellSize);
      const cellLng = Math.floor(v.position[1] / cellSize);
      const key = `${cellLat}:${cellLng}`;
      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, { lat: v.position[0], lng: v.position[1], vehicles: [v] });
      } else {
        existing.vehicles.push(v);
        existing.lat = existing.vehicles.reduce((a, x) => a + x.position[0], 0) / existing.vehicles.length;
        existing.lng = existing.vehicles.reduce((a, x) => a + x.position[1], 0) / existing.vehicles.length;
      }
    });
    return Array.from(buckets.values())
      .filter((cluster) => cluster.vehicles.length > 1)
      .map((cluster) => {
        const status = cluster.vehicles.some((v) => v.status === 'Stopped')
          ? 'Stopped'
          : cluster.vehicles.some((v) => v.status === 'Moving')
            ? 'Moving'
            : cluster.vehicles.some((v) => v.status === 'Idle')
              ? 'Idle'
              : 'Offline';
        return {
          position: [cluster.lat, cluster.lng] as [number, number],
          vehicles: cluster.vehicles,
          status: status as LiveStatus,
        };
      });
  }, [visibleVehicles, mapZoom]);

  // Vehicle IDs that are represented by a cluster bubble.
  // These are suppressed as individual markers to avoid double-rendering,
  // UNLESS the vehicle is the currently selected one (it must always be individually visible).
  const clusteredVehicleIds = useMemo(
    () => new Set(clusteredVehicles.flatMap((c) => c.vehicles.map((v) => v.vehicle.vehicle_id))),
    [clusteredVehicles],
  );

  // Vehicles that should render as individual markers:
  // - Always render if zoom >= 8 (no clustering active)
  // - Always render the selected vehicle regardless of zoom (so it's never hidden by clustering)
  // - Render any vehicle that is NOT covered by a multi-vehicle cluster bubble
  const individualMarkers = useMemo(
    () =>
      visibleVehicles.filter(
        (v) =>
          mapZoom >= 8 ||
          !clusteredVehicleIds.has(v.vehicle.vehicle_id) ||
          v.vehicle.vehicle_id === selectedVehicle?.vehicle.vehicle_id,
      ),
    [visibleVehicles, mapZoom, clusteredVehicleIds, selectedVehicle],
  );

  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return;
    const found = visibleVehicles[0];
    if (!found || !mapRef.current) return;
    setSelectedVehicle(found);
    // Zoom to at least 13 so individual markers are rendered (clustering threshold is zoom < 8)
    mapRef.current.panTo({ lat: found.position[0], lng: found.position[1] });
    mapRef.current.setZoom(13);
    // Eagerly update mapZoom state so the render cycle after panTo already uses the correct zoom,
    // preventing a brief frame where the marker would be hidden by the clustering logic.
    setMapZoom(13);
  };

  const handleZoomIn = () => {
    const next = (mapRef.current?.getZoom() ?? mapZoom) + 1;
    mapRef.current?.setZoom(next);
  };
  const handleZoomOut = () => {
    const next = (mapRef.current?.getZoom() ?? mapZoom) - 1;
    mapRef.current?.setZoom(next);
  };

  return (
    <div className="relative h-[calc(100vh-100px)] overflow-hidden rounded-3xl border border-gray-200">
      <style>{`
        @keyframes truckPing {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55), 0 10px 22px rgba(0,0,0,.24); }
          70% { box-shadow: 0 0 0 18px rgba(34,197,94,0), 0 10px 22px rgba(0,0,0,.24); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0), 0 10px 22px rgba(0,0,0,.24); }
        }
        .truck-pulse { animation: truckPing 1.6s infinite; }
      `}</style>

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-center">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Google Maps key missing</h2>
            <p className="mt-2 text-sm text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend-main/.env.local` to load the live map.</p>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-center">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Google Maps failed to load</h2>
            <p className="mt-2 text-sm text-slate-500">Check the API key, enabled APIs, and allowed referrers.</p>
          </div>
        </div>
      ) : isMapLoaded ? (
        <GoogleMap
          mapContainerClassName="h-full w-full"
          center={DEFAULT_CENTER}
          zoom={5}
          options={MAP_OPTIONS}
          onLoad={(map) => {
            mapRef.current = map;
            setMapZoom(map.getZoom() || 5);
          }}
          onUnmount={() => {
            mapRef.current = null;
          }}
          onZoomChanged={() => {
            const z = mapRef.current?.getZoom() ?? 5;
            setMapZoom(z);
          }}
        >
          {/* Cluster bubbles — only at zoom < 8 */}
          {mapZoom < 8 &&
            clusteredVehicles.map((cluster, idx) => (
              <ClusterMarker
                key={`cluster-${idx}`}
                cluster={cluster}
                onClick={() => {
                  if (!mapRef.current) return;
                  mapRef.current.panTo({ lat: cluster.position[0], lng: cluster.position[1] });
                  // Always zoom to at least 8 on cluster click so individual markers become visible
                  const nextZoom = Math.max(8, Math.min(13, mapZoom + 3));
                  mapRef.current.setZoom(nextZoom);
                  setMapZoom(nextZoom);
                }}
              />
            ))}

          {/* Individual vehicle markers:
              - All vehicles at zoom >= 8
              - Unclustered vehicles at zoom < 8
              - Selected vehicle always (never hidden by clustering) */}
          {individualMarkers.map((vehicle) => (
            <VehicleMarker
              key={vehicle.vehicle.vehicle_id}
              vehicle={vehicle}
              selected={selectedVehicle?.vehicle.vehicle_id === vehicle.vehicle.vehicle_id}
              showBadge={hoveredId === vehicle.vehicle.vehicle_id}
              onSelect={() => setSelectedVehicle(vehicle)}
              onHover={(hovered) => setHoveredId(hovered ? vehicle.vehicle.vehicle_id : null)}
            />
          ))}
        </GoogleMap>
      ) : null}

      {/* Search bar — top left */}
      <div className="absolute left-4 top-4 z-[1000] w-64">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search vehicle… (Enter to focus)"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Active vehicles counter — top right */}
      <div className="absolute right-4 top-4 z-[1000] rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Active</p>
            <p className="text-2xl font-bold text-slate-900">
              {counts.active}
              <span className="text-lg text-slate-400"> / {vehicles.length || 13}</span>
            </p>
          </div>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <Navigation className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Fleet status legend — bottom left */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Fleet Status</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Moving</span>
            <span className="font-semibold text-slate-900">{counts.moving}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Idle</span>
            <span className="font-semibold text-slate-900">{counts.idle}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-red-500" />Stopped</span>
            <span className="font-semibold text-slate-900">{counts.stopped}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full bg-slate-400" />Offline</span>
            <span className="font-semibold text-slate-900">{counts.offline}</span>
          </div>
        </div>
      </div>

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-4 right-4 z-[1000] overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <button type="button" onClick={handleZoomIn} className="block h-10 w-10 border-b border-gray-300 text-slate-800 hover:bg-gray-50" aria-label="Zoom in">
          <Plus className="mx-auto h-4 w-4" />
        </button>
        <button type="button" onClick={handleZoomOut} className="block h-10 w-10 text-slate-800 hover:bg-gray-50" aria-label="Zoom out">
          <Minus className="mx-auto h-4 w-4" />
        </button>
      </div>

      {/* Vehicle detail panel — anchored inside the map container, left side below search bar.
          Uses max-h + overflow-y-auto so it never overflows the map boundary. */}
      {selected && (
        <div
          className="absolute left-4 z-[1000] flex max-h-[calc(100%-5rem)] w-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ top: '3.5rem' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-[#081a3c] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold tracking-tight">{selected.vehicle.registration_number}</h3>
                <p className="mt-0.5 truncate text-xs uppercase tracking-wide text-slate-300">
                  {selected.vehicle.make || selected.vehicle.model || selected.vehicle.vehicle_type}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="rounded p-1 text-slate-300 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${statusBadgeClass(selected.status)}`}>
                  {selected.status}
                </span>
                <Truck className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Driver row */}
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                {/* Avatar — clickable to driver profile when a driver is assigned */}
                {selected.driver ? (
                  <button
                    type="button"
                    title="View driver profile"
                    onClick={() => navigate('/fleet/drivers', { state: { openDriverId: selected.driver!.driver_id } })}
                    className="group relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600 ring-2 ring-transparent transition hover:ring-blue-400"
                  >
                    {selected.driver.name.charAt(0)}
                    <span className="absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    {/* Hover overlay hint */}
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-800/0 text-[8px] font-bold text-white opacity-0 transition group-hover:bg-slate-800/50 group-hover:opacity-100">
                      VIEW
                    </span>
                  </button>
                ) : (
                  <div className="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600">
                    D
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned Driver</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{selected.driver?.name || 'Unassigned'}</p>
                  {selected.driver?.phone ? (
                    <a
                      href={`tel:${selected.driver.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="h-3 w-3" /> {selected.driver.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No number on file</span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-2xl font-bold text-emerald-600">{selected.safetyScore}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Safety</p>
                </div>
              </div>
            </div>

            {/* Telemetry */}
            <div className="px-5 py-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Live Telemetry</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Speed */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                  <div className="mb-1.5 flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Speed</p>
                    <Gauge className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${Math.min(100, (selected.speed / 120) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-slate-900">
                    {selected.speed}
                    <span className="ml-0.5 text-sm font-medium text-slate-500">km/h</span>
                  </p>
                </div>

                {/* Ignition */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ignition</p>
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${selected.ignitionOn ? 'text-emerald-700' : 'text-slate-500'}`}>
                    <span className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${selected.ignitionOn ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                      <Zap className="h-3.5 w-3.5" />
                    </span>
                    {selected.ignitionOn ? 'ON' : 'OFF'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">for {selected.ignitionDurationText}</p>
                </div>

                {/* Today's run */}
                <div className="col-span-2 rounded-xl border border-gray-200 bg-slate-50 p-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Today's Run</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {selected.todaysRunKm}
                        <span className="ml-0.5 text-sm font-medium text-slate-500">km</span>
                      </p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={() => navigate('/fleet/fleet', { state: { openVehicleId: selected.vehicle.vehicle_id } })}
              className="h-9 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-slate-700 hover:bg-gray-50"
            >
              View Details
            </button>
            <button
              type="button"
              onClick={() => setPlaybackOpen(true)}
              className="h-9 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
            >
              ▶ Playback
            </button>
          </div>
        </div>
      )}

      <HistoryPlaybackModal
        isOpen={playbackOpen}
        onClose={() => setPlaybackOpen(false)}
        vehicleRegistration={selected?.vehicle.registration_number || ''}
        driverName={selected?.driver?.name || 'Unassigned'}
        points={buildPlaybackPoints(selected?.history || [])}
        alertPoints={buildPlaybackAlerts(selected?.history || [])}
      />

      {(loading || !isMapLoaded) && (
        <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-white/55 text-sm text-slate-700">
          Loading live map…
        </div>
      )}
    </div>
  );
};
