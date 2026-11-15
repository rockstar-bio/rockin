"use client"
import {
  definePrimitive,
  isRTL,
  type OptionsOf,
  type PropsOf,
  type SlotName,
  type StateOf,
} from "@ui-sdk/core"
import { scrollArea } from "@ui-sdk/core/scroll-area"
import { tabs } from "@ui-sdk/core/tabs"
import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"

type Side = "start" | "end"

const viewportOf = (el: Element | null | undefined) =>
  el?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null

const tabsScroll = definePrimitive({
  name: "tabs-scroll",
  state: () => ({}),
  api: (context) => ({
    page(side: Side) {
      const viewport = viewportOf(context.element("track"))
      if (!viewport) return
      const y = viewport.scrollHeight > viewport.clientHeight
      const sign =
        (side === "start" ? -1 : 1) * (!y && isRTL(viewport) ? -1 : 1)
      const distance = (y ? viewport.clientHeight : viewport.clientWidth) * 0.8
      viewport.scrollBy({
        [y ? "top" : "left"]: sign * distance,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      })
    },
  }),
  slots: (slot) => ({
    // Tabs reveals a tab selected later; this centres the one it starts on.
    track: slot({
      bind: (el) => {
        const viewport = viewportOf(el)
        const tab = el.querySelector('[role="tab"][data-selected]')
        if (!viewport || !tab) return
        const v = viewport.getBoundingClientRect()
        const t = tab.getBoundingClientRect()
        viewport.scrollBy({
          left: t.left + t.width / 2 - (v.left + v.width / 2),
          top: t.top + t.height / 2 - (v.top + v.height / 2),
          behavior: "instant",
        })
      },
    }),
    arrow: slot<{ value: Side; shown: boolean }>({
      props: { value: "string", shown: "boolean" },
      attrs: (_state, { props }) => ({
        type: "button",
        tabindex: "-1",
        "aria-hidden": "true",
        "data-side": props.value,
        "data-visible": props.shown ? "" : undefined,
      }),
      press: ({ api, props }) => api.page(props.value),
    }),
  }),
})

type TabsSlot = SlotName<typeof tabs>

const tabsDefaults = { variant: "default", size: "xs" } as const

// Variants and sizes only set variables on the root; every part reads them.
const tabsVariants = cva(
  "grid gap-4 font-sans [--tabs-pill-fg:var(--color-foreground)] [--tabs-pill-ring:0_0_#0000] [--tabs-radius:999px] data-[orientation=vertical]:grid-cols-[auto_1fr] data-[orientation=vertical]:[--tabs-radius:var(--radius-lg)]",
  {
    variants: {
      variant: {
        default:
          "[--tabs-pill-fg:var(--color-primary-foreground)] [--tabs-pill:var(--color-primary)]",
        outline:
          "[--tabs-pill-ring:inset_0_0_0_1px_var(--color-border)] [--tabs-pill:var(--color-background)] dark:[--tabs-pill-ring:inset_0_0_0_1px_var(--color-input)] dark:[--tabs-pill:color-mix(in_oklab,var(--color-input)_30%,transparent)]",
        secondary:
          "[--tabs-pill-fg:var(--color-secondary-foreground)] [--tabs-pill:var(--color-secondary)]",
        ghost: "[--tabs-pill:var(--color-muted)]",
        destructive:
          "[--tabs-pill-fg:var(--color-destructive)] [--tabs-pill:color-mix(in_oklab,var(--color-destructive)_10%,transparent)] dark:[--tabs-pill:color-mix(in_oklab,var(--color-destructive)_20%,transparent)]",
        link: "[--tabs-pill-fg:var(--color-primary)] [--tabs-pill-ring:inset_0_-2px_0_var(--color-primary)] [--tabs-pill:transparent] [--tabs-radius:0px] data-[orientation=vertical]:[--tabs-pill-ring:inset_2px_0_0_var(--color-primary)] data-[orientation=vertical]:[--tabs-radius:0px]",
      },
      size: {
        default:
          "[--tabs-gap:calc(var(--spacing)*1.5)] [--tabs-h:calc(var(--spacing)*8)] [--tabs-icon:calc(var(--spacing)*4)] [--tabs-px:calc(var(--spacing)*2.5)] [--tabs-text:0.875rem]",
        xs: "[--tabs-gap:calc(var(--spacing)*1)] [--tabs-h:calc(var(--spacing)*6)] [--tabs-icon:calc(var(--spacing)*3)] [--tabs-px:calc(var(--spacing)*2)] [--tabs-text:0.75rem]",
        sm: "[--tabs-gap:calc(var(--spacing)*1)] [--tabs-h:calc(var(--spacing)*7)] [--tabs-icon:calc(var(--spacing)*3.5)] [--tabs-px:calc(var(--spacing)*2.5)] [--tabs-text:0.8rem]",
        lg: "[--tabs-gap:calc(var(--spacing)*1.5)] [--tabs-h:calc(var(--spacing)*9)] [--tabs-icon:calc(var(--spacing)*4)] [--tabs-px:calc(var(--spacing)*3)] [--tabs-text:0.875rem]",
      },
    },
    defaultVariants: tabsDefaults,
  }
)

type TabsStyleProps = {
  /** How the selected tab looks: `default`, `outline`, `secondary`, `ghost`, `destructive` or `link`. */
  variant?: VariantProps<typeof tabsVariants>["variant"]
  /** Tab height, padding and text: `xs`, `sm`, `default` or `lg`. */
  size?: VariantProps<typeof tabsVariants>["size"]
}

type TabsRootProps = OptionsOf<typeof tabs> &
  TabsStyleProps &
  Omit<
    PartProps<"div", StateOf<typeof tabs, "root">>,
    keyof OptionsOf<typeof tabs>
  >

type TabsPartProps<
  S extends TabsSlot,
  T extends "div" | "button" | "span",
> = PropsOf<typeof tabs, S> &
  Omit<PartProps<T, StateOf<typeof tabs, S>>, keyof PropsOf<typeof tabs, S>>

const Arrows = createParts(tabsScroll, { track: "div", arrow: "button" })

const Tab = createParts(tabs, {
  root: "div",
  list: "div",
  tab: "button",
  "tab-icon": "span",
  indicator: "span",
  panel: "div",
})

const Scroll = createParts(scrollArea, {
  root: "div",
  viewport: "div",
  content: "div",
})

type ClassName<S> = string | ((state: S) => string | undefined) | undefined

const withClass = <S,>(className: ClassName<S>, base: string) =>
  typeof className === "function"
    ? (state: S) => cn(base, className(state))
    : cn(base, className)

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]"

function TabsRoot({
  className,
  variant = tabsDefaults.variant,
  size = tabsDefaults.size,
  ...props
}: TabsRootProps) {
  return (
    <Tab.Root
      data-variant={variant}
      data-size={size}
      {...props}
      className={withClass(className, tabsVariants({ variant, size }))}
    />
  )
}

const vertical = "in-data-[orientation=vertical]"

const arrowSide = {
  start: `inset-s-0 ${vertical}:top-0`,
  end: `inset-e-0 ${vertical}:bottom-0`,
}

const arrowIcons = {
  start: [ChevronLeft, ChevronUp],
  end: [ChevronRight, ChevronDown],
} as const

function TabsIndicator({
  className,
  ...props
}: TabsPartProps<"indicator", "span">) {
  return (
    <Tab.Indicator
      {...props}
      className={withClass(
        className,
        cn(
          "absolute top-(--active-tab-top) left-(--active-tab-left) z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-[inherit] bg-(--tabs-pill) [box-shadow:var(--tabs-pill-ring)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none",
          ease,
          // Before ui-sdk measures it after hydration, the indicator anchors to the selected tab.
          "not-[[style]]:top-[anchor(top)] not-[[style]]:left-[anchor(left)] not-[[style]]:h-[anchor-size(height)] not-[[style]]:w-[anchor-size(width)] not-[[style]]:[position-anchor:--tabs-selected]"
        )
      )}
    />
  )
}

export function TabsList({
  className,
  children,
  ...props
}: TabsPartProps<"list", "div">) {
  return (
    <Arrows.Root>
      <Scroll.Root className="relative flex max-h-full min-h-0 max-w-full min-w-0">
        {(scroll) => {
          const overflowing = scroll.overflowX || scroll.overflowY

          const arrow = (side: Side) => {
            const [Horizontal, Vertical] = arrowIcons[side]
            return (
              <Arrows.Arrow
                value={side}
                shown={
                  overflowing &&
                  !(side === "start" ? scroll.atStart : scroll.atEnd)
                }
                data-no-ring
                className={cn(
                  `pointer-events-none absolute inset-y-0 z-10 inline-flex w-9 scale-75 items-center justify-center text-foreground opacity-0 transition-[opacity,scale] duration-200 outline-none data-visible:pointer-events-auto data-visible:scale-100 data-visible:opacity-100 motion-reduce:transition-none ${vertical}:inset-x-0 ${vertical}:inset-y-auto ${vertical}:h-9 ${vertical}:w-auto [&_svg]:size-4.5 [&_svg]:transition-opacity [&_svg]:duration-150 hover:[&_svg]:opacity-70`,
                  ease,
                  arrowSide[side]
                )}
              >
                <Horizontal className={`rtl:-scale-x-100 ${vertical}:hidden`} />
                <Vertical className={`hidden ${vertical}:block`} />
              </Arrows.Arrow>
            )
          }

          return (
            <>
              {arrow("start")}
              <Scroll.Viewport
                data-no-ring
                className={cn(
                  "max-h-[inherit] min-w-0 flex-1 scroll-fade-x scrollbar-none outline-none [--scroll-fade-reveal:2.25rem] [--scroll-fade-size:2.25rem] in-data-[orientation=vertical]:scroll-fade-y [&::-webkit-scrollbar]:hidden"
                )}
              >
                <Scroll.Content className="w-max min-w-full">
                  <Arrows.Track>
                    <Tab.List
                      {...props}
                      className={withClass(
                        className,
                        cn(
                          "relative isolate flex w-fit items-center gap-1 rounded-(--tabs-radius) p-1 [anchor-scope:--tabs-selected] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch"
                        )
                      )}
                    >
                      {(state) => (
                        <>
                          {typeof children === "function"
                            ? children(state)
                            : children}
                          <TabsIndicator />
                        </>
                      )}
                    </Tab.List>
                  </Arrows.Track>
                </Scroll.Content>
              </Scroll.Viewport>
              {arrow("end")}
            </>
          )
        }}
      </Scroll.Root>
    </Arrows.Root>
  )
}

type TabContent = Exclude<TabsPartProps<"tab", "button">["children"], Function>

// The label sits above the indicator while the tab's own background stays below it.
const tabContent = (content: TabContent) => (
  <span className="relative z-1 inline-flex min-w-0 items-center gap-[inherit] transition-[scale] duration-200 ease-out motion-reduce:transition-none [:active:not([data-disabled])>&]:scale-[0.97] [[data-disabled]>&]:opacity-40">
    {content}
  </span>
)

export function TabsTab({
  className,
  children,
  ...props
}: TabsPartProps<"tab", "button">) {
  return (
    <Tab.Tab
      data-no-ring
      {...props}
      className={withClass(
        className,
        "relative inline-flex h-(--tabs-h) shrink-0 cursor-default items-center gap-(--tabs-gap) rounded-[inherit] px-(--tabs-px) text-(length:--tabs-text) font-medium text-nowrap text-muted-foreground transition-colors duration-200 ease-out outline-none [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none data-selected:text-(--tabs-pill-fg) data-selected:[anchor-name:--tabs-selected] data-disabled:hover:text-muted-foreground"
      )}
    >
      {typeof children === "function"
        ? (state) => tabContent(children(state))
        : tabContent(children)}
    </Tab.Tab>
  )
}

export function TabsIcon({
  className,
  ...props
}: TabsPartProps<"tab-icon", "span">) {
  return (
    <Tab.TabIcon
      {...props}
      className={withClass(
        className,
        "inline-flex shrink-0 rtl:data-mirror:-scale-x-100 [&_svg]:size-(--tabs-icon)"
      )}
    />
  )
}

export function TabsPanel({
  className,
  ...props
}: TabsPartProps<"panel", "div">) {
  return (
    <Tab.Panel
      data-no-ring
      {...props}
      className={withClass(
        className,
        cn(
          "col-start-1 row-start-2 rounded-md text-sm outline-none data-[orientation=vertical]:col-start-2 data-[orientation=vertical]:row-start-1",
          "[--tab-shift-x:0px] [--tab-shift-y:0px]",
          "data-[activation-direction=left]:[--tab-shift-x:-1rem] data-[activation-direction=right]:[--tab-shift-x:1rem]",
          "data-[activation-direction=down]:[--tab-shift-y:1rem] data-[activation-direction=up]:[--tab-shift-y:-1rem]",
          "transition-[opacity,translate,filter] duration-300 motion-reduce:transition-none",
          ease,
          "data-starting-style:[translate:var(--tab-shift-x)_var(--tab-shift-y)] data-starting-style:opacity-0 data-starting-style:blur-xs",
          "data-ending-style:[translate:calc(var(--tab-shift-x)*-1)_calc(var(--tab-shift-y)*-1)] data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:duration-200"
        )
      )}
    />
  )
}

/** Use the named parts anywhere; `Tabs.List` and friends work in client components only. */
export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Icon: TabsIcon,
  Panel: TabsPanel,
})

export { createTabsController } from "@ui-sdk/core/tabs"
export type {
  TabsController,
  TabsOrientation,
  TabsValueChangeReason,
} from "@ui-sdk/core/tabs"
export { tabsVariants }
