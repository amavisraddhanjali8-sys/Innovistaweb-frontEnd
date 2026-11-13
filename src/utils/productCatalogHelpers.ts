import * as XLSX from "xlsx";
import {
  DEFAULT_SLIDESHOW_SPEED_MS,
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  normalizeHeroSlides,
  sanitizeAboutImage,
  type HeroSlide,
} from "./aboutContentHelpers";

export const MAX_CERTIFICATION_IMAGES = 8;
export const DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS = 4000;
export const DEFAULT_ACCESSORIES_RIBBON_SPEED = 45;

export type FinishColorFamily =
  | "all"
  | "charcoal"
  | "silver"
  | "bronze"
  | "white"
  | "navy";

export type ProductSortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "newest";

export interface ProductPerformanceSpec {
  airtightness: string;
  watertightness: string;
  soundInsulation: string;
  thermalInsulation: string;
  windResistance: string;
  productType: string;
  visibleSurface: string;
  wallThickness: string;
  frameThickness: string;
  sizeRange: string;
  glassThickness: string;
  maxLoadBearing: string;
}

export interface ProductDownloadDoc {
  id: string;
  title: string;
  fileType: "PDF" | "CAD";
  url: string;
}

export interface ProductCertification {
  id: string;
  standardLabel: string;
  uFactor: string;
  shgc: string;
  energyRating: string;
  visibleTransmittance: string;
  specSummary: string;
  badgeCode: string;
}

export interface CertificationImageItem {
  id: string;
  title: string;
  image: string;
}

export interface ProductFeatureTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface AccessoryVariantItem {
  id: string;
  name: string;
  code: string;
  finish: string;
  spec: string;
  image: string;
}

export interface ProductAccessoryGroup {
  id: string;
  name: string;
  subtitle: string;
  brandName?: string;
  brandLogo?: string;
  image: string;
  variants: AccessoryVariantItem[];
}

export const ACCESSORY_BRAND_LOGO_PRESETS = [
  { label: "NordicLock (Locks & Hinges)", brandName: "NordicLock", url: "/assets/logos/partner-nordiclock.svg" },
  { label: "Vanguard (Rollers & Extrusions)", brandName: "Vanguard", url: "/assets/logos/partner-vanguard.svg" },
  { label: "ThermoSeal (Seals & Tracks)", brandName: "ThermoSeal", url: "/assets/logos/partner-thermoseal.svg" },
  { label: "AluProfile (Handles & Profiles)", brandName: "AluProfile", url: "/assets/logos/partner-aluprofile.svg" },
  { label: "CoatTech (Anodized Finishes)", brandName: "CoatTech", url: "/assets/logos/partner-coattech.svg" },
  { label: "ClarityGlass (Glazing Hardware)", brandName: "ClarityGlass", url: "/assets/logos/partner-clarityglass.svg" },
];

export interface ProductFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ProductAdvantageItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export type CustomizationCategory =
  | "color"
  | "glass"
  | "frame"
  | "size"
  | "hardware"
  | "style";

export interface ProductCustomizationItem {
  id: string;
  category: CustomizationCategory;
  title: string;
  description: string;
}

export interface ProductPartnerService {
  id: string;
  step: string;
  title: string;
  description: string;
}

export interface ProductClientShowcase {
  id: string;
  location: string;
  title: string;
  image: string;
}

export interface DesignItem {
  DesignID: number | string;
  Design_Name: string;
  Design_Description: string;
  Categories: string[];
  Design_Colors: string[];
  Design_Sizes: string[];
  Design_BlogPosts: string[];
  Design_Image: string[];
  Design_CreatedAt: string;
  price?: number;
  features?: string[];
  featureTable?: ProductFeatureTable;
  performance?: ProductPerformanceSpec;
  configurations?: string[];
  downloads?: ProductDownloadDoc[];
  certifications?: ProductCertification[];
  certificationImages?: CertificationImageItem[];
  accessoriesHeading?: string;
  accessoriesTagline?: string;
  accessoriesSlideshowSpeedMs?: number;
  accessoriesRibbonSpeed?: number;
  accessories?: ProductAccessoryGroup[];
  faqs?: ProductFaqItem[];
  advantages?: ProductAdvantageItem[];
  customizations?: ProductCustomizationItem[];
  partnerServices?: ProductPartnerService[];
  partnerServiceBannerImage?: string;
  clientShowcases?: ProductClientShowcase[];
  relatedProductIds?: (string | number)[];
}

export interface ProductCategory {
  CategoryID: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverImage: string;
  featured: boolean;
  displayOrder: number;
  slideshowSpeedMs: number;
  heroSlides: HeroSlide[];
  specHighlights: string[];
}

export type WhyChooseIcon =
  | "precision"
  | "shield"
  | "acoustic"
  | "weather"
  | "craft"
  | "speed";

export type WhyChooseAccent = "navy" | "blue" | "cyan" | "red";

export interface WhyChooseItem {
  id: string;
  metric: string;
  title: string;
  percent: number;
  icon: WhyChooseIcon;
  accent: WhyChooseAccent;
}

export interface ProductLandingCms {
  slideshowSpeedMs: number;
  heroSlides: HeroSlide[];
  categoriesHeading: string;
  categoriesTagline: string;
  catalogHeading: string;
  catalogTagline: string;
  whyChooseHeading: string;
  whyChooseUs: WhyChooseItem[];
}

export interface ProductFilterState {
  searchQuery: string;
  categorySlug: string;
  colorFamily: FinishColorFamily;
  sizeFilter: "all" | "standard" | "custom";
  maxPrice: number | null;
  sortBy: ProductSortOption;
}

export const DEFAULT_PERFORMANCE_SPEC: ProductPerformanceSpec = {
  airtightness: "Class 4",
  watertightness: "Class 3 | 350 Pa",
  soundInsulation: "38–42 dB",
  thermalInsulation: "2.3 W/m²·K",
  windResistance: "CW-PG50 (ASTM / EN)",
  productType: "Architectural Aluminium System",
  visibleSurface: "Ultra-Slim Sightline (20–50mm)",
  wallThickness: "2.0 mm Extruded Alloy 6063-T5",
  frameThickness: "50–120 mm Thermal/Structural",
  sizeRange: "Width: 600–1500 mm · Height: 1200–3600 mm",
  glassThickness: "5+12A+5 mm Double Tempered Low-E",
  maxLoadBearing: "120 kg per sash",
};

export const DEFAULT_PRODUCT_FAQS: ProductFaqItem[] = [
  {
    id: "faq-1",
    question: "Does this architectural system comply with local and coastal building codes?",
    answer:
      "Yes. All Innovista aluminium extrusions and glazing assemblies are engineered to meet SLS, BS EN, and coastal wind-load standards for residential and commercial buildings across Sri Lanka.",
  },
  {
    id: "faq-2",
    question: "Are your systems suitable for coastal salt-spray and high-wind zones?",
    answer:
      "Our profiles use architectural 6063-T5/T6 alloy finished with marine-grade anodizing or Qualicoat Class 2 powder coating, paired with SS316 corrosion-resistant rollers and hinges.",
  },
  {
    id: "faq-3",
    question: "What glass configurations and acoustic options are supported?",
    answer:
      "Systems accept 8mm–12mm toughened single glass, 5+12A+5mm insulated double glazing, acoustic PVB laminated glass, and solar-control Low-E coatings.",
  },
  {
    id: "faq-4",
    question: "What information is required for an accurate quotation?",
    answer:
      "Share rough aperture width and height dimensions, desired finish color, project location, and architectural drawings if available. Our team schedules a complimentary site measurement before fabrication.",
  },
  {
    id: "faq-5",
    question: "How long does fabrication and site installation take?",
    answer:
      "Standard custom-fabricated orders are delivered and installed within 2 to 4 weeks after final site measurement sign-off, depending on span complexity and specialty glass lead times.",
  },
];

export const DEFAULT_PRODUCT_ADVANTAGES: ProductAdvantageItem[] = [
  {
    id: "adv-1",
    title: "Thermal Insulation",
    description:
      "Polyamide thermal break chambers paired with Low-E insulated glazing dramatically cut tropical solar heat transfer and reduce interior cooling loads.",
    image: "/assets/about/facade.jpg",
  },
  {
    id: "adv-2",
    title: "Airtightness & Acoustic Seal",
    description:
      "Multi-chamber EPDM compression gaskets seal tightly against drafts, ambient city traffic noise, and dust infiltration when locked.",
    image: "/assets/products/window.jpg",
  },
  {
    id: "adv-3",
    title: "Monsoon Water-Tightness",
    description:
      "Stepped drainage channels and concealed weep slots prevent wind-driven rain ingress even during severe tropical downpours.",
    image: "/assets/products/hero-showroom.jpg",
  },
];

export const DEFAULT_PRODUCT_CUSTOMIZATIONS: ProductCustomizationItem[] = [
  {
    id: "cust-color",
    category: "color",
    title: "Color",
    description: "Matte charcoal, anodized silver, champagne bronze, and custom RAL shades.",
  },
  {
    id: "cust-glass",
    category: "glass",
    title: "Glass",
    description: "Clear tempered, frosted, tinted, acoustic laminated, or Low-E double glazing.",
  },
  {
    id: "cust-frame",
    category: "frame",
    title: "Frame",
    description: "Slim 20mm interlock, thermally broken profiles, or heavy structural box frames.",
  },
  {
    id: "cust-size",
    category: "size",
    title: "Size",
    description: "Precision laser-measured width, height, and floor-to-soffit custom spans.",
  },
  {
    id: "cust-hardware",
    category: "hardware",
    title: "Hardware",
    description: "Multi-point European locking, SS316 bogie rollers, and concealed handles.",
  },
  {
    id: "cust-style",
    category: "style",
    title: "Style",
    description: "Sliding, folding, pivot, casement, awning, or fixed architectural combinations.",
  },
];

export const DEFAULT_PARTNER_SERVICES: ProductPartnerService[] = [
  {
    id: "srv-1",
    step: "01",
    title: "Site Measurement & Design",
    description: "Laser aperture auditing, CAD shop drawings, and wind-load engineering.",
  },
  {
    id: "srv-2",
    step: "02",
    title: "Precision Fabrication",
    description: "CNC mitre cutting, corner crimping, and strict QC inspection prior to dispatch.",
  },
  {
    id: "srv-3",
    step: "03",
    title: "Certified Installation",
    description: "Weather-sealed perimeter glazing, hardware calibration, and warranty handover.",
  },
];

export const DEFAULT_PRODUCT_CERTIFICATIONS: ProductCertification[] = [
  {
    id: "cert-1",
    standardLabel: "Energy Performance Rating",
    uFactor: "1.93 / 0.34",
    shgc: "0.25",
    energyRating: "12",
    visibleTransmittance: "0.40",
    specSummary: "Aluminium Frame · Triple Glazed Low-E Argon Filled",
    badgeCode: "EN 14351-1",
  },
  {
    id: "cert-2",
    standardLabel: "Energy Performance Rating",
    uFactor: "2.30 / 0.41",
    shgc: "0.31",
    energyRating: "08",
    visibleTransmittance: "0.50",
    specSummary: "Aluminium Frame · Double Glazed Low-E Tempered",
    badgeCode: "ASTM E330",
  },
  {
    id: "cert-3",
    standardLabel: "Energy Performance Rating",
    uFactor: "2.36 / 0.42",
    shgc: "0.40",
    energyRating: "11",
    visibleTransmittance: "0.53",
    specSummary: "Acoustic Laminated Interlayer · Coastal Salt Rated",
    badgeCode: "ISO 9001",
  },
  {
    id: "cert-4",
    standardLabel: "Energy Performance Rating",
    uFactor: "2.29 / 0.40",
    shgc: "0.21",
    energyRating: "02",
    visibleTransmittance: "0.36",
    specSummary: "Solar Control Tinted Low-E · UV Rejection 99%",
    badgeCode: "SLS / BS",
  },
];

export const DEFAULT_CLIENT_SHOWCASES: ProductClientShowcase[] = [
  {
    id: "sc-1",
    location: "Colombo 07, Cinnamon Gardens",
    title: "Residence Pavilion Installation",
    image: "/assets/products/hero-showroom.jpg",
  },
  {
    id: "sc-2",
    location: "Galle Coastal Villa",
    title: "Oceanfront Salt-Rated Glazing",
    image: "/assets/about/pavilion.jpg",
  },
  {
    id: "sc-3",
    location: "Kandy Hillside Retreat",
    title: "Panoramic Terrace Bi-Fold Suite",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "sc-4",
    location: "Colombo 03 Commercial Tower",
    title: "Executive Acoustic Fit-Out",
    image: "/assets/products/partition.jpg",
  },
];

export const DEFAULT_CERTIFICATION_IMAGES: CertificationImageItem[] = [
  {
    id: "certimg-1",
    title: "EN 14351-1 Structural Compliance",
    image: "/assets/about/facade.jpg",
  },
  {
    id: "certimg-2",
    title: "Coastal Salt-Spray Test Report",
    image: "/assets/about/pavilion.jpg",
  },
  {
    id: "certimg-3",
    title: "Thermal Break Chamber Verification",
    image: "/assets/products/window.jpg",
  },
  {
    id: "certimg-4",
    title: "ISO 9001 Quality Assurance Certificate",
    image: "/assets/products/hero-showroom.jpg",
  },
];

export const DEFAULT_DOOR_FEATURE_TABLE: ProductFeatureTable = {
  title: "Profile Series & Architectural Comparison Matrix",
  headers: ["Series Code", "Max Leaf Weight", "Interlock Sightline", "Glass Capacity", "Threshold Type"],
  rows: [
    ["IS-20 Standard", "120 kg / sash", "20 mm slim", "24 mm Double Low-E", "Stepped Storm Drain"],
    ["IS-20 Heavy", "160 kg / sash", "20 mm reinforced", "32 mm Acoustic PVB", "Flush Barrier-Free"],
    ["IS-20 Motorized", "250 kg / sash", "22 mm motorized", "36 mm Triple Glazed", "Concealed Motor Channel"],
  ],
};

export const DEFAULT_DOOR_ACCESSORIES: ProductAccessoryGroup[] = [
  {
    id: "acc-lock-handles",
    name: "Multi-Point Locking Handles",
    subtitle: "Ergonomic architectural lever and pull handles with concealed cylinder cam locks.",
    brandName: "NordicLock",
    brandLogo: "/assets/logos/partner-nordiclock.svg",
    image: "/assets/products/door.jpg",
    variants: [
      {
        id: "var-lock-1",
        name: "Matte Charcoal Lift Handle",
        code: "INV-HND-01",
        finish: "Powder Matte Black",
        spec: "316 Stainless Core · 4-Point Hook Lock",
        image: "/assets/products/door.jpg",
      },
      {
        id: "var-lock-2",
        name: "Brushed Anodized Champagne Pull",
        code: "INV-HND-02",
        finish: "Champagne Bronze",
        spec: "450mm Full-Grip Pull · Coastal Rated",
        image: "/assets/products/hero-showroom.jpg",
      },
      {
        id: "var-lock-3",
        name: "Flush Concealed Pocket Pull",
        code: "INV-HND-03",
        finish: "Satin Anodized Silver",
        spec: "Zero-Protrusion Sliding Pocket Latch",
        image: "/assets/products/showroom.jpg",
      },
    ],
  },
  {
    id: "acc-bogie-rollers",
    name: "SS316 Heavy-Duty Tandem Rollers",
    subtitle: "Precision ball-bearing tandem bogies ensuring silent glide on multi-track glass panels.",
    brandName: "Vanguard",
    brandLogo: "/assets/logos/partner-vanguard.svg",
    image: "/assets/about/pavilion.jpg",
    variants: [
      {
        id: "var-rol-1",
        name: "160 kg Dual Steel Wheel Bogie",
        code: "INV-ROL-160",
        finish: "Marine 316 Stainless",
        spec: "50,000+ Cycle Tested · Silent Nylon Ring",
        image: "/assets/about/pavilion.jpg",
      },
      {
        id: "var-rol-2",
        name: "250 kg Lift & Slide Quad Carriage",
        code: "INV-ROL-250",
        finish: "Hardened SS316",
        spec: "Adjustable Height +/- 6mm",
        image: "/assets/about/terrace.jpg",
      },
    ],
  },
  {
    id: "acc-tracks-seals",
    name: "Drainage Tracks & Acoustic Seals",
    subtitle: "Snap-in stainless steel running rails paired with triple-durometer EPDM compression gaskets.",
    brandName: "ThermoSeal",
    brandLogo: "/assets/logos/partner-thermoseal.svg",
    image: "/assets/about/facade.jpg",
    variants: [
      {
        id: "var-trk-1",
        name: "Flush Barrier-Free Zero Sill Track",
        code: "INV-TRK-FL",
        finish: "Brushed Stainless",
        spec: "Concealed Sub-Sill Monsoon Channel",
        image: "/assets/about/facade.jpg",
      },
      {
        id: "var-trk-2",
        name: "Soft-Close Hydraulic Damper Unit",
        code: "INV-DMP-SC",
        finish: "Graphite Alloy",
        spec: "Anti-Slam Cushioned Leaf Braking",
        image: "/assets/products/partition.jpg",
      },
    ],
  },
];

export const DEFAULT_WINDOW_ACCESSORIES: ProductAccessoryGroup[] = [
  {
    id: "wacc-stays",
    name: "Concealed Friction Stays & Hinges",
    subtitle: "Heavy-gauge 304/316 stainless friction hinges engineered for coastal wind loads.",
    brandName: "NordicLock",
    brandLogo: "/assets/logos/partner-nordiclock.svg",
    image: "/assets/products/window.jpg",
    variants: [
      {
        id: "wvar-1",
        name: "90° Wide-Egress Casement Stay",
        code: "INV-STY-90",
        finish: "SS316 Natural",
        spec: "Supports up to 80 kg Side-Hung Sash",
        image: "/assets/products/window.jpg",
      },
      {
        id: "wvar-2",
        name: "Top-Hung Monsoon Limit Stay",
        code: "INV-STY-45",
        finish: "SS316 Coated",
        spec: "45° Rain-Deflecting Projection Stop",
        image: "/assets/about/facade.jpg",
      },
    ],
  },
  {
    id: "wacc-espag",
    name: "Espagnolette Locks & Flyscreens",
    subtitle: "Multi-point mushroom-cam compression locking and integrated pleated mesh cassettes.",
    brandName: "AluProfile",
    brandLogo: "/assets/logos/partner-aluprofile.svg",
    image: "/assets/products/louvers.jpg",
    variants: [
      {
        id: "wvar-3",
        name: "Minimalist Fork Handle Espag Lock",
        code: "INV-ESP-01",
        finish: "Matte Charcoal",
        spec: "Child-Safe Keyed Cylinder Optional",
        image: "/assets/products/louvers.jpg",
      },
      {
        id: "wvar-4",
        name: "Retractable Pleated Mosquito Mesh",
        code: "INV-MSH-PL",
        finish: "Anodized Charcoal Frame",
        spec: "UV-Resistant Micro-Fiber Pleated Net",
        image: "/assets/about/terrace.jpg",
      },
    ],
  },
];

export const PRODUCT_ASSET_PRESETS = [
  { label: "Coastal Pavilion", url: "/assets/products/hero-showroom.jpg" },
  { label: "Sliding Doors", url: "/assets/products/door.jpg" },
  { label: "Casement Windows", url: "/assets/products/window.jpg" },
  { label: "Glass Partitions", url: "/assets/products/partition.jpg" },
  { label: "ShopFront Glazing", url: "/assets/products/shopfront.jpg" },
  { label: "Exterior Louvers", url: "/assets/products/louvers.jpg" },
  { label: "Bath Enclosures", url: "/assets/products/bathroom.jpg" },
  { label: "Skylight Canopy", url: "/assets/products/roof-skylight.jpg" },
  { label: "Wardrobe & Pantry", url: "/assets/products/wardrobe-pantry.jpg" },
  { label: "Facade Suite", url: "/assets/about/facade.jpg" },
  { label: "Terrace Glass", url: "/assets/about/terrace.jpg" },
  { label: "Showroom Suite", url: "/assets/products/showroom.jpg" },
];

export const FINISH_COLOR_FILTERS: Array<{
  key: FinishColorFamily;
  label: string;
  swatch: string;
}> = [
  { key: "all", label: "All Finishes", swatch: "" },
  { key: "charcoal", label: "Matte Charcoal", swatch: "#1F2937" },
  { key: "silver", label: "Anodized Silver", swatch: "#9CA3AF" },
  { key: "bronze", label: "Champagne Bronze", swatch: "#926B46" },
  { key: "white", label: "Pure White", swatch: "#F8FAFC" },
  { key: "navy", label: "Slate Navy", swatch: "#1E3A8A" },
];

export const DEFAULT_WHY_CHOOSE_ITEMS: WhyChooseItem[] = [
  {
    id: "why-1",
    metric: "20 mm",
    title: "Slim Sightlines",
    percent: 96,
    icon: "precision",
    accent: "navy",
  },
  {
    id: "why-2",
    metric: "15+ Yrs",
    title: "Structural Warranty",
    percent: 92,
    icon: "shield",
    accent: "blue",
  },
  {
    id: "why-3",
    metric: "42 dB",
    title: "Acoustic Seal",
    percent: 88,
    icon: "acoustic",
    accent: "cyan",
  },
  {
    id: "why-4",
    metric: "100%",
    title: "Weather Proofing",
    percent: 100,
    icon: "weather",
    accent: "red",
  },
];

export const DEFAULT_PRODUCT_LANDING_CMS: ProductLandingCms = {
  slideshowSpeedMs: 5000,
  categoriesHeading: "Product Categories",
  categoriesTagline: "",
  catalogHeading: "Systems Catalog",
  catalogTagline: "",
  whyChooseHeading: "Why Choose Us",
  whyChooseUs: DEFAULT_WHY_CHOOSE_ITEMS,
  heroSlides: [
    {
      id: "prod-slide-1",
      headline: "Aluminium & Glazing Systems",
      subheadline: "",
      image: "/assets/products/hero-showroom.jpg",
    },
    {
      id: "prod-slide-2",
      headline: "Sun-Control Facades & Louvers",
      subheadline: "",
      image: "/assets/products/louvers.jpg",
    },
    {
      id: "prod-slide-3",
      headline: "Structural Skylights & Canopies",
      subheadline: "",
      image: "/assets/products/roof-skylight.jpg",
    },
    {
      id: "prod-slide-4",
      headline: "Fluted Glass & Cabinetry",
      subheadline: "",
      image: "/assets/products/wardrobe-pantry.jpg",
    },
  ],
};

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    CategoryID: "cat-doors",
    name: "Doors",
    slug: "doors",
    tagline: "Slim-line sliding, pivot, and thermally broken entrance doors.",
    description:
      "Heavy-duty architectural aluminium doors engineered with concealed multi-point locking, stainless tandem rollers, and narrow interlock sightlines for wide spans.",
    coverImage: "/assets/products/door.jpg",
    featured: true,
    displayOrder: 1,
    slideshowSpeedMs: 4500,
    specHighlights: ["20mm Sightlines", "Multi-Point Locking", "Marine Powder Coat"],
    heroSlides: [
      {
        id: "cat-door-s1",
        headline: "Architectural Sliding & Pivot Doors",
        subheadline:
          "Expansive multi-track glass openings gliding effortlessly on stainless precision bogies.",
        image: "/assets/products/hero-showroom.jpg",
      },
      {
        id: "cat-door-s2",
        headline: "Heavy-Duty Bi-Fold Pavilion Entrances",
        subheadline:
          "Weather-sealed threshold suites engineered for seamless indoor-outdoor residential living.",
        image: "/assets/products/door.jpg",
      },
      {
        id: "cat-door-s3",
        headline: "Coastal Storm-Rated Glass Panels",
        subheadline:
          "Toughened double glazing with EPDM acoustic gaskets and salt-spray resistant hardware.",
        image: "/assets/about/pavilion.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-windows",
    name: "Windows",
    slug: "windows",
    tagline: "Thermal break casement, awning, and fixed acoustic fenestration.",
    description:
      "Acoustic double-glazed casement, top-hung awning, and panoramic fixed window suites offering superior U-values and monsoon water tightness.",
    coverImage: "/assets/products/window.jpg",
    featured: true,
    displayOrder: 2,
    slideshowSpeedMs: 4500,
    specHighlights: ["EPDM Triple Seal", "Double Glazed Low-E", "38dB Acoustic Isolation"],
    heroSlides: [
      {
        id: "cat-win-s1",
        headline: "Thermally Broken Casement & Awning Suites",
        subheadline:
          "Engineered air-tight frames keeping tropical heat out while framing unobstructed vistas.",
        image: "/assets/products/window.jpg",
      },
      {
        id: "cat-win-s2",
        headline: "Corner Structural Picture Glazing",
        subheadline:
          "Flush-bonded corner glass assemblies built for high-rise residences and coastal villas.",
        image: "/assets/about/facade.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-partitions",
    name: "Partitions",
    slug: "partitions",
    tagline: "Frameless acoustic glass walls and modular workspace dividers.",
    description:
      "Sleek 10mm–12mm toughened glass partition walls with anodized floor channels, acoustic drop-seals, and integrated switchable privacy options.",
    coverImage: "/assets/products/partition.jpg",
    featured: true,
    displayOrder: 3,
    slideshowSpeedMs: 4500,
    specHighlights: ["12mm Toughened Glass", "42dB Acoustic Seal", "Demountable Track"],
    heroSlides: [
      {
        id: "cat-part-s1",
        headline: "Acoustic Glass Workspace Partitions",
        subheadline:
          "Floor-to-ceiling transparent enclosures bringing daylight and executive privacy to modern interiors.",
        image: "/assets/products/partition.jpg",
      },
      {
        id: "cat-part-s2",
        headline: "Matte Black Mullion Grid Systems",
        subheadline:
          "Contemporary industrial glazing dividers with concealed door closers and flush hardware.",
        image: "/assets/products/facade-detail.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-shopfront",
    name: "Shop Front",
    slug: "shop-front",
    tagline: "Commercial high-span box frames and transom-closer entrances.",
    description:
      "100mm commercial structural box-section facades and heavy-duty overhead hydraulic swing entrances engineered for flagship showrooms and retail towers.",
    coverImage: "/assets/products/shopfront.jpg",
    featured: true,
    displayOrder: 4,
    slideshowSpeedMs: 4500,
    specHighlights: ["100mm Box Section", "Hydraulic Transom Closer", "Laminated Safety Glass"],
    heroSlides: [
      {
        id: "cat-shop-s1",
        headline: "Flagship Commercial Shopfront Facades",
        subheadline:
          "High-impact laminated glass storefronts framed in heavy-gauge architectural aluminium mullions.",
        image: "/assets/products/shopfront.jpg",
      },
      {
        id: "cat-shop-s2",
        headline: "Unitized Retail Curtain Walling",
        subheadline:
          "Precision-anchored structural glazing for automotive showrooms, banking halls, and lobbies.",
        image: "/assets/products/facade-detail.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-louvers",
    name: "Louvers & Sunshades",
    slug: "louvers",
    tagline: "Aerofoil exterior shading blades and architectural ventilation grilles.",
    description:
      "Fixed and motorized anodized aluminium sunshade blades reducing solar heat gain while elevating exterior facade rhythm and passive airflow.",
    coverImage: "/assets/products/louvers.jpg",
    featured: true,
    displayOrder: 5,
    slideshowSpeedMs: 4500,
    specHighlights: ["Aerofoil 150–300mm", "Solar Gain Control", "Anodized Bronze & Charcoal"],
    heroSlides: [
      {
        id: "cat-louv-s1",
        headline: "Architectural Exterior Louvers & Brise-Soleil",
        subheadline:
          "Sculptural horizontal and vertical aluminium fins calibrated to block harsh tropical glare.",
        image: "/assets/products/louvers.jpg",
      },
      {
        id: "cat-louv-s2",
        headline: "Storm-Resistant Ventilation Screening",
        subheadline:
          "Concealed rain-deflecting louver profiles for utility facades, parking levels, and terraces.",
        image: "/assets/about/facade.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-bathrooms",
    name: "Bathroom Enclosures",
    slug: "bathrooms",
    tagline: "Frameless shower cubicles and stainless hardware enclosures.",
    description:
      "Bespoke 10mm ultra-clear tempered glass shower cubicles with matte black, brushed brass, or marine 316 stainless steel hinges and drip seals.",
    coverImage: "/assets/products/bathroom.jpg",
    featured: true,
    displayOrder: 6,
    slideshowSpeedMs: 4500,
    specHighlights: ["316 Stainless Hardware", "Ultra-Clear Glass", "Zero-Leak Seals"],
    heroSlides: [
      {
        id: "cat-bath-s1",
        headline: "Frameless Tempered Shower Enclosures",
        subheadline:
          "Custom-measured corner, alcove, and sliding glass cubicles tailored to boutique bathrooms.",
        image: "/assets/products/bathroom.jpg",
      },
      {
        id: "cat-bath-s2",
        headline: "Matte Black Architectural Bath Framing",
        subheadline:
          "Corrosion-proof perimeter channels paired with crystal-clear easy-clean tempered glazing.",
        image: "/assets/products/showroom.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-roof-skylights",
    name: "Roof & Skylights",
    slug: "roof-skylights",
    tagline: "Double-glazed skylight canopies and aluminium courtyard pergolas.",
    description:
      "Structurally engineered aluminium rafter skylights and courtyard canopies featuring laminated low-E glass and concealed rainwater drainage channels.",
    coverImage: "/assets/products/roof-skylight.jpg",
    featured: true,
    displayOrder: 7,
    slideshowSpeedMs: 4500,
    specHighlights: ["Heat-Reflective Low-E", "Concealed Gutters", "Long-Span Rafters"],
    heroSlides: [
      {
        id: "cat-roof-s1",
        headline: "Engineered Glass Skylights & Pergolas",
        subheadline:
          "High-span structural aluminium rafters flooding dining terraces and atriums with filtered daylight.",
        image: "/assets/products/roof-skylight.jpg",
      },
      {
        id: "cat-roof-s2",
        headline: "Weatherproof Terrace Glass Canopies",
        subheadline:
          "Engineered overhang glazing with UV-filtering interlayers built for heavy monsoon downpours.",
        image: "/assets/about/terrace.jpg",
      },
    ],
  },
  {
    CategoryID: "cat-wardrobe-pantry",
    name: "Wardrobe & Pantry",
    slug: "wardrobe-pantry",
    tagline: "Slim-frame fluted glass cabinetry, closets, and modular pantries.",
    description:
      "Waterproof, termite-proof anodized aluminium wardrobe and pantry cabinetry with fluted smoked glass doors, soft-close hardware, and LED profiles.",
    coverImage: "/assets/products/wardrobe-pantry.jpg",
    featured: true,
    displayOrder: 8,
    slideshowSpeedMs: 4500,
    specHighlights: ["100% Moisture Proof", "Fluted & Smoked Glass", "Soft-Close Hinges"],
    heroSlides: [
      {
        id: "cat-ward-s1",
        headline: "Slim-Profile Glass Wardrobes & Pantries",
        subheadline:
          "Precision aluminium joinery paired with fluted bronze glass and integrated architectural lighting.",
        image: "/assets/products/wardrobe-pantry.jpg",
      },
      {
        id: "cat-ward-s2",
        headline: "Modular Moisture-Proof Kitchen Joinery",
        subheadline:
          "Lifetime-durable anodized carcasses finished in matte champagne, espresso bronze, or graphite.",
        image: "/assets/products/showroom.jpg",
      },
    ],
  },
];

export const DEFAULT_DESIGNS_CATALOG: DesignItem[] = [
  {
    DesignID: 1,
    Design_Name: "Minimalist Slimline Sliding Door System",
    Design_Description:
      "Architectural grade aluminium sliding door system featuring ultra-narrow 20mm interlock sightlines, stainless steel multi-wheel rollers, and concealed multi-point locking. Multiple track configurations make it ideal for villas, oceanfront balconies, and commercial showrooms.",
    Categories: ["Doors", "Sliding Doors"],
    Design_Colors: ["#1F2937", "#9CA3AF", "#926B46", "#1E3A8A"],
    Design_Sizes: ["2400mm x 2100mm", "3000mm x 2400mm", "Custom Height up to 3600mm"],
    Design_BlogPosts: ["https://innovista.lk/blogs/modern-sliding-doors"],
    Design_Image: [
      "/assets/products/door.jpg",
      "/assets/products/hero-showroom.jpg",
      "/assets/about/pavilion.jpg",
    ],
    Design_CreatedAt: "2025-01-20T10:00:00.000Z",
    price: 345000,
    features: [
      "Ultra-narrow 20mm vertical interlock for panoramic daylight",
      "Heavy-duty 316 stainless steel tandem rollers rated up to 160 kg per leaf",
      "Flush drainage bottom threshold option for seamless indoor-outdoor transition",
      "Supports 5+12A+5 mm tempered Low-E double glazing or acoustic laminated glass",
      "Concealed multi-point mortise locking with anti-lift security blocks",
      "Available in 2-track, 3-track, and corner-free openable assemblies",
    ],
    performance: {
      airtightness: "Class 4",
      watertightness: "Class 3 | 350 Pa",
      soundInsulation: "3 | 38 dB",
      thermalInsulation: "3 | 2.4 W/m²·K",
      windResistance: "CW-PG50 (ASTM Standard)",
      productType: "Slimline Sliding Door · IS-20 Series",
      visibleSurface: "Interlock: 20 mm / Stile: 45 mm",
      wallThickness: "2.0 mm",
      frameThickness: "115 mm (2-Track) / 172 mm (3-Track)",
      sizeRange: "Leaf Width: 800–1800 mm · Height: 2100–3600 mm",
      glassThickness: "5+12A+5 mm Low-E Double Glazed",
      maxLoadBearing: "160 kg / leaf",
    },
    configurations: ["2-2-0", "3-3-0", "4-2-2", "6-3-3"],
    featureTable: DEFAULT_DOOR_FEATURE_TABLE,
    certificationImages: DEFAULT_CERTIFICATION_IMAGES,
    accessoriesHeading: "Door Hardware & Accessory Variants",
    accessoriesTagline: "Select any hardware group or scroll the live variant ribbon to inspect finishes and ratings.",
    accessoriesSlideshowSpeedMs: 4000,
    accessoriesRibbonSpeed: 45,
    accessories: DEFAULT_DOOR_ACCESSORIES,
    relatedProductIds: [9, 2, 4, 7],
  },
  {
    DesignID: 2,
    Design_Name: "Thermally Broken Casement Window Suite",
    Design_Description:
      "High-performance acoustic and thermal casement windows equipped with multi-point espagnolette locking, triple EPDM compression gaskets, and double-glazed argon panes.",
    Categories: ["Windows", "Casement Windows"],
    Design_Colors: ["#1F2937", "#9CA3AF", "#F8FAFC"],
    Design_Sizes: ["1200mm x 1500mm", "1500mm x 1800mm", "Custom Built"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/window.jpg", "/assets/about/facade.jpg"],
    Design_CreatedAt: "2025-02-14T11:00:00.000Z",
    price: 185000,
    features: [
      "Polyamide PA66 GF25 thermal break barrier isolating exterior heat",
      "Triple EPDM co-extruded compression weather seals",
      "Concealed European friction stays opening up to 90 degrees",
      "Multi-point mushroom-cam locking around full sash perimeter",
      "Optional integrated pleated flyscreen track",
    ],
    performance: {
      airtightness: "Class 4",
      watertightness: "Class 4 | 450 Pa",
      soundInsulation: "4 | 41 dB",
      thermalInsulation: "4 | 1.9 W/m²·K",
      windResistance: "CW-PG60 (AAMA Standard)",
      productType: "Thermal Casement Window · IW-68T",
      visibleSurface: "Frame + Sash: 68 mm",
      wallThickness: "1.8 mm",
      frameThickness: "68 mm",
      sizeRange: "Width: 450–900 mm · Height: 600–2100 mm",
      glassThickness: "6+12A+6 mm Tempered Argon",
      maxLoadBearing: "80 kg / sash",
    },
    configurations: ["2-1-1", "3-1-2", "4-2-2"],
    accessoriesHeading: "Window Hardware & Screen Variants",
    accessoriesTagline: "Coastal friction stays, multi-point locks, and pleated screen cassettes configured for casement suites.",
    accessoriesSlideshowSpeedMs: 4000,
    accessoriesRibbonSpeed: 42,
    accessories: DEFAULT_WINDOW_ACCESSORIES,
    relatedProductIds: [10, 1, 5, 3],
  },
  {
    DesignID: 3,
    Design_Name: "Acoustic Frameless Glass Office Partition",
    Design_Description:
      "Frameless 12mm toughened glass interior partition system with sleek anodized aluminium floor and ceiling tracking, custom frosting, and acoustic drop-seals.",
    Categories: ["Partitions", "Office Interior"],
    Design_Colors: ["#1F2937", "#9CA3AF"],
    Design_Sizes: ["Standard height 2800mm", "Modular custom span"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/partition.jpg", "/assets/products/facade-detail.jpg"],
    Design_CreatedAt: "2025-03-01T09:30:00.000Z",
    price: 260000,
    features: [
      "12mm clear toughened or laminated acoustic glass panels",
      "Low-profile 25mm x 25mm anodized perimeter shadow-gap channel",
      "Drop-down acoustic threshold seal on timber or glass doors",
      "Compatible with smart switchable privacy film and manifestation strips",
    ],
    performance: {
      airtightness: "Interior Acoustic Seal",
      watertightness: "Interior Dry Rated",
      soundInsulation: "42 dB (Laminated Acoustic)",
      thermalInsulation: "Interior Envelope",
      windResistance: "Interior Crowd Load 1.5 kN/m",
      productType: "Acoustic Demountable Partition · IP-12",
      visibleSurface: "Channel Sightline: 25 mm",
      wallThickness: "2.2 mm",
      frameThickness: "30 mm / 100 mm Double Glazed",
      sizeRange: "Module Width: 900–1200 mm · Height: up to 3400 mm",
      glassThickness: "12 mm Toughened / 6+0.76PVB+6 mm",
      maxLoadBearing: "95 kg / door leaf",
    },
    configurations: ["3-1-2", "4-1-3", "5-0-5"],
    relatedProductIds: [4, 1, 6, 8],
  },
  {
    DesignID: 4,
    Design_Name: "Commercial Architectural Shopfront Glazing",
    Design_Description:
      "Heavy-duty commercial shopfront system with 100mm box section aluminium framing, tempered laminated safety glass, and overhead hydraulic transom closers.",
    Categories: ["Shop Front", "Commercial Glazing"],
    Design_Colors: ["#1F2937", "#9CA3AF", "#1E3A8A"],
    Design_Sizes: ["Full storefront span", "Custom engineered"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/shopfront.jpg", "/assets/products/facade-detail.jpg"],
    Design_CreatedAt: "2025-03-18T14:15:00.000Z",
    price: 490000,
    features: [
      "100mm x 45mm heavy commercial structural box mullions",
      "Concealed overhead transom door closers tested to 500,000 cycles",
      "Laminated 10.76mm–13.52mm impact safety glass compatibility",
      "Integrated weather-bar threshold and commercial panic exit hardware",
    ],
    relatedProductIds: [3, 1, 5, 7],
  },
  {
    DesignID: 5,
    Design_Name: "Aerofoil Sunshade Facade Louver System",
    Design_Description:
      "Extruded 200mm aerofoil aluminium shading blades in anodized bronze and charcoal finishes reducing solar heat load across commercial and villa facades.",
    Categories: ["Louvers & Sunshades", "Louvers"],
    Design_Colors: ["#926B46", "#1F2937", "#9CA3AF"],
    Design_Sizes: ["150mm blade module", "Custom elevation span"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/louvers.jpg", "/assets/about/facade.jpg"],
    Design_CreatedAt: "2025-04-04T09:00:00.000Z",
    price: 295000,
    clientShowcases: [],
    relatedProductIds: [10, 4, 2, 7],
  },
  {
    DesignID: 6,
    Design_Name: "Frameless Matte-Black Shower Enclosure",
    Design_Description:
      "10mm ultra-clear tempered shower cubicle featuring marine 316 stainless pivot hinges, magnetic water-tight sweeps, and minimalist matte black channels.",
    Categories: ["Bathroom Enclosures", "Bathrooms"],
    Design_Colors: ["#1F2937", "#9CA3AF"],
    Design_Sizes: ["1000mm x 1000mm", "1200mm x 900mm", "Custom niche"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/bathroom.jpg", "/assets/products/showroom.jpg"],
    Design_CreatedAt: "2025-04-12T10:30:00.000Z",
    price: 165000,
    clientShowcases: [],
    relatedProductIds: [3, 8, 1, 2],
  },
  {
    DesignID: 7,
    Design_Name: "Structural Low-E Courtyard Skylight Canopy",
    Design_Description:
      "High-span architectural aluminium rafter roof canopy fitted with double-glazed laminated solar-control glass and concealed internal drainage.",
    Categories: ["Roof & Skylights", "Roof"],
    Design_Colors: ["#1F2937", "#9CA3AF", "#F8FAFC"],
    Design_Sizes: ["3600mm x 3000mm", "Custom engineered span"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/roof-skylight.jpg", "/assets/about/terrace.jpg"],
    Design_CreatedAt: "2025-05-02T11:20:00.000Z",
    price: 680000,
    relatedProductIds: [9, 1, 5, 4],
  },
  {
    DesignID: 8,
    Design_Name: "Fluted Glass Aluminium Wardrobe & Pantry",
    Design_Description:
      "Custom moisture-proof anodized aluminium cabinetry featuring smoked fluted tempered glass doors, concealed LED channels, and soft-close hinges.",
    Categories: ["Wardrobe & Pantry", "Pantry Cupboard", "Wardrobe"],
    Design_Colors: ["#926B46", "#1F2937", "#F8FAFC"],
    Design_Sizes: ["2400mm Modular Tower", "Custom kitchen layout"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/products/wardrobe-pantry.jpg", "/assets/products/showroom.jpg"],
    Design_CreatedAt: "2025-05-19T15:00:00.000Z",
    price: 420000,
    clientShowcases: [],
    relatedProductIds: [6, 3, 1, 9],
  },
  {
    DesignID: 9,
    Design_Name: "Multi-Fold Pavilion Concertina Door Suite",
    Design_Description:
      "Corner-free bi-fold aluminium doors folding cleanly to either jamb to unite interior dining pavilions with poolside terraces.",
    Categories: ["Doors", "Bi-Fold Doors"],
    Design_Colors: ["#1F2937", "#926B46", "#F8FAFC"],
    Design_Sizes: ["3600mm x 2400mm", "Custom 3-8 leaf span"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/about/pavilion.jpg", "/assets/products/door.jpg"],
    Design_CreatedAt: "2025-06-08T10:00:00.000Z",
    price: 540000,
    features: [
      "Non-thermal or thermally broken heavy-duty folding door profiles",
      "Top-hung precision carriage rollers preventing dust build-up on bottom rail",
      "Supports 5+12A+5 mm tempered double glazing",
      "Sash width 500–800 mm · Height 1800–3000 mm · Max 80 kg per leaf",
      "Seamless 3-3-0 to 7-0-7 multi-panel folding configurations",
      "Ideal for patios, terraces, restaurants, and pool pavilions",
    ],
    configurations: ["3-3-0", "4-1-3", "5-5-0", "6-1-5", "6-3-3", "7-0-7"],
    accessoriesHeading: "Bi-Fold Carriage & Flush Hardware",
    accessoriesSlideshowSpeedMs: 4200,
    accessoriesRibbonSpeed: 45,
    accessories: DEFAULT_DOOR_ACCESSORIES,
    relatedProductIds: [1, 7, 2, 4],
  },
  {
    DesignID: 10,
    Design_Name: "Top-Hung Acoustic Awning & Louver Window",
    Design_Description:
      "Weather-shielded projection awning window allowing continuous airflow during tropical rain with stainless friction stays.",
    Categories: ["Windows", "Louvers & Sunshades"],
    Design_Colors: ["#1F2937", "#9CA3AF", "#1E3A8A"],
    Design_Sizes: ["900mm x 1200mm", "1200mm x 1400mm", "Custom Built"],
    Design_BlogPosts: [],
    Design_Image: ["/assets/about/facade.jpg", "/assets/products/window.jpg"],
    Design_CreatedAt: "2025-06-21T08:45:00.000Z",
    price: 155000,
    clientShowcases: [],
    accessoriesHeading: "Awning Stays & Locking Hardware",
    accessoriesSlideshowSpeedMs: 4000,
    accessoriesRibbonSpeed: 40,
    accessories: DEFAULT_WINDOW_ACCESSORIES,
    relatedProductIds: [2, 5, 1, 7],
  },
];

export function slugifyCategoryName(name: string): string {
  const cleaned = (name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "category";
}

/**
 * Classifies a hex color code into one of five architectural finish families.
 */
export function classifyHexColorFamily(
  hex: string
): Exclude<FinishColorFamily, "all"> {
  const clean = (hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) {
    const lower = hex.toLowerCase();
    if (lower.includes("white") || lower.includes("cream")) return "white";
    if (lower.includes("bronze") || lower.includes("gold") || lower.includes("brown"))
      return "bronze";
    if (lower.includes("navy") || lower.includes("blue")) return "navy";
    if (lower.includes("silver") || lower.includes("grey") || lower.includes("gray"))
      return "silver";
    return "charcoal";
  }

  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean.slice(0, 6);

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness >= 225 && max - min < 28) return "white";
  if (b > r + 25 && b > g + 10) return "navy";
  if (r > b + 28 && brightness > 65 && brightness < 210) return "bronze";
  if (brightness < 82) return "charcoal";
  return "silver";
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function singularize(token: string): string {
  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Matches a DesignItem against either a ProductCategory object or category query string.
 */
export function designMatchesCategory(
  design: Pick<DesignItem, "Categories" | "Design_Name">,
  target: ProductCategory | string
): boolean {
  const targetSlug =
    typeof target === "string" ? target : target.slug || target.name;
  const targetName = typeof target === "string" ? target : target.name;

  const targetTokens = new Set<string>();
  for (const candidate of [targetSlug, targetName]) {
    const norm = normalizeToken(candidate);
    if (norm) {
      targetTokens.add(norm);
      targetTokens.add(singularize(norm));
    }
    candidate
      .split(/[\s/&,-]+/)
      .map(normalizeToken)
      .filter((part) => part.length > 2)
      .forEach((part) => {
        targetTokens.add(part);
        targetTokens.add(singularize(part));
      });
  }

  const designCats = Array.isArray(design.Categories) ? design.Categories : [];
  for (const cat of designCats) {
    const normCat = normalizeToken(cat);
    const singCat = singularize(normCat);
    if (targetTokens.has(normCat) || targetTokens.has(singCat)) {
      return true;
    }
    for (const tok of targetTokens) {
      if (tok.length >= 4 && (normCat.includes(tok) || tok.includes(singCat))) {
        return true;
      }
    }
  }

  return false;
}

export function findCategoryByParam(
  categories: ProductCategory[],
  param: string | null | undefined
): ProductCategory | undefined {
  if (!param) return undefined;
  const cleaned = decodeURIComponent(param).trim();
  const targetSlug = slugifyCategoryName(cleaned);
  const targetNorm = normalizeToken(cleaned);

  return categories.find((cat) => {
    const catSlug = cat.slug.toLowerCase();
    const catNorm = normalizeToken(cat.name);
    return (
      catSlug === cleaned.toLowerCase() ||
      catSlug === targetSlug ||
      catNorm === targetNorm ||
      singularize(catNorm) === singularize(targetNorm)
    );
  });
}

export function createDefaultCategorySlides(
  name: string,
  tagline: string,
  coverImage: string
): HeroSlide[] {
  const safeImg = sanitizeAboutImage(coverImage, "/assets/products/hero-showroom.jpg");
  return [
    {
      id: `cat-slide-${Date.now()}-1`,
      headline: `${name} Architectural Series`,
      subheadline:
        tagline ||
        "Precision extruded aluminium and tempered glass engineered for residential and commercial projects.",
      image: safeImg,
    },
    {
      id: `cat-slide-${Date.now()}-2`,
      headline: `Bespoke ${name} Fabrication`,
      subheadline:
        "Custom finishes, tight sightlines, and site-tested installation across Sri Lanka.",
      image: "/assets/products/hero-showroom.jpg",
    },
  ];
}

export function normalizeProductCategory(
  raw: Partial<ProductCategory>,
  index = 0
): ProductCategory {
  const name = (raw.name || "").trim() || `Category ${index + 1}`;
  const coverImage = sanitizeAboutImage(
    raw.coverImage,
    PRODUCT_ASSET_PRESETS[index % PRODUCT_ASSET_PRESETS.length].url
  );
  const tagline =
    (raw.tagline || "").trim() ||
    "Engineered architectural aluminium and structural glazing systems.";
  const description =
    (raw.description || "").trim() ||
    "Precision-fabricated aluminium systems designed for lasting durability, weather sealing, and clean architectural lines.";
  const defaultSlides = createDefaultCategorySlides(name, tagline, coverImage);

  return {
    CategoryID: (raw.CategoryID || "").trim() || `cat-${slugifyCategoryName(name)}-${index + 1}`,
    name,
    slug: (raw.slug || "").trim() ? slugifyCategoryName(raw.slug!) : slugifyCategoryName(name),
    tagline,
    description,
    coverImage,
    featured: raw.featured !== undefined ? Boolean(raw.featured) : true,
    displayOrder:
      typeof raw.displayOrder === "number" && Number.isFinite(raw.displayOrder)
        ? raw.displayOrder
        : index + 1,
    slideshowSpeedMs: clampSlideshowSpeedMs(
      raw.slideshowSpeedMs ?? 4500,
      4500
    ),
    heroSlides: normalizeHeroSlides(raw.heroSlides, defaultSlides),
    specHighlights: Array.isArray(raw.specHighlights)
      ? raw.specHighlights.map((s) => s.trim()).filter(Boolean).slice(0, 4)
      : ["Custom Dimensions", "Anodized & Powder Coat", "Architectural Tolerance"],
  };
}

const VALID_WHY_ICONS: WhyChooseIcon[] = [
  "precision",
  "shield",
  "acoustic",
  "weather",
  "craft",
  "speed",
];

const VALID_WHY_ACCENTS: WhyChooseAccent[] = ["navy", "blue", "cyan", "red"];

export function normalizeWhyChooseItems(
  rawItems: Partial<WhyChooseItem>[] | null | undefined,
  defaults: WhyChooseItem[] = DEFAULT_WHY_CHOOSE_ITEMS
): WhyChooseItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return defaults.map((item) => ({ ...item }));
  }

  const normalized = rawItems
    .map((item, idx) => {
      const title = (item?.title || "").trim();
      const metric = (item?.metric || "").trim();
      if (!title && !metric) return null;
      const rawPct = Number(item?.percent);
      const percent = Number.isFinite(rawPct)
        ? Math.min(100, Math.max(10, Math.round(rawPct)))
        : 90;
      const icon: WhyChooseIcon = VALID_WHY_ICONS.includes(
        item?.icon as WhyChooseIcon
      )
        ? (item.icon as WhyChooseIcon)
        : "precision";
      const accent: WhyChooseAccent = VALID_WHY_ACCENTS.includes(
        item?.accent as WhyChooseAccent
      )
        ? (item.accent as WhyChooseAccent)
        : VALID_WHY_ACCENTS[idx % VALID_WHY_ACCENTS.length];

      return {
        id: (item?.id || "").trim() || `why-${idx + 1}`,
        metric: metric || "100%",
        title: title || "Quality Standard",
        percent,
        icon,
        accent,
      };
    })
    .filter((item): item is WhyChooseItem => item !== null);

  return normalized.length > 0
    ? normalized
    : defaults.map((item) => ({ ...item }));
}

export function normalizeProductLandingCms(
  raw: Partial<ProductLandingCms> | null | undefined,
  defaults: ProductLandingCms = DEFAULT_PRODUCT_LANDING_CMS
): ProductLandingCms {
  return {
    slideshowSpeedMs: clampSlideshowSpeedMs(
      raw?.slideshowSpeedMs ?? defaults.slideshowSpeedMs,
      DEFAULT_SLIDESHOW_SPEED_MS
    ),
    categoriesHeading: raw?.categoriesHeading?.trim() || defaults.categoriesHeading,
    categoriesTagline: raw?.categoriesTagline?.trim() ?? defaults.categoriesTagline,
    catalogHeading: raw?.catalogHeading?.trim() || defaults.catalogHeading,
    catalogTagline: raw?.catalogTagline?.trim() ?? defaults.catalogTagline,
    whyChooseHeading:
      raw?.whyChooseHeading?.trim() || defaults.whyChooseHeading || "Why Choose Us",
    whyChooseUs: normalizeWhyChooseItems(raw?.whyChooseUs, defaults.whyChooseUs),
    heroSlides: normalizeHeroSlides(raw?.heroSlides, defaults.heroSlides),
  };
}

export function sanitizeDesignImages(images: string[] | undefined, categoryFallback?: string): string[] {
  const fallback = categoryFallback || "/assets/products/door.jpg";
  if (!Array.isArray(images) || images.length === 0) {
    return [fallback];
  }
  const cleaned = images
    .map((img) => sanitizeAboutImage(img, fallback))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : [fallback];
}

export function createDefaultFeatures(designName: string, categories: string[]): string[] {
  const catLabel = categories[0] || "Architectural Aluminium";
  return [
    `Precision-extruded ${catLabel.toLowerCase()} system engineered for lasting structural performance`,
    `Slim sightlines paired with a clean architectural aesthetic for ${designName}`,
    "Supports single, double-glazed Low-E, and acoustic laminated glass options",
    "Marine-grade powder coating or anodized finish with UV & salt-spray protection",
    "Custom aperture sizing, panel configurations, and European multi-point hardware",
  ];
}

export function createDefaultDownloads(designName: string): ProductDownloadDoc[] {
  return [
    {
      id: "dl-pdf",
      title: `${designName} Technical Model Spec (PDF)`,
      fileType: "PDF",
      url: "#spec-pdf",
    },
    {
      id: "dl-cad",
      title: `${designName} Section CAD Package (DXF)`,
      fileType: "CAD",
      url: "#spec-cad",
    },
  ];
}

export function createEmptyFeatureTable(): ProductFeatureTable {
  return {
    title: "",
    headers: [],
    rows: [],
  };
}

export function normalizeFeatureTable(
  raw?: Partial<ProductFeatureTable> | null
): ProductFeatureTable {
  if (!raw || !Array.isArray(raw.headers)) {
    return createEmptyFeatureTable();
  }
  const headers = raw.headers
    .map((h) => String(h ?? "").trim())
    .filter((h, idx, arr) => h !== "" || idx < arr.length - 1);

  if (headers.length === 0) {
    return createEmptyFeatureTable();
  }

  const colCount = headers.length;
  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .map((row) => {
          const arr = Array.isArray(row) ? row : [];
          return Array.from({ length: colCount }, (_, i) =>
            String(arr[i] ?? "").trim()
          );
        })
        .filter((row) => row.some((cell) => cell !== ""))
    : [];

  return {
    title: String(raw.title ?? "").trim(),
    headers: headers.map((h, idx) => h || `Column ${idx + 1}`),
    rows,
  };
}

export function parseFeatureTableFromExcelArrayBuffer(
  buffer: ArrayBuffer
): ProductFeatureTable {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return createEmptyFeatureTable();
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const nonEmptyRows = rawMatrix
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []))
    .filter((row) => row.some((cell) => cell !== ""));

  if (nonEmptyRows.length === 0) {
    return createEmptyFeatureTable();
  }

  const maxCols = Math.max(...nonEmptyRows.map((r) => r.length));
  if (maxCols === 0) {
    return createEmptyFeatureTable();
  }

  // Trim trailing all-empty columns across all rows
  let lastNonEmptyCol = maxCols - 1;
  while (
    lastNonEmptyCol > 0 &&
    nonEmptyRows.every((r) => (r[lastNonEmptyCol] ?? "") === "")
  ) {
    lastNonEmptyCol -= 1;
  }

  const colCount = lastNonEmptyCol + 1;
  const headerRow = Array.from({ length: colCount }, (_, i) => {
    const val = nonEmptyRows[0][i] ?? "";
    return val || `Column ${i + 1}`;
  });

  const bodyRows = nonEmptyRows
    .slice(1)
    .map((row) =>
      Array.from({ length: colCount }, (_, i) => (row[i] ?? "").trim())
    )
    .filter((row) => row.some((cell) => cell !== ""));

  return {
    title: firstSheetName !== "Sheet1" ? firstSheetName : "",
    headers: headerRow,
    rows: bodyRows,
  };
}

export function exportFeatureTableTemplateExcel(
  filename = "innovista-product-features-template.xlsx"
): void {
  if (typeof window === "undefined") return;
  const sheetData = [
    DEFAULT_DOOR_FEATURE_TABLE.headers,
    ...DEFAULT_DOOR_FEATURE_TABLE.rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "System Specs");
  XLSX.writeFile(wb, filename);
}

export function normalizeCertificationImages(
  raw?: Partial<CertificationImageItem>[] | null
): CertificationImageItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && (item.image || item.title))
    .slice(0, MAX_CERTIFICATION_IMAGES)
    .map((item, idx) => ({
      id: (item.id || "").trim() || `certimg-${idx + 1}`,
      title: (item.title || "").trim() || `Certificate ${idx + 1}`,
      image: sanitizeAboutImage(item.image, "/assets/about/facade.jpg"),
    }));
}

export function normalizeAccessories(
  raw?: Partial<ProductAccessoryGroup>[] | null
): ProductAccessoryGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((acc) => acc && (acc.name?.trim() || (acc.variants && acc.variants.length > 0)))
    .map((acc, idx) => {
      const variants: AccessoryVariantItem[] = Array.isArray(acc.variants)
        ? acc.variants
            .filter((v) => v && (v.name?.trim() || v.code?.trim() || v.image?.trim()))
            .map((v, vIdx) => ({
              id: (v.id || "").trim() || `var-${idx + 1}-${vIdx + 1}`,
              name: (v.name || "").trim() || `Variant ${vIdx + 1}`,
              code: (v.code || "").trim(),
              finish: (v.finish || "").trim(),
              spec: (v.spec || "").trim(),
              image: sanitizeAboutImage(v.image, "/assets/products/door.jpg"),
            }))
        : [];
      const rawBrandLogo = (acc.brandLogo || "").trim();
      const brandLogo = rawBrandLogo ? sanitizeAboutImage(rawBrandLogo, "") : "";
      return {
        id: (acc.id || "").trim() || `acc-${idx + 1}`,
        name: (acc.name || "").trim() || `Accessory ${idx + 1}`,
        subtitle: (acc.subtitle || "").trim(),
        brandName: (acc.brandName || "").trim(),
        brandLogo,
        image: sanitizeAboutImage(
          acc.image || variants[0]?.image,
          "/assets/products/door.jpg"
        ),
        variants,
      };
    });
}

export interface ShuffleDeckCardEntry<T> {
  item: T;
  originalIndex: number;
  slotIndex: number;
}

/**
 * Computes stacked deck order `[front, 2nd, 3rd, ...]` for card-shuffle decks
 * without mutating the source array.
 */
export function buildAccessoryShuffleDeckOrder<T>(
  items: T[],
  activeIndex: number,
  maxVisible = 3
): ShuffleDeckCardEntry<T>[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const total = items.length;
  const safeStart = ((activeIndex % total) + total) % total;
  const count = Math.min(total, Math.max(1, maxVisible));
  const result: ShuffleDeckCardEntry<T>[] = [];
  for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
    const originalIndex = (safeStart + slotIndex) % total;
    result.push({
      item: items[originalIndex],
      originalIndex,
      slotIndex,
    });
  }
  return result;
}

export interface FlattenedVariantSlideItem {
  variant: AccessoryVariantItem;
  accessory: ProductAccessoryGroup;
  accessoryIndex: number;
  variantIndex: number;
}

export function flattenAccessoryVariants(
  accessories: ProductAccessoryGroup[]
): FlattenedVariantSlideItem[] {
  const result: FlattenedVariantSlideItem[] = [];
  accessories.forEach((accessory, accessoryIndex) => {
    if (accessory.variants && accessory.variants.length > 0) {
      accessory.variants.forEach((variant, variantIndex) => {
        result.push({ variant, accessory, accessoryIndex, variantIndex });
      });
    } else {
      result.push({
        variant: {
          id: `${accessory.id}-main`,
          name: accessory.name,
          code: "",
          finish: "",
          spec: accessory.subtitle,
          image: accessory.image,
        },
        accessory,
        accessoryIndex,
        variantIndex: 0,
      });
    }
  });
  return result;
}

export function hasPerformanceSpec(
  perf?: Partial<ProductPerformanceSpec> | null
): boolean {
  if (!perf) return false;
  return Object.values(perf).some((val) => typeof val === "string" && val.trim() !== "");
}

export function createEmptyPerformanceSpec(): ProductPerformanceSpec {
  return {
    airtightness: "",
    watertightness: "",
    soundInsulation: "",
    thermalInsulation: "",
    windResistance: "",
    productType: "",
    visibleSurface: "",
    wallThickness: "",
    frameThickness: "",
    sizeRange: "",
    glassThickness: "",
    maxLoadBearing: "",
  };
}

export function createEmptyDesignDraft(): DesignItem {
  return {
    DesignID: 0,
    Design_Name: "",
    Design_Description: "",
    Categories: [],
    Design_Colors: ["#1F2937", "#9CA3AF"],
    Design_Sizes: ["Custom Engineered"],
    Design_BlogPosts: [],
    Design_Image: [],
    Design_CreatedAt: new Date().toISOString(),
    price: 95000,
    features: [],
    featureTable: createEmptyFeatureTable(),
    performance: createEmptyPerformanceSpec(),
    configurations: [],
    downloads: [],
    certifications: [],
    certificationImages: [],
    accessoriesHeading: "Hardware & Accessory Variants",
    accessoriesTagline: "",
    accessoriesSlideshowSpeedMs: DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
    accessoriesRibbonSpeed: DEFAULT_ACCESSORIES_RIBBON_SPEED,
    accessories: [],
    faqs: [],
    advantages: [],
    customizations: [],
    partnerServices: [],
    partnerServiceBannerImage: "",
    clientShowcases: [],
    relatedProductIds: [],
  };
}

export function normalizeDesignItem(
  raw: Partial<DesignItem>,
  fallbackId?: number | string
): DesignItem {
  const id = raw.DesignID ?? fallbackId ?? Date.now();
  const name = (raw.Design_Name || "").trim() || "Architectural Aluminium System";
  const categories = Array.isArray(raw.Categories)
    ? raw.Categories.map((c) => String(c).trim()).filter(Boolean)
    : [];
  const colors = Array.isArray(raw.Design_Colors)
    ? raw.Design_Colors.map((c) => String(c).trim()).filter(Boolean)
    : ["#1F2937", "#9CA3AF"];
  const sizes = Array.isArray(raw.Design_Sizes)
    ? raw.Design_Sizes.map((s) => String(s).trim()).filter(Boolean)
    : ["Custom Engineered"];
  const blogPosts = Array.isArray(raw.Design_BlogPosts)
    ? raw.Design_BlogPosts.map((b) => String(b).trim()).filter(Boolean)
    : [];

  const perfRaw = raw.performance;
  let performance: ProductPerformanceSpec;
  if (perfRaw === undefined) {
    performance = {
      ...DEFAULT_PERFORMANCE_SPEC,
      productType: `${categories[0] || "Architectural"} · ${name}`,
      sizeRange: sizes.join(" · ") || DEFAULT_PERFORMANCE_SPEC.sizeRange,
    };
  } else if (!hasPerformanceSpec(perfRaw)) {
    performance = createEmptyPerformanceSpec();
  } else {
    performance = {
      airtightness: perfRaw?.airtightness?.trim() || "",
      watertightness: perfRaw?.watertightness?.trim() || "",
      soundInsulation: perfRaw?.soundInsulation?.trim() || "",
      thermalInsulation: perfRaw?.thermalInsulation?.trim() || "",
      windResistance: perfRaw?.windResistance?.trim() || "",
      productType: perfRaw?.productType?.trim() || "",
      visibleSurface: perfRaw?.visibleSurface?.trim() || "",
      wallThickness: perfRaw?.wallThickness?.trim() || "",
      frameThickness: perfRaw?.frameThickness?.trim() || "",
      sizeRange: perfRaw?.sizeRange?.trim() || "",
      glassThickness: perfRaw?.glassThickness?.trim() || "",
      maxLoadBearing: perfRaw?.maxLoadBearing?.trim() || "",
    };
  }

  // Respect explicit empty arrays ([]) so admin-removed or unconfigured sections stay hidden!
  const features = Array.isArray(raw.features)
    ? raw.features.map((f) => String(f || "").trim()).filter(Boolean)
    : createDefaultFeatures(name, categories);

  const featureTable = normalizeFeatureTable(raw.featureTable);

  const configurations = Array.isArray(raw.configurations)
    ? raw.configurations.map((c) => String(c || "").trim()).filter(Boolean)
    : ["3-3-0", "4-1-3", "5-5-0", "6-1-5", "6-3-3", "7-0-7"];

  const downloads: ProductDownloadDoc[] = Array.isArray(raw.downloads)
    ? raw.downloads
        .filter((d) => d && (d.title?.trim() || d.url?.trim()))
        .map((d, idx) => ({
          id: (d.id || "").trim() || `dl-${idx + 1}`,
          title: (d.title || "").trim() || `${name} Document ${idx + 1}`,
          fileType: (d.fileType === "CAD" ? "CAD" : "PDF") as "PDF" | "CAD",
          url: (d.url || "").trim() || (d.fileType === "CAD" ? "#spec-cad" : "#spec-pdf"),
        }))
    : createDefaultDownloads(name);

  const certifications: ProductCertification[] = Array.isArray(raw.certifications)
    ? raw.certifications
        .filter((c) => c && (c.badgeCode?.trim() || c.standardLabel?.trim()))
        .map((c, idx) => ({
          id: (c.id || "").trim() || `cert-${idx + 1}`,
          standardLabel: (c.standardLabel || "").trim() || "Energy Performance Rating",
          uFactor: (c.uFactor || "").trim() || "2.30 / 0.41",
          shgc: (c.shgc || "").trim() || "0.31",
          energyRating: (c.energyRating || "").trim() || "08",
          visibleTransmittance: (c.visibleTransmittance || "").trim() || "0.50",
          specSummary: (c.specSummary || "").trim() || "Double Glazed Low-E Argon Filled",
          badgeCode: (c.badgeCode || "").trim() || "EN / ASTM",
        }))
    : DEFAULT_PRODUCT_CERTIFICATIONS.map((c) => ({ ...c }));

  const certificationImages = normalizeCertificationImages(raw.certificationImages);

  const accessories = normalizeAccessories(raw.accessories);

  const faqs: ProductFaqItem[] = Array.isArray(raw.faqs)
    ? raw.faqs
        .filter((f) => f?.question?.trim())
        .map((f, idx) => ({
          id: (f.id || "").trim() || `faq-${idx + 1}`,
          question: f.question.trim(),
          answer: (f.answer || "").trim() || "Contact our engineering team for full site specs.",
        }))
    : DEFAULT_PRODUCT_FAQS.map((f) => ({ ...f }));

  const advantages: ProductAdvantageItem[] = Array.isArray(raw.advantages)
    ? raw.advantages
        .filter((a) => a?.title?.trim())
        .map((a, idx) => ({
          id: (a.id || "").trim() || `adv-${idx + 1}`,
          title: a.title.trim(),
          description: (a.description || "").trim(),
          image: sanitizeAboutImage(
            a.image,
            DEFAULT_PRODUCT_ADVANTAGES[idx % DEFAULT_PRODUCT_ADVANTAGES.length].image
          ),
        }))
    : DEFAULT_PRODUCT_ADVANTAGES.map((a) => ({ ...a }));

  const customizations: ProductCustomizationItem[] = Array.isArray(raw.customizations)
    ? raw.customizations
        .filter((c) => c?.title?.trim())
        .map((c, idx) => ({
          id: (c.id || "").trim() || `cust-${idx + 1}`,
          category: c.category || "color",
          title: c.title.trim(),
          description: (c.description || "").trim(),
        }))
    : DEFAULT_PRODUCT_CUSTOMIZATIONS.map((c) => ({ ...c }));

  const partnerServices: ProductPartnerService[] = Array.isArray(raw.partnerServices)
    ? raw.partnerServices
        .filter((s) => s?.title?.trim() || s?.description?.trim())
        .map((s, idx) => ({
          id: (s.id || "").trim() || `srv-${idx + 1}`,
          step: (s.step || "").trim() || String(idx + 1).padStart(2, "0"),
          title: (s.title || "").trim() || "Engineering Support",
          description: (s.description || "").trim(),
        }))
    : DEFAULT_PARTNER_SERVICES.map((s) => ({ ...s }));

  const partnerServiceBannerImage = raw.partnerServiceBannerImage?.trim()
    ? sanitizeAboutImage(raw.partnerServiceBannerImage, "/assets/about/facade.jpg")
    : "/assets/about/facade.jpg";

  const clientShowcases: ProductClientShowcase[] = Array.isArray(raw.clientShowcases)
    ? raw.clientShowcases
        .filter((s) => s?.location?.trim())
        .map((s, idx) => ({
          id: (s.id || "").trim() || `sc-${idx + 1}`,
          location: s.location.trim(),
          title: (s.title || "").trim() || `${name} Installation`,
          image: sanitizeAboutImage(
            s.image,
            DEFAULT_CLIENT_SHOWCASES[idx % DEFAULT_CLIENT_SHOWCASES.length].image
          ),
        }))
    : DEFAULT_CLIENT_SHOWCASES.map((s) => ({ ...s }));

  const relatedProductIds = Array.isArray(raw.relatedProductIds)
    ? Array.from(
        new Set(
          raw.relatedProductIds
            .filter((rid) => rid !== null && rid !== undefined && String(rid).trim() !== "")
            .filter((rid) => String(rid) !== String(id))
        )
      )
    : [];

  return {
    DesignID: id,
    Design_Name: name,
    Design_Description:
      (raw.Design_Description || "").trim() ||
      "Custom-engineered architectural aluminium and glass system built to exact site dimensions.",
    Categories: categories.length > 0 ? categories : ["Architectural Systems"],
    Design_Colors: colors,
    Design_Sizes: sizes,
    Design_BlogPosts: blogPosts,
    Design_Image: sanitizeDesignImages(raw.Design_Image),
    Design_CreatedAt: raw.Design_CreatedAt || new Date().toISOString(),
    price: typeof raw.price === "number" && Number.isFinite(raw.price) ? raw.price : Number(raw.price) || 0,
    features,
    featureTable,
    performance,
    configurations,
    downloads,
    certifications,
    certificationImages,
    accessoriesHeading: (raw.accessoriesHeading || "").trim() || "Hardware & Accessory Variants",
    accessoriesTagline: (raw.accessoriesTagline || "").trim(),
    accessoriesSlideshowSpeedMs: clampSlideshowSpeedMs(
      raw.accessoriesSlideshowSpeedMs ?? DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS,
      DEFAULT_ACCESSORIES_SLIDESHOW_SPEED_MS
    ),
    accessoriesRibbonSpeed: clampRibbonSpeed(
      raw.accessoriesRibbonSpeed ?? DEFAULT_ACCESSORIES_RIBBON_SPEED,
      DEFAULT_ACCESSORIES_RIBBON_SPEED
    ),
    accessories,
    faqs,
    advantages,
    customizations,
    partnerServices,
    partnerServiceBannerImage,
    clientShowcases,
    relatedProductIds,
  };
}

/**
 * Resolves related products for a given DesignItem:
 * 1. Explicit admin-linked `relatedProductIds` (excluding self, ordered as linked).
 * 2. Fills remaining slots up to `limit` with same-category designs (if needed).
 */
export function resolveRelatedDesigns(
  design: DesignItem,
  allDesigns: DesignItem[],
  categories: ProductCategory[],
  limit = 4
): DesignItem[] {
  const selfId = String(design.DesignID);
  const byId = new Map(allDesigns.map((d) => [String(d.DesignID), d]));
  const picked: DesignItem[] = [];
  const seenIds = new Set<string>([selfId]);

  if (Array.isArray(design.relatedProductIds)) {
    for (const relId of design.relatedProductIds) {
      const key = String(relId);
      if (seenIds.has(key)) continue;
      const found = byId.get(key);
      if (found) {
        picked.push(found);
        seenIds.add(key);
      }
      if (picked.length >= limit) return picked;
    }
  }

  // Fill remaining slots with designs sharing a category
  const primaryCategories = design.Categories || [];
  for (const candidate of allDesigns) {
    const key = String(candidate.DesignID);
    if (seenIds.has(key)) continue;
    const sharesCat = primaryCategories.some((catName) => {
      const matchedCat = findCategoryByParam(categories, catName);
      return designMatchesCategory(candidate, matchedCat || catName);
    });
    if (sharesCat) {
      picked.push(candidate);
      seenIds.add(key);
      if (picked.length >= limit) return picked;
    }
  }

  // If still short, pick remaining catalog designs
  for (const candidate of allDesigns) {
    const key = String(candidate.DesignID);
    if (seenIds.has(key)) continue;
    picked.push(candidate);
    seenIds.add(key);
    if (picked.length >= limit) break;
  }

  return picked;
}

export function triggerDesignSpecDownload(design: DesignItem, doc: ProductDownloadDoc): void {
  if (typeof window === "undefined") return;
  if (doc.url && !doc.url.startsWith("#")) {
    const a = document.createElement("a");
    a.href = doc.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const normalized = normalizeDesignItem(design);
  const perf = normalized.performance!;
  const lines = [
    `INNOVISTA ARCHITECTURAL SYSTEMS - TECHNICAL SPECIFICATION SHEET`,
    `================================================================`,
    `System Name: ${normalized.Design_Name}`,
    `Categories: ${normalized.Categories.join(", ")}`,
    `Document: ${doc.title} (${doc.fileType})`,
    ``,
    `OVERVIEW:`,
    normalized.Design_Description,
    ``,
    `KEY FEATURES:`,
    ...(normalized.features || []).map((f, idx) => `  ${idx + 1}. ${f}`),
    ``,
    `PERFORMANCE DATA:`,
    `  - Airtightness:      ${perf.airtightness}`,
    `  - Water-tightness:   ${perf.watertightness}`,
    `  - Sound Insulation:  ${perf.soundInsulation}`,
    `  - Thermal Value:     ${perf.thermalInsulation}`,
    `  - Wind Resistance:   ${perf.windResistance}`,
    `  - Visible Surface:   ${perf.visibleSurface}`,
    `  - Wall Thickness:    ${perf.wallThickness}`,
    `  - Frame Thickness:   ${perf.frameThickness}`,
    `  - Size Range:        ${perf.sizeRange}`,
    `  - Glass Thickness:   ${perf.glassThickness}`,
    `  - Max Load Bearing:  ${perf.maxLoadBearing}`,
    ``,
    `AVAILABLE CONFIGURATIONS: ${(normalized.configurations || []).join(", ")}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${slugifyCategoryName(normalized.Design_Name)}-${doc.fileType.toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function createInitialFilterState(categorySlug = "all"): ProductFilterState {
  return {
    searchQuery: "",
    categorySlug,
    colorFamily: "all",
    sizeFilter: "all",
    maxPrice: null,
    sortBy: "featured",
  };
}

export function filterAndSortDesigns(
  designs: DesignItem[],
  categories: ProductCategory[],
  filter: ProductFilterState
): DesignItem[] {
  const query = filter.searchQuery.trim().toLowerCase();
  const activeCat =
    filter.categorySlug && filter.categorySlug !== "all"
      ? findCategoryByParam(categories, filter.categorySlug) || filter.categorySlug
      : null;

  const filtered = designs.filter((item) => {
    if (activeCat && !designMatchesCategory(item, activeCat)) {
      return false;
    }

    if (query) {
      const searchable = [
        item.Design_Name,
        item.Design_Description,
        ...(item.Categories || []),
        ...(item.Design_Sizes || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    if (filter.colorFamily !== "all") {
      const colors = item.Design_Colors || [];
      const matchesColor = colors.some(
        (hex) => classifyHexColorFamily(hex) === filter.colorFamily
      );
      if (!matchesColor) return false;
    }

    if (filter.sizeFilter !== "all") {
      const sizesText = (item.Design_Sizes || []).join(" ").toLowerCase();
      const isCustom =
        sizesText.includes("custom") ||
        sizesText.includes("engineered") ||
        sizesText.includes("modular");
      if (filter.sizeFilter === "custom" && !isCustom) return false;
      if (filter.sizeFilter === "standard" && isCustom && !sizesText.includes("mm"))
        return false;
    }

    if (typeof filter.maxPrice === "number" && filter.maxPrice > 0) {
      const itemPrice = typeof item.price === "number" ? item.price : 0;
      if (itemPrice > filter.maxPrice) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (filter.sortBy) {
    case "price-asc":
      sorted.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
      break;
    case "price-desc":
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case "name-asc":
      sorted.sort((a, b) => a.Design_Name.localeCompare(b.Design_Name));
      break;
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.Design_CreatedAt || 0).getTime() -
          new Date(a.Design_CreatedAt || 0).getTime()
      );
      break;
    case "featured":
    default:
      break;
  }

  return sorted;
}

export function countActiveFilters(
  filter: ProductFilterState,
  ignoreCategory = false
): number {
  let count = 0;
  if (filter.searchQuery.trim()) count += 1;
  if (!ignoreCategory && filter.categorySlug !== "all") count += 1;
  if (filter.colorFamily !== "all") count += 1;
  if (filter.sizeFilter !== "all") count += 1;
  if (filter.maxPrice !== null) count += 1;
  if (filter.sortBy !== "featured") count += 1;
  return count;
}
