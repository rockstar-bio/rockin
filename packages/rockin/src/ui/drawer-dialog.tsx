"use client"

import { Xmark } from "@gravity-ui/icons"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  type DialogContentState,
  type DialogController,
} from "@ui-sdk/react/dialog"
import {
  createDrawerController,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerTitle,
  DrawerTrigger,
  type DrawerController,
  type DrawerProps,
  type DrawerSide,
} from "@ui-sdk/react/drawer"
import { cn } from "cn"
import * as React from "react"

import { useMediaQuery } from "#hooks/useMediaQuery"
import { useComposedRefs } from "#lib/compose-refs"
import { Button } from "./button"

type Kind = "dialog" | "drawer"

type DrawerDialogContextValue = {
  kind: Kind
  side: DrawerSide
  hasSnapPoints: boolean
  titled: boolean
  setTitled: (titled: boolean) => void
  registerTrigger: (element: HTMLElement) => () => void
}

const DrawerDialogContext =
  React.createContext<DrawerDialogContextValue | null>(null)

const byDocumentOrder = (a: Node, b: Node) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1

// Switching kind remounts the triggers, so the one that had focus, like after a close, gets it back.
function useCarryFocus(kind: Kind, elements: () => HTMLElement[]) {
  const [renderedKind, setRenderedKind] = React.useState(kind)
  const index = React.useRef(-1)
  if (renderedKind !== kind) {
    index.current = elements()
      .sort(byDocumentOrder)
      .indexOf(document.activeElement as HTMLElement)
    setRenderedKind(kind)
  }
  React.useLayoutEffect(() => {
    if (index.current < 0) return
    elements()
      .sort(byDocumentOrder)
      [index.current]?.focus({ preventScroll: true })
    index.current = -1
  }, [kind, elements])
}

function useDrawerDialog() {
  const context = React.useContext(DrawerDialogContext)
  if (!context) {
    throw new Error("DrawerDialog parts must be used inside <DrawerDialog>.")
  }
  return context
}

const dialogParts = {
  Trigger: DialogTrigger,
  Backdrop: DialogBackdrop,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}

const parts = {
  dialog: dialogParts,
  drawer: {
    Trigger: DrawerTrigger,
    Backdrop: DrawerBackdrop,
    Content: DrawerContent,
    Title: DrawerTitle,
    Description: DrawerDescription,
    Close: DrawerClose,
  },
} as unknown as Record<Kind, typeof dialogParts>

const drawerOnly = new Set<keyof DrawerProps>([
  "snapPoints",
  "snapPoint",
  "defaultSnapPoint",
  "onSnapPointChange",
  "modalAbove",
  "driver",
  "expandOnScroll",
  "physics",
  "themeColor",
  "preventEdgeSwipe",
])

type DrawerDialogProps = Omit<DrawerProps, "side"> & {
  /** How it presents on desktop: a centered dialog, or a drawer from that edge. */
  desktop?: "dialog" | DrawerSide
  /** The edge the drawer comes from on mobile. */
  side?: DrawerSide
}

type Layout = { kind: Kind; side: DrawerSide }

function useLiveLayout(
  desktop: DrawerDialogProps["desktop"] = "dialog",
  side: DrawerSide = "bottom"
): Layout {
  const { isDesktop } = useMediaQuery()
  if (!isDesktop) return { kind: "drawer", side }
  return desktop === "dialog"
    ? { kind: "dialog", side }
    : { kind: "drawer", side: desktop }
}

// Triggers outside the root, connected by a controller, render the part its root currently renders.
const controllerKinds = new WeakMap<
  object,
  { kind?: Kind; listeners: Set<() => void> }
>()

function controllerEntry(controller: object) {
  let entry = controllerKinds.get(controller)
  if (!entry) {
    entry = { listeners: new Set() }
    controllerKinds.set(controller, entry)
  }
  return entry
}

function useControllerKind(controller: object | undefined) {
  return React.useSyncExternalStore(
    (listener) => {
      if (!controller) return () => {}
      const { listeners } = controllerEntry(controller)
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (controller ? controllerKinds.get(controller)?.kind : undefined),
    () => undefined
  )
}

function DrawerDialog({
  desktop = "dialog",
  side = "bottom",
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onPayloadChange,
  ...props
}: DrawerDialogProps) {
  const { kind, side: resolvedSide } = useLiveLayout(desktop, side)
  // Switching between Dialog and Drawer remounts the root, so open and the payload live here.
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const payload = React.useRef<unknown>(undefined)

  const hasSnapPoints = (props.snapPoints?.length ?? 0) > 0
  const [titled, setTitled] = React.useState(false)
  const { controller } = props

  const triggers = React.useRef(new Set<HTMLElement>())
  const registerTrigger = React.useCallback((element: HTMLElement) => {
    triggers.current.add(element)
    return () => void triggers.current.delete(element)
  }, [])
  const triggerElements = React.useCallback(() => [...triggers.current], [])
  useCarryFocus(kind, triggerElements)

  React.useEffect(() => {
    if (!controller) return
    const entry = controllerEntry(controller)
    entry.kind = kind
    entry.listeners.forEach((listener) => listener())
  }, [controller, kind])

  const mountedKind = React.useRef(kind)
  React.useEffect(() => {
    if (mountedKind.current === kind) return
    mountedKind.current = kind
    if (open && controller && payload.current !== undefined) {
      void controller.open({ payload: payload.current })
    }
  }, [kind, open, controller])

  const context = React.useMemo(
    () => ({
      kind,
      side: resolvedSide,
      hasSnapPoints,
      titled,
      setTitled,
      registerTrigger,
    }),
    [kind, resolvedSide, hasSnapPoints, titled, registerTrigger]
  )

  const handlers = {
    open,
    onOpenChange: ((next, details) => {
      onOpenChange?.(next, details)
      if (!details.canceled) setOpenState(next)
    }) satisfies DrawerProps["onOpenChange"],
    onPayloadChange: ((next, details) => {
      onPayloadChange?.(next, details)
      if (!details.canceled) payload.current = next
    }) satisfies DrawerProps["onPayloadChange"],
  }

  let root: React.ReactNode
  if (kind === "dialog") {
    const dialogProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) => !drawerOnly.has(key as keyof DrawerProps)
      )
    ) as React.ComponentProps<typeof Dialog>
    root = (
      <Dialog {...dialogProps} {...handlers}>
        {children}
      </Dialog>
    )
  } else {
    root = (
      <Drawer {...props} {...handlers} side={resolvedSide}>
        {children}
      </Drawer>
    )
  }

  return <DrawerDialogContext value={context}>{root}</DrawerDialogContext>
}

type TriggerProps = React.ComponentProps<typeof DialogTrigger> & {
  /** Outside `DrawerDialog`, before its root has mounted: match the root's `desktop`. */
  desktop?: DrawerDialogProps["desktop"]
}

function DrawerDialogTrigger({ desktop, ref, ...props }: TriggerProps) {
  const context = React.useContext(DrawerDialogContext)
  const controllerKind = useControllerKind(props.controller)
  const live = useLiveLayout(desktop)
  const kind = context?.kind ?? controllerKind ?? live.kind
  const { Trigger } = parts[kind]

  const element = React.useRef<HTMLButtonElement | null>(null)
  const registerTrigger = context?.registerTrigger
  React.useLayoutEffect(
    () =>
      element.current && registerTrigger
        ? registerTrigger(element.current)
        : undefined,
    [registerTrigger, Trigger]
  )
  const ownElement = React.useCallback(
    () => (!registerTrigger && element.current ? [element.current] : []),
    [registerTrigger]
  )
  useCarryFocus(kind, ownElement)

  return <Trigger {...props} ref={useComposedRefs(ref, element)} />
}

type ContentProps = Omit<
  React.ComponentProps<typeof DialogContent>,
  "children" | "className"
> & {
  className?: string
  children?:
    React.ReactNode | ((state: DialogContentState<unknown>) => React.ReactNode)
  /** Shows an icon button in the corner. On by default for the dialog, off for the drawer. */
  showCloseButton?: boolean
  /** Shows the drag handle on a top or bottom drawer. On by default. */
  showHandle?: boolean
  /** Names it for screen readers when there's no `Title`. */
  title?: string
  backdropClassName?: string
}

const dialogContentClass =
  "fixed inset-0 m-auto flex h-fit max-h-[calc(var(--visual-viewport-height,100dvh)-2rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none backdrop:hidden sm:max-w-sm transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 motion-reduce:transition-none"

const drawerContentClass = cn(
  "flex flex-col gap-4 border bg-card py-4 text-sm text-popover-foreground outline-none dark:border-border",
  "data-[side=bottom]:mx-auto data-[side=bottom]:max-h-[calc(100dvh-6rem)] data-[side=bottom]:w-full data-[side=bottom]:rounded-t-4xl data-[side=bottom]:border-b-0 data-[side=bottom]:pb-[calc(--spacing(4)+var(--app-safe-bottom,0px))]",
  "data-[side=top]:max-h-[calc(100dvh-6rem)] data-[side=top]:w-full data-[side=top]:rounded-b-4xl data-[side=top]:border-t-0",
  "data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:rounded-r-4xl data-[side=left]:border-l-0 data-[side=left]:sm:w-96",
  "data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:rounded-l-4xl data-[side=right]:border-r-0 data-[side=right]:sm:w-96",
  "after:pointer-events-none after:absolute after:bg-card data-[side=bottom]:after:inset-x-0 data-[side=bottom]:after:top-full data-[side=bottom]:after:h-12 data-[side=left]:after:inset-y-0 data-[side=left]:after:right-full data-[side=left]:after:w-12 data-[side=right]:after:inset-y-0 data-[side=right]:after:left-full data-[side=right]:after:w-12 data-[side=top]:after:inset-x-0 data-[side=top]:after:bottom-full data-[side=top]:after:h-12",
  "scale-[calc(1-var(--drawer-stack,0)*0.05)] transition-[scale,filter] duration-300 data-[side=bottom]:origin-top data-[side=top]:origin-bottom"
)

function DrawerDialogContent({
  className,
  children,
  showCloseButton,
  showHandle = true,
  title,
  backdropClassName,
  ...props
}: ContentProps) {
  const { kind, side, hasSnapPoints, titled } = useDrawerDialog()
  const { Backdrop, Content, Close, Title } = parts[kind]
  const vertical = side === "bottom" || side === "top"
  const closeButton = showCloseButton ?? kind === "dialog"

  const handle =
    kind === "drawer" && vertical && showHandle ? (
      hasSnapPoints ? (
        <DrawerHandle
          aria-label="Resize"
          className={cn(
            "mx-auto flex h-4 w-24 shrink-0 cursor-grab items-center justify-center rounded-full outline-none after:h-1 after:w-12 after:rounded-full after:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing",
            side === "top" ? "order-last -mt-2" : "-mt-2 -mb-2"
          )}
        />
      ) : (
        <div
          aria-hidden
          data-slot="drawer-dialog-grip"
          className={cn(
            "mx-auto h-1 w-12 shrink-0 rounded-full bg-muted",
            side === "top" ? "order-last" : "-mb-1"
          )}
        />
      )
    ) : null

  return (
    <>
      <Backdrop
        data-kind={kind}
        className={cn(
          "fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-xs",
          kind === "dialog" &&
            "transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
          backdropClassName
        )}
      />
      <Content
        data-kind={kind}
        className={cn(
          kind === "dialog" ? dialogContentClass : drawerContentClass,
          className
        )}
        {...props}
      >
        {(state: DialogContentState<unknown>) => (
          <>
            {handle}
            {!titled && title ? (
              <Title className="sr-only">{title}</Title>
            ) : null}
            {typeof children === "function" ? children(state) : children}
            {closeButton && (
              <Close
                aria-label="Close"
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                  />
                }
              >
                <Xmark aria-hidden="true" />
              </Close>
            )}
          </>
        )}
      </Content>
    </>
  )
}

function DrawerDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { kind, side } = useDrawerDialog()
  return (
    <div
      data-slot="drawer-dialog-header"
      className={cn(
        "flex shrink-0 flex-col gap-1.5 px-4 text-left",
        kind === "drawer" &&
          (side === "bottom" || side === "top") &&
          "text-center md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4",
        className
      )}
      {...props}
    />
  )
}

function DrawerDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { kind } = useDrawerDialog()
  return (
    <div
      data-slot="drawer-dialog-footer"
      className={cn(
        "flex shrink-0 gap-2 px-4",
        kind === "dialog"
          ? "flex-col-reverse sm:flex-row sm:justify-end"
          : "mt-auto flex-col",
        className
      )}
      {...props}
    />
  )
}

type TitleProps = React.ComponentProps<typeof DialogTitle>

function DrawerDialogTitle({ className, ...props }: TitleProps) {
  const { kind, setTitled } = useDrawerDialog()
  const { Title } = parts[kind]

  React.useLayoutEffect(() => {
    setTitled(true)
    return () => setTitled(false)
  }, [setTitled])

  return (
    <Title
      className={cn(
        "font-heading text-base leading-none font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

type DescriptionProps = React.ComponentProps<typeof DialogDescription>

function DrawerDialogDescription({ className, ...props }: DescriptionProps) {
  const { Description } = parts[useDrawerDialog().kind]
  return (
    <Description
      className={cn(
        "text-sm text-balance text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

type CloseProps = React.ComponentProps<typeof DialogClose>

function DrawerDialogClose(props: CloseProps) {
  const { Close } = parts[useDrawerDialog().kind]
  return <Close {...props} />
}

/** Works for both modes: a drawer controller also drives the dialog. */
function createDrawerDialogController<Payload = unknown, Result = string>() {
  return createDrawerController<Payload, Result>()
}

type DrawerDialogController<
  Payload = unknown,
  Result = string,
> = DrawerController<Payload, Result> & DialogController<Payload, Result>

/** Use the named parts anywhere; `DrawerDialog.Title` and friends work in client components only. */
const DrawerDialogRoot = Object.assign(DrawerDialog, {
  Trigger: DrawerDialogTrigger,
  Content: DrawerDialogContent,
  Header: DrawerDialogHeader,
  Body: DrawerDialogBody,
  Footer: DrawerDialogFooter,
  Title: DrawerDialogTitle,
  Description: DrawerDialogDescription,
  Close: DrawerDialogClose,
})

export {
  createDrawerDialogController,
  DrawerDialogRoot as DrawerDialog,
  DrawerDialogBody,
  DrawerDialogClose,
  DrawerDialogContent,
  DrawerDialogDescription,
  DrawerDialogFooter,
  DrawerDialogHeader,
  DrawerDialogTitle,
  DrawerDialogTrigger,
  useDrawerDialog,
  type DrawerDialogController,
  type DrawerDialogProps,
}
