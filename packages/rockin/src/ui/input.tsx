import { Input as InputPrimitive } from "@base-ui/react/input"
import * as React from "react"

import { cn } from "cn"

function Input({
  className,
  type,
  inputMode,
  onWheel,
  ...props
}: React.ComponentProps<"input">) {
  const isNumberInput = type === "number"

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      inputMode={isNumberInput ? "decimal" : inputMode}
      onWheel={
        isNumberInput
          ? (event) => {
              event.currentTarget.blur()
              onWheel?.(event)
            }
          : onWheel
      }
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        isNumberInput &&
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
