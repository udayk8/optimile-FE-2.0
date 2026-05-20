# Track and Trace Phase 2 Refinement

Last updated: 2026-05-13

## Goal

Phase 2 is the refinement pass. It focuses on low-risk usability, clarity, and workflow improvements without changing the module structure or rebuilding screens.

## Rules

- Preserve the current information architecture.
- Prefer small, validated fixes over broad redesign.
- Use Phase 1 findings to drive scope.
- Keep backend/API gaps documented separately from UI cleanup.

## Current Status

| Item | Status | Notes |
|---|---|---|
| Dashboard -> Alerts severity intent | Completed | Dashboard severity pills now open Alerts with severity query context. |
| Alerts initial severity state | Completed | Alerts page now honors incoming `?severity=` state on load. |
| Trip Detail ETA clarity | Completed | ETA widget now uses `currentEta ?? eta` and surfaces confidence. |
| Trip Detail timeline empty state | Completed | Timeline now shows a compact empty state when no events exist. |
| Active Trips status filter coverage | Completed | Added missing active-state options: `Scheduled`, `At Checkpoint`, `At Destination`, `Unloading`. |
| Live Map filtered-selection sync | Completed | Selected trip now re-syncs when filters remove the previous selection. |
| Live Map marker-rail empty state | Completed | Right rail now shows a compact empty state when no trips match filters. |
| Replay false affordance cleanup | Completed | Placeholder playback buttons were replaced with non-interactive status pills. |
| Replay timeline empty state | Completed | Timeline now shows a compact empty state when replay events are unavailable. |
| Customer Preview governance CTA cleanup | Completed | The customer preview no longer exposes a now-removed Settings shortcut. |
| Alerts severity chip overview counts | Completed | Severity chips now keep useful counts even after a severity filter is active. |
| Alerts status-aware action buttons | Completed | Repeated acknowledge/resolve actions are now visually de-emphasized once an alert is already in that state. |
| Geofence save reliability | Completed | The form now stays open and shows the error if create/update fails. |
| Geofence radius validation alignment | Completed | Form validation now matches the service-supported radius ceiling. |
| Geofence preview fallback | Completed | External static map preview failures now degrade gracefully. |
| Geofence mock ID generation | Completed | New geofence IDs now stay unique even after deletions. |
| Analytics scoped signal alignment | Completed | The operational-signal panel now uses the current analytics filter scope. |
| Analytics preset date behavior | Completed | Window chips now apply concrete date ranges instead of becoming ambiguous behind manual dates. |
| Analytics empty-state coverage | Completed | Exception analytics and predicted-risk cards now explain empty scopes clearly. |
| Analytics risk-row drill-down | Completed | Predicted-risk rows now link straight into Trip Detail. |
| Route Performance date-filter alignment | Completed | Date controls now affect the lane rows instead of acting as decorative inputs. |
| Route Performance empty-state coverage | Completed | The lane table now explains when the selected date range returns no rows. |
| Driver Behavior date-filter alignment | Completed | Date controls now affect driver score rows instead of acting as decorative inputs. |
| Driver Behavior empty-state coverage | Completed | The scorecard table now explains when the selected date range returns no rows. |
| Driver Behavior at-risk follow-up link | Completed | At-risk driver cards now offer a direct handoff into execution review. |

## Implemented In This Phase Start

### 1. Dashboard severity handoff

Problem:

- Dashboard severity pills navigated to Alerts, but did not preserve which severity the operator clicked.

Change:

- Dashboard severity links now navigate with `?severity=Critical|High|Medium|Low`.
- Alerts page reads the incoming severity query and initializes the filter accordingly.

Impact:

- Operators now land in a closer-to-intent triage state.

### 2. Trip Detail ETA clarity

Problem:

- `ETAWidget` used `trip.eta` as the main value, which could drift from `currentEta`.

Change:

- `ETAWidget` now uses `trip.currentEta ?? trip.eta`.
- Confidence is displayed directly below the ETA.

Impact:

- Trip Detail is more consistent with the rest of the page and better aligned to recalculated ETA behavior.

### 3. Trip timeline empty state

Problem:

- Trips with no events produced an empty timeline surface with no explanation.

Change:

- `TripTimeline` now renders a compact empty state when there are no events.

Impact:

- Operators get a clear “no data yet” message instead of a blank section.

### 4. Active Trips status filter coverage

Problem:

- The status dropdown excluded some valid active statuses.

Change:

- Added `Scheduled`, `At Checkpoint`, `At Destination`, and `Unloading` to the Active Trips status filter.

Impact:

- Real backend trip statuses are less likely to become unfilterable.

### 5. Live Map filtered-selection sync

Problem:

- When filters removed the currently selected trip, the page visually fell back to the first filtered trip but left the underlying selected-trip state stale.

Change:

- `LiveMapPage` now re-selects the first visible filtered trip when the previous selection drops out of scope.

Impact:

- Map focus, marker list, and downstream trip state stay aligned during filtering.

### 6. Live Map marker-rail empty state

Problem:

- If filters reduced the map scope to zero trips, the marker rail became an empty scroll area with only a count badge.

Change:

- Added a compact empty state to the right-rail marker section.

Impact:

- Operators now get clear feedback that the current filter combination removed all map-visible trips.

### 7. Replay false affordance cleanup

Problem:

- `ReplayMapPanel` displayed `Play / Pause` and `1x Speed` as real buttons even though playback interaction is not implemented yet.

Change:

- Replaced those button-looking controls with non-interactive status pills.

Impact:

- The replay page is more honest about its current capabilities and avoids implying broken controls.

### 8. Replay timeline empty state

Problem:

- Replay timelines with no events rendered as a blank card body.

Change:

- Added a compact empty state to `ReplayTimeline`.

Impact:

- Sparse replay history is now explained instead of looking incomplete.

### 9. Customer Preview governance CTA cleanup

Problem:

- The V2 Customer Preview page exposed a shortcut to a governance screen that no longer belongs in the active module.

Change:

- The obsolete governance shortcut was removed from the customer preview hero.

Impact:

- Customer Preview now stays focused on previewing external visibility instead of linking into removed internal governance UI.

### 10. Alerts severity chip overview counts

Problem:

- Severity chips were counted from the already severity-filtered queue, so once a severity was selected the other chips often collapsed to zero and stopped acting as a useful overview.

Change:

- Alerts now computes severity counts from the current search/status scope before the severity filter is applied.

Impact:

- Operators keep a better sense of cross-severity queue composition while drilling into one severity at a time.

### 11. Alerts status-aware action buttons

Problem:

- The action panel kept `Acknowledge` and `Resolve` looking equally actionable even when an alert was already acknowledged or resolved.

Change:

- Acknowledge is now disabled for acknowledged/resolved alerts.
- Resolve is now disabled for resolved alerts.
- Button labels now reflect the alert state more honestly.

Impact:

- The queue is clearer about what still needs action and avoids suggesting a broken or redundant workflow.

### 12. Geofence save reliability

Problem:

- The Geofence page closed the form immediately after create/update was triggered, even if the save failed.

Change:

- Geofence save is now awaited before the form closes.
- Save errors are shown inline and the draft stays intact.
- Save/reset buttons are disabled while the request is in flight.

Impact:

- Operators do not lose their draft when a validation or backend-style save error occurs.

### 13. Geofence radius validation alignment

Problem:

- The form only enforced a minimum radius, while the service also rejected radii above 5000 meters.

Change:

- The form now validates both the minimum and maximum supported radius values.

Impact:

- Users get immediate feedback before save instead of hitting a late service rejection.

### 14. Geofence preview fallback

Problem:

- The spatial preview depended on an external static map image and could degrade into a broken image when that request failed.

Change:

- The form now falls back to a clear preview-unavailable message when the map image cannot be loaded.

Impact:

- The geofence form remains trustworthy even when the preview service is unavailable.

### 15. Geofence mock ID generation

Problem:

- New geofence IDs were based on list length, which could create duplicate IDs after deletions.

Change:

- New mock IDs now use the highest existing numeric suffix plus one.

Impact:

- Create/delete cycles no longer risk duplicate IDs in the geofence list.

### 16. Analytics scoped signal alignment

Problem:

- The top operational-signal panel used all live alerts from the store, which could drift from the currently selected analytics date scope.

Change:

- The Analytics page now narrows that signal panel to the alerts that match the active analytics window and active trip scope.

Impact:

- The top summary signals now agree more closely with the rest of the analytics page.

### 17. Analytics preset date behavior

Problem:

- Once manual dates were entered, the `7D / 14D / 30D` chips no longer changed the effective range until the user cleared the dates.

Change:

- Preset chips now apply concrete from/to dates immediately.

Impact:

- The date presets behave like real reporting shortcuts instead of passive labels.

### 18. Analytics empty-state coverage

Problem:

- Exception analytics and predicted-risk sections could become visually sparse or blank when the selected scope returned no data.

Change:

- Added explicit empty states for both sections.

Impact:

- Operators now understand that the current scope is empty rather than assuming the cards failed to load.

### 19. Analytics risk-row drill-down

Problem:

- Predicted-risk rows explained which trips needed attention, but did not offer a direct jump into the relevant trip investigation surface.

Change:

- Risk rows now link directly to Trip Detail.

Impact:

- Analytics is now better connected to the operational investigation workflow.

### 20. Route Performance date-filter alignment

Problem:

- The Route Performance page showed `from` / `to` date controls, but the page never passed those filters into the analytics service.

Change:

- Route Performance now builds an `AnalyticsFilters` object from the selected date range and passes it to `getRoutePerformance()`.

Impact:

- The corridor table and summary metrics now respond to the visible date controls instead of implying a filter that does nothing.

### 21. Route Performance empty-state coverage

Problem:

- When a filtered date range produced no corridor rows, the lane table would simply collapse without a clear explanation.

Change:

- Added a compact empty state to the route-performance table.

Impact:

- Operators now get clear feedback when the selected date window has no route-performance history in scope.

### 22. Driver Behavior date-filter alignment

Problem:

- The Driver Behavior page showed date controls, but the selected range did not affect the score rows at all.

Change:

- Driver Behavior now passes the active date filters into `getDriverBehaviorScores()`.

Impact:

- The visible date controls now match the behavior of the page instead of implying nonexistent filtering.

### 23. Driver Behavior empty-state coverage

Problem:

- If a filtered date range returned no driver rows, the scorecard area became visually empty without explanation.

Change:

- Added an explicit empty state to the driver scorecard table.

Impact:

- Supervisors now get clear feedback when the selected time range has no driver-behavior history in scope.

### 24. Driver Behavior at-risk follow-up link

Problem:

- At-risk driver cards surfaced coaching concerns but did not offer a direct next step into the execution workspace.

Change:

- Added an `Open active trips` follow-up link to the at-risk cards.

Impact:

- The page is slightly better connected to the live operational workflow instead of stopping at passive score display.


## Verification

- `npm run build -w @optimile/track-trace-web` passes.
- Bundle warning remains: the main JS chunk is still above the 500 kB warning threshold.

## Next Recommended Phase 2 Items

1. Reduce Dashboard copy density and trim duplicate navigation surfaces.
2. Review Trip Detail hero action cluster and compress secondary actions.
3. Add direct drill-down from alerts into Trip Detail and/or Live Map.
4. Preserve filter context when Analytics drills into Trips or Alerts.
5. Use remaining Phase 2 cleanup to simplify dashboard/reporting surfaces and tighten backend-alignment notes.

## Outcome

Phase 2 has started with a small, safe refinement batch already merged. The next work should continue screen-by-screen, using Live Map validation plus the remaining Phase 1 findings to drive the next cleanup set.
> Archive note: this refinement log spans the transition from the older versioned workspace model to the current single implementation. Some `V1`/`V2` references remain as historical notes.
