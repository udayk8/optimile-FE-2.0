import { createContext, useContext, type ReactNode } from 'react'

// Flag set by an embedded host (tenant-admin) when track-trace is mounted
// inside another shell. TrackTraceLayout consumes it to suppress its own
// sidebar + header so the host's nav stays the single source of truth.
//
// Standalone (no provider in the tree) → false → full layout renders.
const TrackTraceEmbeddedContext = createContext<boolean>(false)

export function TrackTraceEmbeddedProvider({ children }: { children: ReactNode }) {
  return (
    <TrackTraceEmbeddedContext.Provider value={true}>
      {children}
    </TrackTraceEmbeddedContext.Provider>
  )
}

export function useTrackTraceEmbedded(): boolean {
  return useContext(TrackTraceEmbeddedContext)
}
