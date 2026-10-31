import * as React from "react";
import type { BlockSource } from "./source";

/**
 * The blocks: whole screens made of the components. A block is shown on the Blocks page in a frame
 * of its own (`/view/<name>`), so it gets a real window to lay itself out in.
 *
 * Solid Glass's own are single files at the top of this folder, and are in its registry. The ones
 * in folders are shadcn/ui's, shown here in the material; they are installed from shadcn/ui, as its
 * components are.
 */
export type Block = {
  name: string;
  title: string;
  description: string;
  category: "Agents" | "Dashboard" | "Sidebar" | "Login";
  /** Shown first, under Featured. */
  featured?: boolean;
  /** Solid Glass's own, installed from its registry; otherwise shadcn/ui's, installed from there. */
  own?: boolean;
  /** How tall a window it is shown in. */
  height?: number;
  loadSource: () => Promise<BlockSource>;
  component: React.LazyExoticComponent<React.ComponentType>;
};

const pages = import.meta.glob<{ default: React.ComponentType }>([
  "/src/blocks/*.tsx",
  "/src/blocks/*/page.tsx",
]);

const block = (entry: Omit<Block, "loadSource" | "component">): Block => ({
  ...entry,
  loadSource: () => import("./source").then((module) => module.loadBlockSource(entry.name, entry.own)),
  component: React.lazy(
    pages[
      entry.own
        ? `/src/blocks/${entry.name}.tsx`
        : `/src/blocks/${entry.name}/page.tsx`
    ],
  ),
});

export const blocks: Block[] = [
  block({
    name: "agent-workspace",
    title: "Agent workspace",
    description:
      "A workspace where an agent works: sessions, the thread, files and background tasks",
    category: "Agents",
    featured: true,
    own: true,
  }),
  block({
    name: "dashboard-01",
    title: "Dashboard",
    description: "A dashboard with sidebar, charts and data table",
    category: "Dashboard",
    featured: true,
    height: 860,
  }),
  block({
    name: "sidebar-07",
    title: "Sidebar",
    description: "A sidebar that collapses to icons",
    category: "Sidebar",
    featured: true,
  }),
  block({
    name: "sidebar-03",
    title: "Sidebar",
    description: "A sidebar with submenus",
    category: "Sidebar",
  }),
  block({
    name: "sidebar-08",
    title: "Sidebar",
    description: "An inset sidebar with secondary navigation",
    category: "Sidebar",
  }),
  block({
    name: "sidebar-15",
    title: "Sidebar",
    description: "A left and right sidebar",
    category: "Sidebar",
  }),
  block({
    name: "sidebar-16",
    title: "Sidebar",
    description: "A sidebar with a sticky site header",
    category: "Sidebar",
  }),
  block({
    name: "login-04",
    title: "Login",
    description: "A login page with form and image",
    category: "Login",
    featured: true,
  }),
  block({
    name: "login-03",
    title: "Login",
    description: "A login page with a muted background color",
    category: "Login",
  }),
  block({
    name: "login-02",
    title: "Login",
    description: "A two column login page with a cover image",
    category: "Login",
  }),
  block({
    name: "login-05",
    title: "Login",
    description: "A simple email-only login page",
    category: "Login",
  }),
  block({
    name: "signup-03",
    title: "Signup",
    description: "A signup page with a muted background color",
    category: "Login",
  }),
  block({
    name: "signup-04",
    title: "Signup",
    description: "A signup page with form and image",
    category: "Login",
  }),
];
