import type {
  TrackingAlert,
  TrackingCheckpoint,
  TrackingDevice,
  TrackingDashboardSummary,
  TrackingEvent,
  TrackingLocation,
  TrackingSource,
  TrackingStatus,
  TrackingTrip,
} from '../types/tracking.types'

const cityCoordinates: Record<string, [number, number]> = {
  Delhi: [28.6139, 77.209],
  Agra: [27.1767, 78.0081],
  Nagpur: [21.1458, 79.0882],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Nellore: [14.4426, 79.9865],
  Hyderabad: [17.385, 78.4867],
  Mumbai: [19.076, 72.8777],
  Pune: [18.5204, 73.8567],
  Ahmedabad: [23.0225, 72.5714],
  Vadodara: [22.3072, 73.1812],
  Surat: [21.1702, 72.8311],
  Jaipur: [26.9124, 75.7873],
  Kanpur: [26.4499, 80.3319],
  Lucknow: [26.8467, 80.9462],
  Kolkata: [22.5726, 88.3639],
  Kharagpur: [22.346, 87.2319],
  Bhubaneswar: [20.2961, 85.8245],
  Indore: [22.7196, 75.8577],
  Seoni: [22.0869, 79.5435],
  Nagda: [23.4564, 75.4177],
  Kochi: [9.9312, 76.2673],
  Hosur: [12.7409, 77.8253],
  Salem: [11.6643, 78.146],
  Ludhiana: [30.901, 75.8573],
  Panipat: [29.3909, 76.9635],
  Noida: [28.5355, 77.391],
  Siliguri: [26.7271, 88.3953],
  Guwahati: [26.1445, 91.7362],
  Vapi: [20.371, 72.9049],
  Nashik: [19.9975, 73.7898],
  Jamshedpur: [22.8046, 86.2029],
  Patna: [25.5941, 85.1376],
  Raipur: [21.2514, 81.6296],
}

function createLocation(city: string, recordedAt: string, source: TrackingSource = 'GPS_DEVICE', speed?: number): TrackingLocation {
  const [latitude, longitude] = cityCoordinates[city]
  return {
    latitude,
    longitude,
    recordedAt,
    source,
    speed,
    accuracy: 15,
  }
}

function createCheckpoints(
  tripId: string,
  origin: string,
  checkpointCity: string,
  destination: string,
  scheduledPickupTime: string,
  scheduledDeliveryTime: string,
  completedStops: number,
): TrackingCheckpoint[] {
  const midpointTime = new Date(new Date(scheduledPickupTime).getTime() + (new Date(scheduledDeliveryTime).getTime() - new Date(scheduledPickupTime).getTime()) / 2).toISOString()

  return [
    {
      id: `${tripId}-CP1`,
      name: `${origin} Pickup Gate`,
      city: origin,
      plannedAt: scheduledPickupTime,
      actualAt: completedStops >= 1 ? scheduledPickupTime : undefined,
      status: completedStops >= 1 ? 'Reached' : 'Pending',
      location: createLocation(origin, scheduledPickupTime, 'MANUAL'),
    },
    {
      id: `${tripId}-CP2`,
      name: `${checkpointCity} Checkpoint`,
      city: checkpointCity,
      plannedAt: midpointTime,
      actualAt: completedStops >= 2 ? midpointTime : undefined,
      status: completedStops >= 2 ? 'Reached' : completedStops === 1 ? 'Pending' : 'Pending',
      location: createLocation(checkpointCity, midpointTime),
    },
    {
      id: `${tripId}-CP3`,
      name: `${destination} Customer Gate`,
      city: destination,
      plannedAt: scheduledDeliveryTime,
      actualAt: completedStops >= 3 ? scheduledDeliveryTime : undefined,
      status: completedStops >= 3 ? 'Reached' : 'Pending',
      location: createLocation(destination, scheduledDeliveryTime, 'MANUAL'),
    },
  ]
}

function createTrackingDevices(seed: {
  bookingId: string
  vehicleId?: string
  currentCity: string
  lastUpdatedAt: string
  source?: TrackingSource
  primarySource?: TrackingSource
  sourceHealth?: 'Healthy' | 'Stale' | 'Fallback' | 'Offline'
  trackingDeviceLabel?: string
  trackingDeviceId?: string
}) {
  const activeSource = seed.source ?? seed.primarySource ?? 'GPS_DEVICE'
  const primarySource = seed.primarySource ?? 'GPS_DEVICE'
  const staleTimestamp = new Date(new Date(seed.lastUpdatedAt).getTime() - 12 * 60 * 1000).toISOString()
  const fallbackTimestamp = new Date(new Date(seed.lastUpdatedAt).getTime() - 5 * 60 * 1000).toISOString()
  const sourceHealth = seed.sourceHealth ?? 'Healthy'

  const devices: TrackingDevice[] = [
    {
      id: `${seed.vehicleId ?? seed.bookingId}-primary-gps`,
      bookingId: seed.bookingId,
      vehicleId: seed.vehicleId,
      label: 'Primary GPS',
      role: 'PRIMARY',
      source: primarySource,
      provider: 'Loconav',
      imei: `IMEI-${seed.bookingId}-P`,
      isAssigned: true,
      status: activeSource === primarySource ? 'Active' : sourceHealth === 'Offline' ? 'Faulted' : 'Standby',
      lastSeenAt: activeSource === primarySource ? seed.lastUpdatedAt : staleTimestamp,
      lastReading: createLocation(seed.currentCity, activeSource === primarySource ? seed.lastUpdatedAt : staleTimestamp, primarySource, activeSource === primarySource ? 52 : 0),
      staleAfterMinutes: 10,
      priorityRank: 1,
      healthNote: activeSource === primarySource ? 'Primary telemetry in use.' : 'Primary telemetry available for recovery.',
    },
    {
      id: `${seed.vehicleId ?? seed.bookingId}-secondary-gps`,
      bookingId: seed.bookingId,
      vehicleId: seed.vehicleId,
      label: 'Secondary GPS',
      role: 'SECONDARY',
      source: 'GPS_DEVICE',
      provider: 'Onelap',
      imei: `IMEI-${seed.bookingId}-S`,
      isAssigned: true,
      status: activeSource === 'GPS_DEVICE' && primarySource !== 'GPS_DEVICE' ? 'Active' : 'Standby',
      lastSeenAt: fallbackTimestamp,
      lastReading: createLocation(seed.currentCity, fallbackTimestamp, 'GPS_DEVICE', 49),
      staleAfterMinutes: 12,
      priorityRank: 2,
      healthNote: 'Secondary hardware device available as backup.',
    },
    {
      id: `${seed.vehicleId ?? seed.bookingId}-driver-app`,
      bookingId: seed.bookingId,
      vehicleId: seed.vehicleId,
      label: 'Driver app',
      role: 'DRIVER_APP',
      source: 'DRIVER_APP',
      phoneNumber: '+91 9000000000',
      isAssigned: true,
      status: activeSource === 'DRIVER_APP' ? 'Active' : 'Standby',
      lastSeenAt: fallbackTimestamp,
      lastReading: createLocation(seed.currentCity, fallbackTimestamp, 'DRIVER_APP', 47),
      staleAfterMinutes: 5,
      priorityRank: 3,
      healthNote: 'Driver app fallback is available when device telemetry degrades.',
    },
  ]

  if (!['GPS_DEVICE', 'DRIVER_APP'].includes(activeSource)) {
    devices.push({
      id: seed.trackingDeviceId ?? `${seed.vehicleId ?? seed.bookingId}-fallback`,
      bookingId: seed.bookingId,
      vehicleId: seed.vehicleId,
      label: seed.trackingDeviceLabel ?? 'Fallback telemetry',
      role: 'SECONDARY',
      source: activeSource,
      isAssigned: true,
      status: 'Active',
      lastSeenAt: seed.lastUpdatedAt,
      lastReading: createLocation(seed.currentCity, seed.lastUpdatedAt, activeSource, sourceHealth === 'Offline' ? 0 : 52),
      staleAfterMinutes: 15,
      priorityRank: 2,
      healthNote: 'Fallback telemetry is currently powering live visibility.',
    })
  }

  return devices
}

function createTrip(seed: {
  id: string
  bookingId: string
  vehicleId?: string
  customerName: string
  vehicleNumber: string
  driverName: string
  driverMobile: string
  origin: string
  checkpointCity: string
  destination: string
  status: TrackingStatus
  scheduledPickupTime: string
  actualPickupTime?: string
  scheduledDeliveryTime: string
  eta: string
  delayMinutes: number
  lastUpdatedAt: string
  distanceCoveredKm: number
  remainingDistanceKm: number
  currentCity: string
  vehicleType: string
  completedStops: number
  routeDeviationKm?: number
  idleMinutes?: number
  isOffline?: boolean
  customerSafeStatus?: string
  actualRouteCities?: string[]
  source?: TrackingSource
  primarySource?: TrackingSource
  sourceHealth?: 'Healthy' | 'Stale' | 'Fallback' | 'Offline'
  trackingDeviceLabel?: string
  trackingDeviceId?: string
}): TrackingTrip {
  const actualRouteCities = seed.actualRouteCities ?? [seed.origin, seed.currentCity, seed.destination]
  const trackingDevices = createTrackingDevices(seed)
  const activeTrackingDevice =
    trackingDevices.find((device) => device.status === 'Active') ??
    trackingDevices.find((device) => device.role === 'PRIMARY') ??
    trackingDevices[0]

  return {
    id: seed.id,
    bookingId: seed.bookingId,
    vehicleId: seed.vehicleId,
    customerName: seed.customerName,
    vehicleNumber: seed.vehicleNumber,
    driverName: seed.driverName,
    driverMobile: seed.driverMobile,
    origin: seed.origin,
    destination: seed.destination,
    status: seed.status,
    scheduledPickupTime: seed.scheduledPickupTime,
    actualPickupTime: seed.actualPickupTime,
    scheduledDeliveryTime: seed.scheduledDeliveryTime,
    eta: seed.eta,
    delayMinutes: seed.delayMinutes,
    lastUpdatedAt: seed.lastUpdatedAt,
    distanceCoveredKm: seed.distanceCoveredKm,
    remainingDistanceKm: seed.remainingDistanceKm,
    currentLocation: activeTrackingDevice?.lastReading
      ? { ...activeTrackingDevice.lastReading, source: activeTrackingDevice.source }
      : createLocation(seed.currentCity, seed.lastUpdatedAt, seed.source ?? (seed.isOffline ? 'FASTAG' : 'GPS_DEVICE'), seed.isOffline ? 0 : 52),
    lastLocationLabel: `${seed.currentCity}, India`,
    vehicleType: seed.vehicleType,
    primarySource: seed.primarySource ?? (seed.isOffline ? 'FASTAG' : 'GPS_DEVICE'),
    activeSource: activeTrackingDevice?.source ?? seed.source ?? (seed.isOffline ? 'FASTAG' : 'GPS_DEVICE'),
    sourceHealth: seed.sourceHealth ?? (seed.isOffline ? 'Offline' : 'Healthy'),
    trackingDevices,
    activeTrackingDeviceId: activeTrackingDevice?.id,
    trackingDeviceLabel: activeTrackingDevice?.label ?? seed.trackingDeviceLabel,
    trackingDeviceId: activeTrackingDevice?.id ?? seed.trackingDeviceId,
    isOffline: seed.isOffline ?? false,
    routeDeviationKm: seed.routeDeviationKm ?? 0,
    idleMinutes: seed.idleMinutes,
    plannedRoute: [seed.origin, seed.checkpointCity, seed.destination].map((city, index) =>
      createLocation(city, index === 0 ? seed.scheduledPickupTime : index === 1 ? seed.lastUpdatedAt : seed.scheduledDeliveryTime),
    ),
    actualRoute: actualRouteCities.map((city) => createLocation(city, seed.lastUpdatedAt, seed.isOffline ? 'FASTAG' : 'GPS_DEVICE')),
    checkpoints: createCheckpoints(
      seed.id,
      seed.origin,
      seed.checkpointCity,
      seed.destination,
      seed.scheduledPickupTime,
      seed.scheduledDeliveryTime,
      seed.completedStops,
    ),
    customerSafeStatus: seed.customerSafeStatus ?? seed.status,
  }
}

export const trackingTrips: TrackingTrip[] = [
  createTrip({
    id: 'trip-001',
    bookingId: 'BK-2401',
    vehicleId: 'veh-001',
    customerName: 'Asian Paints North',
    vehicleNumber: 'MH 12 VX 4182',
    driverName: 'Aarav Sharma',
    driverMobile: '+91 9876543210',
    origin: 'Delhi',
    checkpointCity: 'Nagpur',
    destination: 'Bengaluru',
    status: 'In Transit',
    scheduledPickupTime: '2026-05-04T20:00:00+05:30',
    actualPickupTime: '2026-05-04T20:20:00+05:30',
    scheduledDeliveryTime: '2026-05-07T12:00:00+05:30',
    eta: '2026-05-07T15:00:00+05:30',
    delayMinutes: 180,
    lastUpdatedAt: '2026-05-06T10:20:00+05:30',
    distanceCoveredKm: 1150,
    remainingDistanceKm: 820,
    currentCity: 'Nagpur',
    vehicleType: '32 FT MXL',
    completedStops: 2,
    customerSafeStatus: 'Linehaul in progress with revised ETA',
    primarySource: 'GPS_DEVICE',
    sourceHealth: 'Healthy',
    trackingDeviceLabel: 'Loconav Primary GPS',
    trackingDeviceId: 'trk-veh-001-gps',
  }),
  createTrip({
    id: 'trip-002',
    bookingId: 'BK-2417',
    vehicleId: 'veh-002',
    customerName: 'ITC South Distribution',
    vehicleNumber: 'GJ 05 FT 9021',
    driverName: 'Mehul Patel',
    driverMobile: '+91 9012345678',
    origin: 'Chennai',
    checkpointCity: 'Nellore',
    destination: 'Hyderabad',
    status: 'Delayed',
    scheduledPickupTime: '2026-05-05T23:00:00+05:30',
    actualPickupTime: '2026-05-05T23:20:00+05:30',
    scheduledDeliveryTime: '2026-05-06T14:30:00+05:30',
    eta: '2026-05-06T18:30:00+05:30',
    delayMinutes: 240,
    lastUpdatedAt: '2026-05-06T09:08:00+05:30',
    distanceCoveredKm: 340,
    remainingDistanceKm: 290,
    currentCity: 'Nellore',
    vehicleType: '24 FT Container',
    completedStops: 2,
    routeDeviationKm: 14,
    customerSafeStatus: 'Delay under investigation by operations team',
    primarySource: 'GPS_DEVICE',
    source: 'FASTAG',
    sourceHealth: 'Fallback',
    trackingDeviceLabel: 'NETC Permit Corridor Feed',
    trackingDeviceId: 'trk-veh-002-fastag',
  }),
  createTrip({
    id: 'trip-003',
    bookingId: 'BK-2409',
    vehicleId: 'veh-003',
    customerName: 'Tata Consumer Hub',
    vehicleNumber: 'KA 51 CD 7720',
    driverName: 'Naveen Rao',
    driverMobile: '+91 9988776655',
    origin: 'Mumbai',
    checkpointCity: 'Pune',
    destination: 'Pune',
    status: 'Completed',
    scheduledPickupTime: '2026-05-05T23:00:00+05:30',
    actualPickupTime: '2026-05-05T23:10:00+05:30',
    scheduledDeliveryTime: '2026-05-06T06:30:00+05:30',
    eta: '2026-05-06T06:45:00+05:30',
    delayMinutes: 15,
    lastUpdatedAt: '2026-05-06T07:10:00+05:30',
    distanceCoveredKm: 154,
    remainingDistanceKm: 0,
    currentCity: 'Pune',
    vehicleType: '20 FT',
    completedStops: 3,
    customerSafeStatus: 'Delivered successfully',
    actualRouteCities: ['Mumbai', 'Pune'],
    primarySource: 'DRIVER_APP',
    source: 'DRIVER_APP',
    sourceHealth: 'Stale',
    trackingDeviceLabel: 'Optimile Driver App',
    trackingDeviceId: 'trk-veh-003-app',
  }),
  createTrip({
    id: 'trip-004',
    bookingId: 'BK-2450',
    customerName: 'Reliance Retail West',
    vehicleNumber: 'GJ 01 VV 6312',
    driverName: 'Ramesh Solanki',
    driverMobile: '+91 9090909091',
    origin: 'Ahmedabad',
    checkpointCity: 'Vadodara',
    destination: 'Surat',
    status: 'At Pickup',
    scheduledPickupTime: '2026-05-06T08:00:00+05:30',
    actualPickupTime: '2026-05-06T08:05:00+05:30',
    scheduledDeliveryTime: '2026-05-06T16:30:00+05:30',
    eta: '2026-05-06T16:30:00+05:30',
    delayMinutes: 0,
    lastUpdatedAt: '2026-05-06T08:18:00+05:30',
    distanceCoveredKm: 12,
    remainingDistanceKm: 244,
    currentCity: 'Ahmedabad',
    vehicleType: '19 FT',
    completedStops: 1,
    customerSafeStatus: 'Vehicle at pickup gate and loading slot confirmed',
  }),
  createTrip({
    id: 'trip-005',
    bookingId: 'BK-2458',
    customerName: 'Dabur Wellness North',
    vehicleNumber: 'RJ 14 QD 9910',
    driverName: 'Pawan Singh',
    driverMobile: '+91 9988001122',
    origin: 'Jaipur',
    checkpointCity: 'Kanpur',
    destination: 'Lucknow',
    status: 'Near Destination',
    scheduledPickupTime: '2026-05-05T06:00:00+05:30',
    actualPickupTime: '2026-05-05T06:12:00+05:30',
    scheduledDeliveryTime: '2026-05-06T13:00:00+05:30',
    eta: '2026-05-06T13:25:00+05:30',
    delayMinutes: 25,
    lastUpdatedAt: '2026-05-06T11:15:00+05:30',
    distanceCoveredKm: 560,
    remainingDistanceKm: 42,
    currentCity: 'Lucknow',
    vehicleType: '22 FT',
    completedStops: 2,
    customerSafeStatus: 'Approaching destination gate',
    actualRouteCities: ['Jaipur', 'Kanpur', 'Lucknow'],
  }),
  createTrip({
    id: 'trip-006',
    bookingId: 'BK-2461',
    customerName: 'HUL East Distribution',
    vehicleNumber: 'WB 23 AA 7002',
    driverName: 'Parvez Alam',
    driverMobile: '+91 9811223344',
    origin: 'Kolkata',
    checkpointCity: 'Kharagpur',
    destination: 'Bhubaneswar',
    status: 'Offline',
    scheduledPickupTime: '2026-05-05T14:00:00+05:30',
    actualPickupTime: '2026-05-05T14:25:00+05:30',
    scheduledDeliveryTime: '2026-05-06T09:30:00+05:30',
    eta: '2026-05-06T11:00:00+05:30',
    delayMinutes: 90,
    lastUpdatedAt: '2026-05-06T07:10:00+05:30',
    distanceCoveredKm: 325,
    remainingDistanceKm: 118,
    currentCity: 'Kharagpur',
    vehicleType: '32 FT Trailer',
    completedStops: 2,
    isOffline: true,
    customerSafeStatus: 'Location feed temporarily unavailable',
    source: 'FASTAG',
  }),
  createTrip({
    id: 'trip-007',
    bookingId: 'BK-2465',
    customerName: 'Adani Cement Central',
    vehicleNumber: 'MP 09 KH 4461',
    driverName: 'Dinesh Patel',
    driverMobile: '+91 9701234567',
    origin: 'Indore',
    checkpointCity: 'Seoni',
    destination: 'Nagpur',
    status: 'Route Deviated',
    scheduledPickupTime: '2026-05-05T18:00:00+05:30',
    actualPickupTime: '2026-05-05T18:10:00+05:30',
    scheduledDeliveryTime: '2026-05-06T11:00:00+05:30',
    eta: '2026-05-06T13:40:00+05:30',
    delayMinutes: 160,
    lastUpdatedAt: '2026-05-06T10:35:00+05:30',
    distanceCoveredKm: 420,
    remainingDistanceKm: 138,
    currentCity: 'Nagda',
    vehicleType: '28 FT Open Body',
    completedStops: 1,
    routeDeviationKm: 22,
    customerSafeStatus: 'Vehicle diverted and ETA recalculated',
    actualRouteCities: ['Indore', 'Nagda', 'Nagpur'],
  }),
  createTrip({
    id: 'trip-008',
    bookingId: 'BK-2472',
    customerName: 'Britannia South Foods',
    vehicleNumber: 'KA 51 LH 1880',
    driverName: 'Arul Raj',
    driverMobile: '+91 9345678901',
    origin: 'Hosur',
    checkpointCity: 'Salem',
    destination: 'Kochi',
    status: 'Idle',
    scheduledPickupTime: '2026-05-05T21:00:00+05:30',
    actualPickupTime: '2026-05-05T21:08:00+05:30',
    scheduledDeliveryTime: '2026-05-06T17:30:00+05:30',
    eta: '2026-05-06T18:05:00+05:30',
    delayMinutes: 35,
    lastUpdatedAt: '2026-05-06T09:52:00+05:30',
    distanceCoveredKm: 188,
    remainingDistanceKm: 332,
    currentCity: 'Salem',
    vehicleType: '24 FT Reefer',
    completedStops: 2,
    idleMinutes: 48,
    customerSafeStatus: 'Vehicle paused at linehaul stop',
  }),
  createTrip({
    id: 'trip-009',
    bookingId: 'BK-2479',
    customerName: 'Marico North Hub',
    vehicleNumber: 'PB 10 UX 6501',
    driverName: 'Harjit Gill',
    driverMobile: '+91 9911223344',
    origin: 'Ludhiana',
    checkpointCity: 'Panipat',
    destination: 'Delhi',
    status: 'Loading',
    scheduledPickupTime: '2026-05-06T09:00:00+05:30',
    scheduledDeliveryTime: '2026-05-06T19:00:00+05:30',
    eta: '2026-05-06T19:00:00+05:30',
    delayMinutes: 0,
    lastUpdatedAt: '2026-05-06T09:18:00+05:30',
    distanceCoveredKm: 0,
    remainingDistanceKm: 318,
    currentCity: 'Ludhiana',
    vehicleType: '17 FT',
    completedStops: 0,
    customerSafeStatus: 'Loading in progress at origin hub',
  }),
  createTrip({
    id: 'trip-010',
    bookingId: 'BK-2484',
    customerName: 'Nestle North East',
    vehicleNumber: 'WB 74 ZP 2301',
    driverName: 'Ankit Das',
    driverMobile: '+91 9830011223',
    origin: 'Siliguri',
    checkpointCity: 'Guwahati',
    destination: 'Guwahati',
    status: 'In Transit',
    scheduledPickupTime: '2026-05-05T15:00:00+05:30',
    actualPickupTime: '2026-05-05T15:18:00+05:30',
    scheduledDeliveryTime: '2026-05-06T07:30:00+05:30',
    eta: '2026-05-06T08:20:00+05:30',
    delayMinutes: 50,
    lastUpdatedAt: '2026-05-06T05:55:00+05:30',
    distanceCoveredKm: 395,
    remainingDistanceKm: 70,
    currentCity: 'Guwahati',
    vehicleType: '22 FT Dry Van',
    completedStops: 2,
    customerSafeStatus: 'Final linehaul leg in progress',
  }),
  createTrip({
    id: 'trip-011',
    bookingId: 'BK-2490',
    customerName: 'Pidilite West Region',
    vehicleNumber: 'GJ 15 HT 8900',
    driverName: 'Imran Shaikh',
    driverMobile: '+91 9822003344',
    origin: 'Vapi',
    checkpointCity: 'Nashik',
    destination: 'Nashik',
    status: 'Offline',
    scheduledPickupTime: '2026-05-05T20:00:00+05:30',
    actualPickupTime: '2026-05-05T20:14:00+05:30',
    scheduledDeliveryTime: '2026-05-06T09:00:00+05:30',
    eta: '2026-05-06T10:10:00+05:30',
    delayMinutes: 70,
    lastUpdatedAt: '2026-05-06T06:35:00+05:30',
    distanceCoveredKm: 140,
    remainingDistanceKm: 54,
    currentCity: 'Nashik',
    vehicleType: '14 FT',
    completedStops: 1,
    isOffline: true,
    customerSafeStatus: 'Latest GPS heartbeat unavailable',
    source: 'FASTAG',
  }),
  createTrip({
    id: 'trip-012',
    bookingId: 'BK-2494',
    customerName: 'Tata Steel East',
    vehicleNumber: 'JH 05 CE 1180',
    driverName: 'Rohit Oraon',
    driverMobile: '+91 9007005566',
    origin: 'Jamshedpur',
    checkpointCity: 'Raipur',
    destination: 'Patna',
    status: 'Stopped',
    scheduledPickupTime: '2026-05-05T11:00:00+05:30',
    actualPickupTime: '2026-05-05T11:09:00+05:30',
    scheduledDeliveryTime: '2026-05-06T12:00:00+05:30',
    eta: '2026-05-06T13:50:00+05:30',
    delayMinutes: 110,
    lastUpdatedAt: '2026-05-06T08:45:00+05:30',
    distanceCoveredKm: 510,
    remainingDistanceKm: 220,
    currentCity: 'Raipur',
    vehicleType: '40 FT Flatbed',
    completedStops: 2,
    idleMinutes: 62,
    customerSafeStatus: 'Vehicle stationary at transit point',
  }),
  createTrip({
    id: 'trip-013',
    bookingId: 'BK-2498',
    customerName: 'Godrej Appliances NCR',
    vehicleNumber: 'UP 16 BF 7711',
    driverName: 'Mukesh Kumar',
    driverMobile: '+91 9818807766',
    origin: 'Noida',
    checkpointCity: 'Kanpur',
    destination: 'Kanpur',
    status: 'Offline',
    scheduledPickupTime: '2026-05-06T04:30:00+05:30',
    actualPickupTime: '2026-05-06T04:45:00+05:30',
    scheduledDeliveryTime: '2026-05-06T13:30:00+05:30',
    eta: '2026-05-06T14:20:00+05:30',
    delayMinutes: 50,
    lastUpdatedAt: '2026-05-06T10:05:00+05:30',
    distanceCoveredKm: 190,
    remainingDistanceKm: 230,
    currentCity: 'Noida',
    vehicleType: '17 FT Closed Body',
    completedStops: 1,
    isOffline: true,
    customerSafeStatus: 'Telemetry feed lost after dispatch',
    source: 'ANPR',
  }),
]

export const trackingEvents: TrackingEvent[] = [
  { id: 'EV-1', tripId: 'trip-001', type: 'GPS Ping', title: 'Vehicle crossed Nagpur checkpoint', description: 'Vehicle reported healthy movement on the planned Delhi to Bengaluru corridor.', eventTime: '2026-05-06T10:20:00+05:30', location: 'Nagpur' },
  { id: 'EV-2', tripId: 'trip-001', type: 'Delay Update', title: 'ETA revised by 180 minutes', description: 'Highway congestion increased downstream ETA for the delivery window.', eventTime: '2026-05-06T10:10:00+05:30', location: 'Nagpur' },
  { id: 'EV-3', tripId: 'trip-002', type: 'Route Deviation', title: 'Vehicle moved off planned lane', description: 'The truck diverted from the approved route near Nellore and was flagged by control tower.', eventTime: '2026-05-06T09:02:00+05:30', location: 'Nellore' },
  { id: 'EV-4', tripId: 'trip-002', type: 'Alert Raised', title: 'Critical delay alert opened', description: 'Delivery ETA exceeded the exception threshold and customer risk classification turned red.', eventTime: '2026-05-06T09:08:00+05:30', location: 'Nellore' },
  { id: 'EV-5', tripId: 'trip-003', type: 'Delivery', title: 'Trip completed at customer gate', description: 'Mobile POD was captured and the consignee signed off on the delivery.', eventTime: '2026-05-06T07:10:00+05:30', location: 'Pune' },
  { id: 'EV-6', tripId: 'trip-004', type: 'Pickup', title: 'Vehicle reported at pickup dock', description: 'Dispatch confirmed loading slot readiness at Ahmedabad pickup gate.', eventTime: '2026-05-06T08:18:00+05:30', location: 'Ahmedabad' },
  { id: 'EV-7', tripId: 'trip-005', type: 'ETA Update', title: 'Near-destination ETA refined', description: 'Vehicle is approaching Lucknow and unloading slot is being prepared.', eventTime: '2026-05-06T11:15:00+05:30', location: 'Lucknow' },
  { id: 'EV-8', tripId: 'trip-006', type: 'Offline', title: 'Telemetry heartbeat missed', description: 'GPS feed stopped updating after Kharagpur and fallback data source is now FASTAG.', eventTime: '2026-05-06T07:10:00+05:30', location: 'Kharagpur' },
  { id: 'EV-9', tripId: 'trip-007', type: 'Deviation', title: 'Route deviation exceeded threshold', description: 'Vehicle diverged 22 km from the approved path and requires dispatcher follow-up.', eventTime: '2026-05-06T10:35:00+05:30', location: 'Nagda' },
  { id: 'EV-10', tripId: 'trip-008', type: 'Idle', title: 'Long idle stop detected', description: 'Vehicle remained stationary at Salem for more than 45 minutes.', eventTime: '2026-05-06T09:52:00+05:30', location: 'Salem' },
  { id: 'EV-11', tripId: 'trip-009', type: 'Loading', title: 'Loading activity started', description: 'Warehouse started pallet loading for the Delhi run.', eventTime: '2026-05-06T09:18:00+05:30', location: 'Ludhiana' },
  { id: 'EV-12', tripId: 'trip-010', type: 'Transit', title: 'Final leg underway', description: 'Vehicle cleared the last linehaul checkpoint toward Guwahati.', eventTime: '2026-05-06T05:55:00+05:30', location: 'Guwahati' },
  { id: 'EV-13', tripId: 'trip-011', type: 'Offline', title: 'Vapi to Nashik feed interrupted', description: 'Operations switched to alternate vehicle visibility source due to GPS outage.', eventTime: '2026-05-06T06:35:00+05:30', location: 'Nashik' },
  { id: 'EV-14', tripId: 'trip-012', type: 'Stop Alert', title: 'Vehicle stopped at transit point', description: 'Driver confirmed a tyre inspection halt during the Patna lane movement.', eventTime: '2026-05-06T08:45:00+05:30', location: 'Raipur' },
  { id: 'EV-15', tripId: 'trip-013', type: 'Offline', title: 'Noida trip lost network coverage', description: 'Network loss detected after dispatch and live tracking is pending reconnection.', eventTime: '2026-05-06T10:05:00+05:30', location: 'Noida' },
]

export const trackingAlerts: TrackingAlert[] = [
  { id: 'AL-1', tripId: 'trip-002', vehicleNumber: 'TN 18 BX 4410', type: 'Trip Delayed', severity: 'Critical', status: 'Open', message: 'Delivery ETA missed the committed slot by more than 4 hours.', location: 'Nellore', createdAt: '2026-05-06T09:08:00+05:30', assignedTo: 'South Control Tower' },
  { id: 'AL-2', tripId: 'trip-006', vehicleNumber: 'WB 23 AA 7002', type: 'Vehicle Offline', severity: 'High', status: 'Open', message: 'Vehicle heartbeat has not updated for 65 minutes.', location: 'Kharagpur', createdAt: '2026-05-06T07:15:00+05:30', assignedTo: 'East Dispatch' },
  { id: 'AL-3', tripId: 'trip-007', vehicleNumber: 'MP 09 KH 4461', type: 'Route Deviation', severity: 'Critical', status: 'Acknowledged', message: 'Truck deviated 22 km from approved route path.', location: 'Nagda', createdAt: '2026-05-06T10:36:00+05:30', assignedTo: 'Fleet Supervisor' },
  { id: 'AL-4', tripId: 'trip-008', vehicleNumber: 'KA 51 LH 1880', type: 'Long Idle', severity: 'Medium', status: 'Open', message: 'Vehicle remained idle for 48 minutes at linehaul stop.', location: 'Salem', createdAt: '2026-05-06T09:53:00+05:30', assignedTo: 'South Ops Desk' },
  { id: 'AL-5', tripId: 'trip-012', vehicleNumber: 'JH 05 CE 1180', type: 'Unplanned Stop', severity: 'High', status: 'Acknowledged', message: 'Vehicle has stopped longer than the configured threshold.', location: 'Raipur', createdAt: '2026-05-06T08:47:00+05:30', assignedTo: 'Central Ops' },
  { id: 'AL-6', tripId: 'trip-013', vehicleNumber: 'UP 16 BF 7711', type: 'GPS Not Updating', severity: 'High', status: 'Open', message: 'No new GPS ping received after dispatch from origin.', location: 'Noida', createdAt: '2026-05-06T10:06:00+05:30', assignedTo: 'NCR Dispatch' },
  { id: 'AL-7', tripId: 'trip-001', vehicleNumber: 'MH 04 KU 7812', type: 'Checkpoint Missed', severity: 'Medium', status: 'Resolved', message: 'Vehicle crossed the checkpoint later than planned but recovered lane health.', location: 'Nagpur', createdAt: '2026-05-06T09:45:00+05:30', assignedTo: 'Control Tower West' },
  { id: 'AL-8', tripId: 'trip-005', vehicleNumber: 'RJ 14 QD 9910', type: 'Trip Delayed', severity: 'Low', status: 'Resolved', message: 'Last-mile gate congestion caused a minor ETA shift.', location: 'Lucknow', createdAt: '2026-05-06T10:40:00+05:30', assignedTo: 'North Delivery Desk' },
  { id: 'AL-9', tripId: 'trip-010', vehicleNumber: 'WB 74 ZP 2301', type: 'Overspeed', severity: 'Medium', status: 'Acknowledged', message: 'Overspeed event detected on the final Assam corridor.', location: 'Guwahati', createdAt: '2026-05-06T05:20:00+05:30', assignedTo: 'North East Control Tower' },
  { id: 'AL-10', tripId: 'trip-009', vehicleNumber: 'PB 10 UX 6501', type: 'Driver SOS', severity: 'Critical', status: 'Resolved', message: 'Driver raised an SOS during loading and later marked it false alarm.', location: 'Ludhiana', createdAt: '2026-05-06T09:25:00+05:30', assignedTo: 'Security Desk' },
]

export function buildTrackingDashboardSummary(trips: TrackingTrip[], alerts: TrackingAlert[]): TrackingDashboardSummary {
  const activeTrips = trips.filter((trip) => !['Completed', 'Cancelled'].includes(trip.status))
  const delayedTrips = activeTrips.filter((trip) => trip.delayMinutes > 0 || ['Delayed', 'Route Deviated', 'Stopped', 'Offline'].includes(trip.status))
  const inTransitTrips = activeTrips.filter((trip) => ['In Transit', 'At Checkpoint', 'Near Destination', 'Delayed', 'Route Deviated'].includes(trip.status))
  const idleVehicles = activeTrips.filter((trip) => trip.status === 'Idle' || trip.status === 'Stopped').length
  const offlineVehicles = activeTrips.filter((trip) => trip.isOffline || trip.status === 'Offline').length
  const openAlerts = alerts.filter((alert) => alert.status !== 'Resolved').length
  const averageEtaDelay = activeTrips.length
    ? Math.round(activeTrips.reduce((total, trip) => total + trip.delayMinutes, 0) / activeTrips.length)
    : 0
  const onTimeTrips = activeTrips.filter((trip) => trip.delayMinutes <= 30).length
  const onTimePercentage = activeTrips.length ? Math.round((onTimeTrips / activeTrips.length) * 100) : 0

  return {
    totalActiveTrips: activeTrips.length,
    inTransitTrips: inTransitTrips.length,
    delayedTrips: delayedTrips.length,
    idleVehicles,
    offlineVehicles,
    openAlerts,
    averageEtaDelay,
    onTimePercentage,
  }
}

export const trackingDashboardSummary = buildTrackingDashboardSummary(trackingTrips, trackingAlerts)
