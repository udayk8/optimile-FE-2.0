import type { ComponentType } from 'react'
import { RouteGuard } from './RouteGuard'
import type { ModulePermission } from '../permissions'
import type { Portal } from '../utils/authStorage'

export function withAuthGuard<P extends object>(
  Component: ComponentType<P>,
  options: { portal: Portal; module?: ModulePermission }
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard portal={options.portal} module={options.module}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}
