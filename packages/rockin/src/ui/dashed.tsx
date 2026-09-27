"use client"

import * as React from "react"

import { cn } from "cn"

type DashedSeparatorProps = {
  className?: string
  dashWidth?: number
  minimumGap?: number
  thickness?: number
}

export function DashedSeparator({
  className,
  dashWidth = 12,
  minimumGap = 8,
  thickness = 1,
}: DashedSeparatorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dashCount, setDashCount] = React.useState(0)

  React.useEffect(() => {
    const element = containerRef.current

    if (!element) return

    const updateDashCount = () => {
      const width = element.getBoundingClientRect().width

      const count = Math.max(
        2,
        Math.floor((width + minimumGap) / (dashWidth + minimumGap))
      )

      setDashCount(count)
    }

    updateDashCount()

    const observer = new ResizeObserver(updateDashCount)
    observer.observe(element)

    return () => observer.disconnect()
  }, [dashWidth, minimumGap])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "flex w-full items-center justify-between overflow-hidden text-border",
        className
      )}
      style={{ height: thickness }}
    >
      {Array.from({ length: dashCount }).map((_, index) => (
        <span
          key={index}
          className="shrink-0 bg-current"
          style={{
            width: dashWidth,
            height: thickness,
          }}
        />
      ))}
    </div>
  )
}
