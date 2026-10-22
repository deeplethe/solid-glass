"use client"

import { cn } from "@/lib/utils"

/**
 * A decision the agent has put to the user: the question, and its choices as
 * buttons when it gave any. Once the conversation has moved on, leave
 * `onAnswer` out: the choices are then no longer offered, and the card stays
 * as a record of what was asked — and, given `chosen`, of what was said: that
 * choice keeps its pane, the others fade to words.
 */
function AskCard({
  question,
  options = [],
  onAnswer,
  chosen,
  eyebrow = "Needs your decision",
  className,
}: {
  question: string
  options?: string[]
  onAnswer?: (option: string) => void
  /** The option that was taken, once one was. */
  chosen?: string
  eyebrow?: string
  className?: string
}) {
  const answered = !onAnswer
  return (
    <div data-slot="ask-card" className={cn("glass-panel rounded-md px-3.5 py-3", className)}>
      <p className="text-[11.5px] text-status-interrupted">{eyebrow}</p>
      <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">{question}</p>
      {options.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {options.map((option) => {
            const taken = option === chosen
            return (
              // Not disabled once answered: that drops the keyboard to the page
              // on the very press that answers. Inert, and still reachable.
              <button
                key={option}
                type="button"
                aria-disabled={answered || undefined}
                aria-current={taken || undefined}
                onClick={() => onAnswer?.(option)}
                className={cn(
                  "h-7 rounded-sm px-2.5 text-[12.5px] transition-colors outline-none",
                  answered && !taken ? "cursor-default text-muted-foreground/70" : "glass-chosen text-foreground/90",
                  answered ? "cursor-default" : "hover:bg-foreground/[0.12] hover:text-foreground"
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { AskCard }
