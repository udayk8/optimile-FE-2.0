import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { TrackTracePageKey } from '../types/access'

function trimTrailingSlash(value: string) {
  return value !== '/' ? value.replace(/\/+$/, '') : value
}

function resolveRouting(pathname: string): { basePath: string; currentPage: TrackTracePageKey } {
  const path = trimTrailingSlash(pathname)

  if (path.includes('/customer-preview/')) {
    return { basePath: path.split('/customer-preview/')[0], currentPage: 'customer-preview' }
  }
  if (path.includes('/replay')) {
    return { basePath: path.split('/trips/')[0], currentPage: 'replay' }
  }
  if (path.includes('/trips/')) {
    return { basePath: path.split('/trips/')[0], currentPage: 'shipment-detail' }
  }
  if (path.endsWith('/trips')) {
    return { basePath: path.slice(0, -'/trips'.length), currentPage: 'shipments' }
  }
  if (path.includes('/shipments/')) {
    return { basePath: path.split('/shipments/')[0], currentPage: 'shipment-detail' }
  }
  if (path.endsWith('/shipments')) {
    return { basePath: path.slice(0, -'/shipments'.length), currentPage: 'shipments' }
  }
  if (path.includes('/vehicles/')) {
    return { basePath: path.split('/vehicles/')[0], currentPage: 'vehicle-detail' }
  }
  if (path.endsWith('/vehicles')) {
    return { basePath: path.slice(0, -'/vehicles'.length), currentPage: 'vehicles' }
  }
  if (path.endsWith('/live-map')) {
    return { basePath: path.slice(0, -'/live-map'.length), currentPage: 'live-map' }
  }
  if (path.endsWith('/route-progress')) {
    return { basePath: path.slice(0, -'/route-progress'.length), currentPage: 'route-progress' }
  }
  if (path.endsWith('/exceptions')) {
    return { basePath: path.slice(0, -'/exceptions'.length), currentPage: 'exceptions' }
  }
  if (path.endsWith('/alerts')) {
    return { basePath: path.slice(0, -'/alerts'.length), currentPage: 'alerts' }
  }
  if (path.endsWith('/analytics')) {
    return { basePath: path.slice(0, -'/analytics'.length), currentPage: 'analytics' }
  }
  if (path.endsWith('/route-performance')) {
    return { basePath: path.slice(0, -'/route-performance'.length), currentPage: 'route-performance' }
  }
  if (path.includes('/geofences/')) {
    return { basePath: path.split('/geofences/')[0], currentPage: 'geofences' }
  }
  if (path.endsWith('/geofences')) {
    return { basePath: path.slice(0, -'/geofences'.length), currentPage: 'geofences' }
  }
  if (path.endsWith('/dispatch')) {
    return { basePath: path.slice(0, -'/dispatch'.length), currentPage: 'dispatch' }
  }
  if (path.endsWith('/pod')) {
    return { basePath: path.slice(0, -'/pod'.length), currentPage: 'pod' }
  }
  if (path.endsWith('/control-tower')) {
    return { basePath: path.slice(0, -'/control-tower'.length), currentPage: 'control-tower' }
  }
  if (path.endsWith('/dashboard')) {
    return { basePath: path.slice(0, -'/dashboard'.length), currentPage: 'dashboard' }
  }

  return { basePath: path === '/' ? '' : path, currentPage: 'dashboard' }
}

export function useTrackTraceRouting() {
  const location = useLocation()

  return useMemo(() => {
    const { basePath, currentPage } = resolveRouting(location.pathname)
    const normalizedBasePath = trimTrailingSlash(basePath)

    return {
      currentPage,
      basePath: normalizedBasePath,
      scopedPath: (segment: string) => `${normalizedBasePath}${segment}` || segment,
    }
  }, [location.pathname])
}
