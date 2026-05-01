import * as React from 'react'
import { cn } from '@vendor/lib/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition placeholder:text-gray-400 focus:border-primary focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
