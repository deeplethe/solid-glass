import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Replace only Vite's glob boundary; run the real registry and source loader without a browser.
function loadModule(path, glob, require = () => { throw new Error("Unexpected module import") }) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8")
  const { outputText } = ts.transpileModule(source.replaceAll("import.meta.glob", "glob"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports, glob, require }, { filename: path })
  return exports
}

function sourceModule(fixtures) {
  const calls = []
  const sources = Object.fromEntries(Object.entries(fixtures).map(([path, source]) => [path, async () => {
    calls.push(path)
    return typeof source === "function" ? source() : source
  }]))
  const module = loadModule("../src/blocks/source.ts", (_patterns, options) => {
    assert.equal(options.query, "?raw")
    assert.notEqual(options.eager, true)
    return sources
  })
  return { ...module, calls }
}

test("initializing the registry and loading a preview never imports raw sources", async () => {
  const previewCalls = []
  let sourceImports = 0
  const { blocks } = loadModule("../src/blocks/index.ts", (_patterns, options) => {
    assert.notEqual(options?.query, "?raw")
    return new Proxy({}, { get: (_target, path) => async () => {
      previewCalls.push(path)
      return { default: () => null }
    } })
  }, (name) => {
    if (name === "react") return { lazy: (load) => ({ load }) }
    if (name === "./source") {
      sourceImports++
      return { loadBlockSource: async (name) => ({ files: [{ path: `${name}.tsx`, source: "code" }] }) }
    }
    throw new Error(`Unexpected module import: ${name}`)
  })
  assert.equal(sourceImports, 0)
  assert.deepEqual(previewCalls, [])
  const selected = blocks.find((block) => block.name === "sidebar-07")
  await selected.component.load()
  assert.deepEqual(previewCalls, ["/src/blocks/sidebar-07/page.tsx"])
  assert.equal(sourceImports, 0)
  const code = await selected.loadSource()
  assert.equal(sourceImports, 1)
  assert.equal(code.files[0].path, "sidebar-07.tsx")
})

test("Code loads only its block and overview, preserving file order and copied paths", async () => {
  const { loadBlockSource, calls } = sourceModule({
    "/src/blocks/sidebar-07/components/z.tsx": 'import A from "@/blocks/sidebar-07/components/a"',
    "/src/blocks/sidebar-07/page.tsx": 'export const iframeHeight = "800px"\n\nexport const description = "Preview"\n\nimport Overview from "@/blocks/shared/overview"\nimport Sidebar from "@/blocks/sidebar-07/components/a"\nexport default Sidebar',
    "/src/blocks/sidebar-07/components/a.tsx": "export const description = 'Keep component exports'\n",
    "/src/blocks/sidebar-07/data.json": '{"rows": []}',
    "/src/blocks/shared/overview.tsx": 'export default function Overview() { return "overview" }',
    "/src/blocks/login-04/page.tsx": "Must not load",
    "/src/blocks/agent-workspace.tsx": "Must not load",
  })
  assert.deepEqual(calls, [])
  const result = await loadBlockSource("sidebar-07")
  assert.deepEqual(Array.from(result.files, (file) => file.path), [
    "page.tsx", "components/a.tsx", "components/z.tsx", "data.json", "shared/overview.tsx",
  ])
  assert.equal(result.files[0].source, 'import Overview from "@/shared/overview"\nimport Sidebar from "@/components/a"\nexport default Sidebar')
  assert.equal(result.files[1].source, "export const description = 'Keep component exports'\n")
  assert.equal(result.files[2].source, 'import A from "@/components/a"')
  assert.equal(result.files[3].source, '{"rows": []}')
  assert.match(result.note, /empty boxes.*<Overview \/>/)
  assert.equal(calls.length, 5)
  assert.ok(calls.every((path) => path.startsWith("/src/blocks/sidebar-07/") || path === "/src/blocks/shared/overview.tsx"))
  assert.strictEqual(await loadBlockSource("sidebar-07"), result)
  assert.equal(calls.length, 5)
})

test("own blocks retain their install path and successful concurrent loads are reused", async () => {
  const original = 'import Panel from "@/components/ui/panel"\nexport default Panel'
  const { loadBlockSource, calls } = sourceModule({
    "/src/blocks/agent-workspace.tsx": original,
    "/src/blocks/login-04/page.tsx": "Must not load",
  })
  const [first, second] = await Promise.all([
    loadBlockSource("agent-workspace", true), loadBlockSource("agent-workspace", true),
  ])
  assert.strictEqual(first, second)
  assert.deepEqual(Array.from(first.files, (file) => file.path), ["components/agent-workspace.tsx"])
  assert.equal(first.files[0].source, original)
  assert.equal(first.note, undefined)
  assert.deepEqual(calls, ["/src/blocks/agent-workspace.tsx"])
})

test("failed source loads reject and allow a later retry", async () => {
  let attempts = 0
  const { loadBlockSource, calls } = sourceModule({
    "/src/blocks/login-04/page.tsx": () => {
      if (++attempts === 1) throw new Error("Network unavailable")
      return "export default function Login() {}"
    },
    "/src/blocks/sidebar-07/page.tsx": "Must not load",
  })
  await assert.rejects(loadBlockSource("login-04"), /Network unavailable/)
  const result = await loadBlockSource("login-04")
  assert.equal(result.files[0].source, "export default function Login() {}")
  assert.equal(result.note, undefined)
  assert.deepEqual(calls, ["/src/blocks/login-04/page.tsx", "/src/blocks/login-04/page.tsx"])
})
