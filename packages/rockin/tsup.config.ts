import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { defineConfig } from "tsup"

const publicEntries = {
  index: "src/index.ts",
  cn: "src/cn.ts",
  loader: "src/loader.tsx",
  provider: "src/provider.tsx",
  lucide: "src/lucide.ts",
  gravity: "src/gravity.ts",
  "icon/index": "src/icon/index.ts",
  "hooks/index": "src/hooks/index.ts",
  "lib/index": "src/lib/index.ts",
  "utils/index": "src/utils/index.ts",
  "utils/parms-client": "src/utils/parms-client.ts",
}

/**
 * One build entry per UI component. A single bundled `ui/index.js` makes apps
 * that import one component from `rockin/ui` also ship recharts, shiki,
 * dnd-kit, ariakit, etc. Separate files let `sideEffects: false` drop the
 * components an app doesn't use. Each component file owns its "use client".
 */
const componentEntries = Object.fromEntries(
  readdirSync("src/ui", { withFileTypes: true }).flatMap((item) => {
    if (item.isFile() && /\.tsx?$/.test(item.name) && item.name !== "index.ts") {
      const name = item.name.replace(/\.tsx?$/, "")
      return [[`ui/${name}`, `src/ui/${item.name}`]]
    }
    if (item.isDirectory()) {
      return readdirSync(`src/ui/${item.name}`)
        .filter((file) => /\.tsx?$/.test(file))
        .filter((file) => item.name !== "data-table" || file.startsWith("index"))
        .map((file) => [
          `ui/${item.name}/${file.replace(/\.tsx?$/, "")}`,
          `src/ui/${item.name}/${file}`,
        ])
    }
    return []
  })
)

/** Runtime export names of a built component file (its single `export { … }`). */
function builtExportNames(file: string) {
  const block = readFileSync(file, "utf8").match(/^export \{([^}]*)\};?\s*$/m)
  if (!block) throw new Error(`no export block in ${file}`)
  return block[1]
    .split(",")
    .map((item) => item.trim().split(/\s+as\s+/).pop()!)
    .filter((name) => name && name !== "default")
}

/**
 * Write dist/ui/index.js as named re-exports of the component files instead
 * of bundling it. Two rules keep Server Component imports small:
 * - no "use client" here, so each component file is its own client reference;
 * - no `export *`, because client reference proxies have unknown export names
 *   and the server bundler would then keep every component.
 */
function writeUiBarrel() {
  const source = readFileSync("src/ui/index.ts", "utf8")
  const owners = new Map<string, string>()
  const barrel = source.replace(
    /export (\*|\{[^}]*\}) from "\.\/([^"]+)"/g,
    (_, what: string, path: string) => {
      const entry =
        existsSync(`src/ui/${path}.tsx`) || existsSync(`src/ui/${path}.ts`)
          ? path
          : `${path}/index`
      if (!componentEntries[`ui/${entry}`]) {
        throw new Error(`rockin/ui re-exports "./${path}" but it has no build entry`)
      }
      const file = `./${entry}.js`
      if (what !== "*") return `export ${what} from "${file}"`
      const names = builtExportNames(`dist/ui/${entry}.js`)
      for (const name of names) {
        if (owners.has(name)) {
          throw new Error(`rockin/ui exports "${name}" from both ${owners.get(name)} and ${file}`)
        }
        owners.set(name, file)
      }
      return names.length ? `export { ${names.join(", ")} } from "${file}"` : ""
    }
  )
  writeFileSync("dist/ui/index.js", barrel)
}

export default defineConfig({
  entry: { ...publicEntries, ...componentEntries },
  format: ["esm"],
  // Types only for the public package exports.
  dts: { entry: { ...publicEntries, "ui/index": "src/ui/index.ts" } },
  sourcemap: false,
  clean: true,
  splitting: true,
  outDir: "dist",
  external: ["react", "react-dom"],
  async onSuccess() {
    writeUiBarrel()
    copyFileSync("src/styles/globals.css", "dist/styles.css")
    copyFileSync("src/styles/loader.css", "dist/loader.css")
  },
})
