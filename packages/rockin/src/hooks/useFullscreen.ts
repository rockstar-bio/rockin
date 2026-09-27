"use client"

import * as React from "react"

export function useFullscreen() {
  const toggleFullscreen = React.useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  }, [])

  return {
    toggleFullscreen,
  }
}
