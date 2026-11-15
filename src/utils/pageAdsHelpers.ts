import {
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  moveArrayItemToIndex,
  sanitizeAboutImage,
} from "./aboutContentHelpers.ts";

export type AdPageKey =
  | "home"
  | "products"
  | "category"
  | "product-details"
  | "projects"
  | "blogs"
  | "news";

export interface PageAdButton {
  id: string;
  label: string;
  url: string;
}

export interface PageAdSlide {
  id: string;
  image: string;
  title: string;
  linkUrl?: string;
  paused?: boolean;
  buttons?: PageAdButton[];
}

export interface PageAdsConfig {
  pageKey: AdPageKey;
  label: string;
  routeHint: string;
  enabled: boolean;
  slideshowSpeedMs: number;
  ads: PageAdSlide[];
}

export interface PageAdsCmsPayload {
  pages: Record<AdPageKey, PageAdsConfig>;
}

export const DEFAULT_AD_SLIDESHOW_SPEED_MS = 4000;

export const AD_SPEED_PRESETS = [
  { label: "Fast (2s)", ms: 2000 },
  { label: "Brisk (3s)", ms: 3000 },
  { label: "Balanced (4s)", ms: 4000 },
  { label: "Smooth (6s)", ms: 6000 },
  { label: "Calm (8.5s)", ms: 8500 },
];

export const AD_ASSET_PRESETS: Array<{ label: string; url: string }> = [
  { label: "Showroom Feature", url: "/assets/products/hero-showroom.jpg" },
  { label: "Thermal Doors", url: "/assets/products/door.jpg" },
  { label: "Minimalist Windows", url: "/assets/products/window.jpg" },
  { label: "Curtain Facade", url: "/assets/products/facade-detail.jpg" },
  { label: "Architectural Skylight", url: "/assets/products/roof-skylight.jpg" },
  { label: "Commercial Shopfront", url: "/assets/products/shopfront.jpg" },
  { label: "Modern Louvers", url: "/assets/products/louvers.jpg" },
  { label: "Interior Partition", url: "/assets/products/partition.jpg" },
  { label: "Wardrobe & Pantry", url: "/assets/products/wardrobe-pantry.jpg" },
  { label: "Glass Pavilion", url: "/assets/about/pavilion.jpg" },
  { label: "Coastal Terrace", url: "/assets/about/terrace.jpg" },
];

export interface AdPageDefinition {
  pageKey: AdPageKey;
  label: string;
  routeHint: string;
  description: string;
}

export const AD_PAGE_DEFINITIONS: AdPageDefinition[] = [
  {
    pageKey: "home",
    label: "Home",
    routeHint: "/#/",
    description: "Promotion popup displayed when entering the Home page.",
  },
  {
    pageKey: "products",
    label: "Products Landing",
    routeHint: "/#/products",
    description: "Promotion popup displayed when entering the Product Categories cards page.",
  },
  {
    pageKey: "category",
    label: "Category Products",
    routeHint: "/#/products/category/:slug",
    description: "Promotion popup displayed when entering any category product cards page.",
  },
  {
    pageKey: "product-details",
    label: "Product Details",
    routeHint: "/#/products/:designId",
    description: "Promotion popup displayed on product specification pages.",
  },
  {
    pageKey: "projects",
    label: "Projects",
    routeHint: "/#/projects",
    description: "Promotion popup displayed when visiting the completed Projects cards page.",
  },
  {
    pageKey: "blogs",
    label: "Blogs",
    routeHint: "/#/blogs",
    description: "Promotion popup displayed when visiting the Knowledge Hub articles page.",
  },
  {
    pageKey: "news",
    label: "News",
    routeHint: "/#/news",
    description: "Promotion popup displayed when visiting the News & Press Releases page.",
  },
];

export const ALL_AD_PAGE_KEYS: AdPageKey[] = AD_PAGE_DEFINITIONS.map(
  (def) => def.pageKey
);

export function isValidAdPageKey(val: unknown): val is AdPageKey {
  return (
    typeof val === "string" &&
    (ALL_AD_PAGE_KEYS as string[]).includes(val)
  );
}

export function sanitizeAdLinkUrl(url?: string): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return "";
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#/") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  return "";
}

export function sanitizeAdImageUrl(url?: string, fallback?: string): string {
  return sanitizeAboutImage(url, fallback || "");
}

export function normalizePageAdButtons(
  input: unknown
): PageAdButton[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, idx) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Partial<PageAdButton>;
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const url = sanitizeAdLinkUrl(item.url);
      if (!label || !url) return null;
      const id =
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `ad-btn-${Date.now()}-${idx}`;
      return { id, label, url };
    })
    .filter((btn): btn is PageAdButton => btn !== null);
}

export const DEFAULT_PAGE_ADS_CMS: PageAdsCmsPayload = {
  pages: {
    home: {
      pageKey: "home",
      label: "Home",
      routeHint: "/#/",
      enabled: true,
      slideshowSpeedMs: 4500,
      ads: [
        {
          id: "ad-home-1",
          title: "Architectural Glazing Showcase 2026",
          image: "/assets/products/hero-showroom.jpg",
          linkUrl: "#/products",
          buttons: [
            { id: "btn-home-1a", label: "Explore Products", url: "#/products" },
            { id: "btn-home-1b", label: "Get Free Quote", url: "#/request-quote" },
          ],
        },
        {
          id: "ad-home-2",
          title: "Custom Fabrication Offer",
          image: "/assets/about/pavilion.jpg",
          linkUrl: "#/request-quote",
          buttons: [
            { id: "btn-home-2a", label: "Request Quote", url: "#/request-quote" },
          ],
        },
      ],
    },
    products: {
      pageKey: "products",
      label: "Products Landing",
      routeHint: "/#/products",
      enabled: true,
      slideshowSpeedMs: 4000,
      ads: [
        {
          id: "ad-products-1",
          title: "Thermal Break Door Collection",
          image: "/assets/products/door.jpg",
          linkUrl: "#/products/category/doors",
          buttons: [
            { id: "btn-prod-1a", label: "Shop Doors", url: "#/products/category/doors" },
            { id: "btn-prod-1b", label: "Get Quote", url: "#/request-quote" },
          ],
        },
        {
          id: "ad-products-2",
          title: "Minimalist Slimline Window Systems",
          image: "/assets/products/window.jpg",
          linkUrl: "#/products/category/windows",
          buttons: [
            { id: "btn-prod-2a", label: "Browse Windows", url: "#/products/category/windows" },
          ],
        },
        {
          id: "ad-products-3",
          title: "Engineered Curtain Wall Facades",
          image: "/assets/products/facade-detail.jpg",
          linkUrl: "#/products/category/facades-curtain-walls",
          buttons: [
            { id: "btn-prod-3a", label: "View Facades", url: "#/products/category/facades-curtain-walls" },
          ],
        },
      ],
    },
    category: {
      pageKey: "category",
      label: "Category Products",
      routeHint: "/#/products/category/:slug",
      enabled: true,
      slideshowSpeedMs: 4000,
      ads: [
        {
          id: "ad-category-1",
          title: "Site Measurement & CAD Engineering",
          image: "/assets/products/showroom.jpg",
          linkUrl: "#/request-quote",
          buttons: [
            { id: "btn-cat-1a", label: "Book Site Visit", url: "#/request-quote" },
          ],
        },
        {
          id: "ad-category-2",
          title: "Certified European Hardware Upgrades",
          image: "/assets/products/shopfront.jpg",
          linkUrl: "#/about",
          buttons: [
            { id: "btn-cat-2a", label: "Learn More", url: "#/about" },
          ],
        },
      ],
    },
    "product-details": {
      pageKey: "product-details",
      label: "Product Details",
      routeHint: "/#/products/:designId",
      enabled: true,
      slideshowSpeedMs: 4500,
      ads: [
        {
          id: "ad-details-1",
          title: "Architectural Roof Skylights",
          image: "/assets/products/roof-skylight.jpg",
          linkUrl: "#/products/category/skylights-canopies",
          buttons: [
            { id: "btn-det-1a", label: "View Skylights", url: "#/products/category/skylights-canopies" },
            { id: "btn-det-1b", label: "Request Quote", url: "#/request-quote" },
          ],
        },
        {
          id: "ad-details-2",
          title: "Acoustic Office Glass Partitions",
          image: "/assets/products/partition.jpg",
          linkUrl: "#/products/category/partitions-interiors",
          buttons: [
            { id: "btn-det-2a", label: "Explore Partitions", url: "#/products/category/partitions-interiors" },
          ],
        },
      ],
    },
    projects: {
      pageKey: "projects",
      label: "Projects",
      routeHint: "/#/projects",
      enabled: true,
      slideshowSpeedMs: 4500,
      ads: [
        {
          id: "ad-projects-1",
          title: "Partner With Our Engineering Team",
          image: "/assets/about/facade.jpg",
          linkUrl: "#/request-quote",
          buttons: [
            { id: "btn-prj-1a", label: "Start Your Project", url: "#/request-quote" },
          ],
        },
        {
          id: "ad-projects-2",
          title: "Solar Louvers & Sun Control Systems",
          image: "/assets/products/louvers.jpg",
          linkUrl: "#/products/category/louvers-sun-control",
          buttons: [
            { id: "btn-prj-2a", label: "View Louvers", url: "#/products/category/louvers-sun-control" },
          ],
        },
      ],
    },
    blogs: {
      pageKey: "blogs",
      label: "Blogs",
      routeHint: "/#/blogs",
      enabled: true,
      slideshowSpeedMs: 4500,
      ads: [
        {
          id: "ad-blogs-1",
          title: "Custom Wardrobe & Aluminium Pantry Systems",
          image: "/assets/products/wardrobe-pantry.jpg",
          linkUrl: "#/products/category/wardrobes-pantry",
          buttons: [
            { id: "btn-blg-1a", label: "View Wardrobes", url: "#/products/category/wardrobes-pantry" },
          ],
        },
        {
          id: "ad-blogs-2",
          title: "Coastal Weather-Rated Glazing Terraces",
          image: "/assets/about/terrace.jpg",
          linkUrl: "#/projects",
          buttons: [
            { id: "btn-blg-2a", label: "See Projects", url: "#/projects" },
          ],
        },
      ],
    },
    news: {
      pageKey: "news",
      label: "News",
      routeHint: "/#/news",
      enabled: true,
      slideshowSpeedMs: 4500,
      ads: [
        {
          id: "ad-news-1",
          title: "2026 Commercial Facade & Showroom Program",
          image: "/assets/products/showroom.jpg",
          linkUrl: "#/projects",
          buttons: [
            { id: "btn-news-1a", label: "Explore Projects", url: "#/projects" },
            { id: "btn-news-1b", label: "Contact Team", url: "#/contact" },
          ],
        },
        {
          id: "ad-news-2",
          title: "Precision Thermal Glazing Assemblies",
          image: "/assets/products/facade-detail.jpg",
          linkUrl: "#/products",
          buttons: [
            { id: "btn-news-2a", label: "Browse Systems", url: "#/products" },
          ],
        },
      ],
    },
  },
};

export function normalizePageAdSlide(
  input: Partial<PageAdSlide> | null | undefined,
  idx: number,
  fallbackImage = "/assets/products/hero-showroom.jpg"
): PageAdSlide | null {
  const image = sanitizeAdImageUrl(input?.image, "");
  const resolvedImage = image || (input?.image === "" ? "" : fallbackImage);
  if (!resolvedImage) return null;

  const title =
    typeof input?.title === "string" && input.title.trim()
      ? input.title.trim()
      : `Promotion ${idx + 1}`;
  const linkUrl = sanitizeAdLinkUrl(input?.linkUrl);
  const buttons = normalizePageAdButtons(input?.buttons);
  const paused = Boolean(input?.paused);
  const id =
    typeof input?.id === "string" && input.id.trim()
      ? input.id.trim()
      : `ad-${Date.now()}-${idx}`;

  return {
    id,
    image: resolvedImage,
    title,
    paused,
    ...(linkUrl ? { linkUrl } : {}),
    buttons,
  };
}

export function normalizeSinglePageAdsConfig(
  input: Partial<PageAdsConfig> | null | undefined,
  pageKey: AdPageKey,
  fallbackConfig?: PageAdsConfig
): PageAdsConfig {
  const def =
    AD_PAGE_DEFINITIONS.find((d) => d.pageKey === pageKey) ||
    AD_PAGE_DEFINITIONS[0];
  const base = fallbackConfig || DEFAULT_PAGE_ADS_CMS.pages[pageKey];

  const enabled =
    typeof input?.enabled === "boolean" ? input.enabled : base.enabled;
  const slideshowSpeedMs = clampSlideshowSpeedMs(
    input?.slideshowSpeedMs !== undefined
      ? input.slideshowSpeedMs
      : base.slideshowSpeedMs
  );

  let ads: PageAdSlide[];
  if (Array.isArray(input?.ads)) {
    ads = input.ads
      .map((item, idx) => normalizePageAdSlide(item, idx, ""))
      .filter((item): item is PageAdSlide => item !== null);
  } else {
    ads = base.ads.map((a) => ({
      ...a,
      paused: Boolean(a.paused),
      buttons: a.buttons ? a.buttons.map((b) => ({ ...b })) : [],
    }));
  }

  return {
    pageKey,
    label: def.label,
    routeHint: def.routeHint,
    enabled,
    slideshowSpeedMs,
    ads,
  };
}

export function normalizePageAdsCms(
  input: unknown,
  fallback: PageAdsCmsPayload = DEFAULT_PAGE_ADS_CMS
): PageAdsCmsPayload {
  const rawPages =
    input &&
    typeof input === "object" &&
    "pages" in input &&
    (input as { pages?: unknown }).pages &&
    typeof (input as { pages?: unknown }).pages === "object"
      ? (input as { pages: Record<string, Partial<PageAdsConfig>> }).pages
      : input && typeof input === "object"
      ? (input as Record<string, Partial<PageAdsConfig>>)
      : {};

  const nextPages = {} as Record<AdPageKey, PageAdsConfig>;
  for (const key of ALL_AD_PAGE_KEYS) {
    nextPages[key] = normalizeSinglePageAdsConfig(
      rawPages[key],
      key,
      fallback.pages[key]
    );
  }
  return { pages: nextPages };
}

export function getVisibleAdsForPage(
  config: PageAdsConfig | null | undefined
): PageAdSlide[] {
  if (!config || !config.enabled || !Array.isArray(config.ads)) {
    return [];
  }
  return config.ads.filter(
    (ad) =>
      !ad.paused && typeof ad.image === "string" && ad.image.trim().length > 0
  );
}

export function toggleAdSlidePaused(
  ads: PageAdSlide[],
  adId: string
): PageAdSlide[] {
  return ads.map((ad) =>
    ad.id === adId ? { ...ad, paused: !ad.paused } : ad
  );
}

export function countActiveAndPausedAds(ads: PageAdSlide[] | undefined): {
  activeCount: number;
  pausedCount: number;
} {
  if (!Array.isArray(ads) || ads.length === 0) {
    return { activeCount: 0, pausedCount: 0 };
  }
  let activeCount = 0;
  let pausedCount = 0;
  for (const ad of ads) {
    if (ad.paused) {
      pausedCount += 1;
    } else {
      activeCount += 1;
    }
  }
  return { activeCount, pausedCount };
}

export {
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  moveArrayItemToIndex,
};
