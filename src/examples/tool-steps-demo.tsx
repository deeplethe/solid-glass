"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { StepGroup, type Step } from "@/components/ui/tool-steps"

const PATCH = `@@ -12,7 +12,9 @@
 def fetch(url):
-    return requests.get(url)
+    response = requests.get(url, timeout=30)
+    response.raise_for_status()
+    return response
`

const steps: Step[] = [
  { id: "search", label: "Searched for “training on CPFS, official docs”", status: "done", detail: "training on CPFS, official docs", detailLabel: "Query", output: "8 results" },
  { id: "fetch", label: "Read github.com/acme-research", status: "done", detail: "https://github.com/acme-research", error: "HTTP 404 Not Found" },
  { id: "edit", label: "Edited research.py", status: "done", patch: PATCH },
  { id: "run", label: "Ran python research.py", status: "done", detail: "python research.py", detailLabel: "Command", output: "3 sources checked\n1 address returned 404" },
]

export default function ToolStepsDemo() {
  const [status, setStatus] = React.useState<Step["status"]>("running")
  // A second call joining the first: the one line becomes a group round it.
  const [joined, setJoined] = React.useState(false)
  const timer = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const finish = (next: "done" | "error") => {
    window.clearTimeout(timer.current)
    setStatus("running")
    setJoined(false)
    timer.current = window.setTimeout(() => setStatus(next), 2000)
  }
  const join = () => {
    window.clearTimeout(timer.current)
    setJoined(false)
    timer.current = window.setTimeout(() => setJoined(true), 2000)
  }
  const single: Step = {
    id: "single-run",
    label: status === "running" ? "Running python research.py" : "Ran python research.py",
    status,
    detail: "python research.py",
    detailLabel: "Command",
    output: status === "running" ? "Checking sources…" : "3 sources checked",
    error: status === "error" ? "One source could not be reached" : undefined,
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <StepGroup steps={steps} />
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">Schedule a result, then open the call while it runs.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => finish("done")}>Finish after 2s</Button>
          <Button variant="outline" size="sm" onClick={() => finish("error")}>Fail after 2s</Button>
          <Button variant="outline" size="sm" onClick={join}>Second call after 2s</Button>
        </div>
        <StepGroup
          steps={
            joined
              ? [single, { id: "second-run", label: "Running pytest", status: "running", detail: "pytest -q", detailLabel: "Command" }]
              : [single]
          }
        />
      </div>
    </div>
  )
}
