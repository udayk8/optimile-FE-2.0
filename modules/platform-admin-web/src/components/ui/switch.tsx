import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-gray-300 bg-gray-200 transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitives.Root>
));

Switch.displayName = "Switch";
