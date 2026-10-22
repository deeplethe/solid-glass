"use client"

import * as React from "react"
import { ArrowUp, ChevronDown, Square } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Where a message is written: a pane of glass holding, on one line that
 * wraps, whatever is offered before the text (`leading`: an attach button),
 * whatever is attached (`tags`), the text itself, and the mark that sends it.
 *
 * The send mark has no block behind it in any state: the button is its mark,
 * and the mark's brightness says what it will do. Ready to send it is as
 * bright as the text being typed; with nothing to send it is dim; while a
 * turn runs (`running`) it is the quiet square that stops it.
 *
 * Enter sends, Shift+Enter breaks the line. Backspace at the very start of
 * the text is handed to `onBackspaceAtStart`, for reaching the tag before it.
 */
function Composer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  running = false,
  placeholder,
  textareaProps,
  leading,
  tags,
  above,
  canSubmit,
  onBackspaceAtStart,
  sendLabel = "Send",
  stopLabel = "Stop",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onSubmit"> & {
  value: string
  onValueChange: (value: string) => void
  onSubmit?: (value: string) => void
  onStop?: () => void
  running?: boolean
  placeholder?: string
  /** Names and describes the input; other HTML attributes belong to the wrapper. */
  textareaProps?: Pick<React.ComponentProps<"textarea">, "id" | "aria-label" | "aria-labelledby" | "aria-describedby">
  leading?: React.ReactNode
  tags?: React.ReactNode
  /** Stands above the line of text: pictures going with the message. */
  above?: React.ReactNode
  /** Whether there is something to send. Defaults to there being text. */
  canSubmit?: boolean
  /** Return true when the key was used, so it does not also reach the text. */
  onBackspaceAtStart?: () => boolean
  sendLabel?: string
  stopLabel?: string
}) {
  const textarea = React.useRef<HTMLTextAreaElement>(null)
  const ready = canSubmit ?? value.trim().length > 0
  // While a turn runs the mark stops it — unless something has been typed,
  // which is then queued behind the turn like any other message.
  const stops = running && !ready
  const Icon = stops ? Square : ArrowUp
  // With nothing to send and nothing to stop, the mark does nothing. It is
  // not disabled for that: a disabled button drops the keyboard to the page
  // at the moment the text is sent or the turn ends, which is when the
  // keyboard was last on it.
  const inert = !stops && !ready

  const resize = React.useCallback(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])
  React.useLayoutEffect(resize, [value, resize])
  React.useLayoutEffect(() => {
    const el = textarea.current
    if (!el || typeof ResizeObserver === "undefined") return
    // Side panels and attachments change wrapping without changing the text.
    // Observe width alone so writing the new height cannot feed back into it.
    let width = -1
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return
      width = entry.contentRect.width
      resize()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [resize])

  const submit = () => {
    if (!ready) return
    onSubmit?.(value)
  }

  return (
    <div
      data-slot="composer"
      className={cn(
        // The pane has no border for a focus colour to show on; while the text
        // is being written, its hairline is drawn again in the focus line.
        "group/composer relative rounded-xl bg-card py-2 pr-1 pl-2 transition-colors focus-within:outline-1 focus-within:-outline-offset-1 focus-within:outline-(--focus-line)",
        className
      )}
      {...props}
    >
      {above && <div className="flex flex-wrap gap-1.5 px-1 pt-0.5 pb-2">{above}</div>}
      {/* items-end keeps both controls pinned to the last line once the
          textarea grows. On one line every child is 32px tall, so that reads
          as centred. Wraps when the tags and the input can no longer share a
          line, which drops the input onto its own row instead of crushing it. */}
      <div className="flex flex-wrap items-end gap-1">
        {leading}
        {tags}
        {/* The text and the mark that sends it stay together: when the tags
            leave them no room on the line, both go to the next one, and the
            mark is never left on a line of its own. */}
        <div className={cn("flex min-w-48 flex-1 items-end gap-1", Boolean(tags) && "ml-1.5", !leading && !tags && "pl-1.5")}>
          <textarea
            {...textareaProps}
            ref={textarea}
            rows={1}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              // Enter that picks a candidate in an input method belongs to the
              // input method, not to sending. Safari reports that key after
              // composition has ended, with keyCode 229 as the only sign.
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (
                event.key === "Backspace" &&
                event.currentTarget.selectionStart === 0 &&
                event.currentTarget.selectionEnd === 0 &&
                onBackspaceAtStart?.()
              ) {
                event.preventDefault()
                return
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            className={cn(
              // The placeholder keeps to one line: wrapped, it makes an empty box two lines tall.
              "scrollbar-thin max-h-50 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-foreground outline-none placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap placeholder:text-muted-foreground"
            )}
          />
          <Button
            size="icon"
            aria-label={stops ? stopLabel : sendLabel}
            aria-disabled={inert || undefined}
            // The pointer sends; the keyboard stays in the text, as in any composer.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (inert) return
              if (stops) onStop?.()
              else submit()
              // Sent or stopped from the keyboard, the next thing to do is write.
              textarea.current?.focus()
            }}
            className={cn(
              "shrink-0 rounded-md bg-transparent transition-colors hover:bg-accent aria-disabled:cursor-default aria-disabled:active:translate-y-0",
              stops
                ? "text-muted-foreground hover:text-foreground"
                : ready
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:bg-transparent"
            )}
          >
            <Icon className={cn("size-4", stops && "size-2.5 fill-current")} />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The line under the composer rather than in it: settings for the message,
 * not part of what is being written. What decides how the assistant works on
 * the left, what the next message is sent with on the right.
 */
function ComposerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-footer"
      className={cn("mt-1 flex items-center gap-1 pr-[9px] pl-2.5 [&>[data-slot=composer-footer-end]]:ml-auto", className)}
      {...props}
    />
  )
}

function ComposerFooterEnd({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="composer-footer-end" className={cn("flex items-center gap-0.5", className)} {...props} />
}

/**
 * A choice among a few, shown as its current value: the mode, the model, how
 * hard it thinks. Held lit while its menu is open, like every other control
 * that has one. With a `hint`, an option says under its name what choosing it
 * means.
 */
function ComposerPick<T extends string>({
  label,
  value,
  options,
  onValueChange,
  shown,
  align = "end",
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onValueChange: (value: T) => void
  /** What the trigger says. Defaults to the chosen option's label. */
  shown?: string
  align?: "start" | "end"
}) {
  const explained = options.some((option) => option.hint)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="composer-pick"
        aria-label={label}
        className="glass-held flex h-6 items-center gap-1 rounded-sm px-1.5 text-[12px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground aria-expanded:text-foreground"
      >
        <span className="max-w-40 truncate">{shown ?? options.find((option) => option.value === value)?.label}</span>
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align={align} className={explained ? "w-72" : "min-w-36"}>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onValueChange(next as T)}>
          {/* Inside the group: a label outside one has nothing to name. */}
          <DropdownMenuLabel className="text-[11px]">{label}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
              className={cn("text-[13px]", option.hint && "items-start py-1.5")}
            >
              {option.hint ? (
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span>{option.label}</span>
                  <span className="text-[12px] leading-snug whitespace-normal text-muted-foreground">{option.hint}</span>
                </span>
              ) : (
                option.label
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { Composer, ComposerFooter, ComposerFooterEnd, ComposerPick }
