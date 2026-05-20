# Track and Trace Phase 0 Baseline

Last reviewed: 2026-05-12

## Goal

Lock the current Track and Trace baseline before changing behavior. Phase 0 is a review and scope-control phase: confirm what exists, what should be validated in Phase 1, and what decisions must be made before simplifying or removing anything.

## Current Module Inventory

Track and Trace currently has 4 submodules and 11 primary screens.

| Submodule | Current screens |
|---|---|
| Overview | Dashboard |
| Tracking | Active Trips, Trip Detail, Trip Replay, Live Map, Customer Preview |
| Operations | Alerts, Geofences |
| Intelligence | Analytics, Route Performance, Driver Behavior |

Legacy aliases are still routed but should not be counted as separate screens:

- `/shipments` -> `/trips`
- `/vehicles` -> `/live-map`
- `/route-progress` -> `/live-map`
- `/exceptions` -> `/alerts`
- `/pod` -> `/alerts`
- `/control-tower` -> `/dashboard`

## Current Baseline Status

| Area | Status | Phase 0 note |
|---|---|---|
| Build health | Pass | `npm run build -w @optimile/track-trace-web` completes successfully. |
| Bundle health | Warning | Main JS chunk is about 620 kB after minification; defer code-splitting to performance phase. |
| Route inventory | Stable | 11 screens are wired in `trackingRoutes.tsx`. |
| Role/plan gating | Present | Role, permission, and plan feature gates are defined in `constants/access.ts`. |
| UI model | Single active workspace | The module now uses one current implementation instead of a versioned UI model. |
| Mock/backend state | Mixed | Core tracking APIs have a real API switch; several services are still mock/in-memory. |
| Documentation | Present | Existing docs already cover submodules, pages, UX summary, and implementation notes. |

## What Is In Scope For Phase 0

- Confirm the current screen list.
- Confirm role and plan access assumptions.
- Confirm build health.
- Identify backend/mock boundaries.
- Create the Phase 1 validation checklist.

## What Is Out Of Scope For Phase 0

- Removing screens.
- Rebuilding layouts.
- Changing workflows.
- API integration work.
- Performance optimization beyond noting current risk.
- Visual redesign.

## Decisions To Lock Before Phase 1

| Decision | Recommended default | Why it matters |
|---|---|---|
| Customer role scope | Validate strictly | Customer should likely see only customer-safe tracking, not internal dashboards unless required. |
| Vendor role scope | Validate strictly | Vendor should likely see assigned trips only. |
| Intelligence pages | Keep for now | Do not remove until Phase 1 confirms whether each page supports a real decision workflow. |

## Backend Alignment Snapshot

| Service area | Current state | Phase 1 validation need |
|---|---|---|
| Tracking trips, dashboard, replay, events | Partially API-ready via `VITE_USE_MOCK_TRACKING` and `VITE_TRACKING_API_BASE_URL` | Confirm backend response shape and route coverage. |
| Alerts | Mock fallback; non-mock currently returns empty list in direct service | Confirm alert list/action endpoints before production. |
| Geofences | In-memory mock database | Confirm CRUD, validation, and delete semantics. |
| Analytics/intelligence | Mostly computed/mock rows | Confirm date/filter behavior and backend query parameters. |
| Prediction | Mock risk scoring | Confirm whether this is product scope or future capability. |
| Socket/live updates | Mock socket emitter | Confirm real websocket/SSE contract and fallback polling. |

## Phase 1 Entry Checklist

Before starting Phase 1, mark these as agreed:

- [ ] The current Track and Trace workspace is the validation baseline.
- [ ] No additional screen will be removed until workflow validation is complete.
- [ ] Customer/vendor access will be tested separately from admin/control-tower access.
- [ ] Mock-only service areas will be tagged as backend gaps, not UI defects.
- [ ] Phase 1 will validate workflows screen by screen before cleanup begins.

## Phase 1 Validation Order

1. Dashboard
2. Active Trips
3. Trip Detail
4. Live Map
5. Trip Replay
6. Customer Preview
7. Alerts
8. Geofences
9. Analytics
10. Route Performance
11. Driver Behavior
## Phase 0 Outcome

Phase 0 baseline is ready. The module should now move into Phase 1 workflow validation without making structural changes.
