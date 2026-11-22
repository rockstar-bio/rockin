"use client"

import { avatar, type AvatarState } from "@ui-sdk/core/avatar"
import {
  createParts,
  type PartProps,
  type RenderProp,
} from "@ui-sdk/react/primitive"
import { cn } from "cn"
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { preload as preloadResource } from "react-dom"
import { Skeleton } from "./skeleton"

const {
  Root: ImageRoot,
  Image: ImageSource,
  Fallback: ImageFallback,
} = createParts(avatar, { root: "span", image: "img", fallback: "span" })

export { ImageFallback, ImageRoot, ImageSource }

export type ImageState = "empty" | "loading" | "loaded" | "error"

type StaticImage = { src: string; width?: number; height?: number }

export type ImageSrc = string | StaticImage | { default: StaticImage }

export type ImageLoader = (args: {
  src: string
  width: number
  quality?: number
}) => string

export type ImageConfig = {
  loader?: ImageLoader
  widths?: number[]
  quality?: number
  qualities?: number[]
}

const DEFAULT_WIDTHS = [
  64, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
]

type NextImageOptions = {
  deviceSizes?: number[]
  imageSizes?: number[]
  qualities?: number[]
  path?: string
  loader?: string
  unoptimized?: boolean
}

// Next.js inlines its `images` config into every bundled module under this
// exact expression (next/image reads it the same way), so inside a Next app
// <Image> optimizes through /_next/image with no setup. Elsewhere `process`
// may not exist, hence the try.
function readNextImageConfig(): ImageConfig {
  let options: NextImageOptions | undefined
  try {
    options = process.env.__NEXT_IMAGE_OPTS as unknown as NextImageOptions
  } catch {
    return {}
  }
  if (!options || typeof options !== "object" || options.unoptimized) return {}
  if (options.loader && options.loader !== "default") return {}

  const path = options.path || "/_next/image"
  const widths = [...(options.imageSizes ?? []), ...(options.deviceSizes ?? [])]
  return {
    loader: ({ src, width, quality }) =>
      `${path}?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`,
    widths: widths.length ? widths : undefined,
    qualities: options.qualities,
  }
}

const ImageConfigContext = createContext<ImageConfig>(readNextImageConfig())

// Optional: only for apps outside Next.js that want a CDN loader.
export function ImageProvider({
  loader,
  widths,
  quality,
  qualities,
  children,
}: ImageConfig & { children: ReactNode }) {
  const value = useMemo(
    () => ({ loader, widths, quality, qualities }),
    [loader, widths, quality, qualities]
  )
  return (
    <ImageConfigContext.Provider value={value}>
      {children}
    </ImageConfigContext.Provider>
  )
}

function snapQuality(quality: number | undefined, allowed?: number[]) {
  if (!allowed?.length) return quality
  const target = quality ?? 75
  return allowed.reduce((best, q) =>
    Math.abs(q - target) < Math.abs(best - target) ? q : best
  )
}

export type ImageProps = Omit<
  PartProps<"img", AvatarState>,
  "src" | "children" | "className" | "style"
> & {
  src?: ImageSrc | null
  className?: string
  style?: CSSProperties
  wrapper?: string
  fill?: boolean
  showSkeleton?: boolean
  preload?: boolean
  priority?: boolean
  quality?: number
  unoptimized?: boolean
  loader?: ImageLoader
  retry?: number
  retryDelay?: number
  fallback?: ReactNode
  children?: ReactNode
  render?: RenderProp<AvatarState>
  onStateChange?: (state: ImageState) => void
}

function textHue(text: string) {
  let hash = 0x811c9dc5
  for (const char of text) {
    hash ^= char.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 360
}

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

function EmptyThumbnail({ className }: { className?: string }) {
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
      <rect
        x="6"
        y="9"
        width="36"
        height="30"
        rx="4"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <circle cx="33" cy="18" r="3" />
      <path d="M6 33l10-10 9 9 5-5 12 10" />
    </svg>
  )
}

export function ImagePlaceholder({
  label,
  reason = "empty",
  className,
}: {
  label?: string
  reason?: "empty" | "error"
  className?: string
}) {
  const text = (label || "").trim()
  const status = reason === "error" ? "image failed to load" : "no image"
  const Glyph = reason === "error" ? BrokenThumbnail : EmptyThumbnail

  return (
    <span
      role="img"
      aria-label={
        text ? `${text} (${status})` : status[0].toUpperCase() + status.slice(1)
      }
      data-slot="image-placeholder"
      data-reason={reason}
      style={{ "--ph-hue": text ? textHue(text) : 250 } as CSSProperties}
      className={cn(
        "flex size-full items-center justify-center bg-linear-135 from-(--ph-from) to-(--ph-to) text-(--ph-fg) [--ph-fg:oklch(0.55_0.12_var(--ph-hue))] [--ph-from:oklch(0.92_0.06_var(--ph-hue))] [--ph-to:oklch(0.97_0.025_calc(var(--ph-hue)+40))] dark:[--ph-fg:oklch(0.82_0.1_var(--ph-hue))] dark:[--ph-from:oklch(0.36_0.07_var(--ph-hue))] dark:[--ph-to:oklch(0.26_0.04_calc(var(--ph-hue)+40))]",
        className
      )}
    >
      <Glyph className="aspect-square h-auto w-[34%] max-w-20 min-w-4" />
    </span>
  )
}

function resolveSrc(src: ImageSrc | null | undefined): StaticImage | null {
  if (!src) return null
  if (typeof src === "string") return { src }
  if ("default" in src) return src.default
  return src.src ? src : null
}

function toNumber(value: number | string | undefined) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function buildSources(
  url: string,
  options: {
    loader?: ImageLoader
    widths: number[]
    quality?: number
    width?: number
    sizes?: string
    srcSet?: string
    fill?: boolean
  }
): { src: string; srcSet?: string; sizes?: string } {
  const { loader, quality, width, sizes, srcSet, fill } = options
  if (!loader || srcSet || /^(data|blob):|\.svg($|[?#])/i.test(url)) {
    return { src: url, srcSet, sizes }
  }

  const widths = [...options.widths].sort((a, b) => a - b)
  const largest = widths[widths.length - 1]
  const at = (w: number) => loader({ src: url, width: w, quality })

  if (sizes || fill || !width) {
    return {
      src: at(largest),
      srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", "),
      sizes: sizes ?? "100vw",
    }
  }

  const pick = (target: number) => widths.find((w) => w >= target) ?? largest
  const density = [...new Set([pick(width), pick(width * 2)])]
  return {
    src: at(density[density.length - 1]),
    srcSet: density.map((w, i) => `${at(w)} ${i + 1}x`).join(", "),
  }
}

type Attempt = { src: string | null; count: number; retrying: boolean }

export function Image({
  src,
  alt = "",
  className,
  style,
  wrapper,
  fill = false,
  showSkeleton = true,
  preload: preloadProp,
  priority = false,
  quality: qualityProp,
  unoptimized = false,
  loader: loaderProp,
  retry = 1,
  retryDelay = 1500,
  fallback,
  children,
  loading,
  fetchPriority,
  decoding = "async",
  width,
  height,
  srcSet,
  sizes,
  onStateChange,
  ...props
}: ImageProps) {
  const config = useContext(ImageConfigContext)
  const image = resolveSrc(src)
  const url = image?.src ?? null
  const preload = preloadProp ?? priority
  const w = fill ? undefined : (toNumber(width) ?? image?.width)
  const h = fill ? undefined : (toNumber(height) ?? image?.height)
  const sources = url
    ? buildSources(url, {
        loader: unoptimized ? undefined : (loaderProp ?? config.loader),
        widths: config.widths?.length ? config.widths : DEFAULT_WIDTHS,
        quality: snapQuality(qualityProp ?? config.quality, config.qualities),
        width: w,
        sizes,
        srcSet,
        fill,
      })
    : null
  const [status, setStatus] = useState<AvatarState["loadingStatus"]>("idle")
  const [attempt, setAttempt] = useState<Attempt>({
    src: url,
    count: 0,
    retrying: false,
  })

  const current =
    attempt.src === url ? attempt : { src: url, count: 0, retrying: false }

  const state: ImageState = !url
    ? "empty"
    : current.retrying || status === "idle" || status === "loading"
      ? "loading"
      : status

  if (preload && sources) {
    preloadResource(sources.src, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: sources.srcSet,
      imageSizes: sources.sizes,
    })
  }

  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const reload = useCallback(() => {
    setAttempt((prev) =>
      prev.src === url
        ? { src: url, count: prev.count + 1, retrying: false }
        : prev
    )
  }, [url])

  const handleStatus = useCallback(
    (next: AvatarState["loadingStatus"]) => {
      setStatus(next)
      if (next !== "error") return
      setAttempt((prev) => {
        const count = prev.src === url ? prev.count : 0
        return { src: url, count, retrying: count < retry }
      })
    },
    [url, retry]
  )

  // A dropped request on flaky Wi-Fi gets a quiet retry; the skeleton stays
  // up meanwhile so the tile doesn't flash the error placeholder.
  useEffect(() => {
    if (!current.retrying) return
    const timer = window.setTimeout(reload, retryDelay)
    return () => window.clearTimeout(timer)
  }, [current.retrying, reload, retryDelay])

  useEffect(() => {
    if (state !== "error") return
    window.addEventListener("online", reload)
    return () => window.removeEventListener("online", reload)
  }, [state, reload])

  const eager = preload || loading === "eager"
  // The hidden image is 1px until it loads, so a fallback with no sized
  // wrapper takes the image's own classes and ratio to hold its space.
  const overlay = fill || Boolean(wrapper)

  return (
    <ImageRoot
      data-state={state}
      className={cn("relative block overflow-hidden", wrapper)}
      onLoadingStatusChange={handleStatus}
    >
      {sources && (
        <ImageSource
          {...props}
          key={`${sources.src}#${current.count}`}
          src={sources.src}
          srcSet={sources.srcSet}
          sizes={sources.sizes}
          alt={alt}
          width={w}
          height={h}
          loading={eager ? "eager" : (loading ?? "lazy")}
          fetchPriority={fetchPriority ?? (eager ? "high" : undefined)}
          decoding={decoding}
          style={style}
          className={cn(
            fill && "absolute inset-0 size-full",
            "transition-opacity duration-200 motion-reduce:transition-none",
            state === "loaded" ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}

      {state !== "loaded" && (
        <ImageFallback
          style={
            !overlay && w && h
              ? ({
                  "--image-w": `${w}px`,
                  aspectRatio: `${w} / ${h}`,
                } as CSSProperties)
              : undefined
          }
          className={
            overlay
              ? "absolute inset-0 block size-full"
              : cn(
                  w && h ? "block w-(--image-w) max-w-full" : "block size-full",
                  className
                )
          }
        >
          {state === "loading"
            ? showSkeleton && <Skeleton rounded="none" className="size-full" />
            : (fallback ?? (
                <ImagePlaceholder
                  label={alt}
                  reason={state === "error" ? "error" : "empty"}
                />
              ))}
        </ImageFallback>
      )}

      {children}
    </ImageRoot>
  )
}
