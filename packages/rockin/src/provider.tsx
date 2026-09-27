"use client"

import { usePathname } from "next/navigation"
import * as React from "react"
import { useHotkeys } from "react-hotkeys-hook"

import { useFullscreen } from "#hooks/useFullscreen"
import { useNative } from "#hooks/useNative"

import { TooltipProvider } from "#components/tooltip"
import { GooeyToaster } from "goey-toast"
import { ThemeProvider, useTheme } from "next-themes"
import { TopLoader } from "./loader"

export const browserThemeColors = {
  light: "#ffffff",
  dark: "#000000",
} as const

export type BrowserTheme = keyof typeof browserThemeColors
export type BrowserThemeColors = Record<BrowserTheme, string>
export type ProviderProps = React.ComponentProps<typeof ThemeProvider> & {
  light?: string
  dark?: string
  fullscreen?: boolean
}

function syncBrowserChrome(theme: BrowserTheme, colors: BrowserThemeColors) {
  const themeColor = colors[theme]
  const statusBarStyle = theme === "dark" ? "black-translucent" : "default"
  const themeColorMetas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )

  if (themeColorMetas.length) {
    themeColorMetas.forEach((meta) => {
      if (meta.content !== themeColor) {
        meta.content = themeColor
      }
    })
  } else {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = themeColor
    document.head.appendChild(meta)
  }

  const statusBarMetas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  )

  if (statusBarMetas.length) {
    statusBarMetas.forEach((meta) => {
      if (meta.content !== statusBarStyle) {
        meta.content = statusBarStyle
      }
    })
  } else {
    const meta = document.createElement("meta")
    meta.name = "apple-mobile-web-app-status-bar-style"
    meta.content = statusBarStyle
    document.head.appendChild(meta)
  }

  if (document.documentElement.style.colorScheme !== theme) {
    document.documentElement.style.colorScheme = theme
  }

  if (document.documentElement.style.backgroundColor !== themeColor) {
    document.documentElement.style.backgroundColor = themeColor
  }
}

function observeBrowserChrome(theme: BrowserTheme, colors: BrowserThemeColors) {
  const observer = new MutationObserver(() => {
    syncBrowserChrome(theme, colors)
  })

  observer.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["content"],
  })

  return observer
}

function useBrowserTheme(): BrowserTheme {
  const { resolvedTheme } = useTheme()

  return resolvedTheme === "dark" ? "dark" : "light"
}

function BrowserThemeSync({ light, dark }: BrowserThemeColors) {
  const pathname = usePathname()
  const theme = useBrowserTheme()
  const colors = React.useMemo(() => ({ light, dark }), [dark, light])

  React.useLayoutEffect(() => {
    syncBrowserChrome(theme, colors)
  }, [colors, pathname, theme])

  React.useEffect(() => {
    const observer = observeBrowserChrome(theme, colors)

    return () => {
      observer.disconnect()
    }
  }, [colors, theme])

  return null
}

export function Provider({
  children,
  light = browserThemeColors.light,
  dark = browserThemeColors.dark,
  fullscreen = true,
  ...props
}: ProviderProps) {
  return (
    <TooltipProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        {...props}
      >
        <TopLoader>
          <AppToaster />
          <AppStatusBarBackground />
          <NativeThemeEventSync />
          <BrowserThemeSync light={light} dark={dark} />
          <ThemeHotkey />
          {fullscreen ? <FullscreenHotkey /> : null}
          {children}
        </TopLoader>
      </ThemeProvider>
    </TooltipProvider>
  )
}

function AppToaster() {
  const { resolvedTheme } = useTheme()
  const toasterTheme = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <GooeyToaster
      key={toasterTheme}
      theme={toasterTheme}
      position="bottom-right"
      closeButton="top-left"
    />
  )
}

function AppStatusBarBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 hidden h-(--app-safe-top) bg-background/80 backdrop-blur-xl standalone:block native:block"
    />
  )
}

function NativeThemeEventSync() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (!resolvedTheme) return

    window.dispatchEvent(
      new CustomEvent("kdpower:theme-change", {
        detail: {
          theme: resolvedTheme,
        },
      })
    )
  }, [resolvedTheme])

  return null
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (typeof event.key !== "string" || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

function FullscreenHotkey() {
  const isNative = useNative()
  const { toggleFullscreen } = useFullscreen()

  useHotkeys(
    "f",
    () => {
      void toggleFullscreen()
    },
    {
      enabled: !isNative,
      enableOnContentEditable: false,
      enableOnFormTags: false,
      preventDefault: true,
    }
  )

  return null
}
