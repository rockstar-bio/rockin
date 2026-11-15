import {
  createColorScheme,
  createCookieStorage,
  createPreference,
} from "@ui-sdk/core"

export const ACCENTS = ["slate", "violet", "mint", "gold"] as const
export type Accent = (typeof ACCENTS)[number]

export const PREFERENCE_COOKIES = {
  colorScheme: "color-scheme",
  accent: "accent",
} as const

/**
 * The app's saved preferences, kept in cookies so the server renders them too.
 * Create them once per request from its `Cookie` header.
 */
export function createAppPreferences(cookie?: string | null) {
  return {
    colorScheme: createColorScheme({
      global: true,
      storage: createCookieStorage(PREFERENCE_COOKIES.colorScheme, { cookie }),
    }),
    accent: createPreference({
      values: ACCENTS,
      defaultValue: "slate",
      attribute: "data-accent",
      global: true,
      storage: createCookieStorage(PREFERENCE_COOKIES.accent, { cookie }),
    }),
  }
}

export type AppPreferences = ReturnType<typeof createAppPreferences>

/** The `<html>` attributes for a request's saved preferences. */
export function preferenceAttributes(cookie?: string | null) {
  const { colorScheme, accent } = createAppPreferences(cookie)
  return {
    [colorScheme.attribute]: colorScheme.initialState.value,
    [accent.attribute]: accent.initialState.value,
  } as Record<`data-${string}`, string>
}

/** Sets the saved preferences on `<html>` while the page parses, before it paints. */
export function preferencesScript(cookie?: string | null) {
  return `(()=>{const r=document.documentElement;for(const[k,v]of Object.entries(${JSON.stringify(
    preferenceAttributes(cookie)
  )}))r.setAttribute(k,v)})()`
}
