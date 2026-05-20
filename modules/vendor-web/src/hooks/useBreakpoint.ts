import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/**
 * Reactive hook that returns the current breakpoint based on window width.
 *
 * Breakpoints align with Tailwind defaults:
 *   mobile  = < 768px  (default / base)
 *   tablet  = 768–1023px  (md:)
 *   desktop = ≥ 1024px  (lg:)
 *
 * Uses matchMedia listeners for efficient, debounce-free updates.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop'
    const w = window.innerWidth
    if (w < 768) return 'mobile'
    if (w < 1024) return 'tablet'
    return 'desktop'
  })

  useEffect(() => {
    const mql768 = window.matchMedia('(min-width: 768px)')
    const mql1024 = window.matchMedia('(min-width: 1024px)')

    const update = () => {
      if (mql1024.matches) setBreakpoint('desktop')
      else if (mql768.matches) setBreakpoint('tablet')
      else setBreakpoint('mobile')
    }

    mql768.addEventListener('change', update)
    mql1024.addEventListener('change', update)

    return () => {
      mql768.removeEventListener('change', update)
      mql1024.removeEventListener('change', update)
    }
  }, [])

  return breakpoint
}
