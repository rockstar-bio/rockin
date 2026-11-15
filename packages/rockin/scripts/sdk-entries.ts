import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

export function writeSdkEntries() {
  const targets = new Map<string, string>()
  for (const [pkg, prefix] of [
    ["@ui-sdk/react", "sdk/"],
    ["@ui-sdk/core", "sdk/core/"],
  ] as const) {
    const { exports } = JSON.parse(
      readFileSync(`node_modules/${pkg}/package.json`, "utf8")
    ) as { exports: Record<string, unknown> }
    for (const key of Object.keys(exports)) {
      if (key === "./package.json" || /\.css$/.test(key)) continue
      const out = key === "." ? prefix.slice(0, -1) : prefix + key.slice(2)
      const spec = key === "." ? pkg : `${pkg}/${key.slice(2)}`
      if (targets.has(out)) {
        throw new Error(
          `rockin/${out} maps to both ${targets.get(out)} and ${spec}`
        )
      }
      targets.set(out, spec)
    }
  }
  mkdirSync("dist/sdk/core", { recursive: true })
  for (const [out, spec] of targets) {
    const line = `export * from "${spec}"\n`
    writeFileSync(`dist/${out}.js`, line)
    writeFileSync(`dist/${out}.d.ts`, line)
  }
}
