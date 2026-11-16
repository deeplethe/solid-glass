import { test, expect } from "@playwright/test"

for (const theme of ["light", "dark"]) {
  test(`${theme}: keyboard choice, focus preservation, reset and inert answers`, async ({ page }) => {
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto("/")
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme)
    const search = page.getByRole("button", { name: "Search", exact: true })
    // Assert emitted utilities, not just semantic attributes: Tailwind skips
    // gitignored registry output unless the fixture explicitly registers it.
    const card = page.locator('[data-slot="ask-card"]').first()
    await expect(card).toHaveCSS("padding-left", "14px")
    await expect(card).toHaveCSS("padding-top", "12px")
    expect(parseFloat(await card.evaluate(node => getComputedStyle(node).borderRadius))).toBeGreaterThan(0)
    await expect(card.locator("div").first()).toHaveCSS("gap", "6px")
    await expect(search).toHaveCSS("height", "28px")
    await expect(search).toHaveCSS("padding-left", "10px")
    const dots = page.getByRole("status").locator(".animate-dot-flash")
    for (const dot of await dots.all()) {
      await expect(dot).toHaveCSS("width", "3px")
      await expect(dot).toHaveCSS("height", "3px")
      await expect(dot).toHaveCSS("animation-name", "sg-dot-flash")
      expect(await dot.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)")
    }
    await page.keyboard.press("Tab")
    await expect(search).toBeFocused()
    await expect(search).toHaveCSS("outline-style", "solid")
    await expect(search).toHaveCSS("outline-width", "1px")
    await page.keyboard.press("Enter")
    await expect(search).toBeFocused()
    await expect(search).toHaveAttribute("aria-current", "true")
    await expect(search).toHaveAttribute("aria-disabled", "true")
    await expect(page.getByTestId("answers")).toHaveText("Answers: 1")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: "Summarize", exact: true })).toBeFocused()
    await page.keyboard.press("Space")
    await expect(page.getByTestId("answers")).toHaveText("Answers: 1")
    await page.getByRole("button", { name: "Reset", exact: true }).click()
    await page.getByRole("button", { name: "Summarize", exact: true }).click()
    await expect(page.getByTestId("answers")).toHaveText("Answers: 2")
    await expect(page.getByRole("button", { name: "Summarize", exact: true })).toHaveAttribute("aria-current", "true")
    await expect(page.getByRole("status")).toHaveText("Working")
    await expect(page.getByRole("button", { name: "Same", exact: true })).toHaveCount(2)
    await expect(page.locator('[data-slot="ask-card"]').filter({ hasText: "No options yet" }).getByRole("button")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Same", exact: true }).first()).toHaveAttribute("aria-disabled", "true")
    expect(errors).toEqual([])
    await page.screenshot({ path: `test-results/${theme}-desktop.png`, fullPage: true })
    await page.setViewportSize({ width: 320, height: 720 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/${theme}-mobile.png`, fullPage: true })
  })
}

test("material switches colors and loader honors reduced motion", async ({ page }) => {
  await page.goto("/")
  const main = page.locator("main")
  const light = await main.evaluate(node => getComputedStyle(node).backgroundColor)
  expect(light).not.toBe("rgba(0, 0, 0, 0)")
  await page.evaluate(() => document.documentElement.classList.add("dark"))
  const dark = await main.evaluate(node => getComputedStyle(node).backgroundColor)
  expect(dark).not.toBe(light)
  const dots = page.getByRole("status").locator(".animate-dot-flash")
  await expect(dots).toHaveCount(3)
  await expect(dots.first()).toHaveCSS("animation-name", "sg-dot-flash")
  await expect(dots.nth(1)).toHaveCSS("animation-delay", "0.16s")
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const dot of await dots.all()) {
    await expect(dot).toHaveCSS("animation-name", "none")
    await expect(dot).toHaveCSS("opacity", "1")
  }
})
