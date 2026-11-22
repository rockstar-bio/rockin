"use client"

import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { Button } from "./button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  selectedIndex: number
  snapCount: number
  scrollTo: (index: number) => void
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [snapCount, setSnapCount] = React.useState(0)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
    setSelectedIndex(api.selectedScrollSnap())
    setSnapCount(api.scrollSnapList().length)
  }, [])

  const scrollTo = React.useCallback(
    (index: number) => {
      api?.scrollTo(index)
    },
    [api]
  )

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    api.on("reInit", onSelect)
    api.on("select", onSelect)
    queueMicrotask(() => onSelect(api))

    return () => {
      api.off("reInit", onSelect)
      api.off("select", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        selectedIndex,
        snapCount,
        scrollTo,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 left-2 z-10 -translate-y-1/2 sm:left-3"
          : "top-2 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="cn-rtl-flip" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 right-2 z-10 -translate-y-1/2 sm:right-3"
          : "bottom-2 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="cn-rtl-flip" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

type CarouselDotsProps = React.ComponentProps<"div"> & {
  /** Accessible name for each dot. Defaults to "Slide 2 of 5". */
  getDotLabel?: (index: number, count: number) => string
}

// Slide indicator that reads the carousel itself: no setApi/effect wiring.
// Dots stay visually small; each button gets a 24px-wide, 44px-tall hit area.
function CarouselDots({
  className,
  getDotLabel = (index, count) => `Slide ${index + 1} of ${count}`,
  "aria-label": ariaLabel = "Choose slide",
  ...props
}: CarouselDotsProps) {
  const { orientation, selectedIndex, snapCount, scrollTo } = useCarousel()

  if (snapCount < 2) return null

  const vertical = orientation === "vertical"

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-slot="carousel-dots"
      className={cn(
        "flex items-center justify-center",
        vertical && "flex-col",
        className
      )}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, index) => {
        const active = index === selectedIndex
        return (
          <button
            key={index}
            type="button"
            data-slot="carousel-dot"
            data-active={active ? "" : undefined}
            aria-label={getDotLabel(index, snapCount)}
            aria-current={active ? "true" : undefined}
            onClick={() => scrollTo(index)}
            className={cn(
              "group/dot relative flex touch-manipulation items-center justify-center rounded-full outline-none",
              "after:absolute after:content-['']",
              vertical
                ? "min-h-6 w-6 py-1 after:-inset-x-2.5 after:inset-y-0"
                : "h-6 min-w-6 px-1 after:inset-x-0 after:-inset-y-2.5"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "block size-1.5 rounded-full bg-muted-foreground/45 transition-[width,height,background-color] duration-200 ease-out motion-reduce:transition-none",
                "group-hover/dot:bg-muted-foreground/70 group-focus-visible/dot:ring-2 group-focus-visible/dot:ring-ring/50 group-focus-visible/dot:ring-offset-1 group-focus-visible/dot:ring-offset-background",
                "group-data-active/dot:bg-foreground",
                vertical
                  ? "group-data-active/dot:h-5"
                  : "group-data-active/dot:w-5"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
  type CarouselDotsProps,
}
