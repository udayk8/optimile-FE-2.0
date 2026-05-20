# Live Map

- Route: `/live-map`
- Component: `LiveMapPage.tsx`
- Section: `Tracking`
- File: `frontend-main/modules/track-trace-web/src/pages/LiveMapPage.tsx`

## Purpose

Live geographic visibility page for current vehicle positions, route overlays, map filters, selected trip context, and tracking-source operations for booking-linked vehicles.

## Business Model

- Every vehicle on the map is tied to an active trip and linked `bookingId`.
- A booked vehicle can have multiple tracking inputs at the same time:
  `Primary GPS`
  `Secondary GPS`
  `Driver App`
- Live Map should always show one active location per vehicle on the map, but the operator must be able to understand which source is driving that position.
- If the active source becomes stale or unreliable, the operator should be able to inspect alternatives and switch the active source for investigation or operational continuity.

## Core Objects

- `Trip`
  Operational movement entity shown in the Track and Trace workflow.
- `Vehicle`
  Physical asset assigned to the trip.
- `Booking`
  Commercial/dispatch linkage that anchors the trip and its device assignments.
- `Tracking Device`
  Tracking input assigned to the booked vehicle. This can be a primary GPS, secondary GPS, or driver app source.
- `Active Tracking Source`
  The source currently being used to render live location and route progression on the map.

## Live Map User Goal

The operator opens Live Map to answer four questions quickly:

1. Where is the vehicle right now?
2. What is the trip status?
3. Which tracking source is powering this location?
4. If the source looks wrong or stale, can I switch to another assigned source?

## Proposed Live Map Flow

### 1. Map Overview

- The map shows one marker per active trip/vehicle.
- Each marker is derived from the trip's current active tracking source.
- Marker status should reflect trip condition and source health together:
  `Normal`
  `Delayed`
  `Offline`
  `Fallback`
  `Source issue`

### 2. Marker Card / Right Rail

Each vehicle card in the right rail should show:

- `Trip ID`
- `Booking ID`
- `Vehicle number`
- `Trip status`
- `Current location`
- `Last update time`
- `Active source`
- `Source health`

This lets the user identify both operational state and telemetry state without opening a separate page.

### 3. Selected Trip Workbench

When the user selects a marker or card, the map workbench should show:

- Trip summary
- Vehicle summary
- Booking ID
- Current trip status
- ETA / checkpoint progress
- Active tracking source
- Last ping time
- Source health note
- Route deviation / offline / stale-source alerts if present

### 4. Tracking Source Panel

For the selected trip, show a dedicated `Tracking Sources` section with one row/card per assigned source:

- `Primary GPS`
- `Secondary GPS`
- `Driver App`

Each source row should expose:

- Source label
- Role: primary / secondary / driver app
- Device ID or app session label
- Status: active / standby / unavailable / faulted
- Last seen time
- Last known coordinates
- Accuracy or confidence when available
- Health note such as `stale`, `no heartbeat`, `manual override`, `fallback in use`

### 5. Source Switching Flow

The operator can switch the active source when:

- The primary device is stale
- The primary device is offline
- The driver app is more recent than the hardware device
- Operations want to manually investigate an alternate source

Switch behavior should be:

1. User opens a selected trip in Live Map.
2. User reviews the `Tracking Sources` panel.
3. User chooses an alternate source.
4. System asks for confirmation before changing the live tracking source.
5. After confirmation, the map, location summary, and route investigation state should refresh using the chosen source.
6. The UI should stamp `manual override`, `switched by`, and `switched at`.

### 6. Auto-Fallback Behavior

If source selection is platform-driven, Live Map should still explain it clearly.

- If primary GPS fails, the system may auto-fallback to secondary GPS or driver app.
- When fallback happens, the selected trip should visibly show:
  `Using secondary source`
  `Primary GPS stale`
  `Fallback started at <time>`
- Manual operator switching and automatic fallback should be distinguishable.

## Recommended Filters

Current filters should evolve beyond generic vehicle state and include telemetry-focused controls:

- `Active trips only`
- `Delayed trips`
- `Offline vehicles`
- `Fallback source in use`
- `Source health issue`
- `Driver app source`
- `Primary GPS only`
- `Secondary GPS only`
- `Route deviation`

## Recommended Data Contract

Each Live Map trip payload should include:

- `tripId`
- `bookingId`
- `vehicleId`
- `vehicleNumber`
- `tripStatus`
- `currentLocation`
- `activeSource`
- `primarySource`
- `activeTrackingDeviceId`
- `sourceHealth`
- `lastUpdatedAt`
- `trackingDevices[]`

Each `trackingDevices[]` item should include:

- `id`
- `bookingId`
- `vehicleId`
- `label`
- `role`
- `source`
- `status`
- `lastSeenAt`
- `lastReading`
- `priorityRank`
- `healthNote`

## UX Notes For Track and Trace

- Marker click must select the trip directly from the map.
- The selected-trip viewport should favor the chosen trip and its route, not refit to every trip on each update.
- The active source should be visible in both the marker card rail and selected-trip workbench.
- Device switching is an operational action, so it should be auditable.
- Source switching should be available from Live Map without forcing the user into Trip Detail.

## Implementation Direction

Phase 1:

- Extend trip typing to support multiple tracking devices and active device metadata.
- Add booking-aware source metadata to mock/API payloads.
- Show active source and source health in the right rail and map workbench.

Phase 2:

- Add `Tracking Sources` panel in the selected-trip workbench.
- Add manual source-switch action with confirmation and audit trail.
- Add telemetry-specific filters.

Phase 3:

- Support platform auto-fallback rules and explicit fallback messaging.
- Add source timeline/history so operators can see when and why the source changed.
