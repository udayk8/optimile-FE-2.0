# Track and Trace — Phased Implementation Plan

Based on the full code-level UI/UX review across all 5 submodules.

Each task includes: the exact file to change, what to change, and an effort estimate.  
Effort is rated: **XS** (< 30 min) · **S** (30–90 min) · **M** (2–4 hrs) · **L** (4–8 hrs) · **XL** (> 1 day)

---

## Phase 1 — Critical Bug Fixes

> These must ship before V2 is used in production. Both are silent behavioral defects.

---

### Task 1.1 — Fix Active Trips V2 row-slice bug

**File:** `src/components/ActiveTripsTable.tsx`  
**File:** `src/pages/ActiveTripsPage.tsx`  
**File:** `src/pages/TrackTraceDashboard.tsx`

**Problem:**  
`const rows = compact ? trips.slice(0, 5) : trips` — the `compact` prop controls both the mobile-card layout AND a 5-row slice. `ActiveTripsPage` passes `compact={version === 'v2'}`, so V2 shows only 5 trips on the main queue page.

**Change in `ActiveTripsTable.tsx`:**
```tsx
// Replace prop interface
type Props = {
  trips: TrackingTrip[]
  showMobileCards?: boolean  // was: compact
  previewMode?: boolean       // NEW: controls row slicing
  tripBasePath: string
  selectedTripId?: string
  onSelectTrip?: (tripId: string) => void
}

// Replace row slice
const rows = previewMode ? trips.slice(0, 5) : trips

// Replace compact reference inside the component with showMobileCards
// The "if (compact)" branch becomes "if (showMobileCards)"
```

**Change in `ActiveTripsPage.tsx`:**
```tsx
// Before
<ActiveTripsTable compact={version === 'v2'} trips={filteredTrips} ... />

// After
<ActiveTripsTable showMobileCards trips={filteredTrips} ... />
```

**Change in `TrackTraceDashboard.tsx`:**
```tsx
// Before (both usages)
<ActiveTripsTable compact trips={activeTripRows} ... />

// After
<ActiveTripsTable showMobileCards previewMode trips={activeTripRows} ... />
```

**Effort:** S

---

## Phase 2 — High-Impact Quick Wins

> Each task is XS–S effort. All fix obvious false affordances, broken interactions, or missing sticky behaviors.

---

### Task 2.1 — Make dashboard operator action cards interactive

**File:** `src/pages/TrackTraceDashboard.tsx`

**Problem:** "Escalate exceptions" and "Inspect active trips" blocks look like buttons but have no click behavior.

**Change:** Wrap each `<div className="flex items-center gap-3">` block in a `<Link>`:
```tsx
import { Link } from 'react-router-dom'

// Escalate exceptions block
<Link
  to={scopedPath('/alerts')}
  className="block rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:bg-gray-100"
>
  <div className="flex items-center gap-3">
    {/* existing content unchanged */}
  </div>
</Link>

// Inspect active trips block
<Link
  to={scopedPath('/trips')}
  className="block rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:bg-gray-100"
>
  <div className="flex items-center gap-3">
    {/* existing content unchanged */}
  </div>
</Link>
```

**Effort:** XS

---

### Task 2.2 — Make alert severity count pills navigable

**File:** `src/pages/TrackTraceDashboard.tsx`  
**File:** `src/pages/TrackingAlertsPage.tsx`

**Problem:** Severity count chips (`<span>`) look interactive but navigate nowhere.

**Dashboard change** (in V2 alert highlights section):
```tsx
// Before
<span className="rounded-full bg-danger px-3 py-1 text-white">
  {alertSeverityCounts.Critical} critical
</span>

// After — make each a Link
<Link
  to={scopedPath('/alerts')}
  className="rounded-full bg-danger px-3 py-1 text-white text-xs font-semibold hover:opacity-90 transition"
>
  {alertSeverityCounts.Critical} critical
</Link>
```

**Alerts page change** (severity count pills in V2 sticky toolbar):
```tsx
// Before (plain spans)
<span className="rounded-full bg-danger px-3 py-1 text-white">
  {severityCounts.Critical} critical
</span>

// After (buttons that set the severity filter)
<button
  className={`rounded-full px-3 py-1 text-xs font-semibold transition
    ${severity === 'Critical' ? 'bg-danger text-white ring-2 ring-danger/30' : 'bg-danger/10 text-danger'}`}
  onClick={() => setSeverity(severity === 'Critical' ? 'All' : 'Critical')}
>
  {severityCounts.Critical} critical
</button>
```
Repeat for High, Medium, Low.

**Effort:** S

---

### Task 2.3 — Make Live Map filter panel sticky

**File:** `src/pages/LiveMapPage.tsx`

**Problem:** Filter card uses `className="p-5"` — scrolls away on the map page.

**Change:**
```tsx
// Before
<Card className="p-5">
  <div className="flex flex-wrap items-center gap-3">

// After
<Card className={trackTraceV2StickyPanelClassName}>
  <div className="flex flex-wrap items-center gap-3">
```

Add the import at the top:
```tsx
import { trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
```

**Effort:** XS

---

### Task 2.4 — Add "clear all" to Live Map filters

**File:** `src/pages/LiveMapPage.tsx`

**Add after the last filter button:**
```tsx
{(showDelayedOnly || showOfflineOnly || showRouteDeviationOnly || showFallbackOnly) && (
  <Button
    size="sm"
    variant="ghost"
    onClick={() => {
      setShowDelayedOnly(false)
      setShowOfflineOnly(false)
      setShowRouteDeviationOnly(false)
      setShowFallbackOnly(false)
    }}
  >
    Reset filters
  </Button>
)}
```

**Effort:** XS

---

### Task 2.5 — Remove duplicate primary CTA in Trip Detail hero

**File:** `src/pages/TripDetailsPage.tsx`

**Problem:** The computed `primaryAction` is promoted as the main button, then the same destination appears again as a secondary outline button.

**Change in the V2 hero action block:**
```tsx
// Before: shows all four buttons regardless
<Button asChild>
  <Link to={primaryAction.to}>{primaryAction.label}</Link>
</Button>
<Button asChild variant="outline">
  <Link to={scopedPath('/live-map')}>Open live map</Link>
</Button>
<Button asChild variant="outline">
  <Link to={scopedPath(`/trips/${trip.id}/replay`)}>Replay trip</Link>
</Button>
<Button asChild variant="outline">
  <Link to={scopedPath(`/customer-preview/${trip.id}`)}>Customer preview</Link>
</Button>

// After: suppress the secondary button that duplicates primaryAction
<Button asChild>
  <Link to={primaryAction.to}>{primaryAction.label}</Link>
</Button>
{primaryAction.to !== scopedPath('/live-map') && (
  <Button asChild variant="outline">
    <Link to={scopedPath('/live-map')}>Open live map</Link>
  </Button>
)}
{primaryAction.to !== scopedPath(`/trips/${trip.id}/replay`) && (
  <Button asChild variant="outline">
    <Link to={scopedPath(`/trips/${trip.id}/replay`)}>Replay trip</Link>
  </Button>
)}
{primaryAction.to !== scopedPath(`/customer-preview/${trip.id}`) && (
  <Button asChild variant="outline">
    <Link to={scopedPath(`/customer-preview/${trip.id}`)}>Customer preview</Link>
  </Button>
)}
```

**Effort:** XS

---

### Task 2.6 — Collapse dashboard workspace health section into the health banner

**File:** `src/pages/TrackTraceDashboard.tsx`  
**File:** `src/components/TrackingDataHealthBanner.tsx`

**Problem:** The "Workspace health" section (3 cards: stream state, geofence events, last refreshed) duplicates the health banner directly above it.

**Change in `TrackTraceDashboard.tsx`:** Delete the entire `<section>` block for "Workspace health" (the one containing `healthItems.map(...)`).

**Change in `TrackingDataHealthBanner.tsx`:** Add geofence event count and last refresh time as a compact third slot in the banner:
```tsx
// Extend the props
export function TrackingDataHealthBanner({
  socketConnectionState,
  lastUpdatedAt,
  geofenceEventCount,  // NEW optional prop
}: {
  socketConnectionState: SocketConnectionState
  lastUpdatedAt?: string | null
  geofenceEventCount?: number  // NEW
}) {
  // Add a third compact chip if geofenceEventCount is provided
}
```

**OR simpler approach:** Just delete the workspace health section. The banner already covers connection and freshness. Geofence count is low-signal data for the dashboard.

**Effort:** XS (delete) / S (merge into banner)

---

### Task 2.8 — Compress Active Trips summary cards into an inline status bar

**File:** `src/pages/ActiveTripsPage.tsx`

**Problem:** Three large summary cards add ~160px above the filter before the trip list.

**Change:** Replace the `<div className="grid gap-4 md:grid-cols-3">` card section with a compact status strip inside the filter card:

```tsx
// Remove the three-card grid entirely

// Inside the filter Card, add this above the filter inputs:
<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
  <span className="font-semibold text-text">{filteredTrips.length} trips in queue</span>
  <span className="text-gray-400">·</span>
  <span className={socketConnectionState === 'Connected' ? 'text-success font-medium' : 'text-warning font-medium'}>
    {socketConnectionState}
  </span>
  <span className="text-gray-400">·</span>
  <span className="text-gray-600">
    Updated {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString('en-IN') : 'not available'}
  </span>
</div>
```

**Effort:** S

---

## Phase 3 — Pagination and Scale

> Prevents performance degradation and scroll fatigue as data volumes grow.

---

### Task 3.1 — Paginate Active Trips table

**File:** `src/pages/ActiveTripsPage.tsx`

**Add pagination state:**
```tsx
const [page, setPage] = useState(1)
const pageSize = 20

// Reset to page 1 when filters change
useEffect(() => { setPage(1) }, [search, status, delayFilter])

const paginatedTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize)
const totalPages = Math.ceil(filteredTrips.length / pageSize)
```

**Pass `paginatedTrips` instead of `filteredTrips`:**
```tsx
<ActiveTripsTable showMobileCards trips={paginatedTrips} ... />
```

**Add pagination strip below the table card:**
```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
    <p className="text-sm text-gray-600">
      Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredTrips.length)} of {filteredTrips.length} trips
    </p>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
      <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
    </div>
  </div>
)}
```

**Effort:** S

---

### Task 3.2 — Paginate Alerts list

**File:** `src/pages/TrackingAlertsPage.tsx`

Same pattern as Task 3.1. Page size: 16 (pairs well with the xl:grid-cols-2 layout = 8 rows per column).

```tsx
const [page, setPage] = useState(1)
const pageSize = 16
useEffect(() => { setPage(1) }, [search, severity, status, sortBy])
const paginatedAlerts = filteredAlerts.slice((page - 1) * pageSize, page * pageSize)
const totalPages = Math.ceil(filteredAlerts.length / pageSize)
```

Replace `filteredAlerts.map(...)` with `paginatedAlerts.map(...)` and add pagination strip below the grid.

**Effort:** S

---

### Task 3.4 — Paginate Geofence list

**File:** `src/pages/GeofenceManagementPage.tsx`

Page size: 25.

```tsx
const [page, setPage] = useState(1)
const pageSize = 25
useEffect(() => { setPage(1) }, [search, typeFilter, statusFilter])
const paginatedGeofences = filteredGeofences.slice((page - 1) * pageSize, page * pageSize)
```

Pass `paginatedGeofences` to `<GeofenceList>`. Add pagination strip.

**Effort:** S

---

## Phase 5 — Geofence Workspace Improvements

---

### Task 5.1 — Collapse geofence form behind a "Create" CTA

**File:** `src/pages/GeofenceManagementPage.tsx`

**Add state:**
```tsx
const [showForm, setShowForm] = useState(false)
```

**Modify the edit handler to show the form:**
```tsx
onEdit={(geofence) => {
  setEditing(geofence)
  setDraft({ ...geofence })
  setShowForm(true)         // ADD
  window.scrollTo({ top: 0, behavior: 'smooth' })  // ADD: scroll to form
}}
```

**Modify cancel to hide the form:**
```tsx
onCancel={() => {
  setEditing(null)
  setDraft(initialDraft)
  setShowForm(false)         // ADD
}}
```

**Add "New geofence" button in the sticky filter bar:**
```tsx
<Card className={trackTraceV2StickyPanelClassName}>
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 flex-1">
      {/* existing filter inputs */}
    </div>
    <Button
      size="sm"
      onClick={() => { setEditing(null); setDraft(initialDraft); setShowForm(true) }}
    >
      {showForm && !editing ? 'Creating new zone' : 'New geofence'}
    </Button>
  </div>
</Card>
```

**Wrap `<GeofenceForm>` in a conditional:**
```tsx
{showForm && (
  <GeofenceForm ... />
)}
```

**Effort:** S

---

### Task 5.2 — Add delete confirmation to geofences

**File:** `src/pages/GeofenceManagementPage.tsx`  
**File:** `src/components/GeofenceList.tsx`

**Add confirm state in page:**
```tsx
const [pendingDelete, setPendingDelete] = useState<TrackingGeofence | null>(null)
```

**Change the `onDelete` prop flow:** Instead of calling `deleteGeofence` directly in `GeofenceList`, emit the geofence to the parent for confirmation.

**In the page, add confirm dialog:**
```tsx
{pendingDelete && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="mx-4 w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
      <h3 className="text-lg font-bold text-text">Delete {pendingDelete.name}?</h3>
      <p className="mt-2 text-sm text-gray-600">
        This will stop triggering geofence events for linked trips and vehicles. This action cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
        <Button
          variant="destructive"
          onClick={() => {
            void deleteGeofence(pendingDelete.id)
            setPendingDelete(null)
          }}
        >
          Delete geofence
        </Button>
      </div>
    </div>
  </div>
)}
```

**Update the `onDelete` call:**
```tsx
<GeofenceList
  geofences={paginatedGeofences}
  onDelete={(geofence) => setPendingDelete(geofence)}   // changed
  ...
/>
```

**Effort:** S

---

### Task 5.3 — Add spatial mini-map preview to geofence form

**File:** `src/components/GeofenceForm.tsx`

This requires a map library. If Leaflet or Mapbox is already a project dependency, embed a small map tile. If not, use a static map approach.

**Minimal approach using a static tile URL:**
```tsx
// Add below the coordinate inputs in GeofenceForm
const previewUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${draft.latitude},${draft.longitude}&zoom=14&size=600x200&markers=${draft.latitude},${draft.longitude},red`

<div className="mt-4">
  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Zone preview</p>
  <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
    <img
      alt="Geofence zone preview"
      className="h-40 w-full object-cover"
      src={previewUrl}
    />
  </div>
  <p className="mt-1 text-xs text-gray-500">
    Center: {draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)} · Radius: {draft.radiusMeters}m
  </p>
</div>
```

**Note:** For production, replace the static tile with a proper Leaflet instance with a `L.circle()` drawn at the radius. The static tile approach is zero-dependency and can ship immediately.

**Effort:** S (static tile) / M (Leaflet interactive)

---

## Phase 6 — Intelligence Differentiation

> Highest structural effort. Gives each analytics page a purpose-built layout.

---

### Task 6.1 — Add shared IntelligenceToolbar with date range

**Create:** `src/components/analytics/IntelligenceToolbar.tsx`

```tsx
export function IntelligenceToolbar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  title,
  recordCount,
}: {
  fromDate: string
  toDate: string
  onFromDateChange: (date: string) => void
  onToDateChange: (date: string) => void
  title: string
  recordCount?: number
}) {
  return (
    <Card className={trackTraceV2StickyPanelClassName}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className={trackTraceV2EyebrowClassName}>Analysis scope</p>
          <p className="mt-1 text-sm font-semibold text-text">{title}{recordCount !== undefined ? ` · ${recordCount} records` : ''}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">From</span>
            <input
              className="mt-1 h-10 rounded-lg border border-gray-300 px-3 text-sm"
              onChange={(e) => onFromDateChange(e.target.value)}
              type="date"
              value={fromDate}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">To</span>
            <input
              className="mt-1 h-10 rounded-lg border border-gray-300 px-3 text-sm"
              onChange={(e) => onToDateChange(e.target.value)}
              type="date"
              value={toDate}
            />
          </label>
          {(fromDate || toDate) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { onFromDateChange(''); onToDateChange('') }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
```

Add `<IntelligenceToolbar>` to all four intelligence pages below the PageHero.

**Effort:** M (toolbar) + S per page (4 pages = M total)

---

### Task 6.2 — Add responsive card mode to Route Performance and Driver Behavior tables

**Files:**
- `src/pages/RoutePerformancePage.tsx`
- `src/pages/DriverBehaviorPage.tsx`

For each page, add `mobileCardRender` to the `DataTable`. Adapt field names per page. Effort is per-page.

**Effort:** S per page × 2 pages = M total

---

### Task 6.3 — Reorder Analytics page: exceptions above chart cards

**File:** `src/pages/TrackingAnalyticsPage.tsx`

Move the exception analytics `<DataTable>` section to appear directly after the `<MetricGrid>` (KPI strip), before the chart cards.

This is a JSX reorder — no logic changes required.

**Effort:** XS

---

### Task 6.4 — Add operational CTAs from Intelligence pages

**Files:** RoutePerformancePage, DriverBehaviorPage, TrackingAnalyticsPage

**Analytics page — add above-the-fold CTA after MetricGrid:**
```tsx
<div className="flex flex-wrap gap-2">
  <Button asChild size="sm" variant="outline">
    <Link to={scopedPath('/alerts?severity=Critical')}>Open critical alerts</Link>
  </Button>
  <Button asChild size="sm" variant="outline">
    <Link to={scopedPath('/trips?delay=Delayed')}>View delayed trips</Link>
  </Button>
</div>
```

**SLA page — add "View trip" link column to DataTable:**
```tsx
{
  key: 'action',
  header: '',
  render: (row) => row.tripId ? (
    <Button asChild size="sm" variant="ghost">
      <Link to={scopedPath(`/trips/${row.tripId}`)}>View trip</Link>
    </Button>
  ) : null,
}
```

**Driver Behavior — add "View trip history" per driver row** (links to Active Trips with driver filter if supported).

**Effort:** S per page × 4 pages = M total

---

### Task 6.5 — Driver Behavior: add "Needs attention" group above full table

**File:** `src/pages/DriverBehaviorPage.tsx`

```tsx
// Derive at-risk drivers (bottom quartile or explicit threshold)
const atRiskDrivers = driverRows.filter(
  (d) => d.onTimeRate < 70 || d.overspeedIncidents > 3 || d.gpsCompliance < 80
)

// Render above the full table if atRiskDrivers.length > 0:
{atRiskDrivers.length > 0 && (
  <section className="space-y-3">
    <div>
      <p className={trackTraceV2EyebrowClassName} style={{color: 'var(--danger)'}}>Needs attention</p>
      <h2 className="mt-1 text-lg font-extrabold text-text">
        {atRiskDrivers.length} driver{atRiskDrivers.length > 1 ? 's' : ''} below performance threshold
      </h2>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {atRiskDrivers.map((driver) => (
        <Card key={driver.id} className="p-4">
          <p className="font-bold text-text">{driver.driverName}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">{driver.onTimeRate}% on-time</span>
            {driver.overspeedIncidents > 3 && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">{driver.overspeedIncidents} overspeed</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  </section>
)}
```

**Effort:** M

---

## Phase 7 — Live Map Filter State Persistence

---

### Task 7.1 — Persist Live Map filter state in tracking store

**File:** `src/store/trackingStore.tsx`

**Add to store state:**
```tsx
liveMapFilters: {
  showActiveOnly: true,
  showDelayedOnly: false,
  showOfflineOnly: false,
  showRouteDeviationOnly: false,
  showFallbackOnly: false,
}
setLiveMapFilters: (filters: Partial<typeof initialLiveMapFilters>) => void
```

**File:** `src/pages/LiveMapPage.tsx`

**Replace local `useState` for each filter with store values:**
```tsx
const { liveMapFilters, setLiveMapFilters } = useTrackingStore()
const { showActiveOnly, showDelayedOnly, showOfflineOnly, showRouteDeviationOnly, showFallbackOnly } = liveMapFilters
```

**Replace `setShowActiveOnly((v) => !v)` etc. with:**
```tsx
onClick={() => setLiveMapFilters({ showDelayedOnly: !showDelayedOnly })}
```

**Effort:** M

---

## Phase 8 — Trip Replay and Customer Preview V2 Treatment

---

### Task 8.1 — Add V2 sticky playback control bar to Trip Replay

**File:** `src/pages/TripReplayPage.tsx`  
**File:** `src/components/ReplayTimeline.tsx`

**Add a sticky status bar at the top of the replay page:**
```tsx
{version === 'v2' && (
  <Card className={trackTraceV2CompactStickyPanelClassName}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className={trackTraceV2EyebrowClassName}>Trip replay</p>
        <p className="mt-1 text-sm text-gray-600">
          {timeline.length} events · {trip.origin} → {trip.destination}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
          Duration: {replayDuration}
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
          Step {currentStep} of {timeline.length}
        </span>
      </div>
    </div>
  </Card>
)}
```

**Effort:** M

---

### Task 8.2 — Add share-safe framing to Customer Preview

**File:** `src/pages/CustomerTrackingPreviewPage.tsx`

**Add a framing strip above the customer card:**
```tsx
{version === 'v2' && (
  <Card className="border-primary/20 bg-primary/5 p-5">
    <p className={trackTraceV2EyebrowClassName}>Customer-safe view</p>
    <h2 className="mt-2 text-lg font-extrabold text-text">What the customer can see</h2>
    <p className="mt-2 text-sm leading-6 text-gray-600">
      This view intentionally hides: driver mobile number, internal route deviation details,
      tracking source and fallback state, delay reason codes, and SLA breach flags.
      Only the movement summary and ETA visible to the customer is shown below.
    </p>
  </Card>
)}
```

**Effort:** S

---

## Phase 9 — Skeleton Loading States

---

### Task 9.1 — Dashboard skeleton for V2 KPI strip and trips section

**File:** Create `src/components/DashboardSkeleton.tsx`

```tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-28 rounded-3xl bg-gray-100" />
      {/* Control tower 2-col */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="h-32 rounded-3xl bg-gray-100" />
        <div className="h-32 rounded-3xl bg-gray-100" />
      </div>
      {/* Health banner */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-20 rounded-2xl bg-gray-100" />
        <div className="h-20 rounded-2xl bg-gray-100" />
      </div>
      {/* Urgent KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-gray-100" />
        ))}
      </div>
      {/* Supporting KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      {/* Main workspace */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="h-64 rounded-3xl bg-gray-100" />
        <div className="space-y-4">
          <div className="h-40 rounded-3xl bg-gray-100" />
          <div className="h-40 rounded-3xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

**Use it in `TrackTraceDashboard.tsx`:**
```tsx
if (loading) return <DashboardSkeleton />
```

**Effort:** S

---

## Summary Table

| Phase | Tasks | Total Effort | Business Value |
|-------|-------|-------------|----------------|
| 1 — Critical Bug Fixes | 1.1, 1.2 | S + S = **M** | Blocks V2 production use |
| 2 — Quick Wins | 2.1–2.8 | ~8 × XS/S = **M** | High visibility, minimal risk |
| 3 — Pagination | 3.1–3.4 | 4 × S = **M** | Scale and performance safety |
| 4 — Controls Polish | 4.1–4.6 | M + XS + S + S + S + S = **L** | Governance trust |
| 5 — Geofence Workspace | 5.1–5.3 | S + S + S = **M** | Operations UX lift |
| 6 — Intelligence Differentiation | 6.1–6.5 | M+M+XS+M+M = **L** | Analytics maturity |
| 7 — Map Filter Persistence | 7.1 | **M** | Operational continuity |
| 8 — Replay + Preview V2 | 8.1–8.2 | M + S = **M** | V2 consistency |
| 9 — Skeleton Loading | 9.1 | **S** | Perceived performance |

**Total estimated effort: ~4–5 developer days for all phases.**

---

## Starting Point Recommendation

Start with **Phase 1 → Phase 2 → Phase 3** in that order.

- Phase 1 fixes bugs that make V2 actively wrong.
- Phase 2 fixes false affordances and missing stickiness — all are under 30 minutes each.
- Phase 3 adds pagination — prevents the scale degradation that Phase 1's fix will expose.

These three phases together take approximately **1.5 developer days** and bring the product to a production-safe, operationally polished state before tackling the larger intelligence and governance improvements.
> Archive note: this implementation plan contains historical tasks written during the earlier versioned workspace phase. Any `V1`/`V2` references below are retained as implementation history.
