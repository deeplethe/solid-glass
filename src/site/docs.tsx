import * as React from "react"
import { TerminalIcon } from "lucide-react"
import Markdown from "react-markdown"
import { Link, Navigate, useLocation } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"
import { CodeBlock, CopyButton, highlight } from "@/site/code"
import { ComponentPreview, ComponentSource } from "@/site/component-preview"
import { DocLoading, DocShell, useDocEntry, type DocSection } from "@/site/docs-layout"
import { resolveHref, urlOf, type Block, type Page } from "@/site/pages"
import { WIDGETS } from "@/site/widgets"

/* ---- What a page is made of ---------------------------------------------- */

const inlineCode = "relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] break-words outline-none"
const linkClass = "font-medium underline underline-offset-4"

function Prose({ children }: { children: string }) {
  const { search } = useLocation()
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (props) => <p className="leading-relaxed [&:not(:first-child)]:mt-6" {...props} />,
        a: ({ href = "", children: label }) => {
          const target = resolveHref(href)
          return target.to ? (
            <Link to={target.to.startsWith("#") ? { search, hash: target.to } : target.to} className={linkClass}>
              {label}
            </Link>
          ) : (
            <a href={target.href} target="_blank" rel="noreferrer" className={linkClass}>
              {label}
            </a>
          )
        },
        code: (props) => <code className={inlineCode} {...props} />,
        ul: (props) => <ul className="my-6 ml-6 list-disc" {...props} />,
        ol: (props) => <ol className="my-6 ml-6 list-decimal" {...props} />,
        li: (props) => <li className="mt-2" {...props} />,
        strong: (props) => <strong className="font-medium" {...props} />,
        table: (props) => (
          <div className="no-scrollbar my-6 w-full overflow-y-auto rounded-xl border">
            <table className="relative w-full overflow-hidden border-none text-sm [&_tbody_tr:last-child]:border-b-0" {...props} />
          </div>
        ),
        tr: (props) => <tr className="m-0 border-b" {...props} />,
        th: (props) => <th className="px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
        td: (props) => <td className="px-4 py-2 text-left whitespace-nowrap [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
      }}
    >
      {children}
    </Markdown>
  )
}

const MANAGERS = {
  pnpm: (command: string) => command.replace(/^npx /, "pnpm dlx ").replace(/^npm install /, "pnpm add "),
  npm: (command: string) => command,
  yarn: (command: string) => command.replace(/^npx /, "yarn dlx ").replace(/^npm install /, "yarn add "),
  bun: (command: string) => command.replace(/^npx /, "bunx --bun ").replace(/^npm install /, "bun add "),
}
type Manager = keyof typeof MANAGERS
const ManagerContext = React.createContext<[Manager, (next: Manager) => void]>(["pnpm", () => {}])

/** One command, said for whichever package manager the reader uses; the choice is kept across the site. */
function CommandBlock({ command }: { command: string }) {
  const [manager, setManager] = React.useContext(ManagerContext)
  const text = MANAGERS[manager](command.replace("{origin}", window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "")))
  return (
    <div className="relative my-6 overflow-hidden rounded-xl bg-code">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1">
        <div className="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
          <TerminalIcon className="size-3 text-background" />
        </div>
        <div className="flex gap-0.5">
          {(Object.keys(MANAGERS) as Manager[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={key === manager}
              onClick={() => setManager(key)}
              className={cn(
                "h-7 rounded-md px-2 font-mono text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
                key === manager && "glass-chosen text-foreground"
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <CopyButton value={text} className="top-2" />
      <pre className="md-code no-scrollbar overflow-x-auto px-4 py-3.5 font-mono text-[13px]">
        <code dangerouslySetInnerHTML={{ __html: highlight(text, "bash") }} />
      </pre>
    </div>
  )
}

function Step({ children }: { children: string }) {
  return (
    <h3 className="step mt-8 scroll-m-28 text-[0.95rem] font-medium tracking-tight [counter-increment:step] before:absolute before:-ml-[42px] before:-mt-px before:flex before:size-7 before:items-center before:justify-center before:rounded-full before:bg-muted before:font-mono before:text-xs before:font-medium before:text-muted-foreground before:content-[counter(step)]">
      {children}
    </h3>
  )
}

/** How to install: the command, or by hand. An underlined pair of tabs, as on ui.shadcn.com. */
function Install({ block }: { block: Extract<Block, { type: "install" }> }) {
  const [tab, setTab] = React.useState<"cli" | "manual">("cli")
  return (
    <div className="mt-6">
      <div role="tablist" className="flex gap-4 border-b">
        {(["cli", "manual"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === tab}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 border-transparent px-0 pb-2.5 text-base font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground",
              key === tab && "border-foreground text-foreground"
            )}
          >
            {key === "cli" ? "Command" : "Manual"}
          </button>
        ))}
      </div>
      <Blocks blocks={block[tab]} />
    </div>
  )
}

function Blocks({ blocks, numbered = false }: { blocks: Block[]; numbered?: boolean }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.depth === 2 ? (
              <h2 key={index} id={block.id} className="mt-10 scroll-m-28 text-xl font-medium tracking-tight first:mt-0 lg:mt-12 [&+p]:mt-4!">
                <a href={`#${block.id}`}>{block.text}</a>
              </h2>
            ) : (
              <h3 key={index} id={block.id} className="mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4!">
                <a href={`#${block.id}`}>{block.text.replace(/`/g, "")}</a>
              </h3>
            )
          case "md":
            return <Prose key={index}>{block.text}</Prose>
          case "code":
            return block.lang === "bash" && /^(npx|npm install) /.test(block.code) && !block.code.includes("\n") ? (
              <CommandBlock key={index} command={block.code} />
            ) : (
              <CodeBlock key={index} code={block.code} lang={block.lang} title={block.title} />
            )
          case "preview":
            return <ComponentPreview key={index} name={block.name} align={block.align} className={block.className} wrapperClassName={block.wrapperClassName} hideCode={block.hideCode} />
          case "install":
            return <Install key={index} block={block} />
          case "source":
            return block.name ? <ComponentSource key={index} name={block.name} title={block.title} /> : null
          case "widget": {
            const Widget = block.name ? WIDGETS[block.name] : undefined
            return Widget ? <Widget key={index} /> : null
          }
          case "callout":
            return (
              <div key={index} className="mt-6 rounded-xl border bg-surface px-4 py-3 text-sm text-foreground/90 [&_p]:mt-0!">
                <Prose>{block.text}</Prose>
              </div>
            )
          case "steps":
            return (
              <div key={index} className="ml-3.5 border-l pb-1 pl-7 [counter-reset:step]">
                <Blocks blocks={block.blocks} numbered />
              </div>
            )
          case "step":
            if (numbered) return <Step key={index}>{block.text}</Step>
            return (
              <p key={index} className="mt-6 font-medium">
                {block.text}
              </p>
            )
        }
      })}
    </>
  )
}

/* ---- On This Page -------------------------------------------------------- */

function TableOfContents({ page }: { page: Page }) {
  const headings = page.blocks.filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading" && block.depth <= 3)
  const [active, setActive] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "0% 0% -80% 0%" }
    )
    for (const heading of headings) {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [headings])

  if (!headings.length) return null
  return (
    <div className="flex flex-col gap-2 p-4 pt-0 text-sm">
      <p className="sticky top-0 h-6 bg-background text-xs font-medium text-muted-foreground">On This Page</p>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          data-active={heading.id === active}
          data-depth={heading.depth}
          className="text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground data-[active=true]:font-medium data-[active=true]:text-foreground data-[depth=3]:pl-4"
        >
          {heading.text.replace(/`/g, "")}
        </a>
      ))}
    </div>
  )
}

// React owns each lazy import's lifetime; only the selected section/slug body is requested.
const bodies = Object.fromEntries(
  Object.entries(import.meta.glob<Page>("/src/docs/pages/*/*.json", { import: "default" })).map(([path, load]) => [
    path,
    React.lazy(async () => {
      const page = await load()
      return { default: () => <DocContent page={page} /> }
    }),
  ])
)

function DocContent({ page }: { page: Page }) {
  const { hash, key } = useLocation()
  const contentRef = React.useRef<HTMLDivElement>(null)
  // The target exists only after the requested body has committed, including on history navigation.
  React.useEffect(() => {
    if (!hash) return
    let id = hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // A malformed escape can still be a literal heading ID.
    }
    const target = document.getElementById(id)
    if (!target) return
    const scrollToTarget = () => target.scrollIntoView()
    scrollToTarget()
    if (typeof ResizeObserver === "undefined") return

    // Lazy previews above the heading can grow after navigation, including without browser scroll anchoring.
    const observer = new ResizeObserver(scrollToTarget)
    for (const preview of contentRef.current?.querySelectorAll('[data-slot="component-preview"]') ?? []) {
      if (preview.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) observer.observe(preview)
    }
    // Once the reader interacts, their position takes precedence over the original anchor.
    const stop = () => {
      observer.disconnect()
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, stop)
    }
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, stop, { passive: true })
    return stop
  }, [hash, key, page])

  return (
    <DocShell title={page.title} description={page.description} url={urlOf(page)} toc={<TableOfContents page={page} />}>
      <div ref={contentRef}>
        <Blocks blocks={page.blocks} />
      </div>
    </DocShell>
  )
}

export function DocPage({ section }: { section: DocSection }) {
  const page = useDocEntry(section)
  const manager = React.useState<Manager>("pnpm")
  if (!page) return <Navigate to="/docs/components" replace />
  const path = `/src/docs/pages/${page.section}/${page.slug}.json`
  const Body = bodies[path]
  if (!Body) throw new Error(`Missing document body: ${path}`)

  return (
    <ManagerContext.Provider value={manager}>
      {/* A new boundary immediately replaces the old body while another document loads. */}
      <React.Suspense key={path} fallback={<DocLoading section={section} />}>
        <Body />
      </React.Suspense>
    </ManagerContext.Provider>
  )
}
