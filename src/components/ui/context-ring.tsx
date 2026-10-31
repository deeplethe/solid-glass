"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** One thing the context is full of, and the colour it is drawn in (a background class). */
export type ContextPart = { key: string; label: string; tokens: number; tint: string }

/** 168100 → "168.1k", 1000000 → "1M": the way a window's size is said aloud. */
function compactTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`
  return String(n)
}

const share = (tokens: number, window: number) => (window > 0 ? `${((tokens / window) * 100).toFixed(1)}%` : "—")

/**
 * How full a model's context window is, as a ring: read at a glance, opened
 * for the numbers and for what the context is full of.
 *
 * Blue while there is room, which is nearly always; amber from 70%, the
 * colour of failure from 90% — nearly full is worth a second look.
 */
function ContextRing({
  used,
  window,
  parts = [],
  title = "Context window",
  note = "How much of the window this conversation takes up. Earlier turns are compacted as it fills.",
  freeLabel = "Free",
  className,
}: {
  used: number
  window: number
  parts?: ContextPart[]
  title?: string
  note?: string
  freeLabel?: string
  className?: string
}) {
  const [detailed, setDetailed] = React.useState(false)
  const fraction = window > 0 ? Math.min(used / window, 1) : 0
  const percent = Math.round(fraction * 100)
  const r = 6
  const around = 2 * Math.PI * r
  const tone = fraction >= 0.9 ? "text-destructive" : fraction >= 0.7 ? "text-amber-500" : "text-blue-500"
  const counted = parts.reduce((sum, part) => sum + part.tokens, 0)
  const free = Math.max(window - Math.max(used, counted), 0)

  return (
    <Popover>
      <PopoverTrigger
        data-slot="context-ring"
        aria-label={`${title} ${percent}%`}
        className={cn(
          "glass-held flex size-6 items-center justify-center rounded-sm outline-none hover:bg-accent focus-visible:bg-accent",
          className
        )}
      >
        <svg viewBox="0 0 16 16" className={cn("size-3.5 -rotate-90", tone)} aria-hidden="true">
          <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
          <circle
            cx="8"
            cy="8"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${around * fraction} ${around}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-72 gap-2 p-3">
        <button
          type="button"
          data-slot="context-ring-detail"
          disabled={!parts.length}
          aria-expanded={detailed}
          onClick={() => setDetailed((open) => !open)}
          className="flex items-baseline gap-2 text-left text-[12.5px] outline-none"
        >
          <span className="mr-auto text-muted-foreground">{title}</span>
          <span className="tabular-nums">
            {compactTokens(used)} / {compactTokens(window)} ({percent}%)
          </span>
          {parts.length > 0 && (
            <ChevronDown
              className={cn("size-3 self-center text-muted-foreground transition-transform", !detailed && "-rotate-90")}
            />
          )}
        </button>

        {/* One bar, a segment to a part. Without parts it is the plain total. */}
        <div className="flex h-1 gap-px overflow-hidden rounded-full bg-secondary">
          {parts.length ? (
            parts.map((part) => (
              <div
                key={part.key}
                className={cn("h-full transition-[width] duration-500", part.tint)}
                style={{ width: `${window > 0 ? (part.tokens / window) * 100 : 0}%` }}
              />
            ))
          ) : (
            <div className={cn("h-full bg-current transition-[width] duration-500", tone)} style={{ width: `${fraction * 100}%` }} />
          )}
        </div>

        {detailed && parts.length > 0 && (
          <ul className="flex flex-col gap-1 text-[12px]">
            {[...parts, { key: "free", label: freeLabel, tokens: free, tint: "bg-secondary" }].map((part) => (
              <li key={part.key} className="flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-[2px]", part.tint)} />
                <span className="mr-auto">{part.label}</span>
                <span className="text-muted-foreground tabular-nums">{compactTokens(part.tokens)}</span>
                <span className="w-11 text-right tabular-nums">{share(part.tokens, window)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11.5px] leading-relaxed text-muted-foreground">{note}</p>
      </PopoverContent>
    </Popover>
  )
}

export { ContextRing, compactTokens }
