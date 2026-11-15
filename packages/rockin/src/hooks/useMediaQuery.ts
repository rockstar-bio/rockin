import { usePreference } from "@ui-sdk/react/preferences"

import { usePreferences } from "../theme"

export function useMediaQuery() {
  const device = usePreference(usePreferences().screen)
  return {
    device,
    isMobile: device === "mobile",
    isDesktop: device === "desktop",
  }
}
