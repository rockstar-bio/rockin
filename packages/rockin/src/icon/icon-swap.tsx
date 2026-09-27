import * as React from "react"

import { cn } from "cn"

type IconSwapProps = {
  active: boolean
  first: React.ReactNode
  second: React.ReactNode
  className?: string
}

export function IconSwap({ active, first, second, className }: IconSwapProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("t-icon-swap", className)}
      data-state={active ? "b" : "a"}
    >
      <span className="t-icon" data-icon="a">
        {first}
      </span>
      <span className="t-icon" data-icon="b">
        {second}
      </span>
    </span>
  )
}
