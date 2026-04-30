import { formatCurrency } from '@vendor/utils/currency-utils'
import { cn } from '@vendor/utils/cn'

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
        type === 'credit' && 'text-success',
        type === 'debit' && 'text-danger',
        className
      )}
    >
      {showSign && type === 'credit' && '+'}
      {showSign && type === 'debit' && '-'}
      {formatCurrency(Math.abs(amount))}
    </span>
  )
}
