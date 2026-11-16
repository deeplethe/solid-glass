// Install the actual generated artifacts, never source-copy components into the fixture.
import { createServer } from "node:http"
import { readFile, rm } from "node:fs/promises"
import { spawn } from "node:child_process"

await rm(new URL("src/lib/consumer-ui", import.meta.url), { recursive: true, force: true })
await rm(new URL("src/solid-glass.css", import.meta.url), { force: true })
// Also clear the default location to catch stale files when the fixture aliases change.
await rm(new URL("src/lib/components", import.meta.url), { recursive: true, force: true })
let origin
const server = createServer(async (req, res) => {
  const match = /^\/r\/svelte\/(ask-card|dot-loader|solid-glass)\.json$/.exec(req.url)
  if (!match) { res.writeHead(404).end(); return }
  try {
    const json = JSON.parse(await readFile(new URL(`../../public/r/svelte/${match[1]}.json`, import.meta.url), "utf8"))
    if (json.registryDependencies) json.registryDependencies = json.registryDependencies.map(url => `${origin}/r/svelte/${url.split("/").at(-1)}`)
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(json))
  } catch (error) { res.writeHead(500).end(String(error)) }
})
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
origin = `http://127.0.0.1:${server.address().port}`
try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/shadcn-svelte/dist/index.mjs", "add", `${origin}/r/svelte/ask-card.json`, `${origin}/r/svelte/dot-loader.json`, "--yes", "--no-deps-install", "--proxy", ""], { stdio: "inherit", env: { ...process.env, CI: "true" } })
    child.on("error", reject)
    child.on("exit", resolve)
  })
  if (code !== 0) throw new Error(`Registry installation exited ${code}`)
  for (const path of ["src/solid-glass.css", "src/lib/consumer-ui/ask-card/ask-card.svelte", "src/lib/consumer-ui/dot-loader/dot-loader.svelte"]) await readFile(new URL(path, import.meta.url))
} finally { server.close() }
