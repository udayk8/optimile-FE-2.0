import { Navigate } from 'react-router-dom'
import { MODULE_MANIFESTS } from './registry'

export function ShellHome() {
  const first = MODULE_MANIFESTS[0]
  if (!first) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        No modules are available for your account.
      </div>
    )
  }
  const target = first.defaultPath ?? first.sidebar[0]?.path ?? first.basePath
  return <Navigate to={target} replace />
}
