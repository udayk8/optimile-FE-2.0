import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { TrackTraceLayout } from '../layouts/track-trace-layout'
import { ActiveTripsPage } from '../pages/ActiveTripsPage'
import { CustomerTrackingPreviewPage } from '../pages/CustomerTrackingPreviewPage'
import { GeofenceManagementPage } from '../pages/GeofenceManagementPage'
import { LiveMapPage } from '../pages/LiveMapPage'
import { RoutePerformancePage } from '../pages/RoutePerformancePage'
import { TrackTraceDashboard } from '../pages/TrackTraceDashboard'
import { TrackingAnalyticsPage } from '../pages/TrackingAnalyticsPage'
import { TrackingAlertsPage } from '../pages/TrackingAlertsPage'
import { TripDetailsPage } from '../pages/TripDetailsPage'
import { TripReplayPage } from '../pages/TripReplayPage'
import { DispatchPage } from '../pages/DispatchPage'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'

function LegacyRedirect({ to }: { to: string }) {
  const { scopedPath } = useTrackTraceRouting()
  return <Navigate to={scopedPath(to)} replace />
}

function TripDetailsRoute() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { basePath } = useTrackTraceRouting()

  if (!tripId) return <Navigate to={`${basePath}/dispatch`} replace />

  return (
    <TripDetailsPage
      tripId={tripId}
      onBack={() => navigate(`${basePath}/dispatch`)}
    />
  )
}

export function TrackingRoutes() {
  return (
    <Routes>
      <Route element={<TrackTraceLayout />}>
        <Route index element={<TrackTraceDashboard />} />
        <Route path="dashboard" element={<TrackTraceDashboard />} />
        <Route path="trips" element={<ActiveTripsPage />} />
        <Route path="trips/:tripId" element={<TripDetailsRoute />} />
        <Route path="trips/:tripId/replay" element={<TripReplayPage />} />
        <Route path="live-map" element={<LiveMapPage />} />
        <Route path="alerts" element={<TrackingAlertsPage />} />
        <Route path="geofences" element={<GeofenceManagementPage />} />
        <Route path="customer-preview/:tripId" element={<CustomerTrackingPreviewPage />} />
        <Route path="analytics" element={<TrackingAnalyticsPage />} />
        <Route path="route-performance" element={<RoutePerformancePage />} />
        <Route path="dispatch" element={<DispatchPage />} />

        <Route path="shipments" element={<LegacyRedirect to="/trips" />} />
        <Route path="shipments/:shipmentId" element={<LegacyRedirect to="/trips" />} />
        <Route path="vehicles" element={<LegacyRedirect to="/live-map" />} />
        <Route path="vehicles/:vehicleId" element={<LegacyRedirect to="/live-map" />} />
        <Route path="route-progress" element={<LegacyRedirect to="/live-map" />} />
        <Route path="exceptions" element={<LegacyRedirect to="/alerts" />} />
        <Route path="pod" element={<LegacyRedirect to="/alerts" />} />
        <Route path="control-tower" element={<LegacyRedirect to="/dashboard" />} />
        <Route path="*" element={<LegacyRedirect to="/dashboard" />} />
      </Route>
    </Routes>
  )
}
