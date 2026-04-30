import { cn } from './utils/cn'

export type DetailTab<T extends string> = {
  id: T
  label: string
}

export interface DetailTabsProps<T extends string> {
  tabs: DetailTab<T>[]
  activeTab: T
  onChange: (tab: T) => void
  className?: string
}

export function DetailTabs<T extends string>({ tabs, activeTab, onChange, className }: DetailTabsProps<T>) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-4', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-t-lg px-4 py-3 text-sm font-bold transition-colors',
            activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
