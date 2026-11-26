"use client"

import {
  animateIn,
  animateOut,
  definePrimitive,
  type PropsOf,
  type StateOf,
} from "@ui-sdk/core"
import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { cn } from "cn"
import * as React from "react"

type AnimateView = "list" | "grid"

type AnimatePresetName =
  | "fade"
  | "slide-down"
  | "slide-up"
  | "slide-left"
  | "slide-right"
  | "scale"
  | "blur"
  | "none"

type AnimateOptions = {
  /** `"list"` stacks items; `"grid"` fills columns. Switching animates items to their new place. */
  view?: AnimateView
  /** Slide the other items into place when one is added or removed. */
  reflow?: boolean
  /** Removed items shrink their height to nothing instead of fading in place. Animates layout, so off by default. */
  collapse?: boolean
  /** Scroll an item into view when it's added or its `pulseKey` changes. */
  reveal?: boolean
  /** Also animate the items present on first render. */
  animateInitial?: boolean
  /** Turn animation off, e.g. while filtering a long list. Items keep their state. */
  disabled?: boolean
}

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)"
const REFLOW_MS = 200
const PULSE_MS = 600

// Presets are plain Tailwind classes on `data-starting-style` / `data-ending-style`,
// so a custom one is just a className (with preset="none").
const animatePresets: Record<AnimatePresetName, string> = {
  fade: "data-starting-style:opacity-0 data-ending-style:opacity-0",
  "slide-down":
    "data-starting-style:opacity-0 data-starting-style:-translate-y-1.5 data-ending-style:opacity-0",
  "slide-up":
    "data-starting-style:opacity-0 data-starting-style:translate-y-1.5 data-ending-style:opacity-0",
  "slide-left":
    "data-starting-style:opacity-0 data-starting-style:translate-x-2 data-ending-style:opacity-0",
  "slide-right":
    "data-starting-style:opacity-0 data-starting-style:-translate-x-2 data-ending-style:opacity-0",
  scale:
    "data-starting-style:opacity-0 data-starting-style:scale-96 data-ending-style:opacity-0 data-ending-style:scale-98",
  blur: "data-starting-style:opacity-0 data-starting-style:blur-xs data-ending-style:opacity-0 data-ending-style:blur-xs",
  none: "",
}

const defaultViewPreset: Record<AnimateView, AnimatePresetName> = {
  list: "slide-down",
  grid: "scale",
}

const viewClassName: Record<AnimateView, string> = {
  list: "flex flex-col",
  grid: "grid grid-cols-[repeat(auto-fill,minmax(min(var(--animate-min-item,10rem),100%),1fr))]",
}

// Only compositor-friendly properties by default, so long lists stay smooth on phones.
const ITEM_BASE =
  "transition-[opacity,translate,scale,filter,background-color] duration-200 data-ending-style:duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"

// Opt-in: height is pinned to its measured size, then eased to zero. This animates
// layout every frame, so prefer the default fade + reflow for long lists.
const ITEM_COLLAPSE =
  "transition-[opacity,translate,scale,filter,background-color,height,padding,margin,border-width] data-ending-style:duration-200 data-exiting:h-(--animate-height) data-exiting:overflow-hidden data-ending-style:h-0! data-ending-style:py-0! data-ending-style:my-0! data-ending-style:border-y-0!"

const ITEM_PULSE = "data-pulse:bg-primary/8"

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

function scrollParent(el: HTMLElement) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
  }
  return null
}

const layoutTop = (el: HTMLElement) => {
  let top = 0
  for (
    let node: HTMLElement | null = el;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    top += node.offsetTop
  }
  return top
}

/**
 * Scrolls the nearest scroller just enough to show `el`, from layout offsets: an item
 * that's still mid-enter (translated) lands fully in view in one smooth scroll.
 */
function revealElement(el: HTMLElement) {
  const behavior: ScrollBehavior = reducedMotion() ? "auto" : "smooth"
  const container = scrollParent(el)
  if (!container) {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior })
    return
  }
  const top = layoutTop(el) - layoutTop(container) - container.clientTop
  const bottom = top + el.offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight
  if (top < viewTop) container.scrollTo({ top, behavior })
  else if (bottom > viewBottom) {
    container.scrollTo({ top: bottom - container.clientHeight, behavior })
  }
}

type Rects = Map<HTMLElement, { x: number; y: number }>

function measureChildren(root: HTMLElement): Rects {
  const rects: Rects = new Map()
  for (const child of Array.from(root.children)) {
    if (child instanceof HTMLElement) {
      rects.set(child, { x: child.offsetLeft, y: child.offsetTop })
    }
  }
  return rects
}

/** FLIP: slides each child from its old spot to its new one with `translate` only. */
function playReflow(previous: Rects, next: Rects) {
  for (const [child, rect] of next) {
    const from = previous.get(child)
    if (!from || child.hasAttribute("data-exiting")) continue
    const dx = from.x - rect.x
    const dy = from.y - rect.y
    if (!dx && !dy) continue
    child.animate(
      [{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }],
      { duration: REFLOW_MS, easing: EASE_OUT, composite: "add" }
    )
  }
}

const fromOptions = (options: AnimateOptions) => ({
  view: (options.view === "grid" ? "grid" : "list") as AnimateView,
  reflow: options.reflow ?? true,
  collapse: options.collapse ?? false,
  reveal: options.reveal ?? false,
  animateInitial: options.animateInitial ?? false,
  disabled: options.disabled ?? false,
})

const animatePrimitive = definePrimitive({
  name: "animate",
  options: {
    view: "string",
    reflow: "boolean",
    collapse: "boolean",
    reveal: "boolean",
    animateInitial: "boolean",
    disabled: "boolean",
  },
  state: (options: AnimateOptions) => ({
    ...fromOptions(options),
    ready: false,
  }),
  live: ["ready"],
  sync: fromOptions,
  api: () => ({}),
  slots: (slot) => ({
    root: slot<object, { view: AnimateView }>({
      state: (state) => ({ view: state.view }),
      attrs: (state) => ({
        "data-view": state.view,
        "data-collapse": state.collapse ? "" : undefined,
      }),
      bind: (_el, { store }) => {
        // Items bind before their root, so the first render's items see `ready: false`.
        store.set({ ready: true })
      },
    }),
    item: slot<{ reveal?: boolean }>({
      props: { reveal: "boolean" },
      bind: (el, { store, props }) => {
        const state = store.get()
        if (state.disabled || (!state.ready && !state.animateInitial)) return
        if (state.ready && (props.reveal ?? state.reveal)) revealElement(el)
        return animateIn(el)
      },
    }),
  }),
})

const Parts = createParts(animatePrimitive, { root: "div", item: "div" })

type ClassName<S> = string | ((state: S) => string | undefined) | undefined

const withClass = <S,>(className: ClassName<S>, base: string) =>
  typeof className === "function"
    ? (state: S) => cn(base, className(state))
    : cn(base, className)

type StyleProp<S> =
  | React.CSSProperties
  | ((state: S) => React.CSSProperties | undefined)
  | undefined

const withMinItem = <S,>(style: StyleProp<S>, width: string) => {
  const extra = { "--animate-min-item": width } as React.CSSProperties
  return typeof style === "function"
    ? (state: S) => ({ ...extra, ...style(state) })
    : { ...extra, ...style }
}

type GroupContextValue = {
  preset: AnimatePresetName
  collapse: boolean
  reflow: boolean
  reveal: boolean
  disabled: boolean
  itemRender: React.ReactElement | undefined
}

const GroupContext = React.createContext<GroupContextValue | null>(null)

type PresenceContextValue = { exiting: boolean; onExited: () => void }

const PresenceContext = React.createContext<PresenceContextValue | null>(null)

type Entry = { key: string; element: React.ReactElement; exiting: boolean }

const keyOf = (element: React.ReactElement, index: number) =>
  element.key == null ? `.${index}` : String(element.key)

/** The next children in order, with leaving ones kept after their old neighbour. */
function mergeEntries(previous: Entry[], next: React.ReactElement[]): Entry[] {
  const result: Entry[] = next.map((element, index) => ({
    key: keyOf(element, index),
    element,
    exiting: false,
  }))
  if (previous.length === 0) return result

  const nextKeys = new Set(result.map((entry) => entry.key))
  previous.forEach((entry, index) => {
    if (nextKeys.has(entry.key)) return
    let at = 0
    for (let i = index - 1; i >= 0; i -= 1) {
      const position = result.findIndex((item) => item.key === previous[i].key)
      if (position !== -1) {
        at = position + 1
        break
      }
    }
    result.splice(at, 0, { ...entry, exiting: true })
  })
  return result
}

function usePresence(children: React.ReactNode) {
  const next = React.Children.toArray(children).filter(React.isValidElement)
  const [state, setState] = React.useState(() => ({
    children,
    entries: mergeEntries([], next),
  }))

  let entries = state.entries
  if (state.children !== children) {
    entries = mergeEntries(state.entries, next)
    setState({ children, entries })
  }

  const remove = React.useCallback((key: string) => {
    setState((current) => ({
      ...current,
      entries: current.entries.filter(
        (entry) => !(entry.exiting && entry.key === key)
      ),
    }))
  }, [])

  return [entries, remove] as const
}

const itemTagFor: Record<string, string> = {
  ul: "li",
  ol: "li",
  menu: "li",
  tbody: "tr",
  thead: "tr",
  tfoot: "tr",
}

const itemRenderFor = (render: unknown) => {
  if (!React.isValidElement(render) || typeof render.type !== "string") return
  const tag = itemTagFor[render.type]
  return tag ? React.createElement(tag) : undefined
}

type AnimateProps = AnimateOptions &
  Omit<
    PartProps<"div", StateOf<typeof animatePrimitive, "root">>,
    keyof AnimateOptions | "children"
  > & {
    /** Keyed `Animate.Item`s, or keyed components that render one. */
    children?: React.ReactNode
    /** How items enter and leave. A preset, or `"none"` to write your own `data-starting-style:` classes. */
    preset?: AnimatePresetName
    /** Narrowest grid column before wrapping, in `"grid"` view. Any CSS length. */
    minItemWidth?: string
  }

/**
 * Animates items as they're added and removed, and slides the rest into place.
 * Pick the element with `render`: `<ul />` makes items `<li>`, `<tbody />` makes them `<tr>`.
 */
function AnimateRoot({
  children,
  className,
  style,
  render,
  preset,
  minItemWidth,
  view = "list",
  collapse = false,
  reflow = true,
  reveal = false,
  disabled = false,
  ref,
  ...props
}: AnimateProps) {
  const [entries, remove] = usePresence(children)
  const resolvedCollapse = collapse

  // FLIP without observers: read old positions in the render that changes membership
  // (the DOM is still the old one), play the slide once React has committed.
  const rootRef = React.useRef<HTMLElement | null>(null)
  const setRoot = React.useCallback(
    (value: HTMLDivElement | null) => {
      rootRef.current = value
      if (typeof ref === "function") ref(value)
      else if (ref) ref.current = value
    },
    [ref]
  )
  const signature = `${view}|${entries.map((entry) => entry.key).join("\u0000")}`
  const committed = React.useRef(signature)
  const snapshot = React.useRef<Rects | null>(null)
  if (signature !== committed.current && !snapshot.current && rootRef.current) {
    snapshot.current = measureChildren(rootRef.current)
  }
  React.useLayoutEffect(() => {
    if (signature === committed.current) return
    committed.current = signature
    const previous = snapshot.current
    snapshot.current = null
    const root = rootRef.current
    if (!previous || !root || !reflow || disabled || reducedMotion()) return
    playReflow(previous, measureChildren(root))
  }, [signature, reflow, disabled])
  const group = React.useMemo<GroupContextValue>(
    () => ({
      preset: preset ?? defaultViewPreset[view],
      collapse: resolvedCollapse,
      reflow,
      reveal,
      disabled,
      itemRender: itemRenderFor(render),
    }),
    [preset, view, resolvedCollapse, reflow, reveal, disabled, render]
  )

  return (
    <GroupContext value={group}>
      <Parts.Root
        {...props}
        ref={setRoot}
        render={render}
        view={view}
        reflow={reflow}
        collapse={resolvedCollapse}
        reveal={reveal}
        disabled={disabled}
        className={withClass(
          className,
          cn("relative isolate", viewClassName[view])
        )}
        style={minItemWidth ? withMinItem(style, minItemWidth) : style}
      >
        {entries.map((entry) => (
          <PresenceEntry
            key={entry.key}
            exiting={entry.exiting}
            onExited={() => remove(entry.key)}
          >
            {entry.element}
          </PresenceEntry>
        ))}
      </Parts.Root>
    </GroupContext>
  )
}

function PresenceEntry({
  exiting,
  onExited,
  children,
}: PresenceContextValue & { children: React.ReactNode }) {
  const latest = React.useRef(onExited)
  React.useLayoutEffect(() => {
    latest.current = onExited
  })
  const value = React.useMemo(
    () => ({ exiting, onExited: () => latest.current() }),
    [exiting]
  )
  return <PresenceContext value={value}>{children}</PresenceContext>
}

type AnimateItemProps = PropsOf<typeof animatePrimitive, "item"> &
  Omit<
    PartProps<"div", StateOf<typeof animatePrimitive, "item">>,
    keyof PropsOf<typeof animatePrimitive, "item"> | "ref"
  > & {
    /** Override the group's preset for this item. */
    preset?: AnimatePresetName
    /**
     * Any value that means "this item changed", like a quantity. When it changes the item
     * gets `data-pulse` briefly (default tint `bg-primary/8`; override with `data-pulse:`)
     * and, with `reveal`, scrolls into view.
     */
    pulseKey?: unknown
    ref?: React.Ref<HTMLElement>
  }

function AnimateItem({
  className,
  render,
  preset,
  pulseKey,
  reveal,
  ref,
  ...props
}: AnimateItemProps) {
  const group = React.useContext(GroupContext)
  const presence = React.useContext(PresenceContext)
  const exiting = presence?.exiting ?? false
  const disabled = group?.disabled ?? false
  const shouldReveal = reveal ?? group?.reveal ?? false

  const node = React.useRef<HTMLElement | null>(null)
  const setNode = React.useCallback(
    (value: HTMLElement | null) => {
      node.current = value
      if (typeof ref === "function") ref(value)
      else if (ref) ref.current = value
    },
    [ref]
  )

  React.useLayoutEffect(() => {
    const el = node.current
    if (!exiting || !presence) return
    if (!el || disabled) {
      presence.onExited()
      return
    }
    const parent = el.parentElement
    const popped: string[] = []
    if (group?.collapse) {
      el.style.setProperty("--animate-height", `${el.offsetHeight}px`)
      el.dataset.exiting = ""
      // Commit the pinned height before the ending style eases it to zero.
      void el.offsetHeight
    } else if (parent) {
      // Pop the item out of the flow where it stands, so the rest slide into its
      // space while it fades, instead of after.
      const before = measureChildren(parent)
      const pin = {
        position: "absolute",
        top: `${el.offsetTop}px`,
        left: `${el.offsetLeft}px`,
        width: `${el.offsetWidth}px`,
        height: `${el.offsetHeight}px`,
        margin: "0px",
        zIndex: "-1",
        pointerEvents: "none",
      }
      el.dataset.exiting = ""
      for (const [name, value] of Object.entries(pin)) {
        el.style.setProperty(
          name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`),
          value
        )
        popped.push(name)
      }
      if ((group?.reflow ?? true) && !reducedMotion()) {
        playReflow(before, measureChildren(parent))
      }
    } else {
      el.dataset.exiting = ""
    }
    const stop = animateOut(el, presence.onExited)
    return () => {
      stop()
      delete el.dataset.exiting
      el.style.removeProperty("--animate-height")
      for (const name of popped) {
        el.style.removeProperty(
          name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
        )
      }
    }
    // Starts or cancels the exit; the rest is read when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting])

  // Count pulses from prop changes during render; no effect needed to detect them.
  const [pulse, setPulse] = React.useState({ key: pulseKey, count: 0 })
  if (!Object.is(pulse.key, pulseKey)) {
    setPulse({ key: pulseKey, count: pulse.count + 1 })
  }

  React.useEffect(() => {
    const el = node.current
    if (pulse.count === 0 || !el || exiting) return
    if (shouldReveal && !disabled) revealElement(el)
    if (reducedMotion()) return
    el.dataset.pulse = ""
    const timer = window.setTimeout(() => delete el.dataset.pulse, PULSE_MS)
    return () => {
      window.clearTimeout(timer)
      delete el.dataset.pulse
    }
    // Runs once per pulse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse.count])

  return (
    <Parts.Item
      {...props}
      ref={setNode}
      reveal={reveal}
      render={render ?? group?.itemRender}
      className={withClass(
        className,
        cn(
          ITEM_BASE,
          animatePresets[preset ?? group?.preset ?? "slide-down"],
          group?.collapse && ITEM_COLLAPSE,
          pulseKey !== undefined && ITEM_PULSE
        )
      )}
    />
  )
}

/**
 * Use as `<Animate>` with `<Animate.Item>`, or import `AnimateItem` on its own.
 * Server Components should use the named export: dotted parts don't cross the client boundary.
 */
const Animate = Object.assign(AnimateRoot, { Item: AnimateItem })

export { Animate, AnimateItem, animatePresets, animatePrimitive }
export type {
  AnimateItemProps,
  AnimateOptions,
  AnimatePresetName,
  AnimateProps,
  AnimateView,
}
