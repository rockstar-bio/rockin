import { cookies } from "next/headers"

import { NuqsAdapter } from "nuqs/adapters/next/app"
import { preferencesScript } from "../lib/preferences"
import { ClientProvider, type ClientProviderProps } from "../provider"

export type LayoutProps = ClientProviderProps

/**
 * Wraps the app. Reads the request's cookies itself, so saved preferences render on
 * the server and are on `<html>` before the first paint. Put it first inside `<body>`.
 */
export async function Layout({ cookie, ...props }: LayoutProps) {
  const header = cookie ?? (await cookies()).toString()

  return (
    <NuqsAdapter>
      <script dangerouslySetInnerHTML={{ __html: preferencesScript(header) }} />
      <ClientProvider cookie={header} {...props} />
    </NuqsAdapter>
  )
}
