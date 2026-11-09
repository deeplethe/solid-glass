"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { RollingNumber, StatusGlyph, type Activity, type Figure } from "@/components/ui/status-glyph"

/** 8 → "8s", 75 → "1m 15s", 3700 → "1h 1m". */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

/** Whole seconds since a moment, counted for as long as the caller is mounted. */
function useElapsed(since: number | undefined): number {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (since === undefined) return
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [since])
  return since === undefined ? 0 : Math.max(0, Math.floor((now - since) / 1000))
}

/**
 * The line a turn ends on for as long as it is going: that it is going (the
 * glyph), what it is doing this moment (the words, with a slow glint across
 * them), for how long, and about how much it has written. It is there from
 * the first moment to the last, whatever else comes and goes above it.
 *
 * Given children, the line is a button, and opens to show them — the calls
 * of the step in hand.
 *
 * Nothing is said of the time until there is a second of it: "0s" is a
 * figure about nothing.
 */
function TurnStatus({
  activity = "thinking",
  figure,
  label,
  since,
  tokens = 0,
  trailing,
  children,
  className,
}: {
  activity?: Activity
  /** One figure alone, instead of the activity's own; see StatusGlyph. */
  figure?: Figure
  /** What is being done, in a few words. Left out, only the glyph and the figures show. */
  label?: string
  /** When the turn began, in milliseconds since the epoch. */
  since?: number
  /** Tokens written so far; the count climbs to each new value. */
  tokens?: number
  /** Said after the line and apart from it: how many background tasks are running, say. */
  trailing?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const elapsed = useElapsed(since)
  // Once the line has had something to open it stays a button. Turned back
  // into plain words between steps, it would drop the keyboard on it to the
  // page; between steps it is a button with nothing to open, and still there.
  const [hadChildren, setHadChildren] = React.useState(Boolean(children))
  if (children && !hadChildren) setHadChildren(true)
  const opens = Boolean(children) || hadChildren
  const openable = Boolean(children)
  // The glyph is decorative. Even without visible words, expose the activity
  // and keep the disclosure's name independent of the clock and token count.
  const activityLabel = label?.trim() || activity

  const line = (
    <>
      <StatusGlyph activity={activity} figure={figure} className="text-foreground/85" />
      {label && <span className="status-shimmer truncate">{label}</span>}
      <span className="flex shrink-0 items-center gap-1 text-muted-foreground/80 tabular-nums">
        {elapsed >= 1 && formatDuration(elapsed)}
        {tokens > 0 && (
          <>
            {elapsed >= 1 && <span>·</span>}
            <RollingNumber value={tokens} />
            <span>tokens</span>
          </>
        )}
      </span>
    </>
  )

  return (
    <div data-slot="turn-status" className={cn("flex flex-col gap-1.5", className)}>
      {/* Announce activity changes without repeating the clock and count. */}
      <span role="status" className="sr-only">{activityLabel}</span>
      <div className="flex h-5 max-w-full items-center gap-1.5">
        {opens ? (
          <button
            type="button"
            aria-label={activityLabel}
            aria-expanded={openable ? open : undefined}
            aria-disabled={!openable || undefined}
            onClick={() => openable && setOpen((value) => !value)}
            className={cn(
              "flex w-fit max-w-full items-center gap-2 text-[12.5px] text-muted-foreground transition-colors outline-none",
              openable ? "hover:text-foreground focus-visible:text-foreground" : "cursor-default"
            )}
          >
            {line}
            {openable && <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />}
          </button>
        ) : (
          <div className="flex w-fit max-w-full items-center gap-2 text-[12.5px] text-muted-foreground">
            {line}
          </div>
        )}
        {trailing}
      </div>
      {open && children}
    </div>
  )
}

export { TurnStatus, formatDuration, useElapsed }
