# Track & Trace Web - Phase 2 Implementation Plan

## 1. Objective

Build Phase 2 of the `track-trace-web` module after Phase 1 MVP is stable.

Phase 2 should move the module from mock/demo tracking to operational tracking readiness.

Main goal:

- Connect real tracking API structure
- Add WebSocket/live update support
- Add geofence detection UI
- Add exception/alert handling flow
- Add customer-safe tracking link foundation
- Add trip replay foundation
- Keep the module SaaS-ready and multi-tenant compatible

---

## 2. Phase 2 Scope

Phase 2 must include:

- Real API integration structure
- WebSocket live location updates
- Live vehicle status updates
- Trip status update handling
- Geofence management
- Route deviation detection UI
- Delay/offline/idle alert handling
- Trip replay page
- Customer tracking view foundation
- Alert acknowledgement and resolution flow
- Audit-ready event timeline
- Better loading/error/empty states
- API-ready service contracts

---

## 3. Important Architecture Rule

Track & Trace should still not own master data.

It should only own:

- Tracking location data
- Tracking events
- Tracking alerts
- ETA logs
- Geofence definitions
- Route history
- Replay data
- Tracking visibility rules

It should consume booking, fleet, customer, driver, vendor, and finance data from their respective modules/services.

---

## 4. Updated Folder Structure

Extend the Phase 1 structure like this:

```text
modules/track-trace-web/
└── src/
    ├── app/
    │   └── TrackTraceApp.tsx
    ├── pages/
    │   ├── TrackTraceDashboard.tsx
    │   ├── ActiveTripsPage.tsx
    │   ├── LiveMapPage.tsx
    │   ├── TripDetailsPage.tsx
    │   ├── TrackingAlertsPage.tsx
    │   ├── GeofenceManagementPage.tsx
    │   ├── TripReplayPage.tsx
    │   └── CustomerTrackingPreviewPage.tsx
    ├── components/
    │   ├── TrackingSummaryCards.tsx
    │   ├── ActiveTripsTable.tsx
    │   ├── LiveMapPanel.tsx
    │   ├── VehicleMarker.tsx
    │   ├── TripTimeline.tsx
    │   ├── TrackingStatusBadge.tsx
    │   ├── TrackingAlertCard.tsx
    │   ├── AlertActionPanel.tsx
    │   ├── ETAWidget.tsx
    │   ├── RouteProgress.tsx
    │   ├── TripInfoPanel.tsx
    │   ├── GeofenceForm.tsx
    │   ├── GeofenceList.tsx
    │   ├── ReplayTimeline.tsx
    │   ├── ReplayMapPanel.tsx
    │   └── CustomerTrackingCard.tsx
    ├── services/
    │   ├── trackingApi.ts
    │   ├── trackingSocket.ts
    │   ├── geofenceApi.ts
    │   ├── alertApi.ts
    │   └── customerTrackingApi.ts
    ├── store/
    │   ├── trackingStore.ts
    │   ├── trackingMockData.ts
    │   └── socketStore.ts
    ├── types/
    │   ├── tracking.types.ts
    │   ├── geofence.types.ts
    │   ├── alert.types.ts
    │   └── socket.types.ts
    └── routes/
        └── trackingRoutes.tsx
```

---

## 5. Phase 2 Screens

### 5.1 Live Map Enhancements

Route:

```text
/track-trace/live-map
```

Enhance the existing Live Map page with:

- Live location update handling
- Vehicle marker movement
- Last updated time
- Online/offline indicator
- Vehicle speed
- Driver app/GPS source indicator
- Selected trip side panel
- Route deviation highlight
- Geofence entry/exit marker
- Alert marker on map
- Refresh/fallback state if WebSocket disconnects

If real map integration is not available, keep placeholder map UI but wire the data and state correctly.

---

### 5.2 Geofence Management Page

Route:

```text
/track-trace/geofences
```

Features:

- List all geofences
- Create geofence
- Edit geofence
- Enable/disable geofence
- Delete geofence
- View linked location type

Geofence types:

```text
Pickup
Drop
Warehouse
Yard
Customer Site
Checkpoint
Restricted Zone
Custom
```

Geofence shape support:

Phase 2 required:

```text
Circle
```

Future support:

```text
Polygon
```

Geofence fields:

```text
id
tenantId
name
type
latitude
longitude
radiusMeters
linkedEntityType
linkedEntityId
isActive
createdAt
updatedAt
```

---

### 5.3 Tracking Alerts Enhancements

Route:

```text
/track-trace/alerts
```

Enhance alerts with actions:

- Acknowledge alert
- Resolve alert
- Assign alert
- Add remarks
- Filter by severity
- Filter by status
- Filter by alert type
- Filter by vehicle/trip
- Open trip detail from alert

Alert workflow:

```text
Open -> Acknowledged -> Resolved
```

Do not allow:

```text
Resolved -> Open
```

unless there is an explicit reopen flow.

---

### 5.4 Trip Replay Page

Route:

```text
/track-trace/trips/:tripId/replay
```

Trip replay should show:

- Replay timeline
- Route history
- Location points
- Stops
- Idle points
- Speed points
- Alerts during trip
- Timeline synced with route panel
- Play/pause UI placeholder
- Speed selector placeholder

Phase 2 does not need perfect animation. It should prepare the structure.

Replay fields:

```text
tripId
vehicleNumber
driverName
startTime
endTime
locations[]
events[]
alerts[]
totalDistanceKm
totalIdleMinutes
maxSpeed
averageSpeed
```

---

### 5.5 Customer Tracking Preview Page

Route:

```text
/track-trace/customer-preview/:tripId
```

This page should show only customer-safe information:

- Booking ID
- Trip status
- Vehicle current region/location
- ETA
- Delay status
- Pickup and drop info
- Public timeline
- POD status if delivered

Do not show:

- Driver mobile number unless business allows it
- Internal alert remarks
- Finance data
- Vendor settlement data
- Compliance details
- Internal user comments

This will later become:

```text
/public/track/:trackingToken
```

---

## 6. Real API Integration Plan

Update `trackingApi.ts` so it supports both mock and real API mode.

Recommended pattern:

```ts
const USE_MOCK_TRACKING = import.meta.env.VITE_USE_MOCK_TRACKING === "true";
```

Suggested API methods:

```ts
getTrackingDashboardSummary()
getActiveTrips(filters)
getTripById(tripId)
getTripTimeline(tripId)
getTripLocations(tripId)
getTripReplay(tripId)
getLiveVehicles()
getVehicleCurrentLocation(vehicleId)
getCustomerSafeTracking(tripId)
```

Use mock data only when mock mode is enabled.

---

## 7. WebSocket Integration

Create:

```text
services/trackingSocket.ts
store/socketStore.ts
types/socket.types.ts
```

WebSocket should handle these event types:

```text
LocationUpdated
TripStatusChanged
ETAUpdated
AlertRaised
AlertAcknowledged
AlertResolved
VehicleOffline
VehicleOnline
RouteDeviationDetected
GeofenceEntered
GeofenceExited
TripCompleted
```

Suggested topics:

```text
/topic/tracking/live-location
/topic/tracking/trip-status
/topic/tracking/alerts
/topic/tracking/eta
/topic/tracking/geofence-events
/topic/tracking/dashboard
```

WebSocket responsibilities:

- Connect on module load
- Subscribe to tracking topics
- Update local tracking store
- Show connection state
- Retry on disconnect
- Fall back to API polling if disconnected

Suggested connection states:

```text
Connecting
Connected
Disconnected
Reconnecting
Failed
```

---

## 8. Tracking Store

Create or enhance `trackingStore.ts`.

The store should maintain:

```text
activeTrips
selectedTrip
liveVehicles
alerts
dashboardSummary
socketConnectionState
lastUpdatedAt
filters
```

Required actions:

```text
setActiveTrips
updateTripLocation
updateTripStatus
updateETA
addAlert
acknowledgeAlert
resolveAlert
setSocketConnectionState
setFilters
```

Avoid passing deeply nested state between too many components.

---

## 9. Alert API

Create `alertApi.ts`.

Suggested methods:

```ts
getTrackingAlerts(filters)
acknowledgeAlert(alertId, payload)
resolveAlert(alertId, payload)
assignAlert(alertId, userId)
addAlertRemark(alertId, remark)
```

Payload examples:

```ts
{
  acknowledgedBy: string;
  remarks?: string;
}

{
  resolvedBy: string;
  resolutionNote: string;
}
```

---

## 10. Geofence API

Create `geofenceApi.ts`.

Suggested methods:

```ts
getGeofences()
getGeofenceById(id)
createGeofence(payload)
updateGeofence(id, payload)
deleteGeofence(id)
toggleGeofenceStatus(id, isActive)
```

Validation rules:

- Name is required
- Type is required
- Latitude is required
- Longitude is required
- Radius must be greater than 0
- Radius should have sensible max limit
- Active status should default to true

---

## 11. Route Deviation UI

Phase 2 should include route deviation visibility.

Show:

- Deviation alert
- Deviation location
- Planned route
- Actual route
- Deviation distance
- Time of deviation
- Current status

Suggested route deviation object:

```ts
interface RouteDeviation {
  id: string;
  tripId: string;
  plannedRouteId: string;
  deviationDistanceKm: number;
  detectedAt: string;
  latitude: number;
  longitude: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Acknowledged" | "Resolved";
}
```

---

## 12. ETA Enhancements

ETA should be shown as a dynamic operational value.

Fields:

```text
plannedEta
currentEta
delayMinutes
lastRecalculatedAt
etaConfidence
delayReason
```

ETA confidence values:

```text
Low
Medium
High
```

Delay reasons:

```text
Traffic
Vehicle Idle
Route Deviation
Checkpoint Delay
Loading Delay
Unloading Delay
GPS Missing
Unknown
```

---

## 13. Customer-Safe Tracking Rules

Create a customer-safe mapper.

Example:

```ts
function toCustomerTrackingView(trip: TrackingTrip): CustomerTrackingView
```

Customer view should include:

```text
bookingId
currentStatus
origin
destination
eta
delayStatus
publicTimeline
lastUpdatedAt
podStatus
```

Customer view should exclude:

```text
internalAlerts
driverSensitiveData
financeStatus
vendorSettlementData
complianceData
internalRemarks
```

---

## 14. RBAC Enhancements

Add or prepare these permissions:

```text
track_trace:read
track_trace:write
track_trace:alerts:manage
track_trace:geofence:manage
track_trace:replay:view
track_trace:customer_link:view
track_trace:export
```

Permission behavior:

- Users with `track_trace:read` can view dashboard, trips, live map.
- Users with `track_trace:alerts:manage` can acknowledge/resolve alerts.
- Users with `track_trace:geofence:manage` can create/update/delete geofences.
- Users with `track_trace:replay:view` can view trip replay.
- Users with `track_trace:customer_link:view` can view customer preview.

---

## 15. Module Interaction in Phase 2

### 15.1 Booking Module

Track & Trace consumes:

```text
TripCreated
VehicleAssigned
DriverAssigned
TripCancelled
TripCompleted
```

Track & Trace displays booking-linked data but does not update booking master data.

---

### 15.2 Fleet Module

Track & Trace consumes:

```text
Vehicle profile
Driver profile
Vehicle active status
Device mapping
```

Track & Trace sends back movement status only:

```text
Current location
Vehicle online/offline
Idle status
Trip movement state
```

---

### 15.3 Driver App

Driver App sends:

```text
LocationUpdated
TripStatusChanged
SOSRaised
BatteryStatusUpdated
NetworkStatusUpdated
```

Track & Trace uses these to update live map and alerts.

---

### 15.4 Customer Dashboard

Customer Dashboard consumes:

```text
Customer-safe trip view
ETA
Public timeline
Delay status
POD status
```

Do not expose internal operational alerts directly.

---

### 15.5 Finance Module

Track & Trace prepares:

```text
TripCompleted
Actual distance
Delay duration
Detention time
Route deviation
POD status
```

Finance will consume this later for invoice and settlement calculations.

---

## 16. Suggested Routes

Update `trackingRoutes.tsx`:

```tsx
[
  {
    path: "/track-trace",
    element: <TrackTraceDashboard />,
  },
  {
    path: "/track-trace/trips",
    element: <ActiveTripsPage />,
  },
  {
    path: "/track-trace/live-map",
    element: <LiveMapPage />,
  },
  {
    path: "/track-trace/trips/:tripId",
    element: <TripDetailsPage />,
  },
  {
    path: "/track-trace/trips/:tripId/replay",
    element: <TripReplayPage />,
  },
  {
    path: "/track-trace/alerts",
    element: <TrackingAlertsPage />,
  },
  {
    path: "/track-trace/geofences",
    element: <GeofenceManagementPage />,
  },
  {
    path: "/track-trace/customer-preview/:tripId",
    element: <CustomerTrackingPreviewPage />,
  },
]
```

---

## 17. Sidebar/Menu Items

Recommended sidebar:

```text
Track & Trace
- Dashboard
- Live Map
- Active Trips
- Alerts
- Geofences
```

Trip Replay should be accessible from Trip Details instead of direct sidebar.

Customer Preview should be accessible from Trip Details instead of direct sidebar.

---

## 18. Acceptance Criteria

Phase 2 is complete when:

- Existing Phase 1 screens still work.
- Live map supports live update state from WebSocket or mocked socket.
- WebSocket service has connection/reconnect structure.
- API service can switch between mock and real API mode.
- Alerts can be acknowledged and resolved.
- Geofences can be listed, created, edited, disabled, and deleted.
- Trip Replay page exists and shows replay-ready route/timeline data.
- Customer Tracking Preview shows only safe data.
- RBAC permissions are prepared or integrated.
- No existing module breaks.
- TypeScript build passes.
- UI remains consistent with existing Optimile design system.

---

## 19. Implementation Order for Codex

Follow this sequence:

```text
1. Review Phase 1 Track & Trace implementation.
2. Review existing shared API/auth/UI patterns.
3. Add missing Phase 2 types.
4. Add socket service structure.
5. Add tracking store for live updates.
6. Enhance tracking API with mock/real mode.
7. Add alert API and alert actions.
8. Add geofence API and geofence pages.
9. Add trip replay page and components.
10. Add customer tracking preview mapper and page.
11. Enhance live map for live updates and route deviation UI.
12. Update routes.
13. Update sidebar/menu entries.
14. Add or wire RBAC permissions.
15. Test navigation.
16. Run TypeScript/build checks.
17. Fix regressions without changing unrelated modules.
```

---

## 20. Do Not Do in Phase 2

Do not implement unless already available in the project:

- Full production-grade GPS ingestion backend
- Kafka/RabbitMQ setup
- Real billing or finance calculations
- Full route optimization engine
- AI ETA prediction
- Complex polygon geofence drawing
- Driver mobile app native implementation
- Vendor settlement logic
- Major shared layout refactor

Keep Phase 2 focused on operational readiness and integration structure.

---

## 21. Final Instruction

Build Track & Trace Phase 2 as an operational SaaS-ready module.

Do not break existing modules. Keep it typed, modular, API-ready, WebSocket-ready, and consistent with the Optimile design system.
