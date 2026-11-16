# Svelte registry proof of concept

Solid Glass is a React design system, not SolidJS. This additive registry explores
Svelte 5 delivery through **shadcn-svelte**, while leaving every React component,
registry name and URL intact. It is a starting point for maintainer discussion,
not a complete framework port.

## Install

Start with a Tailwind CSS 4 / Svelte 5 project initialized with shadcn-svelte.
After this branch is released to the site:

```sh
npx shadcn-svelte@latest add https://deeplethe.github.io/solid-glass/r/svelte/ask-card.json
npx shadcn-svelte@latest add https://deeplethe.github.io/solid-glass/r/svelte/dot-loader.json
```

Each item installs the shared `src/solid-glass.css` too. Import it **after** the
Tailwind and shadcn-svelte styles in the application's global stylesheet (adjust
the relative path to that file):

```css
@import "./solid-glass.css";
```

Remove or move any competing `:root` / `.dark` color definitions before that
import, so they do not override the material. Toggle `.dark` on `html` for dark
mode. The theme falls back to system fonts if Geist is not installed. Do not
copy the React-only `shadcn/tailwind.css` import from the shared CSS's comment.

```svelte
<script lang="ts">
  import AskCard from "$lib/components/ui/ask-card/ask-card.svelte"
  let chosen = $state<string>()
</script>

<AskCard
  question="Which route?"
  options={["First", "Second"]}
  {chosen}
  onAnswer={chosen === undefined ? (value) => { chosen = value } : undefined}
/>
```

`class` replaces React's `className`. AskCard retains the existing `onAnswer`
callback contract: omit it for an answered card, and pass `chosen` to identify
the answer. The answer buttons remain focusable but inert. DotLoader retains
`dotClassName`; supply an accessible status label in its surrounding context.
`examples/decision.svelte` is a copyable interactive example.

## Architecture and scope

- `src/solid-glass.css` remains the sole material source. The Svelte builder
  embeds it verbatim; no duplicated tokens or versioned npm package is needed.
- `registry/svelte/` owns native `.svelte` source. Never install TSX via the
  Svelte CLI. Future interactive ports should use Bits UI / shadcn-svelte
  primitives, not a React runtime wrapper.
- `public/r/svelte/` is an additive URL namespace, generated after the existing
  React build (which clears `public/r`). `SOLID_GLASS_ORIGIN` configures dependency
  URLs for a preview server. URLs are not published until the site is released.
- This first slice covers **AskCard and DotLoader only**. It does not promise
  parity for stock shadcn-svelte components: shared data-slot names are not
  enough. The current stylesheet also relies on Base UI state attributes,
  DOM structure and Tailwind class names; Bits UI checked/open/active states,
  progress tracks, focus, disabled and portal behavior need dedicated audits.
- No root workspace migration or published npm packages are necessary for a
  source registry. Extract a shared package only when a second consumer needs
  an independently versioned build or runtime API.

## Development

```sh
npm run docs
npm run test:svelte-registry
npm run typecheck
npm run build
```

These checks preserve the React build and test registry generation. They do not
compile Svelte: before expanding this proof of concept, install the built URLs
into a clean shadcn-svelte consumer, run its Svelte check/build, and examine both
themes and keyboard interaction. Keep that consumer's dependencies separate
from the React site. A production port also needs continuous browser coverage.
