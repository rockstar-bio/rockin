"use client"

import { cn } from "cn"
import { Check, Copy } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import { codeToHtml } from "shiki"
import { IconSwap } from "../icon"
import { Button } from "./button"

const highlightCache = new Map<string, string>()

type CodeBlockProps = {
  code: string
  language?: string
  className?: string
  showLineNumbers?: boolean
  maxHeight?: number | string
}

export function CodeBlock({
  code,
  language = "tsx",
  className,
  showLineNumbers = true,
  maxHeight = 400,
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme()

  const [highlighted, setHighlighted] = React.useState<{
    key: string
    html: string
  } | null>(null)
  const [highlightErrorKey, setHighlightErrorKey] = React.useState<
    string | null
  >(null)
  const [copied, setCopied] = React.useState(false)

  const value = code.trim()
  const isDark = resolvedTheme === "dark"
  const highlightKey = `${language}:${isDark ? "dark" : "light"}:${value}`

  React.useEffect(() => {
    let cancelled = false

    const cached = highlightCache.get(highlightKey)
    if (cached) {
      setHighlighted({ key: highlightKey, html: cached })
      return
    }

    async function highlight() {
      try {
        const result = await codeToHtml(value, {
          lang: language,
          theme: isDark ? "github-dark" : "github-light",
        })

        if (!cancelled) {
          highlightCache.set(highlightKey, result)
          setHighlighted({ key: highlightKey, html: result })
          setHighlightErrorKey(null)
        }
      } catch (error) {
        console.error("Failed to highlight code:", error)

        if (!cancelled) {
          setHighlightErrorKey(highlightKey)
        }
      }
    }

    highlight()

    return () => {
      cancelled = true
    }
  }, [highlightKey, value, language, isDark])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch (error) {
      console.error("Failed to copy code:", error)
    }
  }

  const scrollStyle: React.CSSProperties = {
    maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
  }
  const isHighlighted = highlighted?.key === highlightKey
  const showFallback = highlightErrorKey === highlightKey
  const fallbackStyle: React.CSSProperties = {
    ...scrollStyle,
    visibility: showFallback ? "visible" : "hidden",
  }

  return (
    <div
      className={cn(
        "code-block relative overflow-hidden rounded-lg",
        "bg-[#f7f7f7] dark:bg-[#111]",
        className
      )}
    >
      <Button
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        variant="secondary"
        className="absolute top-1 right-1 z-20"
        size="icon-sm"
      >
        <IconSwap active={copied} first={<Copy />} second={<Check />} />
      </Button>

      {isHighlighted ? (
        <div
          style={scrollStyle}
          className={cn(
            "code-block-content scroll-fade overflow-auto",
            showLineNumbers && "code-block-line-numbers"
          )}
          dangerouslySetInnerHTML={{ __html: highlighted.html }}
        />
      ) : (
        <pre
          style={fallbackStyle}
          className="code-block-fallback scroll-fade overflow-auto"
        >
          <code>
            {value.split("\n").map((line, index) => (
              <span key={index} className="block min-w-max">
                {showLineNumbers && (
                  <span className="code-block-fallback-number">
                    {index + 1}
                  </span>
                )}

                {line || " "}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  )
}
