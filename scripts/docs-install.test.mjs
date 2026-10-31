import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
execFileSync(process.execPath, [fileURLToPath(new URL("./build-docs.mjs", import.meta.url))])

const step = (text) => ({ type: "step", text })
const code = (code, lang = "bash", title) => ({ type: "code", lang, ...(title ? { title } : {}), code })
const source = (name) => ({ type: "source", name, title: `components/ui/${name}.tsx` })
const copy = step("Copy and paste the following code into your project.")
const imports = step("Update the import paths to match your project setup.")
function installation(name, section = "components") {
  const { blocks } = JSON.parse(readFileSync(new URL(`../src/docs/pages/${section}/${name}.json`, import.meta.url), "utf8"))
  const block = blocks.find((block) => block.type === "install")
  assert(Array.isArray(block.cli), "Command must preserve an ordered list of installation blocks")
  assert(Array.isArray(block.manual), "Manual must preserve its own ordered list of installation blocks")
  const flatten = (blocks) => blocks.flatMap((item) => item.type === "steps" ? flatten(item.blocks) : [item])
  return { cli: flatten(block.cli), manual: flatten(block.manual) }
}

for (const name of ["attachment", "calendar", "button"]) {
  test(`${name} preserves command and manual instructions in their original order`, () => {
    const block = installation(name)
    assert.deepEqual(block.cli, [code(`npx shadcn@latest add ${name}`)])
    const dependencies = {
      attachment: [
        step("Install the required shadcn/ui dependencies:"),
        code("npx shadcn@latest add button"),
      ],
      calendar: [
        step("Install the following dependencies:"),
        code("npm install react-day-picker date-fns"),
        step("Add the `Button` component to your project."),
        { type: "md", text: "The `Calendar` component uses the `Button` component. Make sure you have it installed in your project." },
      ],
      button: [
        step("Install the following dependencies:"),
        code("npm install @base-ui/react"),
      ],
    }[name]
    assert.deepEqual(block.manual, [...dependencies, copy, source(name), imports])
  })
}

test("Toast preserves each tab's distinct layout code, language and filename", () => {
  const block = installation("toast")
  const layout = (children) => code(`import { Toaster } from "@/components/ui/toast"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        ${children}
        <Toaster />
      </body>
    </html>
  )
}`, "tsx", "app/layout.tsx")
  const mount = step("Add the Toaster component.")
  assert.deepEqual(block.cli, [step("Run the following command:"), code("npx shadcn@latest add toast"), mount, layout("<main>{children}</main>")])
  assert.deepEqual(block.manual, [step("Install the following dependency:"), code("npm install @base-ui/react"), copy, source("toast"), imports, mount, layout("{children}")])
})

test("compact Solid Glass installation keeps its existing manual fallback", () => {
  const block = installation("ask-card", "solid")
  assert.deepEqual(block.cli, [code("npx shadcn@latest add deeplethe/solid-glass/ask-card")])
  assert.deepEqual(block.manual, [copy, { type: "source", name: "ask-card" }, imports])
})
