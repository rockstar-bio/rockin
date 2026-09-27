# Rockstar UI

[![npm version](https://img.shields.io/npm/v/rockin)](https://www.npmjs.com/package/rockin)

Shared React UI components for Rockstar projects.

Install from npm:

```bash
bun add rockin
```

See the [package documentation](packages/rockin/README.md) for usage and development instructions.

## Studio app

The example Next.js app lives in `apps/studio` and renders components from
`packages/rockin`.

```bash
# dev server (builds the package first, then starts Next.js)
bun run dev:studio

# production build
bun run build:studio

# typecheck the studio app
bun run typecheck:studio
```
