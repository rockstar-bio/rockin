# rockin

Shared React UI for Rockstar projects.

## Install

```bash
npm install rockin
```

## Usage

```tsx
import { Button } from "rockin/ui"
import { Loader } from "rockin/icon"
import { useMounted } from "rockin/hooks"
import { cn } from "rockin/lib"
import "rockin/styles.css"
```

The root entry also exports the client-side theme provider:

```tsx
import type { ReactNode } from "react"
import { Provider } from "rockin"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider light="#ffffff" dark="#000000" fullscreen={false}>
      {children}
    </Provider>
  )
}
```

`light` and `dark` override the browser theme colors. `fullscreen` controls the
`F`-key fullscreen shortcut and defaults to `true`.

Focused entry points are also available:

```tsx
import { Button } from "rockin/ui"
import { useMounted } from "rockin/hooks"
import { cn } from "rockin/cn"
import { OpenAI } from "rockin/utils"
import { Loader } from "rockin/icon"
import * as Lucide from "rockin/lucide"
import * as Gravity from "rockin/gravity"
```

## Development

```bash
bun install
bun run typecheck
bun run build
```
