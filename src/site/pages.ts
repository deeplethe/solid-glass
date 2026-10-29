import catalog from "@/docs/catalog.json"

export type Block =
  | { type: "md"; text: string }
  | { type: "heading"; depth: number; text: string; id: string }
  | { type: "code"; lang: string; title?: string; code: string }
  | { type: "preview"; name: string; align?: string; className?: string; wrapperClassName?: string; hideCode?: boolean }
  | { type: "install"; cli: Block[]; manual: Block[] }
  | { type: "steps"; blocks: Block[] }
  | { type: "source"; name?: string; title?: string }
  | { type: "widget"; name?: string }
  | { type: "callout"; text: string }
  | { type: "step"; text: string }

export type PageEntry = {
  slug: string
  /** docs: the pages about Solid Glass itself. solid: its own components. components: shadcn/ui's. */
  section: "docs" | "solid" | "components"
  /** "agents" on those of Solid Glass's own that are for one kind of product; the rest are general. */
  group?: string
  title: string
  description: string
  order: number
}

export type Page = PageEntry & {
  blocks: Block[]
}

export const pages = catalog as PageEntry[]
export const docs = pages.filter((page) => page.section === "docs")
/** For interfaces where an agent works: listed apart, after the general components. */
export const agents = pages.filter((page) => page.section === "solid" && page.group === "agents")
/** Every general-purpose component: shadcn/ui's, and Solid Glass's own that any product could use. */
export const components = pages
  .filter((page) => page.section === "components" || (page.section === "solid" && page.group !== "agents"))
  .sort((a, b) => a.title.localeCompare(b.title))

export const urlOf = (page: PageEntry) =>
  page.section === "docs" ? (page.slug === "introduction" ? "/docs" : `/docs/${page.slug}`) : `/docs/components/${page.slug}`

/** In the order the sidebar lists them, with the list of all components between the docs and the components. */
export const ordered: { title: string; url: string }[] = [
  ...docs.map((page) => ({ title: page.title, url: urlOf(page) })),
  { title: "Components", url: "/docs/components" },
  ...components.map((page) => ({ title: page.title, url: urlOf(page) })),
  ...agents.map((page) => ({ title: page.title, url: urlOf(page) })),
]

/**
 * Where a link written for ui.shadcn.com goes here: a component's page is this site's, and any
 * other page of theirs stays theirs.
 */
export function resolveHref(href: string): { to?: string; href?: string } {
  if (href.startsWith("#")) return { to: href }
  if (/^[a-z]+:/i.test(href)) return { href }
  const [path, hash = ""] = href.split("#")
  const component = path.match(/^\/docs\/components\/(?:base\/|radix\/)?([a-z0-9-]+)\/?$/)?.[1]
  const tail = hash ? `#${hash}` : ""
  if (component && pages.some((page) => page.section !== "docs" && page.slug === component)) return { to: `/docs/components/${component}${tail}` }
  if (ordered.some((entry) => entry.url === path)) return { to: path + tail }
  return { href: `https://ui.shadcn.com${href}` }
}
