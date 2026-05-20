# Track and Trace Pages

Total Track and Trace page components: **15**

## Page Files

1. `TrackTraceDashboard.tsx`
2. `ActiveTripsPage.tsx`
3. `TripDetailsPage.tsx`
4. `TripReplayPage.tsx`
5. `LiveMapPage.tsx`
6. `TrackingAlertsPage.tsx`
7. `GeofenceManagementPage.tsx`
8. `CustomerTrackingPreviewPage.tsx`
9. `TrackingAnalyticsPage.tsx`
10. `SlaMonitoringPage.tsx`
11. `RoutePerformancePage.tsx`
12. `DriverBehaviorPage.tsx`
13. `TrackingReportsPage.tsx`
14. `TrackingSettingsPage.tsx`
15. `TrackingAuditLogsPage.tsx`

## Route Mapping

| Route | Page Component |
|---|---|
| `/dashboard` | `TrackTraceDashboard.tsx` |
| `/trips` | `ActiveTripsPage.tsx` |
| `/trips/:tripId` | `TripDetailsPage.tsx` |
| `/trips/:tripId/replay` | `TripReplayPage.tsx` |
| `/live-map` | `LiveMapPage.tsx` |
| `/alerts` | `TrackingAlertsPage.tsx` |
| `/geofences` | `GeofenceManagementPage.tsx` |
| `/customer-preview/:tripId` | `CustomerTrackingPreviewPage.tsx` |
| `/analytics` | `TrackingAnalyticsPage.tsx` |
| `/sla-monitoring` | `SlaMonitoringPage.tsx` |
| `/route-performance` | `RoutePerformancePage.tsx` |
| `/driver-behavior` | `DriverBehaviorPage.tsx` |
| `/reports` | `TrackingReportsPage.tsx` |
| `/settings` | `TrackingSettingsPage.tsx` |
| `/audit-logs` | `TrackingAuditLogsPage.tsx` |

## Notes

- The route index (`/`) resolves to the dashboard.
- Legacy aliases like `/shipments`, `/vehicles`, `/exceptions`, and `/control-tower` redirect to the newer route structure and are not counted as separate pages.
