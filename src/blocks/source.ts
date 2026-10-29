export type BlockSource = {
  files: { path: string; source: string }[];
  /** Said beside the code, where what is shown is not quite what the command installs. */
  note?: string;
};

const sources = import.meta.glob<string>(
  ["/src/blocks/**/*.tsx", "/src/blocks/**/*.json"],
  { query: "?raw", import: "default" },
);
const cache = new Map<string, Promise<BlockSource>>();
const OVERVIEW = "@/blocks/shared/overview";
const FILLED =
  "From shadcn/ui the page comes with empty boxes where this one has <Overview />: a page of Solid Glass's own, shown with the block's files.";

/** The files a block is made of, fetched only when its Code panel opens. */
async function filesOf(name: string, own?: boolean): Promise<BlockSource> {
  if (own)
    return {
      files: [{
        path: `components/${name}.tsx`,
        source: await sources[`/src/blocks/${name}.tsx`](),
      }],
    };

  const prefix = `/src/blocks/${name}/`;
  const paths = Object.keys(sources)
    .filter((path) => path.startsWith(prefix))
    .sort(
      (a, b) =>
        Number(b === `${prefix}page.tsx`) - Number(a === `${prefix}page.tsx`) ||
        a.localeCompare(b),
    );
  const files = await Promise.all(paths.map(async (path) => ({
    path: path.slice(prefix.length),
    source: await sources[path](),
  })));
  // The page that fills a sidebar block's empty boxes is shared by them, and shown with each.
  const filled = files[0]?.source.includes(OVERVIEW);
  if (filled)
    files.push({
      path: "shared/overview.tsx",
      source: await sources["/src/blocks/shared/overview.tsx"](),
    });

  return {
    note: filled ? FILLED : undefined,
    // Previews use the site's block folders; copied files live at the paths shown here.
    files: files.map((file) => ({
      ...file,
      // Upstream preview metadata is not a supported Next App Router page export.
      source: (file.path === "page.tsx"
        ? file.source.replace(/^export const (?:iframeHeight|description) = [^\n]*\n\n?/gm, "")
        : file.source)
        .replaceAll(`@/blocks/${name}/`, "@/")
        .replaceAll("@/blocks/shared/", "@/shared/"),
    })),
  };
}

export function loadBlockSource(name: string, own?: boolean): Promise<BlockSource> {
  const cached = cache.get(name);
  if (cached) return cached;
  const pending = filesOf(name, own).catch((error: unknown) => {
    // A failed request must not poison the next attempt.
    cache.delete(name);
    throw error;
  });
  cache.set(name, pending);
  return pending;
}
