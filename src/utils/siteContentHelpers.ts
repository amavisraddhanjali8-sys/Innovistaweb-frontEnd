import { isValidEmailAddress, isValidOptionalPhone } from "./quoteModalHelpers";

export type NewsCategory = "All" | "Launches" | "Projects" | "Standards";

export interface NewsArticleItem {
  id: string;
  title: string;
  category: Exclude<NewsCategory, "All">;
  date: string;
  summary: string;
  highlights: string[];
  image: string;
  ctaLabel: string;
  ctaTo: string;
}

export interface ResourceAttachmentItem {
  id: string;
  title: string;
  format: "SPEC" | "CAD" | "GUIDE";
  fileSize: string;
  summary: string;
  fileName: string;
  image: string;
}

export interface RelatedPortalItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  url: string;
  image: string;
  isExternal: boolean;
}

export interface EngineeringGuidelineItem {
  code: string;
  stepLabel: string;
  title: string;
  summary: string;
  actionLabel: string;
  actionTo: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ContactDepartmentCard {
  id: string;
  title: string;
  role: string;
  phone: string;
  email: string;
  hours: string;
}

export interface ContactLocationCard {
  id: string;
  name: string;
  badge: string;
  address: string;
  hours: string;
  phone: string;
  mapUrl: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  "All",
  "Launches",
  "Projects",
  "Standards",
];

export const NEWS_ARTICLES: NewsArticleItem[] = [
  {
    id: "news-thermal-series",
    title: "2026 Slim-Line Thermal Door Series Launched",
    category: "Launches",
    date: "Nov 2026",
    summary:
      "Ultra-narrow 22mm interlocking stiles engineered for coastal villas and high-wind facades.",
    highlights: [
      "Polyamide PA66 GF25 thermal barrier",
      "Supports double-glazed acoustic glass up to 32mm",
      "Available in Matte Charcoal, Champagne, and Timber finishes",
    ],
    image: "/assets/products/door.jpg",
    ctaLabel: "Explore Doors",
    ctaTo: "/products/category/doors",
  },
  {
    id: "news-apex-handover",
    title: "Apex Commercial Tower Curtain Wall Completed",
    category: "Projects",
    date: "Oct 2026",
    summary:
      "Twelve storeys of unitized solar-reflective glazing delivered ahead of structural schedule in Colombo.",
    highlights: [
      "Tested for Class 4 air & water tightness",
      "Concealed parallel-opening ventilation vents",
      "Delivered with full as-built structural warranty",
    ],
    image: "/assets/about/facade.jpg",
    ctaLabel: "View Projects",
    ctaTo: "/projects",
  },
  {
    id: "news-iso-certification",
    title: "ISO 9001 & Coastal Anodizing Lab Audit Renewed",
    category: "Standards",
    date: "Sep 2026",
    summary:
      "Annual micron-thickness and salt-spray durability certification passed with zero non-conformances.",
    highlights: [
      "25-micron marine-grade anodizing verification",
      "60-micron Qualicoat Class 2 powder coating",
      "Batch tensile & pull-out strength logs per extrusion lot",
    ],
    image: "/assets/products/showroom.jpg",
    ctaLabel: "View Standards",
    ctaTo: "/milestones",
  },
  {
    id: "news-roto-partnership",
    title: "Expanded European Hardware Stock in Nawala",
    category: "Launches",
    date: "Aug 2026",
    summary:
      "Direct availability of SS316 heavy-duty lift-and-slide carriages and multi-point locks.",
    highlights: [
      "300 kg max leaf load carriage kits",
      "Concealed casement friction stays",
      "Full OEM spare-parts desk in Colombo",
    ],
    image: "/assets/products/window.jpg",
    ctaLabel: "Check Hardware Resources",
    ctaTo: "/resources",
  },
  {
    id: "news-kandy-pavilion",
    title: "Hill-Country Skylight & Bi-Fold Showcase Open",
    category: "Projects",
    date: "Jul 2026",
    summary:
      "Custom thermally insulated roof skylights and flush-sill bi-folds commissioned in Kandy.",
    highlights: [
      "Barrier-free recessed floor drainage tracks",
      "Laminated heat-control overhead glazing",
      "Custom bronze anodized hardware",
    ],
    image: "/assets/about/pavilion.jpg",
    ctaLabel: "See Installations",
    ctaTo: "/projects",
  },
  {
    id: "news-acoustic-partitions",
    title: "44 dB Acoustic Office Partition System Certified",
    category: "Standards",
    date: "Jun 2026",
    summary:
      "Slim perimeter aluminium channels with double acoustic laminated glass for corporate suites.",
    highlights: [
      "Sound reduction rated up to 44 dB",
      "Integrated smart-privacy switch glass option",
      "Rapid dry-joint modular installation",
    ],
    image: "/assets/products/partition.jpg",
    ctaLabel: "Explore Partitions",
    ctaTo: "/products/category/partitions",
  },
  {
    id: "news-motorized-louvers-launch",
    title: "Solar-Tracking Aluminium Facade Louvers Released",
    category: "Launches",
    date: "May 2026",
    summary:
      "Aerofoil sun-shading blades engineered for automated east-west heat control on commercial elevations.",
    highlights: [
      "Extruded 6063-T6 aerofoil blades up to 3.2m span",
      "24V concealed actuator torque linkage",
      "Reduces perimeter peak cooling demand by 31%",
    ],
    image: "/assets/products/louvers.jpg",
    ctaLabel: "Explore Facades",
    ctaTo: "/products/category/facades",
  },
  {
    id: "news-wardrobe-pantry-series",
    title: "Bespoke Glass Wardrobe & Pantry Collection Introduced",
    category: "Launches",
    date: "Apr 2026",
    summary:
      "Ultra-slim bronze anodized frames with fluted privacy glass and silent damped hinges.",
    highlights: [
      "18mm perimeter architectural framing profile",
      "Fluted, smoked, and back-painted tempered glass",
      "Integrated diffused LED channel wiring",
    ],
    image: "/assets/products/wardrobe-pantry.jpg",
    ctaLabel: "View Interiors",
    ctaTo: "/products",
  },
  {
    id: "news-galle-coastal-villa",
    title: "Galle Fort Heritage Residence Glazing Commissioned",
    category: "Projects",
    date: "Mar 2026",
    summary:
      "Marine-anodized slim sliding panoramas and teak-grained thermally broken casements overlooking the Indian Ocean.",
    highlights: [
      "25-micron marine bronze anodizing specification",
      "SS316 marine fasteners across sill drains",
      "Custom wind-rated corner sliders up to 3.4m tall",
    ],
    image: "/assets/about/terrace.jpg",
    ctaLabel: "See Projects",
    ctaTo: "/projects",
  },
  {
    id: "news-nawala-flagship-atrium",
    title: "Harborline Corporate Atrium Shopfront Delivered",
    category: "Projects",
    date: "Feb 2026",
    summary:
      "Double-height structural glass fin atrium and automatic entrance vestibule completed in Colombo 03.",
    highlights: [
      "15mm toughened low-iron display fins",
      "Heavy-duty concealed overhead door closers",
      "Zero-threshold granite floor channel",
    ],
    image: "/assets/products/shopfront.jpg",
    ctaLabel: "View Showrooms",
    ctaTo: "/projects",
  },
  {
    id: "news-wind-water-chamber-test",
    title: "ASTM E331 Monsoon Water Penetration Test Passed",
    category: "Standards",
    date: "Jan 2026",
    summary:
      "Independent test-rig validation confirming zero interior water ingress across our 22mm sliding threshold under simulated cyclone gusts.",
    highlights: [
      "Tested up to 600 Pa cyclic water spray pressure",
      "Triple EPDM compression gasket barrier",
      "Full compliance report available to specifiers",
    ],
    image: "/assets/products/hero-showroom.jpg",
    ctaLabel: "Download Specs",
    ctaTo: "/resources",
  },
  {
    id: "news-qualicoat-lab-upgrade",
    title: "Automated Pre-Treatment & Powder Coating Line Commissioned",
    category: "Standards",
    date: "Dec 2025",
    summary:
      "Chrome-free architectural aluminium conversion bath upgrades installed at the Kelaniya fabrication facility.",
    highlights: [
      "Chrome-free ecological etching compliance",
      "Spectrophotometer delta-E colour consistency check",
      "60-micron Qualicoat Class 2 warranty backing",
    ],
    image: "/assets/products/roof-skylight.jpg",
    ctaLabel: "Quality Milestones",
    ctaTo: "/milestones",
  },
];

export const DEFAULT_ATTACHMENTS_RIBBON_SPEED = 42;

export function getAttachmentDownloadHref(id: string): string {
  return `/api/resources/download/${encodeURIComponent(id.trim())}`;
}

export const RESOURCE_ATTACHMENTS: ResourceAttachmentItem[] = [
  {
    id: "profile-catalogue",
    title: "Architectural Aluminium Profile Catalogue",
    format: "SPEC",
    fileSize: "48 KB · Spec Sheet",
    summary: "Section weights, thermal break dimensions, and alloy 6063-T5 tolerances.",
    fileName: "Innovista-Aluminium-Profile-Catalogue.txt",
    image: "/assets/products/facade-detail.jpg",
  },
  {
    id: "cad-installation-pack",
    title: "Sliding Door & Facade CAD Detail Pack",
    format: "CAD",
    fileSize: "36 KB · CAD Schedule",
    summary: "Standard sill drainage cuts, anchor spacing, and mullion wind-load tables.",
    fileName: "Innovista-CAD-Installation-Schedule.txt",
    image: "/assets/products/door.jpg",
  },
  {
    id: "hardware-compatibility-guide",
    title: "Hardware & Lock Compatibility Matrix",
    format: "GUIDE",
    fileSize: "28 KB · Matrix",
    summary: "Matching rollers, multi-point locks, and hinges by sash weight.",
    fileName: "Innovista-Hardware-Compatibility-Matrix.txt",
    image: "/assets/products/window.jpg",
  },
  {
    id: "coastal-finish-care",
    title: "Anodized & Powder-Coat Maintenance Guide",
    format: "GUIDE",
    fileSize: "24 KB · Care Guide",
    summary: "Recommended cleaning intervals and seal inspection checklist for coastal sites.",
    fileName: "Innovista-Surface-Care-Guideline.txt",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "acoustic-louver-spec",
    title: "Acoustic Partition & Louver Glazing Spec",
    format: "SPEC",
    fileSize: "32 KB · Spec Sheet",
    summary: "44 dB acoustic laminated glass details, louver blade pitch, and bracket spans.",
    fileName: "Innovista-Acoustic-Louver-Spec.txt",
    image: "/assets/products/louvers.jpg",
  },
];

export const RELATED_PORTALS: RelatedPortalItem[] = [
  {
    id: "portal-products",
    name: "Innovista System Catalogue",
    category: "Internal Portal",
    summary: "Doors, windows, partitions & louvers.",
    url: "/products",
    image: "/assets/products/hero-showroom.jpg",
    isExternal: false,
  },
  {
    id: "portal-hardware-roto",
    name: "Roto Architectural Hardware",
    category: "Hardware Partner",
    summary: "Tilt-turn, hinges & sliding locks.",
    url: "https://ftt.roto-frank.com/en/",
    image: "/assets/products/window.jpg",
    isExternal: true,
  },
  {
    id: "portal-hardware-giesse",
    name: "Giesse Aluminium Hardware",
    category: "Hardware Partner",
    summary: "Handles, bolts & casement fittings.",
    url: "https://www.giesse.it/en/",
    image: "/assets/products/door.jpg",
    isExternal: true,
  },
  {
    id: "portal-dormakaba",
    name: "Dormakaba Door Controls",
    category: "Access Hardware",
    summary: "Floor springs & glass access.",
    url: "https://www.dormakaba.com/",
    image: "/assets/products/partition.jpg",
    isExternal: true,
  },
  {
    id: "portal-rfq",
    name: "Custom RFQ & BOQ Portal",
    category: "Internal Portal",
    summary: "Upload floor plans & measurements.",
    url: "/request-quote",
    image: "/assets/about/pavilion.jpg",
    isExternal: false,
  },
  {
    id: "portal-milestones",
    name: "Quality & ISO Standards",
    category: "Internal Portal",
    summary: "Fabrication & weather testing.",
    url: "/milestones",
    image: "/assets/products/facade-detail.jpg",
    isExternal: false,
  },
];

export const PORTAL_IMAGE_PRESETS: Array<{ label: string; url: string }> = [
  { label: "Showroom Systems", url: "/assets/products/hero-showroom.jpg" },
  { label: "Architectural Doors", url: "/assets/products/door.jpg" },
  { label: "Window Hardware", url: "/assets/products/window.jpg" },
  { label: "Curtain Wall Facade", url: "/assets/products/facade-detail.jpg" },
  { label: "Acoustic Partitions", url: "/assets/products/partition.jpg" },
  { label: "Glass Pavilion", url: "/assets/about/pavilion.jpg" },
  { label: "Coastal Terrace", url: "/assets/about/terrace.jpg" },
  { label: "Commercial Shopfront", url: "/assets/products/shopfront.jpg" },
];

export function sanitizePortalUrl(rawUrl?: string): {
  url: string;
  isExternal: boolean;
} {
  let clean = (rawUrl || "").trim();
  if (!clean || /^javascript:/i.test(clean) || /^data:/i.test(clean)) {
    return { url: "/products", isExternal: false };
  }
  if (clean.startsWith("#/")) {
    clean = clean.slice(1);
  }
  if (clean.startsWith("/")) {
    return { url: clean, isExternal: false };
  }
  if (/^https?:\/\//i.test(clean)) {
    return { url: clean, isExternal: true };
  }
  return { url: `/${clean.replace(/^\/+/, "")}`, isExternal: false };
}

export function normalizePortalTile(
  raw: Partial<RelatedPortalItem> | null | undefined,
  index = 0
): RelatedPortalItem {
  const { url, isExternal } = sanitizePortalUrl(raw?.url);
  const rawImage = typeof raw?.image === "string" ? raw.image.trim() : "";
  const safeImage =
    rawImage && !/^javascript:/i.test(rawImage)
      ? rawImage
      : PORTAL_IMAGE_PRESETS[index % PORTAL_IMAGE_PRESETS.length].url;

  return {
    id:
      typeof raw?.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `portal-${Date.now()}-${index}`,
    name:
      typeof raw?.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : "Partner Portal",
    category:
      typeof raw?.category === "string" && raw.category.trim()
        ? raw.category.trim()
        : isExternal
        ? "Hardware Partner"
        : "Internal Portal",
    summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
    url,
    image: safeImage,
    isExternal,
  };
}

export function normalizeRelatedPortals(
  list: Array<Partial<RelatedPortalItem>> | unknown
): RelatedPortalItem[] {
  if (!Array.isArray(list)) {
    return RELATED_PORTALS.map((item, idx) => normalizePortalTile(item, idx));
  }
  return list.map((item, idx) => normalizePortalTile(item, idx));
}

export function getCollageTileSpanClass(index: number, total: number): string {
  if (total === 1) return "lg:col-span-12 lg:row-span-2";
  if (total === 2) return "lg:col-span-6 lg:row-span-2";
  if (total === 3) {
    if (index === 0) return "lg:col-span-6 lg:row-span-2";
    return "lg:col-span-6 lg:row-span-1";
  }
  if (total === 4) {
    if (index === 0) return "lg:col-span-6 lg:row-span-2";
    if (index === 1) return "lg:col-span-6 lg:row-span-1";
    return "lg:col-span-3 lg:row-span-1";
  }
  if (total === 5) {
    if (index === 0) return "lg:col-span-6 lg:row-span-2";
    return "lg:col-span-3 lg:row-span-1";
  }
  const mod = index % 6;
  const remainingInCycle = total - (index - mod);
  if (remainingInCycle >= 6) {
    if (mod === 0) return "lg:col-span-6 lg:row-span-2";
    if (mod === 1 || mod === 2) return "lg:col-span-3 lg:row-span-1";
    if (mod === 3) return "lg:col-span-6 lg:row-span-1";
    return "lg:col-span-6 lg:row-span-1";
  }
  if (remainingInCycle === 1) return "lg:col-span-12 lg:row-span-1";
  if (remainingInCycle === 2) return "lg:col-span-6 lg:row-span-1";
  if (remainingInCycle === 3) return "lg:col-span-4 lg:row-span-1";
  if (remainingInCycle === 4) return "lg:col-span-3 lg:row-span-1";
  return mod === 0 ? "lg:col-span-6 lg:row-span-2" : "lg:col-span-3 lg:row-span-1";
}

export const ENGINEERING_GUIDELINES: EngineeringGuidelineItem[] = [
  {
    code: "01",
    stepLabel: "Step 01",
    title: "Browse Products",
    summary:
      "Explore doors, windows, partitions, and finishes to match your opening style.",
    actionLabel: "Open Products",
    actionTo: "/products",
  },
  {
    code: "02",
    stepLabel: "Step 02",
    title: "Download Specs",
    summary:
      "Click any attachment card or partner hardware link above to review specs.",
    actionLabel: "View Downloads",
    actionTo: "#download-attachments",
  },
  {
    code: "03",
    stepLabel: "Step 03",
    title: "Request a Quote",
    summary:
      "Use Request Quote on any product or send your BOQ measurements online.",
    actionLabel: "Request Quote",
    actionTo: "/request-quote",
  },
  {
    code: "04",
    stepLabel: "Step 04",
    title: "Contact Our Team",
    summary:
      "Call, email, or visit our Colombo and Kandy desks for site measurement.",
    actionLabel: "Contact Us",
    actionTo: "/contact",
  },
];

export function getGuidelineStepIndex(code: string): number {
  const idx = ENGINEERING_GUIDELINES.findIndex((item) => item.code === code);
  return idx >= 0 ? idx : 0;
}

export const RESOURCE_FAQS: FaqItem[] = [
  {
    id: "faq-lead-time",
    question: "What is the typical fabrication and installation lead time?",
    answer:
      "Standard residential orders are fabricated and installed within 3–4 weeks after final laser site measurement. Custom commercial curtain walls follow milestone schedules.",
  },
  {
    id: "faq-finishes",
    question: "Which powder-coat and anodized finishes are kept in stock?",
    answer:
      "Matte Charcoal, Sahara Black, Satin Anodized Silver, Champagne Bronze, Pure White, and Teak Woodgrain finishes are stocked locally at our Colombo plant.",
  },
  {
    id: "faq-warranty",
    question: "Do systems include structural and hardware warranties?",
    answer:
      "Yes. Extrusion finish coatings carry a 10-year warranty, and European stainless-steel rollers and locks carry a 5-year operational warranty.",
  },
  {
    id: "faq-quote",
    question: "How do I request pricing from architectural drawings?",
    answer:
      "Use the Request Quote modal on any product or visit the Full RFQ page to send opening dimensions, quantities, and preferred glass specs.",
  },
];

export const CONTACT_DEPARTMENTS: ContactDepartmentCard[] = [
  {
    id: "dept-sales",
    title: "Sales & Estimations",
    role: "Project quotes, BOQ costing & showroom visits",
    phone: "+94 11 234 5678",
    email: "sales@innovista.lk",
    hours: "Mon–Sat · 8:30 AM – 5:30 PM",
  },
  {
    id: "dept-engineering",
    title: "Technical & CAD Desk",
    role: "Shop drawings, wind-load checks & glass specs",
    phone: "+94 11 234 5688",
    email: "engineering@innovista.lk",
    hours: "Mon–Fri · 8:30 AM – 5:30 PM",
  },
  {
    id: "dept-plant",
    title: "Fabrication Plant",
    role: "CNC cutting, powder-coating & dispatch tracking",
    phone: "+94 11 289 4410",
    email: "plant@innovista.lk",
    hours: "Mon–Sat · 8:00 AM – 6:00 PM",
  },
  {
    id: "dept-support",
    title: "After-Sales & Warranty",
    role: "Hardware servicing, seal replacement & inspection",
    phone: "+94 77 455 1200",
    email: "support@innovista.lk",
    hours: "Mon–Sat · 9:00 AM – 5:00 PM",
  },
];

export const CONTACT_LOCATIONS: ContactLocationCard[] = [
  {
    id: "loc-nawala",
    name: "Colombo Flagship Showroom",
    badge: "Head Office",
    address: "No. 42, Nawala Road, Colombo 05, Sri Lanka",
    hours: "Mon–Sat · 8:30 AM – 5:30 PM",
    phone: "+94 11 234 5678",
    mapUrl: "https://maps.google.com/?q=Nawala+Road+Colombo+05+Sri+Lanka",
  },
  {
    id: "loc-peliyagoda",
    name: "Fabrication & CNC Plant",
    badge: "Manufacturing",
    address: "Plot 18, Biyagama / Peliyagoda Industrial Zone, Kelaniya",
    hours: "Mon–Sat · 8:00 AM – 6:00 PM",
    phone: "+94 11 289 4410",
    mapUrl: "https://maps.google.com/?q=Peliyagoda+Sri+Lanka",
  },
  {
    id: "loc-kandy",
    name: "Kandy Regional Design Desk",
    badge: "Central Branch",
    address: "No. 114, Peradeniya Road, Kandy, Sri Lanka",
    hours: "Mon–Sat · 9:00 AM – 5:00 PM",
    phone: "+94 81 220 3344",
    mapUrl: "https://maps.google.com/?q=Peradeniya+Road+Kandy+Sri+Lanka",
  },
];

export function filterNewsArticles(
  articles: NewsArticleItem[],
  category: NewsCategory,
  searchQuery: string
): NewsArticleItem[] {
  const q = searchQuery.trim().toLowerCase();
  return articles.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    if (!q) return true;
    const text = `${item.title} ${item.summary} ${item.category} ${item.date}`.toLowerCase();
    return text.includes(q);
  });
}

export interface ContactPageFormValues {
  name: string;
  email: string;
  phone: string;
  department: string;
  message: string;
}

export type ContactPageFormErrors = Partial<
  Record<keyof ContactPageFormValues, string>
>;

export function validateContactPageForm(
  values: ContactPageFormValues
): ContactPageFormErrors {
  const errors: ContactPageFormErrors = {};
  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = "Enter your full name (at least 2 characters).";
  }
  if (!values.email.trim() || !isValidEmailAddress(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.phone.trim() || !isValidOptionalPhone(values.phone)) {
    errors.phone = "Enter a valid phone number (7–15 digits).";
  }
  if (!values.department.trim()) {
    errors.department = "Select a department.";
  }
  if (!values.message.trim() || values.message.trim().length < 5) {
    errors.message = "Enter a message (at least 5 characters).";
  }
  return errors;
}

export function isContactPageFormValid(values: ContactPageFormValues): boolean {
  return Object.keys(validateContactPageForm(values)).length === 0;
}

export interface NewsroomDepartmentSection {
  category: Exclude<NewsCategory, "All">;
  articles: NewsArticleItem[];
  totalCount: number;
}

export interface NewsroomEditorialLayout {
  centerDispatch: NewsArticleItem | null;
  leftBriefs: NewsArticleItem[];
  latestWire: NewsArticleItem[];
  departmentSections: NewsroomDepartmentSection[];
}

export function buildNewsroomEditorialLayout(
  visibleArticles: NewsArticleItem[],
  allArticles: NewsArticleItem[] = visibleArticles
): NewsroomEditorialLayout {
  const centerDispatch = visibleArticles[0] || null;
  const remaining = visibleArticles.slice(1);
  const leftBriefs = remaining.slice(0, 2);
  const latestWire = (visibleArticles.length >= 5 ? visibleArticles : allArticles).slice(
    0,
    5
  );

  const orderedCategories: Array<Exclude<NewsCategory, "All">> = [
    "Launches",
    "Projects",
    "Standards",
  ];

  const departmentSections: NewsroomDepartmentSection[] = orderedCategories
    .map((cat) => {
      const matching = visibleArticles.filter((a) => a.category === cat);
      return {
        category: cat,
        articles: matching.slice(0, 4),
        totalCount: matching.length,
      };
    })
    .filter((section) => section.articles.length > 0);

  return {
    centerDispatch,
    leftBriefs,
    latestWire,
    departmentSections,
  };
}
