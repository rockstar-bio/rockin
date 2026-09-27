"use client"

import { cn } from "cn"
import React from "react"

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  color?: string
}

export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = 16, color = "currentColor", style, ...props }, ref) => {
    const bars = Array(12).fill(0)

    return (
      <div
        ref={ref}
        className={cn("loader-wrapper", className)}
        style={
          {
            "--spinner-size": `${size}px`,
            "--spinner-color": color,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className="loader-spinner">
          {bars.map((_, i) => (
            <div className="loader-bar" key={`spinner-bar-${i}`} />
          ))}
        </div>
      </div>
    )
  }
)

Loader.displayName = "SpellUI.Loader"

export type { LoaderProps }
