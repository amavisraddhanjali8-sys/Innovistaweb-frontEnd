export const SITE_BRAND_NAME = "Innovista Fabriconix";
export const DEFAULT_SEO_TITLE =
  "Innovista Fabriconix – Architectural Aluminium & Glazing Systems";
export const DEFAULT_SEO_DESCRIPTION =
  "Explore custom architectural aluminium doors, slim-line windows, curtain walls, and acoustic partitions engineered by Innovista Fabriconix in Sri Lanka.";
export const DEFAULT_OG_IMAGE = "/assets/products/hero-showroom.jpg";

export interface PageMetadataInput {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  keywords?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function formatSeoTitle(rawTitle?: string): string {
  const clean = (rawTitle || "").trim();
  if (!clean) return DEFAULT_SEO_TITLE;

  const lower = clean.toLowerCase();
  if (lower.includes("innovista")) {
    return clean;
  }

  return `${clean} | ${SITE_BRAND_NAME}`;
}

export function normalizeMetaDescription(rawDescription?: string): string {
  const clean = (rawDescription || "").replace(/\s+/g, " ").trim();
  if (!clean) return DEFAULT_SEO_DESCRIPTION;
  if (clean.length <= 165) return clean;
  return `${clean.slice(0, 162).trimEnd()}...`;
}

export function buildCanonicalUrl(
  origin: string,
  canonicalPath?: string,
  currentPathname = "/"
): string {
  const safeOrigin = (origin || "").replace(/\/+$/, "");
  const rawPath = (canonicalPath || currentPathname || "/").trim();
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  if (!safeOrigin) return normalizedPath;
  return `${safeOrigin}${normalizedPath}`;
}

export function buildOrganizationJsonLd(params: {
  name?: string;
  url?: string;
  phone: string;
  email: string;
  address: string;
  sameAs?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: params.name || SITE_BRAND_NAME,
    url: params.url || "https://www.innovistafabriconix.lk",
    telephone: params.phone,
    email: params.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: params.address,
      addressCountry: "LK",
    },
    ...(params.sameAs && params.sameAs.length > 0 ? { sameAs: params.sameAs } : {}),
  };
}

export function buildProductJsonLd(params: {
  name: string;
  description: string;
  image?: string;
  category?: string;
  url?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    description: normalizeMetaDescription(params.description),
    ...(params.image ? { image: params.image } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.url ? { url: params.url } : {}),
    brand: {
      "@type": "Brand",
      name: SITE_BRAND_NAME,
    },
  };
}
