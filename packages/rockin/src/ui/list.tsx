"use client"
import {
  createController,
  createFocusRecovery,
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

type ListOrientation = "vertical" | "horizontal" | "grid"

type ListItemRole = "listitem" | "button"

type ListEdge = "up" | "down" | "left" | "right"

type ListController = {
  focus: (value?: string) => void
  focusFirst: () => boolean
  focusLast: () => boolean
  items: () => { value: string; label: string }[]
  open: (target: string) => void
}

type ListOptions = {
  orientation?: ListOrientation
  itemRole?: ListItemRole
  loop?: boolean
  controller?: ListController
  onEdge?: (edge: ListEdge, event: KeyboardEvent) => void
}

type ListItemProps = {
  value?: string
  disabled?: boolean
}

type ItemPart = { key: string; props: ListItemProps }

const ITEM = '[data-slot="list-item"]'
const TYPING =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const MODAL = '[aria-modal="true"], dialog[open]'
const CONTROL = "button, a[href], input, select, textarea, [tabindex]"
const OFF =
  ':disabled, [data-disabled], [aria-disabled="true"], [tabindex="-1"], [inert], [inert] *, [hidden], [hidden] *'

const ARROWS: Record<string, ListEdge> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
}
const PAGE_KEYS = new Set([...Object.keys(ARROWS), "Home", "End"])
const AXIS: Record<ListOrientation, readonly ListEdge[]> = {
  vertical: ["up", "down"],
  horizontal: ["left", "right"],
  grid: ["up", "down", "left", "right"],
}
const LINEAR: Record<"vertical" | "horizontal", Record<string, number>> = {
  vertical: { ArrowDown: 1, ArrowUp: -1 },
  horizontal: { ArrowRight: 1, ArrowLeft: -1 },
}

const spatial = spatialMove()

const modified = (event: KeyboardEvent) =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

const activates = (event: KeyboardEvent) =>
  (event.key === "Enter" || event.key === " ") && !modified(event)

const controlsIn = (root: HTMLElement | null) =>
  root
    ? Array.from(root.querySelectorAll<HTMLElement>(CONTROL)).filter(
        (el) => !el.matches(OFF)
      )
    : []

const inputIn = (root: HTMLElement | null) =>
  root?.querySelector<HTMLInputElement>("input:not(:disabled)") ?? null

const labelOf = (el: HTMLElement) =>
  (el.getAttribute("aria-label") ?? el.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)

const labelId = (id: string, key: string) => `${id}-label-${idPart(key)}`

const fromOptions = (options: ListOptions) => ({
  orientation: (options.orientation === "horizontal" ||
  options.orientation === "grid"
    ? options.orientation
    : "vertical") as ListOrientation,
  itemRole: (options.itemRole === "button"
    ? "button"
    : "listitem") as ListItemRole,
})

function createListController() {
  return createController<ListController>()
}

const list = definePrimitive({
  name: "list",
  options: {
    orientation: "string",
    itemRole: "string",
    loop: "boolean",
    controller: "value",
    onEdge: "callback",
  },
  state: (options: ListOptions) => ({
    ...fromOptions(options),
    stop: null as string | null,
    labels: [] as string[],
    grouped: false,
    highlighted: null as string | null,
    pointerHidden: false,
  }),
  live: ["labels", "highlighted", "pointerHidden"],
  sync: fromOptions,
  api: (context) => {
    const { store, options } = context

    const parts = new WeakMap<HTMLElement, ItemPart>()
    let hovered: string | null = null
    let pointer = { x: Number.NaN, y: Number.NaN }
    let search: HTMLElement | null = null
    let actions: HTMLElement | null = null
    let wrapped = 0
    let order = new Map<string, number>()
    let blocked: { edge: ListEdge; forward: boolean } | null = null

    const partOf = (node: EventTarget | null) => {
      const el = (node as Element | null)?.closest?.<HTMLElement>(ITEM)
      return el ? parts.get(el) : undefined
    }

    const refresh = (focus: EventTarget | null = document.activeElement) => {
      const { pointerHidden, highlighted } = store.get()
      const next = partOf(focus)?.key ?? (pointerHidden ? null : hovered)
      if (next !== highlighted) store.set({ highlighted: next })
    }

    const keysDrive = () => {
      if (!store.get().pointerHidden) store.set({ pointerHidden: true })
    }

    const step = (
      ctx: RovingFocusMoveContext<ListItemProps>,
      delta: number
    ) => {
      const index = ctx.items.findIndex((item) => item.key === ctx.from.key)
      return ctx.items[index + delta]?.key ?? ctx.from.key
    }

    const target = (
      event: KeyboardEvent,
      ctx: RovingFocusMoveContext<ListItemProps>
    ): string | undefined => {
      const { items, rtl, from } = ctx
      if (!items.length) return
      if (event.key === "Home") return items[0].key
      if (event.key === "End") return items[items.length - 1].key

      const { orientation } = store.get()
      if (orientation === "grid") {
        const next = spatial(event, ctx)
        if (next !== undefined) return next
        if (event.key === "ArrowRight") return step(ctx, rtl ? -1 : 1)
        if (event.key === "ArrowLeft") return step(ctx, rtl ? 1 : -1)
        return ARROWS[event.key] ? from.key : undefined
      }

      let delta = LINEAR[orientation][event.key]
      if (delta === undefined) return
      if (orientation === "horizontal" && rtl) delta = -delta
      return step(ctx, delta)
    }

    const move = (
      event: KeyboardEvent,
      ctx: RovingFocusMoveContext<ListItemProps>
    ) => {
      blocked = null
      if (modified(event)) return
      const next = target(event, ctx)
      const edge = ARROWS[event.key]
      if (
        edge &&
        next === ctx.from.key &&
        AXIS[store.get().orientation].includes(edge)
      ) {
        const forward =
          edge === "down" ||
          (edge === "right" && !ctx.rtl) ||
          (edge === "left" && ctx.rtl)
        blocked = { edge, forward }
      }
      return next
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

    const recovery = createFocusRecovery<ListItemProps>({
      fallback: (lost) => {
        const items = roving.items()
        const at = order.get(lost.key) ?? Number.POSITIVE_INFINITY
        return (
          items.find((item) => (order.get(item.key) ?? -1) > at) ?? items.at(-1)
        )?.el
      },
    })

    const focusItem = (pick: "first" | "last") => {
      const items = roving.items()
      const item = pick === "first" ? items[0] : items.at(-1)
      if (!item) return false
      roving.focus(item.key)
      return true
    }

    const focusSearch = () => {
      const input = inputIn(search)
      input?.focus()
      return !!input
    }

    const focusActions = (pick: "first" | "last") => {
      const controls = controlsIn(actions)
      const control = pick === "first" ? controls[0] : controls.at(-1)
      control?.focus()
      return !!control
    }

    const byKeys = (event: KeyboardEvent, go: () => boolean) => {
      keysDrive()
      if (go()) event.preventDefault()
      refresh()
    }

    const leave = (edge: ListEdge, forward: boolean, event: KeyboardEvent) => {
      const loop = !!options().loop
      const went = forward
        ? focusActions("first") ||
          (loop && (focusSearch() || focusItem("first")))
        : focusSearch() || (loop && (focusActions("last") || focusItem("last")))
      if (went) {
        event.preventDefault()
        return
      }
      const onEdge = options().onEdge
      if (!onEdge) return
      event.preventDefault()
      onEdge(edge, event)
    }

    const wrap = () => {
      wrapped += 1
      store.set({ grouped: true })
      return () => {
        wrapped -= 1
        store.set({ grouped: wrapped > 0 })
      }
    }

    const enabled = () => roving.items().filter((item) => !item.props?.disabled)

    const items = () =>
      enabled().map((item) => ({ value: item.key, label: labelOf(item.el) }))

    return {
      focus: (value?: string) => roving.focus(value),
      focusFirst: () => focusItem("first"),
      focusLast: () => focusItem("last"),
      items,
      open(wanted: string) {
        const needle = wanted.toLowerCase()
        const match = enabled().find(
          (item) =>
            item.key === wanted ||
            labelOf(item.el).toLowerCase().includes(needle)
        )
        if (!match) {
          throw new Error(
            `No item "${wanted}". Items: ${items()
              .map((item) => item.label)
              .join(", ")}`
          )
        }
        match.el.click()
      },
      internal: {
        roving,
        bindItem(el: HTMLElement, part: ItemPart) {
          parts.set(el, part)
          const unbindFocus = roving.bind(el, part)
          const unbindRecovery = recovery.bind(el, part)
          return () => {
            parts.delete(el)
            unbindFocus()
            unbindRecovery()
            if (hovered === part.key) hovered = null
          }
        },
        itemKeydown(event: KeyboardEvent, el: HTMLElement) {
          if (event.defaultPrevented || event.target !== el) return
          const moved = roving.keydown(event, el)
          const edge = blocked
          blocked = null
          if (edge) {
            keysDrive()
            leave(edge.edge, edge.forward, event)
            refresh()
            return
          }
          if (moved) {
            keysDrive()
            refresh()
            return
          }
          if (!activates(event)) return
          event.preventDefault()
          if (el.getAttribute("aria-disabled") !== "true") el.click()
        },
        searchKeydown(event: KeyboardEvent) {
          const input = event.target
          if (event.defaultPrevented || modified(event)) return
          if (!(input instanceof HTMLInputElement)) return
          if (input.getAttribute("aria-expanded") === "true") return
          const vertical = store.get().orientation !== "horizontal"
          if (vertical && event.key === "ArrowUp" && options().loop) {
            byKeys(event, () => focusActions("last") || focusItem("last"))
            return
          }
          if (event.key !== (vertical ? "ArrowDown" : "ArrowRight")) return
          if (!vertical && input.selectionStart !== input.value.length) return
          byKeys(event, () => focusItem("first"))
        },
        actionsKeydown(event: KeyboardEvent, root: HTMLElement) {
          if (event.defaultPrevented || modified(event)) return
          const controls = controlsIn(root)
          const index = controls.indexOf(event.target as HTMLElement)
          if (index === -1) return
          const vertical = store.get().orientation !== "horizontal"
          const rtl = getComputedStyle(root).direction === "rtl"
          const sideways: Record<string, number> = vertical
            ? { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }
            : { ArrowDown: 1, ArrowUp: -1 }
          const delta = sideways[event.key]
          if (delta !== undefined) {
            event.preventDefault()
            controls[index + delta]?.focus()
            return
          }
          if (event.key === (vertical ? "ArrowUp" : "ArrowLeft")) {
            byKeys(event, () => focusItem("last"))
          } else if (
            event.key === (vertical ? "ArrowDown" : "ArrowRight") &&
            options().loop
          ) {
            byKeys(event, () => focusSearch() || focusItem("first"))
          }
        },
        bindSearch(el: HTMLElement) {
          search = el
          const unwrap = wrap()
          return () => {
            unwrap()
            if (search === el) search = null
          }
        },
        bindActions(el: HTMLElement) {
          actions = el
          const unwrap = wrap()
          return () => {
            unwrap()
            if (actions === el) actions = null
          }
        },
        wrap,
        pointermove(event: PointerEvent) {
          if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
            return
          }
          if (event.clientX === pointer.x && event.clientY === pointer.y) return
          pointer = { x: event.clientX, y: event.clientY }
          if (store.get().pointerHidden) store.set({ pointerHidden: false })

          const part = partOf(event.target)
          hovered = part && !part.props.disabled ? part.key : null
          if (part && hovered) {
            const focused = partOf(document.activeElement)
            const el = (event.target as Element).closest<HTMLElement>(ITEM)
            if (focused && focused !== part && el) {
              el.focus({ preventScroll: true })
            } else if (!focused) {
              roving.remember(part.key)
            }
          }
          refresh()
        },
        pointerleave() {
          hovered = null
          refresh()
        },
        focusin(event: FocusEvent) {
          if (partOf(event.target)) {
            order = new Map(roving.items().map((item, i) => [item.key, i]))
          }
          refresh(event.target)
        },
        focusout(event: FocusEvent) {
          refresh(event.relatedTarget)
        },
        listenToPage(root: HTMLElement) {
          const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || !hovered || !root.isConnected) return
            if (event.altKey || event.ctrlKey || event.metaKey) return
            if (event.key !== "Enter" && !PAGE_KEYS.has(event.key)) return
            const active = document.activeElement
            if (active instanceof HTMLElement && active !== document.body) {
              if (event.key === "Enter") return
              if (active.closest(TYPING)) return
              const modal = active.closest(MODAL)
              if (modal && !modal.contains(root)) return
            }
            const item = roving.items().find((entry) => entry.key === hovered)
            if (!item) return

            if (event.key === "Enter") {
              event.preventDefault()
              if (!item.props?.disabled) item.el.click()
              return
            }
            keysDrive()
            item.el.focus({ preventScroll: true })
            roving.keydown(event, item.el)
            event.preventDefault()
            blocked = null
            refresh()
          }
          document.addEventListener("keydown", onKeyDown)
          return () => document.removeEventListener("keydown", onKeyDown)
        },
      },
    }
  },
  slots: (slot) => ({
    root: slot({
      role: (state) =>
        state.itemRole === "button" || state.grouped ? "group" : "list",
      roles: ["group", "list"],
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
        focusout: (event, { api }) =>
          api.internal.focusout(event as FocusEvent),
      },
      bind: (el, { api }) => api.internal.listenToPage(el),
    }),
    item: slot<ListItemProps, { highlighted: boolean; disabled: boolean }>({
      role: (state) => state.itemRole,
      roles: ["listitem", "button"],
      focus: "roving",
      press: { none: "The author's onClick is the action; keydown clicks it." },
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
          if (el) api.internal.itemKeydown(event as KeyboardEvent, el)
        },
        click: (event, { props }) => {
          if (props.disabled) event.preventDefault()
        },
      },
      bind: (el, part) => part.api.internal.bindItem(el, part),
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
    items: slot({
      role: (state) => (state.itemRole === "button" ? undefined : "list"),
      roles: ["list"],
      selects: selects({
        stop: [],
        labels: [],
        highlighted: [],
        pointerHidden: [],
      }),
      attrs: (state) => ({ "data-orientation": state.orientation }),
      bind: (_el, { api }) => api.internal.wrap(),
    }),
    search: slot({
      selects: selects({
        stop: [],
        labels: [],
        highlighted: [],
        pointerHidden: [],
      }),
      on: {
        keydown: (event, { api }) =>
          api.internal.searchKeydown(event as KeyboardEvent),
      },
      bind: (el, { api }) => api.internal.bindSearch(el),
    }),
    actions: slot({
      selects: selects({
        stop: [],
        labels: [],
        highlighted: [],
        pointerHidden: [],
      }),
      on: {
        keydown: (event, { el, api }) => {
          if (el) api.internal.actionsKeydown(event as KeyboardEvent, el)
        },
      },
      bind: (el, { api }) => api.internal.bindActions(el),
    }),
  }),
  agent: {
    actions: ["open", "focus", "focusFirst", "focusLast"],
    items: (api) => api.items(),
  },
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
  items: "div",
  search: "div",
  actions: "div",
})

type ClassName<S> = string | ((state: S) => string | undefined) | undefined

const withClass = <S,>(className: ClassName<S>, base: string) =>
  typeof className === "function"
    ? (state: S) => cn(base, className(state))
    : cn(base, className)

const layout =
  "data-[orientation=horizontal]:flex data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex data-[orientation=vertical]:flex-col"

function ListRoot({ className, ...props }: ListRootProps) {
  return (
    <Parts.Root
      {...props}
      className={withClass(
        className,
        cn(
          "outline-none data-pointer-hidden:cursor-none data-pointer-hidden:**:cursor-none",
          layout
        )
      )}
    />
  )
}

const surface =
  "data-highlighted:bg-(--list-item-hover) active:bg-(--list-item-active) data-active:bg-(--list-item-active)"
const ring =
  "data-highlighted:ring-1 data-highlighted:ring-(--list-item-ring) data-active:ring-1 data-active:ring-(--list-item-ring)"
const focusRing =
  "focus-visible:ring-1 focus-visible:ring-(--list-item-ring) data-active:ring-1 data-active:ring-(--list-item-ring)"

const listItemVariants = cva(
  cn(
    "relative cursor-pointer transition-[background-color,box-shadow] duration-150 ease-out outline-none [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none",
    "[--list-item-active:var(--color-muted)] [--list-item-hover:color-mix(in_oklab,var(--color-muted)_60%,transparent)] [--list-item-ring:var(--color-ring)]",
    "data-disabled:cursor-not-allowed data-disabled:opacity-60"
  ),
  {
    variants: {
      highlight: {
        background: surface,
        outline: ring,
        both: cn(surface, focusRing),
        none: "",
      },
      ring: {
        inset: "ring-inset",
        offset: "ring-offset-2 ring-offset-background",
      },
    },
    defaultVariants: { highlight: "background", ring: "inset" },
  }
)

type ListItemStyleProps = VariantProps<typeof listItemVariants> & {
  active?: boolean
}

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

function ListGroup({ className, ...props }: ListPartProps<"group">) {
  return <Parts.Group {...props} className={withClass(className, "")} />
}

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

function ListItems({ className, ...props }: ListPartProps<"items">) {
  return <Parts.Items {...props} className={withClass(className, layout)} />
}

function ListSearch({ className, ...props }: ListPartProps<"search">) {
  return <Parts.Search {...props} className={withClass(className, "")} />
}

function ListActions({ className, ...props }: ListPartProps<"actions">) {
  return <Parts.Actions {...props} className={withClass(className, "")} />
}

const List = Object.assign(ListRoot, {
  Item: ListItem,
  Group: ListGroup,
  Label: ListLabel,
  Items: ListItems,
  Search: ListSearch,
  Actions: ListActions,
})

export {
  createListController,
  List,
  ListActions,
  ListGroup,
  ListItem,
  ListItems,
  listItemVariants,
  ListLabel,
  list as listPrimitive,
  ListSearch,
}
export type {
  ListController,
  ListEdge,
  ListItemRole,
  ListOptions,
  ListOrientation,
}
