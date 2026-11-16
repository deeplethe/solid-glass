<script lang="ts">
  import AskCard from "$lib/components/ui/ask-card/ask-card.svelte"
  import DotLoader from "$lib/components/ui/dot-loader/dot-loader.svelte"

  let chosen = $state<string>()
</script>

<main class="min-h-screen bg-background p-6 text-foreground">
  <div class="mx-auto max-w-lg space-y-4">
    <AskCard
      question="Which example should run next?"
      options={["Search", "Summarize"]}
      {chosen}
      onAnswer={chosen === undefined ? (option) => { chosen = option } : undefined}
    />
    <button type="button" class="glass-chosen rounded-sm px-2 py-1" onclick={() => { chosen = undefined }}>Reset</button>
    <div role="status" class="flex items-center gap-2"><DotLoader /><span>Working</span></div>
  </div>
</main>
