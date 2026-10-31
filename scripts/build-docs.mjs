/**
 * Turn content/ into a lightweight src/docs/catalog.json and one JSON body per page.
 *
 *   node scripts/build-docs.mjs
 *
 * content/components/*.mdx are shadcn/ui's own component pages (see NOTICE.md); content/solid/ and
 * content/docs/ are Solid Glass's. A page is front matter (title, description) and then Markdown
 * with a handful of tags: <ComponentPreview name="…" />, <ComponentSource name="…" />, the
 * <CodeTabs> block that says how to install, <Callout>, <Step>, and <Widget name="…" /> for the
 * live figures in Solid Glass's own pages. Anything else that is JSX is left out.
 */
import assert from "node:assert/strict"
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const hasExample = (name) => existsSync(join(root, "src/examples", `${name}.tsx`))
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-|-$/g, "")
// The whole name: "className" must not be found inside "previewClassName".
const attr = (tag, name) => tag.match(new RegExp(`(?:^|[\\s<])${name}="([^"]*)"`))?.[1]

// Previews dropped because their example file does not exist, by page. A name
// ending in -rtl is not one: those examples are never files, and the RTL
// heading they sit under is skipped below, so nothing is lost.
const dropped = []

function parse(file, section) {
  const raw = readFileSync(file, "utf8")
  const front = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = Object.fromEntries(
    (front?.[1] ?? "")
      .split("\n")
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")])
  )
  const lines = raw.slice(front?.[0].length ?? 0).split("\n")
  const blocks = []
  let text = []
  const flush = () => {
    const body = text.join("\n").trim()
    if (body) blocks.push({ type: "md", text: body })
    text = []
  }
  // A whole tag, which may run over several lines, starting at line i.
  const tagAt = (i) => {
    let tag = lines[i]
    let end = i
    while (!/>\s*$/.test(lines[end]) && end < lines.length - 1) tag += "\n" + lines[++end]
    return [tag, end]
  }
  const fenceAt = (i) => {
    const open = lines[i].match(/^(\s*)```(\w*)\s*(.*)$/)
    let end = i + 1
    while (end < lines.length && !/^\s*```\s*$/.test(lines[end])) end++
    const indent = open[1].length
    return [
      {
        type: "code",
        lang: open[2] || "text",
        title: open[3].match(/title="([^"]*)"/)?.[1],
        code: lines
          .slice(i + 1, end)
          .map((line) => line.slice(Math.min(indent, line.match(/^\s*/)[0].length)))
          .join("\n"),
      },
      end,
    ]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      flush()
      const [code, end] = fenceAt(i)
      blocks.push(code)
      i = end
    } else if (/^(import|export)\s/.test(line)) {
      // An MDX import, which is for the page's own tags and not something to read.
      flush()
      while (i < lines.length - 1 && !/from\s+["'][^"']+["'];?\s*$/.test(lines[i]) && lines[i].trim() !== "") i++
    } else if (/^<CodeTabs/.test(line)) {
      // How to install: the command, and by hand the packages and then the source.
      flush()
      let end = i
      while (end < lines.length && !/^<\/CodeTabs>/.test(lines[end])) end++
      const inner = lines.slice(i, end).join("\n")
      const fences = [...inner.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1].trim())
      blocks.push({
        type: "install",
        cli: fences.find((code) => code.includes("shadcn")),
        packages: fences.find((code) => /^(npm|pnpm) (install|add)/.test(code)),
        source: attr(inner.match(/<ComponentSource[\s\S]*?\/>/)?.[0] ?? "", "name"),
      })
      i = end
    } else if (/^<ComponentPreview/.test(line)) {
      flush()
      const [tag, end] = tagAt(i)
      const name = attr(tag, "name")
      if (name && !hasExample(name) && !name.endsWith("-rtl")) dropped.push(`${file.slice(root.length + 1)}: ${name}`)
      if (name && hasExample(name)) {
        blocks.push({
          type: "preview",
          name,
          align: attr(tag, "align"),
          // previewClassName is for the box the example stands in; className is for the frame
          // round it, and reaches inside with selectors of its own.
          className: attr(tag, "previewClassName"),
          wrapperClassName: attr(tag, "className"),
          hideCode: /hideCode/.test(tag) || undefined,
        })
      }
      i = end
    } else if (/^<ComponentSource/.test(line)) {
      flush()
      const [tag, end] = tagAt(i)
      blocks.push({ type: "source", name: attr(tag, "name"), title: attr(tag, "title") })
      i = end
    } else if (/^<Widget/.test(line)) {
      flush()
      const [tag, end] = tagAt(i)
      blocks.push({ type: "widget", name: attr(tag, "name") })
      i = end
    } else if (/^<Callout/.test(line)) {
      flush()
      let end = i
      while (end < lines.length && !/<\/Callout>/.test(lines[end])) end++
      const body = lines.slice(i, end + 1).join("\n").replace(/<\/?Callout[^>]*>/g, "").trim()
      if (body) blocks.push({ type: "callout", text: body })
      i = end
    } else if (/^<Step>/.test(line)) {
      flush()
      blocks.push({ type: "step", text: line.replace(/<\/?Step>/g, "").trim() })
    } else if (/^<\/?[A-Za-z]/.test(line.trim()) && !/^<(a|kbd|code|br)\b/.test(line.trim())) {
      // Some other tag: left out, to the end of it.
      flush()
      const [, end] = tagAt(i)
      i = end
    } else if (/^#{2,4}\s/.test(line)) {
      flush()
      const [, hashes, title] = line.match(/^(#{2,4})\s+(.*)$/)
      blocks.push({ type: "heading", depth: hashes.length, text: title.trim(), id: slug(title) })
    } else if (line.trim() === "") {
      flush()
    } else {
      text.push(line)
    }
  }
  flush()

  // What cannot be shown here goes, heading and all: right-to-left examples need the site's
  // language switcher, and a heading whose previews were all dropped has nothing under it.
  const kept = []
  let skipping = 0
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.type === "heading") {
      if (skipping && block.depth > skipping) continue
      skipping = /^(RTL|Changelog)$/i.test(block.text) ? block.depth : 0
      if (skipping) continue
      const next = blocks[i + 1]
      if (!next || (next.type === "heading" && next.depth <= block.depth)) continue
    } else if (skipping) continue
    kept.push(block)
  }
  // Two ids alike on one page would send a link to the first.
  const seen = new Map()
  for (const block of kept) {
    if (block.type !== "heading") continue
    const n = seen.get(block.id) ?? 0
    seen.set(block.id, n + 1)
    if (n) block.id = `${block.id}-${n}`
  }

  const name = file.split("/").pop().replace(/\.mdx$/, "")
  return { slug: name, section, group: meta.group, title: meta.title ?? name, description: meta.description ?? "", order: Number(meta.order ?? 0), blocks: kept }
}

const pages = []
for (const [folder, section] of [
  ["content/docs", "docs"],
  ["content/solid", "solid"],
  ["content/components", "components"],
]) {
  const dir = join(root, folder)
  if (!existsSync(dir)) continue
  const found = readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => parse(join(dir, file), section))
  found.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  pages.push(...found)
}

const out = join(root, "src/docs")
const catalog = pages.map(({ blocks, ...entry }) => entry)
const keys = pages.map((page) => `${page.section}/${page.slug}`)
assert.equal(new Set(keys).size, pages.length, "Documentation page keys must be unique")
for (const page of pages) assert(!/[\\/]/.test(page.slug), `Invalid page slug: ${page.slug}`)

mkdirSync(out, { recursive: true })
writeFileSync(join(out, "catalog.json"), JSON.stringify(catalog))
for (const section of ["docs", "solid", "components"]) {
  const directory = join(out, "pages", section)
  mkdirSync(directory, { recursive: true })
  const sectionPages = pages.filter((page) => page.section === section)
  const filenames = new Set(sectionPages.map((page) => `${page.slug}.json`))
  // Deleted source pages must not remain discoverable by import.meta.glob.
  for (const filename of readdirSync(directory)) {
    if (filename.endsWith(".json") && !filenames.has(filename)) unlinkSync(join(directory, filename))
  }
  for (const page of sectionPages) writeFileSync(join(directory, `${page.slug}.json`), JSON.stringify(page))
}
const legacy = join(out, "generated.json")
if (existsSync(legacy)) unlinkSync(legacy)

console.log(`docs: ${pages.length} pages -> src/docs/catalog.json + src/docs/pages/`)
if (dropped.length) {
  // A warning, not a failure: the pages below already ship without these
  // examples, and failing here would block the build until each one is
  // written. The list is the work to do, not a reason to stop.
  console.error(`docs: ${dropped.length} preview(s) dropped, no example file:`)
  for (const entry of dropped) console.error(`  ${entry}`)
}
