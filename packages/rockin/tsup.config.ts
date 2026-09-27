import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cn: "src/cn.ts",
    loader: "src/loader.tsx",
    lucide: "src/lucide.ts",
    gravity: "src/gravity.ts",
    "ui/index": "src/ui/index.ts",
    "icon/index": "src/icon/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "lib/index": "src/lib/index.ts",
    "utils/index": "src/utils/index.ts",
    "utils/parms-client": "src/utils/parms-client.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: true,
  outDir: "dist",
  external: ["react", "react-dom"],
  onSuccess:
    "cp src/styles/globals.css dist/styles.css && cp src/styles/loader.css dist/loader.css",
})
