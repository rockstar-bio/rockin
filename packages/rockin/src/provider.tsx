"use client"

import * as React from "react"

import { useFullscreen } from "#hooks/useFullscreen"
import { useNative } from "#hooks/useNative"

import { TooltipProvider } from "#components/tooltip"
import { usePreference } from "@ui-sdk/react/preferences"
import { useShortcut } from "@ui-sdk/react/shortcuts"
import { GooeyToaster } from "goey-toast"
import { TopLoader } from "./loader"
import { PreferencesProvider, usePreferences, useTheme } from "./theme"

export const browserThemeColors = {
  light: "#ffffff",
  dark: "#000000",
} as const

export type BrowserTheme = keyof typeof browserThemeColors
export type BrowserThemeColors = Record<BrowserTheme, string>
export type ClientProviderProps = {
  children?: React.ReactNode
  cookie?: string | null
  light?: string
  dark?: string
  fullscreen?: boolean
}

function BrowserChrome({ light, dark }: BrowserThemeColors) {
  const { colorScheme } = usePreferences()
  const { value, resolved } = usePreference(colorScheme)

  React.useEffect(() => {
    if (resolved === "unknown") return
    const style = resolved === "dark" ? "black-translucent" : "default"
    for (const meta of document.head.querySelectorAll<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ))
      meta.content = style
    window.dispatchEvent(
      new CustomEvent("rockin:theme-change", { detail: { theme: resolved } })
    )
  }, [resolved])

  return (
    <>
      {value === "system" ? (
        <>
          <meta
            name="theme-color"
            media="(prefers-color-scheme: light)"
            content={light}
          />
          <meta
            name="theme-color"
            media="(prefers-color-scheme: dark)"
            content={dark}
          />
        </>
      ) : (
        <meta name="theme-color" content={value === "dark" ? dark : light} />
      )}
      <style href={`rockin-chrome-${light}-${dark}`} precedence="default">
        {`:root{background-color:light-dark(${light},${dark})}`}
      </style>
    </>
  )
}

export function ClientProvider({
  children,
  light = browserThemeColors.light,
  dark = browserThemeColors.dark,
  fullscreen = true,
  cookie,
}: ClientProviderProps) {
  return (
    <TooltipProvider>
      <PreferencesProvider cookie={cookie}>
        <TopLoader>
          <AppToaster />
          <AppStatusBarBackground />
          <BrowserChrome light={light} dark={dark} />
          <ThemeHotkey />
          {fullscreen ? <FullscreenHotkey /> : null}
          {children}
        </TopLoader>
      </PreferencesProvider>
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

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  useShortcut(
    "d",
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    { description: "Toggle dark mode" }
  )

  return null
}

function FullscreenHotkey() {
  const isNative = useNative()
  const { toggleFullscreen } = useFullscreen()

  useShortcut(isNative ? null : "f", () => void toggleFullscreen(), {
    description: "Toggle full screen",
  })

  return null
}
