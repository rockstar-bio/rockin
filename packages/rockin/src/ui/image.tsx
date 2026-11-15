"use client"

import { cn } from "cn"
import NextImage, { type ImageProps as NextImageProps } from "next/image"
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useState,
} from "react"
import { Skeleton } from "./skeleton"

export type ImageProps = Omit<
  NextImageProps,
  "children" | "placeholder" | "blurDataURL" | "src"
> & {
  src?: NextImageProps["src"] | null
  wrapper?: string
  showSkeleton?: boolean
  children?: ReactNode
  fallback?: ReactNode
}

// Stable 0–359 hue per text (FNV-1a), so each name keeps its own colour
// and similar names still land far apart.
function textHue(text: string) {
  let hash = 0x811c9dc5
  for (const char of text) {
    hash ^= char.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 360
}

// Broken thumbnail: a photo frame cracked in two, the right half knocked askew.
function BrokenThumbnail({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <g>
        <path
          d="M25 9H10a4 4 0 0 0-4 4v22a4 4 0 0 0 4 4h16l-4-9 5-7-6-6z"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <path d="M6 33l8-8 7 7" />
      </g>
      <g transform="translate(3 2) rotate(6 34 24)">
        <path
          d="M25 9h13a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H26l-4-9 5-7-6-6z"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <circle cx="34" cy="17" r="3" />
        <path d="M25 35l6-7 11 8" />
      </g>
    </svg>
  )
}

// Missing-image fallback: a name-hued gradient tile with a broken thumbnail.
function ImagePlaceholder({ label }: { label?: string }) {
  const text = (label || "").trim()

  return (
    <div
      role="img"
      aria-label={label ? `${label} (no image)` : "No image"}
      style={{ "--ph-hue": text ? textHue(text) : 250 } as CSSProperties}
      className="flex size-full items-center justify-center bg-linear-135 from-(--ph-from) to-(--ph-to) text-(--ph-fg) [--ph-fg:oklch(0.55_0.12_var(--ph-hue))] [--ph-from:oklch(0.92_0.06_var(--ph-hue))] [--ph-to:oklch(0.97_0.025_calc(var(--ph-hue)+40))] dark:[--ph-fg:oklch(0.82_0.1_var(--ph-hue))] dark:[--ph-from:oklch(0.36_0.07_var(--ph-hue))] dark:[--ph-to:oklch(0.26_0.04_calc(var(--ph-hue)+40))]"
    >
      <BrokenThumbnail className="aspect-square h-auto w-[34%] max-w-20 min-w-4" />
    </div>
  )
}

function srcValue(src: NextImageProps["src"] | null | undefined) {
  if (!src) return null
  if (typeof src === "string") return src
  if ("src" in src) return src.src

  return src.default.src
}

export function Image({
  wrapper,
  showSkeleton = true,
  className,
  loading = "lazy",
  fetchPriority,
  preload,
  quality = 90,
  src,
  alt,
  onLoad,
  onError,
  children,
  fallback = <ImagePlaceholder label={alt} />,
  ...props
}: ImageProps) {
  const currentSrc = srcValue(src)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const hasSource = Boolean(currentSrc)
  const failed = hasSource && failedSrc === currentSrc
  const loaded = hasSource && loadedSrc === currentSrc && !failed
  const shouldPreload = preload ?? loading === "eager"
  const imageLoading = shouldPreload ? "eager" : loading

  const markLoaded = useCallback(() => {
    if (!currentSrc) return
    setFailedSrc(null)
    setLoadedSrc(currentSrc)
  }, [currentSrc])

  const markFailed = useCallback(() => {
    if (!currentSrc) return
    setFailedSrc(currentSrc)
  }, [currentSrc])

  return (
    <section className={cn("relative block overflow-hidden", wrapper)}>
      {showSkeleton && !loaded && !failed && hasSource && (
        <Skeleton className="absolute inset-0 size-full" />
      )}

      {hasSource && !failed ? (
        <NextImage
          {...props}
          src={src ?? ""}
          alt={alt}
          quality={quality}
          loading={imageLoading}
          preload={shouldPreload}
          fetchPriority={
            fetchPriority ?? (imageLoading === "eager" ? "high" : undefined)
          }
          className={cn(
            "transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          onLoad={(event) => {
            markLoaded()
            onLoad?.(event)
          }}
          onError={(event) => {
            markFailed()
            onError?.(event)
          }}
        />
      ) : (
        fallback
      )}

      {children}
    </section>
  )
}
