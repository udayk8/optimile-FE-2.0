import type { DataSource } from '@vendor/types'

/**
 * Row background tint for the embedded merged portal:
 *  - CROSS_MODULE (real tenant data via the bridge) → white (no tint)
 *  - MOCK (local demo dataset) → light grey
 * Returns '' standalone / untagged so nothing changes there.
 */
export function rowShadeClass(source?: DataSource): string {
  if (source === 'CROSS_MODULE') return 'bg-white'
  if (source === 'MOCK') return 'bg-gray-100'
  return ''
}

/** Small inline key explaining the row shades. Only worth showing when a merged
 * (embedded) dataset can contain both sources. */
export function DataSourceLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-xs text-gray-500 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border border-gray-300 bg-white" />
        Cross-module data
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border border-gray-300 bg-gray-100" />
        Demo data
      </span>
    </div>
  )
}
