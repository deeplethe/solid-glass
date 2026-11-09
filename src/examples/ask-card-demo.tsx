"use client"

import * as React from "react"

import { AskCard } from "@/components/ui/ask-card"

const QUESTION =
  "19 samples in the retail split time out in the solver at 30s. Raise the timeout to 120s and rerun, or leave them out and say so in the method?"

export default function AskCardDemo() {
  const [answer, setAnswer] = React.useState<string | null>(null)
  return (
    <div className="w-full max-w-md">
      {/* Once answered, onAnswer is left out: the choices stay as a record. */}
      <AskCard
        question={QUESTION}
        options={["Raise to 120s and rerun", "Leave out and say so"]}
        onAnswer={answer ? undefined : setAnswer}
        chosen={answer ?? undefined}
      />
      {answer && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Answered “{answer}”.{" "}
          <button type="button" onClick={() => setAnswer(null)} className="underline underline-offset-2 hover:text-foreground">
            Ask again
          </button>
        </p>
      )}
    </div>
  )
}
