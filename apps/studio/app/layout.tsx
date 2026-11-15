import type { Metadata } from "next"

import { cn } from "rockin/cn"
import { Layout } from "rockin/layout"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Rockin Studio",
    template: "%s | Rockin Studio",
  },
  description: "Build, preview, and test Rockin components in one workspace.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("antialiased")}>
      <body className={cn("root flex min-h-dvh flex-col antialiased")}>
        <Layout>
          <main className="app-container">{children}</main>
        </Layout>
      </body>
    </html>
  )
}
