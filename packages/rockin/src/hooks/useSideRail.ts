import { useSyncExternalStore } from "react"

export type SideRail = "left" | "right" | null

/** A side inset this wide holds a vertical nav rail (iPhone Duo reports 84px). */
const RAIL_MIN_INSET = 64
/** The opposite side must be near zero, so symmetric landscape notches keep the bottom bar. */
const RAIL_MAX_OPPOSITE = 16

let probe: HTMLDivElement | null = null

function readInsets() {
  if (!probe) {
    probe = document.createElement("div")
    probe.setAttribute("aria-hidden", "true")
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
      "padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)"
    document.body.appendChild(probe)
  }
  const style = getComputedStyle(probe)
  return {
    left: Number.parseFloat(style.paddingLeft) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
  }
}

function getSnapshot(): SideRail {
  const { left, right } = readInsets()
  if (right >= RAIL_MIN_INSET && left <= RAIL_MAX_OPPOSITE) return "right"
  if (left >= RAIL_MIN_INSET && right <= RAIL_MAX_OPPOSITE) return "left"
  return null
}

function subscribe(onChange: () => void) {
  // iOS can apply new safe-area insets after the resize event on rotation or
  // fold/unfold. The probe's border box is its padding, so watching its size
  // catches the inset change itself.
  readInsets()
  const observer =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onChange)
  if (probe) observer?.observe(probe, { box: "border-box" })

  let frame = 0
  const onViewportChange = () => {
    onChange()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(onChange)
  }
  window.addEventListener("resize", onViewportChange)
  window.addEventListener("orientationchange", onViewportChange)
  return () => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    window.removeEventListener("resize", onViewportChange)
    window.removeEventListener("orientationchange", onViewportChange)
  }
}

/**
 * Which screen edge has a wide, empty safe-area strip that can hold a vertical
 * nav rail, such as the sensor column on the iPhone Duo. `null` everywhere else.
 */
export function useSideRail(): SideRail {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
