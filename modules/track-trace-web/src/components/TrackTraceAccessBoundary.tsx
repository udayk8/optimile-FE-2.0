import type { PropsWithChildren } from 'react'
import { EmptyPlaceholder } from './EmptyPlaceholder'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import type { TrackTracePageKey } from '../types/access'

export function TrackTraceAccessBoundary({
  page,
  fallbackTitle,
  fallbackDescription,
  children,
}: PropsWithChildren<{
  page: TrackTracePageKey
  fallbackTitle?: string
  fallbackDescription?: string
}>) {
  const { canAccessPage, role } = useTrackTraceAccess()

  if (!canAccessPage(page)) {
    return (
      <EmptyPlaceholder
        title={fallbackTitle ?? 'Access limited for this role'}
        description={
          fallbackDescription ??
          `The current access profile (${role}) does not include this workflow. Contact your Optimile administrator if you need broader Track and Trace access.`
        }
      />
    )
  }

  return <>{children}</>
}
