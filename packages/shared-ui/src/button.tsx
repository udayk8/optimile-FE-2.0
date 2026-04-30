import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils/cn'

const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-white hover:bg-secondary',
        destructive: 'border-danger bg-danger text-white hover:bg-danger/90',
        outline: 'border-gray-300 bg-white text-primary hover:bg-gray-50',
        secondary: 'border-gray-300 bg-white text-primary hover:bg-gray-50',
        ghost: 'border-transparent bg-transparent text-gray-700 hover:bg-gray-100',
        link: 'h-auto border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline',
        success: 'border-success bg-success text-white hover:bg-success/90',
        warning: 'border-warning bg-warning text-white hover:bg-warning/90',
        unstyled: '',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
