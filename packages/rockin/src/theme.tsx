"use client"
import type { ColorSchemeValue } from "@ui-sdk/core"
import { Preferences, usePreference } from "@ui-sdk/react/preferences"
import { createContext, useContext, useState, type ReactNode } from "react"

import {
  createAppPreferences,
  type Accent,
  type AppPreferences,
  type View,
} from "./lib/preferences"

const PreferencesContext = createContext<AppPreferences | null>(null)
let standalone: AppPreferences | undefined

export function PreferencesProvider({
  cookie,
  children,
}: {
  cookie?: string | null
  children: ReactNode
}) {
  const [preferences] = useState(() => createAppPreferences(cookie))
  return (
    <PreferencesContext value={preferences}>
      <Preferences
        preferences={[
          preferences.colorScheme,
          preferences.accent,
          preferences.device,
          preferences.view,
        ]}
      >
        {children}
      </Preferences>
    </PreferencesContext>
  )
}

export function usePreferences() {
  return (
    useContext(PreferencesContext) ?? (standalone ??= createAppPreferences())
  )
}

const includes = (values: readonly string[], value: string) =>
  values.includes(value)

function withoutTransitions(apply: () => void) {
  const style = document.createElement("style")
  style.textContent =
    ':not([data-slot="tabs-list"],[data-slot="tabs-list"] *),:not([data-slot="tabs-list"] *)::before,:not([data-slot="tabs-list"] *)::after{transition:none!important}'
  document.head.append(style)
  apply()
  getComputedStyle(document.body).opacity
  requestAnimationFrame(() => style.remove())
}

export function useTheme() {
  const { colorScheme } = usePreferences()
  const { value, system, resolved } = usePreference(colorScheme)

  return {
    theme: value,
    themes: colorScheme.values,
    systemTheme: system === "unknown" ? undefined : system,
    resolvedTheme: resolved === "unknown" ? undefined : resolved,
    setTheme: (next: string) => {
      if (includes(colorScheme.values, next))
        withoutTransitions(() => colorScheme.set(next as ColorSchemeValue))
    },
  }
}

export function useAccent() {
  const { accent } = usePreferences()
  const { value } = usePreference(accent)

  return {
    accent: value,
    accents: accent.values,
    setAccent: (next: string) => {
      if (includes(accent.values, next))
        withoutTransitions(() => accent.set(next as Accent))
    },
  }
}

export function useView() {
  const { view } = usePreferences()
  const { value } = usePreference(view)

  return {
    view: value,
    views: view.values,
    setView: (next: View) => view.set(next),
    toggleView: () => view.set(value === "grid" ? "list" : "grid"),
  }
}
