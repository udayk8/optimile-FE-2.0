import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { TrackTraceLayout } from '../layouts/track-trace-layout'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { DashboardSkeleton } from '../components/shared/DashboardSkeleton'
import { MapPageSkeleton } from '../components/shared/MapPageSkeleton'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import { AnalyticsPageSkeleton } from '../components/shared/AnalyticsPageSkeleton'

const ActiveTripsPage             = lazy(() => import('../pages/ActiveTripsPage').then(m => ({ default: m.ActiveTripsPage })))
const CustomerTrackingPreviewPage = lazy(() => import('../pages/CustomerTrackingPreviewPage').then(m => ({ default: m.CustomerTrackingPreviewPage })))
const GeofenceManagementPage      = lazy(() => import('../pages/GeofenceManagementPage').then(m => ({ default: m.GeofenceManagementPage })))
const LiveMapPage                 = lazy(() => import('../pages/LiveMapPage').then(m => ({ default: m.LiveMapPage })))
const RoutePerformancePage        = lazy(() => import('../pages/RoutePerformancePage').then(m => ({ default: m.RoutePerformancePage })))
const TrackTraceDashboard         = lazy(() => import('../pages/TrackTraceDashboard').then(m => ({ default: m.TrackTraceDashboard })))
const TrackingAlertsPage          = lazy(() => import('../pages/TrackingAlertsPage').then(m => ({ default: m.TrackingAlertsPage })))
const TripDetailsPage             = lazy(() => import('../pages/TripDetailsPage').then(m => ({ default: m.TripDetailsPage })))
const TripReplayPage              = lazy(() => import('../pages/TripReplayPage').then(m => ({ default: m.TripReplayPage })))
const DispatchPage                = lazy(() => import('../pages/DispatchPage').then(m => ({ default: m.DispatchPage })))

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
    <Suspense fallback={<ListPageSkeleton />}>
      <TripDetailsPage
        tripId={tripId}
        onBack={() => navigate(`${basePath}/dispatch`)}
      />
    </Suspense>
  )
}

export function TrackingRoutes() {
  return (
    <Routes>
      <Route element={<TrackTraceLayout />}>
        <Route index element={<Suspense fallback={<DashboardSkeleton />}><TrackTraceDashboard /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<DashboardSkeleton />}><TrackTraceDashboard /></Suspense>} />
        <Route path="trips" element={<Suspense fallback={<ListPageSkeleton />}><ActiveTripsPage /></Suspense>} />
        <Route path="trips/:tripId" element={<TripDetailsRoute />} />
        <Route path="trips/:tripId/replay" element={<Suspense fallback={<MapPageSkeleton />}><TripReplayPage /></Suspense>} />
        <Route path="live-map" element={<Suspense fallback={<MapPageSkeleton />}><LiveMapPage /></Suspense>} />
        <Route path="alerts" element={<Suspense fallback={<ListPageSkeleton />}><TrackingAlertsPage /></Suspense>} />
        <Route path="geofences" element={<Suspense fallback={<ListPageSkeleton />}><GeofenceManagementPage /></Suspense>} />
        <Route path="customer-preview/:tripId" element={<Suspense fallback={<MapPageSkeleton />}><CustomerTrackingPreviewPage /></Suspense>} />
        <Route path="analytics" element={<LegacyRedirect to="/route-performance" />} />
        <Route path="route-performance" element={<Suspense fallback={<AnalyticsPageSkeleton />}><RoutePerformancePage /></Suspense>} />
        <Route path="dispatch" element={<Suspense fallback={<ListPageSkeleton />}><DispatchPage /></Suspense>} />

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
