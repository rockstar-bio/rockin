"use client"

import { cn } from "cn"
import { type VariantProps } from "class-variance-authority"
import { motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { useId } from "react"

import { buttonVariants } from "./button"

const MORPH = { type: "spring", visualDuration: 0.4, bounce: 0 } as const
const RAY_STAGGER = 0.018
const EASE_OUT = [0.23, 1, 0.32, 1] as const

const SUN_R = 4.5
const MOON_R = 8
const RAY_OUT = { inner: 7.5, outer: 10 }
const RAY_IN = { inner: 3.5, outer: 5 }

const BITE_R = 7.5
const biteAt = (d: number) => ({
  cx: 12 + d * Math.cos((-5 * Math.PI) / 180),
  cy: 12 + d * Math.sin((-5 * Math.PI) / 180),
})
const BITE_OUT = biteAt(20)
const BITE_IN = biteAt(7.5)
const MOON_TILT = -40

const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4
  return { cos: Math.cos(a), sin: Math.sin(a) }
})

export function ThemeToggle({
  size = "default",
  variant,
  className,
}: {
  size?: "xs" | "sm" | "default" | "lg"
  variant?: VariantProps<typeof buttonVariants>["variant"]
  className?: string
}) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const reduceMotion = useReducedMotion()
  const dark = (resolvedTheme ?? theme) === "dark"
  const activeVariant = variant ?? "ghost"

  const maskId = `moon-${useId().replace(/[^\w-]/g, "")}`
  const morph = reduceMotion ? { duration: 0 } : MORPH

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        buttonVariants({ variant: activeVariant }),
        "shadow-raised relative touch-manipulation rounded-full outline-hidden select-none",
        "transition-[scale,background-color] duration-150 ease-out active:scale-[0.96] motion-reduce:transition-[background-color]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:outline-solid",
        size === "xs" && "size-6",
        size === "sm" && "size-7",
        size === "default" && "size-8",
        size === "lg" && "size-9",
        className
      )}
    >
      <motion.svg
        aria-hidden
        viewBox="0 0 24 24"
        className={
          size === "xs"
            ? "size-3"
            : size === "sm"
              ? "size-3.5"
              : size === "lg"
                ? "size-5"
                : "size-4"
        }
        initial={false}
        animate={{ rotate: dark ? MOON_TILT : 0 }}
        transition={morph}
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="24"
            height="24"
          >
            <rect width="24" height="24" fill="white" />
            <motion.circle
              r={BITE_R}
              fill="black"
              initial={false}
              animate={dark ? BITE_IN : BITE_OUT}
              transition={morph}
            />
          </mask>
        </defs>
        <motion.circle
          cx="12"
          cy="12"
          fill="currentColor"
          mask={`url(#${maskId})`}
          initial={false}
          animate={{ r: dark ? MOON_R : SUN_R }}
          transition={morph}
        />
        <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          {RAYS.map((ray, i) => {
            const { inner, outer } = dark ? RAY_IN : RAY_OUT
            // Retract in dial order. Extend in reverse, 60ms late, once the
            // disc has shrunk enough to give them room.
            const delay = reduceMotion
              ? 0
              : dark
                ? i * RAY_STAGGER
                : 0.06 + (RAYS.length - 1 - i) * RAY_STAGGER
            return (
              <motion.line
                key={i}
                initial={false}
                animate={{
                  x1: 12 + ray.cos * inner,
                  y1: 12 + ray.sin * inner,
                  x2: 12 + ray.cos * outer,
                  y2: 12 + ray.sin * outer,
                  opacity: dark ? 0 : 1,
                }}
                transition={{
                  ...morph,
                  delay,
                  opacity: {
                    duration: dark ? 0.12 : 0.18,
                    ease: EASE_OUT,
                    delay,
                  },
                }}
              />
            )
          })}
        </g>
      </motion.svg>
    </button>
  )
}
