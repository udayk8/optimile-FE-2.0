import { forwardRef, useCallback } from 'react'
import {
  Link as RouterLink,
  type LinkProps,
  useLocation,
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from 'react-router-dom'

const STANDALONE_BASE = '/vendor'

// Detect the current mount base. Standalone app runs at `/vendor`; the
// platform-admin tenant shell mounts the same module at
// `/tenant/<id>/vendor-portal`. We pick the latter when the URL matches it
// so internal navigates stay inside the tenant shell instead of leaking to
// the standalone module URL.
export function useModuleBase(): string {
  const { pathname } = useLocation()
  const match = pathname.match(/^(.*?\/vendor-portal)(?:\/|$)/)
  return match?.[1] ?? STANDALONE_BASE
}

function rebaseString(to: string, base: string): string {
  if (to === STANDALONE_BASE) return base
  if (to.startsWith(`${STANDALONE_BASE}/`)) {
    return `${base}${to.slice(STANDALONE_BASE.length)}`
  }
  return to
}

function rebase(to: To, base: string): To {
  if (typeof to === 'string') return rebaseString(to, base)
  return { ...to, pathname: to.pathname ? rebaseString(to.pathname, base) : to.pathname }
}

export function useModuleNavigate(): NavigateFunction {
  const navigate = useNavigate()
  const base = useModuleBase()
  return useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to)
      return navigate(rebase(to, base), options)
    }) as NavigateFunction,
    [navigate, base],
  )
}

export const ModuleLink = forwardRef<HTMLAnchorElement, LinkProps>(function ModuleLink(props, ref) {
  const base = useModuleBase()
  const to = rebase(props.to, base)
  return <RouterLink {...props} to={to} ref={ref} />
})
