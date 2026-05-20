# Track and Trace Phase 1 Workflow Validation

> Archive note: this validation log spans the transition from the earlier versioned UI model to the current single workspace implementation. Legacy `V1`/`V2` references below are historical.

Last updated: 2026-05-13

## Goal

Validate existing Track and Trace workflows screen by screen before any simplification, removal, or backend integration work. Phase 1 should identify what works, what is only mocked, what has UX friction, and what needs a later backend/API decision.

## Validation Rules

- Use the current Track and Trace workspace as the main baseline.
- Do not remove or redesign screens during Phase 1.
- Mark mock-only behavior as a backend gap, not a UI defect.
- Validate each screen through its incoming and outgoing workflows.
- Record only actionable gaps.

## Phase 1 Status

| # | Screen | Status | Result |
|---|---|---|---|
| 1 | Dashboard | Completed | Core workflow passes with minor follow-up gaps. |
| 2 | Active Trips | Completed | Core queue workflow passes with minor filter/backend gaps. |
| 3 | Trip Detail | Completed | Core investigation workflow passes with minor widget/empty-state gaps. |
| 4 | Live Map | Completed | Core map workflow passes with minor filter/backend gaps. |
| 5 | Trip Replay | Completed | Replay workflow passes with placeholder-map limitations and minor empty-state gaps addressed. |
| 6 | Customer Preview | Completed | Customer-safe visibility workflow passes with minor governance and placeholder gaps. |
| 7 | Alerts | Completed | Alert triage workflow passes with minor drill-down and backend gaps. |
| 8 | Geofences | Completed | CRUD workflow passes with event-history and backend persistence gaps. |
| 9 | Analytics | Completed | Analytics workflow passes with minor context-preservation and backend-intelligence gaps. |
| 10 | Route Performance | Completed | Corridor comparison workflow passes with minor drill-down and intelligence-layer gaps. |
| 11 | Driver Behavior | Completed | Driver scorecard workflow passes with minor drill-down and intelligence-layer gaps. |

## Screen 1: Dashboard

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/TrackTraceDashboard.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingSummaryCards.tsx`
- `frontend-main/modules/track-trace-web/src/components/SelectedTripInsightCard.tsx`
- `frontend-main/modules/track-trace-web/src/components/LiveMapPanel.tsx`

### Workflow Checklist

| Workflow | Status | Notes |
|---|---|---|
| Dashboard loads in V2 | Pass | Uses `DashboardSkeleton` while loading and `EmptyPlaceholder` on error. |
| Primary hero actions navigate | Pass | `Open active trips` routes to `/trips`; `Open live map` routes to `/live-map`. |
| Operator action cards navigate | Pass | Alerts, Trips, and Analytics shortcuts are real links. |
| Critical KPI strip is visible | Pass | V2 shows urgent metrics only through `TrackingSummaryCards section="urgent"`. |
| Active trips preview is bounded | Pass | Dashboard uses `previewMode`, so the 5-row preview is intentional here. |
| Selecting a trip updates dashboard context | Pass | `setSelectedTripId` updates selected-trip insight, alert selection, and map focus. |
| Selected trip can open detail | Pass | `SelectedTripInsightCard` links to the selected trip detail page. |
| Selected trip can open live map | Pass | `SelectedTripInsightCard` links to the live map page. |
| Alert cards affect selected trip | Pass | Dashboard alert cards can call `onSelectTrip`. |
| Severity pills navigate | Partial | Pills link to Alerts, but do not pass severity as URL state/query. |
| Map panel fallback exists | Pass | Missing Google Maps key shows a clear placeholder instead of breaking layout. |
| Empty active-trip state exists | Pass | Empty state links to `/trips`. |
| Empty alert state exists | Pass | Empty state links to `/alerts`. |

### Expected Outcome

The Dashboard is usable as the operational entry point. It supports the main V2 flow:

Dashboard -> Active Trips -> Trip Detail

Dashboard -> Live Map

Dashboard -> Alerts

Dashboard -> Analytics

### Functional Gaps

- Severity links do not preserve filter intent. Clicking `critical`, `high`, `medium`, or `low` lands on the Alerts page without applying that severity.
- Dashboard still exposes several workspace shortcuts. This is acceptable for validation, but Phase 2 should continue trimming non-core navigation from the primary operator dashboard.

### UX Gaps

- The page has several navigation surfaces: hero actions, operator actions, detailed workspaces, selected-trip actions, alert pills. This is powerful, but may feel busy.
- The Dashboard copy is still explanatory in places. Phase 2 should reduce instructional text once workflows are validated.

### Backend/API Gaps

- Dashboard data depends on `TrackingStoreProvider`.
- Core dashboard/trip APIs are partially prepared for real API mode via `VITE_USE_MOCK_TRACKING` and `VITE_TRACKING_API_BASE_URL`.
- Live updates currently rely on the mock socket emitter unless a real websocket/SSE contract replaces it.

### Role Relevance

| Role | Dashboard relevance | Validation note |
|---|---|---|
| Control Tower | High | Keep as primary landing page. |
| Tenant Admin | High | Useful for operational overview. |
| Platform Admin | Medium | May need cross-tenant aggregation later. |
| Fleet Operator | High | Useful, but internal governance shortcuts should remain hidden by access gates. |
| Vendor | Medium/Low | Validate whether vendor should see dashboard or go directly to assigned trips. |
| Customer | Low | Validate whether customer should bypass internal dashboard and use customer-safe preview only. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | V2 dashboard structure, urgent KPI strip, selected-trip insight, alert preview, map context, loading/error states. |
| Improve | Add severity query params or state when clicking alert severity pills. |
| Simplify later | Reduce duplicate navigation surfaces and explanatory copy. |
| Remove later only if validated | Additional non-core quick links from operator dashboard if they are not part of the daily control-tower workflow. |

### Dashboard Outcome

Dashboard validation is complete for Phase 1. No blocking UI defect found. Continue to Active Trips validation next.

## Screen 2: Active Trips

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/ActiveTripsPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/ActiveTripsTable.tsx`
- `frontend-main/modules/track-trace-web/src/types/tracking.types.ts`
- `frontend-main/modules/track-trace-web/src/store/trackingMockData.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Page loads with V2 health banner | Pass | Uses `TrackingDataHealthBanner` in V2 and `ListPageSkeleton` while loading. |
| Sticky filter panel exists | Pass | Filter card uses `trackTraceV2StickyPanelClassName` in V2. |
| Search works for expected fields | Pass | Searches trip ID, booking ID, vehicle number, and customer name. |
| Status filter works | Partial | Works for listed options, but not every `TrackingStatus` type is listed. |
| Delay filter works | Pass | Supports `All`, `Delayed`, and `On Time` based on `delayMinutes`. |
| Reset filters clears state | Pass | Clears search, status, and delay filter; page resets through filter-change effect. |
| Pagination shows full queue | Pass | Page uses `paginatedTrips`; `ActiveTripsTable` receives no `previewMode` here. |
| Dashboard 5-row bug remains fixed | Pass | Row slicing is controlled by `previewMode`, and Active Trips does not pass it. |
| Mobile card layout keeps data | Pass | `showMobileCards` controls layout only; it does not slice rows. |
| Trip detail routing works | Pass | Row action links to `/trips/:tripId`. |
| Empty state exists | Pass | Empty state appears when filters exclude all rows and includes reset action. |
| Recent trip events render | Pass | Events render in a scrollable list with readable trip and timestamp context. |

### Expected Outcome

The Active Trips page is usable as the main operational queue. It supports the expected flow:

Dashboard -> Active Trips -> Trip Detail

Active Trips -> filtered queue review -> Trip Detail

### Functional Gaps

- Status filter options exclude valid `TrackingStatus` values: `Scheduled`, `At Checkpoint`, `At Destination`, and `Unloading`. This is not visible in the current mock data, but real backend data could contain those statuses and become impossible to select directly.
- Search does not include driver name, origin, destination, or last location. Current placeholder does not promise those fields, so this is an enhancement rather than a defect.

### UX Gaps

- The V2 helper sentence under the filter panel is informational but not necessary once users understand the page. Consider removing or shortening it in Phase 2.
- The status dropdown is a long list. If more statuses are added, consider grouping or replacing with status chips for the highest-frequency operational states.

### Backend/API Gaps

- Filtering and pagination are currently frontend-side after the store loads `activeTrips`.
- `getActiveTrips(filters)` can accept basic filters in mock/API service code, but `TrackingStoreProvider` currently loads all active trips and the page filters locally.
- For production scale, this page needs backend/server-side pagination, search, status, and delay query alignment.

### Role Relevance

| Role | Active Trips relevance | Validation note |
|---|---|---|
| Control Tower | High | Keep as core queue. |
| Tenant Admin | High | Keep for operational visibility. |
| Platform Admin | Medium | May need tenant filter in backend-backed version. |
| Fleet Operator | High | Keep; likely one of the most relevant screens. |
| Vendor | High if scoped | Must show only assigned trips/vehicles. |
| Customer | Low | Customer should likely use customer-safe preview instead of internal queue. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | V2 health banner, sticky filters, pagination, mobile card fallback, trip detail action, recent events panel. |
| Improve | Add missing status options or derive options from `TrackingStatus`/backend enum. |
| Improve later | Add driver/origin/destination/location search if operators need broader search. |
| Simplify later | Remove or shorten the explanatory V2 helper sentence below filters. |
| Do not remove | Active Trips is a core Track and Trace workflow. |

### Active Trips Outcome

Active Trips validation is complete for Phase 1. No blocking UI defect found. Continue to Trip Detail validation next.

## Screen 3: Trip Detail

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/TripDetailsPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/ETAWidget.tsx`
- `frontend-main/modules/track-trace-web/src/components/RouteProgress.tsx`
- `frontend-main/modules/track-trace-web/src/components/TripInfoPanel.tsx`
- `frontend-main/modules/track-trace-web/src/components/TripTimeline.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingAlertCard.tsx`
- `frontend-main/modules/track-trace-web/src/components/shared/Breadcrumb.tsx`
- `frontend-main/modules/track-trace-web/src/services/predictionApi.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Trip detail loads from `/trips/:tripId` | Pass | Looks up the trip from `activeTrips` and shows detail content when found. |
| Missing or unknown trip ID has error state | Pass | Missing `tripId` and unknown trips render `EmptyPlaceholder`. |
| Breadcrumb returns to Active Trips | Pass | Breadcrumb links `Tracking` and `Active Trips` back to `/trips`. |
| V2 primary action changes by trip condition | Pass | Problem trips prioritize Live Map; trips with alerts can prioritize Replay; otherwise Customer Preview. |
| Back to active trips preserves selected trip | Pass | Back link calls `setSelectedTripId(trip.id)`. |
| Overview cards show key state | Pass | Status, location, ETA, and exception load are visible in V2. |
| ETA widget renders delay context | Partial | Shows delivery ETA, scheduled delivery, delay, and distance, but main value uses `trip.eta` instead of `currentEta`. |
| Predictive risk card handles available data | Pass | Renders only when `getDelayRiskScore` returns data. |
| Predictive risk card handles unavailable data | Partial | Missing risk data silently hides the card; no neutral unavailable state. |
| Route progress renders movement | Pass | Progress percentage and checkpoints are shown. |
| Trip info panel renders metadata | Pass | Shows trip, booking, customer, vehicle, driver, origin, destination, status, and location fields. |
| Customer-safe status is visible | Pass | Customer-facing status has a dedicated card. |
| Investigation shortcut anchors work | Pass | V2 anchor chips target overview, route, timeline, and alerts sections. |
| Timeline renders trip events | Pass | Events are sorted newest-first and rendered in `TripTimeline`. |
| Timeline empty state exists | Gap | `TripTimeline` has no empty state if a trip has no matching events. |
| Trip alert panel renders related alerts | Pass | Related alerts render through `TrackingAlertCard`; no-alert state links to Alerts. |
| Links to Live Map, Replay, Customer Preview, and Alerts work | Pass | Hero and empty-state actions route to the expected screens. |

### Expected Outcome

Trip Detail is usable as the primary investigation surface. It supports the expected flow:

Active Trips -> Trip Detail -> Live Map

Trip Detail -> Trip Replay

Trip Detail -> Customer Preview

Trip Detail -> Alerts

### Functional Gaps

- `ETAWidget` uses `trip.eta` as the large headline value while the V2 overview card uses `trip.currentEta ?? trip.eta`. If backend sends recalculated ETA, the widget may show a stale planned/current value mismatch.
- `TripTimeline` does not render an empty state. If a real trip has no events yet, the card will show only a heading and blank space.
- Risk scoring is mock-based and tied to `predictionApi.ts`; missing risk data simply removes the card. This is acceptable for now but should be explicit once backend prediction scope is decided.

### UX Gaps

- Hero actions in V2 can still become a wide button cluster because the primary action is shown plus all secondary destinations. Consider tightening this in Phase 2 after validating operator preference.
- The customer-safe status copy still references a future `/public/track/{trackingToken}` flow. That wording should be hidden or rephrased before production if the public route is not implemented.
- Trip info panel is dense and includes driver mobile. This is appropriate for internal roles, but should never leak into customer-safe views.

### Backend/API Gaps

- Trip Detail currently depends on the already-loaded `activeTrips` store. Direct navigation to `/trips/:tripId` only works if the trip is present in the loaded store.
- `trackingApi.ts` has `getTripById` and `getTripTimeline`, but `TripDetailsPage` does not use them directly.
- Prediction data is mock-only through `predictionApi.ts`.
- Timeline and alert relationships are derived from store arrays, not fetched per trip.

### Role Relevance

| Role | Trip Detail relevance | Validation note |
|---|---|---|
| Control Tower | High | Keep as core investigation workspace. |
| Tenant Admin | High | Keep for tenant operational review. |
| Platform Admin | Medium | Needs tenant context and cross-tenant safeguards later. |
| Fleet Operator | High | Keep, especially route/source/driver context. |
| Vendor | High if scoped | Must show only assigned trip details and permitted driver/customer data. |
| Customer | Low/Internal version not suitable | Customer should use Customer Preview/public tracking, not this internal detail page. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Breadcrumbs, V2 investigation guide, overview cards, route progress, related alerts, links to Live Map/Replay/Customer Preview. |
| Improve | Change `ETAWidget` headline to `trip.currentEta ?? trip.eta` and label it clearly as current ETA. |
| Improve | Add an empty state to `TripTimeline`. |
| Improve later | Fetch trip detail/timeline by route ID for direct URL reliability. |
| Simplify later | Reduce hero action cluster if operators prefer one primary action plus a compact overflow/secondary group. |
| Do not remove | Trip Detail is a core Track and Trace investigation workflow. |

### Trip Detail Outcome

Trip Detail validation is complete for Phase 1. No blocking UI defect found. Continue to Live Map validation next.

## Next Screen: Live Map

### Validation Checklist

## Screen 4: Live Map

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/LiveMapPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/LiveMapPanel.tsx`
- `frontend-main/modules/track-trace-web/src/components/VehicleMarker.tsx`
- `frontend-main/modules/track-trace-web/src/store/trackingStore.tsx`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Live Map loads from `/live-map` | Pass | Uses `MapPageSkeleton` while loading and `EmptyPlaceholder` on page-level error. |
| V2 filter panel is sticky | Pass | Uses `trackTraceV2StickyPanelClassName`. |
| Active/delayed/offline/deviation/fallback filters work | Pass | Filter predicates are present for each toggle. |
| Reset filters clears non-default state | Pass | Clears delayed, offline, deviation, and fallback filters; leaves `showActiveOnly` at its default `true`. |
| Selected trip defaults correctly | Pass | If the previous selected trip drops out of scope, selection now moves to the first visible filtered trip. |
| Empty state appears when no trips match filters | Pass | Map panel already had an empty state; marker rail now also shows a compact empty state. |
| Missing Google Maps API key is safe | Pass | Live map shell shows a clear placeholder instead of breaking. |
| Map panel renders V2 selected-trip workbench | Pass | Selected-trip summary, ETA, checkpoints, and recent geofence activity are shown in-panel in V2. |
| Vehicle marker cards select map focus | Pass | Marker cards call `setSelectedTripId` and update focus state. |
| V1 side panel remains hidden in V2 | Pass | The old side panel only renders when `version !== 'v2'`. |
| Live map data health is visible | Pass | V2 passes `showHealthBanner` into `LiveMapPanel`. |
| Geofence events render where available | Pass | Recent geofence activity is shown for the selected trip when present. |
| Backend/socket/mock dependencies are clear | Pass | Page depends on store-fed trips and the mock/realtime socket layer. |

### Expected Outcome

Live Map is usable as the geographic investigation workspace. It supports the expected flow:

Dashboard -> Live Map

Trip Detail -> Live Map

Live Map -> trip switching -> focused route investigation

### Functional Gaps

- Live Map filters are still entirely client-side after the store loads all trips.
- Filter state is local/store-only and is not reflected in URL parameters, so it is not shareable or restorable via deep link.
- `tripOptions` in `LiveMapPanel` is capped at 6 for the in-map focus chips, which is acceptable for quick switching but not a full navigation substitute.

### UX Gaps

- The helper copy under the filter bar can likely be shortened in Phase 2 once the behavior is familiar.
- The page has both the in-map selected-trip workbench and the right-rail marker list. This is useful, but the marker rail should stay visually lean to avoid competing with the map itself.

### Backend/API Gaps

- `liveVehicles` currently mirrors `activeTrips` from the shared store.
- Live updates still depend on the mock socket emitter and polling fallback in `TrackingStoreProvider`.
- Google Maps rendering depends on `VITE_GOOGLE_MAPS_API_KEY`; without it, this page is a placeholder shell.

### Role Relevance

| Role | Live Map relevance | Validation note |
|---|---|---|
| Control Tower | High | Keep as primary geographic investigation tool. |
| Tenant Admin | High | Useful for tenant-wide visibility and exception investigation. |
| Platform Admin | Medium | May need cross-tenant controls later. |
| Fleet Operator | High | Likely one of the highest-value screens for this role. |
| Vendor | Medium if scoped | Must be restricted to assigned vehicles/trips only. |
| Customer | Low | Internal map is not appropriate for customer-facing use. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Sticky filters, V2 in-map workbench, health banner, map placeholder fallback, marker rail. |
| Improve | Persist/share filter state through URL or route state if operators need resumable drill-downs. |
| Improve | Move backend filtering server-side when real trip volume grows. |
| Simplify later | Reduce helper copy and keep the marker rail focused on selection, not explanation. |
| Do not remove | Live Map is a core Track and Trace workspace. |

### Live Map Outcome

Live Map validation is complete for Phase 1. No blocking UI defect found. Continue to Trip Replay validation next.

## Next Screen: Trip Replay

### Validation Checklist

## Screen 5: Trip Replay

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/TripReplayPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/ReplayMapPanel.tsx`
- `frontend-main/modules/track-trace-web/src/components/ReplayTimeline.tsx`
- `frontend-main/modules/track-trace-web/src/services/trackingApi.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Trip Replay loads from `/trips/:tripId/replay` | Pass | Replay data is loaded by route param using `getTripReplay(tripId)`. |
| Missing or unknown trip ID has safe error state | Pass | Missing `tripId` and missing replay data both render `EmptyPlaceholder`. |
| Breadcrumb returns to Trip Detail and Active Trips | Pass | Breadcrumb links back to `/trips` and `/trips/:tripId`. |
| V2 replay header shows key replay context | Pass | Duration, distance, idle, and alert counts are shown in the header and KPI strip. |
| Replay map panel renders route playback context | Partial | Panel renders replay summary and foundation state, but not true map playback yet. |
| Replay timeline renders replay events clearly | Pass | Events render in a simple, readable list. |
| Replay timeline empty state exists | Pass | Added a compact empty state when `replay.events` is empty. |
| V2 anchor chips target map and timeline | Pass | Anchor chips link to `#replay-map` and `#replay-timeline`. |
| `Open live map` action appears only in V2 | Pass | V2 shows the additional live map CTA; V1 does not. |
| Placeholder playback controls are honest | Pass | Replaced button-like false affordances with non-interactive status pills. |
| Empty or missing replay data is handled safely | Pass | Error and no-data states are safe. |
| Backend/mock dependency is documented | Pass | Replay data comes from `trackingApi.ts`, which is mock-backed unless real API mode is enabled. |

### Expected Outcome

Trip Replay is usable as a replay review surface, but it is still closer to a structured playback foundation than a full interactive replay tool.

It supports the expected flow:

Trip Detail -> Trip Replay

Trip Replay -> Trip Detail

Trip Replay -> Live Map

### Functional Gaps

- `ReplayMapPanel` is still a placeholder surface. It does not render a real synchronized replay map, path animation, or playback position controls.
- The page depends entirely on `getTripReplay(tripId)` rather than reusing store state, which is fine for route loading but still mock-backed today.

### UX Gaps

- The page is clear, but the map half still feels like a scaffold rather than a finished operational tool.
- Replay map and timeline are visually credible now, but true operator value will come only when map playback is implemented.

### Backend/API Gaps

- `getTripReplay` is mock-backed in `trackingApi.ts` unless real API mode is enabled.
- Replay data currently derives from mock trip and event data, not a dedicated replay service with sampled playback state.

### Role Relevance

| Role | Trip Replay relevance | Validation note |
|---|---|---|
| Control Tower | High | Useful for post-incident reconstruction and investigation. |
| Tenant Admin | Medium/High | Useful for auditing and exception review. |
| Platform Admin | Medium | Relevant mainly for governance/debugging use cases. |
| Fleet Operator | High | Valuable for route reconstruction and driver-event review. |
| Vendor | Medium if scoped | Useful only for assigned trips and approved post-trip review. |
| Customer | Low | Internal replay should not be customer-facing. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Breadcrumbs, V2 replay summary strip, KPI cards, route/timeline split, live map shortcut. |
| Improve | Replace the replay map placeholder with actual route playback when backend/API support exists. |
| Improve | Add timeline-to-map sync once playback controls are implemented. |
| Simplify later | Keep placeholder language tight so the page does not over-promise unfinished playback behavior. |
| Do not remove | Trip Replay remains valuable for investigation and audit workflows. |

### Trip Replay Outcome

Trip Replay validation is complete for Phase 1. No blocking UI defect found. Continue to Customer Preview validation next.

## Next Screen: Customer Preview

### Validation Checklist

## Screen 6: Customer Preview

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/CustomerTrackingPreviewPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/CustomerTrackingCard.tsx`
- `frontend-main/modules/track-trace-web/src/services/customerTrackingApi.ts`
- `frontend-main/modules/track-trace-web/src/services/trackingSettingsApi.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Customer Preview loads from `/customer-preview/:tripId` | Pass | Loads both customer-safe tracking data and visibility rules. |
| Missing or unknown trip ID has safe error state | Pass | Missing `tripId` and unavailable preview both render `EmptyPlaceholder`. |
| Breadcrumb returns to Trip Detail and Active Trips | Pass | Breadcrumb supports both return paths. |
| V2 visibility framing is clear | Pass | V2 explains visible vs hidden customer-safe fields in a dedicated framing section. |
| Visible and hidden fields are understandable | Pass | Customer visibility fields are translated into human-readable labels. |
| Customer tracking card reflects visibility rules | Pass | ETA, delay, location visibility, POD status, and public timeline honor visibility flags. |
| Preview checklist content is useful | Pass | Checklist is relevant and compact enough for review. |
| Empty or missing preview data is handled safely | Pass | Error handling is clear. |
| Backend/mock dependency is documented | Pass | Both preview data and visibility rules are currently mock-backed services. |

### Expected Outcome

Customer Preview is usable as a customer-safe visibility review surface. It supports the expected flow:

Trip Detail -> Customer Preview

Customer Preview -> Trip Detail


### Functional Gaps

- The customer-safe preview is still derived from internal mock trip/event data rather than a dedicated external/public tracking contract.
- `CustomerTrackingCard` does not yet show an explicit empty state if `publicTimeline` is allowed but empty; it simply renders no timeline entries.

### UX Gaps

- The V2 framing is helpful, but some of the checklist and explanatory copy can likely be shortened once the governance workflow is familiar.
- The preview still references a future external/public tracking behavior indirectly rather than a fully defined share flow.

### Backend/API Gaps

- `getCustomerSafeTracking(tripId)` is mock-backed via `customerTrackingApi.ts`.
- Visibility rules come from the mock `trackingSettingsApi.ts` store.
- There is no separate public-token or share-link contract in this screen yet.

### Role Relevance

| Role | Customer Preview relevance | Validation note |
|---|---|---|
| Control Tower | High | Useful before sharing or troubleshooting a customer-facing view. |
| Tenant Admin | High | Useful for governance and visibility-policy review. |
| Platform Admin | Medium | Useful for policy oversight more than daily operations. |
| Fleet Operator | Medium | Useful when coordinating customer-facing visibility during trip issues. |
| Vendor | Medium if scoped | Useful only if vendor workflows include customer-visibility review. |
| Customer | This internal preview page is not the customer experience | Customers should see a separate public/share-safe tracking surface, not this internal review screen. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Human-readable visibility labels, V2 visible/hidden framing, customer-safe card, trip-detail return path. |
| Improve | Add a compact empty state for allowed-but-empty public timeline data. |
| Improve | Replace future-facing/public-flow wording with production-safe copy once the public route is defined. |
| Simplify later | Trim some explanatory text in the checklist and framing panels. |
| Do not remove | Customer Preview is useful as a governance and pre-share review tool. |

### Customer Preview Outcome

Customer Preview validation is complete for Phase 1. No blocking UI defect found. Continue to Alerts validation next.

## Next Screen: Alerts

### Validation Checklist

## Screen 7: Alerts

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/TrackingAlertsPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/AlertActionPanel.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingAlertCard.tsx`
- `frontend-main/modules/track-trace-web/src/store/trackingStore.tsx`
- `frontend-main/modules/track-trace-web/src/services/alertApi.ts`
- `frontend-main/modules/track-trace-web/src/types/alert.types.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Alerts page loads from `/alerts` | Pass | Uses `ListPageSkeleton` while loading and `EmptyPlaceholder` on error. |
| Search works across key alert fields | Pass | Matches trip ID, vehicle number, location, type, message, and assignee. |
| Severity, status, and sort all work | Pass | Filtering and ordering behave correctly for the current queue. |
| Dashboard severity links land with correct initial filter state | Pass | `?severity=` handoff is honored on page load. |
| Severity pill toggles work inside the Alerts page | Pass | Chips can apply and clear severity focus directly in the queue. |
| Severity chips remain useful after severity filtering | Pass | Phase 2 refinement now keeps chip counts based on search/status scope instead of collapsing the entire overview into the active severity. |
| Pagination works across filtered alerts | Pass | `PaginationStrip` paginates the filtered queue correctly. |
| Alert cards remain readable in V2 compact mode | Pass | Severity/status badges, trip context, location, timestamps, and latest remark remain legible. |
| Alert action panel supports acknowledge, assign, remark, and resolve flows | Pass | Action handlers are wired to store mutations and update visible card state. |
| Action panel avoids misleading repeat actions | Pass | Phase 2 refinement now disables acknowledge/resolve buttons once the alert is already acknowledged or resolved. |
| Empty filtered state is clear and resettable | Pass | Reset action clears search, filters, and sort state. |
| Geofence follow-up path exists | Pass | Hero action links directly to `/geofences`. |
| Backend/mock action behavior is documented | Pass | Current alert loading and workflow mutations are still mock/local-state backed. |

### Expected Outcome

Alerts is usable as the main triage workspace for operational exceptions. It supports the expected flow:

Dashboard -> Alerts -> alert triage

Alerts -> acknowledge / assign / remark / resolve

Alerts -> Geofences

### Functional Gaps

- The queue does not yet offer a direct drill-down from each alert into `Trip Detail` or `Live Map`. Operators can triage the alert itself, but must navigate elsewhere manually to investigate trip context.
- Alert action history is not surfaced in the UI even though `TrackingAlertRecord` already has an `auditTrail` shape prepared.
- Search does not include resolution notes or historical remarks. This is acceptable for now, but may matter once real alert histories become longer.

### UX Gaps

- The page still carries explanatory hero/filter copy that can likely be shortened after the workflow is familiar.
- The card plus action-panel stack is clear, but it is tall. At higher alert volume, density may become a concern unless quick investigation links or expandable rows reduce movement cost.

### Backend/API Gaps

- `TrackingStoreProvider` loads all alerts and the page filters/sorts/paginates locally.
- `alertApi.ts` returns mock rows when `VITE_USE_MOCK_TRACKING` is enabled and returns an empty list when it is not, so non-mock mode is not production-ready yet.
- Acknowledge, assign, resolve, and remark calls currently return echo-style mock responses and update frontend state locally.
- No backend query contract exists yet for server-side pagination, free-text search, or ownership-based filtering.

### Role Relevance

| Role | Alerts relevance | Validation note |
|---|---|---|
| Control Tower | High | Core triage surface; keep. |
| Tenant Admin | High | Useful for exception oversight and escalation management. |
| Platform Admin | Medium | Relevant mainly for governance or cross-tenant support views. |
| Fleet Operator | High | Valuable if scoped to owned/assigned lanes and assets. |
| Vendor | Medium if scoped | Useful only if restricted to vendor-owned trips and exception responsibility. |
| Customer | Low | Customers should not use the internal alert queue. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Triage-first layout, severity chips, pagination, compact alert cards, resettable filtered empty state, action panel. |
| Improve | Add direct drill-down from alerts into Trip Detail and/or Live Map. |
| Improve | Surface alert audit history once backend mutation history is defined. |
| Simplify later | Shorten explanatory copy in the hero and filter summary text. |
| Do not remove | Alerts is one of the core Track and Trace operational workflows. |

### Alerts Outcome

Alerts validation is complete for Phase 1. No blocking UI defect found. Continue to Geofences validation next.

## Next Screen: Geofences

### Validation Checklist

## Screen 8: Geofences

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/GeofenceManagementPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/GeofenceForm.tsx`
- `frontend-main/modules/track-trace-web/src/components/GeofenceList.tsx`
- `frontend-main/modules/track-trace-web/src/services/geofenceApi.ts`
- `frontend-main/modules/track-trace-web/src/types/geofence.types.ts`
- `frontend-main/modules/track-trace-web/src/store/trackingStore.tsx`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Geofences page loads from `/geofences` | Pass | Uses `ListPageSkeleton` while loading and `EmptyPlaceholder` on error. |
| Geofence list/table is readable in V2 | Pass | Desktop table and mobile cards both keep the important fields visible. |
| Search, type, and state filters work | Pass | Filters narrow the current in-memory list as expected. |
| Create geofence flow works | Pass | Draft form, validation, and create action are wired. |
| Edit geofence flow works | Pass | Existing records can be loaded back into the form and updated. |
| Save failures preserve draft state | Pass | Phase 2 refinement now awaits create/update and keeps the form open if saving fails. |
| Radius validation matches service limits | Pass | Phase 2 refinement now aligns form validation with the service maximum of 5000 meters. |
| Spatial preview degrades safely | Pass | Phase 2 refinement now shows a fallback message if the external static map preview cannot load. |
| Enable/disable toggle works | Pass | Toggle action updates visible state correctly. |
| Delete flow works and handles confirmation safely | Pass | Modal confirmation prevents accidental deletion. |
| Entry/exit event history is visible if present | Gap | The page does not surface `geofenceEvents`, even though the store and map workspace track them. |
| Empty state and filtered empty state are clear | Pass | Both first-run and no-match states provide sensible next actions. |
| Backend/mock geofence persistence is documented | Pass | Current geofence CRUD is still mock/in-memory only. |

### Expected Outcome

Geofences is usable as the operational configuration surface for spatial triggers. It supports the expected flow:

Alerts -> Geofences

Geofences -> create / edit / disable / delete

### Functional Gaps

- The page does not expose recent geofence entry/exit history even though `geofenceEvents` already exists in the store and is visible in the map workflow.
- There is no validation against duplicate names, overlapping zones, or broken linked-entity references yet. Current validation only covers required fields and numeric safety.

### UX Gaps

- The page carries a fair amount of explanatory copy for a CRUD workspace. Once users are comfortable, the helper copy could be tightened.
- Filter reset is available when no matches are returned, but there is no always-visible reset action in the normal list state.

### Backend/API Gaps

- `geofenceApi.ts` is a pure in-memory mock service with no non-mock API branch yet.
- Geofence CRUD mutations update local state only; there is no persistence contract, optimistic error recovery, or reload from a real backend.
- The static map preview relies on an external image endpoint rather than a product-owned preview service or local map component.

### Role Relevance

| Role | Geofences relevance | Validation note |
|---|---|---|
| Control Tower | High | Useful for managing trigger zones tied to operational exceptions. |
| Tenant Admin | High | Useful for configuration and governance. |
| Platform Admin | Medium | Relevant for support, standards, and tenant oversight. |
| Fleet Operator | Medium/High | Useful where operators are responsible for checkpoint and yard accuracy. |
| Vendor | Low unless explicitly delegated | Should be scoped carefully if vendors can edit trigger zones. |
| Customer | Low | Customers should not manage internal trigger geometry. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | V2 list/form split, validation guide, mobile fallback, confirmation modal, create/edit/toggle/delete workflow. |
| Improve | Surface recent geofence events or linked trigger history in the page. |
| Improve | Add linked-entity validation and duplicate/overlap checks once backend rules are defined. |
| Simplify later | Shorten helper copy and consider an always-visible filter reset affordance. |
| Do not remove | Geofences is a meaningful configuration submodule for Track and Trace. |

### Geofences Outcome

Geofences validation is complete for Phase 1. No blocking UI defect found. Continue to Analytics validation next.

## Next Screen: Analytics

### Validation Checklist

## Screen 9: Analytics

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/TrackingAnalyticsPage.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingAnalyticsTuningPanel.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingDelayTrendCard.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingTripStatusDonutCard.tsx`
- `frontend-main/modules/track-trace-web/src/components/TrackingAlertSeverityCard.tsx`
- `frontend-main/modules/track-trace-web/src/services/analyticsApi.ts`
- `frontend-main/modules/track-trace-web/src/services/predictionApi.ts`
- `frontend-main/modules/track-trace-web/src/types/analytics.types.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Analytics page loads from `/analytics` | Pass | Uses `AnalyticsPageSkeleton` while loading and `EmptyPlaceholder` on page-level failure. |
| Feature/permission gating works | Pass | Restricted roles see `FeatureAccessNotice` instead of the workspace. |
| Core filters affect cards and charts consistently | Pass | Phase 2 refinement now keeps the top operational-signal panel aligned with the current analytics date scope. |
| Time-window presets behave like real presets | Pass | Phase 2 refinement now applies the selected `7D/14D/30D` range directly instead of becoming inert behind manual dates. |
| KPI strip is understandable and role-relevant | Pass | Summary metrics are readable and focus-aware without blocking the rest of the page. |
| Delay, severity, and status charts handle no-data safely | Pass | Delay trend, status split, and alert severity components already include empty/error states. |
| Exception analytics handles empty scope clearly | Pass | Phase 2 refinement now shows an explicit empty state instead of a blank table. |
| Predicted-risk list handles empty scope clearly | Pass | Phase 2 refinement now shows an explicit empty state instead of a silent empty card. |
| Drill-down links from analytics to operational pages are meaningful | Partial | Top links are real, and Phase 2 refinement added direct Trip Detail drill-downs from risk rows, but the page still does not preserve filter context when navigating out. |
| Mock/intelligence-layer limitations are documented | Pass | Analytics and prediction services are still mock/intelligence-layer only. |

### Expected Outcome

Analytics is usable as a decision-support layer above the operational queue. It supports the expected flow:

Dashboard -> Analytics

Analytics -> Trips

Analytics -> Alerts

Analytics -> Trip Detail (from predicted-risk rows)

### Functional Gaps

- Cross-page drill-downs do not preserve analytics filter context. For example, opening Trips or Alerts from Analytics does not carry the active date/focus state into the destination workspace.
- Exception analytics remains read-only; there is no direct jump from an exception type row into the matching filtered alert queue.
- The page exposes date and focus controls only, even though the analytics types/services already hint at additional filter dimensions such as customer, vehicle, driver, lane, region, and tenant.

### UX Gaps

- The page is dense but mostly coherent. The main remaining friction is that multiple insight sections sit at the same visual level, so the “what should I act on first?” cue still depends on user judgment.
- Supporting copy can be tightened later once users are familiar with the analytics workspace.

### Backend/API Gaps

- `analyticsApi.ts` and `predictionApi.ts` are mock-backed intelligence layers, not real backend analytics contracts.
- Summary, trend, severity, and exception results are generated from mock datasets in-process.
- There is no server-side query contract yet for filterable analytics, exported views, or drill-down handoff into operational queues.

### Role Relevance

| Role | Analytics relevance | Validation note |
|---|---|---|
| Control Tower | High | Useful for prioritizing intervention and reading network pressure. |
| Tenant Admin | High | Useful for service and exception oversight. |
| Platform Admin | Medium | Relevant for governance and cross-tenant support more than minute-to-minute execution. |
| Fleet Operator | Medium/High | Valuable if operators are expected to work from trend/risk context before queue triage. |
| Vendor | Low/Medium if scoped | Useful only if the analytics view is narrowed to vendor-owned trips and responsibilities. |
| Customer | Low | This internal analytics workspace should not be customer-facing. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Focus-aware KPI strip, top filter controls, delay trend, trip status split, alert severity view, predicted-risk list. |
| Improve | Preserve filter context when drilling into Trips or Alerts. |
| Improve | Add exception-row drill-down into matching alert queues. |
| Improve later | Surface more targeted filters only if operators actually need customer/vehicle/lane segmentation here. |
| Simplify later | Tighten explanatory copy once usage patterns are confirmed. |
| Do not remove | Analytics is a useful secondary workspace, even if not every role needs it as a daily landing page. |

### Analytics Outcome

Analytics validation is complete for Phase 1. No blocking UI defect found. Continue to Route Performance validation next.

## Next Screen: Route Performance

### Validation Checklist

## Screen 10: Route Performance

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/RoutePerformancePage.tsx`
- `frontend-main/modules/track-trace-web/src/services/analyticsApi.ts`
- `frontend-main/modules/track-trace-web/src/store/analyticsMockData.ts`
- `frontend-main/modules/track-trace-web/src/types/analytics.types.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Route Performance page loads from `/route-performance` | Pass | Uses `AnalyticsPageSkeleton` while loading and `EmptyPlaceholder` on page-level failure. |
| Feature/permission gating works | Pass | Restricted roles see `FeatureAccessNotice`. |
| Comparison mode changes row ranking | Pass | `Worst Delay`, `Best Efficiency`, and `All` change ordering as expected. |
| Filters affect summary and rows consistently | Pass | Phase 2 refinement now passes the current date filters into `getRoutePerformance()` instead of leaving the date inputs decorative. |
| Lane efficiency, delay, and deviation signals are understandable | Pass | Table and KPI strip communicate the main corridor metrics clearly enough for Phase 1. |
| Empty, loading, and no-data states are clear | Pass | Phase 2 refinement now shows an explicit empty state when the selected date range has no rows. |
| Drill-down or follow-up links are meaningful | Partial | Live Map and Active Trips links are real, but they do not preserve corridor context and there is no lane-level trip drill-down yet. |
| Mock/performance-intelligence limitations are documented | Pass | Route performance is still generated from mock trip data, not a real lane-analytics backend. |

### Expected Outcome

Route Performance is usable as a secondary corridor-comparison workspace. It supports the expected flow:

Analytics -> Route Performance

Route Performance -> Live Map

Route Performance -> Active Trips

### Functional Gaps

- The page has no lane-level drill-down into the trips currently creating corridor pressure.
- Comparison links do not preserve lane or date context when moving into Live Map or Active Trips.
- Sorting is limited to the three preset modes; there is no direct operator control for deviation count or planned-vs-actual variance.

### UX Gaps

- The top date inputs are now functional, but the page still reads as a ranked report rather than an investigation surface.
- Supporting copy can be tightened later, especially around the sticky helper text below the control bar.

### Backend/API Gaps

- `getRoutePerformance()` is still mock/intelligence-layer logic derived from local tracking data.
- There is no real backend lane-analytics contract, no persisted corridor definitions, and no server-side filtering/sorting.
- Lane rows are synthesized from trip origin/destination pairs rather than a durable route-performance domain model.

### Role Relevance

| Role | Route Performance relevance | Validation note |
|---|---|---|
| Control Tower | High | Useful for spotting bad corridors before queue triage. |
| Tenant Admin | High | Useful for lane reliability and service oversight. |
| Platform Admin | Medium | Relevant for cross-tenant support and standards review. |
| Fleet Operator | Medium/High | Useful where operators manage corridor-level execution quality. |
| Vendor | Low/Medium if scoped | Useful only if restricted to vendor-owned routes. |
| Customer | Low | Internal corridor analytics should not be customer-facing. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Ranked comparison modes, KPI strip, mobile card fallback, Live Map / Active Trips follow-up links. |
| Improve | Add lane-level drill-down into affected trips. |
| Improve | Preserve active date/lane context when navigating into operational pages. |
| Improve later | Add sortable corridor metrics beyond the three preset ranking modes. |
| Simplify later | Tighten helper copy once operators are comfortable with the workspace. |
| Do not remove | Route Performance remains a reasonable supporting intelligence page. |

### Route Performance Outcome

Route Performance validation is complete for Phase 1. No blocking UI defect found. Continue to Driver Behavior validation next.

## Next Screen: Driver Behavior

### Validation Checklist

## Screen 11: Driver Behavior

### Scope

Files reviewed:

- `frontend-main/modules/track-trace-web/src/pages/DriverBehaviorPage.tsx`
- `frontend-main/modules/track-trace-web/src/services/analyticsApi.ts`
- `frontend-main/modules/track-trace-web/src/store/analyticsMockData.ts`

### Validation Checklist

| Workflow | Status | Notes |
|---|---|---|
| Driver Behavior page loads from `/driver-behavior` | Pass | Uses `AnalyticsPageSkeleton` while loading and `EmptyPlaceholder` on page-level failure. |
| Feature/permission gating works | Pass | Restricted roles see `FeatureAccessNotice`. |
| Score/risk signals are understandable | Pass | KPI strip, focus chips, risk cards, and score table communicate the intended coaching priorities clearly enough for Phase 1. |
| Filters affect summary and rows consistently | Pass | Phase 2 refinement now passes date filters into `getDriverBehaviorScores()` instead of leaving them decorative. |
| Empty, loading, and no-data states are clear | Pass | Phase 2 refinement now adds an explicit empty table state for out-of-scope date ranges. |
| Drill-down or follow-up links are meaningful | Partial | The page links to Active Trips, and Phase 2 refinement added an execution shortcut on at-risk cards, but there is still no driver-specific drill-down or preserved context. |
| Mock/behavior-intelligence limitations are documented | Pass | Driver scoring remains mock-derived from trip state, not a real driver-telemetry or coaching backend. |

### Expected Outcome

Driver Behavior is usable as a coaching-oriented supporting workspace. It supports the expected flow:

Analytics -> Driver Behavior

Driver Behavior -> Active Trips

### Functional Gaps

- There is no driver-specific drill-down into trips, alerts, or incident history for the selected driver.
- Focus chips are limited to ranking presets; there is no direct filtering by GPS compliance, SOS, or route deviation risk.
- Navigation out of the page does not preserve the current coaching focus or date scope.

### UX Gaps

- The “needs attention” cards are useful, but they still act more like summaries than intervention workspaces.
- Supporting copy can be shortened later, especially once users recognize the difference between the cards and the score table.

### Backend/API Gaps

- `getDriverBehaviorScores()` is still mock/intelligence-layer logic synthesized from local trip data.
- There is no real driver-behavior backend contract, no driver identity domain integration, and no server-side filtering/sorting.
- The current scoring model is heuristic and not tied to a persisted coaching or compliance model.

### Role Relevance

| Role | Driver Behavior relevance | Validation note |
|---|---|---|
| Control Tower | Medium | Useful when driver risk affects operational execution. |
| Tenant Admin | Medium/High | Useful for oversight, coaching, and compliance review. |
| Platform Admin | Medium | Relevant for standards and support, not constant daily use. |
| Fleet Operator | High | Most directly relevant role for this workspace. |
| Vendor | Low/Medium if scoped | Useful only if vendors manage their own driver coaching. |
| Customer | Low | Internal driver scoring should not be customer-facing. |

### Keep / Improve / Simplify / Remove

| Recommendation | Items |
|---|---|
| Keep | Focus chips, KPI strip, at-risk card section, scorecard table, mobile card fallback. |
| Improve | Add driver-specific drill-down into trips or incident history. |
| Improve | Preserve focus/date context when navigating into execution pages. |
| Improve later | Add more risk-specific filters only if supervisors actually use them. |
| Simplify later | Tighten helper copy once the coaching workflow is familiar. |
| Do not remove | Driver Behavior is a reasonable supporting page for fleet-ops and admin roles. |

### Driver Behavior Outcome

Driver Behavior validation is complete for Phase 1. No blocking UI defect found. Phase 1 screen validation is complete.
