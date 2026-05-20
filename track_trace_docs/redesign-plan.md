# Track and Trace — SaaS Rules Compliance Redesign Plan

## Audit Summary

Every violation found below breaks one or more of the defined SaaS rules.
The rule is quoted, the exact violation is named, and the fix is specified.

---

## Full Violation Register

| # | Rule Broken | What the Rule Says | Current Violation | Files Affected |
|---|-------------|-------------------|-------------------|----------------|
| V1 | Typography: min 12px | Never use below 12px | `text-[11px]` used 38 times | 8 files |
| V2 | Typography: 3 sizes only | xs/sm/base for body | `tracking-[0.24em]` custom value (23 uses) | 6+ files |
| V3 | Layout: sidebar 240px max | 240px open, 64px collapsed | `lg:w-72` = 288px (+48px over limit) | layout.tsx |
| V4 | Layout: top bar 48–56px | Must be 48–56px | `h-16` = 64px (+8px over limit) | layout.tsx |
| V5 | Layout: sticky panels clear header | Panels must not hide under header | `sticky top-4` (16px) but header is 64px → panels scroll behind header | trackTraceV2Chrome.ts |
| V6 | Layout: max-w content cap | Cap at max-w-screen-2xl on ultrawide | No max-width on content area | layout.tsx |
| V7 | Dashboard: max 4 KPIs above fold | 4 max above the fold | V2 dashboard shows 8 KPIs above fold (4 critical + 4 network) | TrackTraceDashboard.tsx |
| V8 | Dashboard: max 8 KPIs total | 8 max total on one page | V1 dashboard shows 11 KPI cards (8 summary + 3 health cards) | TrackTraceDashboard.tsx |
| V9 | Sub-pages: max 4 grid columns | Never more than 4 columns in a grid | `xl:grid-cols-6` on V1 TripDetailsPage | TripDetailsPage.tsx |
| V10 | Colors: 6 semantic only | Use only 6 named semantic colors | `bg-gray-700 text-white` for Low severity — not a semantic color | AlertCard, AlerPage, Dashboard |
| V11 | Colors: tonal variants for bg | Use `bg-danger/10 text-danger`, not solid | `bg-gray-100 text-gray-600` hardcoded for secondary tags | 15+ files |
| V12 | Shadows: cards use border only | No shadow on cards | `shadow-sm` on KPI cards (TrackingSummaryCards), EmptyPlaceholder | 3 files |
| V13 | Empty states: 3 required elements | Title + subtitle + CTA | EmptyPlaceholder has no CTA prop — 0 empty states have actionable button | EmptyPlaceholder.tsx + all 15 pages |
| V14 | Loading: layout skeleton on first load | Full-page first load = skeleton | 14/15 pages use text-only EmptyPlaceholder for loading | 14 pages |
| V15 | Navigation: breadcrumbs on Level 3+ | Use breadcrumbs on pages 3+ deep | No breadcrumbs on TripDetail (L3), TripReplay (L4), CustomerPreview (L3) | 3 pages |
| V16 | Border radius: one consistent scale | Pick one scale, apply everywhere | `rounded-3xl` for outer cards, `rounded-2xl` for sub-cards, `rounded-xl` for inner — 3 tiers mixed inconsistently | All pages |
| V17 | Card borders: one standard | Consistent border color | `border-gray-300` (55 uses) mixed with `border-gray-200` (89 uses) on same-level cards | All pages |

---

## Phase 1 — Layout Shell Fixes

> These affect every page. Fix first or every subsequent phase inherits broken layout.

### Task 1.1 — Sidebar: 288px → 240px

**File:** `src/layouts/track-trace-layout.tsx`

```
Line 214: lg:w-72  →  lg:w-60
Line 261: lg:pl-72  →  lg:pl-60
```

**Rule:** Sidebar max 240px (`w-60` = 240px).

---

### Task 1.2 — Top bar: 64px → 56px

**File:** `src/layouts/track-trace-layout.tsx`

```
Line 263: h-16  →  h-14
```

**Rule:** Top bar 48–56px. `h-14` = 56px.

---

### Task 1.3 — Sticky panels: clear the 56px header

**File:** `src/components/shared/trackTraceV2Chrome.ts`

```tsx
// Before
export const trackTraceV2StickyPanelClassName =
  'sticky top-4 z-10 border-gray-300 bg-white/95 p-5 backdrop-blur'

export const trackTraceV2CompactStickyPanelClassName =
  'sticky top-4 z-10 border-gray-300 bg-white/95 p-4 backdrop-blur'

// After (top-14 = 56px = clears the h-14 header)
export const trackTraceV2StickyPanelClassName =
  'sticky top-14 z-10 border-gray-200 bg-white/95 p-5 backdrop-blur'

export const trackTraceV2CompactStickyPanelClassName =
  'sticky top-14 z-10 border-gray-200 bg-white/95 p-4 backdrop-blur'
```

**Rule:** Sticky panels must clear the top bar. Also fixes V17 (border-gray-300 → border-gray-200).

---

### Task 1.4 — Content max-width cap

**File:** `src/layouts/track-trace-layout.tsx`

Find the main content wrapper (the `<main>` or inner div that wraps `<Outlet />`):

```tsx
// Before
<div className="py-6 px-4 sm:px-6 lg:px-8">

// After
<div className="mx-auto max-w-screen-2xl py-6 px-4 sm:px-6 lg:px-8">
```

**Rule:** Cap content at `max-w-screen-2xl` on ultra-wide monitors.

---

## Phase 2 — Typography Standardisation

> 38 instances of illegal font size. 23 instances of custom tracking. Fix globally.

### Task 2.1 — Replace all `text-[11px]` with `text-xs`

**Files:** Run this replacement across the entire `src/` directory:

```
text-[11px]  →  text-xs
```

**Affected files** (confirmed):
- `ActiveTripsTable.tsx` (~8 instances)
- `TrackingAlertCard.tsx` (~6 instances)
- `DriverBehaviorPage.tsx` (~4 instances — mobile cards)
- `RoutePerformancePage.tsx` (~4 instances)
- `TrackingAnalyticsPage.tsx` (~4 instances)
- `SelectedTripInsightCard.tsx` (~4 instances)

**Rule:** Minimum font size is 12px (`text-xs`). Never use `text-[11px]`.

---

### Task 2.2 — Standardise eyebrow tracking

The `trackTraceV2EyebrowClassName` uses `tracking-[0.24em]` — a custom value not in the Tailwind scale.

**File:** `src/components/shared/trackTraceV2Chrome.ts`

```tsx
// Before
export const trackTraceV2EyebrowClassName =
  'text-xs font-extrabold uppercase tracking-[0.24em] text-secondary'

// After — tracking-widest is 0.1em, still distinctive and on-scale
export const trackTraceV2EyebrowClassName =
  'text-xs font-extrabold uppercase tracking-widest text-secondary'
```

Since this is an exported constant, changing it here updates all 23 usages automatically.

**Rule:** Use standard Tailwind typography scale. `tracking-widest` = 0.1em is the widest standard value.

---

## Phase 3 — Colour Token Compliance

> `bg-gray-700` is not one of the 6 semantic colors. It is used as the "Low" severity color.

### Task 3.1 — Fix Low severity color across 3 files

Low severity currently uses `bg-gray-700 text-white` (solid) and `bg-gray-100 text-gray-700` (tonal). Neither uses a semantic name.

Define Low severity as the `secondary` semantic token (neutral/informational).

**File 1:** `src/components/TrackingAlertCard.tsx`

```tsx
// Before
badge: 'bg-gray-700 text-white',

// After
badge: 'bg-secondary text-white',
```

**File 2:** `src/pages/TrackingAlertsPage.tsx`

```tsx
// Before
{ key: 'Low', ... active: 'bg-gray-700 text-white', inactive: 'bg-gray-100 text-gray-700' },

// After
{ key: 'Low', ... active: 'bg-secondary text-white', inactive: 'bg-secondary/10 text-secondary' },
```

**File 3:** `src/pages/TrackTraceDashboard.tsx`

```tsx
// Before (severity pill link for "low")
className="rounded-full bg-gray-700 px-3 py-1 text-white transition hover:opacity-80"

// After
className="rounded-full bg-secondary px-3 py-1 text-white transition hover:opacity-80"
```

**Rule:** Use only 6 named semantic colors: primary, secondary, success, warning, danger, text.

---

### Task 3.2 — Standardise card borders to border-gray-200

55 files use `border-gray-300` on Cards, many at the same hierarchy level as cards using `border-gray-200`. Reserve `border-gray-300` for elevated/emphasis states only (e.g., the hero control tower card).

**Rule:** One border color for standard cards. Use `border-gray-200`. Only use `border-gray-300` for intentional emphasis (1–2 cards per page maximum).

Do a targeted find-and-replace on `<Card className="border-gray-300` → `<Card className="border-gray-200` except where explicitly intended for emphasis. Review each change — do not blanket replace.

**Key files to fix:**
- `TrackingSummaryCards.tsx` line 209: `border-gray-300 p-5 shadow-sm` → `border-gray-200 p-5`
- `GeofenceManagementPage.tsx` V2 context card: keep `border-gray-300` (intentional emphasis)
- `TrackTraceDashboard.tsx` V2 control tower card: keep `border-gray-300` (intentional emphasis)

---

## Phase 4 — Shadow Removal from Cards

> Rule: Cards use border only. No shadow.

### Task 4.1 — Remove shadow-sm from card-level elements

**File 1:** `src/components/TrackingSummaryCards.tsx` line 209

```tsx
// Before
<Card key={item.key} className="border-gray-300 p-5 shadow-sm">

// After
<Card key={item.key} className="border-gray-200 p-5">
```

**File 2:** `src/components/EmptyPlaceholder.tsx` line 12

```tsx
// Before
className={`rounded-xl border border-dashed border-gray-300 bg-white shadow-sm ...`}

// After
className={`rounded-xl border border-dashed border-gray-200 bg-white ...`}
```

**Keep shadows on:** modals (confirmation dialogs), dropdown menus, floating panels — these are the only valid shadow uses.

**Do not change:** `shadow-sm` on the active-selected table row in `ActiveTripsTable.tsx` — this is a valid selected-state indicator, not a card shadow. Also keep `shadow-sm` on the version toggle inline control (`TrackTraceVersionToggle.tsx`) — it's a pill control, not a card.

---

## Phase 5 — KPI Count Compliance

> Rule: max 4 KPIs above the fold, max 8 total per page.

### Task 5.1 — Dashboard V2: collapse "Network health" strip below fold

Currently both "Critical operations" (4 cards) and "Network health" (4 cards) appear above the fold, giving 8 KPIs above fold. Rule allows 4 max above fold.

**File:** `src/pages/TrackTraceDashboard.tsx`

Move the "Network health" `<section>` (supporting fleet context — Total Active Trips, In Transit, Idle, On-Time%) into the existing `<details>` analytics accordion at the bottom. It belongs with analytics data, not with the command-center view.

```tsx
// The supporting card section block:
<section className="space-y-3">
  <div>
    <p ...>Network health</p>
    <h2 ...>Supporting fleet context</h2>
  </div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {supportingCardMeta.map(...)}
  </div>
</section>
```

Move this entire block INSIDE the `<details>` accordion, above `<TrackingKpiFoundationPanel />`.

**Result:** 4 critical KPIs above fold (open alerts, delayed trips, offline vehicles, avg ETA delay) — compliant.

---

### Task 5.2 — Dashboard V1: reduce from 11 to max 8 KPIs

V1 currently shows: 8 summary KPI cards + 3 health cards = 11 total.

**File:** `src/pages/TrackTraceDashboard.tsx` V1 branch

Remove the 3 health cards section entirely from V1 (the section with `healthItems.map(...)` in the V1 branch). This data is already covered by the connection state visible in the top bar.

```tsx
// DELETE this entire section from the V1 branch:
<section className="grid gap-4 md:grid-cols-3">
  {healthItems.map((item) => {
    ...
  })}
</section>
```

**Result:** V1 has 8 KPI cards (2 rows of 4) — compliant.

---

### Task 5.3 — TripDetailsPage V1: fix `xl:grid-cols-6`

**File:** `src/pages/TripDetailsPage.tsx` line 265 (V1 branch)

```tsx
// Before — 6 columns is too many
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

// After — max 4 columns, shows 6 cards in 2 rows of 3
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
```

**Rule:** Never more than 4 columns in a content grid.

---

## Phase 6 — Empty State CTA Support

> Rule: Every empty state needs title + subtitle + CTA. Currently 0 empty states have CTAs.

### Task 6.1 — Upgrade EmptyPlaceholder component

**File:** `src/components/EmptyPlaceholder.tsx`

```tsx
import type { ReactNode } from 'react'

export function EmptyPlaceholder({
  title,
  description,
  compact = false,
  action,
}: {
  title: string
  description: string
  compact?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-white ${
        compact ? 'px-5 py-8 text-left' : 'px-6 py-10 text-center'
      }`}
    >
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className={`mt-2 text-sm leading-6 text-gray-500 ${compact ? 'max-w-none' : 'mx-auto max-w-2xl'}`}>
        {description}
      </p>
      {action && (
        <div className={`mt-5 ${compact ? '' : 'flex justify-center'}`}>
          {action}
        </div>
      )}
    </div>
  )
}
```

---

### Task 6.2 — Add CTAs to meaningful empty states

After upgrading the component, add `action` props to the following empty states:

| Page | Empty State | CTA to Add |
|------|-------------|-----------|
| `TrackTraceDashboard.tsx` | No active trips | `<Link to={scopedPath('/trips')}>View all trips</Link>` as Button outline |
| `TrackTraceDashboard.tsx` | No open alerts | `<Link to={scopedPath('/alerts')}>View alert queue</Link>` as Button outline |
| `ActiveTripsPage.tsx` | No trips match filters | Reset filters Button |
| `TrackingAlertsPage.tsx` | No alerts match filters | Reset filters Button |
| `GeofenceManagementPage.tsx` | No geofences | `<Button onClick={openCreateForm}>Create first geofence</Button>` |
| `TripDetailsPage.tsx` | No active trip alerts | `<Link to={scopedPath('/alerts')}>View all alerts</Link>` as Button outline |

**Rule:** Every empty state needs a CTA. Prioritise ones where users are stuck.

---

## Phase 7 — Breadcrumbs on Deep Pages

> Rule: Add breadcrumbs on pages 3+ levels deep. Max 3 levels shown.

### Task 7.1 — Create Breadcrumb component

**Create:** `src/components/shared/Breadcrumb.tsx`

```tsx
import { Link } from 'react-router-dom'

export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; to?: string }>
}) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-gray-300">/</span>}
          {item.to ? (
            <Link className="hover:text-text transition-colors" to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
```

---

### Task 7.2 — Add breadcrumbs to Level 3+ pages

**File: `TripDetailsPage.tsx`** — Level 3 (Module > Active Trips > Trip Detail)
Add above `<PageHero>`:
```tsx
<Breadcrumb items={[
  { label: 'Tracking', to: scopedPath('/trips') },
  { label: 'Active Trips', to: scopedPath('/trips') },
  { label: trip.id },
]} />
```

**File: `TripReplayPage.tsx`** — Level 4 (Module > Active Trips > Trip > Replay)
```tsx
<Breadcrumb items={[
  { label: 'Active Trips', to: scopedPath('/trips') },
  { label: replay.tripId, to: scopedPath(`/trips/${replay.tripId}`) },
  { label: 'Replay' },
]} />
```

**File: `CustomerTrackingPreviewPage.tsx`** — Level 3
```tsx
<Breadcrumb items={[
  { label: 'Active Trips', to: scopedPath('/trips') },
  { label: tripId ?? 'Trip', to: tripId ? scopedPath(`/trips/${tripId}`) : undefined },
  { label: 'Customer Preview' },
]} />
```

**Rule:** Use breadcrumbs on pages 3+ levels deep. Max 3 breadcrumb segments visible.

---

## Phase 8 — Skeleton Loading for All Pages

> Rule: Full-page first load = layout skeleton. 14/15 pages currently violate this.

### Task 8.1 — Create 6 targeted skeleton components

Each skeleton must mirror the real page structure at a layout level (not data level).

**Create the following files in `src/components/shared/`:**

#### `ListPageSkeleton.tsx` — used by Active Trips, Alerts, Geofences

```tsx
export function ListPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-56 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-96 rounded-lg bg-gray-100" />
      </div>
      {/* Sticky filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2 h-11 rounded-lg bg-gray-100" />
          <div className="h-11 rounded-lg bg-gray-100" />
          <div className="h-11 rounded-lg bg-gray-100" />
        </div>
      </div>
      {/* Table card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="h-5 w-32 rounded-lg bg-gray-200" />
          <div className="mt-1 h-3 w-48 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-28 rounded-lg bg-gray-200" />
                <div className="h-3 w-36 rounded-lg bg-gray-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-100" />
              <div className="h-8 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### `DetailPageSkeleton.tsx` — used by TripDetails, TripReplay, CustomerPreview

```tsx
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="h-3 w-3 rounded-full bg-gray-200" />
        <div className="h-3 w-24 rounded-full bg-gray-200" />
        <div className="h-3 w-3 rounded-full bg-gray-200" />
        <div className="h-3 w-20 rounded-full bg-gray-200" />
      </div>
      {/* Hero */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-gray-200" />
            <div className="h-7 w-44 rounded-xl bg-gray-200" />
            <div className="h-3 w-72 rounded-lg bg-gray-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-gray-100" />
            <div className="h-9 w-28 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
      {/* KPI strip */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="h-6 w-20 rounded-lg bg-gray-200" />
            <div className="h-3 w-28 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
      {/* Main 2-col content */}
      <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="rounded-xl border border-gray-200 bg-white h-64" />
        <div className="rounded-xl border border-gray-200 bg-white h-64" />
      </div>
    </div>
  )
}
```

#### `AnalyticsPageSkeleton.tsx` — used by Analytics, SLA, Route Performance, Driver Behavior

```tsx
export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-64 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-full max-w-lg rounded-lg bg-gray-100" />
      </div>
      {/* Sticky analysis bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-7 w-12 rounded-full bg-gray-200" />
              <div className="h-7 w-12 rounded-full bg-gray-100" />
              <div className="h-7 w-12 rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-16 w-40 rounded-2xl bg-gray-100" />
            <div className="h-16 w-40 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="h-6 w-16 rounded-lg bg-gray-200" />
          </div>
        ))}
      </div>
      {/* Table card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="h-5 w-40 rounded-lg bg-gray-200" />
          <div className="mt-1 h-3 w-56 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 h-4 rounded-lg bg-gray-100" />
              <div className="h-4 w-16 rounded-lg bg-gray-100" />
              <div className="h-4 w-16 rounded-lg bg-gray-100" />
              <div className="h-4 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### `MapPageSkeleton.tsx` — used by LiveMap

```tsx
export function MapPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-56 rounded-xl bg-gray-200" />
      </div>
      <div className="h-14 rounded-xl border border-gray-200 bg-white px-5" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="h-[480px] rounded-xl border border-gray-200 bg-gray-100" />
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-5 w-40 rounded-lg bg-gray-200" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 8.2 — Wire skeletons into all 14 pages

Replace `return <EmptyPlaceholder title="Loading..." ... />` with the appropriate skeleton in each page:

| Page | Skeleton | Change |
|------|----------|--------|
| `ActiveTripsPage.tsx` | `ListPageSkeleton` | `if (loading) return <ListPageSkeleton />` |
| `TrackingAlertsPage.tsx` | `ListPageSkeleton` | `if (loading) return <ListPageSkeleton />` |
| `GeofenceManagementPage.tsx` | `ListPageSkeleton` | `if (loading) return <ListPageSkeleton />` |
| `TripDetailsPage.tsx` | `DetailPageSkeleton` | `if (loading) return <DetailPageSkeleton />` |
| `TripReplayPage.tsx` | `DetailPageSkeleton` | `if (loading) return <DetailPageSkeleton />` |
| `CustomerTrackingPreviewPage.tsx` | `DetailPageSkeleton` | `if (loading) return <DetailPageSkeleton />` |
| `TrackingAnalyticsPage.tsx` | `AnalyticsPageSkeleton` | `if (loading) return <AnalyticsPageSkeleton />` |
| `RoutePerformancePage.tsx` | `AnalyticsPageSkeleton` | `if (loading) return <AnalyticsPageSkeleton />` |
| `DriverBehaviorPage.tsx` | `AnalyticsPageSkeleton` | `if (loading) return <AnalyticsPageSkeleton />` |
| `LiveMapPage.tsx` | `MapPageSkeleton` | `if (loading) return <MapPageSkeleton />` |

---

## Delivery Order Summary

| Phase | What | Files Changed | Effort |
|-------|------|--------------|--------|
| 1 | Layout shell (sidebar, topbar, sticky offset, max-width) | `track-trace-layout.tsx`, `trackTraceV2Chrome.ts` | XS |
| 2 | Typography (`text-[11px]` → `text-xs`, tracking standard) | 8 component files, `trackTraceV2Chrome.ts` | S |
| 3 | Color tokens (Low severity, border consistency) | 3 files for severity, ~10 files for borders | S |
| 4 | Shadow removal from cards | `TrackingSummaryCards.tsx`, `EmptyPlaceholder.tsx` | XS |
| 5 | KPI count compliance (dashboard, TripDetails V1) | `TrackTraceDashboard.tsx`, `TripDetailsPage.tsx` | S |
| 6 | Empty state CTA support (upgrade component + add CTAs) | `EmptyPlaceholder.tsx` + 6 pages | S |
| 7 | Breadcrumbs on Level 3+ pages | New `Breadcrumb.tsx` + 3 pages | S |
| 8 | Skeleton loading for all pages | 6 new skeleton files + 14 page updates | M |

**Total estimated effort: 1.5–2 developer days for all phases.**

---

## Non-Violations (Confirmed Compliant)

The following were checked and do not violate the rules:
- All data tables have `mobileCardRender` — ✅
- All list pages have sticky filter bars — ✅
- Button hierarchy (one primary per view) — ✅
- `border-l-2 border-primary` on active nav items — ✅
- Sidebar nesting max 2 levels — ✅
- Max nav depth 4 levels (Dashboard > Module > Detail > Sub-detail) — ✅
- Delete confirmation modals on Geofences — ✅
- Pagination on all list pages — ✅
- No `alert()` calls anywhere — ✅
- Transitions: `transition hover:opacity-80` only, no layout animations — ✅
> Archive note: this redesign plan predates the removal of the versioned UI model. Any `V1`/`V2` references below are historical and should not be treated as current architecture.
