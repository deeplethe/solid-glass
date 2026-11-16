<script lang="ts">
  import { cn } from "$lib/utils.js"

  let {
    question,
    options = [],
    onAnswer,
    chosen,
    eyebrow = "Needs your decision",
    class: className,
  }: {
    question: string
    options?: string[]
    onAnswer?: (option: string) => void
    chosen?: string
    eyebrow?: string
    class?: string
  } = $props()

  const answered = $derived(!onAnswer)
</script>

<div data-slot="ask-card" class={cn("glass-panel rounded-md px-3.5 py-3", className)}>
  <p class="text-[11.5px] text-status-interrupted">{eyebrow}</p>
  <p class="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap">{question}</p>
  {#if options.length > 0}
    <div class="mt-2.5 flex flex-wrap gap-1.5">
      {#each options as option, index (index)}
        <!-- Keep the answered choice focusable so answering does not drop focus to the page. -->
        <button
          type="button"
          aria-disabled={answered || undefined}
          aria-current={option === chosen || undefined}
          onclick={() => onAnswer?.(option)}
          class={cn(
            "h-7 rounded-sm px-2.5 text-[12.5px] transition-colors outline-none",
            answered && option !== chosen ? "cursor-default text-muted-foreground/70" : "glass-chosen text-foreground/90",
            answered ? "cursor-default" : "hover:bg-foreground/[0.12] hover:text-foreground"
          )}
        >{option}</button>
      {/each}
    </div>
  {/if}
</div>
