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
    assert.equal(item.files[0].target, `${name}/${name}.svelte`)
    assert.equal(item.files[0].content, read(item.files[0].path))
    assert.match(item.files[0].path, /\.svelte$/)
    assert.doesNotMatch(item.files[0].content, /lucide-react|from "react"|@\/components/)
  }
})


test("preview dependencies use the configured origin without changing React addresses", () => {
  const react = read("registry.json")
  try {
    execFileSync(process.execPath, ["scripts/build-svelte-registry.mjs"], {
      cwd: root,
      env: { ...process.env, SOLID_GLASS_ORIGIN: "http://127.0.0.1:8765/preview/" },
    })
    const registry = JSON.parse(read("registry/svelte/registry.json"))
    assert.equal(registry.homepage, "http://127.0.0.1:8765/preview")
    for (const name of ["ask-card", "dot-loader"]) {
      const item = JSON.parse(read(`public/r/svelte/${name}.json`))
      assert.deepEqual(item.registryDependencies, ["http://127.0.0.1:8765/preview/r/svelte/solid-glass.json"])
    }
    assert.equal(read("registry.json"), react)
  } finally {
    // Tests must not leave local preview addresses in the committed manifest.
    const env = { ...process.env }
    delete env.SOLID_GLASS_ORIGIN
    execFileSync(process.execPath, ["scripts/build-svelte-registry.mjs"], { cwd: root, env })
  }
})
