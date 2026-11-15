import {
  DEFAULT_HERO_THEME,
  normalizeHeroTheme,
  type HeroThemeConfig,
} from "./heroThemeHelpers.ts";

export interface AboutThumbnail {
  id: string;
  title: string;
  caption?: string;
  image: string;
}

export interface HeroSlide {
  id: string;
  headline: string;
  subheadline: string;
  image: string;
}

export interface AboutSectionContent {
  badge: string;
  title: string;
  tagline: string;
  description?: string;
  mainImage: string;
  thumbnails: AboutThumbnail[];
}

export interface DirectorMessageContent {
  tagline: string;
  heading: string;
  quote: string;
  message: string;
  directorName: string;
  directorTitle: string;
  image: string;
}

export interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  specialty: string;
  image: string;
}

export interface JourneyMilestoneItem {
  id: string;
  year: string;
  title: string;
  summary: string;
}

export interface PartnerItem {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  scale?: number;
}

export interface ClientItem {
  id: string;
  name: string;
  sector: string;
  projectScope: string;
  logo: string;
  scale?: number;
}

export interface ClientFeedbackItem {
  id: string;
  clientName: string;
  role: string;
  company: string;
  project: string;
  rating: number;
  comment: string;
  image: string;
}

export interface AboutCmsPayload {
  slideshowSpeedMs: number;
  journeySpeedMs: number;
  feedbackSpeedMs: number;
  partnersRibbonSpeed: number;
  clientsRibbonSpeed: number;
  heroSlides: HeroSlide[];
  vision: AboutSectionContent;
  mission: AboutSectionContent;
  directorMessage: DirectorMessageContent;
  teamMembers: TeamMemberItem[];
  journeyMilestones: JourneyMilestoneItem[];
  partners: PartnerItem[];
  clients: ClientItem[];
  clientFeedbacks: ClientFeedbackItem[];
  heroTheme?: HeroThemeConfig;
}

export const MIN_SLIDESHOW_SPEED_MS = 1500;
export const MAX_SLIDESHOW_SPEED_MS = 20000;
export const DEFAULT_SLIDESHOW_SPEED_MS = 5500;
export const DEFAULT_JOURNEY_SPEED_MS = 3800;
export const DEFAULT_FEEDBACK_SPEED_MS = 4500;

export const MIN_RIBBON_SPEED = 10;
export const MAX_RIBBON_SPEED = 240;
export const DEFAULT_PARTNERS_RIBBON_SPEED = 55;
export const DEFAULT_CLIENTS_RIBBON_SPEED = 65;

export const MIN_LOGO_SCALE = 0.65;
export const MAX_LOGO_SCALE = 1.65;
export const DEFAULT_LOGO_SCALE = 1.0;

export const RIBBON_SPEED_PRESETS = [
  { label: "Slow (25 px/s)", speed: 25 },
  { label: "Smooth (55 px/s)", speed: 55 },
  { label: "Brisk (95 px/s)", speed: 95 },
  { label: "Fast (150 px/s)", speed: 150 },
];

export const LOGO_SCALE_OPTIONS = [
  { label: "Compact (0.75x)", value: 0.75 },
  { label: "Balanced (1.0x)", value: 1.0 },
  { label: "Large (1.25x)", value: 1.25 },
  { label: "Featured (1.45x)", value: 1.45 },
];

export const ABOUT_PARTNER_LOGO_PRESETS = [
  { label: "AluProfile", url: "/assets/logos/partner-aluprofile.svg" },
  { label: "ClarityGlass", url: "/assets/logos/partner-clarityglass.svg" },
  { label: "NordicLock", url: "/assets/logos/partner-nordiclock.svg" },
  { label: "CoatTech", url: "/assets/logos/partner-coattech.svg" },
  { label: "ThermoSeal", url: "/assets/logos/partner-thermoseal.svg" },
  { label: "Vanguard", url: "/assets/logos/partner-vanguard.svg" },
];

export const ABOUT_CLIENT_LOGO_PRESETS = [
  { label: "Zenith", url: "/assets/logos/client-zenith.svg" },
  { label: "Apex Towers", url: "/assets/logos/client-apex.svg" },
  { label: "NovaTech", url: "/assets/logos/client-novatech.svg" },
  { label: "ArcVision", url: "/assets/logos/client-arcvision.svg" },
  { label: "Serendib", url: "/assets/logos/client-serendib.svg" },
  { label: "Harborline", url: "/assets/logos/client-harborline.svg" },
];

export const ABOUT_PRESET_IMAGES = [
  { label: "Coastal Villa", url: "/assets/reference/reference_villa_main.jpg" },
  { label: "Cantilever Sky", url: "/assets/reference/reference_mission_clean.jpg" },
  { label: "Corner Facade", url: "/assets/about/facade.jpg" },
  { label: "Terrace Glass", url: "/assets/about/terrace.jpg" },
  { label: "Pavilion Suite", url: "/assets/about/pavilion.jpg" },
  { label: "Director Portrait", url: "/assets/about/director.jpg" },
  { label: "Structural Lead", url: "/assets/about/team-structural.jpg" },
  { label: "Fabrication Head", url: "/assets/about/team-fabrication.jpg" },
  { label: "Lead Architect", url: "/assets/about/team-architect.jpg" },
];

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    headline: "Architectural Precision Starts Here",
    subheadline:
      "Experience engineered aluminium systems, structural glazing, and minimalist enclosures built for lasting spaces.",
    image: "/assets/reference/reference_mission_clean.jpg",
  },
  {
    id: "slide-2",
    headline: "Slim-Line Coastal Facades",
    subheadline:
      "Floor-to-ceiling anodized mullions and low-E corner glass fabricated for uninterrupted daylight and durability.",
    image: "/assets/about/facade.jpg",
  },
  {
    id: "slide-3",
    headline: "Frameless Terrace Balustrades",
    subheadline:
      "Concealed aluminium base channels and laminated safety glass engineered to elevate indoor-outdoor living.",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "slide-4",
    headline: "Pavilion Sliding Systems",
    subheadline:
      "Heavy-duty multi-track sliding enclosures combining acoustic quiet with expansive panoramic openings.",
    image: "/assets/about/pavilion.jpg",
  },
];

export const DEFAULT_ABOUT_SECTIONS: {
  vision: AboutSectionContent;
  mission: AboutSectionContent;
} = {
  vision: {
    badge: "OUR VISION",
    title: "Your Space, Your Legacy, Built Forever",
    tagline: "Precision Craftsmanship & Modern Architecture",
    description:
      "More than aluminium and glass fabrication, Innovista is a reflection of architectural clarity — thoughtfully engineered, cleanly detailed, and built to endure for generations.",
    mainImage: "/assets/reference/reference_villa_main.jpg",
    thumbnails: [
      {
        id: "v1",
        title: "Modern Villa Exterior",
        caption: "Cantilever Glazing",
        image: "/assets/reference/reference_villa_main.jpg",
      },
      {
        id: "v2",
        title: "Corner Glass Suites",
        caption: "Slim-Line Aluminium",
        image: "/assets/about/facade.jpg",
      },
    ],
  },
  mission: {
    badge: "OUR MISSION",
    title: "Experience Inspired Precision in Every Detail",
    tagline: "Architectural Aluminium & Glazing Systems",
    description:
      "Explore curated architectural systems where slim-line aluminium engineering, acoustic clarity, and modern proportion come together seamlessly.",
    mainImage: "/assets/reference/reference_mission_clean.jpg",
    thumbnails: [
      {
        id: "m1",
        title: "Structural Corner Glazing",
        caption: "Anodized Matte Aluminium",
        image: "/assets/about/facade.jpg",
      },
      {
        id: "m2",
        title: "Terrace Balustrades",
        caption: "Tempered Safety Glass",
        image: "/assets/about/terrace.jpg",
      },
    ],
  },
};

export const DEFAULT_DIRECTOR_MESSAGE: DirectorMessageContent = {
  tagline: "Leadership Perspective",
  heading: "Director's Message",
  quote:
    "Every joint, mullion, and glass span we fabricate carries our promise of quiet strength and architectural permanence.",
  message:
    "When we founded Innovista Metal Fabriconix, our ambition was straightforward: bring aerospace-grade dimensional discipline to architectural aluminium and structural glazing across Sri Lanka. Today, whether detailing a coastal villa or a multi-storey commercial curtain wall, our engineers work hand-in-hand with architects from CAD shop drawings to final site weather-testing.",
  directorName: "Rohan Wickramasinghe",
  directorTitle: "Managing Director, Innovista Metal Fabriconix",
  image: "/assets/about/director.jpg",
};

export const DEFAULT_TEAM_MEMBERS: TeamMemberItem[] = [
  {
    id: "team-1",
    name: "Anushka Senanayake",
    role: "Principal Structural Facade Engineer",
    specialty: "Curtain wall wind-load engineering and thermally broken glazing calculations.",
    image: "/assets/about/team-structural.jpg",
  },
  {
    id: "team-2",
    name: "Tharindu Fernando",
    role: "Head of CNC Fabrication",
    specialty: "High-tolerance extrusion machining, miter joints, and coastal anodizing QC.",
    image: "/assets/about/team-fabrication.jpg",
  },
  {
    id: "team-3",
    name: "Dilani Ratnayake",
    role: "Lead Architectural Detailer",
    specialty: "Slim-line sliding door profiles, corner glass junctions, and client bespoke suites.",
    image: "/assets/about/team-architect.jpg",
  },
];

export const DEFAULT_JOURNEY_MILESTONES: JourneyMilestoneItem[] = [
  {
    id: "journey-1",
    year: "2012",
    title: "Founding Workshop in Colombo",
    summary:
      "Established our dedicated aluminium fabrication facility serving bespoke residential commissions.",
  },
  {
    id: "journey-2",
    year: "2017",
    title: "CNC & Curtain Wall Expansion",
    summary:
      "Commissioned multi-axis CNC machining centers and launched unitized commercial facade engineering.",
  },
  {
    id: "journey-3",
    year: "2021",
    title: "Coastal Low-E & Acoustic Lab",
    summary:
      "Introduced marine-grade powder finishes and double-glazed acoustic partition systems.",
  },
  {
    id: "journey-4",
    year: "2025",
    title: "Island-Wide Architectural Benchmark",
    summary:
      "Delivered 40+ landmark residential and commercial envelopes with end-to-end CAD-to-site execution.",
  },
];

export const DEFAULT_PARTNERS: PartnerItem[] = [
  {
    id: "partner-1",
    name: "AluProfile Europe",
    category: "Extrusion Systems",
    description: "Thermal-break architectural aluminium profiles rated for coastal corrosion resistance.",
    logo: "/assets/logos/partner-aluprofile.svg",
    scale: 1.28,
  },
  {
    id: "partner-2",
    name: "ClarityGlass Tempered",
    category: "Low-E Structural Glass",
    description: "Solar-control double glazing and laminated hurricane-grade safety panels.",
    logo: "/assets/logos/partner-clarityglass.svg",
    scale: 0.82,
  },
  {
    id: "partner-3",
    name: "NordicLock Hardware",
    category: "Precision Fittings",
    description: "Concealed stainless rollers, multi-point locks, and acoustic perimeter seals.",
    logo: "/assets/logos/partner-nordiclock.svg",
    scale: 1.1,
  },
  {
    id: "partner-4",
    name: "CoatTech Anodizing",
    category: "Surface Engineering",
    description: "Qualicoat marine-certified architectural powder coating and matte finishes.",
    logo: "/assets/logos/partner-coattech.svg",
    scale: 1.42,
  },
  {
    id: "partner-5",
    name: "ThermoSeal Gaskets",
    category: "Acoustic Sealing",
    description: "Weather-tight EPDM perimeter glazing gaskets for multi-storey towers.",
    logo: "/assets/logos/partner-thermoseal.svg",
    scale: 0.9,
  },
  {
    id: "partner-6",
    name: "Vanguard Extrusions",
    category: "Architectural Alloys",
    description: "High-span structural aluminium mullions and recessed floor-track alloys.",
    logo: "/assets/logos/partner-vanguard.svg",
    scale: 1.18,
  },
];

export const DEFAULT_CLIENTS: ClientItem[] = [
  {
    id: "client-1",
    name: "Zenith Capital Residencies",
    sector: "Luxury Residential",
    projectScope: "Cantilever Sliding Glazing & Frameless Balustrades",
    logo: "/assets/logos/client-zenith.svg",
    scale: 1.15,
  },
  {
    id: "client-2",
    name: "Apex Skyline Towers",
    sector: "Commercial High-Rise",
    projectScope: "12-Storey Unitized Curtain Wall & Solar Louvers",
    logo: "/assets/logos/client-apex.svg",
    scale: 0.8,
  },
  {
    id: "client-3",
    name: "NovaTech Solutions",
    sector: "Corporate Workspace",
    projectScope: "Acoustic Double-Glazed Office Partitions & Pivot Doors",
    logo: "/assets/logos/client-novatech.svg",
    scale: 1.38,
  },
  {
    id: "client-4",
    name: "ArcVision Design Studio",
    sector: "Hospitality & Villas",
    projectScope: "Bi-Fold Pavilion Suites & Motorized Roof Skylights",
    logo: "/assets/logos/client-arcvision.svg",
    scale: 0.95,
  },
  {
    id: "client-5",
    name: "Serendib Coastal Resorts",
    sector: "Luxury Hospitality",
    projectScope: "Marine-Grade Oceanfront Sliding Suites",
    logo: "/assets/logos/client-serendib.svg",
    scale: 1.24,
  },
  {
    id: "client-6",
    name: "Harborline Estate Holdings",
    sector: "Mixed-Use Developments",
    projectScope: "Atrium Skylights & Architectural Shopfronts",
    logo: "/assets/logos/client-harborline.svg",
    scale: 0.88,
  },
];

export const DEFAULT_CLIENT_FEEDBACKS: ClientFeedbackItem[] = [
  {
    id: "fb-1",
    clientName: "Duminda Perera",
    role: "Managing Partner",
    company: "Zenith Capital Residencies",
    project: "Oceanview Villa Cantilever Facade",
    rating: 5,
    comment:
      "The floor-to-ceiling slimline glass doors transformed our coastal villa. Structural finish, weather sealing, and alignment are exemplary.",
    image: "/assets/reference/reference_villa_main.jpg",
  },
  {
    id: "fb-2",
    clientName: "Kavinda Jayasuriya",
    role: "Head of Workplace Infrastructure",
    company: "NovaTech Solutions",
    project: "Corporate HQ Acoustic Partitions",
    rating: 5,
    comment:
      "Acoustic isolation across meeting suites exceeded spec, and Innovista completed the entire site installation four days ahead of schedule.",
    image: "/assets/about/pavilion.jpg",
  },
  {
    id: "fb-3",
    clientName: "Sachithra Weerasinghe",
    role: "Principal Architect",
    company: "ArcVision Design Studio",
    project: "Kandy Hillside Pavilion Residence",
    rating: 5,
    comment:
      "Rarely do we find a fabricator who respects 22mm sightline tolerances from CAD shop drawing through final handover on site.",
    image: "/assets/about/terrace.jpg",
  },
];

const UNRELIABLE_HOSTS = [
  "images.unsplash.com",
  "picsum.photos",
  "placeholder.com",
  "via.placeholder.com",
  "randomuser.me",
];

/**
 * Ensures image URLs resolve cleanly to reliable local assets or approved URLs.
 */
export function sanitizeAboutImage(url: string | undefined, fallback: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (UNRELIABLE_HOSTS.some((host) => lower.includes(host))) {
    return fallback;
  }
  return trimmed;
}

/**
 * Clamps hero slideshow, roadmap, or feedback auto-advance interval safely between 1500ms and 20000ms.
 */
export function clampSlideshowSpeedMs(rawMs: unknown, fallback = DEFAULT_SLIDESHOW_SPEED_MS): number {
  const num = typeof rawMs === "number" ? rawMs : Number(rawMs);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.min(MAX_SLIDESHOW_SPEED_MS, Math.max(MIN_SLIDESHOW_SPEED_MS, Math.round(num)));
}

/**
 * Clamps continuous logo ribbon speed (px/s) between 10 and 240.
 */
export function clampRibbonSpeed(rawSpeed: unknown, fallback = DEFAULT_PARTNERS_RIBBON_SPEED): number {
  const num = typeof rawSpeed === "number" ? rawSpeed : Number(rawSpeed);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.min(MAX_RIBBON_SPEED, Math.max(MIN_RIBBON_SPEED, Math.round(num)));
}

/**
 * Clamps individual logo scale factor between 0.65x and 1.65x.
 */
export function clampLogoScale(rawScale: unknown, fallback = DEFAULT_LOGO_SCALE): number {
  const num = typeof rawScale === "number" ? rawScale : Number(rawScale);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.round(Math.min(MAX_LOGO_SCALE, Math.max(MIN_LOGO_SCALE, num)) * 100) / 100;
}

/**
 * Pure helper to reorder an array item up or down cleanly.
 */
export function moveArrayItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items;
  }
  const copy = [...items];
  const [picked] = copy.splice(index, 1);
  copy.splice(target, 0, picked);
  return copy;
}

export function moveArrayItemToIndex<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const copy = [...items];
  const [picked] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, picked);
  return copy;
}

/**
 * Normalizes hero slideshow slides from CMS payloads with guaranteed non-empty output.
 */
export function normalizeHeroSlides(
  rawSlides: Partial<HeroSlide>[] | null | undefined,
  defaults: HeroSlide[]
): HeroSlide[] {
  const safeDefaults =
    defaults.length > 0
      ? defaults
      : [
          {
            id: "slide-default",
            headline: "Architectural Precision Starts Here",
            subheadline:
              "Experience engineered aluminium systems, structural glazing, and minimalist enclosures built for lasting spaces.",
            image: "/assets/reference/reference_mission_clean.jpg",
          },
        ];

  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return safeDefaults;
  }

  const normalized = rawSlides
    .map((slide, idx) => {
      const fallbackSlide = safeDefaults[idx % safeDefaults.length];
      return {
        id: slide.id?.trim() || `slide-${idx + 1}`,
        headline: slide.headline?.trim() || fallbackSlide.headline,
        subheadline: slide.subheadline?.trim() || fallbackSlide.subheadline,
        image: sanitizeAboutImage(slide.image, fallbackSlide.image),
      };
    })
    .filter((slide) => Boolean(slide.image));

  return normalized.length > 0 ? normalized : safeDefaults;
}

export function getNextSlideIndex(current: number, total: number): number {
  if (total <= 1) return 0;
  return (current + 1) % total;
}

export function getPrevSlideIndex(current: number, total: number): number {
  if (total <= 1) return 0;
  return (current - 1 + total) % total;
}

export interface RoadmapPoint {
  x: number;
  y: number;
}

/**
 * Computes evenly spaced sinusoidal SVG coordinates along a 1000x185 roadmap canvas.
 */
export function computeRoadmapPoints(count: number): RoadmapPoint[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  if (count === 1) return [{ x: 500, y: 92 }];
  return Array.from({ length: count }).map((_, idx) => {
    const ratio = idx / (count - 1);
    const x = Math.round((90 + ratio * 820) * 100) / 100;
    const y = idx % 2 === 0 ? 116 : 62;
    return { x, y };
  });
}

/**
 * Generates a smooth SVG cubic Bezier path passing directly through every roadmap station coordinate.
 */
export function buildSmoothRoadPath(points: RoadmapPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M 140 ${points[0].y} L 860 ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = Math.round(((curr.x + next.x) / 2) * 100) / 100;
    d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

export function normalizeAboutCmsPayload(
  incoming: Partial<AboutCmsPayload> | null | undefined,
  defaults: AboutCmsPayload
): AboutCmsPayload {
  const normalizeSection = (
    rawSection: Partial<AboutSectionContent> | undefined,
    fallbackSection: AboutSectionContent
  ): AboutSectionContent => {
    const rawThumbs = Array.isArray(rawSection?.thumbnails) ? rawSection.thumbnails : [];
    const mergedThumbs = fallbackSection.thumbnails.map((defThumb, idx) => {
      const candidate = rawThumbs[idx];
      return {
        id: candidate?.id || defThumb.id,
        title: candidate?.title?.trim() || defThumb.title,
        caption: candidate?.caption?.trim() || defThumb.caption,
        image: sanitizeAboutImage(candidate?.image, defThumb.image),
      };
    });

    return {
      badge: rawSection?.badge?.trim() || fallbackSection.badge,
      title: rawSection?.title?.trim() || fallbackSection.title,
      tagline: rawSection?.tagline?.trim() || fallbackSection.tagline,
      description: rawSection?.description?.trim() || fallbackSection.description,
      mainImage: sanitizeAboutImage(rawSection?.mainImage, fallbackSection.mainImage),
      thumbnails: mergedThumbs,
    };
  };

  const rawDir = incoming?.directorMessage;
  const directorMessage: DirectorMessageContent = {
    tagline: rawDir?.tagline?.trim() || defaults.directorMessage.tagline,
    heading: rawDir?.heading?.trim() || defaults.directorMessage.heading,
    quote: rawDir?.quote?.trim() || defaults.directorMessage.quote,
    message: rawDir?.message?.trim() || defaults.directorMessage.message,
    directorName: rawDir?.directorName?.trim() || defaults.directorMessage.directorName,
    directorTitle: rawDir?.directorTitle?.trim() || defaults.directorMessage.directorTitle,
    image: sanitizeAboutImage(rawDir?.image, defaults.directorMessage.image),
  };

  const teamMembers =
    Array.isArray(incoming?.teamMembers) && incoming.teamMembers.length > 0
      ? incoming.teamMembers.map((member, idx) => {
          const fallback = defaults.teamMembers[idx % defaults.teamMembers.length];
          return {
            id: member.id?.trim() || `team-${idx + 1}`,
            name: member.name?.trim() || fallback.name,
            role: member.role?.trim() || fallback.role,
            specialty: member.specialty?.trim() || fallback.specialty,
            image: sanitizeAboutImage(member.image, fallback.image),
          };
        })
      : defaults.teamMembers;

  const journeyMilestones =
    Array.isArray(incoming?.journeyMilestones) && incoming.journeyMilestones.length > 0
      ? incoming.journeyMilestones.map((item, idx) => {
          const fallback = defaults.journeyMilestones[idx % defaults.journeyMilestones.length];
          return {
            id: item.id?.trim() || `journey-${idx + 1}`,
            year: item.year?.trim() || fallback.year,
            title: item.title?.trim() || fallback.title,
            summary: item.summary?.trim() || fallback.summary,
          };
        })
      : defaults.journeyMilestones;

  const partners =
    Array.isArray(incoming?.partners) && incoming.partners.length > 0
      ? incoming.partners.map((partner, idx) => {
          const fallback = defaults.partners[idx % defaults.partners.length];
          return {
            id: partner.id?.trim() || `partner-${idx + 1}`,
            name: partner.name?.trim() || fallback.name,
            category: partner.category?.trim() || fallback.category,
            description: partner.description?.trim() || fallback.description,
            logo: sanitizeAboutImage(partner.logo, fallback.logo),
            scale: clampLogoScale(partner.scale, fallback.scale ?? DEFAULT_LOGO_SCALE),
          };
        })
      : defaults.partners;

  const clients =
    Array.isArray(incoming?.clients) && incoming.clients.length > 0
      ? incoming.clients.map((client, idx) => {
          const fallback = defaults.clients[idx % defaults.clients.length];
          return {
            id: client.id?.trim() || `client-${idx + 1}`,
            name: client.name?.trim() || fallback.name,
            sector: client.sector?.trim() || fallback.sector,
            projectScope: client.projectScope?.trim() || fallback.projectScope,
            logo: sanitizeAboutImage(client.logo, fallback.logo),
            scale: clampLogoScale(client.scale, fallback.scale ?? DEFAULT_LOGO_SCALE),
          };
        })
      : defaults.clients;

  const clientFeedbacks =
    Array.isArray(incoming?.clientFeedbacks) && incoming.clientFeedbacks.length > 0
      ? incoming.clientFeedbacks.map((fb, idx) => {
          const fallback = defaults.clientFeedbacks[idx % defaults.clientFeedbacks.length];
          const safeRating =
            typeof fb.rating === "number" && fb.rating >= 1 && fb.rating <= 5
              ? Math.round(fb.rating)
              : fallback.rating;
          return {
            id: fb.id?.trim() || `fb-${idx + 1}`,
            clientName: fb.clientName?.trim() || fallback.clientName,
            role: fb.role?.trim() || fallback.role,
            company: fb.company?.trim() || fallback.company,
            project: fb.project?.trim() || fallback.project,
            rating: safeRating,
            comment: fb.comment?.trim() || fallback.comment,
            image: sanitizeAboutImage(fb.image, fallback.image),
          };
        })
      : defaults.clientFeedbacks;

  return {
    slideshowSpeedMs: clampSlideshowSpeedMs(
      incoming?.slideshowSpeedMs ?? defaults.slideshowSpeedMs,
      DEFAULT_SLIDESHOW_SPEED_MS
    ),
    journeySpeedMs: clampSlideshowSpeedMs(
      incoming?.journeySpeedMs ?? defaults.journeySpeedMs,
      DEFAULT_JOURNEY_SPEED_MS
    ),
    feedbackSpeedMs: clampSlideshowSpeedMs(
      incoming?.feedbackSpeedMs ?? defaults.feedbackSpeedMs,
      DEFAULT_FEEDBACK_SPEED_MS
    ),
    partnersRibbonSpeed: clampRibbonSpeed(
      incoming?.partnersRibbonSpeed ?? defaults.partnersRibbonSpeed,
      DEFAULT_PARTNERS_RIBBON_SPEED
    ),
    clientsRibbonSpeed: clampRibbonSpeed(
      incoming?.clientsRibbonSpeed ?? defaults.clientsRibbonSpeed,
      DEFAULT_CLIENTS_RIBBON_SPEED
    ),
    heroSlides: normalizeHeroSlides(incoming?.heroSlides, defaults.heroSlides),
    vision: normalizeSection(incoming?.vision, defaults.vision),
    mission: normalizeSection(incoming?.mission, defaults.mission),
    directorMessage,
    teamMembers,
    journeyMilestones,
    partners,
    clients,
    clientFeedbacks,
    heroTheme: normalizeHeroTheme(
      incoming?.heroTheme,
      defaults.heroTheme || DEFAULT_HERO_THEME
    ),
  };
}
