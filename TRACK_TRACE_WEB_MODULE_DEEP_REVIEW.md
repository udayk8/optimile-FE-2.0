# Track-Trace-Web Module — Complete Deep Code Review
**Module:** `/modules/track-trace-web/`
**Scan Date:** 2026-06-03
**Stack:** React + TypeScript + Vite | Real-time WebSocket + 15s fallback polling
**Purpose:** Real-time GPS tracking, alert management, geofence management, route performance analytics, dispatch visibility

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Hierarchy](#2-route-hierarchy)
3. [Screen Inventory](#3-screen-inventory)
4. [Feature Inventory](#4-feature-inventory)
5. [Trip Lifecycle & Status Machine](#5-trip-lifecycle--status-machine)
6. [Alert Lifecycle](#6-alert-lifecycle)
7. [Geofence Lifecycle](#7-geofence-lifecycle)
8. [Real-Time Data Pipeline](#8-real-time-data-pipeline)
9. [Form Analysis](#9-form-analysis)
10. [API Catalog](#10-api-catalog)
11. [State Management](#11-state-management)
12. [RBAC & Permission Matrix](#12-rbac--permission-matrix)
13. [Business Rules Catalog](#13-business-rules-catalog)
14. [Dependency Matrix](#14-dependency-matrix)
15. [Edge Cases](#15-edge-cases)
16. [Hidden Features & Technical Debt](#16-hidden-features--technical-debt)
17. [Missing Features Report](#17-missing-features-report)
18. [Complete Type & Enum Reference](#18-complete-type--enum-reference)

---

## 1. Architecture Overview

### Problem Domain
A real-time Transportation Visibility & Control Tower system providing live GPS tracking, alert management, geofence zone monitoring, route performance analytics, and dispatch operations across a fleet of vehicles and trips.

### Main User Personas

| Persona | Role Code | Access |
|---|---|---|
| Platform Admin | `platform-admin` | Enterprise — all features |
| Tenant Admin | `tenant-admin` | Enterprise — all features |
| Control Tower Operator | `control-tower` | Enterprise — all features |
| Fleet Operator | `fleet-operator` | Professional — all except customer-preview, POD |
| Vendor | `vendor` | Professional — dashboard, shipments, alerts, vehicles |
| Customer | `customer` | Basic — dashboard, shipments, customer-preview, POD |

### Rendering Modes
| Mode | Behaviour |
|---|---|
| **Standalone** | Full SPA with BrowserRouter + AuthProvider |
| **Embedded** | No sidebar/header; parent shell owns navigation chrome. Detected via `useTrackTraceEmbedded()` |

### Real-Time Architecture
```
WebSocket (Primary)
  └── applySocketEventToTrips()
  └── applySocketEventToAlerts()
  └── applySocketEventToTimeline()
  └── applySocketEventToGeofenceEvents()

Fallback Polling (15s interval — activates when socket ≠ 'Connected')
  └── getActiveTrips()
  └── getTrackingAlerts()
  └── getTrackingDashboardSummary()
  └── getTrackingRules()
  └── getTrackingAlertRulesConfig()
```

### Upstream Dependencies
- Fleet module (vehicle master, driver master)
- TMS module (booking reference, trip assignment)
- Telematics / GPS provider (location data via socket)

### Downstream Impacts
- Customer tracking link (masked view via customer-preview)
- Finance module (trip completion triggers billing)
- Exception management (alert escalation)

---

## 2. Route Hierarchy

```
/  (root)
├── /dashboard                        ← TrackTraceDashboard           [lazy]
├── /live-map                         ← LiveMapPage                   [lazy, MapPageSkeleton]
├── /dispatch                         ← DispatchPage                  [lazy, ListPageSkeleton]
├── /trips/:tripId                    ← TripDetailsPage               [lazy, ListPageSkeleton]
├── /trips/:tripId/replay             ← TripReplayPage                [lazy, ListPageSkeleton]
├── /alerts                           ← TrackingAlertsPage            [lazy, ListPageSkeleton]
├── /geofences                        ← GeofenceManagementPage        [lazy, ListPageSkeleton]
├── /geofences/new                    ← GeofenceFormPage              [lazy]
├── /geofences/:geofenceId            ← GeofenceDetailPage            [lazy]
├── /geofences/:geofenceId/edit       ← GeofenceFormPage (edit mode)  [lazy]
├── /customer-preview/:tripId         ← CustomerTrackingPreviewPage   [lazy]
├── /route-performance                ← RoutePerformancePage          [lazy, AnalyticsPageSkeleton]
│
└── Legacy Redirects:
    /trips           → /dispatch
    /shipments       → /dispatch
    /vehicles        → /live-map
    /route-progress  → /live-map
    /exceptions      → /alerts
    /pod             → /alerts
    /control-tower   → /dashboard
    /analytics       → /route-performance
    *                → /dashboard
```

**Skeleton Loaders:**
- `DashboardSkeleton` — Dashboard
- `MapPageSkeleton` — Live Map
- `ListPageSkeleton` — Dispatch, Trip Details, Alerts, Geofences
- `AnalyticsPageSkeleton` — Route Performance

---

## 3. Screen Inventory

### Screen 1: TrackTraceDashboard — `/dashboard`

**Purpose:** Operational command center — live KPIs, alert strip, active trips.

#### KPI Cards (4)

| Card | Metric | Navigation on Click |
|---|---|---|
| Total Active Trips | count non-Completed/Cancelled | `/trips` |
| In Transit | count in transit statuses | `/trips?status=In+Transit` |
| Delayed | count delayMinutes > 0 | `/trips?delay=Delayed` |
| Open Alerts | count status ≠ Resolved | `/alerts` |

#### Alert Severity Strip
- Critical → High → Medium → Low colored counters
- Colors: Critical=red-500, High=orange-400, Medium=amber-400, Low=blue-400

#### Active Trips Table (max 7 rows)
Columns: Trip ID | Route | Vehicle | Tracking Devices | ETA/Status

#### Alert Center Panel (right sidebar, max 7 alerts)
- Severity border color, alert type, time ago, message excerpt

#### Quick Links Grid (5 cards)
Live Map | Alerts | Dispatch | Geofences | Route Performance

#### Socket Status Indicator
- Connected: green pulsing "Live" dot
- Disconnected: state label (Connecting / Reconnecting)

---

### Screen 2: LiveMapPage — `/live-map`

**Purpose:** Real-time GPS map with full fleet visibility.

#### Google Maps Config
- POI hidden, transit hidden, clickable icons disabled
- Cluster threshold: zoom < 8
- Cell sizes: zoom ≤5 → 1.2, zoom ≤6 → 0.7, zoom ≤8 → 0.45
- Min vehicles per cluster: 2

#### Marker Colors (Derived Status)
| Status | Hex Color |
|---|---|
| Moving | `#22c55e` (green) |
| Idle | `#f59e0b` (orange) |
| Stopped | `#ef4444` (red) |
| Offline | `#94a3b8` (slate) |

#### Cluster Status Priority
Stopped > Moving > Idle > Offline (worst status wins for cluster color)

#### Vehicle Search
- Top-left search bar, filters by `registration_number`
- Enter key → zooms map to zoom=13 on matched vehicle

#### Vehicle Detail Panel (left side)
- Driver avatar + name + phone link (→ `/fleet/drivers/:driverId`)
- Live Telemetry: Speed gauge (0–120 km/h), Ignition on/off, Today's run km
- Active Trip Context:
  - Origin → Destination
  - Status badge
  - Delay badge (`+Xm`) if delayed
  - Progress bar: green (on-time), red (delayed)
  - Open alerts badge → `/alerts?tripId=X`
- Action buttons: View Trip, View Vehicle, Playback (history)

#### Fleet Status Legend (bottom-left)
Moving (green) | Idle (orange) | Stopped (red) | Offline (slate)

#### Zoom Controls (bottom-right)
`+` / `−` buttons

#### History Playback Modal
- Leaflet map with CARTO tiles
- Day filter dropdown (All Days + individual dates)
- Timeline slider: blue solid (traveled) / gray dashed (remaining)
- Controls: Play/Pause, Step Forward/Back, Jump to Start/End
- Speed/time pill + alert markers (High/Medium/Low severity colors)

---

### Screen 3: ActiveTripsPage — `/trips` (redirects to `/dispatch`)

**Purpose:** Comprehensive trip list with advanced search, filter, sort.

#### Filters
- Search: Trip ID, Booking ID, Vehicle, Customer, Driver, Origin, Destination
- Status filter (15 values): All, Scheduled, Assigned, At Pickup, Loading, In Transit, At Checkpoint, Delayed, Near Destination, At Destination, Unloading, Idle, Stopped, Offline, Route Deviated
- Delay filter: All | Delayed | On Time

#### KPI Shortcut Buttons (clickable filter presets)
Total Active | In Transit | Delayed | Idle | Offline | Deviation

#### Table Columns
Trip ID (+ alert badge) | Route | Vehicle + Driver | Tracking Devices | ETA/Status (progress bar)

#### Tracking Device Tags
- GPS → green
- SIM/FASTAG → blue
- App → violet
- ANPR → amber
- Manual → gray
- Offline → red

#### Pagination Options
10 | 25 | 50 items per page

---

### Screen 4: TrackingAlertsPage — `/alerts`

**Purpose:** Alert management workspace with full incident detail panel.

#### Severity Stat Cards (5)
Total | Critical | High | Medium | Low — each clickable to filter

#### Filter Bar
- Search: alerts, trips, vehicles, location, type, message, assignedTo
- Trip filter chip (shows booking ID, X to clear)
- Status toggle pills: Open | Acknowledged | Resolved | All
- Sort toggle: Newest | Severity | Unassigned First
- Reset filters button

#### Alert List Columns
Severity | Alert Type | Trip/Vehicle | Location | Status | Time | Actions (Ack / Resolve / View)

#### Alert Row Styling (left 4px border by severity)
| Severity | Row Border | Badge |
|---|---|---|
| Critical | border-l-red-500 | bg-red-100 text-red-700 |
| High | border-l-orange-400 | bg-orange-100 text-orange-700 |
| Medium | border-l-amber-400 | bg-amber-100 text-amber-700 |
| Low | border-l-blue-400 | bg-blue-100 text-blue-700 |

#### Incident Detail Panel (right side, scrollable)
- Severity + Status + Time ago
- Alert message
- Trip context card: Origin → Destination, status, delay, progress, source health
- Corridor context: Avg delay, Efficiency %, link to route-performance
- Metadata: Booking Ref, Vehicle, Location, Assigned To
- Incident Timeline (dots): Alert Triggered → Acknowledged → Resolved
- Operator Remarks textarea (shows "Add remark" button when text entered)
- Footer buttons: Open in Dispatch | View Trip Replay | Acknowledge | Resolve

---

### Screen 5: TripDetailsPage — `/trips/:tripId`

**Purpose:** Single trip execution view with device switching and status timeline.

#### Header
- Status badge + action buttons: Cancel Trip, Dispatch Trip, Start Trip, Complete Trip (all **DISABLED**), View Replay (active)

#### Tracking Device Switcher
- Radio-like buttons per device
- Shows device label, source color indicator, active indicator
- Unavailable/Faulted state: disabled, opacity 40%
- Shows: last switched by + timestamp

#### Trip Status Timeline (visual stepper)
Planned → Dispatched → In Transit → Completed
- Current step highlighted, completed steps show filled circle

#### Distance Metrics Strip (3 columns)
| Column | Content |
|---|---|
| Expected Distance | Planned km |
| Tracked So Far | Actual GPS km |
| Progress % / Variance | ±km variance (for completed trips) |

#### Open Alerts Section
- Up to 3 alert chips → `/alerts?alert=ID`
- "View all →" link

#### Geofence Zones Section
- Type badges (Pickup, Drop, Warehouse, etc.)
- Linked entity ID

#### Left Column
- Route card: Origin → Destination (visual dots/line) + corridor performance
- Assignment card: Vehicle info + Driver info

#### Right Column
- Google Maps embed with directions (iframe)
- Live status indicator pulsing if In Transit

---

### Screen 6: TripReplayPage — `/trips/:tripId/replay`

**Purpose:** Historical trip playback — route, telemetry, alerts.

- Map with full vehicle path overlay
- Timeline scrubber with play/pause controls
- Speed simulation slider
- Telemetry readouts: speed, heading, accuracy
- Event markers at key moments (geofence entry/exit, status changes)
- Alert points: overspeed, harsh braking, stops

**Plan Gate:** Professional+ only (`tracking.replay`)

---

### Screen 7: RoutePerformancePage — `/route-performance`

**Purpose:** Corridor/lane efficiency and delay analytics.

**Plan Gate:** Enterprise only (`tracking.routePerformance`)

#### KPI Cards (4)
| Card | Metric |
|---|---|
| Average Efficiency % | mean(efficiencyScore) across all lanes |
| High-Delay Corridors | count(averageDelayMinutes > 90) |
| Lanes Reviewed | total lane count |
| Deviation Count | sum(deviationCount) across all lanes |

#### Controls
- View toggle: Worst Delay | Best Efficiency | All Corridors
- Quick select date pills: Today | Yesterday | This Week | This Month | Annual | All Time
- Custom date pickers (from/to) when not "All Time"
- SVG corridor map (node-and-line diagram, color-coded by delay severity)

#### Lane Performance Table Columns
Lane ID (+ live badge + alert badge) | Origin/Destination | Planned Distance | Actual Distance | Planned Duration | Actual Duration | Avg Delay | Efficiency % | Actions

#### Efficiency Color Coding
| Score | Color |
|---|---|
| ≥ 110% | blue (better than planned) |
| ≥ 95% | emerald (on target) |
| < 95% | amber (underperforming) |

#### Delay Color Coding
| Delay | Color |
|---|---|
| > 90 min | red |
| > 20 min | amber |
| ≤ 20 min | emerald |

#### Actions per Row
- Alert badge → `/alerts?tripId=worst-trip`
- "Dispatch" button → `/dispatch?search=origin` (visible only when liveCount > 0)

---

### Screen 8: DispatchPage — `/dispatch`

**Purpose:** Operational dispatch hub — trip assignment and monitoring.

#### Status Strip (6 sections — clickable to filter)
Total Active | Planned | Dispatched | In Transit | Delayed (orange if > 0) | Offline (red if > 0)

#### Trip Table Columns
Trip ID | Vehicle | Route | Schedule | ETA/Delay | Tracking | Status | Action

#### Trip ID Cell Extras
- Alert badge: severity color + count + worst severity label
- Geofence zone badge: 📍 X zone(s)

#### Tracking Device Tags (same as ActiveTripsPage)
GPS green | SIM blue | App violet | Manual gray | Offline red

#### Status Badge Colors
| Status | Color |
|---|---|
| Planned | gray |
| Dispatched | primary |
| In Transit | blue |
| Completed | green |
| Cancelled | red |

#### Trip Row Actions
- Dispatch → **DISABLED**
- Cancel → **DISABLED**
- Edit → **DISABLED**
- View Details → **ACTIVE** (navigates to TripDetailsPage)

---

### Screen 9: GeofenceManagementPage — `/geofences`

**Purpose:** Zone definition, status management, alert monitoring.

**Plan Gate:** Professional+ only (`tracking.geofences`)

#### KPI Strip (5 cards)
| Card | Action |
|---|---|
| Total Zones | — |
| Active Zones | — |
| Zones w/ Alerts | Clickable → filter "WithAlerts" |
| Open Alerts | — |
| Active Trips in Scope | → `/dispatch` |

#### Filter Bar
- Search input
- Filter popover: Zone type, Status, Alerts
- Group toggle (groups list by `zone.group`)

#### Geofence List Columns
Zone (name + type badge + meta) | Active Trips | Dwell | Alerts | Active Toggle | Edit | Kebab Menu

#### Kebab Menu Per Zone
- Duplicate (clones with new ID)
- Delete (triggers confirmation modal showing affected active trip count)

#### Zone Type Badge Colors
| Type | Color |
|---|---|
| Pickup | bg-blue-100 text-blue-700 |
| Drop | bg-teal-100 text-teal-700 |
| Warehouse | bg-indigo-100 text-indigo-700 |
| Checkpoint | bg-purple-100 text-purple-700 |
| Restricted Zone | bg-danger/10 text-danger |
| Yard | bg-orange-100 text-orange-600 |
| Customer Site | bg-green-100 text-green-700 |
| Custom | bg-gray-100 text-gray-600 |

#### Per-Zone Extra Indicators
- Stale indicator: shown if `!isActive` and no recent events
- Dwell breach warning: if vehicle inside > `dwellAlertMinutes`
- Today entry count badge
- Worst severity badge (if alerts exist for linked trips)

#### Pagination
20 zones per page

---

### Screen 10: GeofenceDetailPage — `/geofences/:geofenceId`

**Purpose:** Single zone detail, entry/exit log, linked trip context.

#### Header
- Zone name + type badge + active/inactive badge + severity badge
- Edit + Deactivate/Activate + Delete action buttons

#### Metadata
Coordinates | Radius | Entity ID | Today entries | Dwell threshold | Entry alerts on/off

#### Main Grid (2 columns)
- **Linked Trips Card:** Active + in-zone trips, dwell indicator, ETA status, last ping, "View in Dispatch"
- **Open Alerts Card:** Unresolved alerts for linked trips, severity badge, alert type, "View in Alerts"

#### Corridor Intelligence Card
Avg delay (color-coded) | Efficiency % (color-coded) | Deviation count

#### Entry/Exit Log (Timeline format)
- ↓ Entry (green icon) | ↑ Exit (gray icon)
- Timestamp + Trip ID + Dwell time between entry and exit

---

### Screen 11: GeofenceFormPage — `/geofences/new` & `/geofences/:id/edit`

**Purpose:** Create or edit a geofence zone.

*(See full form details in [Section 9](#9-form-analysis))*

---

### Screen 12: CustomerTrackingPreviewPage — `/customer-preview/:tripId`

**Purpose:** Masked customer-safe tracking view — no internal operational data exposed.

**Plan Gate:** Basic+ (all plans)

#### Visible Fields (controlled by `CustomerVisibilityRules`)
| Setting | Default |
|---|---|
| showVehicleNumber | configurable |
| showDriverName | configurable |
| showDriverMobile | configurable |
| showExactLocation | configurable |
| showApproxLocation | configurable |
| showETA | configurable |
| showDelayReason | configurable |
| showPublicTimeline | configurable |
| showPODStatus | configurable |
| showSupportContact | configurable |

#### Public Timeline
- Max 5 events shown
- Excludes: 'Alert Raised', 'Stop Alert' event types

#### POD Status
`Pending` | `Delivered` | `Unavailable`

---

## 4. Feature Inventory

| # | Feature | Status | Screen |
|---|---|---|---|
| F-01 | Live dashboard KPIs | Live | Dashboard |
| F-02 | Alert severity strip | Live | Dashboard |
| F-03 | Quick links grid | Live | Dashboard |
| F-04 | Socket connection indicator | Live | Dashboard |
| F-05 | Google Maps live map | Live | LiveMapPage |
| F-06 | Vehicle clustering (zoom-based) | Live | LiveMapPage |
| F-07 | Vehicle search on map | Live | LiveMapPage |
| F-08 | Vehicle detail panel (map) | Live | LiveMapPage |
| F-09 | History playback modal | Live | LiveMapPage |
| F-10 | Trip list with advanced filters | Live | ActiveTripsPage |
| F-11 | KPI shortcut filter buttons | Live | ActiveTripsPage |
| F-12 | Alert management workspace | Live | TrackingAlertsPage |
| F-13 | Alert severity stat cards | Live | TrackingAlertsPage |
| F-14 | Incident detail panel | Live | TrackingAlertsPage |
| F-15 | Alert acknowledge/resolve | Live | TrackingAlertsPage |
| F-16 | Operator remarks on alert | Live | TrackingAlertsPage |
| F-17 | Alert assignment to user | Live | TrackingAlertsPage |
| F-18 | Incident timeline (audit trail) | Live | TrackingAlertsPage |
| F-19 | Trip detail view | Live | TripDetailsPage |
| F-20 | Tracking device switcher | Live | TripDetailsPage |
| F-21 | Device switch audit trail | Live | TripDetailsPage |
| F-22 | Trip status stepper | Live | TripDetailsPage |
| F-23 | Distance metrics strip | Live | TripDetailsPage |
| F-24 | Geofence zones on trip | Live | TripDetailsPage |
| F-25 | Trip replay | Live (Plan gate) | TripReplayPage |
| F-26 | Route performance analytics | Live (Plan gate) | RoutePerformancePage |
| F-27 | Corridor SVG map | Live | RoutePerformancePage |
| F-28 | Lane efficiency table | Live | RoutePerformancePage |
| F-29 | Date range filter (analytics) | Live | RoutePerformancePage |
| F-30 | Dispatch hub | Live | DispatchPage |
| F-31 | Dispatch status strip | Live | DispatchPage |
| F-32 | Geofence management (CRUD) | Live (Plan gate) | GeofenceMgmtPage |
| F-33 | Geofence duplicate/delete | Live | GeofenceMgmtPage |
| F-34 | Geofence group view | Live | GeofenceMgmtPage |
| F-35 | Geofence detail + entry/exit log | Live | GeofenceDetailPage |
| F-36 | Corridor intelligence per geofence | Live | GeofenceDetailPage |
| F-37 | Customer tracking preview | Live (Plan gate) | CustomerPreviewPage |
| F-38 | Customer visibility rules (admin) | Live | Settings API |
| F-39 | WebSocket real-time updates | Live | TrackingStore |
| F-40 | Fallback 15s polling | Live | TrackingStore |
| F-41 | Synthetic system alerts | Live | trackingHealth.ts |
| F-42 | Dashboard summary recalculation | Live | TrackingStore |
| F-43 | Embedded mode (no chrome) | Live | Layout |
| F-44 | Notification bell with alerts | Live | Layout |
| F-45 | Cancel/Dispatch/Start/Complete trip | **DISABLED** | TripDetailsPage |
| F-46 | Dispatch/Cancel/Edit trip (dispatch) | **DISABLED** | DispatchPage |
| F-47 | Prediction / delay risk score | **Plan gate only** | Not rendered yet |
| F-48 | Audit log viewer | **MISSING** | Not in routes |
| F-49 | Export / reporting | **MISSING** | Not found |

---

## 5. Trip Lifecycle & Status Machine

### All 17 Trip Statuses
```
Scheduled → Assigned → At Pickup → Loading → In Transit
  → At Checkpoint → Near Destination → At Destination → Unloading → Completed
  
Sub-states (can occur at any active stage):
  → Delayed (delayMinutes > 0)
  → Idle (vehicle stationary, ignition on)
  → Stopped (ignition off)
  → Offline (no ping > threshold)
  → Route Deviated (routeDeviationKm > threshold)
  → Cancelled
```

### Socket Event → Status Transitions
| Event | New Status |
|---|---|
| `TripStatusChanged` | As received |
| `VehicleOffline` | `Offline` (if not Completed) |
| `VehicleOnline` | `In Transit` (if was Offline) |
| `RouteDeviationDetected` | `Route Deviated` |
| `TripCompleted` | `Completed` |
| `ETAUpdated` | Sets `delayMinutes`, `etaConfidence`, `delayReason` |
| `LocationUpdated` | Updates `currentLocation`, `lastLocationLabel`, clears `isOffline` |

### ETA Confidence Derivation
| Delay | Confidence |
|---|---|
| ≤ 45 min | `High` |
| ≤ 120 min | `Medium` |
| > 120 min | `Low` |

### Delay Reasons
`Traffic` | `Vehicle Idle` | `Route Deviation` | `Checkpoint Delay` | `Loading Delay` | `Unloading Delay` | `GPS Missing` | `Unknown`

---

## 6. Alert Lifecycle

### Alert Status Flow
```
Open → Acknowledged → Resolved
```

### Alert Actions & Payloads

| Action | Endpoint | Payload |
|---|---|---|
| Acknowledge | `POST /alerts/:id/acknowledge` | `{ acknowledgedBy, remarks? }` |
| Resolve | `POST /alerts/:id/resolve` | `{ resolvedBy, resolutionNote }` |
| Assign | `POST /alerts/:id/assign` | `{ userId }` |
| Add Remark | `POST /alerts/:id/remarks` | remark string |

### Synthetic (System-Generated) Alerts
| Alert ID Pattern | Trigger Condition | Rule-Driven |
|---|---|---|
| `SYS-OFFLINE-{tripId}` | `trip.isOffline = true` | Yes |
| `SYS-FALLBACK-{tripId}` | `sourceHealth = 'Fallback'` | Yes |
| `SYS-STALE-{tripId}` | lastUpdate > `stalePingThresholdMinutes` | Yes |
| `SYS-ROUTEDEV-{tripId}` | `routeDeviationKm * 1000 ≥ routeDeviationThresholdMeters` | Yes |

### Socket Events → Alert Updates
| Event | Effect |
|---|---|
| `AlertRaised` | Prepend new alert to list |
| `AlertAcknowledged` | Set status = Acknowledged (if not Resolved) |
| `AlertResolved` | Set status = Resolved, store resolvedBy + note |
| `RouteDeviationDetected` | Generate new SYS-ROUTEDEV alert |

---

## 7. Geofence Lifecycle

### Geofence Status
`Active` ↔ `Inactive` (toggle via `toggleGeofenceStatus()`)

### Event Flow
```
Vehicle enters radius  → GeofenceEntered event emitted (socket)
Vehicle inside > dwellAlertMinutes → Dwell alert triggered
Vehicle exits radius   → GeofenceExited event emitted
```

### Geofence Types (8)
`Pickup` | `Drop` | `Warehouse` | `Yard` | `Customer Site` | `Checkpoint` | `Restricted Zone` | `Custom`

### Linked Entity Types
`TRIP` | `BOOKING` | `CUSTOMER` | `WAREHOUSE` | `CHECKPOINT` | `YARD` | `CUSTOM`

### Geofence Shape
`Circle` only (polygon not implemented)

### Validation Rules (on create/update)
| Rule | Constraint |
|---|---|
| `name` | Required, non-empty after trim |
| `type` | Required, valid `GeofenceType` |
| `latitude` | Required, valid number |
| `longitude` | Required, valid number |
| `radiusMeters` | Required, > 0, ≤ 5000 |
| `linkedEntityType` | Required |
| `linkedEntityId` | Required, non-empty |

---

## 8. Real-Time Data Pipeline

### Initial Load Sequence (`refresh()`)
```
Parallel fetch (8 sources):
  1. getTrackingDashboardSummary()
  2. getActiveTrips()
  3. getTrackingAlerts()
  4. getRecentTrackingEvents(limit)
  5. getGeofences()
  6. getGeofenceEvents()
  7. getTrackingRules()       ← TrackingRules config
  8. getTrackingAlertRulesConfig() ← AlertRule[]

↓
hydrateTrackingTrips(trips, rules)
  → resolves activeTrackingDevice
  → resolves activeSource
  → resolves primaryTrackingDevice
  → updates device statuses (Active/Standby/Unavailable/Faulted)
  → resolveSourceHealth()

↓
mergeDerivedTrackingAlerts(baseAlerts, trips, rules, alertRules)
  → generates SYS-OFFLINE, SYS-FALLBACK, SYS-STALE, SYS-ROUTEDEV synthetic alerts
  → merges with base alerts (preserves existing status/remarks/assignments)
```

### Dashboard Summary Recalculation (on every trip/alert change)
```typescript
totalActiveTrips   = count(status ∉ ['Completed', 'Cancelled'])
inTransitTrips     = count(status ∈ ['In Transit','At Checkpoint','Near Destination','Delayed','Route Deviated'])
delayedTrips       = count(delayMinutes > 0 || status ∈ ['Delayed','Offline','Route Deviated'])
idleVehicles       = count(status ∈ ['Idle', 'Stopped'])
offlineVehicles    = count(isOffline)
openAlerts         = count(alertStatus ≠ 'Resolved')
averageEtaDelay    = round(sum(delayMinutes) / totalActiveTrips)
onTimePercentage   = round(count(delayMinutes ≤ 30) / totalActiveTrips * 100)
```

### Source Health Resolution
```typescript
isOffline = true           → 'Offline'
activeDevice ≠ PRIMARY
  OR activeSource ≠ primarySource → 'Fallback'
(now - lastUpdate) > stalePingThresholdMinutes → 'Stale'
else                       → 'Healthy'
```

### Socket Connection States
`Connecting` → `Connected` → `Disconnected` → `Reconnecting` → `Failed`

---

## 9. Form Analysis

### Form 1: Create / Edit Geofence

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | text | Yes | Non-empty after trim |
| `type` | dropdown | Yes | Valid `GeofenceType` |
| `latitude` | number | Yes | Valid coordinate |
| `longitude` | number | Yes | Valid coordinate |
| `radiusMeters` | number | Yes | > 0, ≤ 5000 |
| `linkedEntityType` | dropdown | Yes | Valid `LinkedEntityType` |
| `linkedEntityId` | text | Yes | Non-empty |
| `isActive` | toggle | No | Default: true |
| `dwellAlertMinutes` | number | No | Optional |
| `entryAlertEnabled` | toggle | No | Optional |
| `group` / label | text | No | Optional grouping key |

### Form 2: Alert Acknowledge

| Field | Required | Notes |
|---|---|---|
| `acknowledgedBy` | Yes | Actor name/ID |
| `remarks` | No | Free text note |

### Form 3: Alert Resolve

| Field | Required | Notes |
|---|---|---|
| `resolvedBy` | Yes | Actor name/ID |
| `resolutionNote` | Yes | Required resolution description |

### Form 4: Alert Remark (Operator remarks textarea)

| Field | Required | Notes |
|---|---|---|
| `remark` | Yes | Free text, shown with "Add remark" button |

### Form 5: Tracking Device Switch

| Field | Required | Notes |
|---|---|---|
| `deviceId` | Yes | Selected device ID |
| `switchedBy` | Yes | Actor name |
| Timestamp | Auto | Stamped on action |

---

## 10. API Catalog

> **Mock Mode:** `VITE_USE_MOCK_TRACKING=true` (default) switches all APIs to in-memory mock data. `VITE_TRACKING_API_BASE_URL` (default: `/api/tracking`) sets real API base.

### Tracking API

| Endpoint | Method | Purpose | Params / Payload |
|---|---|---|---|
| `/api/tracking/dashboard-summary` | GET | Dashboard KPI metrics | — |
| `/api/tracking/trips` | GET | All active trips | `search?`, `status?`, `delayedOnly?` |
| `/api/tracking/trips/:tripId` | GET | Single trip detail | — |
| `/api/tracking/trips/:tripId/timeline` | GET | Event timeline | — |
| `/api/tracking/trips/:tripId/locations` | GET | Location history | — |
| `/api/tracking/trips/:tripId/replay` | GET | Full replay data | — |
| `/api/tracking/trips/:tripId/customer-view` | GET | Masked customer-safe view | — |
| `/api/tracking/alerts` | GET | All alerts | — |
| `/api/tracking/live-vehicles` | GET | Live vehicle positions | — |
| `/api/tracking/events` | GET | Recent events | `limit=N` |
| `/api/tracking/vehicles/:vehicleId/location` | GET | Single vehicle location | — |

### Alert API

| Endpoint | Method | Payload |
|---|---|---|
| `/alerts/:id/acknowledge` | POST | `{ acknowledgedBy, remarks? }` |
| `/alerts/:id/resolve` | POST | `{ resolvedBy, resolutionNote }` |
| `/alerts/:id/assign` | POST | `{ userId }` |
| `/alerts/:id/remarks` | POST | remark string |

### Geofence API

| Endpoint | Method | Payload |
|---|---|---|
| `/geofences` | GET | — |
| `/geofences/:id` | GET | — |
| `/geofences` | POST | `GeofencePayload` |
| `/geofences/:id` | PATCH | `GeofencePayload` |
| `/geofences/:id` | DELETE | — |
| `/geofences/:id/status?isActive=bool` | PATCH | — |

### Analytics API

| Endpoint | Method | Filters |
|---|---|---|
| `/analytics/kpi-summary` | GET | `AnalyticsFilters` |
| `/analytics/route-performance` | GET | `AnalyticsFilters` |
| `/analytics/delay-trend` | GET | `AnalyticsFilters` |
| `/analytics/on-time-performance` | GET | `AnalyticsFilters` |
| `/analytics/driver-behavior` | GET | `AnalyticsFilters` |
| `/analytics/exceptions` | GET | `AnalyticsFilters` |
| `/analytics/vehicle-utilization` | GET | `AnalyticsFilters` |
| `/analytics/alert-severity-distribution` | GET | `AnalyticsFilters` |
| `/analytics/region-distribution` | GET | `AnalyticsFilters` |
| `/analytics/sla-metrics` | GET | `AnalyticsFilters` |
| `/analytics/sla-performance` | GET | `AnalyticsFilters` |

### Settings API

| Endpoint | Method | Entity |
|---|---|---|
| `/settings/tracking-rules` | GET / PATCH | `TrackingRules` |
| `/settings/sla-rules` | GET / PATCH | `SlaRules` |
| `/settings/alert-rules` | GET | `AlertRule[]` |
| `/settings/alert-rules/:id` | PATCH | `AlertRule` |
| `/settings/customer-visibility` | GET / PATCH | `CustomerVisibilityRules` |
| `/settings/data-retention` | GET / PATCH | `DataRetentionRules` |
| `/settings/feature-access` | GET / PATCH | `FeatureAccessConfig` |

### Prediction API

| Endpoint | Method | Returns |
|---|---|---|
| `/prediction/delay-risk/:tripId` | GET | `DelayRiskScore` |
| `/prediction/trips-at-risk` | GET | `DelayRiskScore[]` |
| `/prediction/eta/:tripId` | GET | `{ tripId, predictedEta }` |

### Audit Log API

| Endpoint | Method | Filters |
|---|---|---|
| `/audit-logs` | GET | `fromDate?`, `toDate?`, `user?`, `action?`, `entityType?`, `tripId?`, `vehicleNumber?` |
| `/audit-logs` | POST | `AuditLogInput` |

---

## 11. State Management

### Architecture: React Context (`TrackingStoreProvider`)

No Redux or Zustand. Single context provides full app state.

### Complete State Shape

```typescript
{
  // Data
  loading: boolean
  error: string | null
  activeTrips: TrackingTrip[]
  liveVehicles: TrackingTrip[]          // alias: same reference as activeTrips
  alerts: TrackingAlertRecord[]
  dashboardSummary: TrackingDashboardSummary | null
  events: TrackingEvent[]
  geofences: TrackingGeofence[]
  geofenceEvents: GeofenceEvent[]

  // Connection
  socketConnectionState: SocketConnectionState
  lastUpdatedAt: string | null

  // Selection
  selectedTripId?: string

  // Map filters
  liveMapFilters: {
    showActiveOnly: boolean
    showDelayedOnly: boolean
    showOfflineOnly: boolean
    showRouteDeviationOnly: boolean
    showFallbackOnly: boolean
  }

  // Methods
  setSelectedTripId(id?: string): void
  switchTripTrackingSource(tripId, deviceId, switchedBy): void
  refresh(): Promise<void>
  acknowledgeAlert(alertId, remarks?, acknowledgedBy?): Promise<void>
  resolveAlert(alertId, payload): Promise<void>
  assignAlert(alertId, payload): Promise<void>
  addRemark(alertId, remark): Promise<void>
  createGeofence(payload): Promise<void>
  updateGeofence(id, payload): Promise<void>
  deleteGeofence(id): Promise<void>
  toggleGeofenceStatus(id, isActive): Promise<void>
  filterAlerts(filters: TrackingAlertFilters): TrackingAlertRecord[]
}
```

### Key Store Functions Detail

**`switchTripTrackingSource(tripId, deviceId, switchedBy)`**
- Updates `activeTrackingDeviceId`
- Creates audit entry in `sourceSwitchAuditTrail[]`
- Updates `trackingDevices[]` statuses (Active/Standby)
- Re-hydrates trip using `trackingRules`

**`filterAlerts(filters)`**
- Filters by: `severity`, `status`, `type` (contains), `tripId` (contains), `vehicleNumber` (contains)

### Socket Store Pure Functions (`socketStore.ts`)

| Function | Handles Events |
|---|---|
| `applySocketEventToTrips()` | LocationUpdated, TripStatusChanged, ETAUpdated, VehicleOffline, VehicleOnline, RouteDeviationDetected, TripCompleted |
| `applySocketEventToAlerts()` | AlertRaised, AlertAcknowledged, AlertResolved, RouteDeviationDetected |
| `applySocketEventToTimeline()` | LocationUpdated, ETAUpdated, TripStatusChanged, GeofenceEntered/Exited, TripCompleted |
| `applySocketEventToGeofenceEvents()` | GeofenceEntered, GeofenceExited |

---

## 12. RBAC & Permission Matrix

### Permission Codes (8 total)

| Code | Purpose |
|---|---|
| `track_trace:read` | View all tracking data |
| `track_trace:write` | Modify trip/alert data |
| `track_trace:alerts:manage` | Acknowledge and resolve alerts |
| `track_trace:geofence:manage` | Create/edit/delete geofences |
| `track_trace:replay:view` | Access trip replay |
| `track_trace:customer_link:view` | View customer tracking links |
| `track_trace:analytics:view` | Access analytics pages |
| `track_trace:prediction:view` | Access delay prediction |

### Role → Permission Access

| Permission | platform-admin | tenant-admin | control-tower | fleet-operator | vendor | customer |
|---|---|---|---|---|---|---|
| `track_trace:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `track_trace:write` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `track_trace:alerts:manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `track_trace:geofence:manage` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `track_trace:replay:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `track_trace:customer_link:view` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `track_trace:analytics:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `track_trace:prediction:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Role → Plan → Feature Access

| Feature | Basic (customer) | Professional (fleet-op/vendor) | Enterprise (admin/control-tower) |
|---|---|---|---|
| `tracking.customerPreview` | ✅ | ✅ | ✅ |
| `tracking.geofences` | ❌ | ✅ | ✅ |
| `tracking.replay` | ❌ | ✅ | ✅ |
| `tracking.analytics` | ❌ | ❌ | ✅ |
| `tracking.routePerformance` | ❌ | ❌ | ✅ |
| `tracking.prediction` | ❌ | ❌ | ✅ |

### Role → Page Access (17 page keys)

| Page | control-tower / admin | fleet-operator | vendor | customer |
|---|---|---|---|---|
| dashboard | ✅ | ✅ | ✅ | ✅ |
| live-map | ✅ | ✅ | ✅ | ❌ |
| dispatch | ✅ | ✅ | ❌ | ❌ |
| alerts | ✅ | ✅ | ✅ | ❌ |
| geofences | ✅ | ✅ | ❌ | ❌ |
| route-performance | ✅ | ✅ | ❌ | ❌ |
| replay | ✅ | ✅ | ❌ | ❌ |
| customer-preview | ✅ | ❌ | ✅ | ✅ |
| analytics | ✅ | ✅ | ❌ | ❌ |
| shipments | ✅ | ✅ | ✅ | ✅ |
| vehicles | ✅ | ✅ | ✅ | ❌ |
| pod | ✅ | ❌ | ❌ | ✅ |
| control-tower | ✅ | ✅ | ❌ | ❌ |

---

## 13. Business Rules Catalog

| # | Rule | Implementation |
|---|---|---|
| BR-01 | Vehicle offline threshold | `vehicleOfflineThresholdMinutes` (TrackingRules settings) |
| BR-02 | Stale ping threshold | `stalePingThresholdMinutes` (TrackingRules settings) |
| BR-03 | Idle detection | `idleThresholdMinutes` (TrackingRules settings) |
| BR-04 | Overspeed threshold | `overspeedThresholdKmph` (settings, default 90 km/h) |
| BR-05 | Route deviation threshold | `routeDeviationThresholdMeters` (settings) |
| BR-06 | GPS accuracy filter | `gpsAccuracyThresholdMeters` (settings) |
| BR-07 | Preferred fallback source | DRIVER_APP / FASTAG / ANPR / MANUAL (settings) |
| BR-08 | Pickup grace period | `pickupGracePeriodMinutes` (SLA rules settings) |
| BR-09 | Delivery grace period | `deliveryGracePeriodMinutes` (SLA rules settings) |
| BR-10 | Detention threshold | `detentionThresholdMinutes` (SLA rules settings) |
| BR-11 | Geofence max radius | 5000 meters (hardcoded) |
| BR-12 | On-time definition | `delayMinutes ≤ 30` |
| BR-13 | Delay candidate (dashboard) | `delayMinutes > 0` OR status in [Delayed, Offline, Route Deviated] |
| BR-14 | In-transit count | status in [In Transit, At Checkpoint, Near Destination, Delayed, Route Deviated] |
| BR-15 | Idle vehicle count | status in [Idle, Stopped] |
| BR-16 | Offline vehicle count | `isOffline = true` |
| BR-17 | Efficiency score | `(plannedDistance / actualDistance) * 100` |
| BR-18 | High-delay corridor threshold | avgDelay > 90 minutes |
| BR-19 | Efficiency color: blue | score ≥ 110% |
| BR-20 | Efficiency color: emerald | score ≥ 95% |
| BR-21 | Efficiency color: amber | score < 95% |
| BR-22 | ETA confidence: High | delayMinutes ≤ 45 |
| BR-23 | ETA confidence: Medium | delayMinutes ≤ 120 |
| BR-24 | ETA confidence: Low | delayMinutes > 120 |
| BR-25 | Source health: Fallback | activeDevice ≠ PRIMARY OR activeSource ≠ primarySource |
| BR-26 | Source health: Stale | (now - lastUpdate) > stalePingThresholdMinutes |
| BR-27 | Geofence dwell alert | vehicle inside zone > `dwellAlertMinutes` |
| BR-28 | Alert cannot un-resolve | Once Resolved, Acknowledge action is blocked |
| BR-29 | Customer timeline max 5 events | Excludes 'Alert Raised', 'Stop Alert' event types |
| BR-30 | Map cluster minimum | Min 2 vehicles per cluster |
| BR-31 | Speed gauge max | 120 km/h |
| BR-32 | Driver phone → links to fleet module | `/fleet/drivers/:driverId` |
| BR-33 | Prediction risk score formula | `min(96, max(18, delay/3 + deviation*4 + offline?18:0 + idle/2))` |
| BR-34 | Lane ID derivation | `${origin.toLowerCase()}-${destination.toLowerCase()}` |

---

## 14. Dependency Matrix

| Feature | Component | API | Store | Permission | Upstream | Downstream |
|---|---|---|---|---|---|---|
| Live Dashboard | TrackTraceDashboard | `/dashboard-summary` | `dashboardSummary` | `track_trace:read` | TMS (trips), Fleet (vehicles) | — |
| Live Map | LiveMapPage | `/live-vehicles`, `/vehicles/:id/location` | `activeTrips` | `track_trace:read` | Telematics (GPS) | — |
| History Playback | HistoryPlaybackModal | `/trips/:id/locations` | local state | `track_trace:read` | Telematics history | — |
| Alert Management | TrackingAlertsPage | `/alerts`, `/alerts/:id/acknowledge`, etc. | `alerts` | `track_trace:alerts:manage` | All trips | Exception escalation |
| Synthetic Alerts | trackingHealth.ts | `TrackingRules`, `AlertRules` | `alerts` | — | TrackingRules settings | Alert list |
| Device Switching | TripDetailsPage | (in-store action) | `activeTrips` | `track_trace:write` | Tracking device master | Source health |
| Geofence CRUD | GeofenceFormPage | `/geofences` (CRUD) | `geofences` | `track_trace:geofence:manage` (Professional+) | — | Trip zone count |
| Geofence Events | GeofenceDetailPage | `/geofences` events | `geofenceEvents` | `track_trace:read` | Socket (GeofenceEntered/Exited) | Dwell alerts |
| Route Analytics | RoutePerformancePage | `/analytics/route-performance` | local state | `track_trace:analytics:view` (Enterprise) | TMS (bookings/trips) | — |
| Customer Preview | CustomerPreviewPage | `/trips/:id/customer-view` | local state | `track_trace:customer_link:view` (Basic+) | CustomerVisibilityRules | Customer notification |
| Notification Bell | TrackTraceLayout | — | `alerts` | `track_trace:read` | Alert store | — |
| Socket Connection | TrackingStore | WebSocket | `socketConnectionState` | — | Telematics provider | All real-time updates |
| Fallback Polling | TrackingStore | `/trips`, `/alerts`, etc. | All | — | — | Replaces socket when down |
| Delay Prediction | (not rendered) | `/prediction/delay-risk/:id` | — | `track_trace:prediction:view` (Enterprise) | Trip data | — |

---

## 15. Edge Cases

| Scenario | Handling |
|---|---|
| Trip not found | TripDetailsPage guard; EmptyPlaceholder shown |
| Socket disconnected | Fallback 15s polling activates; gray dot in header |
| Vehicle goes offline mid-trip | `VehicleOffline` event → status = Offline, `SYS-OFFLINE` alert generated |
| GPS source fails | `SYS-FALLBACK` alert, `TrackingDataHealthBanner` shows "Fallback" |
| Stale GPS ping | `SYS-STALE` alert after `stalePingThresholdMinutes` |
| Route deviation detected | `SYS-ROUTEDEV` alert, status = Route Deviated, deviation km updated |
| Alert already resolved | Acknowledge action blocked for Resolved alerts |
| Duplicate socket event | `applySocketEvent*` functions update by ID — idempotent overwrite |
| Geofence radius > 5000m | Validation blocks create/update |
| Plan gate (customer + geofences) | `canUseFeature('tracking.geofences') = false` → `FeatureAccessNotice` shown |
| Vendor accessing replay | `canAccessPage('replay') = false` → redirect |
| Zero active trips | Dashboard shows 0 KPIs; tables show empty state |
| Alert remark empty | "Add remark" button hidden until text entered |
| Map cluster with 1 vehicle | Cluster not formed (minimum 2) |
| No GPS coordinates for vehicle | Marker not shown on map |
| Customer preview with no POD | `podStatus = 'Pending'` shown |
| Concurrent alert action | No optimistic locking — last write wins (mock store) |
| Geofence delete with active trips | Confirmation modal shows count of affected trips |
| Speed > 120 km/h | Speed gauge shows 120 max (capped) |
| `delayMinutes = 0` | Shows "On time" in green; no delay badge |
| DeviceSwitch with Faulted device | Device button disabled, opacity 40% |

---

## 16. Hidden Features & Technical Debt

### Disabled / Stub Features

| Feature | Location | Status |
|---|---|---|
| Cancel Trip | TripDetailsPage header | Rendered but **DISABLED** |
| Dispatch Trip | TripDetailsPage header | Rendered but **DISABLED** |
| Start Trip | TripDetailsPage header | Rendered but **DISABLED** |
| Complete Trip | TripDetailsPage header | Rendered but **DISABLED** |
| Dispatch action (dispatch page) | DispatchPage row | **DISABLED** |
| Cancel action (dispatch page) | DispatchPage row | **DISABLED** |
| Edit action (dispatch page) | DispatchPage row | **DISABLED** |
| Delay prediction UI | (Enterprise plan) | API defined; no rendering found |
| Audit log viewer | Not in routes | API fully defined; no screen |

### Environment / Feature Flags

| Flag | Default | Effect |
|---|---|---|
| `VITE_USE_MOCK_TRACKING` | `'true'` | Switches all tracking APIs to in-memory mock |
| `VITE_TRACKING_API_BASE_URL` | `'/api/tracking'` | Real API base URL |
| `tracking.analytics` | Enterprise only | Hides analytics pages for lower plans |
| `tracking.routePerformance` | Enterprise only | Hides route performance |
| `tracking.prediction` | Enterprise only | Hides delay prediction |
| `tracking.geofences` | Professional+ | Hides geofence screens |
| `tracking.replay` | Professional+ | Hides replay route |
| `tracking.customerPreview` | All plans | Always visible |

### Technical Debt

| Item | Severity | Detail |
|---|---|---|
| **Entire module on mock data** | Critical | `VITE_USE_MOCK_TRACKING=true` — no real backend wired |
| **Trip action buttons all disabled** | High | Cancel/Dispatch/Start/Complete are core TMS operations — all stubs |
| **Dispatch/Cancel/Edit on DispatchPage disabled** | High | Core dispatch workflow not operational |
| **Geofence shape = Circle only** | Medium | `GeofenceShape = 'Circle'` hardcoded; polygon/corridor not implemented |
| **No optimistic locking on alerts** | Medium | Concurrent acknowledge/resolve silently overwrites |
| **`liveVehicles` = `activeTrips` (duplicate)** | Low | Same data stored under two keys — redundant |
| **Hardcoded Indian city fallbacks** | Low | Demo lat/lng for Pune, Mumbai, Delhi, etc. — should be removed |
| **Hardcoded region mapping** | Low | City → region table hardcoded in analyticsApi.ts |
| **Audit log in-memory only** | Low | No persistence across page reload in mock mode |
| **Google Maps API key required** | Low | LiveMapPage fails silently without `VITE_GOOGLE_MAPS_API_KEY` |
| **`laneId` derivation fragile** | Low | `${origin}-${destination}` slug collides with city name variants |

---

## 17. Missing Features Report

| # | Feature | Priority | Detail |
|---|---|---|---|
| MF-01 | Real backend API | Critical | Entire module on mock — no HTTP integration |
| MF-02 | Cancel / Dispatch / Start / Complete trip actions | Critical | All buttons exist but disabled |
| MF-03 | Dispatch / Cancel / Edit on DispatchPage | High | Core dispatch workflow not usable |
| MF-04 | Delay prediction UI | High | API + types fully defined; no screen renders them |
| MF-05 | Audit log viewer screen | High | `auditLogApi.ts` fully defined; no route exists |
| MF-06 | POD management | High | `/pod` redirects to `/alerts`; no POD capture UI |
| MF-07 | SLA monitoring screen | High | SLA API + types defined; no dedicated screen |
| MF-08 | Driver behavior analytics screen | Medium | `DriverBehaviorScore` type + API defined; no route |
| MF-09 | Vehicle utilization screen | Medium | API defined; no screen |
| MF-10 | Polygon / corridor geofence shape | Medium | Only Circle supported |
| MF-11 | Bulk trip actions | Medium | No bulk dispatch, cancel, or assign |
| MF-12 | Export / reporting | Medium | No export anywhere in module |
| MF-13 | Alert notification (email/SMS) | Medium | `channels` field in AlertRule (InApp/Email/SMS/WhatsApp/Push) — not wired |
| MF-14 | Settings management UI screen | Medium | Full settings API defined; no settings page in routes |
| MF-15 | Real-time SOS handling | Low | `sosCount` in DriverBehaviorScore; no SOS UI |
| MF-16 | Reverse logistics tracking | Low | Not found |
| MF-17 | Billing trigger from trip completion | Low | Not found in module |
| MF-18 | Geofence import / bulk create | Low | No bulk import for zones |
| MF-19 | Route playback speed control | Low | TripReplayPage has speed slider but UI completeness unclear |
| MF-20 | Region distribution analytics screen | Low | API defined (`/analytics/region-distribution`); no screen |

---

## 18. Complete Type & Enum Reference

### Trip / Status Enums

| Enum | Values |
|---|---|
| `TrackingStatus` (17) | Scheduled, Assigned, At Pickup, Loading, In Transit, At Checkpoint, Near Destination, At Destination, Unloading, Completed, Delayed, Idle, Stopped, Offline, Route Deviated, Cancelled |
| `TrackingSource` (5) | DRIVER_APP, GPS_DEVICE, FASTAG, ANPR, MANUAL |
| `EtaConfidence` | Low, Medium, High |
| `DelayReason` | Traffic, Vehicle Idle, Route Deviation, Checkpoint Delay, Loading Delay, Unloading Delay, GPS Missing, Unknown |
| `CheckpointStatus` | Pending, Reached, Missed |
| `TripStatus` (Dispatch) | Planned, Dispatched, In Transit, Completed, Cancelled |

### Alert Enums

| Enum | Values |
|---|---|
| `AlertSeverity` | Low, Medium, High, Critical |
| `AlertStatus` | Open, Acknowledged, Resolved |

### Geofence Enums

| Enum | Values |
|---|---|
| `GeofenceType` (8) | Pickup, Drop, Warehouse, Yard, Customer Site, Checkpoint, Restricted Zone, Custom |
| `GeofenceShape` | Circle (only) |
| `LinkedEntityType` | TRIP, BOOKING, CUSTOMER, WAREHOUSE, CHECKPOINT, YARD, CUSTOM |

### Access Control Enums

| Enum | Values |
|---|---|
| `TrackTraceRole` (6) | platform-admin, tenant-admin, control-tower, fleet-operator, vendor, customer |
| `TrackTracePlan` | Basic, Professional, Enterprise |
| `TrackTracePermission` (8) | track_trace:read, track_trace:write, track_trace:alerts:manage, track_trace:geofence:manage, track_trace:replay:view, track_trace:customer_link:view, track_trace:analytics:view, track_trace:prediction:view |
| `TrackTraceFeatureKey` (6) | tracking.analytics, tracking.routePerformance, tracking.prediction, tracking.geofences, tracking.replay, tracking.customerPreview |
| `TrackTracePageKey` (17) | dashboard, shipments, shipment-detail, replay, customer-preview, analytics, route-performance, vehicles, vehicle-detail, live-map, route-progress, exceptions, alerts, pod, control-tower, geofences, dispatch |

### Tracking Device Enums

| Enum | Values |
|---|---|
| `TrackingDeviceRole` | PRIMARY, SECONDARY, DRIVER_APP |
| `TrackingDeviceStatus` | Active, Standby, Unavailable, Faulted |

### Analytics Enums

| Enum | Values |
|---|---|
| `SlaStatus` | On Track, At Risk, Breached, Recovered, Not Applicable |
| `DelayRiskLevel` | Low, Medium, High, Critical |

### Socket Event Types (12)

| Event | Payload Fields |
|---|---|
| `LocationUpdated` | tripId, location, regionLabel |
| `TripStatusChanged` | tripId, status, changedAt |
| `ETAUpdated` | tripId, currentEta, delayMinutes, etaConfidence, delayReason, updatedAt |
| `AlertRaised` | tripId, alertId, severity, message, alertType, createdAt, location, vehicleNumber |
| `AlertAcknowledged` | tripId, alertId, acknowledgedBy, updatedAt |
| `AlertResolved` | tripId, alertId, resolvedBy, resolutionNote, updatedAt |
| `VehicleOffline` | tripId, vehicleNumber, updatedAt |
| `VehicleOnline` | tripId, vehicleNumber, updatedAt |
| `RouteDeviationDetected` | tripId, deviationDistanceKm, latitude, longitude, severity, detectedAt |
| `GeofenceEntered` | tripId, geofenceId, geofenceName, latitude, longitude, eventTime |
| `GeofenceExited` | tripId, geofenceId, geofenceName, latitude, longitude, eventTime |
| `TripCompleted` | tripId, completedAt |

### Socket Connection States

`Connecting` | `Connected` | `Disconnected` | `Reconnecting` | `Failed`

### Tracking Rules Config Fields

| Field | Purpose |
|---|---|
| `locationUpdateFrequencySeconds` | How often location is updated |
| `vehicleOfflineThresholdMinutes` | Time with no ping = Offline |
| `stalePingThresholdMinutes` | Time = Stale (warn before Offline) |
| `idleThresholdMinutes` | Idle detection threshold |
| `overspeedThresholdKmph` | Speed alert trigger |
| `routeDeviationThresholdMeters` | Deviation alert trigger |
| `gpsAccuracyThresholdMeters` | Discard inaccurate GPS |
| `preferredFallbackSource` | DRIVER_APP / FASTAG / ANPR / MANUAL |

### SLA Rules Config Fields

| Field | Purpose |
|---|---|
| `pickupGracePeriodMinutes` | Pickup tolerance window |
| `deliveryGracePeriodMinutes` | Delivery tolerance window |
| `checkpointGracePeriodMinutes` | Checkpoint tolerance |
| `detentionThresholdMinutes` | Detention alert trigger |
| `idleThresholdMinutes` | Idle alert trigger |
| `routeDeviationThresholdMeters` | Deviation SLA trigger |

### Data Retention Config Fields

| Field | Purpose |
|---|---|
| `liveLocationRetentionDays` | Live GPS history retention |
| `tripHistoryRetentionDays` | Trip archive retention |
| `alertHistoryRetentionDays` | Alert archive retention |
| `replayHistoryRetentionDays` | Replay data retention |
| `auditLogRetentionDays` | Audit trail retention |

### Feature Access Config (Plan-tier)

| Field | Plans where enabled |
|---|---|
| `trackingAnalytics` | Enterprise |
| `slaMonitoring` | Enterprise |
| `routePerformance` | Enterprise |
| `driverBehavior` | Enterprise |
| `reports` | Enterprise |
| `reportsExport` | Enterprise |
| `predictiveDelay` | Enterprise |
| `auditLogs` | Enterprise |
| `advancedCustomerVisibility` | Enterprise |

---

*End of Track-Trace-Web Module Deep Code Review — Reverse-engineered from full source scan of `/modules/track-trace-web/`*
