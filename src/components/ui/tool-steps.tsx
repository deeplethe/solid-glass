"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { DiffStats, DiffView, patchStats } from "@/components/ui/diff-view"

/**
 * One call an agent made, said as what it did — "Read search.py", "Searched for …" —
 * rather than as a tool's name and its arguments.
 */
export type Step = {
  id: string
  /** What the call did, in one line. */
  label: string
  status: "running" | "done" | "error"
  /** What it was asked to do in full: a command, a query, a path. */
  detail?: string
  /** What `detail` is called when the row is opened. */
  detailLabel?: string
  output?: string
  error?: string
  /** A unified patch: the row then reads as a diff. */
  patch?: string
}

const lineClass =
  "flex w-fit max-w-full items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:hover:text-muted-foreground"

/** A command or its output, kept in its own scroll box so a long one fits. */
function OutputBlock({
  label,
  text,
  tone,
  className,
}: {
  label: string
  text: string
  tone?: "error"
  className?: string
}) {
  return (
    <div data-slot="output-block" className={cn("glass-panel overflow-hidden rounded-md", className)}>
      <div className="border-b border-border/70 px-3 py-1 text-[11px] text-muted-foreground">{label}</div>
      <pre
        className={cn(
          "scrollbar-thin max-h-64 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap",
          tone === "error" && "text-destructive"
        )}
      >
        {text}
      </pre>
    </div>
  )
}

/**
 * The row the keyboard was on as it was taken down, if any. A row made again
 * in the same moment for the same call — the one call of a turn becoming the
 * first of a group — takes the focus back, so a keyboard reading a call is
 * not thrown to the top of the page. Forgotten right after, so a row made
 * later for the same call does not take it.
 */
let focusedRowId: string | null = null

/**
 * One call on one line; opened, the call itself — or its diff, when it changed
 * a file. Open on its own, or as told (`open`, `onOpenChange`) by a group that
 * keeps the state of its rows.
 */
function StepRow({
  step,
  labels,
  open: openProp,
  onOpenChange,
}: {
  step: Step
  labels?: Partial<StepLabels>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [openState, setOpenState] = React.useState(false)
  const open = openProp ?? openState
  const words = { ...defaultLabels, ...labels }
  const canOpen = Boolean(step.patch || step.detail || step.output || step.error)
  const button = React.useRef<HTMLButtonElement>(null)

  React.useLayoutEffect(() => {
    const el = button.current
    if (focusedRowId === step.id) {
      focusedRowId = null
      el?.focus()
    }
    return () => {
      // Runs while the row is still in the page, so the focus can be seen.
      if (el && el === document.activeElement) {
        focusedRowId = step.id
        queueMicrotask(() => {
          if (focusedRowId === step.id) focusedRowId = null
        })
      }
    }
  }, [step.id])

  return (
    <div data-slot="step-row" className="flex flex-col gap-1.5">
      <button
        ref={button}
        type="button"
        aria-expanded={canOpen ? open : undefined}
        disabled={!canOpen}
        onClick={() => {
          setOpenState(!open)
          onOpenChange?.(!open)
        }}
        className={cn(lineClass, step.status === "running" && "animate-pulse motion-reduce:animate-none")}
      >
        <span className="truncate text-[12.5px]">{step.label}</span>
        {step.patch && <DiffStats {...patchStats(step.patch)} />}
        {canOpen && <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />}
      </button>

      {open &&
        (step.patch ? (
          <DiffView patch={step.patch} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {step.detail && <OutputBlock label={step.detailLabel ?? words.detail} text={step.detail} />}
            {step.error ? (
              <OutputBlock label={words.error} text={step.error} tone="error" />
            ) : (
              step.output && <OutputBlock label={words.output} text={step.output} />
            )}
          </div>
        ))}
    </div>
  )
}

type StepLabels = { detail: string; output: string; error: string }
const defaultLabels: StepLabels = { detail: "Input", output: "Output", error: "Error" }

/** Calls as a list of what each one did; a row opens to the call itself. */
function StepList({
  steps,
  labels,
  className,
  openRows,
  onRowOpenChange,
}: {
  steps: Step[]
  labels?: Partial<StepLabels>
  className?: string
  /** Which rows are open, by call; without it each row keeps its own. */
  openRows?: Record<string, boolean>
  onRowOpenChange?: (id: string, open: boolean) => void
}) {
  return (
    <div data-slot="step-list" className={cn("glass-panel flex flex-col divide-y divide-border rounded-md", className)}>
      {steps.map((step) => (
        <div key={step.id} className="px-2.5 py-1.5">
          <StepRow
            step={step}
            labels={labels}
            open={openRows ? (openRows[step.id] ?? false) : undefined}
            onOpenChange={onRowOpenChange && ((open) => onRowOpenChange(step.id, open))}
          />
        </div>
      ))}
    </div>
  )
}

/** Everything a run of calls changed in files, so a folded group still shows it. */
function totalStats(steps: Step[]) {
  const patches = steps.flatMap((step) => (step.patch ? [patchStats(step.patch)] : []))
  if (patches.length === 0) return null
  return patches.reduce((sum, stats) => ({ added: sum.added + stats.added, removed: sum.removed + stats.removed }))
}

/**
 * A run of tool calls with nothing said between them. Several in a row say
 * little more than one does, so they fold into one line that can be opened:
 * a long run of calls does not keep pushing the bottom of the page down.
 * What the agent is doing this moment belongs on the turn's status line,
 * not here.
 */
function StepGroup({
  steps,
  summary,
  labels,
  defaultOpen = false,
}: {
  steps: Step[]
  /** The folded line. Defaults to a count of the calls. */
  summary?: string
  labels?: Partial<StepLabels>
  defaultOpen?: boolean
}) {
  const running = steps.some((step) => step.status === "running")
  const [open, setOpen] = React.useState(defaultOpen)
  const stats = totalStats(steps)
  // Which rows are open, by call, held here rather than in the rows: a row
  // is made again when the group forms round it, and must not forget.
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({})
  const setRowOpen = (id: string, value: boolean) => setOpenRows((rows) => ({ ...rows, [id]: value }))

  // When a second call joins the first, the group opens if that call was
  // open, so what was being read stays in view instead of folding away.
  const single = steps.length === 1 ? steps[0].id : null
  const [lastSingle, setLastSingle] = React.useState(single)
  if (single !== lastSingle) {
    setLastSingle(single)
    if (lastSingle !== null && steps.length > 1 && openRows[lastSingle]) setOpen(true)
  }

  // Finishing the same call must not close its details or remove its focused
  // button. A different call starts closed instead of inheriting that state.
  if (single !== null) {
    return (
      <StepRow
        key={single}
        step={steps[0]}
        labels={labels}
        open={openRows[single] ?? false}
        onOpenChange={(value) => setRowOpen(single, value)}
      />
    )
  }

  return (
    <div data-slot="step-group" className="flex flex-col gap-1.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={lineClass}>
        <span className="truncate text-[12.5px]">
          {summary ?? (running ? `Running ${steps.length} steps` : `Ran ${steps.length} steps`)}
        </span>
        {stats && <DiffStats {...stats} />}
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && <StepList steps={steps} labels={labels} openRows={openRows} onRowOpenChange={setRowOpen} />}
    </div>
  )
}

export { StepGroup, StepList, StepRow, OutputBlock }
