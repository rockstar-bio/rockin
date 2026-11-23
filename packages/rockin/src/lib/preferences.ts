import {
  createColorScheme,
  createCookieStorage,
  createPreference,
  type Preference,
} from "@ui-sdk/core"

export const ACCENTS = ["slate", "violet", "mint", "gold"] as const
export type Accent = (typeof ACCENTS)[number]

export const DEVICES = ["mobile", "desktop"] as const
export type Device = (typeof DEVICES)[number]
export const MOBILE_QUERY = "(max-width: 767px)"

/** How a collection of items is laid out: a grid of cards or a list of rows. */
export const VIEWS = ["grid", "list"] as const
export type View = (typeof VIEWS)[number]

export const PREFERENCE_COOKIES = {
  colorScheme: "color-scheme",
  accent: "accent",
  device: "device",
  view: "view",
} as const

/**
 * The app's saved preferences, kept in cookies so the server renders them too.
 * Create them once per request from its `Cookie` header.
 */
export function createAppPreferences(cookie?: string | null) {
  const device = createPreference({
    values: DEVICES,
    defaultValue: "desktop",
    attribute: "data-device",
    global: true,
    storage: createCookieStorage(PREFERENCE_COOKIES.device, { cookie }),
  })

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
    device,
    screen: createScreen(device),
    view: createPreference({
      values: VIEWS,
      defaultValue: "grid",
      attribute: "data-view",
      global: true,
      storage: createCookieStorage(PREFERENCE_COOKIES.view, { cookie }),
    }),
  }
}

function createScreen(device: Preference<Device>) {
  const read = (): Device =>
    window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop"

  return {
    initialState: device.initialState.value,
    get: () =>
      typeof window === "undefined" ? device.initialState.value : read(),
    subscribe(listener: () => void) {
      const list = window.matchMedia(MOBILE_QUERY)
      const sync = () => {
        device.set(read())
        listener()
      }
      device.set(read())
      list.addEventListener("change", sync)
      return () => list.removeEventListener("change", sync)
    },
  }
}

export type AppPreferences = ReturnType<typeof createAppPreferences>

/** The `<html>` attributes for a request's saved preferences. */
export function preferenceAttributes(cookie?: string | null) {
  const { colorScheme, accent, device, view } = createAppPreferences(cookie)
  return {
    [colorScheme.attribute]: colorScheme.initialState.value,
    [accent.attribute]: accent.initialState.value,
    [device.attribute]: device.initialState.value,
    [view.attribute]: view.initialState.value,
  } as Record<`data-${string}`, string>
}

/** Sets the saved preferences on `<html>` while the page parses, before it paints. */
export function preferencesScript(cookie?: string | null) {
  return `(()=>{const r=document.documentElement;for(const[k,v]of Object.entries(${JSON.stringify(
    preferenceAttributes(cookie)
  )}))r.setAttribute(k,v)})()`
}
