"use client"
import { useMounted } from "#hooks/useMounted"
import {
  BlobSpeech,
  JellyBlobMascot,
  type JellyBlobMascotProps,
  type JellyBlobMood,
} from "feral-blob"
import * as React from "react"

import { Button } from "./button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./empty"
import { cn } from "cn"

export {
  BlobSpeech,
  JellyBlobMascot,
  JellyBlobMascotDemo,
  type BlobSpeechProps,
  type JellyBlobEyeStyle,
  type JellyBlobMascotProps,
  type JellyBlobMood,
} from "feral-blob"

export function JellyBlob({ ...props }: JellyBlobMascotProps) {
  return (
    <span className="inline-block">
      <JellyBlobMascot
        {...props}
        className={cn("h-auto w-full", props.className)}
      />
    </span>
  )
}

const MOOD_GAZE: Record<JellyBlobMood, { x: number; y: number }> = {
  neutral: { x: 0, y: 8 },
  happy: { x: 18, y: -6 },
  sad: { x: 0, y: 14 },
  angry: { x: 10, y: 2 },
  hmm: { x: 10, y: -4 },
  sideEye: { x: 30, y: 0 },
  password: { x: -14, y: 16 },
  curious: { x: 18, y: -8 },
  surprised: { x: 0, y: -10 },
  sleepy: { x: 0, y: 14 },
  shy: { x: -12, y: 4 },
  love: { x: 0, y: -4 },
  wave: { x: 20, y: -8 },
}

export function JellyMini({
  mood = "neutral",
  gaze,
  className,
  ...props
}: Omit<JellyBlobMascotProps, "className"> & {
  className?: string
}) {
  const { mounted } = useMounted()

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center select-none",
        className
      )}
    >
      {mounted ? (
        <JellyBlobMascot
          {...props}
          mood={mood}
          gaze={gaze ?? MOOD_GAZE[mood]}
          className="h-auto w-full"
        />
      ) : null}
    </span>
  )
}

type JellyMascotState = {
  mood: JellyBlobMood
  speech?: string
  nod: boolean
  gaze: NonNullable<JellyBlobMascotProps["gaze"]>
  mounted: boolean
  blobProps: Omit<JellyBlobMascotProps, "className" | "mood">
  setPreview: (mood: JellyBlobMood | null) => void
}

const JellyMascotContext = React.createContext<JellyMascotState | null>(null)

/** Returns mood-preview handlers for controls near a Jelly mascot. */
export function useJellyMood() {
  const state = React.useContext(JellyMascotContext)

  return React.useCallback(
    (mood?: JellyBlobMood) => {
      if (!mood || !state) return {}

      return {
        onPointerEnter: () => state.setPreview(mood),
        onFocus: () => state.setPreview(mood),
        onPointerLeave: () => state.setPreview(null),
        onBlur: () => state.setPreview(null),
      }
    },
    [state]
  )
}

type JellyPreviewProps = {
  mood?: JellyBlobMood
  onPointerEnter?: React.PointerEventHandler<HTMLElement>
  onPointerLeave?: React.PointerEventHandler<HTMLElement>
  onFocus?: React.FocusEventHandler<HTMLElement>
  onBlur?: React.FocusEventHandler<HTMLElement>
}

function withPreviewHandlers<T extends JellyPreviewProps>(
  preview: ReturnType<typeof useJellyMood>,
  props: T
) {
  const handlers = preview(props.mood)

  return {
    onPointerEnter: props.onPointerEnter ?? handlers.onPointerEnter,
    onPointerLeave: props.onPointerLeave ?? handlers.onPointerLeave,
    onFocus: props.onFocus ?? handlers.onFocus,
    onBlur: props.onBlur ?? handlers.onBlur,
  }
}

export function JellyAction({
  mood,
  ...props
}: JellyPreviewProps & React.ComponentProps<typeof Button>) {
  const preview = useJellyMood()

  return (
    <Button {...props} {...withPreviewHandlers(preview, { ...props, mood })} />
  )
}

export function JellyLink({
  mood,
  ...props
}: JellyPreviewProps & React.ComponentProps<"a">) {
  const preview = useJellyMood()

  return <a {...props} {...withPreviewHandlers(preview, { ...props, mood })} />
}

export type JellyMascotConfig = Omit<
  JellyBlobMascotProps,
  "className" | "mood"
> & {
  mood?: JellyBlobMood
  /** Optional single-line copy rendered in the speech bubble. */
  speech?: string
}

function JellyMascotProvider({
  mood = "neutral",
  speech,
  children,
  ...blobProps
}: JellyMascotConfig & { children: React.ReactNode }) {
  const { mounted } = useMounted()
  const [previewMood, setPreviewMood] = React.useState<JellyBlobMood | null>(
    null
  )
  const activeMood = previewMood ?? mood

  const value: JellyMascotState = {
    mood: activeMood,
    speech,
    nod: blobProps.nod ?? false,
    gaze: blobProps.gaze ?? MOOD_GAZE[activeMood],
    mounted,
    blobProps,
    setPreview: setPreviewMood,
  }

  return (
    <JellyMascotContext.Provider value={value}>
      {children}
    </JellyMascotContext.Provider>
  )
}

export type JellySize = "sm" | "md" | "lg" | "auto"

const SIZE_WRAPPER: Record<JellySize, string> = {
  sm: "w-20",
  md: "w-28",
  lg: "w-48",
  auto: "w-auto",
}

function JellyMascotFace({
  size = "md",
  className,
}: {
  size?: JellySize
  className?: string
}) {
  const mascot = React.useContext(JellyMascotContext)

  if (!mascot) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-col items-center select-none",
        SIZE_WRAPPER[size],
        className
      )}
    >
      {mascot.speech ? (
        <BlobSpeech
          mood={mascot.mood}
          messages={{ [mascot.mood]: mascot.speech }}
        />
      ) : null}
      {mascot.mounted ? (
        <JellyBlobMascot
          {...mascot.blobProps}
          mood={mascot.mood}
          gaze={mascot.gaze}
          nod={mascot.nod}
          className="h-auto w-full"
        />
      ) : null}
    </div>
  )
}

export function JellyMascot({
  size = "md",
  className,
  ...config
}: JellyMascotConfig & { size?: JellySize; className?: string }) {
  const existing = React.useContext(JellyMascotContext)

  if (existing) return <JellyMascotFace size={size} className={className} />

  return (
    <JellyMascotProvider {...config}>
      <JellyMascotFace size={size} className={className} />
    </JellyMascotProvider>
  )
}

export function JellyGroup({
  children,
  ...config
}: JellyMascotConfig & { children: React.ReactNode }) {
  return <JellyMascotProvider {...config}>{children}</JellyMascotProvider>
}

export type JellyEmptyProps = JellyMascotConfig & {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  size?: JellySize
  className?: string
}

/** Empty-state layout with no built-in copy; callers provide all content. */
export function JellyEmpty({
  title,
  description,
  actions,
  size = "lg",
  className,
  ...config
}: JellyEmptyProps) {
  return (
    <JellyMascotProvider {...config}>
      <Empty className={cn("gap-4", className)}>
        <EmptyHeader className="gap-2">
          <JellyMascotFace size={size} />
          {title ? (
            <EmptyTitle className="text-base font-semibold sm:text-lg">
              {title}
            </EmptyTitle>
          ) : null}
          {description ? (
            <EmptyDescription className="max-w-sm">
              {description}
            </EmptyDescription>
          ) : null}
        </EmptyHeader>
        {actions ? <EmptyContent>{actions}</EmptyContent> : null}
      </Empty>
    </JellyMascotProvider>
  )
}
