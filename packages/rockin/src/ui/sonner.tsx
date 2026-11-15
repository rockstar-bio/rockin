"use client"

import { GooeyToaster, type GooeyToasterProps } from "goey-toast"
import { useTheme } from "../theme"

const Toaster = ({ closeButton = "top-left", ...props }: GooeyToasterProps) => {
  const { theme = "system" } = useTheme()
  const toasterTheme = theme === "dark" ? "dark" : "light"

  return (
    <GooeyToaster
      theme={toasterTheme}
      position="bottom-right"
      closeButton={closeButton}
      {...props}
    />
  )
}

export { Toaster }
