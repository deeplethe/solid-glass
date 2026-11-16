<script lang="ts">
  import { cn } from "$lib/utils.js"

  let { class: className, dotClassName }: { class?: string; dotClassName?: string } = $props()
</script>

<span class={cn("flex items-center gap-[2px]", className)}>
  {#each [0, 1, 2] as index (index)}
    <span
      style:animation-delay={`${index * 160}ms`}
      class={cn("size-[3px] animate-dot-flash rounded-full bg-status-running", dotClassName)}
    ></span>
  {/each}
</span>
