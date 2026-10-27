"use client"

import { cn } from "cn"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const ROLL = { duration: 0.18, ease: EASE_OUT }
const SLIDE = { type: "spring", visualDuration: 0.2, bounce: 0 } as const
const HOLD_DELAY = 400
const FIRST_REPEAT = 150
const ACCELERATION = 0.85
const FASTEST = 40

const sizeStyles = {
  xs: {
    container: "h-6 p-0.5",
    button: "size-5",
    value: "w-6",
    text: "text-xs",
    icon: "size-3",
  },
  sm: {
    container: "h-7 p-0.5",
    button: "size-6",
    value: "w-7",
    text: "text-sm",
    icon: "size-3.5",
  },
  default: {
    container: "h-8 p-0.5",
    button: "size-7",
    value: "w-9",
    text: "text-sm",
    icon: "size-3.5",
  },
  lg: {
    container: "h-9 p-1",
    button: "size-8",
    value: "w-11",
    text: "text-[15px]",
    icon: "size-4",
  },
} as const

// "pill" is the default rounded look. "outline" is a compact, flat box for
// dense lists like cart lines: square ghost buttons and a mono number.
const variantStyles = {
  pill: {
    container: "shadow-raised rounded-full",
    button:
      "rounded-full text-foreground hover:bg-foreground/6 active:scale-[0.96]",
    limit: "opacity-35 hover:bg-transparent",
    text: "font-medium",
  },
  outline: {
    container:
      "rounded-lg bg-background p-0! transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15",
    button:
      "rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.94]",
    limit:
      "text-muted-foreground/35 hover:bg-transparent hover:text-muted-foreground/35",
    text: "font-mono font-medium tracking-tight",
  },
} as const

type Direction = 1 | -1

function useDirection(value: number) {
  const [previous, setPrevious] = useState(value)
  const [direction, setDirection] = useState<Direction>(1)

  if (value !== previous) {
    setPrevious(value)
    setDirection(value > previous ? 1 : -1)
  }

  return direction
}

export function RollingNumber({
  value,
  format = String,
  className,
}: {
  value: number
  format?: (value: number) => string
  className?: string
}) {
  const direction = useDirection(value)
  const chars = [...format(value)]

  return (
    <span
      aria-hidden
      className={cn("relative inline-flex tabular-nums", className)}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        {chars.map((char, index) => {
          const place = chars.length - index
          const digit = /\d/.test(char)

          return (
            <Place key={digit ? `d${place}` : `s${place}${char}`} digit={digit}>
              {digit ? <Digit char={char} direction={direction} /> : char}
            </Place>
          )
        })}
      </AnimatePresence>
    </span>
  )
}

function Place({
  digit,
  children,
}: {
  digit: boolean
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.span
      layout={reduceMotion ? false : "position"}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: "blur(0px)",
        transition: { duration: 0.1 },
      }}
      transition={{ ...ROLL, layout: SLIDE }}
      className={cn("inline-grid", digit && "overflow-hidden")}
    >
      {children}
    </motion.span>
  )
}

function Digit({ char, direction }: { char: string; direction: Direction }) {
  const reduceMotion = useReducedMotion()
  const offset = (value: Direction) => (reduceMotion ? "0%" : `${value * 100}%`)

  return (
    <AnimatePresence initial={false} custom={direction}>
      <motion.span
        key={char}
        custom={direction}
        variants={{
          enter: (value: Direction) => ({
            y: offset(value),
            opacity: 0,
          }),
          center: {
            y: "0%",
            opacity: 1,
          },
          exit: (value: Direction) => ({
            y: offset(-value as Direction),
            opacity: 0,
          }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={ROLL}
        className="col-start-1 row-start-1"
      >
        {char}
      </motion.span>
    </AnimatePresence>
  )
}

type NumberStepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  size?: keyof typeof sizeStyles
  variant?: keyof typeof variantStyles
  disabled?: boolean
  /** When set, the − button becomes a delete button once the value is at `min`. */
  onRemove?: () => void
  removeLabel?: string
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onKeyDownCapture?: React.KeyboardEventHandler<HTMLInputElement>
}

export const NumberStepper = forwardRef<HTMLInputElement, NumberStepperProps>(
  function NumberStepper(
    {
      label,
      value,
      onChange,
      min = 0,
      max = 99,
      step = 1,
      className,
      size = "default",
      variant = "pill",
      disabled = false,
      onRemove,
      removeLabel = "Remove",
      onFocus,
      onKeyDown,
      onKeyDownCapture,
    },
    ref
  ) {
    const reduceMotion = useReducedMotion()
    const id = useId()
    const [draft, setDraft] = useState<string | null>(null)
    const valueRef = useRef<HTMLSpanElement>(null)
    const bumpAnimation = useRef<Animation>(undefined)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

    const latest = useRef({
      value,
      onChange,
      min,
      max,
      disabled,
    })

    useLayoutEffect(() => {
      latest.current = {
        value,
        onChange,
        min,
        max,
        disabled,
      }
    })

    useEffect(
      () => () => {
        clearTimeout(timer.current)
        bumpAnimation.current?.cancel()
      },
      []
    )

    const bump = (direction: Direction) => {
      const element = valueRef.current

      if (!element || reduceMotion) return

      bumpAnimation.current?.cancel()

      bumpAnimation.current = element.animate(
        {
          translate: ["0", `${direction * 3}px`, "0"],
        },
        {
          duration: 200,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        }
      )
    }

    const setTo = (target: number, direction: Direction) => {
      const current = latest.current

      if (current.disabled) return false

      const next = Math.min(Math.max(target, current.min), current.max)

      if (next !== target) {
        bump(direction)
      }

      if (next === current.value) return false

      latest.current = {
        ...current,
        value: next,
      }

      current.onChange(next)

      return true
    }

    const stepBy = (delta: number) =>
      setTo(latest.current.value + delta, delta > 0 ? 1 : -1)

    const stop = () => {
      clearTimeout(timer.current)
    }

    const hold = (delta: number) => {
      if (disabled) return

      stop()

      if (!stepBy(delta)) return

      let interval = FIRST_REPEAT

      const repeat = () => {
        if (!stepBy(delta)) return

        interval = Math.max(FASTEST, interval * ACCELERATION)

        timer.current = setTimeout(repeat, interval)
      }

      timer.current = setTimeout(repeat, HOLD_DELAY)
    }

    const commitDraft = () => {
      if (draft === null) return

      const parsed = Number.parseInt(draft, 10)

      setDraft(null)

      if (Number.isNaN(parsed)) return

      setTo(parsed, parsed > latest.current.value ? 1 : -1)
    }

    const styles = sizeStyles[size]
    const look = variantStyles[variant]

    const button = (
      delta: number,
      atLimit: boolean,
      name: string,
      path: string
    ) => (
      <button
        type="button"
        disabled={disabled || atLimit}
        aria-label={`${name} ${label.toLowerCase()}`}
        aria-controls={id}
        aria-disabled={disabled || atLimit}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.button !== 0 || disabled) return

          event.preventDefault()
          hold(delta)
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (disabled) return

          if (event.detail === 0) {
            stepBy(delta)
          }
        }}
        className={cn(
          "flex shrink-0 touch-manipulation items-center justify-center outline-hidden select-none disabled:cursor-not-allowed",
          styles.button,
          "transition-[scale,opacity,background-color,color] duration-150 ease-out motion-reduce:transition-[opacity,background-color,color]",
          look.button,
          (disabled || atLimit) && look.limit
        )}
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={styles.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <path d={path} />
        </svg>
      </button>
    )

    // Separate key so a press that holds − down to `min` can't land as a
    // click on the delete button that replaces it.
    const removeButton = (
      <button
        key="remove"
        type="button"
        disabled={disabled}
        aria-label={removeLabel}
        onClick={() => {
          if (!disabled) onRemove?.()
        }}
        className={cn(
          "flex shrink-0 touch-manipulation items-center justify-center outline-hidden select-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
          styles.button,
          "transition-[scale,background-color,color] duration-150 ease-out motion-reduce:transition-[background-color,color]",
          look.button,
          "hover:bg-destructive/10 hover:text-destructive"
        )}
      >
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={styles.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.75 4.5h10.5M6.25 4.5V3h3.5v1.5M4.25 4.5l.6 8.5h6.3l.6-8.5M6.75 7v3.5M9.25 7v3.5" />
        </svg>
      </button>
    )

    const editing = draft !== null

    return (
      <div
        data-slot="input-group"
        data-variant={variant}
        className={cn(
          "inline-flex items-center border",
          disabled && "cursor-not-allowed opacity-50",
          styles.container,
          look.container,
          className
        )}
      >
        {onRemove && value <= min
          ? removeButton
          : button(-step, value <= min, "Decrease", "M3.5 8h9")}

        <span
          ref={valueRef}
          className={cn("relative grid place-items-center", styles.value)}
        >
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            data-slot="input-group-control"
            data-no-ring
            role="spinbutton"
            aria-label={label}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            inputMode="numeric"
            autoComplete="off"
            value={draft ?? String(value)}
            onChange={(event) => {
              setDraft(event.target.value.replace(/\D/g, ""))
            }}
            onFocus={(event) => {
              event.currentTarget.select()
              onFocus?.(event)
            }}
            onBlur={commitDraft}
            onKeyDownCapture={onKeyDownCapture}
            onKeyDown={(event) => {
              onKeyDown?.(event)

              if (event.defaultPrevented) return

              const delta: Record<string, number> = {
                ArrowUp: step,
                ArrowDown: -step,
                PageUp: step * 10,
                PageDown: -step * 10,
              }

              if (event.key in delta) {
                event.preventDefault()
                setDraft(null)
                stepBy(delta[event.key])
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault()
                setDraft(null)
                setTo(
                  event.key === "Home" ? min : max,
                  event.key === "Home" ? -1 : 1
                )
              } else if (event.key === "Enter") {
                commitDraft()
              } else if (event.key === "Escape") {
                setDraft(null)
              }
            }}
            className={cn(
              "col-start-1 row-start-1 w-full bg-transparent text-center tabular-nums caret-foreground outline-hidden selection:bg-ring/25 disabled:cursor-not-allowed",
              styles.text,
              look.text,
              editing ? "text-foreground" : "text-transparent"
            )}
          />

          {!editing && (
            <RollingNumber
              value={value}
              className={cn(
                "pointer-events-none col-start-1 row-start-1 text-foreground",
                styles.text,
                look.text
              )}
            />
          )}
        </span>

        {button(step, value >= max, "Increase", "M3.5 8h9M8 3.5v9")}
      </div>
    )
  }
)
