<script lang="ts">
  import AskCard from "$lib/consumer-ui/ask-card/ask-card.svelte"
  import DotLoader from "$lib/consumer-ui/dot-loader/dot-loader.svelte"
  let chosen = $state<string>()
  let answers = $state(0)
</script>

<main class="min-h-screen bg-background p-6 text-foreground">
  <div class="mx-auto max-w-lg space-y-4">
    <h1 class="text-xl">Solid Glass · Svelte</h1>
    <AskCard question="Which example should run next?" options={["Search", "Summarize"]} {chosen}
      onAnswer={chosen === undefined ? (option) => { chosen = option; answers += 1 } : undefined} />
    <button type="button" class="glass-chosen rounded-sm px-2 py-1" onclick={() => { chosen = undefined }}>Reset</button>
    <p data-testid="answers">Answers: {answers}</p>
    <div role="status" class="flex items-center gap-2"><DotLoader /><span>Working</span></div>
    <AskCard question="No options yet" />
    <AskCard question="Duplicate labels are allowed" options={["Same", "Same"]} />
    <AskCard question="Long options wrap without horizontal overflow" options={["Review the detailed proposal", "Request another alternative"]} />
  </div>
</main>
