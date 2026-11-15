export const SITE_BRAND_NAME = "Innovista Fabriconix";
export const DEFAULT_SEO_TITLE =
  "Innovista Fabriconix – Architectural Aluminium & Glazing Systems";
export const DEFAULT_SEO_DESCRIPTION =
  "Architectural aluminium and steel fabrication showcase with admin portal, real-time management, and customizable Vision & Mission showcases.";
export const DEFAULT_OG_IMAGE = "/assets/products/hero-showroom.jpg";
export const DEFAULT_OG_IMAGE_ALT =
  "Innovista Fabriconix architectural aluminium doors, windows, and glazing showroom";

export interface PageMetadataInput {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface ResolvedSeoTags {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: "website" | "article" | "product";
  ogImage: string;
  ogImageAlt: string;
  robots: string;
  keywords?: string;
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

export function resolveRequestOrigin(params: {
  appUrl?: string;
  protocol?: string;
  host?: string;
}): string {
  const configured = (params.appUrl || "").trim().replace(/\/+$/, "");
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }
  const host = (params.host || "").trim();
  if (host) {
    const rawProto = (params.protocol || "https").split(",")[0].trim();
    const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "";
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

export function resolveOgImageUrl(
  origin: string,
  rawImage?: string | null,
  fallback = DEFAULT_OG_IMAGE
): string {
  const safeOrigin = (origin || "").replace(/\/+$/, "");
  const candidate = (rawImage || "").trim();
  const isShareable =
    candidate.length > 0 &&
    !/^(data:|blob:|javascript:)/i.test(candidate);
  const chosen = isShareable ? candidate : fallback;

  if (/^https?:\/\//i.test(chosen)) {
    return chosen;
  }
  const normalizedPath = chosen.startsWith("/") ? chosen : `/${chosen}`;
  return safeOrigin ? `${safeOrigin}${normalizedPath}` : normalizedPath;
}

export function buildOrganizationJsonLd(params: {
  name?: string;
  url?: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
  sameAs?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: params.name || SITE_BRAND_NAME,
    url: params.url || "https://www.innovistafabriconix.lk",
    telephone: params.phone,
    email: params.email,
    ...(params.logo ? { image: params.logo } : {}),
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

export interface DynamicRouteSeoSourceData {
  pathname: string;
  search?: string;
  origin: string;
  homeSlideImage?: string;
  productLandingImage?: string;
  designs?: Array<{
    DesignID: string | number;
    Design_Name: string;
    Design_Description?: string;
    Design_Category?: string;
    Design_Image?: string[];
  }>;
  categories?: Array<{
    slug: string;
    name: string;
    tagline?: string;
    coverImage?: string;
  }>;
  projects?: Array<{
    Project_Title?: string;
    Project_Images?: string[];
  }>;
  blogs?: Array<{
    id: string;
    title: string;
    excerpt?: string;
    coverImage?: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
  };
}

export function resolveDynamicRouteSeo(
  source: DynamicRouteSeoSourceData
): ResolvedSeoTags {
  const origin = (source.origin || "").replace(/\/+$/, "");
  const cleanPath =
    (source.pathname || "/").split("#")[0].split("?")[0] || "/";
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const lowerPath = normalizedPath.toLowerCase();
  const searchParams = new URLSearchParams(source.search || "");

  const finalize = (input: PageMetadataInput & { resolvedPath?: string }): ResolvedSeoTags => {
    const title = formatSeoTitle(input.title);
    const description = normalizeMetaDescription(input.description);
    const canonicalUrl = buildCanonicalUrl(
      origin,
      input.canonicalPath || input.resolvedPath || normalizedPath,
      normalizedPath
    );
    const ogImage = resolveOgImageUrl(origin, input.ogImage, DEFAULT_OG_IMAGE);
    const ogImageAlt = (input.ogImageAlt || title || DEFAULT_OG_IMAGE_ALT).trim();

    return {
      title,
      description,
      canonicalUrl,
      ogType: input.ogType || "website",
      ogImage,
      ogImageAlt,
      robots: input.noIndex ? "noindex, nofollow" : "index, follow",
      keywords: input.keywords,
      structuredData: input.structuredData,
    };
  };

  // Product detail route (/products/:id, /product/:id, /product-details/:id)
  const productMatch = lowerPath.match(
    /^\/(?:products|product|product-details)\/([^/]+)$/
  );
  if (productMatch && productMatch[1] !== "category") {
    const rawId = decodeURIComponent(productMatch[1]);
    const design = source.designs?.find(
      (d) => String(d.DesignID) === rawId
    );
    if (design) {
      const canonical = `/products/${design.DesignID}`;
      const productImg = design.Design_Image?.[0] || DEFAULT_OG_IMAGE;
      const absImg = resolveOgImageUrl(origin, productImg, DEFAULT_OG_IMAGE);
      const absUrl = buildCanonicalUrl(origin, canonical, canonical);
      return finalize({
        title: `${design.Design_Name} — ${design.Design_Category || "Architectural System"}`,
        description: design.Design_Description || DEFAULT_SEO_DESCRIPTION,
        canonicalPath: canonical,
        ogType: "product",
        ogImage: productImg,
        ogImageAlt: design.Design_Name,
        structuredData: buildProductJsonLd({
          name: design.Design_Name,
          description: design.Design_Description || DEFAULT_SEO_DESCRIPTION,
          image: absImg,
          category: design.Design_Category,
          url: absUrl,
        }),
      });
    }
  }

  // Product category landing (/products/category/:slug)
  const categoryMatch = lowerPath.match(/^\/products\/category\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const category = source.categories?.find(
      (c) => c.slug.toLowerCase() === slug.toLowerCase()
    );
    const catName =
      category?.name ||
      slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    return finalize({
      title: `${catName} — Aluminium & Glazing Systems`,
      description:
        category?.tagline ||
        `Explore ${catName} architectural aluminium and glazing systems engineered by Innovista Fabriconix.`,
      canonicalPath: `/products/category/${slug}`,
      ogImage: category?.coverImage || source.productLandingImage || DEFAULT_OG_IMAGE,
      ogImageAlt: `${catName} by ${SITE_BRAND_NAME}`,
    });
  }

  if (lowerPath === "/products") {
    return finalize({
      title: "Architectural Aluminium Products & Glazing Catalog",
      description:
        "Browse custom sliding doors, thermally broken casement windows, frameless shower enclosures, curtain walls, louvers, and acoustic partitions.",
      canonicalPath: "/products",
      ogImage: source.productLandingImage || DEFAULT_OG_IMAGE,
    });
  }

  if (lowerPath === "/about") {
    return finalize({
      title: "About Us — Engineering Heritage, Vision & Leadership",
      description:
        "Discover Innovista Fabriconix's architectural aluminium craftsmanship, leadership message, engineering team, milestones, and certified partners.",
      canonicalPath: "/about",
      ogImage: "/assets/about/facade.jpg",
    });
  }

  if (lowerPath === "/blogs") {
    const postId = searchParams.get("post");
    const post = postId
      ? source.blogs?.find((b) => String(b.id) === postId)
      : source.blogs?.[0];
    return finalize({
      title:
        post && postId
          ? post.title
          : "Architectural Journal, Essays & Facade Notes",
      description:
        post && postId && post.excerpt
          ? post.excerpt
          : "Read architectural aluminium facade engineering studies, thermal glazing insights, and fabrication notes from Innovista Fabriconix.",
      canonicalPath: post && postId ? `/blogs?post=${post.id}` : "/blogs",
      ogType: post && postId ? "article" : "website",
      ogImage: post?.coverImage || "/assets/about/pavilion.jpg",
    });
  }

  if (lowerPath === "/news") {
    return finalize({
      title: "Newsroom & Technical Dispatches",
      description:
        "Latest product launches, commercial curtain wall handovers, and ISO laboratory quality audits from Innovista Fabriconix.",
      canonicalPath: "/news",
      ogImage: "/assets/about/terrace.jpg",
    });
  }

  if (lowerPath === "/projects") {
    const projectImg =
      source.projects?.[0]?.Project_Images?.[0] || "/assets/about/pavilion.jpg";
    return finalize({
      title: "Architectural Projects Portfolio | Innovista Fabriconix",
      description:
        "Browse completed and ongoing luxury residential villas, commercial curtain walls, and corporate acoustic glazing commissions by Innovista Fabriconix.",
      canonicalPath: "/projects",
      ogImage: projectImg,
    });
  }

  if (lowerPath === "/resources") {
    return finalize({
      title: "Technical Resources, CAD Schedules & Hardware Portals",
      description:
        "Download architectural aluminium profile catalogues, CAD installation schedules, finish care guides, and European hardware compatibility matrices.",
      canonicalPath: "/resources",
      ogImage: "/assets/products/facade-detail.jpg",
    });
  }

  if (lowerPath === "/contact") {
    return finalize({
      title: "Contact Innovista Fabriconix – Colombo & Kandy Desks",
      description:
        "Reach Innovista Fabriconix sales, CAD engineering, and fabrication desks. Call, WhatsApp, or visit our Nawala, Kelaniya, and Kandy showrooms.",
      canonicalPath: "/contact",
      ogImage: "/assets/products/showroom.jpg",
      structuredData: source.contact
        ? buildOrganizationJsonLd({
            url: buildCanonicalUrl(origin, "/contact", "/contact"),
            phone: source.contact.phone || "+94 76 081 8098",
            email: source.contact.email || "innovistametal@gmail.com",
            address:
              source.contact.address || "No. 42, Nawala Road, Colombo 05",
            logo: resolveOgImageUrl(origin, "/assets/products/showroom.jpg"),
            sameAs: [
              source.contact.facebookUrl,
              source.contact.instagramUrl,
              source.contact.linkedinUrl,
            ].filter((v): v is string => Boolean(v)),
          })
        : undefined,
    });
  }

  if (lowerPath === "/milestones") {
    return finalize({
      title: "Our Milestones & Engineering Timeline",
      description:
        "Explore Innovista Fabriconix's growth since 2015 across landmark commercial curtain wall projects, CNC fabrication, and ISO certification.",
      canonicalPath: "/milestones",
      ogImage: "/assets/about/terrace.jpg",
    });
  }

  if (lowerPath === "/request-quote") {
    return finalize({
      title: "Request a Project Quotation (RFQ)",
      description:
        "Submit project drawings, opening dimensions, glazing specifications, and site visit dates for a custom aluminium fabrication quote.",
      canonicalPath: "/request-quote",
      ogImage: "/assets/products/window.jpg",
    });
  }

  if (
    lowerPath.startsWith("/admin") ||
    lowerPath.startsWith("/profile") ||
    lowerPath === "/ordercart"
  ) {
    return finalize({
      title: `${SITE_BRAND_NAME} Portal`,
      description: DEFAULT_SEO_DESCRIPTION,
      canonicalPath: normalizedPath,
      noIndex: true,
    });
  }

  // Default Home ("/")
  const homeUrl = buildCanonicalUrl(origin, "/", "/");
  const homeOgImage = source.homeSlideImage || DEFAULT_OG_IMAGE;
  return finalize({
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    canonicalPath: "/",
    ogImage: homeOgImage,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    structuredData: source.contact
      ? buildOrganizationJsonLd({
          url: homeUrl,
          phone: source.contact.phone || "+94 76 081 8098",
          email: source.contact.email || "innovistametal@gmail.com",
          address:
            source.contact.address || "No. 42, Nawala Road, Colombo 05",
          logo: resolveOgImageUrl(origin, homeOgImage),
          sameAs: [
            source.contact.facebookUrl,
            source.contact.instagramUrl,
            source.contact.linkedinUrl,
          ].filter((v): v is string => Boolean(v)),
        })
      : undefined,
  });
}

export function escapeHtmlAttribute(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsonForScriptTag(json: string): string {
  return json.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\u003C!--");
}

function replaceOrAppendHeadTag(
  html: string,
  pattern: RegExp,
  replacementTag: string
): string {
  if (pattern.test(html)) {
    return html.replace(pattern, replacementTag);
  }
  return html.replace("</head>", `    ${replacementTag}\n  </head>`);
}

export function injectSeoIntoHtml(html: string, seo: ResolvedSeoTags): string {
  let out = html;
  const t = escapeHtmlAttribute(seo.title);
  const d = escapeHtmlAttribute(seo.description);
  const c = escapeHtmlAttribute(seo.canonicalUrl);
  const img = escapeHtmlAttribute(seo.ogImage);
  const imgAlt = escapeHtmlAttribute(seo.ogImageAlt);
  const robots = escapeHtmlAttribute(seo.robots);
  const ogType = escapeHtmlAttribute(seo.ogType);

  out = replaceOrAppendHeadTag(
    out,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${t}</title>`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<link\b[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${c}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']description["'][^>]*>/i,
    `<meta name="description" content="${d}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${robots}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${ogType}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:site_name["'][^>]*>/i,
    `<meta property="og:site_name" content="${escapeHtmlAttribute(SITE_BRAND_NAME)}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${t}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${d}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${c}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${img}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*property=["']og:image:alt["'][^>]*>/i,
    `<meta property="og:image:alt" content="${imgAlt}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']twitter:card["'][^>]*>/i,
    `<meta name="twitter:card" content="summary_large_image" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${t}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${d}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${img}" />`
  );
  out = replaceOrAppendHeadTag(
    out,
    /<meta\b[^>]*name=["']twitter:image:alt["'][^>]*>/i,
    `<meta name="twitter:image:alt" content="${imgAlt}" />`
  );

  if (seo.structuredData) {
    const scriptTag = `<script type="application/ld+json" data-page-seo="true">${escapeJsonForScriptTag(
      JSON.stringify(seo.structuredData)
    )}</script>`;
    out = replaceOrAppendHeadTag(
      out,
      /<script\b[^>]*data-page-seo=["']true["'][^>]*>[\s\S]*?<\/script>/i,
      scriptTag
    );
  }

  return out;
}
