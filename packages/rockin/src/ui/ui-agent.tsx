"use client"

import * as React from "react"

type Agent = ReturnType<
  (typeof import("@ui-sdk/react/agent"))["createAgent"]
>

export type UiAgentBrief = {
  tag: string
  slot?: string
  role?: string
  name?: string
  state?: string[]
}

export type UiAgentProbes = {
  /** Compact list of on-page ui-sdk components: ref, component, label, actions, value/open/checked. */
  snap: () => unknown[]
  /** The focused element as a small brief. */
  focus: () => UiAgentBrief | null
  /** Briefs for every element matching `selector` (first `limit`). */
  state: (selector: string, limit?: number) => UiAgentBrief[]
  /** Dispatches keydown for each key on the focused element, returns the new focus. */
  keys: (...keys: string[]) => UiAgentBrief | null
}

declare global {
  interface Window {
    agent?: Agent
    ui?: UiAgentProbes
  }
}

const stateAttrs = [
  "data-highlighted",
  "data-active",
  "data-open",
  "data-pressed",
  "data-disabled",
  "data-pointer-hidden",
  "aria-current",
  "aria-expanded",
  "aria-selected",
  "aria-checked",
  "aria-disabled",
]

const localHosts = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$|\.(local|localhost)$/

function brief(el: Element | null): UiAgentBrief | null {
  if (!el || el === document.body) return null
  const name = (el.getAttribute("aria-label") ?? el.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
  const state = stateAttrs
    .filter((attr) => el.hasAttribute(attr))
    .map((attr) => {
      const value = el.getAttribute(attr)
      return value ? `${attr}=${value}` : attr
    })
  if (el === document.activeElement) state.push("focused")
  return {
    tag: el.tagName.toLowerCase(),
    slot: el.getAttribute("data-slot") ?? undefined,
    role: el.getAttribute("role") ?? undefined,
    name: name || undefined,
    state: state.length ? state : undefined,
  }
}

function isLocal() {
  return (
    process.env.NODE_ENV === "development" ||
    localHosts.test(window.location.hostname)
  )
}

export type UiAgentProps = {
  /**
   * Also run on a deployed (non-local) site. Off by default, so the agent only
   * loads in development or on localhost.
   */
  prod?: boolean
}

/**
 * Exposes the ui-sdk agent (`window.agent`) and compact DOM probes
 * (`window.ui`) so a browser tool can check components as small JSON instead
 * of screenshots. Renders nothing; drop it once in the root layout.
 *
 * Runs automatically in development / on localhost. Pass `prod` to enable it
 * on a deployed site as well.
 */
export function UiAgent({ prod = false }: UiAgentProps) {
  React.useEffect(() => {
    if (!prod && !isLocal()) return
    let cancelled = false
    import("@ui-sdk/react/agent").then(({ createAgent }) => {
      if (cancelled || window.agent) return
      const agent = createAgent()
      window.agent = agent
      window.ui = {
        snap: () =>
          agent
            .snapshot()
            .filter((entry) => !entry.offPage)
            .map(({ ref, component, label, actions, ...rest }) => ({
              ref,
              component,
              label,
              actions,
              ...("value" in rest ? { value: rest.value } : {}),
              ...("open" in rest ? { open: rest.open } : {}),
              ...("checked" in rest ? { checked: rest.checked } : {}),
            })),
        focus: () => brief(document.activeElement),
        state: (selector, limit = 20) =>
          Array.from(document.querySelectorAll(selector))
            .slice(0, limit)
            .map(brief)
            .filter((item): item is UiAgentBrief => item !== null),
        keys: (...keys) => {
          for (const key of keys) {
            const target = document.activeElement ?? document.body
            target.dispatchEvent(
              new KeyboardEvent("keydown", {
                key,
                bubbles: true,
                cancelable: true,
              })
            )
          }
          return brief(document.activeElement)
        },
      }
    })
    return () => {
      cancelled = true
    }
  }, [prod])
  return null
}
