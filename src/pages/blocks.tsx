import * as React from "react"
import { CheckIcon, ExternalLinkIcon, MonitorIcon, RotateCwIcon, SmartphoneIcon, TabletIcon, TerminalIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { blocks, type Block } from "@/blocks"
import type { BlockSource } from "@/blocks/source"
import { Button, buttonVariants } from "@/components/ui/button"
import { StatusGlyph } from "@/components/ui/status-glyph"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { CodeBlock } from "@/site/code"
import { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/site/page-header"
import { useTheme } from "@/site/theme"

const base = import.meta.env.BASE_URL.replace(/\/$/, "")

const WIDTHS = [
  { name: "Desktop", icon: MonitorIcon, width: "100%" },
  { name: "Tablet", icon: TabletIcon, width: "768px" },
  { name: "Mobile", icon: SmartphoneIcon, width: "390px" },
]

/** Mounted only while Code is visible; leaving the panel ignores any pending result. */
function BlockCode({ block, file, setFile }: {
  block: Block
  file: number
  setFile: (index: number) => void
}) {
  const [source, setSource] = React.useState<BlockSource>()
  const [failed, setFailed] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let active = true
    setSource(undefined)
    setFailed(false)
    block.loadSource().then(
      (loaded) => { if (active) setSource(loaded) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [block, attempt])

  if (failed) return (
    <div role="alert" className="flex items-center gap-3 text-sm text-muted-foreground">
      <p>Could not load this block's source.</p>
      <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
    </div>
  )
  if (!source) return <p role="status" className="text-sm text-muted-foreground">Loading source…</p>

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
      {source.note && <p className="w-full text-sm text-muted-foreground">{source.note}</p>}
      {source.files.length > 1 && (
        <div className="glass-panel flex shrink-0 gap-px overflow-x-auto rounded-xl p-1.5 md:w-56 md:flex-col md:self-start">
          {source.files.map((entry, index) => (
            <button
              key={entry.path}
              type="button"
              aria-pressed={index === file}
              onClick={() => setFile(index)}
              className={cn("shrink-0 truncate rounded-sm px-2 py-1 text-left font-mono text-xs text-muted-foreground outline-none hover:text-foreground", index === file && "glass-chosen text-foreground")}
            >
              {entry.path}
            </button>
          ))}
        </div>
      )}
      <CodeBlock
        className="my-0 min-w-0 flex-1 [&_pre]:max-h-[720px]"
        title={source.files[file].path}
        lang={source.files[file].path.endsWith(".json") ? "json" : "tsx"}
        code={source.files[file].source}
      />
    </div>
  )
}

/** One block: a bar to switch between looking at it and reading it, then the block in a frame of its own. */
function BlockViewer({ block }: { block: Block }) {
  const { theme } = useTheme()
  const [view, setView] = React.useState<"preview" | "code">("preview")
  const [width, setWidth] = React.useState(WIDTHS[0].width)
  const [round, setRound] = React.useState(0)
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const [file, setFile] = React.useState(0)
  // The frame is kept out of sight until what is in it has been drawn: a window that is still
  // loading is white for a moment, and on a dark page that is a flash.
  const frame = `${theme}-${round}`
  const [drawn, setDrawn] = React.useState("")
  // Solid Glass's own come from its registry; shadcn/ui's from shadcn/ui, and take the material from the stylesheet.
  const command = block.own ? `npx shadcn@latest add deeplethe/solid-glass/${block.name}` : `npx shadcn@latest add ${block.name}`
  // The frame is a window of its own: it is told the theme, and loaded again when the theme changes.
  const address = `${base}/view/${block.name}?theme=${theme}`

  return (
    <section id={block.name} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="glass-panel flex gap-0.5 rounded-lg p-0.5 text-sm">
          {(["preview", "code"] as const).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              onClick={() => setView(name)}
              className={cn("rounded-md px-2.5 py-1 text-muted-foreground capitalize outline-none hover:text-foreground", view === name && "glass-chosen text-foreground")}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{block.description}</p>
        <div className="glass-panel hidden gap-0.5 rounded-lg p-0.5 md:flex">
          {WIDTHS.map((entry) => (
            <button
              key={entry.name}
              type="button"
              title={entry.name}
              aria-pressed={width === entry.width}
              onClick={() => {
                setView("preview")
                setWidth(entry.width)
              }}
              className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground", width === entry.width && "glass-chosen text-foreground")}
            >
              <entry.icon className="size-4" />
            </button>
          ))}
          <a href={address} target="_blank" rel="noreferrer" title="Open in a new tab" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
            <ExternalLinkIcon className="size-4" />
          </a>
          <button type="button" title="Load it again" onClick={() => setRound((value) => value + 1)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground">
            <RotateCwIcon className="size-4" />
          </button>
        </div>
        <Button variant="outline" size="sm" className="max-w-full font-mono text-xs" onClick={() => copyToClipboard(command)}>
          {isCopied ? <CheckIcon /> : <TerminalIcon />}
          <span className="truncate">npx shadcn add {block.name}</span>
        </Button>
      </div>

      {view === "preview" ? (
        <div style={{ height: block.height ?? 720 }} className="relative overflow-hidden rounded-xl border bg-transparent p-0">
          {drawn !== frame && (
            <div className="absolute inset-0 flex items-center justify-center">
              <StatusGlyph activity="running" />
            </div>
          )}
          <iframe
            key={frame}
            src={address}
            aria-label={block.title}
            loading="lazy"
            onLoad={() => window.setTimeout(() => setDrawn(frame), 120)}
            style={{ width }}
            className={cn("relative mx-auto block h-full max-w-full transition-[width,opacity] duration-200", drawn !== frame && "opacity-0")}
          />
        </div>
      ) : (
        <BlockCode key={block.name} block={block} file={file} setFile={setFile} />
      )}
    </section>
  )
}

/** Blocks: whole screens made of the components, to look at, to read, and to install with one command. */
const CATEGORIES = ["Featured", "Agents", "Dashboard", "Sidebar", "Login"] as const

export function Blocks() {
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]>("Featured")
  const shown = blocks.filter((block) => (category === "Featured" ? block.featured : block.category === category))
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader>
        <PageHeaderHeading>Whole screens, in the material</PageHeaderHeading>
        <PageHeaderDescription>
          Blocks are finished screens made of the components, with made-up data in them. Look at one, read it, then copy it in and make it yours.
        </PageHeaderDescription>
        <PageActions>
          <a href="#blocks" className={cn(buttonVariants(), "h-[35px] px-3")}>
            Browse Blocks
          </a>
          <Link to="/docs/components" data-slot="button" data-variant="secondary" className={cn(buttonVariants({ variant: "secondary" }), "h-[35px] px-3")}>
            View Components
          </Link>
        </PageActions>
      </PageHeader>
      <div id="blocks" className="container-wrapper flex scroll-mt-20 flex-col gap-14 px-6 pb-20">
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={cn("h-8 shrink-0 rounded-md px-3 text-[15px] font-medium text-muted-foreground outline-none hover:text-foreground", category === name && "glass-chosen text-foreground")}
            >
              {name}
            </button>
          ))}
        </div>
        {shown.map((block) => (
          <BlockViewer key={block.name} block={block} />
        ))}
      </div>
    </div>
  )
}
