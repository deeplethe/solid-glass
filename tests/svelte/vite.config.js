import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: { alias: { $lib: fileURLToPath(new URL("./src/lib", import.meta.url)) } },
})
