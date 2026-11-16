import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4173", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: { command: "npm run preview -- --port 4173 --strictPort", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI },
})
