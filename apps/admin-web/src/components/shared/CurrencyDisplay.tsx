import { formatCurrency } from '@admin/utils/currency-utils'
import { cn } from '@admin/utils/cn'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  showSign?: boolean
  type?: 'credit' | 'debit' | 'neutral'
}

export function CurrencyDisplay({ amount, className, showSign = false, type = 'neutral' }: CurrencyDisplayProps) {
  return (
    <span
      className={cn(
        'font-mono font-medium',
        type === 'credit' && 'text-emerald-600 dark:text-emerald-400',
        type === 'debit' && 'text-red-600 dark:text-red-400',
        className
      )}
    >
      {showSign && type === 'credit' && '+'}
      {showSign && type === 'debit' && '-'}
      {formatCurrency(Math.abs(amount))}
    </span>
  )
}
