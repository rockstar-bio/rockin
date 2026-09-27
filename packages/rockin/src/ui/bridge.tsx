"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import {
  getNativeAppPlugin,
  getNativePlatform,
  getNativeStatusBarPlugin,
  getNativeThemePlugin,
  isNativeApp,
} from "../lib"

function getAppPath(value: string) {
  try {
    const url = new URL(value)

    if (url.protocol === "https:" && url.hostname === "kdpower.in") {
      return `${url.pathname}${url.search}${url.hash}`
    }

    if (url.protocol === "kdpower:" && url.hostname === "open") {
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    // Ignore malformed or unrelated deep links.
  }

  return null
}

function getCurrentTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function syncNativeStatusBar() {
  const statusBar = getNativeStatusBarPlugin()
  if (!statusBar) return

  const theme = getCurrentTheme()
  const backgroundColor = theme === "dark" ? "#000000" : "#ffffff"

  void Promise.all([
    statusBar.setStyle?.({
      style: theme === "dark" ? "DARK" : "LIGHT",
    }),
    statusBar.setBackgroundColor?.({
      color: backgroundColor,
    }),
  ]).catch(() => {
    // Status bar sync is optional.
  })
}

function syncNativeTheme() {
  const nativeTheme = getNativeThemePlugin()
  if (!nativeTheme) return

  void nativeTheme
    .setStyle?.({
      style: getCurrentTheme(),
    })
    .catch(() => {
      // Native theme sync is optional when the local native plugin is absent.
    })
}

function syncNativeAppearance() {
  syncNativeStatusBar()
  syncNativeTheme()
}

export function NativeAppBridge() {
  const router = useRouter()

  React.useEffect(() => {
    if (!isNativeApp()) return

    const root = document.documentElement
    const platform = getNativePlatform()

    root.dataset.nativeApp = "true"

    if (platform) {
      root.dataset.nativePlatform = platform
    }

    if (
      platform === "ios" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints < 2
    ) {
      root.dataset.nativeDevice = "mac"
    }

    // Initial native appearance sync.
    syncNativeAppearance()

    // Watch next-themes changing the <html> class.
    const themeObserver = new MutationObserver(() => {
      syncNativeAppearance()
    })

    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    })

    let cancelled = false
    let removeAppUrlListener: (() => Promise<void>) | undefined

    const appPlugin = getNativeAppPlugin()

    if (appPlugin?.addListener) {
      const listenerResult = appPlugin.addListener("appUrlOpen", ({ url }) => {
        const path = getAppPath(url)

        if (path) {
          router.push(path)
        }
      })

      void Promise.resolve(listenerResult)
        .then((listener) => {
          if (cancelled) {
            void listener.remove()
            return
          }

          removeAppUrlListener = () => listener.remove()
        })
        .catch(() => {
          // Deep-link support is optional when the native App plugin is absent.
        })
    }

    return () => {
      cancelled = true

      themeObserver.disconnect()

      void removeAppUrlListener?.()

      delete root.dataset.nativeApp
      delete root.dataset.nativePlatform
      delete root.dataset.nativeDevice
    }
  }, [router])

  return null
}
