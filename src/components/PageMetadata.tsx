import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_BRAND_NAME,
  buildCanonicalUrl,
  formatSeoTitle,
  normalizeMetaDescription,
  resolveOgImageUrl,
  type PageMetadataInput,
} from "../utils/seoMetadataHelpers";

function upsertMetaTag(
  attrName: "name" | "property",
  attrValue: string,
  content: string
) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function PageMetadata({
  title,
  description,
  canonicalPath,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  keywords,
  noIndex = false,
  structuredData,
}: PageMetadataInput) {
  const location = useLocation();
  const formattedTitle = formatSeoTitle(title);
  const normalizedDescription = normalizeMetaDescription(description);
  const serializedSchema = structuredData ? JSON.stringify(structuredData) : "";
  const resolvedAlt = (ogImageAlt || formattedTitle || DEFAULT_OG_IMAGE_ALT).trim();

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = formattedTitle;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const currentPath =
      `${location.pathname || "/"}${location.search || ""}` || "/";
    const canonicalUrl = buildCanonicalUrl(origin, canonicalPath, currentPath);
    const resolvedImage = resolveOgImageUrl(origin, ogImage, DEFAULT_OG_IMAGE);

    upsertMetaTag("name", "description", normalizedDescription);
    upsertMetaTag(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow"
    );

    if (keywords && keywords.trim()) {
      upsertMetaTag("name", "keywords", keywords.trim());
    }

    // OpenGraph tags
    upsertMetaTag("property", "og:type", ogType);
    upsertMetaTag("property", "og:site_name", SITE_BRAND_NAME);
    upsertMetaTag("property", "og:title", formattedTitle);
    upsertMetaTag("property", "og:description", normalizedDescription);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("property", "og:image", resolvedImage);
    upsertMetaTag("property", "og:image:alt", resolvedAlt);

    // Twitter / X card tags
    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", formattedTitle);
    upsertMetaTag("name", "twitter:description", normalizedDescription);
    upsertMetaTag("name", "twitter:image", resolvedImage);
    upsertMetaTag("name", "twitter:image:alt", resolvedAlt);

    upsertLinkTag("canonical", canonicalUrl);

    // Dynamic JSON-LD structured data
    const existingScript = document.head.querySelector<HTMLScriptElement>(
      'script[data-page-seo="true"]'
    );
    if (serializedSchema) {
      const script = existingScript || document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-page-seo", "true");
      script.textContent = serializedSchema;
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [
    formattedTitle,
    normalizedDescription,
    canonicalPath,
    location.pathname,
    location.search,
    ogType,
    ogImage,
    resolvedAlt,
    keywords,
    noIndex,
    serializedSchema,
  ]);

  return null;
}
