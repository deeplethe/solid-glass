import * as React from "react"

export function useMediaQuery(query: string) {
  // Match the first client render to the viewport instead of waiting for the effect.
  const [value, setValue] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)

  React.useEffect(() => {
    const result = matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setValue(event.matches)
    result.addEventListener("change", onChange)
    setValue(result.matches)
    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
}
