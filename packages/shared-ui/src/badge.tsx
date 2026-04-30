import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary ring-primary/20',
        secondary: 'bg-secondary text-secondary-foreground ring-gray-200',
        destructive: 'bg-danger/10 text-danger ring-danger/20',
        outline: 'text-text ring-gray-200',
        success: 'bg-success/10 text-success ring-success/20',
        warning: 'bg-warning/10 text-warning ring-warning/20',
        info: 'bg-primary/10 text-primary ring-primary/20',
        muted: 'bg-gray-100 text-gray-600 ring-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
