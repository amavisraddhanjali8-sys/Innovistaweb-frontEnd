export type MobileDockKey = "home" | "products" | "quote" | "contact" | "profile";

export type DesktopNavKey =
  | "home"
  | "about"
  | "products"
  | "blogs"
  | "news"
  | "resources"
  | "projects"
  | "contact";

export interface ProductQuickCategory {
  label: string;
  description: string;
  to: string;
}

export const PRODUCT_QUICK_CATEGORIES: ProductQuickCategory[] = [
  {
    label: "All Architectural Systems",
    description: "Complete aluminium & glazing catalog",
    to: "/products",
  },
  {
    label: "Sliding & Casement Doors",
    description: "Heavy-duty thermal & patio doors",
    to: "/products/category/doors",
  },
  {
    label: "Architectural Windows",
    description: "Acoustic & storm-rated frames",
    to: "/products/category/windows",
  },
  {
    label: "Partitions & Facades",
    description: "Office glazing, shopfronts & louvers",
    to: "/products/category/partitions",
  },
  {
    label: "Skylights & Roofs",
    description: "Daylighting & structural canopies",
    to: "/products/category/skylights",
  },
];

/**
 * Resolves which bottom crimson dock tab is active on mobile viewports.
 */
export function resolveMobileDockActiveKey(pathname: string): MobileDockKey | null {
  const clean = (pathname || "/").toLowerCase();
  if (clean === "/") return "home";
  if (
    clean.startsWith("/products") ||
    clean.startsWith("/product") ||
    clean.startsWith("/designviwe")
  ) {
    return "products";
  }
  if (clean.startsWith("/request-quote") || clean.startsWith("/ordercart")) {
    return "quote";
  }
  if (clean.startsWith("/contact")) {
    return "contact";
  }
  if (clean.startsWith("/profile")) {
    return "profile";
  }
  return null;
}

/**
 * Resolves which top menu bar link is active on tablet/desktop viewports.
 */
export function resolveDesktopNavActiveKey(pathname: string): DesktopNavKey | null {
  const clean = (pathname || "/").toLowerCase();
  if (clean === "/") return "home";
  if (clean.startsWith("/about") || clean.startsWith("/milestones")) return "about";
  if (
    clean.startsWith("/products") ||
    clean.startsWith("/product") ||
    clean.startsWith("/designviwe")
  ) {
    return "products";
  }
  if (clean.startsWith("/blogs")) return "blogs";
  if (clean.startsWith("/news")) return "news";
  if (clean.startsWith("/resources")) return "resources";
  if (clean.startsWith("/projects")) return "projects";
  if (clean.startsWith("/contact")) return "contact";
  return null;
}
