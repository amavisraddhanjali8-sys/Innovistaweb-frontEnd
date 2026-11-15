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
} from "../../shared/aboutContentHelpers.ts";
import {
  DEFAULT_HERO_THEME,
  DEFAULT_PAGE_HERO_THEMES,
} from "../../shared/heroThemeHelpers.ts";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  type DesignItem,
  type ProductCategory,
} from "../../shared/productCatalogHelpers.ts";
import { DEFAULT_PAGE_ADS_CMS } from "../../shared/pageAdsHelpers.ts";
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
} from "../../shared/siteContentHelpers.ts";
import {
  DEFAULT_BLOGGER_CONFIG,
  DEFAULT_BLOG_POSTS,
  type BlogPostItem,
} from "../../shared/blogBloggerHelpers.ts";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
} from "../../shared/footerConsultationHelpers.ts";
import {
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_CHATBOT_FAQS,
  type ChatbotFaqItem,
} from "../../shared/chatbotHelpers.ts";
import {
  SITE_VISIT_SLOT_TEMPLATES,
  type ManagedSiteVisitDateConfig,
  type ManagedSiteVisitSlot,
  type SiteVisitBooking,
} from "../../shared/siteVisitSchedulerHelpers.ts";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  normalizeHomeSlideshowCms,
} from "../../shared/homeSlideshowHelpers.ts";
import {
  DEFAULT_HOME_SERVICES_CMS,
  normalizeHomeServicesCms,
} from "../../shared/homeServicesHelpers.ts";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  normalizeHomeFeaturedProductsCms,
} from "../../shared/homeTopPicksHelpers.ts";
import {
  DEFAULT_CUSTOMER_FEEDBACKS,
  normalizeCustomerFeedbackList,
  type CustomerFeedbackRecord,
} from "../../shared/customerFeedbackHelpers.ts";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
} from "../../shared/mediaAssetHelpers.ts";
import { hashPassword } from "../utils/securityHelpers.ts";

export interface MemoryUserRecord {
  id: number;
  uid: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  emailVerified: boolean;
  accountStatus: string;
  emailVerificationTokenHash: string | null;
  emailVerificationCodeHash: string | null;
  emailVerificationExpiresAt: Date | null;
  totpSecretEncrypted: string | null;
  totpEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  isActive: boolean;
  purchaseGoods: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySecurityChallengeRecord {
  id: number;
  challengeId: string;
  purpose: string;
  userId: number | null;
  identifier: string | null;
  answerHash: string;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  metadata?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
}

export interface MemoryUserSessionRecord {
  id: number;
  sessionKey: string;
  userId: number;
  tokenHash: string;
  mfaVerified: boolean;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface MemoryAdminSecretConfigRecord {
  id: number;
  configKey: string;
  encryptedKey: string;
  keyHash: string;
  rotationCount: number;
  updatedByUserId: number | null;
  updatedByEmail: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface MemoryAuditLogRecord {
  id: number;
  eventId: string;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetUserId: number | null;
  targetIdentifier: string | null;
  action: string;
  category: string;
  status: string;
  severity: string;
  accountClassification: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
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
  nextChallengeId: number;
  nextUserSessionId: number;
  nextAuditLogId: number;
  nextMediaId: number;
  nextProjectId: number;
  nextFeedbackId: number;
  nextRfqId: number;
  nextRfqAttachmentId: number;
  users: MemoryUserRecord[];
  userSessions: MemoryUserSessionRecord[];
  adminSecretConfig: MemoryAdminSecretConfigRecord | null;
  securityChallenges: MemorySecurityChallengeRecord[];
  auditLogs: MemoryAuditLogRecord[];
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
    nextUserId: 2,
    nextChallengeId: 1,
    nextUserSessionId: 1,
    nextAuditLogId: 1,
    nextMediaId: 1,
    nextProjectId: 5,
    nextFeedbackId: 1,
    nextRfqId: 1,
    nextRfqAttachmentId: 1,
    users: [
      {
        id: 1,
        uid: (process.env.ADMIN_SEED_UID || "EMP-001").trim(),
        username: (process.env.ADMIN_SEED_UID || "EMP-001").trim().toLowerCase(),
        name: `Administrator (${(process.env.ADMIN_SEED_UID || "EMP-001").trim()})`,
        email: `${(process.env.ADMIN_SEED_UID || "EMP-001").trim().toLowerCase()}@innovistafabriconix.lk`,
        phone: "",
        company: "Innovista Fabriconix HQ",
        role: "admin",
        passwordHash: hashPassword(process.env.ADMIN_SEED_PASSWORD || "admin29"),
        avatarUrl: "/assets/about/director.jpg",
        isVerified: true,
        emailVerified: true,
        accountStatus: "ACTIVE",
        emailVerificationTokenHash: null,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        totpSecretEncrypted: null,
        totpEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        lastLoginIp: "",
        isActive: true,
        purchaseGoods: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    userSessions: [],
    adminSecretConfig: null,
    securityChallenges: [],
    auditLogs: [],
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
        Client_Name: "Zenith Capital Residencies",
        Client_Email: "",
        Client_Number: "",
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
        Client_Name: "Apex Skyline Towers",
        Client_Email: "",
        Client_Number: "",
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
        Client_Name: "ArcVision Design Studio",
        Client_Email: "",
        Client_Number: "",
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
        Client_Name: "NovaTech Corporate Park",
        Client_Email: "",
        Client_Number: "",
        Client_Company: "NovaTech Corporate Park",
        Project_CreatedAt: now.toISOString(),
        Project_FinishedDate: "2024-07-20T17:00:00.000Z",
        Budget: 4800000,
      },
    ],
    orders: [],
    rfqs: [],
    feedbacks: normalizeCustomerFeedbackList(DEFAULT_CUSTOMER_FEEDBACKS).map((fb, idx) => ({
      ...fb,
      Feed_backId: fb.Feed_backId || idx + 1,
    })),
    chatbotFaqs: DEFAULT_CHATBOT_FAQS.map((f) => ({ ...f })),
    relatedPortals: normalizeRelatedPortals(RELATED_PORTALS),
    notifications: [],
    cmsDocs: new Map<string, Record<string, unknown>>(),
  };

  store.nextFeedbackId =
    store.feedbacks.reduce((max, fb) => Math.max(max, Number(fb.Feed_backId || 0)), 0) + 1;

  const defaultSiteSettings = normalizeSiteContactSettings({
    phone: process.env.CONTACT_PHONE || DEFAULT_SITE_CONTACT_SETTINGS.phone,
    whatsapp: process.env.WHATSAPP_NUMBER || DEFAULT_SITE_CONTACT_SETTINGS.whatsapp,
    email: process.env.CONTACT_EMAIL || DEFAULT_SITE_CONTACT_SETTINGS.email,
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
    heroTheme: { ...DEFAULT_HERO_THEME },
  });
  store.cmsDocs.set(
    "product_landing_cms",
    normalizeProductLandingCms(DEFAULT_PRODUCT_LANDING_CMS) as unknown as Record<string, unknown>
  );
  store.cmsDocs.set("page_hero_themes", DEFAULT_PAGE_HERO_THEMES as unknown as Record<string, unknown>);
  store.cmsDocs.set("category_hero_themes", {});
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
      uploadedByUserId: null,
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
