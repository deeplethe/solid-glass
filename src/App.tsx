import * as React from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { Toaster } from "@/components/ui/sonner"
import { Toaster as ToastToaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DevBanner } from "@/pages/dev-banner"
import { ComponentsIndex, DocErrorBoundary, DocLoading, DocsLayout } from "@/site/docs-layout"
import { SiteFooter } from "@/site/site-footer"
import { SiteHeader } from "@/site/site-header"

// The preview on the Create page is a few dozen cards and every icon by name: fetched when the page is.
const Create = React.lazy(() => import("@/pages/create"))
const Home = React.lazy(() => import("@/pages/home").then((page) => ({ default: page.Home })))
const DocPage = React.lazy(() => import("@/site/docs").then((page) => ({ default: page.DocPage })))
const DevExamples = import.meta.env.DEV
  ? React.lazy(() => import("@/pages/dev-examples").then((page) => ({ default: page.DevExamples })))
  : null
// Preview components and Code sources are fetched separately, when each is opened.
const Blocks = React.lazy(() => import("@/pages/blocks").then((page) => ({ default: page.Blocks })))
const BlockView = React.lazy(() => import("@/pages/block-view"))

const loading = (
  <div role="status" className="flex min-h-[50svh] flex-1 items-center justify-center text-sm text-muted-foreground">
    Loading…
  </div>
)

function DocRoute({ section }: { section: "docs" | "components" }) {
  const { pathname } = useLocation()
  return (
    <DocErrorBoundary resetKey={pathname} section={section}>
      <React.Suspense fallback={<DocLoading section={section} />}>
        <DocPage section={section} />
      </React.Suspense>
    </DocErrorBoundary>
  )
}

/** A new page starts at its top, unless the link was to a place on it. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  React.useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export function App() {
  const { pathname } = useLocation()
  // The README's banner is a picture of the material and nothing else: no header, no footer behind it.
  if (import.meta.env.DEV && pathname === "/dev/banner") return <DevBanner />
  // A block by itself, in a window of its own: no header, no footer round it.
  if (pathname.startsWith("/view/")) {
    return (
      <TooltipProvider>
        <Routes>
          <Route
            path="view/:name"
            element={
              <React.Suspense fallback={loading}>
                <BlockView />
              </React.Suspense>
            }
          />
        </Routes>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <ScrollToTop />
      <div data-slot="layout" className="group/layout relative z-10 flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex min-h-0 flex-1 flex-col">
          <Routes>
            <Route
              index
              element={
                <React.Suspense fallback={loading}>
                  <Home />
                </React.Suspense>
              }
            />
            <Route
              path="create"
              element={
                <React.Suspense fallback={null}>
                  <Create />
                </React.Suspense>
              }
            />
            <Route
              path="blocks"
              element={
                <React.Suspense fallback={null}>
                  <Blocks />
                </React.Suspense>
              }
            />
            <Route path="docs" element={<DocsLayout />}>
              <Route index element={<DocRoute section="docs" />} />
              <Route path="components" element={<ComponentsIndex />} />
              <Route path="components/:slug" element={<DocRoute section="components" />} />
              <Route path=":slug" element={<DocRoute section="docs" />} />
            </Route>
            {DevExamples && (
              <Route
                path="dev/examples"
                element={
                  <React.Suspense fallback={loading}>
                    <DevExamples />
                  </React.Suspense>
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {pathname !== "/create" && <SiteFooter />}
      </div>
      <Toaster />
      <ToastToaster />
    </TooltipProvider>
  )
}
