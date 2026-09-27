"use client"

import NextImage, { type ImageProps as NextImageProps } from "next/image"
import { type ReactNode, useCallback, useState } from "react"
import { cn } from "cn"
import { JellyMini, Skeleton } from "./"

export type ImageProps = Omit<
  NextImageProps,
  "children" | "placeholder" | "blurDataURL" | "src"
> & {
  src?: NextImageProps["src"] | null
  wrapper?: string
  showSkeleton?: boolean
  children?: ReactNode
  /** Content to render when no source is provided or the image fails to load. */
  fallback?: ReactNode
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
  fallback = <JellyMini mood="curious" className="size-full p-4" />,
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
