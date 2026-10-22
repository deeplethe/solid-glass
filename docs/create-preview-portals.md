# Create preview portal container: draft for discussion

Status: agree on the container hook's home before implementing the fix.

The Create preview carries its preset on `[data-create-preview]`. Dialog,
Alert Dialog, Select and Menu portals mount under `document.body`, outside
that element, and therefore use the site's font and material variables.

## Proposed direction

Keep the preview in the current document. Give it one stable portal host
inside the element that carries its preset, alongside the scrolling card
content. A provider surrounds only the preview subtree; its descendants
pass the host to Base UI's existing `Portal container` prop. The Customizer,
Get Code dialog, navigation and examples outside Create keep their current
portal target.

The host stays mounted when the preset, mode or selected view changes.
Nested overlays inherit the same context, so a Select inside a Dialog
continues to use the preview's variables. Base UI remains responsible for
positioning, modal behavior, focus management and dismissal.

## Decision requested: where should the hook live?

The proposed default is a small, generic, client-only context beside the UI
wrappers, provisionally `src/components/ui/portal-container.tsx`, exposing
`PortalContainerProvider` and `usePortalContainer`. It depends only on React
and has no imports from Create, the site, or the router. Create owns the DOM
host and supplies it; the UI layer only reads an optional container.

Dialog and Alert Dialog can read it in their existing portal wrappers.
Select and Dropdown Menu need it at the direct primitive portal calls in
their content components; changing only the exported `DropdownMenuPortal`
would miss `DropdownMenuContent`. Any explicit portal container supplied
by a caller should take precedence, including an explicit `null`.

Without a provider, the hook returns `undefined`, preserving Base UI's
default body target. A ref can be passed directly once the host is mounted;
opening and initially-open overlays need checking to avoid a first render
under body before the ref is available.

Is that shared context acceptable, or should the hook stay under
`src/create/` with Create-specific adapters? The latter keeps the stock UI
wrappers untouched but needs adapters for both preview views. Please also
confirm whether this first fix should cover only Dialog / Alert Dialog /
Select / Menu, or the other portal-based components shown by the wall.

The shared-context option introduces a dependency for wrappers copied into
another project. Its installation/distribution needs agreement before the
wrappers import it: a copied stock component must not acquire a missing
site-only import. This draft adds no registry item or manifest.

## Checks for the implementation after agreement

- In both themes, compare each open overlay's font, radius, primary,
  popover and blur variables with the preview, including nested overlays.
- Change preset and mode with an overlay open; preserve scroll, open state
  and focus. Exercise both preview views and the 390px layout.
- Check Enter / Space, Tab, Escape, focus return, outside dismissal and
  unmounting. Keep Base UI's existing modal and scroll-lock semantics.
- Verify stacking, clipping, backdrop bounds and position updates while
  scrolling. A custom portal target alone does not scope fixed positioning
  or modal effects to the preview's rectangle; agree on the intended bounds
  before adding CSS for them.
- Check overlays outside Create and independently copied/installed
  components, then run the example gallery, typecheck and production build.

The iframe, preview route and message handshake have been withdrawn from
this PR's final diff. This draft contains the proposal only; the portal
container fix is not implemented or ready to merge.
