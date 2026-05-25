import { AuthProvider } from '@shared-auth'
import { BrowserRouter } from 'react-router-dom'
import { TrackTraceAccessProvider } from '@track-trace/hooks/useTrackTraceAccess'
import { TrackingRoutes } from '@track-trace/routes/trackingRoutes'
import { TrackingStoreProvider } from '@track-trace/store/trackingStore'
import '../styles/global.css'

export default function TrackTraceApp({ standalone = false, embedded = false }: { standalone?: boolean; embedded?: boolean }) {
  const routes = (
    <TrackTraceAccessProvider>
      <TrackingStoreProvider>
        <TrackingRoutes embedded={embedded} />
      </TrackingStoreProvider>
    </TrackTraceAccessProvider>
  )

  if (standalone) {
    return (
      <AuthProvider>
        <BrowserRouter>
          {routes}
        </BrowserRouter>
      </AuthProvider>
    )
  }

  return routes
}
