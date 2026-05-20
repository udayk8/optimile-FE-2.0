# Track & Trace Web - Phase 1 Implementation Plan

## 1. Objective

Build the Phase 1 MVP for the `track-trace-web` module inside `frontend-main/modules/track-trace-web`.

The goal is to make Track & Trace usable for demo and internal operations with mock data first, without breaking existing modules.

Phase 1 should include:

- Track & Trace Dashboard
- Active Trips List
- Live Map View
- Trip Detail Page
- Trip Timeline
- Basic Alerts
- Mock tracking data
- Search and filters
- RBAC route guard compatibility
- Consistent UI with existing Optimile design system

---

## 2. Important Architecture Rule

Track & Trace must not own booking, fleet, vendor, finance, or customer master data.

It should only own and display:

- Live location
- Trip movement status
- ETA
- Tracking events
- Tracking alerts
- Route/checkpoint information
- Replay-ready history structure

For Phase 1, use mock data, but structure the code so APIs can be connected later.

---

## 3. Suggested Folder Structure

Create or align the module with this structure:

```text
modules/track-trace-web/
└── src/
    ├── app/
    │   └── TrackTraceApp.tsx
    │
    ├── pages/
    │   ├── TrackTraceDashboard.tsx
    │   ├── ActiveTripsPage.tsx
    │   ├── LiveMapPage.tsx
    │   ├── TripDetailsPage.tsx
    │   └── TrackingAlertsPage.tsx
    │
    ├── components/
    │   ├── TrackingSummaryCards.tsx
    │   ├── ActiveTripsTable.tsx
    │   ├── LiveMapPanel.tsx
    │   ├── TripTimeline.tsx
    │   ├── TrackingStatusBadge.tsx
    │   ├── TrackingAlertCard.tsx
    │   ├── ETAWidget.tsx
    │   ├── RouteProgress.tsx
    │   └── TripInfoPanel.tsx
    │
    ├── services/
    │   └── trackingApi.ts
    │
    ├── store/
    │   └── trackingMockData.ts
    │
    ├── types/
    │   └── tracking.types.ts
    │
    └── routes/
        └── trackingRoutes.tsx
```

---

## 4. Phase 1 Screens

### 4.1 Track & Trace Dashboard

Route suggestion:

```text
/track-trace
```

Dashboard must show:

- Total active trips
- In transit trips
- Delayed trips
- Idle vehicles
- Offline vehicles
- Open alerts
- Average ETA delay
- On-time percentage

Dashboard sections:

1. Summary cards
2. Active trips preview table
3. Alert highlights
4. Mini live map preview
5. Recent trip events

---

### 4.2 Active Trips Page

Route suggestion:

```text
/track-trace/trips
```

Table columns:

- Trip ID
- Booking ID
- Vehicle Number
- Driver Name
- Customer
- Origin
- Destination
- Current Status
- ETA
- Delay
- Last Updated
- Action

Required features:

- Search by trip ID
- Search by booking ID
- Search by vehicle number
- Search by customer
- Filter by status
- Filter by delay status
- Click row to open trip detail page

---

### 4.3 Live Map Page

Route suggestion:

```text
/track-trace/live-map
```

For Phase 1, if map integration is not available, create a clean map placeholder panel with mock vehicle markers.

Must include:

- Vehicle marker cards
- Pickup point
- Drop point
- Planned route mock line
- Actual route mock line
- Vehicle status indicators
- Selected trip side panel
- Toggle buttons:
  - Show active only
  - Show delayed only
  - Show offline vehicles
  - Show route deviation

Note: Keep this ready for Mapbox or Google Maps integration later.

---

### 4.4 Trip Details Page

Route suggestion:

```text
/track-trace/trips/:tripId
```

Sections:

1. Trip summary
2. Vehicle and driver info
3. Route and ETA
4. Current location
5. Timeline
6. Alerts
7. Customer-safe tracking status

Trip detail fields:

- Trip ID
- Booking ID
- Customer
- Vehicle number
- Driver name
- Driver mobile
- Origin
- Destination
- Scheduled pickup time
- Actual pickup time
- Scheduled delivery time
- ETA
- Delay minutes
- Current status
- Last location update
- Distance covered
- Remaining distance

---

### 4.5 Alerts Page

Route suggestion:

```text
/track-trace/alerts
```

Alert fields:

- Alert ID
- Alert type
- Severity
- Trip ID
- Vehicle number
- Message
- Location
- Created time
- Status
- Assigned user

Alert statuses:

```text
Open
Acknowledged
Resolved
```

Alert severity:

```text
Low
Medium
High
Critical
```

Must-have mock alerts:

- Vehicle Offline
- GPS Not Updating
- Route Deviation
- Trip Delayed
- Long Idle
- Overspeed
- Unplanned Stop
- Checkpoint Missed
- Driver SOS

---

## 5. Tracking Status Model

Use these statuses in Phase 1:

```text
Scheduled
Assigned
At Pickup
Loading
In Transit
At Checkpoint
Near Destination
At Destination
Unloading
Completed
Delayed
Idle
Stopped
Offline
Route Deviated
Cancelled
```

Create a reusable `TrackingStatusBadge` component.

Each status should have:

- Label
- Visual badge
- Optional description

Do not hardcode badge UI inside every page.

---

## 6. TypeScript Types

Create `tracking.types.ts`.

Suggested types:

```ts
export type TrackingStatus =
  | "Scheduled"
  | "Assigned"
  | "At Pickup"
  | "Loading"
  | "In Transit"
  | "At Checkpoint"
  | "Near Destination"
  | "At Destination"
  | "Unloading"
  | "Completed"
  | "Delayed"
  | "Idle"
  | "Stopped"
  | "Offline"
  | "Route Deviated"
  | "Cancelled";

export type AlertSeverity = "Low" | "Medium" | "High" | "Critical";

export type AlertStatus = "Open" | "Acknowledged" | "Resolved";

export interface TrackingLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recordedAt: string;
  source: "DRIVER_APP" | "GPS_DEVICE" | "FASTAG" | "ANPR" | "MANUAL";
}

export interface TrackingTrip {
  id: string;
  bookingId: string;
  customerName: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  origin: string;
  destination: string;
  status: TrackingStatus;
  scheduledPickupTime: string;
  actualPickupTime?: string;
  scheduledDeliveryTime: string;
  eta: string;
  delayMinutes: number;
  lastUpdatedAt: string;
  distanceCoveredKm: number;
  remainingDistanceKm: number;
  currentLocation: TrackingLocation;
}

export interface TrackingEvent {
  id: string;
  tripId: string;
  type: string;
  title: string;
  description: string;
  eventTime: string;
  location?: string;
}

export interface TrackingAlert {
  id: string;
  tripId: string;
  vehicleNumber: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  location: string;
  createdAt: string;
  assignedTo?: string;
}
```

---

## 7. Mock Data Requirements

Create `trackingMockData.ts`.

Include at least:

- 12 active trips
- 5 delayed trips
- 3 offline vehicles
- 15 tracking events
- 10 alerts
- Different statuses across trips
- Different customers
- Different origin/destination pairs

Mock examples should cover:

- Normal in-transit trip
- Delayed trip
- Route deviated trip
- Vehicle offline trip
- Completed trip
- Trip at pickup
- Trip near destination

---

## 8. Service Layer

Create `trackingApi.ts`.

For Phase 1, this should return mock data using async functions.

Suggested methods:

```ts
export async function getTrackingDashboardSummary() {}

export async function getActiveTrips() {}

export async function getTripById(tripId: string) {}

export async function getTripTimeline(tripId: string) {}

export async function getTrackingAlerts() {}

export async function getLiveVehicles() {}
```

Important:

- Do not call mock data directly from pages.
- Pages should call service methods.
- This will make API integration easier later.

---

## 9. UI/UX Requirements

Follow the existing Optimile design system.

Must include:

- Consistent sidebar integration
- Consistent page header
- Summary cards
- Enterprise-style tables
- Search box
- Filters
- Status badges
- Empty states
- Loading states
- Error states
- Responsive layout

Avoid:

- Random colors
- Hardcoded layout styles
- Inconsistent buttons
- Page-specific duplicate table logic
- Breaking other modules

---

## 10. RBAC Requirements

Track & Trace should support permission-based access.

Suggested permissions:

```text
track_trace:read
track_trace:write
track_trace:alerts:manage
track_trace:export
track_trace:customer_link
```

Phase 1 should at least guard the module using:

```text
track_trace:read
```

If shared-auth already has a route guard, reuse it.

Do not create duplicate auth logic inside the module.

---

## 11. Module Interaction Plan

### Booking Module to Track & Trace

Track & Trace consumes:

- Trip ID
- Booking ID
- Customer
- Origin
- Destination
- Scheduled pickup time
- Scheduled delivery time
- Vehicle assignment
- Driver assignment

Phase 1:

- Use mock booking-linked trips.

Future:

- Consume Booking APIs or events.

---

### Fleet Module to Track & Trace

Track & Trace consumes:

- Vehicle number
- Vehicle type
- Driver name
- Driver mobile
- GPS/device mapping
- Vehicle active/inactive status

Phase 1:

- Use mock fleet data inside tracking mock trips.

Future:

- Consume Fleet APIs.

---

### Driver App to Track & Trace

Track & Trace consumes:

- Driver location
- Driver app heartbeat
- Driver trip status updates
- Driver SOS
- Battery/network status

Phase 1:

- Use mock location updates.

Future:

- WebSocket or API ingestion.

---

### Customer Dashboard to Track & Trace

Customer Dashboard consumes:

- Customer-safe trip status
- ETA
- Timeline
- Current location
- Delay status

Phase 1:

- Prepare customer-safe fields in trip details.

Future:

- Add `/public/track/{trackingToken}` flow.

---

### Finance Module to Track & Trace

Finance consumes:

- Trip completed event
- Actual distance
- Delay duration
- Detention time
- POD status

Phase 1:

- Show finance status as read-only placeholder if needed.

Future:

- Publish `TripCompleted` event.

---

## 12. Suggested Routes

Add these routes inside `trackingRoutes.tsx`:

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
    path: "/track-trace/alerts",
    element: <TrackingAlertsPage />,
  },
]
```

---

## 13. Acceptance Criteria

Phase 1 is complete when:

- Track & Trace module opens from the app navigation.
- Dashboard shows meaningful summary metrics.
- Active trips table supports search and filter.
- Trip details page opens correctly from trip row.
- Timeline is visible for selected trip.
- Alerts page lists operational alerts.
- Status badges are consistent across pages.
- Mock data is accessed through service layer.
- No existing module breaks.
- TypeScript build passes.
- UI follows the existing design system.

---

## 14. Implementation Order for Codex

Follow this sequence:

```text
1. Review current frontend-main structure and shared UI/auth patterns.
2. Inspect existing module routing and sidebar registration.
3. Create tracking types.
4. Create tracking mock data.
5. Create tracking service layer.
6. Create reusable components.
7. Create Phase 1 pages.
8. Register routes.
9. Add sidebar/menu entry.
10. Add RBAC permission if shared-auth supports it.
11. Test navigation and build.
12. Fix TypeScript and lint issues.
```

---

## 15. Do Not Do in Phase 1

Do not implement:

- Real GPS integration
- Real WebSocket streaming
- Real Mapbox/Google Maps dependency unless already available
- Kafka/event bus
- Backend APIs
- Billing logic
- Vendor settlement logic
- Actual public tracking link
- Complex route optimization

Keep Phase 1 frontend-focused and mock-data driven, but API-ready.

---

## 16. Final Instruction

Build Track & Trace Phase 1 as a clean, SaaS-grade frontend module.

Keep it modular, typed, mock-data driven, and compatible with future backend integration.
