/**
 * Svelte is an additive source registry, not another copy of the material.
 * Keep the existing React registry addresses and build unchanged. The shared
 * CSS is bundled into this registry from its canonical source on every build.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const origin = (process.env.SOLID_GLASS_ORIGIN ?? "https://deeplethe.github.io/solid-glass").replace(/\/$/, "")
const out = join(root, "public/r/svelte")
const items = [
  {
    name: "solid-glass",
    type: "registry:file",
    title: "Solid Glass material for Svelte",
    description: "Canonical material for Svelte AskCard and DotLoader. Import after Tailwind; stock shadcn-svelte widgets are not covered.",
    files: [{ path: "src/solid-glass.css", type: "registry:file", target: "~/src/solid-glass.css" }],
  },
  ...["ask-card", "dot-loader"].map((name) => ({
    name,
    type: "registry:ui",
    title: name === "ask-card" ? "Ask Card" : "Dot Loader",
    registryDependencies: [`${origin}/r/svelte/solid-glass.json`],
    files: [{ path: `registry/svelte/${name}/${name}.svelte`, type: "registry:ui", target: `${name}/${name}.svelte` }],
  })),
]

const registry = {
  $schema: "https://shadcn-svelte.com/schema/registry.json",
  name: "solid-glass-svelte",
  homepage: origin,
  items,
}
writeFileSync(join(root, "registry/svelte/registry.json"), JSON.stringify(registry, null, 2) + "\n")
mkdirSync(out, { recursive: true })
for (const item of items) {
  writeFileSync(join(out, `${item.name}.json`), JSON.stringify({
    $schema: "https://shadcn-svelte.com/schema/registry-item.json",
    ...item,
    files: item.files.map((file) => ({ ...file, content: readFileSync(join(root, file.path), "utf8") })),
  }, null, 2) + "\n")
}
console.log(`svelte registry: ${items.length} items -> public/r/svelte/`)
