"use client"
import { NumberField } from "@base-ui/react/number-field"
import { Minus, Plus } from "@gravity-ui/icons"
import * as React from "react"
import { buttonVariants } from "./button"

export const QuantityInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof NumberField.Root>
>(function QuantityInput({ ...props }, ref) {
  const id = React.useId()
  return (
    <NumberField.Root id={id} {...props} className="flex flex-col items-start">
      <NumberField.Group className="flex h-8 gap-1">
        <NumberField.Decrement
          className={buttonVariants({
            variant: "secondary",
            size: "icon-sm",
            className: "rounded-full! border-border!",
          })}
        >
          <Minus />
        </NumberField.Decrement>
        <NumberField.Input
          ref={ref}
          className="h-7 w-16 rounded-md border px-1 text-center"
          data-no-ring
        />
        <NumberField.Increment
          className={buttonVariants({
            variant: "secondary",
            size: "icon-sm",
            className: "rounded-full! border-border!",
          })}
        >
          <Plus />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  )
})
