import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "./src/utils/aboutContentHelpers";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  designMatchesCategory,
  findCategoryByParam,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  resolveRelatedDesigns,
  type DesignItem,
  type ProductCategory,
  type ProductLandingCms,
} from "./src/utils/productCatalogHelpers";
import {
  DEFAULT_PAGE_ADS_CMS,
  isValidAdPageKey,
  normalizePageAdSlide,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  type PageAdsCmsPayload,
} from "./src/utils/pageAdsHelpers";
import {
  RELATED_PORTALS,
  RESOURCE_ATTACHMENTS,
  normalizePortalTile,
  normalizeRelatedPortals,
  type RelatedPortalItem,
} from "./src/utils/siteContentHelpers";
import {
  BLOGGER_COVER_FALLBACKS,
  DEFAULT_BLOGGER_CONFIG,
  DEFAULT_BLOG_POSTS,
  buildBloggerAtomUrl,
  buildBloggerFeedUrl,
  buildExcerpt,
  computeReadTime,
  filterBlogPosts,
  formatBlogDisplayDate,
  getHomePageBlogs,
  mergeSyncedBloggerPosts,
  normalizeBloggerOrigin,
  parseBloggerApiV3Response,
  parseBloggerAtomFeed,
  parseBloggerJsonFeed,
  sanitizeBlogHtml,
  type BlogPostItem,
  type BloggerConnectionConfig,
} from "./src/utils/blogBloggerHelpers";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
  validateSiteContactSettings,
  type SiteContactSettings,
} from "./src/utils/footerConsultationHelpers";
import {
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_CHATBOT_FAQS,
  buildSmsHref,
  buildWhatsAppChatUrl,
  detectChatIntent,
  matchTrainedFaq,
  normalizeChatbotConfig,
  normalizeChatbotFaq,
  type ChatbotConfig,
  type ChatbotFaqItem,
} from "./src/utils/chatbotHelpers";
import {
  SITE_VISIT_SLOT_TEMPLATES,
  computeAvailableSlotsForDate,
  getUpcomingSiteVisitDates,
  validateSiteVisitBooking,
  type SiteVisitBooking,
  type SiteVisitStatus,
} from "./src/utils/siteVisitSchedulerHelpers";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  deleteHomeSlide,
  normalizeHomeSlideshowCms,
  upsertHomeSlide,
  type HomeSlideshowCmsPayload,
} from "./src/utils/homeSlideshowHelpers";
import {
  DEFAULT_HOME_SERVICES_CMS,
  deleteHomeService,
  normalizeHomeServicesCms,
  upsertHomeService,
  type HomeServicesCmsPayload,
} from "./src/utils/homeServicesHelpers";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  deleteHomeAccessoryRibbonItem,
  normalizeHomeFeaturedProductsCms,
  upsertHomeAccessoryRibbonItem,
  type HomeFeaturedProductsCmsPayload,
} from "./src/utils/homeTopPicksHelpers";
import {
  injectSeoIntoHtml,
  resolveDynamicRouteSeo,
  resolveRequestOrigin,
} from "./src/utils/seoMetadataHelpers";
import {
  DEFAULT_CUSTOMER_FEEDBACKS,
  normalizeCustomerFeedbackList,
  normalizeCustomerFeedbackRecord,
  type CustomerFeedbackRecord,
} from "./src/utils/customerFeedbackHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// In-memory data stores with sensible initial data
interface Admin {
  AdminId: number;
  Admin_Name: string;
  Admin_Email: string;
  Admin_Phone: string;
  Admin_Password?: string;
  Admin_Profile?: string;
}

let admins: Admin[] = [
  {
    AdminId: 1,
    Admin_Name: "Super Admin",
    Admin_Email: "admin@innovista.com",
    Admin_Phone: "+94 77 123 4567",
    Admin_Password: "admin123",
    Admin_Profile: "/assets/about/director.jpg",
  },
  {
    AdminId: 2,
    Admin_Name: "Operations Manager",
    Admin_Email: "manager@innovista.com",
    Admin_Phone: "+94 71 987 6543",
    Admin_Password: "admin123",
    Admin_Profile: "/assets/about/team-structural.jpg",
  },
];

interface Project {
  ProjectID: number;
  Project_Title: string;
  Project_Description: string;
  Project_Images: string[];
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Client_Company?: string;
  Project_CreatedAt?: string;
  Project_FinishedDate?: string | null;
  Budget: number;
}

let projects: Project[] = [
  {
    ProjectID: 1,
    Project_Title: "Oceanview Villa Glass Cantilever & Sliding Facade",
    Project_Description: "Complete architectural exterior glazing featuring heavy-duty thermally broken aluminium profiles, motorized slim-line sliding glass doors, and structural frameless glass balustrades.",
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
    Project_CreatedAt: "2024-01-15T08:00:00.000Z",
    Project_FinishedDate: "2024-09-30T17:00:00.000Z",
    Budget: 8500000,
  },
  {
    ProjectID: 2,
    Project_Title: "Apex Commercial Tower Curtain Wall System",
    Project_Description: "Supply, fabrication, and structural installation of 12-storey unitized aluminium curtain walling with solar-reflective low-E double glazing and integrated ventilation louvers.",
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
    Project_CreatedAt: "2023-06-10T09:00:00.000Z",
    Project_FinishedDate: "2024-04-12T18:00:00.000Z",
    Budget: 24500000,
  },
  {
    ProjectID: 3,
    Project_Title: "Modernist Residence Aluminium Bi-Fold & Skylight",
    Project_Description: "Ultra-slim multi-panel bi-fold doors creating seamless indoor-outdoor transition, custom acoustic interior partitions, and motorized architectural roof skylights.",
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
    Project_CreatedAt: "2024-03-01T10:00:00.000Z",
    Project_FinishedDate: "2024-08-15T15:00:00.000Z",
    Budget: 6200000,
  },
  {
    ProjectID: 4,
    Project_Title: "Corporate HQ Acoustic Glass Partitions & Pivot Doors",
    Project_Description: "Frameless acoustic tempered glass partition suites with matte-black powder-coated aluminium perimeter channels, pivot entrance doors, and privacy smart glass integration.",
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
    Project_CreatedAt: "2024-04-10T08:30:00.000Z",
    Project_FinishedDate: "2024-07-20T17:00:00.000Z",
    Budget: 4800000,
  },
];

let designs: DesignItem[] = DEFAULT_DESIGNS_CATALOG.map((item) =>
  normalizeDesignItem(item)
);

let productLandingCms: ProductLandingCms = normalizeProductLandingCms(
  DEFAULT_PRODUCT_LANDING_CMS
);

let productCategories: ProductCategory[] = DEFAULT_PRODUCT_CATEGORIES.map(
  (cat, idx) => normalizeProductCategory(cat, idx)
);

interface Customer {
  CustomerId: number;
  Cus_Name: string;
  Cus_Email: string;
  Cus_PhoneNumber: string;
  Cus_CompanyName: string;
  Cus_Logo: string;
  Cus_Password?: string;
  Verify_State: boolean;
  Purchase_Goods?: string[];
}

let customers: Customer[] = [
  {
    CustomerId: 1,
    Cus_Name: "Duminda Perera",
    Cus_Email: "duminda@zenithcapital.lk",
    Cus_PhoneNumber: "+94 77 455 1200",
    Cus_CompanyName: "Zenith Capital Residencies",
    Cus_Logo: "/assets/logos/client-zenith.svg",
    Verify_State: true,
    Purchase_Goods: ["Sliding Doors", "Glass Balustrades", "Window Systems"],
  },
  {
    CustomerId: 2,
    Cus_Name: "Kavinda Jayasuriya",
    Cus_Email: "kavinda@novatech.io",
    Cus_PhoneNumber: "+94 77 333 9988",
    Cus_CompanyName: "NovaTech Solutions",
    Cus_Logo: "/assets/logos/client-novatech.svg",
    Verify_State: true,
    Purchase_Goods: ["Acoustic Partitions", "Pivot Doors"],
  },
];

interface Order {
  OrderID: string;
  Order_Date: string;
  Order_Status: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Customer?: {
    Cus_CompanyName?: string;
    Cus_Logo?: string;
    Purchase_Goods?: string[];
  };
  Designs?: {
    Design?: {
      Design_Name?: string;
      Design_Image?: string | string[];
    };
  }[];
}

const orders: Order[] = [
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
];

const customerFeedbackStoreDir = path.resolve(__dirname, ".data");
const customerFeedbackStoreFile = path.resolve(
  customerFeedbackStoreDir,
  "customer-feedbacks.json"
);

function loadCustomerFeedbacksStore(): CustomerFeedbackRecord[] {
  try {
    if (fs.existsSync(customerFeedbackStoreFile)) {
      const raw = fs.readFileSync(customerFeedbackStoreFile, "utf-8");
      const parsed = JSON.parse(raw);
      return normalizeCustomerFeedbackList(parsed, DEFAULT_CUSTOMER_FEEDBACKS);
    }
  } catch (err) {
    console.warn("Failed to read customer-feedbacks.json, using defaults:", err);
  }
  return normalizeCustomerFeedbackList(DEFAULT_CUSTOMER_FEEDBACKS);
}

function saveCustomerFeedbacksStore(list: CustomerFeedbackRecord[]): void {
  try {
    if (!fs.existsSync(customerFeedbackStoreDir)) {
      fs.mkdirSync(customerFeedbackStoreDir, { recursive: true });
    }
    fs.writeFileSync(
      customerFeedbackStoreFile,
      JSON.stringify(list, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to persist customer-feedbacks.json:", err);
  }
}

let feedbacks: CustomerFeedbackRecord[] = loadCustomerFeedbacksStore();

interface NotificationItem {
  id: string;
  NotificationsID: string;
  Notifications_Title: string;
  Notifications_Body: string;
  Date_Timestamp: string;
  isRead: boolean;
}

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    NotificationsID: "notif-1",
    Notifications_Title: "New Project Inquiry",
    Notifications_Body: "Zenith Capital requested a custom quotation for high-span sliding doors.",
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  },
  {
    id: "notif-2",
    NotificationsID: "notif-2",
    Notifications_Title: "Design Approved",
    Notifications_Body: "Casement suite specifications were approved for production line.",
    Date_Timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    isRead: false,
  },
];

// About Page & Vision/Mission dynamic content store (editable by admin)
let visionMissionContent: AboutCmsPayload = {
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
};

// Page Advertisements CMS store (editable per card page by admin)
let pageAdsCms: PageAdsCmsPayload = DEFAULT_PAGE_ADS_CMS;

// Related Hardware & Portals Collage CMS store (editable by admin)
let relatedPortals: RelatedPortalItem[] = normalizeRelatedPortals(RELATED_PORTALS);

// Blogs & Blogger.com Sync CMS store
let bloggerConfig: BloggerConnectionConfig = { ...DEFAULT_BLOGGER_CONFIG };
let blogPosts: BlogPostItem[] = DEFAULT_BLOG_POSTS.map((p) => ({ ...p }));
let lastAutoSyncAttemptAt = 0;

// Site-wide Contact, Phone & Social Settings store (configurable via env & Admin)
let siteContactSettings: SiteContactSettings = normalizeSiteContactSettings({
  phone: process.env.VITE_CONTACT_PHONE || DEFAULT_SITE_CONTACT_SETTINGS.phone,
  whatsapp:
    process.env.VITE_WHATSAPP_NUMBER || DEFAULT_SITE_CONTACT_SETTINGS.whatsapp,
  email: process.env.VITE_CONTACT_EMAIL || DEFAULT_SITE_CONTACT_SETTINGS.email,
});

// Chatbot Configuration & Admin FAQ Training Store
let chatbotConfig: ChatbotConfig = { ...DEFAULT_CHATBOT_CONFIG };
let chatbotFaqs: ChatbotFaqItem[] = DEFAULT_CHATBOT_FAQS.map((item) => ({ ...item }));

// Site Visit Bookings & Blocked Slots Store
const upcomingDatesSeed = getUpcomingSiteVisitDates(10);
const firstSeedDate = upcomingDatesSeed[0]?.date || new Date().toISOString().slice(0, 10);
let blockedSiteVisitSlots: string[] = [];
const siteVisitBookings: SiteVisitBooking[] = [
  {
    id: "SV-2041",
    date: firstSeedDate,
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
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Home Hero Slideshow CMS Store (supports images, MP4/WebM/embed videos, stats & content)
const homeSlideshowStoreDir = path.resolve(__dirname, ".data");
const homeSlideshowStoreFile = path.resolve(homeSlideshowStoreDir, "home-slideshow.json");

function loadHomeSlideshowStore(): HomeSlideshowCmsPayload {
  try {
    if (fs.existsSync(homeSlideshowStoreFile)) {
      const raw = fs.readFileSync(homeSlideshowStoreFile, "utf-8");
      const parsed = JSON.parse(raw);
      return normalizeHomeSlideshowCms(parsed);
    }
  } catch (err) {
    console.warn("Failed to read persisted home-slideshow.json, using defaults:", err);
  }
  return normalizeHomeSlideshowCms(DEFAULT_HOME_SLIDESHOW_CMS);
}

function saveHomeSlideshowStore(payload: HomeSlideshowCmsPayload): void {
  try {
    if (!fs.existsSync(homeSlideshowStoreDir)) {
      fs.mkdirSync(homeSlideshowStoreDir, { recursive: true });
    }
    fs.writeFileSync(homeSlideshowStoreFile, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist home-slideshow.json:", err);
  }
}

let homeSlideshowCms: HomeSlideshowCmsPayload = loadHomeSlideshowStore();

// What We Build For You (Home Services Carousel) CMS Store
const homeServicesStoreFile = path.resolve(homeSlideshowStoreDir, "home-services.json");

function loadHomeServicesStore(): HomeServicesCmsPayload {
  try {
    if (fs.existsSync(homeServicesStoreFile)) {
      const raw = fs.readFileSync(homeServicesStoreFile, "utf-8");
      const parsed = JSON.parse(raw);
      return normalizeHomeServicesCms(parsed);
    }
  } catch (err) {
    console.warn("Failed to read persisted home-services.json, using defaults:", err);
  }
  return normalizeHomeServicesCms(DEFAULT_HOME_SERVICES_CMS);
}

function saveHomeServicesStore(payload: HomeServicesCmsPayload): void {
  try {
    if (!fs.existsSync(homeSlideshowStoreDir)) {
      fs.mkdirSync(homeSlideshowStoreDir, { recursive: true });
    }
    fs.writeFileSync(homeServicesStoreFile, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist home-services.json:", err);
  }
}

let homeServicesCms: HomeServicesCmsPayload = loadHomeServicesStore();

// Home Top Picks & Accessories Ribbon CMS Store
const homeFeaturedProductsStoreFile = path.resolve(
  homeSlideshowStoreDir,
  "home-featured-products.json"
);

function loadHomeFeaturedProductsStore(): HomeFeaturedProductsCmsPayload {
  try {
    if (fs.existsSync(homeFeaturedProductsStoreFile)) {
      const raw = fs.readFileSync(homeFeaturedProductsStoreFile, "utf-8");
      const parsed = JSON.parse(raw);
      return normalizeHomeFeaturedProductsCms(parsed);
    }
  } catch (err) {
    console.warn(
      "Failed to read persisted home-featured-products.json, using defaults:",
      err
    );
  }
  return normalizeHomeFeaturedProductsCms(DEFAULT_HOME_FEATURED_PRODUCTS_CMS);
}

function saveHomeFeaturedProductsStore(
  payload: HomeFeaturedProductsCmsPayload
): void {
  try {
    if (!fs.existsSync(homeSlideshowStoreDir)) {
      fs.mkdirSync(homeSlideshowStoreDir, { recursive: true });
    }
    fs.writeFileSync(
      homeFeaturedProductsStoreFile,
      JSON.stringify(payload, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to persist home-featured-products.json:", err);
  }
}

let homeFeaturedProductsCms: HomeFeaturedProductsCmsPayload =
  loadHomeFeaturedProductsStore();

function getServerGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function syncFromBloggerSource(
  targetUrl: string,
  blogId = "",
  apiKey = ""
): Promise<{
  posts: BlogPostItem[];
  blogTitle: string;
  addedCount: number;
  updatedCount: number;
  syncedTotal: number;
}> {
  let parsedTitle = bloggerConfig.blogTitle || "Blogger Feed";
  let incomingPosts: BlogPostItem[] = [];

  if (blogId.trim() && apiKey.trim()) {
    const v3Url = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(
      blogId.trim()
    )}/posts?key=${encodeURIComponent(apiKey.trim())}&maxResults=25`;
    const v3Res = await fetch(v3Url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!v3Res.ok) {
      throw new Error(`Blogger API v3 returned HTTP ${v3Res.status}`);
    }
    const v3Json = await v3Res.json();
    const parsedV3 = parseBloggerApiV3Response(v3Json);
    incomingPosts = parsedV3.posts;
  } else {
    const jsonUrl = buildBloggerFeedUrl(targetUrl, 25);
    if (!jsonUrl) {
      throw new Error("Please enter a valid Blogger.com URL (e.g. https://yourblog.blogspot.com).");
    }

    const feedRes = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json, application/atom+xml, text/xml;q=0.9",
        "User-Agent": "Innovista-Blog-Sync/1.0",
      },
    });

    if (feedRes.ok) {
      const contentType = feedRes.headers.get("content-type") || "";
      const rawText = await feedRes.text();
      if (contentType.includes("json") || rawText.trim().startsWith("{")) {
        const json = JSON.parse(rawText);
        const parsed = parseBloggerJsonFeed(json);
        parsedTitle = parsed.blogTitle;
        incomingPosts = parsed.posts;
      } else {
        const parsed = parseBloggerAtomFeed(rawText);
        parsedTitle = parsed.blogTitle;
        incomingPosts = parsed.posts;
      }
    } else {
      const atomUrl = buildBloggerAtomUrl(targetUrl, 25);
      const atomRes = await fetch(atomUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/atom+xml, text/xml" },
      });
      if (!atomRes.ok) {
        throw new Error(`Blogger feed returned HTTP ${feedRes.status}`);
      }
      const atomXml = await atomRes.text();
      const parsed = parseBloggerAtomFeed(atomXml);
      parsedTitle = parsed.blogTitle;
      incomingPosts = parsed.posts;
    }
  }

  const mergeRes = mergeSyncedBloggerPosts(blogPosts, incomingPosts);
  blogPosts = mergeRes.merged;

  bloggerConfig = {
    ...bloggerConfig,
    blogUrl: normalizeBloggerOrigin(targetUrl) || bloggerConfig.blogUrl,
    blogId: blogId.trim(),
    apiKey: apiKey.trim(),
    blogTitle: parsedTitle,
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: "success",
    lastSyncCount: incomingPosts.length,
    lastSyncMessage:
      incomingPosts.length > 0
        ? `Synced ${incomingPosts.length} post${incomingPosts.length === 1 ? "" : "s"} from ${parsedTitle}.`
        : `Connected to ${parsedTitle}, no public posts returned yet.`,
  };

  return {
    posts: blogPosts,
    blogTitle: parsedTitle,
    addedCount: mergeRes.addedCount,
    updatedCount: mergeRes.updatedCount,
    syncedTotal: incomingPosts.length,
  };
}

// =================== API ENDPOINTS ===================

// Upload route (allows admin to upload images and videos directly)
app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  const isVideo =
    req.file.mimetype?.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(req.file.originalname || "");
  return res.json({
    secure_url: fileUrl,
    url: fileUrl,
    filename: req.file.filename,
    mediaType: isVideo ? "video" : "image",
  });
});

// Auth endpoints
app.post("/auth/login", (req: Request, res: Response) => {
  const email = (req.query.email as string) || req.body?.email || req.body?.username;
  const password = (req.query.password as string) || req.body?.password;

  const admin = admins.find(
    (a) => a.Admin_Email?.toLowerCase() === email?.toLowerCase()
  );

  if (!admin || (admin.Admin_Password && admin.Admin_Password !== password)) {
    // If entered default demo credentials
    if (email === "admin@innovista.com" && password === "admin123") {
      return res.json({
        message: "Login successful!",
        tokens: {
          accessToken: "mock-access-token-" + Date.now(),
          refreshToken: "mock-refresh-token-" + Date.now(),
        },
        admin: admins[0],
      });
    }
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    message: "Login successful!",
    tokens: {
      accessToken: "mock-access-token-" + admin.AdminId + "-" + Date.now(),
      refreshToken: "mock-refresh-token-" + admin.AdminId + "-" + Date.now(),
    },
    admin,
  });
});

app.get("/auth/refresh", (_req: Request, res: Response) => {
  return res.json({
    accessToken: "mock-new-access-token-" + Date.now(),
  });
});

app.post("/auth/register", (req: Request, res: Response) => {
  const { Admin_Name, Admin_Email, Admin_Phone, Admin_Password, Admin_Profile } = req.body;
  if (!Admin_Name || !Admin_Email) {
    return res.status(400).json({ message: "Name and Email are required." });
  }
  const newAdmin: Admin = {
    AdminId: Date.now(),
    Admin_Name,
    Admin_Email,
    Admin_Phone: Admin_Phone || "",
    Admin_Password: Admin_Password || "admin123",
    Admin_Profile: Admin_Profile || "/assets/about/director.jpg",
  };
  admins.push(newAdmin);
  return res.json({ message: "Admin registered successfully!", admin: newAdmin });
});

app.get("/auth/getAllAdmins", (_req: Request, res: Response) => {
  const sanitized = admins.map((admin) => {
    const copy = { ...admin };
    delete copy.Admin_Password;
    return copy;
  });
  return res.json(sanitized);
});

app.delete("/auth/RemoveAdmin", (req: Request, res: Response) => {
  const adminId = parseInt(req.query.adminId as string, 10);
  if (admins.length <= 1) {
    return res.status(400).json({ message: "Cannot remove the only remaining admin." });
  }
  admins = admins.filter((a) => a.AdminId !== adminId);
  return res.json({ message: "Admin removed successfully." });
});

app.post("/auth/ResetPassword", (_req: Request, res: Response) => {
  return res.json({ message: "Password reset successfully." });
});

app.post("/auth/forgot-password", (req: Request, res: Response) => {
  const newPassword = (req.query.newPassword as string) || req.body?.newPassword;
  if (newPassword && admins[0]) {
    admins[0].Admin_Password = newPassword;
  }
  return res.json({ message: "Password reset successfully." });
});

app.get("/admin/summary", (_req: Request, res: Response) => {
  const pendingOrders = orders.filter((o) => o.Order_Status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.Order_Status === "COMPLETED").length;
  const verifiedCustomers = customers.filter((c) => c.Verify_State).length;
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const totalProjectBudget = projects.reduce((sum, p) => sum + (Number(p.Budget) || 0), 0);

  return res.json({
    admins: admins.length,
    designs: designs.length,
    categories: productCategories.length,
    customers: customers.length,
    verifiedCustomers,
    orders: orders.length,
    pendingOrders,
    completedOrders,
    projects: projects.length,
    totalProjectBudget,
    feedbacks: feedbacks.length,
    unreadNotifications,
    blogs: blogPosts.length,
    homeBlogs: blogPosts.filter((b) => b.showOnHome).length,
  });
});

app.post("/auth/logout", (_req: Request, res: Response) => {
  return res.json({ message: "Logout successful." });
});

// Projects endpoints
app.get("/projects/getAllProjects", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = projects.slice(startIndex, endIndex);
  return res.json({
    data,
    total: projects.length,
    page,
    limit,
  });
});

app.post("/projects/createProject", (req: Request, res: Response) => {
  const newProject: Project = {
    ...req.body,
    ProjectID: Date.now(),
    Project_CreatedAt: new Date().toISOString(),
  };
  projects.unshift(newProject);
  return res.json({ message: "Project created successfully!", data: newProject });
});

app.delete("/projects/deleteProject", (req: Request, res: Response) => {
  const id = parseInt(req.query.ProjectID as string, 10);
  projects = projects.filter((p) => p.ProjectID !== id);
  return res.json({ message: "Project deleted successfully!" });
});

app.put("/projects/updateProject", (req: Request, res: Response) => {
  const id = req.body.ProjectID;
  const index = projects.findIndex((p) => p.ProjectID === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...req.body };
    return res.json({ message: "Project updated successfully!", data: projects[index] });
  }
  return res.status(404).json({ message: "Project not found" });
});

// Designs endpoints
app.get("/designs/all", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = designs.slice(startIndex, endIndex);
  return res.json({
    data,
    total: designs.length,
    page,
    limit,
  });
});

app.get("/designs/byCategory", (req: Request, res: Response) => {
  const categoryParam = ((req.query.category as string) || "").trim();
  if (!categoryParam || categoryParam.toLowerCase() === "all") {
    return res.json(designs);
  }
  const matchedCat = findCategoryByParam(productCategories, categoryParam);
  const filtered = designs.filter((d) =>
    designMatchesCategory(d, matchedCat || categoryParam)
  );
  return res.json(filtered);
});

app.get("/designs/DesignDetails", (req: Request, res: Response) => {
  const idsStr = (req.query.ids as string) || "";
  const idList = idsStr.split(",").map((s) => s.trim()).filter(Boolean);
  const found = designs.filter((d) => idList.includes(String(d.DesignID)));
  return res.json(found);
});

app.get("/designs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const found = designs.find((d) => String(d.DesignID) === String(id));
  if (!found) {
    return res.status(404).json({ message: "Design not found" });
  }
  const relatedDesigns = resolveRelatedDesigns(found, designs, productCategories, 4);
  return res.json({ data: found, relatedDesigns });
});

app.post("/designs/create", (req: Request, res: Response) => {
  const newDesign = normalizeDesignItem(
    {
      ...req.body,
      DesignID: Date.now(),
      Design_CreatedAt: new Date().toISOString(),
    },
    Date.now()
  );
  designs.unshift(newDesign);
  return res.json({ message: "Design created successfully!", data: newDesign });
});

app.delete("/designs/deleteDesign", (req: Request, res: Response) => {
  const id = String(req.query.designId || "");
  designs = designs
    .filter((d) => String(d.DesignID) !== id)
    .map((d) => ({
      ...d,
      relatedProductIds: (d.relatedProductIds || []).filter(
        (rid) => String(rid) !== id
      ),
    }));
  return res.json({ message: "Design deleted successfully!" });
});

app.put("/designs/updateDesign", (req: Request, res: Response) => {
  const id = req.body.DesignID;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index !== -1) {
    const existing = designs[index];
    const updated = normalizeDesignItem(
      {
        ...existing,
        ...req.body,
        DesignID: existing.DesignID,
        Design_CreatedAt: existing.Design_CreatedAt,
      },
      existing.DesignID
    );
    designs[index] = updated;
    return res.json({ message: "Design updated successfully!", data: updated });
  }
  return res.status(404).json({ message: "Design not found" });
});

app.put("/designs/:id/related", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: "Design not found" });
  }
  const rawIds = Array.isArray(req.body?.relatedProductIds)
    ? req.body.relatedProductIds
    : [];
  const existing = designs[index];
  const updated = normalizeDesignItem(
    {
      ...existing,
      relatedProductIds: rawIds,
    },
    existing.DesignID
  );
  designs[index] = updated;
  return res.json({
    message: "Related products linked successfully!",
    data: updated,
    relatedDesigns: resolveRelatedDesigns(updated, designs, productCategories, 4),
  });
});

app.put("/designs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: "Design not found" });
  }
  const existing = designs[index];
  const updated = normalizeDesignItem(
    {
      ...existing,
      ...req.body,
      DesignID: existing.DesignID,
      Design_CreatedAt: existing.Design_CreatedAt,
    },
    existing.DesignID
  );
  designs[index] = updated;
  return res.json({ message: "Design updated successfully!", data: updated });
});

// Customers endpoints
app.get("/customer/getAllCustomers", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = customers.slice(startIndex, endIndex);
  return res.json({
    data,
    total: customers.length,
    page,
    limit,
  });
});

app.post("/customer/Customer_register", (req: Request, res: Response) => {
  const newCustomer: Customer = {
    ...req.body,
    CustomerId: Date.now(),
    Verify_State: false,
  };
  customers.unshift(newCustomer);
  return res.json({
    message: "Customer registered successfully. Check your email for verification.",
    data: newCustomer,
  });
});

app.put("/customer/updateCustomer", (req: Request, res: Response) => {
  const id = req.body.CustomerId;
  const index = customers.findIndex((c) => c.CustomerId === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...req.body };
    return res.json({ message: "Customer updated successfully!", data: customers[index] });
  }
  return res.status(404).json({ message: "Customer not found" });
});

app.delete("/customer/deleteCustomer", (req: Request, res: Response) => {
  const id = parseInt(req.query.customerId as string, 10);
  customers = customers.filter((c) => c.CustomerId !== id);
  return res.json({ message: "Customer deleted successfully!" });
});

app.post("/customer/login", (req: Request, res: Response) => {
  const email = (req.body.email || req.query.email || "").toString().trim().toLowerCase();
  const password = (req.body.password || req.query.password || "").toString().trim();

  if (!email) {
    return res.status(400).json({ message: "Email or phone number is required." });
  }

  // Find customer by email or phone
  let customer = customers.find(
    (c) =>
      c.Cus_Email.toLowerCase() === email ||
      c.Cus_PhoneNumber.replace(/\s+/g, "") === email.replace(/\s+/g, "")
  );

  // If customer doesn't exist, create a new verified client for a smooth experience
  if (!customer) {
    customer = {
      CustomerId: Date.now(),
      Cus_Name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      Cus_Email: email.includes("@") ? email : `${email}@example.com`,
      Cus_PhoneNumber: email.includes("@") ? "+94 77 123 4567" : email,
      Cus_CompanyName: "Innovista Client Partner",
      Cus_Logo: "/assets/logos/client-zenith.svg",
      Cus_Password: password || "customer123",
      Verify_State: true,
      Purchase_Goods: ["Architectural Glazing", "Custom Aluminium"],
    };
    customers.push(customer);
  }

  return res.json({
    message: "Customer login successful!",
    tokens: {
      accessToken: "mock-cus-access-token-" + customer.CustomerId + "-" + Date.now(),
      refreshToken: "mock-cus-refresh-token-" + customer.CustomerId + "-" + Date.now(),
    },
    customer,
  });
});

app.get("/customer/profile", (req: Request, res: Response) => {
  const customerId = parseInt(req.query.customerId as string, 10);
  const email = (req.query.email as string || "").toLowerCase();

  let customer = customers.find(
    (c) => (customerId && c.CustomerId === customerId) || (email && c.Cus_Email.toLowerCase() === email)
  );

  if (!customer) {
    customer = customers[0];
  }

  // Get orders associated with this customer
  const customerOrders = orders.filter(
    (o) =>
      (customer && o.Client_Email.toLowerCase() === customer.Cus_Email.toLowerCase()) ||
      (customer && o.Client_Name.toLowerCase() === customer.Cus_Name.toLowerCase()) ||
      (customer && o.Customer?.Cus_CompanyName === customer.Cus_CompanyName)
  );

  return res.json({
    customer,
    orders: customerOrders,
  });
});

app.put("/customer/updateProfile", (req: Request, res: Response) => {
  const customerId = req.body.CustomerId || parseInt(req.query.customerId as string, 10);
  const index = customers.findIndex((c) => c.CustomerId === customerId);

  if (index !== -1) {
    customers[index] = {
      ...customers[index],
      ...req.body,
    };
    return res.json({
      message: "Profile updated successfully!",
      customer: customers[index],
    });
  }

  return res.status(404).json({ message: "Customer profile not found" });
});

app.post("/customer/verifyCustomer", (req: Request, res: Response) => {
  const id = parseInt(req.query.customerId as string, 10);
  const customer = customers.find((c) => c.CustomerId === id);
  if (customer) {
    customer.Verify_State = true;
    return res.json({ message: "Customer verified successfully!" });
  }
  return res.status(404).json({ message: "Customer not found." });
});

// Orders endpoints
app.get("/order/getAllOrders", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = orders.slice(startIndex, endIndex);
  return res.json({
    data,
    total: orders.length,
    page,
    limit,
  });
});

app.post("/order/createOrder", (req: Request, res: Response) => {
  const rawDesigns = Array.isArray(req.body.Designs) ? req.body.Designs : [];
  const designItems =
    rawDesigns.length > 0
      ? rawDesigns.map((item: { DesignID: string | number }) => {
          const fullDesign = designs.find(
            (d) => String(d.DesignID) === String(item.DesignID)
          );
          return {
            Design: {
              Design_Name:
                fullDesign?.Design_Name ||
                req.body.Product_Name ||
                "Custom Fabrication Item",
              Design_Image: fullDesign?.Design_Image || [],
            },
          };
        })
      : [
          {
            Design: {
              Design_Name: req.body.Product_Name || "General Product Inquiry",
              Design_Image: [],
            },
          },
        ];

  const inquiryType =
    typeof req.body.Inquiry_Type === "string" && req.body.Inquiry_Type.trim()
      ? req.body.Inquiry_Type.trim()
      : "Product Quotation";

  const newOrder: Order = {
    OrderID: "ORD-" + Math.floor(1000 + Math.random() * 9000),
    Order_Date: new Date().toISOString(),
    Order_Status: "PENDING",
    Client_Name: req.body.Client_Name || "Valued Client",
    Client_Email: req.body.Client_Email || "client@example.com",
    Client_Number: req.body.Client_Number,
    Customer: {
      Cus_CompanyName: inquiryType,
    },
    Designs: designItems,
  };
  orders.unshift(newOrder);

  // Trigger notification
  notifications.unshift({
    id: "notif-" + Date.now(),
    NotificationsID: "notif-" + Date.now(),
    Notifications_Title: `New ${inquiryType} (${newOrder.OrderID})`,
    Notifications_Body: `Inquiry from ${newOrder.Client_Name} (${newOrder.Client_Email}) for ${
      designItems[0]?.Design?.Design_Name || "Custom System"
    }.`,
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  });

  return res.json({ message: "Quote request submitted successfully!", data: newOrder });
});

app.put("/order/ChangeStates", (req: Request, res: Response) => {
  const orderId = req.query.orderId as string;
  const status = req.query.Status as Order["Order_Status"];
  const order = orders.find((o) => o.OrderID === orderId);
  if (order && status) {
    order.Order_Status = status;
    return res.json({ message: `Status updated to ${status}!`, order });
  }
  return res.status(404).json({ message: "Order not found" });
});

// Feedback endpoints
app.get("/feedback/allFeedbacks", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const homeOnly =
    req.query.homeOnly === "true" || req.query.homeOnly === "1";

  const ordered = [...feedbacks]
    .filter((f) => (homeOnly ? f.showOnHome !== false : true))
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return b.Feed_backId - a.Feed_backId;
    });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = ordered.slice(startIndex, endIndex);

  return res.json({
    data,
    total: ordered.length,
    page,
    limit,
  });
});

app.delete("/feedback/deleteFeedback", (req: Request, res: Response) => {
  const id = parseInt(req.query.feedbackId as string, 10);
  feedbacks = feedbacks
    .filter((f) => f.Feed_backId !== id)
    .map((f, idx) => ({ ...f, displayOrder: idx }));
  saveCustomerFeedbacksStore(feedbacks);
  return res.json({ message: "Feedback deleted successfully!" });
});

app.post("/feedback/createFeedback", (req: Request, res: Response) => {
  const newFeedback = normalizeCustomerFeedbackRecord(
    {
      ...req.body,
      Feed_backId: Date.now(),
      displayOrder: 0,
      createdAt: new Date().toISOString(),
    },
    0
  );
  feedbacks = [
    newFeedback,
    ...feedbacks.map((f, idx) => ({ ...f, displayOrder: idx + 1 })),
  ];
  saveCustomerFeedbacksStore(feedbacks);
  return res.json({
    message: "Feedback submitted successfully!",
    data: newFeedback,
  });
});

app.put("/feedback/updateFeedback/:id", (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id || ""), 10);
  const idx = feedbacks.findIndex((f) => f.Feed_backId === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Feedback not found." });
  }
  const existing = feedbacks[idx];
  const updated = normalizeCustomerFeedbackRecord(
    {
      ...existing,
      ...req.body,
      Feed_backId: existing.Feed_backId,
      Customer: {
        ...existing.Customer,
        ...(req.body?.Customer || {}),
      },
      Design: {
        ...existing.Design,
        ...(req.body?.Design || {}),
      },
      displayOrder:
        typeof req.body?.displayOrder === "number"
          ? req.body.displayOrder
          : existing.displayOrder,
    },
    idx
  );
  feedbacks[idx] = updated;
  saveCustomerFeedbacksStore(feedbacks);
  return res.json({
    message: "Feedback updated successfully!",
    data: updated,
  });
});

app.patch("/feedback/toggleHome/:id", (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id || ""), 10);
  const idx = feedbacks.findIndex((f) => f.Feed_backId === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Feedback not found." });
  }
  const nextShow =
    typeof req.body?.showOnHome === "boolean"
      ? req.body.showOnHome
      : !feedbacks[idx].showOnHome;
  feedbacks[idx] = {
    ...feedbacks[idx],
    showOnHome: nextShow,
  };
  saveCustomerFeedbacksStore(feedbacks);
  return res.json({
    message: nextShow
      ? "Feedback shown on Home page."
      : "Feedback hidden from Home page.",
    data: feedbacks[idx],
  });
});

app.put("/feedback/reorder", (req: Request, res: Response) => {
  const orderedIds = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds.map((id: unknown) => Number(id))
    : [];
  if (orderedIds.length === 0) {
    return res.status(400).json({ message: "orderedIds array is required." });
  }
  const orderMap = new Map<number, number>();
  orderedIds.forEach((id: number, idx: number) => {
    if (Number.isFinite(id)) orderMap.set(id, idx);
  });
  feedbacks = [...feedbacks]
    .sort((a, b) => {
      const oa = orderMap.has(a.Feed_backId)
        ? orderMap.get(a.Feed_backId)!
        : Number.MAX_SAFE_INTEGER;
      const ob = orderMap.has(b.Feed_backId)
        ? orderMap.get(b.Feed_backId)!
        : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    })
    .map((item, idx) => ({ ...item, displayOrder: idx }));
  saveCustomerFeedbacksStore(feedbacks);
  return res.json({
    message: "Customer feedback order updated.",
    data: feedbacks,
  });
});

// Notifications endpoints
app.get("/Notification/getalerts", (_req: Request, res: Response) => {
  return res.json(notifications);
});

app.post("/Notification/markAsRead", (req: Request, res: Response) => {
  const id = (req.query.NotificationsID as string) || req.body?.NotificationsID;
  const notif = notifications.find((n) => n.NotificationsID === id || n.id === id);
  if (notif) {
    notif.isRead = true;
    return res.json({ message: "Notification marked as read." });
  }
  return res.status(404).json({ message: "Notification not found." });
});

// About Page Full CMS Endpoints (Slideshow Speed, Vision, Mission, Leadership, Teams, Journey, Partners, Clients, Feedbacks)
app.get("/about/vision-mission", (_req: Request, res: Response) => {
  return res.json(visionMissionContent);
});

app.put("/about/vision-mission", (req: Request, res: Response) => {
  if (req.body) {
    visionMissionContent = normalizeAboutCmsPayload(req.body, visionMissionContent);
    return res.json({
      message: "About showcase, slideshow, and sections updated successfully!",
      data: visionMissionContent,
    });
  }
  return res.status(400).json({ message: "Invalid payload" });
});

app.get("/about/hero-slides", (_req: Request, res: Response) => {
  return res.json({
    heroSlides: visionMissionContent.heroSlides,
    slideshowSpeedMs: visionMissionContent.slideshowSpeedMs,
  });
});

app.put("/about/hero-slides", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.heroSlides) || req.body.heroSlides.length === 0) {
    return res.status(400).json({ message: "At least one slide is required." });
  }
  visionMissionContent.heroSlides = req.body.heroSlides;
  if (req.body.slideshowSpeedMs !== undefined) {
    visionMissionContent.slideshowSpeedMs = clampSlideshowSpeedMs(req.body.slideshowSpeedMs);
  }
  return res.json({
    message: "Hero slideshow updated successfully!",
    heroSlides: visionMissionContent.heroSlides,
    slideshowSpeedMs: visionMissionContent.slideshowSpeedMs,
  });
});

app.get("/about/partners", (_req: Request, res: Response) => {
  return res.json({
    data: visionMissionContent.partners,
    partnersRibbonSpeed: visionMissionContent.partnersRibbonSpeed,
  });
});

app.put("/about/partners", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.partners)) {
    return res.status(400).json({ message: "Partners list is required." });
  }
  const nextSpeed =
    req.body?.partnersRibbonSpeed !== undefined
      ? clampRibbonSpeed(req.body.partnersRibbonSpeed, DEFAULT_PARTNERS_RIBBON_SPEED)
      : visionMissionContent.partnersRibbonSpeed;
  visionMissionContent = normalizeAboutCmsPayload(
    {
      ...visionMissionContent,
      partners: req.body.partners,
      partnersRibbonSpeed: nextSpeed,
    },
    visionMissionContent
  );
  return res.json({
    message: "Partners updated!",
    data: visionMissionContent.partners,
    partnersRibbonSpeed: visionMissionContent.partnersRibbonSpeed,
  });
});

app.get("/about/clients", (_req: Request, res: Response) => {
  return res.json({
    data: visionMissionContent.clients,
    clientsRibbonSpeed: visionMissionContent.clientsRibbonSpeed,
  });
});

app.put("/about/clients", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.clients)) {
    return res.status(400).json({ message: "Clients list is required." });
  }
  const nextSpeed =
    req.body?.clientsRibbonSpeed !== undefined
      ? clampRibbonSpeed(req.body.clientsRibbonSpeed, DEFAULT_CLIENTS_RIBBON_SPEED)
      : visionMissionContent.clientsRibbonSpeed;
  visionMissionContent = normalizeAboutCmsPayload(
    {
      ...visionMissionContent,
      clients: req.body.clients,
      clientsRibbonSpeed: nextSpeed,
    },
    visionMissionContent
  );
  return res.json({
    message: "Clients updated!",
    data: visionMissionContent.clients,
    clientsRibbonSpeed: visionMissionContent.clientsRibbonSpeed,
  });
});

// Product Landing Slideshow & Product Categories CRUD Endpoints
app.get("/products/cms", (_req: Request, res: Response) => {
  const orderedCategories = [...productCategories].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  return res.json({
    landing: productLandingCms,
    categories: orderedCategories,
  });
});

app.put("/products/cms", (req: Request, res: Response) => {
  productLandingCms = normalizeProductLandingCms(
    req.body?.landing || req.body,
    productLandingCms
  );
  return res.json({
    message: "Product landing slideshow updated successfully!",
    landing: productLandingCms,
  });
});

app.get("/products/categories", (_req: Request, res: Response) => {
  const orderedCategories = [...productCategories].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  return res.json({ data: orderedCategories });
});

app.post("/products/categories", (req: Request, res: Response) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ message: "Category name is required." });
  }
  const normalized = normalizeProductCategory(
    {
      ...req.body,
      CategoryID: `cat-${Date.now()}`,
      displayOrder: productCategories.length + 1,
    },
    productCategories.length
  );

  // Ensure slug uniqueness
  const duplicateSlug = productCategories.some(
    (cat) => cat.slug.toLowerCase() === normalized.slug.toLowerCase()
  );
  if (duplicateSlug) {
    normalized.slug = `${normalized.slug}-${Date.now().toString().slice(-4)}`;
  }

  productCategories.push(normalized);
  return res.json({
    message: "Product category created successfully!",
    data: normalized,
  });
});

app.put("/products/categories/reorder", (req: Request, res: Response) => {
  const orderedIds: string[] = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds
    : [];
  if (orderedIds.length === 0) {
    return res.status(400).json({ message: "orderedIds array is required." });
  }

  const map = new Map(productCategories.map((c) => [c.CategoryID, c]));
  const nextList: ProductCategory[] = [];
  orderedIds.forEach((id, idx) => {
    const found = map.get(id);
    if (found) {
      nextList.push({ ...found, displayOrder: idx + 1 });
      map.delete(id);
    }
  });
  for (const remaining of map.values()) {
    nextList.push({ ...remaining, displayOrder: nextList.length + 1 });
  }
  productCategories = nextList;
  return res.json({
    message: "Categories reordered successfully!",
    data: productCategories,
  });
});

app.put("/products/categories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = productCategories.findIndex(
    (c) => c.CategoryID === id || c.slug === id
  );
  if (idx === -1) {
    return res.status(404).json({ message: "Category not found." });
  }
  const existing = productCategories[idx];
  const updated = normalizeProductCategory(
    {
      ...existing,
      ...req.body,
      CategoryID: existing.CategoryID,
      displayOrder:
        typeof req.body?.displayOrder === "number"
          ? req.body.displayOrder
          : existing.displayOrder,
    },
    idx
  );
  productCategories[idx] = updated;
  return res.json({
    message: "Category updated successfully!",
    data: updated,
  });
});

app.delete("/products/categories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (productCategories.length <= 1) {
    return res
      .status(400)
      .json({ message: "At least one product category must remain active." });
  }
  const before = productCategories.length;
  productCategories = productCategories
    .filter((c) => c.CategoryID !== id && c.slug !== id)
    .map((c, idx) => ({ ...c, displayOrder: idx + 1 }));

  if (productCategories.length === before) {
    return res.status(404).json({ message: "Category not found." });
  }
  return res.json({ message: "Category deleted successfully!" });
});

// Page Advertisements CMS Endpoints (multiple image ads + auto-slideshow interval per card page)
app.get("/ads/cms", (req: Request, res: Response) => {
  const requestedKey = req.query.pageKey;
  if (isValidAdPageKey(requestedKey)) {
    return res.json({
      page: pageAdsCms.pages[requestedKey],
      pages: pageAdsCms.pages,
    });
  }
  return res.json(pageAdsCms);
});

app.put("/ads/cms", (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ message: "Invalid payload." });
  }
  if (isValidAdPageKey(req.body.pageKey)) {
    const key = req.body.pageKey;
    const updatedPage = normalizeSinglePageAdsConfig(
      req.body,
      key,
      pageAdsCms.pages[key]
    );
    pageAdsCms = {
      pages: {
        ...pageAdsCms.pages,
        [key]: updatedPage,
      },
    };
    return res.json({
      message: "Page advertisements updated successfully!",
      page: updatedPage,
      pages: pageAdsCms.pages,
    });
  }
  pageAdsCms = normalizePageAdsCms(req.body, pageAdsCms);
  return res.json({
    message: "All page advertisements updated successfully!",
    pages: pageAdsCms.pages,
  });
});

app.put("/ads/cms/:pageKey", (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    req.body,
    pageKey,
    pageAdsCms.pages[pageKey]
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: `${updatedPage.label} advertisements updated!`,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.post("/ads/cms/:pageKey/ads", (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const slide = normalizePageAdSlide(
    {
      ...req.body,
      id: req.body?.id || `ad-${pageKey}-${Date.now()}`,
    },
    current.ads.length
  );
  if (!slide) {
    return res.status(400).json({ message: "Advertisement image is required." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    {
      ...current,
      enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : true,
      ads: [...current.ads, slide],
    },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement added successfully!",
    slide,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.put("/ads/cms/:pageKey/ads/:adId", (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const idx = current.ads.findIndex((a) => a.id === adId);
  if (idx === -1) {
    return res.status(404).json({ message: "Advertisement not found." });
  }
  const updatedSlide = normalizePageAdSlide(
    {
      ...current.ads[idx],
      ...req.body,
      id: adId,
    },
    idx
  );
  if (!updatedSlide) {
    return res.status(400).json({ message: "Advertisement image is required." });
  }
  const nextAds = current.ads.map((a) => (a.id === adId ? updatedSlide : a));
  const updatedPage = normalizeSinglePageAdsConfig(
    { ...current, ads: nextAds },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement updated successfully!",
    slide: updatedSlide,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.delete("/ads/cms/:pageKey/ads/:adId", (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const before = current.ads.length;
  const nextAds = current.ads.filter((a) => a.id !== adId);
  if (nextAds.length === before) {
    return res.status(404).json({ message: "Advertisement not found." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    { ...current, ads: nextAds },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement deleted successfully!",
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

// Downloadable Resource Attachments Endpoint
app.get("/api/resources/download/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const item = RESOURCE_ATTACHMENTS.find((doc) => doc.id === id);
  if (!item) {
    return res.status(404).json({ message: "Resource attachment not found." });
  }

  const documentBody = [
    "INNOVISTA METAL FABRICONIX PVT LTD — TECHNICAL RESOURCE",
    "================================================================",
    `Document Title : ${item.title}`,
    `Document Format: ${item.format}`,
    `Summary        : ${item.summary}`,
    `Prepared Date  : ${new Date().toISOString().slice(0, 10)}`,
    "",
    "CORE ARCHITECTURAL SPECIFICATIONS",
    "----------------------------------------------------------------",
    "- Alloy Grade        : Architectural Aluminium 6063-T5 / 6060-T66",
    "- Coastal Coating    : 25-Micron Anodizing / Qualicoat Class 2",
    "- Hardware Core      : European Marine-Grade SS316 Hardware",
    "- Structural Glazing : Toughened & Acoustic PVB Laminated Glass",
    "- Head Office        : No. 42, Nawala Road, Colombo 05, Sri Lanka",
    "- Direct Support     : engineering@innovista.lk | +94 11 234 5688",
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${item.fileName}"`
  );
  return res.send(documentBody);
});

// Related Hardware & Portals Collage CRUD Endpoints
app.get("/api/resources/portals", (_req: Request, res: Response) => {
  return res.json({ data: relatedPortals });
});

app.put("/api/resources/portals", (req: Request, res: Response) => {
  const payload = Array.isArray(req.body?.data) ? req.body.data : req.body;
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: "Portals array is required." });
  }
  relatedPortals = normalizeRelatedPortals(payload);
  return res.json({
    message: "Related portals collage updated successfully!",
    data: relatedPortals,
  });
});

app.post("/api/resources/portals", (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!name || !url) {
    return res
      .status(400)
      .json({ message: "Portal name and destination link are required." });
  }
  const tile = normalizePortalTile(
    {
      ...req.body,
      id: req.body?.id || `portal-${Date.now()}`,
    },
    relatedPortals.length
  );
  relatedPortals.push(tile);
  return res.json({
    message: "Portal collage tile added!",
    data: tile,
    items: relatedPortals,
  });
});

app.put("/api/resources/portals/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = relatedPortals.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Portal tile not found." });
  }
  const updated = normalizePortalTile(
    {
      ...relatedPortals[idx],
      ...req.body,
      id,
    },
    idx
  );
  relatedPortals[idx] = updated;
  return res.json({
    message: "Portal collage tile updated!",
    data: updated,
    items: relatedPortals,
  });
});

app.delete("/api/resources/portals/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const before = relatedPortals.length;
  relatedPortals = relatedPortals.filter((p) => p.id !== id);
  if (relatedPortals.length === before) {
    return res.status(404).json({ message: "Portal tile not found." });
  }
  return res.json({
    message: "Portal collage tile deleted!",
    items: relatedPortals,
  });
});

// Blogs & Blogger.com Synchronization Endpoints
app.get("/api/blogs", async (req: Request, res: Response) => {
  const shouldAutoSync =
    req.query.autoSync === "1" || req.query.forceSync === "1";
  const hasBloggerTarget = Boolean(
    bloggerConfig.blogUrl || (bloggerConfig.blogId && bloggerConfig.apiKey)
  );
  const isStale = Date.now() - lastAutoSyncAttemptAt > 60_000;

  if (
    shouldAutoSync &&
    hasBloggerTarget &&
    bloggerConfig.autoSyncOnVisit &&
    (req.query.forceSync === "1" || isStale)
  ) {
    lastAutoSyncAttemptAt = Date.now();
    try {
      await syncFromBloggerSource(
        bloggerConfig.blogUrl,
        bloggerConfig.blogId,
        bloggerConfig.apiKey
      );
    } catch (err) {
      bloggerConfig = {
        ...bloggerConfig,
        lastSyncStatus: "error",
        lastSyncMessage:
          err instanceof Error ? err.message : "Failed to refresh Blogger feed.",
      };
    }
  }

  const homeOnly = req.query.homeOnly === "true" || req.query.homeOnly === "1";
  const category = typeof req.query.category === "string" ? req.query.category : "All";
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const sourceParam =
    req.query.source === "blogger" || req.query.source === "local"
      ? req.query.source
      : "all";

  const list = homeOnly
    ? getHomePageBlogs(blogPosts)
    : filterBlogPosts(blogPosts, category, query, sourceParam);

  return res.json({
    posts: list,
    total: blogPosts.length,
    homeCount: blogPosts.filter((b) => b.showOnHome).length,
    config: {
      ...bloggerConfig,
      apiKey: bloggerConfig.apiKey ? "••••••••" : "",
      hasApiKey: Boolean(bloggerConfig.apiKey),
    },
  });
});

app.post("/api/blogs/sync-blogger", async (req: Request, res: Response) => {
  const requestedUrl =
    typeof req.body?.blogUrl === "string"
      ? req.body.blogUrl.trim()
      : bloggerConfig.blogUrl;
  const requestedBlogId =
    typeof req.body?.blogId === "string"
      ? req.body.blogId.trim()
      : bloggerConfig.blogId;
  const requestedApiKey =
    typeof req.body?.apiKey === "string" && req.body.apiKey !== "••••••••"
      ? req.body.apiKey.trim()
      : bloggerConfig.apiKey;
  const autoSyncOnVisit =
    typeof req.body?.autoSyncOnVisit === "boolean"
      ? req.body.autoSyncOnVisit
      : bloggerConfig.autoSyncOnVisit;

  bloggerConfig = {
    ...bloggerConfig,
    blogUrl: normalizeBloggerOrigin(requestedUrl) || requestedUrl,
    blogId: requestedBlogId,
    apiKey: requestedApiKey,
    autoSyncOnVisit,
  };

  if (!bloggerConfig.blogUrl && !(bloggerConfig.blogId && bloggerConfig.apiKey)) {
    return res.status(400).json({
      message: "Enter a Blogger.com URL (e.g. https://yourblog.blogspot.com) or Blog ID + API key.",
    });
  }

  try {
    lastAutoSyncAttemptAt = Date.now();
    const syncRes = await syncFromBloggerSource(
      bloggerConfig.blogUrl,
      bloggerConfig.blogId,
      bloggerConfig.apiKey
    );

    return res.json({
      message: `Synced ${syncRes.syncedTotal} posts from Blogger (${syncRes.addedCount} new, ${syncRes.updatedCount} updated).`,
      posts: blogPosts,
      addedCount: syncRes.addedCount,
      updatedCount: syncRes.updatedCount,
      syncedTotal: syncRes.syncedTotal,
      config: {
        ...bloggerConfig,
        apiKey: bloggerConfig.apiKey ? "••••••••" : "",
        hasApiKey: Boolean(bloggerConfig.apiKey),
      },
    });
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "Could not connect to Blogger.com feed.";
    bloggerConfig = {
      ...bloggerConfig,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: "error",
      lastSyncMessage: errMsg,
    };
    return res.status(502).json({
      message: `Blogger sync saved configuration, but remote feed fetch failed: ${errMsg}`,
      config: {
        ...bloggerConfig,
        apiKey: bloggerConfig.apiKey ? "••••••••" : "",
        hasApiKey: Boolean(bloggerConfig.apiKey),
      },
      posts: blogPosts,
    });
  }
});

app.put("/api/blogs/config", (req: Request, res: Response) => {
  const nextUrl =
    typeof req.body?.blogUrl === "string"
      ? normalizeBloggerOrigin(req.body.blogUrl) || req.body.blogUrl.trim()
      : bloggerConfig.blogUrl;
  const nextBlogId =
    typeof req.body?.blogId === "string"
      ? req.body.blogId.trim()
      : bloggerConfig.blogId;
  const nextApiKey =
    typeof req.body?.apiKey === "string" && req.body.apiKey !== "••••••••"
      ? req.body.apiKey.trim()
      : bloggerConfig.apiKey;
  const autoSyncOnVisit =
    typeof req.body?.autoSyncOnVisit === "boolean"
      ? req.body.autoSyncOnVisit
      : bloggerConfig.autoSyncOnVisit;

  if (req.body?.disconnect === true) {
    bloggerConfig = { ...DEFAULT_BLOGGER_CONFIG };
    if (req.body?.removeSyncedPosts) {
      blogPosts = blogPosts.filter((p) => p.source !== "blogger");
    }
    return res.json({
      message: "Blogger connection disconnected.",
      config: { ...bloggerConfig, hasApiKey: false },
      posts: blogPosts,
    });
  }

  bloggerConfig = {
    ...bloggerConfig,
    blogUrl: nextUrl,
    blogId: nextBlogId,
    apiKey: nextApiKey,
    autoSyncOnVisit,
    lastSyncMessage: nextUrl
      ? `Connected to ${nextUrl}. Click Sync Now to fetch latest posts.`
      : DEFAULT_BLOGGER_CONFIG.lastSyncMessage,
  };

  return res.json({
    message: "Blogger integration settings saved.",
    config: {
      ...bloggerConfig,
      apiKey: bloggerConfig.apiKey ? "••••••••" : "",
      hasApiKey: Boolean(bloggerConfig.apiKey),
    },
  });
});

app.put("/api/blogs/home-selection", (req: Request, res: Response) => {
  const homeIds: string[] = Array.isArray(req.body?.homeIds)
    ? req.body.homeIds.map(String)
    : [];
  const orderMap = new Map<string, number>();
  homeIds.forEach((id, idx) => orderMap.set(id, idx + 1));

  blogPosts = blogPosts.map((post) => {
    const order = orderMap.get(post.id);
    if (order !== undefined) {
      return { ...post, showOnHome: true, homeOrder: order };
    }
    return { ...post, showOnHome: false };
  });

  return res.json({
    message: "Home page blog selection updated!",
    posts: blogPosts,
    homePosts: getHomePageBlogs(blogPosts),
  });
});

app.post("/api/blogs", (req: Request, res: Response) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    return res.status(400).json({ message: "Blog title is required." });
  }
  const rawHtml =
    typeof req.body?.contentHtml === "string" && req.body.contentHtml.trim()
      ? req.body.contentHtml
      : `<p>${typeof req.body?.excerpt === "string" ? req.body.excerpt.trim() : title}</p>`;
  const sanitizedHtml = sanitizeBlogHtml(rawHtml);
  const nowIso = new Date().toISOString();
  const category =
    typeof req.body?.category === "string" && req.body.category.trim()
      ? req.body.category.trim()
      : "Architectural Journal";
  const labels = Array.isArray(req.body?.labels)
    ? req.body.labels.map(String).filter(Boolean)
    : [category];
  const nextHomeOrder =
    blogPosts.reduce((max, p) => Math.max(max, p.homeOrder || 0), 0) + 1;

  const created: BlogPostItem = {
    id: `blog-${Date.now()}`,
    title,
    excerpt:
      typeof req.body?.excerpt === "string" && req.body.excerpt.trim()
        ? req.body.excerpt.trim()
        : buildExcerpt(sanitizedHtml),
    contentHtml: sanitizedHtml,
    date: formatBlogDisplayDate(nowIso),
    publishedAt: nowIso,
    readTime:
      typeof req.body?.readTime === "string" && req.body.readTime.trim()
        ? req.body.readTime.trim()
        : computeReadTime(sanitizedHtml),
    category,
    labels,
    author:
      typeof req.body?.author === "string" && req.body.author.trim()
        ? req.body.author.trim()
        : "Innovista Editorial",
    coverImage:
      typeof req.body?.coverImage === "string" && req.body.coverImage.trim()
        ? req.body.coverImage.trim()
        : BLOGGER_COVER_FALLBACKS[blogPosts.length % BLOGGER_COVER_FALLBACKS.length],
    source: req.body?.source === "blogger" ? "blogger" : "local",
    bloggerUrl:
      typeof req.body?.bloggerUrl === "string" ? req.body.bloggerUrl.trim() : "",
    featured: Boolean(req.body?.featured),
    showOnHome: Boolean(req.body?.showOnHome),
    homeOrder:
      typeof req.body?.homeOrder === "number" ? req.body.homeOrder : nextHomeOrder,
  };

  blogPosts.unshift(created);
  return res.json({
    message: "Blog post published!",
    data: created,
    posts: blogPosts,
  });
});

app.put("/api/blogs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = blogPosts.findIndex((b) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Blog post not found." });
  }
  const existing = blogPosts[idx];
  const nextHtml =
    typeof req.body?.contentHtml === "string"
      ? sanitizeBlogHtml(req.body.contentHtml)
      : existing.contentHtml;

  const updated: BlogPostItem = {
    ...existing,
    ...req.body,
    id: existing.id,
    contentHtml: nextHtml,
    excerpt:
      typeof req.body?.excerpt === "string" && req.body.excerpt.trim()
        ? req.body.excerpt.trim()
        : existing.excerpt,
  };
  blogPosts[idx] = updated;
  return res.json({
    message: "Blog post updated!",
    data: updated,
    posts: blogPosts,
  });
});

app.delete("/api/blogs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const before = blogPosts.length;
  blogPosts = blogPosts.filter((b) => b.id !== id);
  if (blogPosts.length === before) {
    return res.status(404).json({ message: "Blog post not found." });
  }
  return res.json({
    message: "Blog post deleted.",
    posts: blogPosts,
  });
});

// Site-wide Contact & Phone Setup Endpoints
app.get("/api/site-settings", (_req: Request, res: Response) => {
  return res.json({ data: siteContactSettings });
});

app.put("/api/site-settings", (req: Request, res: Response) => {
  const candidate = normalizeSiteContactSettings(req.body, siteContactSettings);
  const errors = validateSiteContactSettings(candidate);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Invalid contact settings provided.",
      errors,
    });
  }
  siteContactSettings = candidate;
  return res.json({
    message: "Contact phone & channel settings saved.",
    data: siteContactSettings,
  });
});

// =================== CHATBOT SETUP, FAQ TRAINING & AI ASK ===================

app.get("/api/chatbot/config", (_req: Request, res: Response) => {
  return res.json({
    config: chatbotConfig,
    faqs: chatbotFaqs,
    contact: {
      phone: siteContactSettings.phone,
      whatsapp: siteContactSettings.whatsapp,
      email: siteContactSettings.email,
    },
  });
});

app.put("/api/chatbot/config", (req: Request, res: Response) => {
  chatbotConfig = normalizeChatbotConfig(req.body, chatbotConfig);
  return res.json({
    message: "Chatbot configuration saved!",
    config: chatbotConfig,
  });
});

app.post("/api/chatbot/faqs", (req: Request, res: Response) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
  if (!question || !answer) {
    return res.status(400).json({ message: "Question and answer are both required." });
  }
  const created = normalizeChatbotFaq(
    {
      ...req.body,
      id: `faq-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    },
    chatbotFaqs.length
  );
  chatbotFaqs.unshift(created);
  return res.json({
    message: "FAQ training pair added!",
    data: created,
    faqs: chatbotFaqs,
  });
});

app.put("/api/chatbot/faqs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = chatbotFaqs.findIndex((f) => f.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "FAQ item not found." });
  }
  const existing = chatbotFaqs[idx];
  const updated = normalizeChatbotFaq(
    {
      ...existing,
      ...req.body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    },
    idx
  );
  if (!updated.question || !updated.answer) {
    return res.status(400).json({ message: "Question and answer cannot be empty." });
  }
  chatbotFaqs[idx] = updated;
  return res.json({
    message: "FAQ training pair updated!",
    data: updated,
    faqs: chatbotFaqs,
  });
});

app.delete("/api/chatbot/faqs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const before = chatbotFaqs.length;
  chatbotFaqs = chatbotFaqs.filter((f) => f.id !== id);
  if (chatbotFaqs.length === before) {
    return res.status(404).json({ message: "FAQ item not found." });
  }
  return res.json({
    message: "FAQ training pair deleted.",
    faqs: chatbotFaqs,
  });
});

app.post("/api/chatbot/ask", async (req: Request, res: Response) => {
  const rawMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
  if (!rawMessage) {
    return res.status(400).json({ message: "Message is required." });
  }

  const intent = detectChatIntent(rawMessage);
  const faqMatch = matchTrainedFaq(rawMessage, chatbotFaqs);
  const whatsappUrl = buildWhatsAppChatUrl(
    siteContactSettings.whatsapp,
    rawMessage,
    chatbotConfig.defaultWhatsappPrefix
  );
  const smsUrl = buildSmsHref(siteContactSettings.phone, rawMessage);

  const enabledFaqs = chatbotFaqs.filter((f) => f.enabled);
  const faqKnowledgeBlock = enabledFaqs
    .map((f, idx) => `${idx + 1}. Q: ${f.question}\n   A: ${f.answer}`)
    .join("\n");

  const aiClient = getServerGeminiClient();
  let replyText = "";
  let source: "gemini" | "trained-faq" | "fallback" = "fallback";

  if (aiClient) {
    try {
      const conversationContext = history
        .map((h: { role?: string; text?: string }) =>
          `${h.role === "user" ? "Customer" : "Assistant"}: ${String(h.text || "").slice(0, 300)}`
        )
        .join("\n");

      const prompt = [
        conversationContext ? `Recent chat:\n${conversationContext}` : "",
        `Customer question: ${rawMessage}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const systemInstruction = [
        chatbotConfig.systemInstructions,
        `Company channels: Phone ${siteContactSettings.phone}, WhatsApp ${siteContactSettings.whatsapp}, Email ${siteContactSettings.email}.`,
        "Trained Q&A knowledge base (prioritize these facts whenever relevant):",
        faqKnowledgeBlock || "No custom FAQs added yet.",
        "Keep answers concise (max 3 short sentences). Do not use markdown code blocks.",
      ].join("\n\n");

      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
        },
      });
      const candidateText = (response.text || "").trim();
      if (candidateText) {
        replyText = candidateText;
        source = "gemini";
      }
    } catch {
      // Fall through cleanly to trained FAQ / deterministic response
    }
  }

  if (!replyText && faqMatch) {
    replyText = faqMatch.item.answer;
    source = "trained-faq";
  }

  if (!replyText) {
    if (intent === "visit") {
      replyText =
        "Available site visit slots are open Mon–Sat (09:30 AM, 11:00 AM, 02:00 PM, 03:30 PM). Pick a slot below or open the Site Visit tab to sync with Google Calendar.";
    } else if (intent === "whatsapp") {
      replyText =
        "Tap Chat on WhatsApp below to connect directly with our fabrication team with your message prefilled.";
    } else if (intent === "sms") {
      replyText = `You can send a direct text message to ${siteContactSettings.phone} using Text Phone below.`;
    } else if (intent === "quote") {
      replyText =
        "Send your dimensions or architectural drawings via Request Quote or WhatsApp for a 24–48h BOQ estimate.";
    } else {
      replyText = `Thanks for reaching Innovista Fabriconix. You can ask about products, quotes, coastal warranties, book a site visit, or chat directly on WhatsApp (${siteContactSettings.phone}).`;
    }
    source = "fallback";
  }

  return res.json({
    reply: replyText,
    source,
    intent,
    matchedFaqQuestion: faqMatch?.item.question || null,
    whatsappUrl,
    smsUrl,
    suggestions: chatbotConfig.quickPrompts.slice(0, 4),
  });
});

// =================== SITE VISIT SLOTS & BOOKING ENDPOINTS ===================

app.get("/api/site-visits/slots", (req: Request, res: Response) => {
  const upcomingDates = getUpcomingSiteVisitDates(10);
  const requestedDate =
    typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : upcomingDates[0]?.date || formatTodayIso();

  const slots = computeAvailableSlotsForDate(
    requestedDate,
    siteVisitBookings,
    blockedSiteVisitSlots
  );

  return res.json({
    date: requestedDate,
    dates: upcomingDates,
    slots,
    blockedKeys: blockedSiteVisitSlots,
  });
});

function formatTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

app.get("/api/site-visits", (_req: Request, res: Response) => {
  return res.json({
    data: siteVisitBookings,
    blockedKeys: blockedSiteVisitSlots,
  });
});

app.post("/api/site-visits", (req: Request, res: Response) => {
  const date = String(req.body?.date || "").trim();
  const slotTime = String(req.body?.slotTime || "").trim();
  const visitorName = String(req.body?.visitorName || "").trim();
  const visitorEmail = String(req.body?.visitorEmail || "").trim();
  const visitorPhone = String(req.body?.visitorPhone || "").trim();
  const locationName =
    String(req.body?.locationName || "").trim() || "Nawala Showroom / Client Site";
  const notes = String(req.body?.notes || "").trim();
  const calendarEventId =
    typeof req.body?.calendarEventId === "string" ? req.body.calendarEventId : "";
  const emailSent = Boolean(req.body?.emailSent);

  const errors = validateSiteVisitBooking({
    date,
    slotTime,
    visitorName,
    visitorEmail,
    visitorPhone,
  });

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Please complete all required site visit fields.",
      errors,
    });
  }

  const slotKey = `${date}|${slotTime}`;
  const isBlocked = blockedSiteVisitSlots.includes(slotKey);
  const isTaken = siteVisitBookings.some(
    (b) => b.date === date && b.slotTime === slotTime && b.status !== "CANCELLED"
  );
  if (isBlocked || isTaken) {
    return res.status(409).json({
      message: "Selected slot is no longer available. Please choose another slot.",
    });
  }

  const tpl = SITE_VISIT_SLOT_TEMPLATES.find((s) => s.time === slotTime);
  const booking: SiteVisitBooking = {
    id: `SV-${Math.floor(1000 + Math.random() * 9000)}`,
    date,
    slotTime,
    slotLabel: tpl?.label || slotTime,
    locationName,
    visitorName,
    visitorEmail,
    visitorPhone,
    notes,
    status: "CONFIRMED",
    calendarEventId,
    emailSent,
    createdAt: new Date().toISOString(),
  };

  siteVisitBookings.unshift(booking);

  // Sync booking into Admin Orders & Notifications
  orders.unshift({
    OrderID: booking.id,
    Order_Date: booking.createdAt,
    Order_Status: "PENDING",
    Client_Name: visitorName,
    Client_Email: visitorEmail,
    Client_Number: visitorPhone,
    Customer: {
      Cus_CompanyName: `Site Visit (${date} · ${booking.slotLabel})`,
    },
    Designs: [
      {
        Design: {
          Design_Name: `Site Visit — ${locationName}`,
          Design_Image: [],
        },
      },
    ],
  });

  notifications.unshift({
    id: `notif-${Date.now()}`,
    NotificationsID: `notif-${Date.now()}`,
    Notifications_Title: `Site Visit Booked (${booking.id})`,
    Notifications_Body: `${visitorName} booked ${date} at ${booking.slotLabel} (${locationName}).`,
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  });

  return res.json({
    message: "Site visit booked successfully!",
    data: booking,
    slots: computeAvailableSlotsForDate(date, siteVisitBookings, blockedSiteVisitSlots),
  });
});

app.patch("/api/site-visits/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = siteVisitBookings.findIndex((b) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Site visit booking not found." });
  }

  const existing = siteVisitBookings[idx];
  const nextStatus = req.body?.status as SiteVisitStatus | undefined;
  const validStatuses: SiteVisitStatus[] = ["CONFIRMED", "COMPLETED", "CANCELLED"];

  siteVisitBookings[idx] = {
    ...existing,
    status:
      nextStatus && validStatuses.includes(nextStatus)
        ? nextStatus
        : existing.status,
    calendarEventId:
      typeof req.body?.calendarEventId === "string"
        ? req.body.calendarEventId
        : existing.calendarEventId,
    emailSent:
      typeof req.body?.emailSent === "boolean"
        ? req.body.emailSent
        : existing.emailSent,
  };

  return res.json({
    message: "Site visit booking updated.",
    data: siteVisitBookings[idx],
  });
});

app.post("/api/site-visits/slots/toggle-block", (req: Request, res: Response) => {
  const date = String(req.body?.date || "").trim();
  const slotTime = String(req.body?.slotTime || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slotTime) {
    return res.status(400).json({ message: "Date and slotTime are required." });
  }
  const key = `${date}|${slotTime}`;
  const exists = blockedSiteVisitSlots.includes(key);
  blockedSiteVisitSlots = exists
    ? blockedSiteVisitSlots.filter((k) => k !== key)
    : [...blockedSiteVisitSlots, key];

  return res.json({
    message: exists ? "Slot unblocked." : "Slot blocked.",
    blockedKeys: blockedSiteVisitSlots,
    slots: computeAvailableSlotsForDate(date, siteVisitBookings, blockedSiteVisitSlots),
  });
});

// Home Hero Slideshow CMS Endpoints (videos, images, content, stats & CTA buttons)
app.get("/api/home-slideshow", (_req: Request, res: Response) => {
  return res.json({ data: homeSlideshowCms });
});

app.put("/api/home-slideshow", (req: Request, res: Response) => {
  const payload = normalizeHomeSlideshowCms({
    ...homeSlideshowCms,
    ...req.body,
  });
  homeSlideshowCms = payload;
  saveHomeSlideshowStore(homeSlideshowCms);
  return res.json({
    message: "Home slideshow settings & slides published!",
    data: homeSlideshowCms,
  });
});

app.post("/api/home-slideshow/slides", (req: Request, res: Response) => {
  const mediaUrl = String(req.body?.mediaUrl || "").trim();
  if (!mediaUrl) {
    return res.status(400).json({ message: "A media URL or uploaded file is required." });
  }
  const nextSlides = upsertHomeSlide(homeSlideshowCms.slides, {
    mediaType: req.body?.mediaType,
    mediaUrl,
    posterUrl: req.body?.posterUrl,
    headline: req.body?.headline,
    description: req.body?.description,
    active: req.body?.active,
  });
  homeSlideshowCms = { ...homeSlideshowCms, slides: nextSlides };
  saveHomeSlideshowStore(homeSlideshowCms);
  return res.json({
    message: "Home slide added!",
    data: homeSlideshowCms,
  });
});

app.put("/api/home-slideshow/slides/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!homeSlideshowCms.slides.some((s) => s.id === id)) {
    return res.status(404).json({ message: "Home slide not found." });
  }
  const mediaUrl = String(req.body?.mediaUrl || "").trim();
  if (!mediaUrl) {
    return res.status(400).json({ message: "A media URL or uploaded file is required." });
  }
  const nextSlides = upsertHomeSlide(
    homeSlideshowCms.slides,
    {
      mediaType: req.body?.mediaType,
      mediaUrl,
      posterUrl: req.body?.posterUrl,
      headline: req.body?.headline,
      description: req.body?.description,
      active: req.body?.active,
    },
    id
  );
  homeSlideshowCms = { ...homeSlideshowCms, slides: nextSlides };
  saveHomeSlideshowStore(homeSlideshowCms);
  return res.json({
    message: "Home slide updated!",
    data: homeSlideshowCms,
  });
});

app.delete("/api/home-slideshow/slides/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (homeSlideshowCms.slides.length <= 1) {
    return res.status(400).json({ message: "At least one home hero slide must remain." });
  }
  const nextSlides = deleteHomeSlide(homeSlideshowCms.slides, id);
  homeSlideshowCms = { ...homeSlideshowCms, slides: nextSlides };
  saveHomeSlideshowStore(homeSlideshowCms);
  return res.json({
    message: "Home slide deleted.",
    data: homeSlideshowCms,
  });
});

// What We Build For You (Home Services Carousel) CMS Endpoints
app.get("/api/home-services", (_req: Request, res: Response) => {
  return res.json({ data: homeServicesCms });
});

app.put("/api/home-services", (req: Request, res: Response) => {
  const payload = normalizeHomeServicesCms({
    ...homeServicesCms,
    ...req.body,
  });
  homeServicesCms = payload;
  saveHomeServicesStore(homeServicesCms);
  return res.json({
    message: "What We Build section updated & published!",
    data: homeServicesCms,
  });
});

app.post("/api/home-services/items", (req: Request, res: Response) => {
  const title = String(req.body?.title || "").trim();
  const image = String(req.body?.image || "").trim();
  if (!title || !image) {
    return res.status(400).json({ message: "Service title and image are required." });
  }
  const nextItems = upsertHomeService(homeServicesCms.items, {
    title,
    image,
    description1: req.body?.description1,
    description2: req.body?.description2,
    active: req.body?.active,
  });
  homeServicesCms = { ...homeServicesCms, items: nextItems };
  saveHomeServicesStore(homeServicesCms);
  return res.json({
    message: "Service item added!",
    data: homeServicesCms,
  });
});

app.put("/api/home-services/items/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!homeServicesCms.items.some((s) => s.id === id)) {
    return res.status(404).json({ message: "Service item not found." });
  }
  const title = String(req.body?.title || "").trim();
  const image = String(req.body?.image || "").trim();
  if (!title || !image) {
    return res.status(400).json({ message: "Service title and image are required." });
  }
  const nextItems = upsertHomeService(
    homeServicesCms.items,
    {
      title,
      image,
      description1: req.body?.description1,
      description2: req.body?.description2,
      active: req.body?.active,
    },
    id
  );
  homeServicesCms = { ...homeServicesCms, items: nextItems };
  saveHomeServicesStore(homeServicesCms);
  return res.json({
    message: "Service item updated!",
    data: homeServicesCms,
  });
});

app.delete("/api/home-services/items/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (homeServicesCms.items.length <= 1) {
    return res.status(400).json({ message: "At least one service item must remain." });
  }
  const nextItems = deleteHomeService(homeServicesCms.items, id);
  homeServicesCms = { ...homeServicesCms, items: nextItems };
  saveHomeServicesStore(homeServicesCms);
  return res.json({
    message: "Service item removed.",
    data: homeServicesCms,
  });
});

// Home Top Picks & Accessories Ribbon endpoints
app.get("/api/home-featured-products", (_req: Request, res: Response) => {
  res.json({
    data: homeFeaturedProductsCms,
    designs,
  });
});

app.put("/api/home-featured-products", (req: Request, res: Response) => {
  const body = (req.body || {}) as Partial<HomeFeaturedProductsCmsPayload>;
  const normalized = normalizeHomeFeaturedProductsCms({
    ...homeFeaturedProductsCms,
    ...body,
    selectedProductIds: Array.isArray(body.selectedProductIds)
      ? body.selectedProductIds
      : homeFeaturedProductsCms.selectedProductIds,
    productImageOverrides:
      body.productImageOverrides !== undefined
        ? body.productImageOverrides
        : homeFeaturedProductsCms.productImageOverrides,
    accessoriesRibbonItems: Array.isArray(body.accessoriesRibbonItems)
      ? body.accessoriesRibbonItems
      : homeFeaturedProductsCms.accessoriesRibbonItems,
  });

  if (normalized.selectedProductIds.length === 0) {
    return res
      .status(400)
      .json({ message: "Select at least one product for Our Top Picks." });
  }
  if (normalized.accessoriesRibbonItems.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one accessory image must remain." });
  }

  homeFeaturedProductsCms = normalized;
  saveHomeFeaturedProductsStore(homeFeaturedProductsCms);
  return res.json({
    message: "Home Top Picks & Accessories saved successfully!",
    data: homeFeaturedProductsCms,
  });
});

app.post(
  "/api/home-featured-products/accessories",
  (req: Request, res: Response) => {
    const title = String(req.body?.title || "").trim();
    const image = String(req.body?.image || "").trim();
    if (!title || !image) {
      return res
        .status(400)
        .json({ message: "Accessory title and image are required." });
    }
    const nextItems = upsertHomeAccessoryRibbonItem(
      homeFeaturedProductsCms.accessoriesRibbonItems,
      {
        title,
        subtitle: req.body?.subtitle,
        image,
        linkTo: req.body?.linkTo,
        active: req.body?.active,
      }
    );
    homeFeaturedProductsCms = {
      ...homeFeaturedProductsCms,
      accessoriesRibbonItems: nextItems,
    };
    saveHomeFeaturedProductsStore(homeFeaturedProductsCms);
    return res.json({
      message: "Accessory ribbon image added!",
      data: homeFeaturedProductsCms,
    });
  }
);

app.put(
  "/api/home-featured-products/accessories/:id",
  (req: Request, res: Response) => {
    const { id } = req.params;
    if (
      !homeFeaturedProductsCms.accessoriesRibbonItems.some((a) => a.id === id)
    ) {
      return res.status(404).json({ message: "Accessory item not found." });
    }
    const title = String(req.body?.title || "").trim();
    const image = String(req.body?.image || "").trim();
    if (!title || !image) {
      return res
        .status(400)
        .json({ message: "Accessory title and image are required." });
    }
    const nextItems = upsertHomeAccessoryRibbonItem(
      homeFeaturedProductsCms.accessoriesRibbonItems,
      {
        title,
        subtitle: req.body?.subtitle,
        image,
        linkTo: req.body?.linkTo,
        active: req.body?.active,
      },
      id
    );
    homeFeaturedProductsCms = {
      ...homeFeaturedProductsCms,
      accessoriesRibbonItems: nextItems,
    };
    saveHomeFeaturedProductsStore(homeFeaturedProductsCms);
    return res.json({
      message: "Accessory ribbon image updated!",
      data: homeFeaturedProductsCms,
    });
  }
);

app.delete(
  "/api/home-featured-products/accessories/:id",
  (req: Request, res: Response) => {
    const { id } = req.params;
    if (homeFeaturedProductsCms.accessoriesRibbonItems.length <= 1) {
      return res
        .status(400)
        .json({ message: "At least one accessory image must remain." });
    }
    const nextItems = deleteHomeAccessoryRibbonItem(
      homeFeaturedProductsCms.accessoriesRibbonItems,
      id
    );
    homeFeaturedProductsCms = {
      ...homeFeaturedProductsCms,
      accessoriesRibbonItems: nextItems,
    };
    saveHomeFeaturedProductsStore(homeFeaturedProductsCms);
    return res.json({
      message: "Accessory ribbon image removed.",
      data: homeFeaturedProductsCms,
    });
  }
);

function buildSeoHtml(rawHtml: string, req: Request): string {
  const origin = resolveRequestOrigin({
    appUrl: process.env.APP_URL,
    protocol: (req.headers["x-forwarded-proto"] as string) || req.protocol,
    host: (req.headers["x-forwarded-host"] as string) || req.get("host"),
  });

  let pathname = "/";
  let search = "";
  try {
    const parsedUrl = new URL(req.originalUrl || "/", "http://localhost");
    pathname = parsedUrl.pathname || "/";
    search = parsedUrl.search || "";
  } catch {
    pathname = req.path || "/";
  }

  const activeHomeSlide =
    homeSlideshowCms.slides.find((slide) => slide.active) ||
    homeSlideshowCms.slides[0];
  const homeSlideImage = activeHomeSlide
    ? activeHomeSlide.mediaType === "video"
      ? activeHomeSlide.posterUrl || ""
      : activeHomeSlide.mediaUrl
    : "";
  const productLandingImage = productLandingCms.heroSlides?.[0]?.image || "";

  const seo = resolveDynamicRouteSeo({
    pathname,
    search,
    origin,
    homeSlideImage,
    productLandingImage,
    designs,
    categories: productCategories,
    projects,
    blogs: blogPosts,
    contact: siteContactSettings,
  });

  return injectSeoIntoHtml(rawHtml, seo);
}

// Start server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath, { index: false }));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") return next();
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        path.extname(req.path) !== ""
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(distPath, "index.html");
        const template = fs.readFileSync(indexPath, "utf-8");
        const html = buildSeoHtml(template, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") return next();
      const accept = (req.headers.accept || "*/*").toLowerCase();
      const wantsHtml = accept.includes("text/html") || accept === "*/*";
      if (!wantsHtml) return next();
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        req.path.startsWith("/assets") ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/src") ||
        req.path.startsWith("/node_modules") ||
        path.extname(req.path) !== ""
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, "index.html");
        const template = fs.readFileSync(indexPath, "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        const html = buildSeoHtml(transformed, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
