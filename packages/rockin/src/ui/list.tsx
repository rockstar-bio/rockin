"use client"
import {
  createController,
  createRovingFocus,
  definePrimitive,
  idPart,
  live,
  selects,
  spatialMove,
  type OptionsOf,
  type PropsOf,
  type RovingFocusMoveContext,
  type SlotName,
  type StateOf,
} from "@ui-sdk/core"
import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * How arrow keys move between items: `vertical` (Up/Down), `horizontal`
 * (Left/Right), or `grid` (all four arrows, following the on-screen layout,
 * so wrapping card grids work at any column count).
 */
type ListOrientation = "vertical" | "horizontal" | "grid"

type ListController = {
  /** Focuses an item by `value`, or the item holding the tab stop, or the first. */
  focus: (value?: string) => void
}

type ListOptions = {
  /** Arrow-key axis. Defaults to `vertical`. */
  orientation?: ListOrientation
  /** Whether arrows wrap past either end. Defaults to `false`. Ignored by `grid`. */
  loop?: boolean
  /** From `createListController()`, to focus the list from another control (e.g. ArrowDown in a search box). */
  controller?: ListController
}

type ListItemProps = {
  /** Stable key for the item, like a record id. Generated when omitted. */
  value?: string
  /** Keeps the item reachable by arrows but blocks Enter/Space activation. */
  disabled?: boolean
}

const orientationOf = (value: unknown): ListOrientation =>
  value === "horizontal" || value === "grid" ? value : "vertical"

const fromOptions = (options: ListOptions) => ({
  orientation: orientationOf(options.orientation),
})

const itemSelector = '[data-slot="list-item"]'

const pageKeys = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
])

const labelId = (id: string, key: string) => `${id}-label-${idPart(key)}`

const spatial = spatialMove()

const steps: Record<ListOrientation, Record<string, number>> = {
  vertical: { ArrowDown: 1, ArrowUp: -1 },
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
  grid: {},
}

/** Activates the focused item on Enter/Space by clicking it, so `onClick` is the one handler. */
const activates = (event: KeyboardEvent) =>
  (event.key === "Enter" || event.key === " ") &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey

function createListController() {
  return createController<ListController>()
}

const list = definePrimitive({
  name: "list",
  options: {
    orientation: "string",
    loop: "boolean",
    controller: "value",
  },
  state: (options: ListOptions) => ({
    ...fromOptions(options),
    stop: null as string | null,
    labels: [] as string[],
    /** The item shown as current: the hovered one, or the focused one while keys drive. */
    highlighted: null as string | null,
    /** True after arrow-key navigation until the mouse really moves, like cmdk. */
    pointerHidden: false,
  }),
  live: ["labels", "highlighted", "pointerHidden"],
  sync: fromOptions,
  api: (context) => {
    const { store, options } = context

    const move = (
      event: KeyboardEvent,
      ctx: RovingFocusMoveContext<ListItemProps>
    ): string | undefined => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return
      }
      const { orientation } = store.get()
      if (orientation === "grid") return spatial(event, ctx)

      const { items, from, rtl } = ctx
      if (!items.length) return
      if (event.key === "Home") return items[0].key
      if (event.key === "End") return items[items.length - 1].key

      let step = steps[orientation][event.key]
      if (step === undefined) return
      if (orientation === "horizontal" && rtl) step = -step

      const index = items.findIndex((item) => item.key === from.key)
      let next = index + step
      if (next < 0 || next >= items.length) {
        if (!options().loop) return from.key
        next = (next + items.length) % items.length
      }
      return items[next].key
    }

    const roving = createRovingFocus<{ stop: string | null }, ListItemProps>(
      context,
      {
        slot: "item",
        key: "stop",
        disabled: (item) => !!item.props?.disabled,
        move,
      }
    )

    let hovered: string | null = null
    let pointer = { x: Number.NaN, y: Number.NaN }

    const itemOf = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.<HTMLElement>(
        itemSelector
      )
      return el ? roving.items().find((item) => item.el === el) : undefined
    }

    /** The item that has DOM focus, not a control nested inside one. */
    const focusedItem = () =>
      itemOf(document.activeElement)?.el === document.activeElement
        ? itemOf(document.activeElement)
        : undefined

    const highlight = (key: string | null) => {
      if (store.get().highlighted !== key) store.set({ highlighted: key })
    }

    return {
      focus: (value?: string) => roving.focus(value),
      internal: {
        roving,
        keydown(event: KeyboardEvent, el: HTMLElement) {
          // Only the item itself; nested buttons/inputs keep their keys.
          if (event.defaultPrevented || event.target !== el) return
          const moved = roving.keydown(event, el)
          if (moved) {
            highlight(moved.key)
            if (!store.get().pointerHidden) store.set({ pointerHidden: true })
            return
          }
          if (!activates(event)) return
          event.preventDefault()
          if (el.getAttribute("aria-disabled") !== "true") el.click()
        },
        pointermove(event: PointerEvent) {
          if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
            return
          }
          // Scrolling under a still cursor fires moves at the same spot; ignore them
          // so keyboard navigation keeps the highlight and the cursor stays hidden.
          if (event.clientX === pointer.x && event.clientY === pointer.y) return
          pointer = { x: event.clientX, y: event.clientY }
          if (store.get().pointerHidden) store.set({ pointerHidden: false })

          const item = itemOf(event.target)
          if (!item || item.props?.disabled) return
          hovered = item.key
          highlight(item.key)
          // Keys continue from the hovered item: follow it with focus when focus
          // is already on an item, otherwise just move the tab stop there.
          const focused = focusedItem()
          if (focused && focused.el !== item.el) {
            item.el.focus({ preventScroll: true })
          } else if (!focused) {
            roving.remember(item.key)
          }
        },
        pointerleave() {
          hovered = null
          highlight(focusedItem()?.key ?? null)
        },
        focusin(event: FocusEvent) {
          const item = itemOf(event.target)
          if (item && item.el === event.target) highlight(item.key)
        },
        focusout(event: FocusEvent, root: HTMLElement) {
          if (root.contains(event.relatedTarget as Node | null)) return
          highlight(hovered && !store.get().pointerHidden ? hovered : null)
        },
        /**
         * Keys pressed while nothing has focus (fresh page load, after closing a
         * drawer) act on the hovered item, like cmdk: arrows move from it and
         * Enter opens it. Focus in an input or another control is left alone.
         */
        listenToPage() {
          const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || !hovered) return
            if (event.altKey || event.ctrlKey || event.metaKey) return
            const active = document.activeElement
            if (
              active &&
              active !== document.body &&
              active !== document.documentElement
            ) {
              return
            }
            if (event.key !== "Enter" && !pageKeys.has(event.key)) return
            const item = roving
              .items()
              .find((candidate) => candidate.key === hovered)
            if (!item) return

            if (event.key === "Enter") {
              event.preventDefault()
              if (!item.props?.disabled) item.el.click()
              return
            }
            item.el.focus({ preventScroll: true })
            const moved = roving.keydown(event, item.el)
            event.preventDefault()
            highlight(moved?.key ?? item.key)
            if (!store.get().pointerHidden) store.set({ pointerHidden: true })
          }
          document.addEventListener("keydown", onKeyDown)
          return () => document.removeEventListener("keydown", onKeyDown)
        },
      },
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "list",
      selects: selects({ stop: [], labels: [], highlighted: [] }),
      state: (state) => ({ orientation: state.orientation }),
      attrs: (state) => ({ "data-orientation": state.orientation }),
      live: live((state) => ({
        "data-pointer-hidden": state.pointerHidden ? "" : undefined,
      })),
      on: {
        pointermove: (event, { api }) =>
          api.internal.pointermove(event as PointerEvent),
        pointerleave: (_event, { api }) => api.internal.pointerleave(),
        focusin: (event, { api }) => api.internal.focusin(event as FocusEvent),
        focusout: (event, { el, api }) => {
          if (el) api.internal.focusout(event as FocusEvent, el)
        },
      },
      bind: (_el, { api }) => api.internal.listenToPage(),
    }),
    item: slot<ListItemProps, { highlighted: boolean; disabled: boolean }>({
      role: "listitem",
      props: { value: "id", disabled: "boolean" },
      selects: selects({
        stop: ({ key }) => [key, null],
        labels: [],
        highlighted: ({ key }) => [key],
        pointerHidden: [],
      }),
      state: (state, { key, props }) => ({
        highlighted: state.highlighted === key,
        disabled: !!props.disabled,
      }),
      attrs: (state, { key, props, api }) => ({
        tabindex: api.internal.roving.tabIndex(state, { key, props }),
        "aria-disabled": props.disabled ? "true" : undefined,
        "data-disabled": props.disabled ? "" : undefined,
        "data-orientation": state.orientation,
      }),
      live: live((state, { key }) => ({
        "data-highlighted": state.highlighted === key ? "" : undefined,
      })),
      on: {
        keydown: (event, { el, api }) => {
          if (el) api.internal.keydown(event as KeyboardEvent, el)
        },
        click: (event, { props }) => {
          if (props.disabled) event.preventDefault()
        },
      },
      bind: (el, part) => part.api.internal.roving.bind(el, part),
    }),
    group: slot<{ value?: string }>({
      role: "group",
      props: { value: "id" },
      selects: selects({
        stop: [],
        labels: ({ key }) => [key],
        highlighted: [],
        pointerHidden: [],
      }),
      live: live((state, { id, key }) => ({
        "aria-labelledby": state.labels.includes(key)
          ? labelId(id, key)
          : undefined,
      })),
    }),
    label: slot<{ value?: string }>({
      props: { value: { kind: "string", from: "group" } },
      selects: selects({
        stop: [],
        labels: [],
        highlighted: [],
        pointerHidden: [],
      }),
      attrs: (_state, { id, key }) => ({ id: labelId(id, key) }),
      bind: (_el, { key, store }) => {
        store.set({ labels: [...store.get().labels, key] })
        return () =>
          store.set({
            labels: store.get().labels.filter((label) => label !== key),
          })
      },
    }),
  }),
})

type ListSlot = SlotName<typeof list>

type ListPartProps<S extends ListSlot> = PropsOf<typeof list, S> &
  Omit<PartProps<"div", StateOf<typeof list, S>>, keyof PropsOf<typeof list, S>>

type ListRootProps = OptionsOf<typeof list> &
  Omit<
    PartProps<"div", StateOf<typeof list, "root">>,
    keyof OptionsOf<typeof list>
  >

const Parts = createParts(list, {
  root: "div",
  item: "div",
  group: "div",
  label: "div",
})

type ClassName<S> = string | ((state: S) => string | undefined) | undefined

const withClass = <S,>(className: ClassName<S>, base: string) =>
  typeof className === "function"
    ? (state: S) => cn(base, className(state))
    : cn(base, className)

/**
 * A keyboard-navigable collection: one Tab stop, arrows move between items,
 * Home/End jump to the ends, Enter/Space activate the focused item's `onClick`.
 * Works for rows (`vertical`), strips (`horizontal`) and wrapping card grids (`grid`).
 */
function List({ className, ...props }: ListRootProps) {
  return (
    <Parts.Root
      {...props}
      className={withClass(
        className,
        "outline-none data-pointer-hidden:cursor-none data-pointer-hidden:**:cursor-none data-[orientation=horizontal]:flex data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex data-[orientation=vertical]:flex-col"
      )}
    />
  )
}

// `data-highlighted` is shared by the mouse and the keys (one highlight, like
// cmdk), so hover never fights the keyboard position.
const surface =
  "data-highlighted:bg-(--list-item-hover) active:bg-(--list-item-active) data-active:bg-(--list-item-active)"
const ring =
  "data-highlighted:ring-2 data-highlighted:ring-(--list-item-ring) data-active:ring-2 data-active:ring-(--list-item-ring)"
const focusRing =
  "focus-visible:ring-2 focus-visible:ring-(--list-item-ring) data-active:ring-2 data-active:ring-(--list-item-ring)"

/**
 * How an item shows hover, keyboard focus, press and `active`. Colours come
 * from CSS variables, so a list can retint without new variants:
 * `--list-item-hover`, `--list-item-active`, `--list-item-ring`.
 */
const listItemVariants = cva(
  cn(
    "relative cursor-pointer transition-[background-color,box-shadow] duration-150 ease-out outline-none [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none",
    "[--list-item-active:var(--color-muted)] [--list-item-hover:color-mix(in_oklab,var(--color-muted)_60%,transparent)] [--list-item-ring:var(--color-ring)]",
    "data-disabled:cursor-not-allowed data-disabled:opacity-60"
  ),
  {
    variants: {
      highlight: {
        /** Tinted background on hover, focus, press and active. */
        background: surface,
        /** Ring only; the background never changes. */
        outline: ring,
        /** Background on highlight, plus a ring on keyboard focus and active. */
        both: cn(surface, focusRing),
        /** No built-in states. Style `data-highlighted`, `:focus-visible` and `data-active` yourself. */
        none: "",
      },
      ring: {
        /** Ring drawn inside the item; safe for full-width rows and scroll areas. */
        inset: "ring-inset",
        /** Ring drawn outside the item, for spaced cards in a grid. */
        offset: "ring-offset-2 ring-offset-background",
      },
    },
    defaultVariants: { highlight: "background", ring: "inset" },
  }
)

type ListItemStyleProps = VariantProps<typeof listItemVariants> & {
  /** Marks the item that's open or current (e.g. the record shown in a drawer). Sets `aria-current` and `data-active`. */
  active?: boolean
}

/** One focusable entry. Put the action in `onClick`; Enter and Space trigger it too. */
function ListItem({
  className,
  highlight,
  ring: ringPlacement,
  active,
  ...props
}: ListPartProps<"item"> & ListItemStyleProps) {
  return (
    <Parts.Item
      aria-current={active ? "true" : undefined}
      data-active={active ? "" : undefined}
      data-highlight={highlight ?? "background"}
      {...props}
      className={withClass(
        className,
        listItemVariants({ highlight, ring: ringPlacement })
      )}
    />
  )
}

/** Groups items under a heading (e.g. a day) without breaking arrow navigation across groups. */
function ListGroup({ className, ...props }: ListPartProps<"group">) {
  return <Parts.Group {...props} className={withClass(className, "")} />
}

/** The visible name of its `ListGroup`; announced when focus enters the group. */
function ListLabel({ className, ...props }: ListPartProps<"label">) {
  return (
    <Parts.Label
      {...props}
      className={withClass(
        className,
        "text-xs font-medium text-muted-foreground"
      )}
    />
  )
}

export {
  createListController,
  List,
  ListGroup,
  ListItem,
  ListLabel,
  listItemVariants,
}
export type { ListController, ListOrientation, ListOptions }
