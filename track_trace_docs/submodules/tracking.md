# Tracking Sub-Module

Section label: `Tracking`

Pages in this sub-module: **4**

## Included Pages

1. Active Trips (`ActiveTripsPage.tsx`)
2. Trip Detail (`TripDetailsPage.tsx`)
3. Trip Replay (`TripReplayPage.tsx`)
4. Live Map (`LiveMapPage.tsx`)

## Related Supporting Flow

- Customer Preview (`CustomerTrackingPreviewPage.tsx`) is trip-linked.

## Purpose

The Tracking section covers the full operational trip visibility lifecycle: queue management, trip drill-down, replay, and live geographic monitoring.

---

## Code-Level Observations

### Active Trips (`ActiveTripsPage.tsx`, `ActiveTripsTable.tsx`)

- **The compact table slices to 5 rows.** `ActiveTripsTable` contains `const rows = compact ? trips.slice(0, 5) : trips`. The Active Trips page passes `compact={version === 'v2'}`. This means in V2, the main queue page is silently limited to 5 trip rows. This is a critical data-visibility bug — the same slice logic that limits the dashboard preview is active on the full-page queue in V2. Operators with more than 5 trips will never see them.
- **The filter panel IS sticky in V2.** The filter `Card` uses `trackTraceV2StickyPanelClassName` in V2 mode. The previous review incorrectly identified "no sticky filters" as a gap. This is already solved. However, V1 filter panel is not sticky.
- **Three summary cards add ~160px before the filter panel.** Cards for "Trips In Queue", "Live Stream", and "Selected Trip" appear above the filter. The "Selected Trip" card shows the currently selected trip ID, which is redundant with the table's selected-row highlight and adds no navigation value. It can be removed or compressed.
- **`search` is col-span-2 on XL** but the layout falls back to `md:grid-cols-2` at intermediate widths, making the search field the same width as the dropdowns — acceptable.
- **No pagination or virtual scrolling.** All `filteredTrips` are rendered at once. Large queues (50+ trips) will not perform well.
- **`statusOptions` array has 11 values.** A `<select>` with 11 options is functional but basic. The filter UX could benefit from visual filter chips instead.
- **Reset filters button is properly disabled** when no filters are active (`disabled={!hasActiveFilters}`) — good.
- **V1 uses non-compact table** (7 full-width columns, no mobile card mode). The main operational queue in V1 has no responsive fallback on mobile.

### Trip Detail (`TripDetailsPage.tsx`)

- **Context-aware primary action is implemented in V2.** Logic: if trip is offline/delayed/deviated → "Open live map"; elif alerts > 0 → "Replay trip"; else → "Customer preview". This is a real V2 improvement — the most likely next action is promoted.
- **All secondary actions are still shown regardless of primary action.** The hero shows the computed primary CTA plus three secondary outline buttons (live map, replay, customer preview) — even when one of them is the primary. This creates slight redundancy in the action set (e.g., "Open live map" appears as primary AND as a secondary outline button simultaneously).
- **Sticky investigation guide works.** The `trackTraceV2CompactStickyPanelClassName` panel has four anchor chips: `#trip-overview`, `#trip-route`, `#trip-timeline`, `#trip-alerts`. All four IDs exist in the rendered JSX. The sticky guide successfully provides internal page navigation.
- **Predictive delay card creates layout shift.** The `riskScore` card renders `{riskScore ? <Card>...</Card> : null}`. If the API is slow or fails, a visible layout shift occurs as the space appears/disappears. No skeleton is shown for the pending state.
- **V1 uses `xl:grid-cols-6` for the KPI strip.** Six cards in a 6-column grid will be very cramped on 13-inch laptops at 1280px wide — each card gets ~180px.
- **TripInfoPanel renders as a full-width card** regardless of context — in V2 this is inside a right column grid, in V1 it is full-width and thus more vertically expensive.
- **`trip.driverMobile` is shown in the UI without masking.** This is a data sensitivity note — driver phone numbers are displayed in plain text to all viewers of the trip detail page.
- **V2 splits layout into two columns** (`xl:grid-cols-[1.08fr,0.92fr]`): ETA widget + risk + route progress on the left, and trip info panel + customer status + shortcuts on the right. This is a much stronger investigation layout than V1's linear stack.

### Live Map (`LiveMapPage.tsx`)

- **Filter panel is NOT sticky in the Live Map.** Unlike Active Trips, the Live Map filter `Card` uses a plain `className="p-5"` without any sticky variant. Once the user scrolls into the map content, the five filter toggle buttons scroll away.
- **V2 hides the selected-trip side panel** (`{selectedTrip && version !== 'v2' ? <Card>...</Card> : null}`). In V1, the right column shows both vehicle marker cards AND a full selected-trip details panel. In V2, the side panel is removed and detail lives in the map workbench. This correctly de-duplicates content.
- **Auto-selection of first trip on mount.** A `useEffect` auto-selects `filteredTrips[0]` if no trip is selected. This is functionally useful but may surprise users who arrive on the map without a specific trip in mind — the map workbench immediately shows a trip the user didn't choose.
- **Vehicle marker list has no search.** The `max-h-[34rem] overflow-y-auto` list shows all filtered trips, but there is no search or sort within the marker cards panel. If 20 trips pass the current filters, finding a specific trip requires manual scrolling.
- **Filter buttons have no "clear all" affordance.** Five individual toggle buttons exist. There is no single button to reset all active filters at once, and no badge indicating how many filters are active.
- **Filter toggle state persists within the session** (local `useState`) but is not shared or preserved across page navigations. If a user sets filters, goes to trip detail, and returns, filters reset.
- **The `showFallbackOnly` filter** filters for `trip.sourceHealth === 'Fallback'` — this is semantically correct but the button label "Show fallback source" is technical. A label like "Fallback GPS only" or "Signal degraded" would be more dispatch-friendly.

### Trip Replay (`TripReplayPage.tsx`)

- File not read directly, but referenced in existing docs and routing. Known to use `ReplayMapPanel.tsx` and `ReplayTimeline.tsx`.
- Existing docs indicate the page uses a two-column layout (map + timeline) that is appropriate on desktop but stacks vertically on smaller widths.

### Customer Preview (`CustomerTrackingPreviewPage.tsx`)

- Uses `CustomerTrackingCard.tsx` which presents a simplified, customer-safe view.
- File not read directly. Known to be low-complexity and appropriately scoped.

---

## Scroll Review

### Vertical Scroll

#### Active Trips

- Sections in order: hero → health banner (V2) → 3 summary cards → filter card → trips table.
- The 3 summary cards add ~160px of vertical content before the main filter and list.
- The trip table itself can grow tall with many rows (no pagination).
- With the compact-slicing bug in V2, this issue is masked (max 5 rows). Fixing the bug will expose the lack of pagination.

#### Trip Detail

- V2 sections: hero + actions → sticky guide → 4 KPI cards → 2-col (ETA/risk/route + info/customer/shortcuts) → 2-col (timeline + alerts).
- The two-column layout in V2 significantly reduces vertical cost compared to V1.
- V2 is the better layout but still tall on laptop widths where the inner nested grids may partially stack.
- V1 is fully linear and much taller: 6 KPI cards (cramped at xl:grid-cols-6) → full-width TripInfoPanel → ETA widget + customer → risk → route progress → timeline + alerts.

#### Live Map

- Sections: hero → filter chip card → 2-col grid (map + right rail).
- The 2-col grid keeps the page compact on desktop.
- Right rail contains: marker cards (capped at 34rem) + conditional selected-trip panel (V1 only).
- On tablet/mobile, the 2-col grid stacks — map becomes full-width first, then right rail below.
- Stacked layout creates a very long mobile page: hero + filter + map panel + marker list.

#### Trip Replay

- Acceptable on desktop (2-col map + timeline).
- Likely becomes long on mobile as panels stack.

#### Customer Preview

- Short and manageable. Not a scroll-risk page.

### Horizontal Scroll

- Active Trips: V1 table has 7 columns without a mobile card fallback — literal horizontal overflow risk on mobile.
- Trip Detail: the `xl:grid-cols-6` V1 KPI strip compresses aggressively on medium-laptop widths.
- Live Map: the two-column grid collapses rather than overflows.
- Trip Replay: map + timeline side-by-side may become squished on 1280px widths.

---

## Detailed Gap Analysis

### Critical Bug: Active Trips V2 Shows Only 5 Trips

This is the highest-priority issue in the sub-module. The `compact` prop passed to `ActiveTripsTable` triggers a `trips.slice(0, 5)` that was designed for the dashboard preview but is also applied on the main Active Trips page in V2 mode. An operator with 20 active trips will see only 5 of them, with no indication that rows are hidden.

**Immediate fix:** In `ActiveTripsPage.tsx`, do not pass `compact` to control slicing. Pass a separate `enableMobileCards` prop (or rename the existing prop) so the responsive mobile card behavior can be enabled without triggering the 5-row slice. In `ActiveTripsTable.tsx`, separate the slice logic from the card-mode logic.

### Primary Action in Trip Detail is Promoted but Not Singularly Emphasized

V2 correctly computes the primary action based on trip state and promotes it as the primary button. However, the same action then also appears as a secondary outline button in the action cluster. For example, when the primary action is "Open live map", there is also a separate `variant="outline"` "Open live map" button in the same row. This reduces the signal of the primary action.

### V1 Active Trips Has No Mobile Card Fallback

The `ActiveTripsPage` in V1 passes no `compact` prop to `ActiveTripsTable`, which means the non-compact full-width `DataTable` renders on all screen sizes. On mobile (< 768px), this is a 7-column table with no responsive card mode.

### Filter State is Not Preserved Across Navigation

Live Map filter state (showActiveOnly, showDelayedOnly, etc.) lives in component-local `useState`. Navigating away and returning resets all filters. For operational users who frequently switch between map and trip detail, this creates repeated re-configuration work.

### Vehicle Marker List is Unsearchable at Scale

The marker cards panel shows all filtered trips in a capped scrollable list. With 15+ trips matching the current filter, finding a specific vehicle requires scrolling through cards. No search, sort, or keyboard-shortcut navigation exists.

### Trip Detail Risk Card Creates Layout Shift

The predictive delay card conditionally renders based on `riskScore`. If the API response is slow (> 500ms), the layout shifts noticeably as the card appears after other content has already been placed.

---

## Improvement Register

### 1. Active Trips V2 silently limits the queue to 5 rows

- Current issue:
  `ActiveTripsPage` passes `compact={version === 'v2'}` to `ActiveTripsTable`, which triggers `trips.slice(0, 5)`. The full queue is invisible beyond 5 rows in V2 mode.
- Impact on user experience:
  Operators with more than 5 active trips will miss them entirely in V2. This is a data-visibility failure that degrades the V2 experience below V1 for real-volume scenarios.
- Recommended improvement:
  Decouple the mobile-card responsive mode from the row-slice behavior.
- Priority level:
  `Critical`
- Suggested implementation approach:
  In `ActiveTripsTable.tsx`, rename `compact` to `showMobileCards` (or add a separate `previewMode` prop) and only apply `trips.slice(0, 5)` when `previewMode={true}`. Update `ActiveTripsPage.tsx` to pass `showMobileCards={true}` without `previewMode`, and update `TrackTraceDashboard.tsx` to pass `previewMode={true}` for the dashboard preview.

### 2. V1 Active Trips has no mobile card fallback

- Current issue:
  In V1, `ActiveTripsPage` passes no `compact` prop, so the full 7-column `DataTable` renders on all screen sizes including mobile.
- Impact on user experience:
  Mobile and narrow-viewport users see a cramped, likely overflowing table in V1.
- Recommended improvement:
  Apply the mobile card mode in V1 as well, even if the desktop table remains non-compact.
- Priority level:
  `High`
- Suggested implementation approach:
  After the compact/previewMode split (issue #1 above), always pass `showMobileCards={true}` from `ActiveTripsPage`, regardless of version. The mobile card view should be the default below md breakpoints for all users.

### 3. Active Trips has no pagination for large queue volumes

- Current issue:
  All `filteredTrips` are rendered at once. With 50+ trips, the page will become slow to render and long to scroll.
- Impact on user experience:
  Performance degrades and scan efficiency drops as queue volume grows.
- Recommended improvement:
  Add pagination or virtualized rendering to the trip table.
- Priority level:
  `High`
- Suggested implementation approach:
  For simpler implementation: add client-side pagination with 20 rows per page and a page indicator showing "Showing 1–20 of 47 trips". For higher-volume scenarios, use a virtual scroller library. Pagination is the lower-effort option and sufficient for initial enterprise delivery.

### 4. Live Map filter panel is not sticky

- Current issue:
  The filter chip `Card` in `LiveMapPage` uses plain `className="p-5"` with no sticky positioning. It scrolls away when users move into the map content.
- Impact on user experience:
  Users who want to change filters (e.g., switch from "all active" to "delayed only") after scrolling must scroll back to the top.
- Recommended improvement:
  Apply the same sticky panel treatment used on Active Trips and Alerts pages.
- Priority level:
  `High`
- Suggested implementation approach:
  Replace `className="p-5"` on the filter `Card` with `className={trackTraceV2StickyPanelClassName}` (or equivalent sticky CSS). This is a single-line change.

### 5. Vehicle marker list has no search within the panel

- Current issue:
  All filtered trips are shown in the marker cards list, but there is no search or sort control within the panel itself.
- Impact on user experience:
  When 15+ trips are visible on the map, finding a specific vehicle in the right-rail list requires scrolling through all marker cards manually.
- Recommended improvement:
  Add a compact search input at the top of the vehicle marker card panel.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Add a local `useState` search in `LiveMapPage`. Filter `filteredTrips` for the right rail by trip ID, vehicle number, or customer name. The map panel can continue showing all filtered trips while the right-rail list narrows to the search result.

### 6. Live Map filter state resets on navigation

- Current issue:
  All five filter toggles in `LiveMapPage` are component-local `useState`. Navigating to a trip detail and returning resets them.
- Impact on user experience:
  Dispatch operators who regularly switch between map and trip detail must re-apply filters every time they return.
- Recommended improvement:
  Persist live map filter state in the shared tracking store.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Add `liveMapFilters: { showActiveOnly, showDelayedOnly, showOfflineOnly, showRouteDeviationOnly, showFallbackOnly }` to `trackingStore`. Initialize the page from store values and write back on change. This is a small store extension.

### 7. Live Map has no "clear all filters" affordance

- Current issue:
  Five individual toggle buttons exist with no collective reset CTA.
- Impact on user experience:
  Users with multiple filters active must click each button individually to clear them.
- Recommended improvement:
  Add a "Reset filters" or "Show all" button that becomes active when any non-default filter is on.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Compute `const hasActiveFilter = showDelayedOnly || showOfflineOnly || showRouteDeviationOnly || showFallbackOnly`. Render a small `<Button variant="outline" size="sm">Reset</Button>` that clears all to their default states when `hasActiveFilter` is true.

### 8. Trip Detail: primary action duplicates secondary action buttons

- Current issue:
  When V2 promotes "Open live map" as the computed primary action, the same destination also appears as a secondary `variant="outline"` button in the hero action cluster. Users see two "Open live map" buttons.
- Impact on user experience:
  The primary action's prominence signal is weakened. Users may be confused by identical labels at different visual weight levels.
- Recommended improvement:
  Remove the secondary version of whichever action is currently the primary.
- Priority level:
  `Medium`
- Suggested implementation approach:
  In the V2 hero action block, filter out the secondary buttons that match `primaryAction.to` before rendering them. Or use the `primaryAction.label` to compute which secondary buttons to suppress.

### 9. Predictive delay card creates layout shift when risk score loads

- Current issue:
  `{riskScore ? <Card>...</Card> : null}` conditionally renders the predictive delay section. If the API takes > 300ms, other sections render first, then the card appears and pushes subsequent content down.
- Impact on user experience:
  Visible layout shift after page load, especially when the risk card sits mid-page in the V2 layout.
- Recommended improvement:
  Reserve space for the risk card during loading or show a compact skeleton placeholder.
- Priority level:
  `Medium`
- Suggested implementation approach:
  Track a separate `riskScoreLoading` state alongside `riskScore`. While loading, show a `<Card className="p-5 animate-pulse"><div className="h-20 bg-gray-100 rounded-xl" /></Card>` placeholder in the same grid position.

### 10. Active Trips summary cards add vertical cost with limited operational value

- Current issue:
  Three summary cards above the filter (Trips In Queue, Live Stream, Selected Trip) take ~160px of vertical space. "Selected Trip" shows the last-selected trip ID, which is redundant with the table selection highlight and provides no action affordance.
- Impact on user experience:
  Users must scroll through three informational cards before reaching the filter and table.
- Recommended improvement:
  Compress these into an inline status bar or move them inside the filter card as compact chip-stats.
- Priority level:
  `Low`
- Suggested implementation approach:
  Replace the three summary cards with a slim flex-row of three stat chips inside the top of the filter card: `{filteredTrips.length} trips · {socketConnectionState} · Last updated {time}`. Remove the separate card row.

### 11. Live Map "fallback source" filter label is too technical

- Current issue:
  The button label "Show fallback source" uses internal terminology. Dispatch operators may not understand what "fallback source" means.
- Impact on user experience:
  Filter intent is unclear, reducing discoverability and correct usage.
- Recommended improvement:
  Use more operational language.
- Priority level:
  `Low`
- Suggested implementation approach:
  Change the button label to "Fallback GPS only" or "Signal degraded" and add a tooltip explaining: "Shows vehicles using a secondary tracking source like driver app or FASTag instead of a primary GPS device."

### 12. Tracking sub-module lacks V2 treatment on Trip Replay and Customer Preview

- Current issue:
  `Trip Replay` and `Customer Preview` do not yet have V2 layout variants, sticky tooling, or enhanced trust/context cues that V2 brought to `Active Trips`, `Trip Detail`, and `Live Map`.
- Impact on user experience:
  The user experiences a modernized top-of-funnel (queue, detail) and then falls back into simpler-feeling pages deeper in the flow.
- Recommended improvement:
  Extend V2 design principles to replay and customer preview pages.
- Priority level:
  `High`
- Suggested implementation approach:
  For Replay: add a sticky playback control bar, clearer step-state summary, and a compact status strip showing current replay position, duration, and event count. For Customer Preview: add a "share-safe framing" strip showing what is visible to the customer vs. what is intentionally hidden.

---

## Recommended Priority Actions

1. Fix the `compact` slice bug in `ActiveTripsTable` — this is the most impactful single change in the sub-module.
2. Make V1 Active Trips mobile-safe with the responsive card mode.
3. Add pagination to the Active Trips queue.
4. Make the Live Map filter panel sticky.
5. Resolve the duplicate primary/secondary action in Trip Detail.
6. Bring Trip Replay and Customer Preview to V2 maturity.

---

## Final Verdict

The Tracking sub-module covers the right workflows but has one critical implementation bug (compact row-slicing on the main queue page) that must be fixed before V2 can be considered production-ready for real trip volumes. Beyond that, the remaining gaps are incremental: pagination, filter persistence, search within marker list, and layout deduplication in the hero actions. Trip Detail and Live Map are already the strongest pages in the product. Replay and Customer Preview are the two remaining pages that need V2 treatment.
