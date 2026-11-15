"use client"
import { Display, Moon, Sun } from "@gravity-ui/icons"
import { cn } from "cn"

import { useTheme } from "../theme"
import { Tabs } from "./tabs"

// Each icon moves as its tab becomes selected, and back as it's left.
const THEMES = [
  { label: "Light", value: "light", icon: Sun, motion: "[[data-selected]_&]:rotate-180" },
  { label: "System", value: "system", icon: Display, motion: "[[data-selected]_&]:scale-115" },
  { label: "Dark", value: "dark", icon: Moon, motion: "[[data-selected]_&]:-rotate-25" },
] as const

const iconMotion =
  "transition-[rotate,scale] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"

type ThemeSwitcherProps = Omit<
  Parameters<typeof Tabs>[0],
  "value" | "defaultValue" | "onValueChange" | "children"
>

export function ThemeSwitcher({
  variant = "ghost",
  ...props
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Tabs
      variant={variant}
      value={theme}
      onValueChange={(value) => value && setTheme(value)}
      {...props}
    >
      <Tabs.List aria-label="Theme" className="border">
        {THEMES.map(({ label, value, icon: Icon, motion }) => (
          <Tabs.Tab
            key={value}
            value={value}
            aria-label={label}
            className="px-1.5"
          >
            <Tabs.Icon>
              <Icon className={cn(iconMotion, motion)} />
            </Tabs.Icon>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
