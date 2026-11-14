import {
  DEFAULT_ABOUT_SECTIONS,
  DEFAULT_CLIENTS,
  DEFAULT_CLIENTS_RIBBON_SPEED,
  DEFAULT_CLIENT_FEEDBACKS,
  DEFAULT_DIRECTOR_MESSAGE,
  DEFAULT_FEEDBACK_SPEED_MS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_JOURNEY_MILESTONES,
  DEFAULT_JOURNEY_SPEED_MS,
  DEFAULT_PARTNERS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  DEFAULT_SLIDESHOW_SPEED_MS,
  DEFAULT_TEAM_MEMBERS,
} from "../utils/aboutContentHelpers.ts";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers.ts";
import { DEFAULT_PAGE_ADS_CMS } from "../utils/pageAdsHelpers.ts";
import {
  CONTACT_DEPARTMENTS,
  CONTACT_LOCATIONS,
  ENGINEERING_GUIDELINES,
  NEWS_ARTICLES,
  RELATED_PORTALS,
  RESOURCE_ATTACHMENTS,
  RESOURCE_FAQS,
  normalizeRelatedPortals,
  type RelatedPortalItem,
} from "../utils/siteContentHelpers.ts";
import {
  DEFAULT_BLOGGER_CONFIG,
  DEFAULT_BLOG_POSTS,
  type BlogPostItem,
} from "../utils/blogBloggerHelpers.ts";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
} from "../utils/footerConsultationHelpers.ts";
import {
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_CHATBOT_FAQS,
  type ChatbotFaqItem,
} from "../utils/chatbotHelpers.ts";
import {
  SITE_VISIT_SLOT_TEMPLATES,
  type ManagedSiteVisitDateConfig,
  type ManagedSiteVisitSlot,
  type SiteVisitBooking,
} from "../utils/siteVisitSchedulerHelpers.ts";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  normalizeHomeSlideshowCms,
} from "../utils/homeSlideshowHelpers.ts";
import {
  DEFAULT_HOME_SERVICES_CMS,
  normalizeHomeServicesCms,
} from "../utils/homeServicesHelpers.ts";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  normalizeHomeFeaturedProductsCms,
} from "../utils/homeTopPicksHelpers.ts";
import {
  DEFAULT_CUSTOMER_FEEDBACKS,
  normalizeCustomerFeedbackList,
  type CustomerFeedbackRecord,
} from "../utils/customerFeedbackHelpers.ts";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
} from "../utils/mediaAssetHelpers.ts";
import { getLocalIsoDateOffset } from "../utils/customerPortalHelpers.ts";

export interface MemoryUserRecord {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  purchaseGoods: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryMediaAssetRecord {
  id: number;
  kind: string;
  sourceType: string;
  title: string | null;
  originalName: string | null;
  storageKey: string | null;
  publicUrl: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  altText: string | null;
  entityScope: string | null;
  uploadedByUserId: number | null;
  createdAt: Date;
}

export interface MemoryProjectRecord {
  ProjectID: number;
  Project_Title: string;
  Project_Description: string;
  Project_Images: string[];
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Client_Number: string;
  Client_Company: string;
  Project_CreatedAt: string;
  Project_FinishedDate: string | null;
  Budget: number;
}

export interface MemoryOrderRecord {
  OrderID: string;
  Order_Date: string;
  Order_Status: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number: string;
  Customer: {
    Cus_CompanyName: string;
    Cus_Logo: string;
    Purchase_Goods: string[];
  };
  Designs: Array<{
    Design: {
      Design_Name: string;
      Design_Image: string;
    };
  }>;
}

export interface MemoryRfqAttachmentRecord {
  id: number;
  rfqId: number;
  mediaAssetId: number | null;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number | null;
  createdAt: Date;
}

export interface MemoryRfqRecord {
  id: number;
  customerUserId: number | null;
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  clientWebsite: string | null;
  projectTitle: string;
  location: string;
  projectType: string;
  projectReferenceNumber: string | null;
  projectDescription: string;
  installationConditions: string | null;
  siteConstraints: string | null;
  standards: string | null;
  qualityExpectations: string | null;
  materialBrand: string | null;
  colorCode: string | null;
  additionalFeatures: string | null;
  interiorStyle: string | null;
  paymentConditions: string | null;
  budget: string | null;
  latestDeliveryDate: string | null;
  proposedVisitDates: string | null;
  siteAddress: string | null;
  googleMapsLink: string | null;
  status: string;
  createdAt: Date;
  attachments: MemoryRfqAttachmentRecord[];
}

export interface MemoryNotificationRecord {
  id: string;
  NotificationsID: string;
  Notifications_Title: string;
  Notifications_Body: string;
  Date_Timestamp: string;
  isRead: boolean;
}

export interface MemoryStoreState {
  initialized: boolean;
  nextUserId: number;
  nextMediaId: number;
  nextProjectId: number;
  nextFeedbackId: number;
  nextRfqId: number;
  nextRfqAttachmentId: number;
  users: MemoryUserRecord[];
  mediaAssets: MemoryMediaAssetRecord[];
  categories: ProductCategory[];
  products: DesignItem[];
  appointmentSlots: ManagedSiteVisitSlot[];
  appointmentDates: Record<string, ManagedSiteVisitDateConfig>;
  appointments: SiteVisitBooking[];
  blogPosts: BlogPostItem[];
  projects: MemoryProjectRecord[];
  orders: MemoryOrderRecord[];
  rfqs: MemoryRfqRecord[];
  feedbacks: CustomerFeedbackRecord[];
  chatbotFaqs: ChatbotFaqItem[];
  relatedPortals: RelatedPortalItem[];
  notifications: MemoryNotificationRecord[];
  cmsDocs: Map<string, Record<string, unknown>>;
}

declare global {
  var _innovistaMemoryStore: MemoryStoreState | undefined;
}

function createInitialStore(): MemoryStoreState {
  const now = new Date();
  const store: MemoryStoreState = {
    initialized: true,
    nextUserId: 5,
    nextMediaId: 1,
    nextProjectId: 5,
    nextFeedbackId: 1,
    nextRfqId: 3,
    nextRfqAttachmentId: 1,
    users: [
      {
        id: 1,
        uid: "admin-1",
        name: "Super Admin",
        email: "admin@innovista.com",
        phone: "+94 77 123 4567",
        company: "Innovista Fabriconix HQ",
        role: "admin",
        passwordHash: "admin123",
        avatarUrl: "/assets/about/director.jpg",
        isVerified: true,
        isActive: true,
        purchaseGoods: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        uid: "staff-2",
        name: "Operations Manager",
        email: "manager@innovista.com",
        phone: "+94 71 987 6543",
        company: "Innovista Fabriconix HQ",
        role: "staff",
        passwordHash: "admin123",
        avatarUrl: "/assets/about/team-structural.jpg",
        isVerified: true,
        isActive: true,
        purchaseGoods: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        uid: "customer-1",
        name: "Duminda Perera",
        email: "duminda@zenithcapital.lk",
        phone: "+94 77 455 1200",
        company: "Zenith Capital Residencies",
        role: "customer",
        passwordHash: "customer123",
        avatarUrl: "/assets/logos/client-zenith.svg",
        isVerified: true,
        isActive: true,
        purchaseGoods: ["Sliding Doors", "Glass Balustrades", "Window Systems"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 4,
        uid: "customer-2",
        name: "Kavinda Jayasuriya",
        email: "kavinda@novatech.io",
        phone: "+94 77 333 9988",
        company: "NovaTech Solutions",
        role: "customer",
        passwordHash: "customer123",
        avatarUrl: "/assets/logos/client-novatech.svg",
        isVerified: true,
        isActive: true,
        purchaseGoods: ["Acoustic Partitions", "Pivot Doors"],
        createdAt: now,
        updatedAt: now,
      },
    ],
    mediaAssets: [],
    categories: DEFAULT_PRODUCT_CATEGORIES.map((c, idx) => normalizeProductCategory(c, idx)),
    products: DEFAULT_DESIGNS_CATALOG.map((d) => normalizeDesignItem(d)),
    appointmentSlots: SITE_VISIT_SLOT_TEMPLATES.map((s) => ({ ...s })),
    appointmentDates: {},
    appointments: [],
    blogPosts: DEFAULT_BLOG_POSTS.map((p) => ({ ...p })),
    projects: [
      {
        ProjectID: 1,
        Project_Title: "Oceanview Villa Glass Cantilever & Sliding Facade",
        Project_Description:
          "Complete architectural exterior glazing featuring heavy-duty thermally broken aluminium profiles, motorized slim-line sliding glass doors, and structural frameless glass balustrades.",
        Project_Images: [
          "/assets/about/terrace.jpg",
          "/assets/products/door.jpg",
          "/assets/products/hero-showroom.jpg",
        ],
        Location: "Colombo 07, Sri Lanka",
        Client_Name: "Duminda Perera",
        Client_Email: "duminda@zenithcapital.lk",
        Client_Number: "+94 77 455 1200",
        Client_Company: "Zenith Capital Residencies",
        Project_CreatedAt: now.toISOString(),
        Project_FinishedDate: "2024-09-30T17:00:00.000Z",
        Budget: 8500000,
      },
      {
        ProjectID: 2,
        Project_Title: "Apex Commercial Tower Curtain Wall System",
        Project_Description:
          "Supply, fabrication, and structural installation of 12-storey unitized aluminium curtain walling with solar-reflective low-E double glazing and integrated ventilation louvers.",
        Project_Images: [
          "/assets/about/facade.jpg",
          "/assets/products/facade-detail.jpg",
          "/assets/products/shopfront.jpg",
        ],
        Location: "Kollupitiya, Colombo",
        Client_Name: "Niroshan Fernando",
        Client_Email: "info@apexdevelopments.com",
        Client_Number: "+94 11 234 5678",
        Client_Company: "Apex Skyline Towers",
        Project_CreatedAt: now.toISOString(),
        Project_FinishedDate: "2024-04-12T18:00:00.000Z",
        Budget: 24500000,
      },
      {
        ProjectID: 3,
        Project_Title: "Modernist Residence Aluminium Bi-Fold & Skylight",
        Project_Description:
          "Ultra-slim multi-panel bi-fold doors creating seamless indoor-outdoor transition, custom acoustic interior partitions, and motorized architectural roof skylights.",
        Project_Images: [
          "/assets/about/pavilion.jpg",
          "/assets/products/roof-skylight.jpg",
          "/assets/products/window.jpg",
        ],
        Location: "Kandy, Sri Lanka",
        Client_Name: "Sachithra Weerasinghe",
        Client_Email: "sweera@arcvision.com",
        Client_Number: "+94 71 890 1234",
        Client_Company: "ArcVision Design Studio",
        Project_CreatedAt: now.toISOString(),
        Project_FinishedDate: "2024-08-15T15:00:00.000Z",
        Budget: 6200000,
      },
      {
        ProjectID: 4,
        Project_Title: "Corporate HQ Acoustic Glass Partitions & Pivot Doors",
        Project_Description:
          "Frameless acoustic tempered glass partition suites with matte-black powder-coated aluminium perimeter channels, pivot entrance doors, and privacy smart glass integration.",
        Project_Images: [
          "/assets/products/partition.jpg",
          "/assets/products/showroom.jpg",
          "/assets/products/louvers.jpg",
        ],
        Location: "Rajagiriya, Colombo",
        Client_Name: "Kavinda Jayasuriya",
        Client_Email: "kavinda@novatech.io",
        Client_Number: "+94 77 333 9988",
        Client_Company: "NovaTech Solutions",
        Project_CreatedAt: now.toISOString(),
        Project_FinishedDate: "2024-07-20T17:00:00.000Z",
        Budget: 4800000,
      },
    ],
    orders: [
      {
        OrderID: "ORD-9201",
        Order_Date: "2024-10-18T14:32:00.000Z",
        Order_Status: "COMPLETED",
        Client_Name: "Duminda Perera",
        Client_Email: "duminda@zenithcapital.lk",
        Client_Number: "+94 77 455 1200",
        Customer: {
          Cus_CompanyName: "Zenith Capital Residencies",
          Cus_Logo: "/assets/logos/client-zenith.svg",
          Purchase_Goods: ["Sliding Doors", "Glass Balustrades"],
        },
        Designs: [
          {
            Design: {
              Design_Name: "Minimalist Slimline Sliding Door System",
              Design_Image: "/assets/products/door.jpg",
            },
          },
        ],
      },
      {
        OrderID: "ORD-9202",
        Order_Date: "2024-11-04T09:15:00.000Z",
        Order_Status: "PENDING",
        Client_Name: "Kavinda Jayasuriya",
        Client_Email: "kavinda@novatech.io",
        Client_Number: "+94 77 333 9988",
        Customer: {
          Cus_CompanyName: "NovaTech Solutions",
          Cus_Logo: "/assets/logos/client-novatech.svg",
          Purchase_Goods: ["Acoustic Partitions"],
        },
        Designs: [
          {
            Design: {
              Design_Name: "Acoustic Frameless Glass Office Partition",
              Design_Image: "/assets/products/partition.jpg",
            },
          },
        ],
      },
    ],
    rfqs: [
      {
        id: 1,
        customerUserId: 3,
        clientName: "Zenith Capital Residencies",
        contactPerson: "Duminda Perera",
        email: "duminda@zenithcapital.lk",
        phone: "+94 77 455 1200",
        clientWebsite: "https://zenithcapital.lk",
        projectTitle: "Penthouse Cantilever Sliding Terrace & Acoustic Suite",
        location: "Colombo 07, Sri Lanka",
        projectType: "Facade",
        projectReferenceNumber: "RFQ-2026-ZC01",
        projectDescription:
          "Supply and installation of thermally broken ultra-slim 4-track motorized sliding doors and acoustic laminated skylight glazing for penthouse terrace.",
        installationConditions: "7th floor crane hoist access required via west service bay.",
        siteConstraints: "High coastal wind exposure; minimum 2.4 kPa wind-load certification.",
        standards: "BS EN 14351-1, ASTM E330",
        qualityExpectations: "Qualicoat Seaside Class 2 matte charcoal powder coat.",
        materialBrand: "AluProfile Euro-Slim 45",
        colorCode: "RAL 7016 Anthracite Grey",
        additionalFeatures: "Integrated floor-drainage threshold & smart fingerprint lock.",
        interiorStyle: "Modern",
        paymentConditions: "40% mobilization, 40% upon extrusion delivery, 20% post-commissioning.",
        budget: "LKR 6,850,000",
        latestDeliveryDate: getLocalIsoDateOffset(28),
        proposedVisitDates: `${getLocalIsoDateOffset(2)}, ${getLocalIsoDateOffset(5)}`,
        siteAddress: "No. 18, Ward Place, Colombo 07",
        googleMapsLink: "https://maps.google.com/?q=Colombo+07",
        status: "QUOTED",
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        attachments: [],
      },
      {
        id: 2,
        customerUserId: 4,
        clientName: "NovaTech Solutions",
        contactPerson: "Kavinda Jayasuriya",
        email: "kavinda@novatech.io",
        phone: "+94 77 333 9988",
        clientWebsite: "https://novatech.io",
        projectTitle: "Executive Boardroom Acoustic Double-Glazed Partitions",
        location: "Rajagiriya, Colombo",
        projectType: "Office Partition",
        projectReferenceNumber: "RFQ-2026-NT04",
        projectDescription:
          "42 linear meters of 42dB acoustic frameless double-glazed aluminium office partitions with two full-height pivot doors.",
        installationConditions: "Night-shift installation after 7:00 PM on weekdays.",
        siteConstraints: "Existing raised access flooring with 120mm slab clearance.",
        standards: "ISO 10140 Acoustic Rating",
        qualityExpectations: "Concealed floor closers with anodized black hairline trim.",
        materialBrand: "Innovista QuietLine 100",
        colorCode: "RAL 9005 Jet Black",
        additionalFeatures: "Switchable smart privacy film on boardroom bay.",
        interiorStyle: "Corporate",
        paymentConditions: "50% advance, 50% on handover.",
        budget: "LKR 3,900,000",
        latestDeliveryDate: getLocalIsoDateOffset(21),
        proposedVisitDates: getLocalIsoDateOffset(4),
        siteAddress: "Level 9, Orion Tech Park, Rajagiriya",
        googleMapsLink: null,
        status: "IN_REVIEW",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        attachments: [],
      },
    ],
    feedbacks: normalizeCustomerFeedbackList(DEFAULT_CUSTOMER_FEEDBACKS).map((fb, idx) => ({
      ...fb,
      Feed_backId: fb.Feed_backId || idx + 1,
    })),
    chatbotFaqs: DEFAULT_CHATBOT_FAQS.map((f) => ({ ...f })),
    relatedPortals: normalizeRelatedPortals(RELATED_PORTALS),
    notifications: [
      {
        id: "notif-1",
        NotificationsID: "notif-1",
        Notifications_Title: "New Project Inquiry",
        Notifications_Body:
          "Zenith Capital requested a custom quotation for high-span sliding doors.",
        Date_Timestamp: now.toISOString(),
        isRead: false,
      },
      {
        id: "notif-2",
        NotificationsID: "notif-2",
        Notifications_Title: "Design Approved",
        Notifications_Body: "Casement suite specifications were approved for production line.",
        Date_Timestamp: now.toISOString(),
        isRead: false,
      },
    ],
    cmsDocs: new Map<string, Record<string, unknown>>(),
  };

  store.nextFeedbackId =
    store.feedbacks.reduce((max, fb) => Math.max(max, Number(fb.Feed_backId || 0)), 0) + 1;

  const firstDate = getLocalIsoDateOffset(2, now);
  const secondDate = getLocalIsoDateOffset(5, now);
  store.appointmentDates[firstDate] = {
    date: firstDate,
    available: true,
    note: "Standard showroom & measurement window",
    isCustom: false,
  };
  store.appointmentDates[secondDate] = {
    date: secondDate,
    available: true,
    note: "On-site laser measurement & structural inspection",
    isCustom: false,
  };
  store.appointments.push(
    {
      id: "SV-2041",
      date: firstDate,
      slotTime: "11:00",
      slotLabel: "11:00 AM",
      locationName: "Nawala Showroom & Consultation",
      visitorName: "Duminda Perera",
      visitorEmail: "duminda@zenithcapital.lk",
      visitorPhone: "+94 77 455 1200",
      notes: "Slim sliding door frame measurement check.",
      status: "CONFIRMED",
      calendarEventId: "",
      emailSent: false,
      createdAt: now.toISOString(),
    },
    {
      id: "SV-2042",
      date: secondDate,
      slotTime: "14:00",
      slotLabel: "02:00 PM",
      locationName: "Colombo 07 Penthouse Site Inspection",
      visitorName: "Duminda Perera",
      visitorEmail: "duminda@zenithcapital.lk",
      visitorPhone: "+94 77 455 1200",
      notes: "Cantilever terrace laser plumb & wind-load survey.",
      status: "CONFIRMED",
      calendarEventId: "",
      emailSent: false,
      createdAt: now.toISOString(),
    }
  );

  const defaultSiteSettings = normalizeSiteContactSettings({
    phone: process.env.VITE_CONTACT_PHONE || DEFAULT_SITE_CONTACT_SETTINGS.phone,
    whatsapp: process.env.VITE_WHATSAPP_NUMBER || DEFAULT_SITE_CONTACT_SETTINGS.whatsapp,
    email: process.env.VITE_CONTACT_EMAIL || DEFAULT_SITE_CONTACT_SETTINGS.email,
  });

  store.cmsDocs.set("about_cms", {
    slideshowSpeedMs: DEFAULT_SLIDESHOW_SPEED_MS,
    journeySpeedMs: DEFAULT_JOURNEY_SPEED_MS,
    feedbackSpeedMs: DEFAULT_FEEDBACK_SPEED_MS,
    partnersRibbonSpeed: DEFAULT_PARTNERS_RIBBON_SPEED,
    clientsRibbonSpeed: DEFAULT_CLIENTS_RIBBON_SPEED,
    heroSlides: DEFAULT_HERO_SLIDES,
    vision: DEFAULT_ABOUT_SECTIONS.vision,
    mission: DEFAULT_ABOUT_SECTIONS.mission,
    directorMessage: DEFAULT_DIRECTOR_MESSAGE,
    teamMembers: DEFAULT_TEAM_MEMBERS,
    journeyMilestones: DEFAULT_JOURNEY_MILESTONES,
    partners: DEFAULT_PARTNERS,
    clients: DEFAULT_CLIENTS,
    clientFeedbacks: DEFAULT_CLIENT_FEEDBACKS,
  });
  store.cmsDocs.set(
    "product_landing_cms",
    normalizeProductLandingCms(DEFAULT_PRODUCT_LANDING_CMS) as unknown as Record<string, unknown>
  );
  store.cmsDocs.set("page_ads_cms", DEFAULT_PAGE_ADS_CMS as unknown as Record<string, unknown>);
  store.cmsDocs.set("blogger_config", DEFAULT_BLOGGER_CONFIG as unknown as Record<string, unknown>);
  store.cmsDocs.set("site_settings", defaultSiteSettings as unknown as Record<string, unknown>);
  store.cmsDocs.set("chatbot_config", DEFAULT_CHATBOT_CONFIG as unknown as Record<string, unknown>);
  store.cmsDocs.set("site_visit_blocked_keys", { blockedKeys: [] });
  store.cmsDocs.set(
    "home_slideshow",
    normalizeHomeSlideshowCms(DEFAULT_HOME_SLIDESHOW_CMS) as unknown as Record<string, unknown>
  );
  store.cmsDocs.set(
    "home_services",
    normalizeHomeServicesCms(DEFAULT_HOME_SERVICES_CMS) as unknown as Record<string, unknown>
  );
  store.cmsDocs.set(
    "home_featured_products",
    normalizeHomeFeaturedProductsCms(
      DEFAULT_HOME_FEATURED_PRODUCTS_CMS
    ) as unknown as Record<string, unknown>
  );
  store.cmsDocs.set("news_articles", { articles: NEWS_ARTICLES });
  store.cmsDocs.set("resources_content", {
    attachments: RESOURCE_ATTACHMENTS,
    guidelines: ENGINEERING_GUIDELINES,
    faqs: RESOURCE_FAQS,
  });
  store.cmsDocs.set("contact_directory", {
    departments: CONTACT_DEPARTMENTS,
    locations: CONTACT_LOCATIONS,
  });

  // Populate initial media assets from categories, products, projects, and blogs
  const seenUrls = new Set<string>();
  const seedAsset = (url: string, title: string, scope: string) => {
    const clean = (url || "").trim();
    if (!clean || seenUrls.has(clean)) return;
    seenUrls.add(clean);
    store.mediaAssets.push({
      id: store.nextMediaId++,
      kind: inferMediaKindFromUrlOrMime(clean),
      sourceType: inferSourceTypeFromUrl(clean),
      title,
      originalName: clean.split("/").pop() || "asset",
      storageKey: clean.startsWith("/uploads/") ? clean.replace(/^\/+/, "") : "",
      publicUrl: clean,
      mimeType: "",
      fileSizeBytes: null,
      altText: title,
      entityScope: scope,
      uploadedByUserId: 1,
      createdAt: now,
    });
  };

  store.categories.forEach((c) => seedAsset(c.coverImage, c.name, "category"));
  store.products.forEach((p) =>
    p.Design_Image.forEach((img, i) => seedAsset(img, `${p.Design_Name} #${i + 1}`, "product"))
  );
  store.projects.forEach((p) =>
    p.Project_Images.forEach((img, i) => seedAsset(img, `${p.Project_Title} #${i + 1}`, "project"))
  );
  store.blogPosts.forEach((b) => seedAsset(b.coverImage, b.title, "blog"));

  return store;
}

export function getMemoryStore(): MemoryStoreState {
  if (!global._innovistaMemoryStore) {
    global._innovistaMemoryStore = createInitialStore();
  }
  return global._innovistaMemoryStore;
}
