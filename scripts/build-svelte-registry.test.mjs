import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const root = new URL("../", import.meta.url)
const read = (path) => readFileSync(new URL(path, root), "utf8")

test("Svelte material is generated from the canonical stylesheet without React dependencies", () => {
  execFileSync(process.execPath, ["scripts/build-svelte-registry.mjs"], { cwd: root })
  const registry = JSON.parse(read("registry/svelte/registry.json"))
  assert.deepEqual(registry.items.map((item) => item.name), ["solid-glass", "ask-card", "dot-loader"])
  const css = JSON.parse(read("public/r/svelte/solid-glass.json"))
  assert.equal(css.files[0].content, read("src/solid-glass.css"))
  assert.equal(css.files[0].target, "~/src/solid-glass.css")
  for (const name of ["ask-card", "dot-loader"]) {
    const item = JSON.parse(read(`public/r/svelte/${name}.json`))
    assert.equal(item.registryDependencies.length, 1)
    assert.match(item.registryDependencies[0], /\/r\/svelte\/solid-glass\.json$/)
    assert.equal(item.files.length, 1)
    assert.equal(item.files[0].content, read(item.files[0].path))
    assert.match(item.files[0].path, /\.svelte$/)
    assert.doesNotMatch(item.files[0].content, /lucide-react|from "react"|@\/components/)
  }
})
