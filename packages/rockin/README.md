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
npm install
npm run typecheck
npm run build
```
