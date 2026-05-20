# Track & Trace Web - Phase 3 Implementation Plan

## 1. Objective

Build Phase 3 of the `track-trace-web` module as an enterprise SaaS-grade tracking product.

Phase 3 should move Track & Trace from operational tracking to intelligence, analytics, automation, and enterprise controls.

Main goal:

- Add analytics and KPI dashboards
- Add SLA monitoring
- Add route performance insights
- Add driver behavior insights
- Add tracking reports and exports
- Add tenant-level tracking configuration
- Add audit logs
- Add subscription/feature control readiness
- Add predictive delay foundation
- Keep the module scalable, secure, and ready for backend integration

---

## 2. Phase 3 Scope

Phase 3 must include:

- Tracking Analytics Dashboard
- SLA Monitoring Dashboard
- Route Performance Dashboard
- Driver Behavior Insights
- Vehicle Utilization Insights
- Exception Analytics
- Tracking Reports
- Export-ready report structure
- Tenant-level tracking rules
- Alert rule configuration
- Audit logs
- Data retention configuration
- Feature access control by tenant/plan
- Predictive delay foundation
- Advanced customer visibility configuration

---

## 3. Important Architecture Rule

Track & Trace should remain focused on tracking intelligence and movement visibility.

It should not become:

- Booking owner
- Fleet master owner
- Finance owner
- Vendor settlement owner
- Driver master owner
- Customer master owner

Track & Trace should consume data from other modules and produce tracking intelligence.

---

## 4. Updated Folder Structure

Extend the Phase 2 structure like this:

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
    │   ├── TrackingAlertsPage.tsx
    │   ├── GeofenceManagementPage.tsx
    │   ├── TripReplayPage.tsx
    │   ├── CustomerTrackingPreviewPage.tsx
    │   ├── TrackingAnalyticsPage.tsx
    │   ├── SlaMonitoringPage.tsx
    │   ├── RoutePerformancePage.tsx
    │   ├── DriverBehaviorPage.tsx
    │   ├── TrackingReportsPage.tsx
    │   ├── TrackingSettingsPage.tsx
    │   └── TrackingAuditLogsPage.tsx
    │
    ├── components/
    │   ├── analytics/
    │   ├── reports/
    │   ├── settings/
    │   └── shared/
    │
    ├── services/
    │   ├── analyticsApi.ts
    │   ├── reportsApi.ts
    │   ├── trackingSettingsApi.ts
    │   ├── auditLogApi.ts
    │   └── predictionApi.ts
    │
    ├── store/
    │   ├── analyticsMockData.ts
    │   ├── reportsMockData.ts
    │   └── settingsMockData.ts
    │
    ├── types/
    │   ├── analytics.types.ts
    │   ├── reports.types.ts
    │   ├── settings.types.ts
    │   ├── audit.types.ts
    │   └── prediction.types.ts
    │
    └── routes/
        └── trackingRoutes.tsx
```

---

## 5. Phase 3 Screens

### 5.1 Tracking Analytics Dashboard

Route:

```text
/track-trace/analytics
```

Must show:

- Total trips
- Active trips
- Completed trips
- Delayed trips
- On-time delivery percentage
- Average delay minutes
- Average idle time
- Average trip duration
- Route deviation count
- Open exceptions
- Vehicle utilization percentage
- Driver performance score

Charts:

- On-time vs delayed trips
- Delay trend by day/week/month
- Top delayed lanes
- Route deviation trend
- Vehicle utilization trend
- Alert severity distribution
- Region-wise trip distribution

Filters:

- Date range
- Customer
- Vehicle
- Driver
- Lane
- Trip status
- Region
- Tenant, if admin user

---

### 5.2 SLA Monitoring Page

Route:

```text
/track-trace/sla-monitoring
```

Purpose:

Track customer and internal SLA compliance.

Must show:

- SLA breached trips
- Trips at risk
- On-time trips
- Delayed pickup
- Delayed delivery
- Checkpoint missed
- Delay reason summary

SLA statuses:

```text
On Track
At Risk
Breached
Recovered
Not Applicable
```

SLA metrics:

```text
Pickup SLA %
Delivery SLA %
Checkpoint SLA %
Average breach duration
Customer-wise SLA performance
Lane-wise SLA performance
```

SLA rules:

- Pickup grace period
- Delivery grace period
- Checkpoint grace period
- Detention threshold
- Idle threshold
- Route deviation threshold

---

### 5.3 Route Performance Page

Route:

```text
/track-trace/route-performance
```

Must show:

- Planned vs actual distance
- Planned vs actual duration
- Route deviation count
- Average route efficiency
- Frequent stop points
- High-delay corridors
- Top performing lanes
- Poor performing lanes
- Traffic/delay pattern placeholder

Route efficiency formula:

```text
Route Efficiency % = Planned Distance / Actual Distance * 100
```

Fields:

```text
laneId
origin
destination
plannedDistanceKm
actualDistanceKm
plannedDurationMinutes
actualDurationMinutes
deviationCount
avgDelayMinutes
efficiencyScore
```

---

### 5.4 Driver Behavior Page

Route:

```text
/track-trace/driver-behavior
```

Must show:

- Driver score
- Overspeed events
- Harsh stop placeholder
- Long idle events
- Route deviation events
- SOS events
- GPS off events
- Trip acceptance delay
- On-time performance
- Average speed
- Total distance driven

Driver score inputs:

```text
On-time performance
Overspeed count
Idle duration
Route deviation count
GPS compliance
SOS incidents
Trip completion consistency
```

---

### 5.5 Tracking Reports Page

Route:

```text
/track-trace/reports
```

Report types:

```text
Trip Tracking Report
Vehicle Movement Report
Delay Report
SLA Breach Report
Route Deviation Report
Idle Time Report
Driver Performance Report
Alert Report
Geofence Event Report
Customer Tracking Report
```

Required features:

- Report type selector
- Date range filter
- Customer filter
- Vehicle filter
- Driver filter
- Status filter
- Preview table
- Export CSV placeholder
- Export Excel placeholder
- Save report configuration placeholder

Do not implement actual backend export in frontend. Prepare action handlers and API contracts.

---

### 5.6 Tracking Settings Page

Route:

```text
/track-trace/settings
```

Settings sections:

1. Tracking rules
2. Alert rules
3. SLA rules
4. Customer visibility
5. Data retention
6. Feature access

Tracking rules:

```text
Location update frequency
Vehicle offline threshold
Idle threshold
Overspeed threshold
Route deviation threshold
GPS accuracy threshold
```

Alert rules:

```text
Enable/disable alert type
Severity mapping
Escalation time
Notify roles
Notification channel
```

Customer visibility rules:

```text
Show vehicle number
Show driver name
Show driver mobile
Show exact location
Show approximate location
Show ETA
Show delay reason
Show public timeline
Show POD status
```

Data retention rules:

```text
Live location retention days
Trip history retention days
Alert history retention days
Replay history retention days
Audit log retention days
```

---

### 5.7 Tracking Audit Logs Page

Route:

```text
/track-trace/audit-logs
```

Audit actions:

```text
Viewed Live Location
Viewed Trip Replay
Acknowledged Alert
Resolved Alert
Created Geofence
Updated Geofence
Deleted Geofence
Changed Tracking Rule
Changed Alert Rule
Generated Customer Link
Exported Report
Viewed Customer Tracking Preview
```

Audit fields:

```text
id
tenantId
userId
userName
action
entityType
entityId
description
ipAddress
userAgent
createdAt
metadata
```

Filters:

- Date range
- User
- Action
- Entity type
- Trip ID
- Vehicle number

---

## 6. Analytics Types

Create `analytics.types.ts`.

```ts
export interface TrackingKpiSummary {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  delayedTrips: number;
  onTimeDeliveryPercentage: number;
  averageDelayMinutes: number;
  averageIdleMinutes: number;
  routeDeviationCount: number;
  openExceptionCount: number;
  vehicleUtilizationPercentage: number;
}

export interface DelayTrendPoint {
  date: string;
  delayedTrips: number;
  averageDelayMinutes: number;
}

export interface RoutePerformance {
  laneId: string;
  origin: string;
  destination: string;
  plannedDistanceKm: number;
  actualDistanceKm: number;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  deviationCount: number;
  averageDelayMinutes: number;
  efficiencyScore: number;
}

export interface DriverBehaviorScore {
  driverId: string;
  driverName: string;
  totalTrips: number;
  onTimePercentage: number;
  overspeedCount: number;
  idleMinutes: number;
  routeDeviationCount: number;
  gpsCompliancePercentage: number;
  score: number;
}
```

---

## 7. Reports Types

Create `reports.types.ts`.

```ts
export type TrackingReportType =
  | "Trip Tracking Report"
  | "Vehicle Movement Report"
  | "Delay Report"
  | "SLA Breach Report"
  | "Route Deviation Report"
  | "Idle Time Report"
  | "Driver Performance Report"
  | "Alert Report"
  | "Geofence Event Report"
  | "Customer Tracking Report";

export interface TrackingReportFilter {
  reportType: TrackingReportType;
  fromDate: string;
  toDate: string;
  customerId?: string;
  vehicleId?: string;
  driverId?: string;
  status?: string;
  laneId?: string;
}

export interface SavedTrackingReport {
  id: string;
  name: string;
  reportType: TrackingReportType;
  filters: TrackingReportFilter;
  createdBy: string;
  createdAt: string;
}
```

---

## 8. Settings Types

Create `settings.types.ts`.

```ts
export interface TrackingRules {
  locationUpdateFrequencySeconds: number;
  vehicleOfflineThresholdMinutes: number;
  idleThresholdMinutes: number;
  overspeedThresholdKmph: number;
  routeDeviationThresholdMeters: number;
  gpsAccuracyThresholdMeters: number;
}

export interface AlertRule {
  id: string;
  alertType: string;
  isEnabled: boolean;
  severity: "Low" | "Medium" | "High" | "Critical";
  escalationMinutes: number;
  notifyRoles: string[];
  channels: Array<"InApp" | "Email" | "SMS" | "WhatsApp" | "Push">;
}

export interface CustomerVisibilityRules {
  showVehicleNumber: boolean;
  showDriverName: boolean;
  showDriverMobile: boolean;
  showExactLocation: boolean;
  showApproxLocation: boolean;
  showETA: boolean;
  showDelayReason: boolean;
  showPublicTimeline: boolean;
  showPODStatus: boolean;
}

export interface DataRetentionRules {
  liveLocationRetentionDays: number;
  tripHistoryRetentionDays: number;
  alertHistoryRetentionDays: number;
  replayHistoryRetentionDays: number;
  auditLogRetentionDays: number;
}
```

---

## 9. API Service Contracts

Create these service files with mock/real mode support.

### analyticsApi.ts

```ts
getTrackingKpiSummary(filters)
getDelayTrend(filters)
getOnTimePerformance(filters)
getRoutePerformance(filters)
getDriverBehaviorScores(filters)
getExceptionAnalytics(filters)
getVehicleUtilization(filters)
```

### reportsApi.ts

```ts
getReportPreview(filters)
exportReport(filters, format)
getSavedReports()
saveReportConfig(payload)
deleteSavedReport(reportId)
```

### trackingSettingsApi.ts

```ts
getTrackingRules()
updateTrackingRules(payload)
getAlertRules()
updateAlertRule(ruleId, payload)
getCustomerVisibilityRules()
updateCustomerVisibilityRules(payload)
getDataRetentionRules()
updateDataRetentionRules(payload)
```

### auditLogApi.ts

```ts
getTrackingAuditLogs(filters)
createTrackingAuditLog(payload)
```

### predictionApi.ts

```ts
getDelayRiskScore(tripId)
getTripsAtRisk(filters)
getPredictedEta(tripId)
```

For Phase 3, prediction APIs can return mock data.

---

## 10. Predictive Delay Foundation

Prepare the structure for delay prediction.

Show these fields in analytics/trip detail where relevant:

```text
Delay risk score
Predicted delay minutes
Risk reason
Confidence
Recommended action
```

Risk levels:

```text
Low
Medium
High
Critical
```

Example reasons:

```text
Historical delay on lane
Vehicle idle too long
Route deviation detected
Checkpoint missed
Traffic delay placeholder
GPS signal missing
Loading delay
```

Do not implement real AI prediction in Phase 3 frontend. Prepare UI and service contract only.

---

## 11. Advanced Customer Visibility

Customer tracking should become configurable.

Add customer visibility settings:

```text
Exact location visible
Approx location visible
ETA visible
Delay reason visible
Driver details visible
Vehicle details visible
Timeline visible
POD status visible
Support contact visible
```

Customer-safe tracking should follow tenant-level rules.

Never expose internal-only data directly.

---

## 12. RBAC Enhancements

Add or prepare these permissions:

```text
track_trace:read
track_trace:write
track_trace:alerts:manage
track_trace:geofence:manage
track_trace:replay:view
track_trace:customer_link:view
track_trace:analytics:view
track_trace:reports:view
track_trace:reports:export
track_trace:settings:manage
track_trace:audit:view
track_trace:prediction:view
```

Permission behavior:

- Analytics pages require `track_trace:analytics:view`
- Reports page requires `track_trace:reports:view`
- Export action requires `track_trace:reports:export`
- Settings page requires `track_trace:settings:manage`
- Audit logs require `track_trace:audit:view`
- Predictive delay insights require `track_trace:prediction:view`

---

## 13. SaaS / Multi-Tenant Requirements

Tenant-level configuration:

```text
Tracking rules
Alert rules
SLA rules
Customer visibility rules
Data retention rules
Feature access
Report access
Export limits
Live tracking refresh limits
```

Feature control examples:

```text
Basic Plan:
- Live tracking
- Active trips
- Basic alerts

Professional Plan:
- Geofences
- Trip replay
- Reports
- Customer tracking preview

Enterprise Plan:
- Analytics
- SLA monitoring
- Audit logs
- Predictive delay
- Advanced exports
```

Do not hardcode plan behavior deeply into pages. Use a feature access helper.

Example:

```ts
canUseFeature("tracking.analytics")
canUseFeature("tracking.reports.export")
canUseFeature("tracking.prediction")
```

---

## 14. Suggested Routes

Update `trackingRoutes.tsx`:

```tsx
[
  { path: "/track-trace", element: <TrackTraceDashboard /> },
  { path: "/track-trace/trips", element: <ActiveTripsPage /> },
  { path: "/track-trace/live-map", element: <LiveMapPage /> },
  { path: "/track-trace/trips/:tripId", element: <TripDetailsPage /> },
  { path: "/track-trace/trips/:tripId/replay", element: <TripReplayPage /> },
  { path: "/track-trace/alerts", element: <TrackingAlertsPage /> },
  { path: "/track-trace/geofences", element: <GeofenceManagementPage /> },
  { path: "/track-trace/customer-preview/:tripId", element: <CustomerTrackingPreviewPage /> },
  { path: "/track-trace/analytics", element: <TrackingAnalyticsPage /> },
  { path: "/track-trace/sla-monitoring", element: <SlaMonitoringPage /> },
  { path: "/track-trace/route-performance", element: <RoutePerformancePage /> },
  { path: "/track-trace/driver-behavior", element: <DriverBehaviorPage /> },
  { path: "/track-trace/reports", element: <TrackingReportsPage /> },
  { path: "/track-trace/settings", element: <TrackingSettingsPage /> },
  { path: "/track-trace/audit-logs", element: <TrackingAuditLogsPage /> },
]
```

---

## 15. Sidebar/Menu Items

Recommended Track & Trace menu:

```text
Track & Trace
- Dashboard
- Live Map
- Active Trips
- Alerts
- Geofences
- Analytics
- SLA Monitoring
- Route Performance
- Driver Behavior
- Reports
- Settings
- Audit Logs
```

Optional:

- Keep Trip Replay accessible from Trip Details only.
- Keep Customer Preview accessible from Trip Details only.

---

## 16. UI/UX Requirements

Follow existing Optimile design system.

Must include:

- Consistent page headers
- Clear breadcrumbs
- Date range filters
- KPI cards
- Enterprise tables
- Chart cards
- Empty states
- Loading states
- Error states
- Permission denied state
- Export action placeholders
- Settings forms with validation
- Responsive layout

Charts:

- Use existing chart library if already available.
- Do not add a new chart library unless necessary.
- If no chart library exists, create clean placeholder chart cards with mock data.

---

## 17. Module Interaction in Phase 3

### Booking Module

Track & Trace consumes:

```text
Trip lifecycle
Trip SLA
Booking customer
Booking lane
Trip completion
```

Track & Trace produces:

```text
Delay risk
Trip progress
Trip exception summary
Tracking SLA result
```

### Fleet Module

Track & Trace consumes:

```text
Vehicle master
Driver master
Vehicle compliance
Driver compliance
Device mapping
```

Track & Trace produces:

```text
Vehicle utilization
Driver tracking score
Idle insights
GPS compliance score
```

### Driver App

Track & Trace consumes:

```text
Live location
Driver status events
SOS events
Battery/network status
Trip milestone updates
```

Track & Trace produces:

```text
Driver behavior score
GPS compliance score
Trip execution insights
```

### Customer Dashboard

Track & Trace produces:

```text
Customer-safe tracking view
Customer ETA
Public timeline
Delay reason if allowed
POD status
```

### Finance Module

Track & Trace produces:

```text
Actual trip distance
Delay duration
Detention duration
SLA breach summary
Route deviation summary
Trip completion proof
```

Finance can later consume this for:

```text
Invoice calculation
Penalty calculation
Vendor settlement
Customer billing dispute resolution
```

---

## 18. Acceptance Criteria

Phase 3 is complete when:

- Analytics Dashboard exists with KPI cards and charts/placeholders.
- SLA Monitoring page exists with SLA statuses and filters.
- Route Performance page exists with route efficiency data.
- Driver Behavior page exists with driver scoring structure.
- Reports page exists with filters and export placeholders.
- Settings page exists for tracking, alerts, customer visibility, and retention.
- Audit Logs page exists with filters.
- Predictive delay foundation exists as mock/service-ready structure.
- Customer visibility rules are configurable.
- RBAC permissions are prepared or integrated.
- Feature access control helper is prepared or reused.
- No existing module breaks.
- TypeScript build passes.
- UI follows existing Optimile design system.
- Phase 1 and Phase 2 flows still work.

---

## 19. Implementation Order for Codex

Follow this sequence:

```text
1. Review Phase 1 and Phase 2 Track & Trace implementation.
2. Review existing shared UI, auth, chart, table, and form patterns.
3. Add Phase 3 types.
4. Add Phase 3 mock data.
5. Add analytics API service.
6. Add reports API service.
7. Add settings API service.
8. Add audit log API service.
9. Add prediction API service.
10. Create shared analytics/report/settings components.
11. Create Analytics Dashboard page.
12. Create SLA Monitoring page.
13. Create Route Performance page.
14. Create Driver Behavior page.
15. Create Reports page.
16. Create Tracking Settings page.
17. Create Audit Logs page.
18. Add predictive delay widgets where relevant.
19. Update routes.
20. Update sidebar/menu entries.
21. Add or wire RBAC permissions.
22. Add or wire feature access checks.
23. Test all Track & Trace routes.
24. Run TypeScript/build checks.
25. Fix regressions without changing unrelated modules.
```

---

## 20. Do Not Do in Phase 3

Do not implement unless backend/project already supports it:

- Real AI/ML delay prediction
- Production export engine
- Real notification escalation engine
- Actual billing or settlement logic
- New global auth rewrite
- New global layout rewrite
- New unrelated design system
- Complex map rendering refactor
- Backend microservice implementation
- Kafka/RabbitMQ infrastructure
- Native driver app changes

Keep Phase 3 focused on enterprise frontend readiness, service contracts, and SaaS-level operational intelligence.

---

## 21. Final Instruction

Build Track & Trace Phase 3 as an enterprise SaaS-grade frontend module.

Keep it modular, typed, scalable, permission-aware, feature-gated, analytics-ready, report-ready, and consistent with the Optimile design system.
