export type HomeSlideMediaType = "image" | "video";

export interface HomeHeroStat {
  id: string;
  number: number;
  suffix: string;
  label: string;
}

export interface HomeHeroSlide {
  id: string;
  mediaType: HomeSlideMediaType;
  mediaUrl: string;
  posterUrl?: string;
  headline: string;
  description: string;
  active: boolean;
}

export interface HomeSlideshowCmsPayload {
  slideshowSpeedMs: number;
  showStats: boolean;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  secondaryButtonPath: string;
  stats: HomeHeroStat[];
  slides: HomeHeroSlide[];
}

export const MIN_HOME_SLIDESHOW_SPEED_MS = 2000;
export const MAX_HOME_SLIDESHOW_SPEED_MS = 25000;
export const DEFAULT_HOME_SLIDESHOW_SPEED_MS = 8000;

export const DEFAULT_HOME_HEADLINE =
  "Precision Crafted Aluminium & Metal Solutions";
export const DEFAULT_HOME_DESCRIPTION =
  "Delivering high quality aluminium and metal fabrication for doors, windows, partitions, and custom designs. Our work combines durability, style, and precision engineering to bring your architectural vision to life built to last for decades.";

export const DEFAULT_HOME_HERO_STATS: HomeHeroStat[] = [
  { id: "stat-exp", number: 20, suffix: "+", label: "years experience" },
  { id: "stat-proj", number: 40, suffix: "+", label: "Successful Projects" },
  { id: "stat-clients", number: 32, suffix: "+", label: "active Clients" },
];

export const HOME_MEDIA_PRESETS: Array<{
  label: string;
  mediaType: HomeSlideMediaType;
  url: string;
  posterUrl?: string;
}> = [
  {
    label: "Slider Photo 1 (Living Glazing)",
    mediaType: "image",
    url: "/assets/homeslider/image1.jpg",
  },
  {
    label: "Slider Photo 2 (Architectural Doors)",
    mediaType: "image",
    url: "/assets/homeslider/image2.png",
  },
  {
    label: "Slider Photo 3 (Slim Windows)",
    mediaType: "image",
    url: "/assets/homeslider/image3.png",
  },
  {
    label: "Slider Photo 4 (Modern Glass Facade)",
    mediaType: "image",
    url: "/assets/homeslider/image4.png",
  },
  {
    label: "Slider Photo 5 (Commercial Entrance)",
    mediaType: "image",
    url: "/assets/homeslider/image5.png",
  },
  {
    label: "Hero Showroom Showcase",
    mediaType: "image",
    url: "/assets/products/hero-showroom.jpg",
  },
  {
    label: "Villa Sliding Terrace",
    mediaType: "image",
    url: "/assets/about/terrace.jpg",
  },
  {
    label: "Showcase Walkthrough Video (MP4)",
    mediaType: "video",
    url: "/assets/homeslider/showcase-architectural.mp4",
    posterUrl: "/assets/homeslider/image1.jpg",
  },
];

export const DEFAULT_HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    id: "home-slide-1",
    mediaType: "image",
    mediaUrl: "/assets/homeslider/image1.jpg",
    posterUrl: "/assets/homeslider/image1.jpg",
    headline: DEFAULT_HOME_HEADLINE,
    description: DEFAULT_HOME_DESCRIPTION,
    active: true,
  },
  {
    id: "home-slide-2",
    mediaType: "image",
    mediaUrl: "/assets/homeslider/image2.png",
    posterUrl: "/assets/homeslider/image2.png",
    headline: "Engineered Sliding & Curtain Wall Systems",
    description:
      "Ultra-slim anodized aluminium profiles, storm-rated corner glass, and acoustic seals fabricated to exact architectural drawings.",
    active: true,
  },
  {
    id: "home-slide-3",
    mediaType: "image",
    mediaUrl: "/assets/homeslider/image3.png",
    posterUrl: "/assets/homeslider/image3.png",
    headline: "Coastal-Grade Finishes Built for Decades",
    description:
      "Marine-certified powder coatings, multi-point European locking hardware, and turnkey island-wide installation by certified engineers.",
    active: true,
  },
  {
    id: "home-slide-4",
    mediaType: "image",
    mediaUrl: "/assets/homeslider/image4.png",
    posterUrl: "/assets/homeslider/image4.png",
    headline: "Bespoke Interiors, Partitions & Louvers",
    description:
      "Acoustic tempered office suites, motorized sun-shading louvers, and architectural skylights tailored for residences and commercial towers.",
    active: true,
  },
  {
    id: "home-slide-5",
    mediaType: "image",
    mediaUrl: "/assets/homeslider/image5.png",
    posterUrl: "/assets/homeslider/image5.png",
    headline: "From CAD Shop Drawings to Site Handover",
    description:
      "End-to-end structural calculation, CNC extrusion machining, and weather-tested fitting delivered on schedule across Sri Lanka.",
    active: true,
  },
];

export const DEFAULT_HOME_SLIDESHOW_CMS: HomeSlideshowCmsPayload = {
  slideshowSpeedMs: DEFAULT_HOME_SLIDESHOW_SPEED_MS,
  showStats: true,
  primaryButtonLabel: "Contact Us",
  secondaryButtonLabel: "Explore Our Products",
  secondaryButtonPath: "/products",
  stats: DEFAULT_HOME_HERO_STATS,
  slides: DEFAULT_HOME_HERO_SLIDES,
};

const VIDEO_FILE_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(?:[?#].*)?$/i;

export function parseVideoEmbedUrl(url: string): string | null {
  const trimmed = (url || "").trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      const embedMatch = parsed.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,})/);
      const videoId = v || embedMatch?.[1];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1`;
      }
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1`;
      }
    }

    if (host.includes("vimeo.com")) {
      const match = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
      if (match?.[1]) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1&background=1`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function inferMediaTypeFromUrl(
  url: string,
  explicitType?: string
): HomeSlideMediaType {
  if (explicitType === "video") return "video";
  if (explicitType === "image") {
    // Still treat explicit video file extensions or data:video URLs accurately if needed
    const trimmedCheck = (url || "").trim().toLowerCase();
    if (trimmedCheck.startsWith("data:video/")) return "video";
    if (VIDEO_FILE_EXT_RE.test(trimmedCheck)) return "video";
    return "image";
  }

  const trimmed = (url || "").trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("data:video/")) return "video";
  if (VIDEO_FILE_EXT_RE.test(lower)) return "video";
  if (parseVideoEmbedUrl(trimmed)) return "video";
  return "image";
}

export function clampHomeSlideshowSpeedMs(
  rawMs: unknown,
  fallback = DEFAULT_HOME_SLIDESHOW_SPEED_MS
): number {
  const num = typeof rawMs === "number" ? rawMs : Number(rawMs);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(
    MAX_HOME_SLIDESHOW_SPEED_MS,
    Math.max(MIN_HOME_SLIDESHOW_SPEED_MS, Math.round(num))
  );
}

export function normalizeHomeHeroStats(
  rawStats?: Partial<HomeHeroStat>[] | null
): HomeHeroStat[] {
  if (!Array.isArray(rawStats) || rawStats.length === 0) {
    return DEFAULT_HOME_HERO_STATS;
  }

  const normalized = rawStats
    .slice(0, 4)
    .map((item, idx) => {
      const def = DEFAULT_HOME_HERO_STATS[idx % DEFAULT_HOME_HERO_STATS.length];
      const numVal = Number(item?.number);
      return {
        id: item?.id?.trim() || def.id || `stat-${idx + 1}`,
        number: Number.isFinite(numVal) && numVal >= 0 ? Math.round(numVal) : def.number,
        suffix: typeof item?.suffix === "string" ? item.suffix.slice(0, 4) : def.suffix,
        label: item?.label?.trim() || def.label,
      };
    });

  return normalized.length > 0 ? normalized : DEFAULT_HOME_HERO_STATS;
}

export function normalizeHomeHeroSlides(
  rawSlides?: Partial<HomeHeroSlide>[] | null
): HomeHeroSlide[] {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return DEFAULT_HOME_HERO_SLIDES;
  }

  const normalized = rawSlides
    .map((slide, idx) => {
      const def =
        DEFAULT_HOME_HERO_SLIDES[idx % DEFAULT_HOME_HERO_SLIDES.length];
      const mediaUrl = (slide?.mediaUrl || "").trim() || def.mediaUrl;
      const mediaType = inferMediaTypeFromUrl(mediaUrl, slide?.mediaType);
      const posterUrl =
        (slide?.posterUrl || "").trim() ||
        (mediaType === "image" ? mediaUrl : def.posterUrl || "/assets/homeslider/image1.jpg");
      return {
        id: slide?.id?.trim() || `home-slide-${idx + 1}`,
        mediaType,
        mediaUrl,
        posterUrl,
        headline: slide?.headline?.trim() || def.headline,
        description: slide?.description?.trim() || def.description,
        active: slide?.active !== false,
      };
    })
    .filter((slide) => Boolean(slide.mediaUrl));

  return normalized.length > 0 ? normalized : DEFAULT_HOME_HERO_SLIDES;
}

export function normalizeHomeSlideshowCms(
  raw?: Partial<HomeSlideshowCmsPayload> | null
): HomeSlideshowCmsPayload {
  return {
    slideshowSpeedMs: clampHomeSlideshowSpeedMs(
      raw?.slideshowSpeedMs,
      DEFAULT_HOME_SLIDESHOW_SPEED_MS
    ),
    showStats: raw?.showStats !== false,
    primaryButtonLabel:
      raw?.primaryButtonLabel?.trim() ||
      DEFAULT_HOME_SLIDESHOW_CMS.primaryButtonLabel,
    secondaryButtonLabel:
      raw?.secondaryButtonLabel?.trim() ||
      DEFAULT_HOME_SLIDESHOW_CMS.secondaryButtonLabel,
    secondaryButtonPath:
      raw?.secondaryButtonPath?.trim() ||
      DEFAULT_HOME_SLIDESHOW_CMS.secondaryButtonPath,
    stats: normalizeHomeHeroStats(raw?.stats),
    slides: normalizeHomeHeroSlides(raw?.slides),
  };
}

export function upsertHomeSlide(
  slides: HomeHeroSlide[],
  draft: {
    mediaUrl: string;
    mediaType?: HomeSlideMediaType;
    posterUrl?: string;
    headline?: string;
    description?: string;
    active?: boolean;
  },
  editingId?: string | null
): HomeHeroSlide[] {
  const cleanUrl = (draft.mediaUrl || "").trim();
  if (!cleanUrl) return slides;

  const resolvedType = inferMediaTypeFromUrl(cleanUrl, draft.mediaType);
  const nextSlide: HomeHeroSlide = {
    id: editingId?.trim() || `home-slide-${Date.now()}`,
    mediaType: resolvedType,
    mediaUrl: cleanUrl,
    posterUrl:
      (draft.posterUrl || "").trim() ||
      (resolvedType === "image" ? cleanUrl : "/assets/homeslider/image1.jpg"),
    headline: (draft.headline || "").trim() || DEFAULT_HOME_HEADLINE,
    description: (draft.description || "").trim() || DEFAULT_HOME_DESCRIPTION,
    active: draft.active !== false,
  };

  if (editingId && slides.some((s) => s.id === editingId)) {
    return slides.map((s) => (s.id === editingId ? nextSlide : s));
  }
  return [...slides, nextSlide];
}

export function deleteHomeSlide(
  slides: HomeHeroSlide[],
  slideId: string
): HomeHeroSlide[] {
  if (slides.length <= 1) {
    return slides;
  }
  const filtered = slides.filter((s) => s.id !== slideId);
  return filtered.length > 0 ? filtered : slides;
}

export function moveHomeSlide(
  slides: HomeHeroSlide[],
  index: number,
  direction: -1 | 1
): HomeHeroSlide[] {
  const target = index + direction;
  if (
    index < 0 ||
    index >= slides.length ||
    target < 0 ||
    target >= slides.length
  ) {
    return slides;
  }
  const copy = [...slides];
  const [picked] = copy.splice(index, 1);
  copy.splice(target, 0, picked);
  return copy;
}
