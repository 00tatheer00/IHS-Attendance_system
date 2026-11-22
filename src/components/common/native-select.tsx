import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select>. Native pickers are the best experience on phones
 * and work inside plain <form> server actions without extra wiring.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-input bg-background pr-8 pl-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
