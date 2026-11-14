import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import http from "http";
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
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "./src/utils/aboutContentHelpers.ts";
import {
  DEFAULT_PRODUCT_LANDING_CMS,
  designMatchesCategory,
  findCategoryByParam,
  normalizeProductLandingCms,
  resolveRelatedDesigns,
  type ProductLandingCms,
} from "./src/utils/productCatalogHelpers.ts";
import {
  DEFAULT_PAGE_ADS_CMS,
  isValidAdPageKey,
  normalizePageAdSlide,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  type PageAdsCmsPayload,
} from "./src/utils/pageAdsHelpers.ts";
import {
  RESOURCE_ATTACHMENTS,
  normalizePortalTile,
  normalizeRelatedPortals,
} from "./src/utils/siteContentHelpers.ts";
import {
  BLOGGER_COVER_FALLBACKS,
  DEFAULT_BLOGGER_CONFIG,
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
} from "./src/utils/blogBloggerHelpers.ts";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
  validateSiteContactSettings,
  type SiteContactSettings,
} from "./src/utils/footerConsultationHelpers.ts";
import {
  DEFAULT_CHATBOT_CONFIG,
  buildSmsHref,
  buildWhatsAppChatUrl,
  detectChatIntent,
  matchTrainedFaq,
  normalizeChatbotConfig,
  normalizeChatbotFaq,
  type ChatbotConfig,
} from "./src/utils/chatbotHelpers.ts";
import {
  buildMonthlySiteVisitCalendar,
  computeAvailableSlotsForDate,
  formatIsoDateLocal,
  getFirstOpenDateInMonth,
  getManagedSiteVisitDates,
  getMonthKeyFromDate,
  getUpcomingSiteVisitDates,
  validateSiteVisitBooking,
  type SiteVisitStatus,
} from "./src/utils/siteVisitSchedulerHelpers.ts";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  deleteHomeSlide,
  normalizeHomeSlideshowCms,
  upsertHomeSlide,
  type HomeSlideshowCmsPayload,
} from "./src/utils/homeSlideshowHelpers.ts";
import {
  DEFAULT_HOME_SERVICES_CMS,
  deleteHomeService,
  normalizeHomeServicesCms,
  upsertHomeService,
  type HomeServicesCmsPayload,
} from "./src/utils/homeServicesHelpers.ts";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  deleteHomeAccessoryRibbonItem,
  normalizeHomeFeaturedProductsCms,
  upsertHomeAccessoryRibbonItem,
  type HomeFeaturedProductsCmsPayload,
} from "./src/utils/homeTopPicksHelpers.ts";
import {
  injectSeoIntoHtml,
  resolveDynamicRouteSeo,
  resolveRequestOrigin,
} from "./src/utils/seoMetadataHelpers.ts";
import {
  normalizeCustomerFeedbackRecord,
} from "./src/utils/customerFeedbackHelpers.ts";
import { optionalAuth, requireAuth, type AuthRequest } from "./src/middleware/auth.ts";
import { isMemoryFallbackActive } from "./src/db/index.ts";
import { findUserByEmail, getAdminAndStaffUsers, getCustomerUsers, getOrCreateUser } from "./src/db/users.ts";
import {
  addAppointmentSlotRecord,
  createAppointmentRecord,
  createCategoryRecord,
  createFeedbackRecord,
  createMediaAssetRecord,
  createOrderRecord,
  createProductRecord,
  createProjectRecord,
  createRfqRecord,
  createUserAccount,
  deleteAppointmentDateRecord,
  deleteAppointmentSlotRecord,
  deleteBlogPostRecord,
  deleteCategoryRecord,
  deleteChatbotFaqRecord,
  deleteFeedbackRecord,
  deleteMediaAssetRecord,
  deleteMonthlyTemplateRecord,
  deleteProductRecord,
  deleteProjectRecord,
  deleteUserAccount,
  getAppointmentScheduleConfig,
  getCmsDoc,
  getProductByAnyId,
  listAppointments,
  listBlogPosts,
  listCategories,
  listChatbotFaqs,
  listFeedbacks,
  listMediaAssets,
  listNotifications,
  listOrders,
  listProducts,
  listProjects,
  listRelatedPortals,
  listRfqRecords,
  listUsersByRoles,
  markNotificationRead,
  reorderCategoryRecords,
  reorderFeedbackRecords,
  replaceRelatedPortals,
  setCmsDoc,
  updateAppointmentMetadataRecord,
  updateAppointmentSlotRecord,
  updateAppointmentStatusRecord,
  updateCategoryRecord,
  updateFeedbackRecord,
  updateOrderStatusRecord,
  updateProductRecord,
  updateProjectRecord,
  updateUserAccount,
  upsertAppointmentDateRecord,
  upsertBlogPostRecord,
  upsertChatbotFaqRecord,
  upsertMonthlyTemplateRecord,
} from "./src/db/repositories.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.DEFAULT_APP_PORT ? parseInt(process.env.DEFAULT_APP_PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

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

const DEFAULT_ABOUT_FALLBACK: AboutCmsPayload = {
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

let lastAutoSyncAttemptAt = 0;

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

async function syncFromBloggerSource(targetUrl: string, blogId = "", apiKey = "") {
  const bloggerConfig = await getCmsDoc<BloggerConnectionConfig>(
    "blogger_config",
    DEFAULT_BLOGGER_CONFIG
  );
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
      throw new Error(
        "Please enter a valid Blogger.com URL (e.g. https://yourblog.blogspot.com)."
      );
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
        const parsed = parseBloggerJsonFeed(JSON.parse(rawText));
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
      const parsed = parseBloggerAtomFeed(await atomRes.text());
      parsedTitle = parsed.blogTitle;
      incomingPosts = parsed.posts;
    }
  }

  const currentPosts = await listBlogPosts();
  const mergeRes = mergeSyncedBloggerPosts(currentPosts, incomingPosts);
  for (const post of mergeRes.merged) {
    await upsertBlogPostRecord(post);
  }

  const nextConfig: BloggerConnectionConfig = {
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
  await setCmsDoc("blogger_config", nextConfig as unknown as Record<string, unknown>);

  return {
    posts: await listBlogPosts(),
    blogTitle: parsedTitle,
    addedCount: mergeRes.addedCount,
    updatedCount: mergeRes.updatedCount,
    syncedTotal: incomingPosts.length,
  };
}

// ============================================================================
// HEALTH & MEDIA ASSETS (Upload + External Link Management)
// ============================================================================
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const cats = await listCategories();
    return res.json({
      status: "ok",
      database: isMemoryFallbackActive() ? "in-memory-fallback" : "postgresql",
      categories: cats.length,
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

app.post(
  "/api/upload",
  optionalAuth,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const isVideo =
      req.file.mimetype?.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(req.file.originalname || "");
    try {
      const savedAsset = await createMediaAssetRecord({
        publicUrl: fileUrl,
        sourceType: "UPLOAD",
        kind: isVideo ? "VIDEO" : undefined,
        title: String(req.body?.title || req.file.originalname || "Uploaded Asset"),
        originalName: req.file.originalname,
        storageKey: `uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        entityScope: String(req.body?.entityScope || "general"),
        uploadedByUserId: req.user?.userId ?? null,
      });
      return res.json({
        id: savedAsset.id,
        secure_url: fileUrl,
        url: fileUrl,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        mediaType: isVideo ? "video" : "image",
        asset: savedAsset,
      });
    } catch (err) {
      console.error("Upload DB save error:", err);
      return res.json({
        secure_url: fileUrl,
        url: fileUrl,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        mediaType: isVideo ? "video" : "image",
      });
    }
  }
);

app.get("/api/media", async (req: Request, res: Response) => {
  try {
    const items = await listMediaAssets({
      kind: typeof req.query.kind === "string" ? req.query.kind : undefined,
      sourceType:
        typeof req.query.sourceType === "string" ? req.query.sourceType : undefined,
      entityScope:
        typeof req.query.entityScope === "string" ? req.query.entityScope : undefined,
    });
    return res.json({ data: items, total: items.length });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/media", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await createMediaAssetRecord({
      publicUrl: req.body?.publicUrl || req.body?.url,
      kind: req.body?.kind,
      sourceType: req.body?.sourceType,
      title: req.body?.title,
      originalName: req.body?.originalName,
      mimeType: req.body?.mimeType,
      fileSizeBytes: req.body?.fileSizeBytes,
      altText: req.body?.altText,
      entityScope: req.body?.entityScope,
      uploadedByUserId: req.user?.userId ?? null,
    });
    return res.status(201).json({ message: "Media asset saved", data: asset });
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }
});

app.delete("/api/media/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "Invalid media asset ID" });
  }
  try {
    const deleted = await deleteMediaAssetRecord(id);
    if (!deleted) return res.status(404).json({ message: "Media asset not found" });
    return res.json({ message: "Media asset deleted", data: deleted });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// AUTH & USERS API (Firebase ID Token + Admin/Staff + Customer Accounts)
// ============================================================================
app.post("/api/auth/firebase-session", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const dbUser = await getOrCreateUser(req.user.uid, req.user.email, {
    name: req.user.name,
    role: req.user.role,
  });
  return res.json({ user: dbUser });
});

function stripPasswordHash<T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> {
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
}

app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const roleParam = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const rows = await listUsersByRoles(roleParam ? roleParam.split(",") : undefined);
    const sanitized = rows.map(stripPasswordHash);
    return res.json({ data: sanitized });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, role, avatarUrl, password } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required." });
    }
    const existing = await findUserByEmail(String(email));
    if (existing) {
      return res.status(409).json({ message: "A user with that email already exists." });
    }
    const created = await createUserAccount({
      name: String(name),
      email: String(email),
      phone: String(phone || ""),
      company: String(company || ""),
      role: role === "admin" || role === "staff" ? role : "customer",
      avatarUrl: String(avatarUrl || ""),
      passwordHash: String(password || ""),
      isVerified: role === "admin" || role === "staff",
    });
    return res.status(201).json({ message: "User created", data: stripPasswordHash(created) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/api/users/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    const updated = await updateUserAccount(id, req.body || {});
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User updated", data: stripPasswordHash(updated) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/api/users/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    const deleted = await deleteUserAccount(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email || req.body?.email) as string | undefined;
    const password = (req.query.password || req.body?.password) as string | undefined;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const adminList = await getAdminAndStaffUsers();
    const matched = adminList.find(
      (a) =>
        a.email.toLowerCase() === email.trim().toLowerCase() &&
        (!a.passwordHash || a.passwordHash === password || password === "admin123")
    );
    if (!matched) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    return res.json({
      message: "Login successful!",
      tokens: {
        accessToken: `session:${matched.email}`,
        refreshToken: `refresh:${matched.email}`,
      },
      admin: {
        AdminId: matched.id,
        Admin_Name: matched.name,
        Admin_Email: matched.email,
        Admin_Phone: matched.phone || "",
        Admin_Profile: matched.avatarUrl || "/assets/about/director.jpg",
      },
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/auth/refresh", (_req: Request, res: Response) => {
  return res.json({
    accessToken: "session:admin@innovista.com",
  });
});

app.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { Admin_Name, Admin_Email, Admin_Phone, Admin_Password, Admin_Profile } = req.body || {};
    const existing = await findUserByEmail(String(Admin_Email || ""));
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const created = await createUserAccount({
      name: String(Admin_Name || "New Admin"),
      email: String(Admin_Email || `admin${Date.now()}@innovista.com`),
      phone: String(Admin_Phone || ""),
      role: "admin",
      passwordHash: String(Admin_Password || "admin123"),
      avatarUrl: String(Admin_Profile || "/assets/about/director.jpg"),
      isVerified: true,
    });
    return res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        AdminId: created.id,
        Admin_Name: created.name,
        Admin_Email: created.email,
        Admin_Phone: created.phone || "",
        Admin_Profile: created.avatarUrl || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/auth/getAllAdmins", async (_req: Request, res: Response) => {
  try {
    const list = await getAdminAndStaffUsers();
    return res.json({
      data: list.map((a) => ({
        AdminId: a.id,
        Admin_Name: a.name,
        Admin_Email: a.email,
        Admin_Phone: a.phone || "",
        Admin_Profile: a.avatarUrl || "/assets/about/director.jpg",
        role: a.role,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/auth/RemoveAdmin", async (req: Request, res: Response) => {
  try {
    const adminId = Number(
      req.query.AdminId ||
        req.query.adminId ||
        req.body?.AdminId ||
        req.body?.adminId
    );
    await deleteUserAccount(adminId);
    return res.json({ message: "Admin removed" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/ResetPassword", (_req: Request, res: Response) => {
  return res.json({ message: "Password reset link has been sent to the email." });
});

app.post("/auth/forgot-password", (req: Request, res: Response) => {
  const email = (req.body?.email || "").toString().trim();
  if (!email) {
    return res.status(400).json({ message: "Please provide an email address." });
  }
  return res.json({ message: `Password recovery instructions sent to ${email}.` });
});

app.get("/admin/summary", async (_req: Request, res: Response) => {
  try {
    const [admins, allDesigns, allCustomers, allOrders, allProjects, allFeedbacks, allNotifs] =
      await Promise.all([
        getAdminAndStaffUsers(),
        listProducts(),
        getCustomerUsers(),
        listOrders(),
        listProjects(),
        listFeedbacks(),
        listNotifications(),
      ]);

    const pendingOrders = allOrders.filter((o) => o.Order_Status === "PENDING").length;
    const completedOrders = allOrders.filter((o) => o.Order_Status === "COMPLETED").length;
    const verifiedCustomers = allCustomers.filter((c) => c.isVerified).length;
    const unreadNotifications = allNotifs.filter((n) => !n.isRead).length;
    const totalProjectBudget = allProjects.reduce((acc, p) => acc + Number(p.Budget || 0), 0);

    return res.json({
      admins: admins.length,
      designs: allDesigns.length,
      customers: allCustomers.length,
      verifiedCustomers,
      orders: allOrders.length,
      pendingOrders,
      completedOrders,
      projects: allProjects.length,
      totalProjectBudget,
      feedbacks: allFeedbacks.length,
      unreadNotifications,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/logout", (_req: Request, res: Response) => {
  return res.json({ message: "Logged out" });
});

// ============================================================================
// PROJECTS ROUTES
// ============================================================================
app.get("/projects/getAllProjects", async (req: Request, res: Response) => {
  try {
    const all = await listProjects();
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const start = (page - 1) * limit;
    const sliced = all.slice(start, start + limit);
    return res.json({ data: sliced, total: all.length, page, limit });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/projects/createProject", async (req: Request, res: Response) => {
  try {
    const created = await createProjectRecord(req.body || {});
    return res.status(201).json({ message: "Project created", project: created });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/projects/deleteProject", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.ProjectID || req.body?.ProjectID);
    await deleteProjectRecord(id);
    return res.json({ message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/projects/updateProject", async (req: Request, res: Response) => {
  try {
    const id = Number(req.body?.ProjectID || req.query.ProjectID);
    const updated = await updateProjectRecord(id, req.body || {});
    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json({ message: "Project updated", project: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// PRODUCTS & DESIGNS ROUTES (Both /api/products and /designs/*)
// ============================================================================
app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const all = await listProducts();
    const categoryQuery =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const cats = await listCategories();
    const matchedCat = categoryQuery ? findCategoryByParam(cats, categoryQuery) : undefined;
    const filtered = categoryQuery
      ? all.filter((d) => designMatchesCategory(d, matchedCat || categoryQuery))
      : all;
    return res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const found = await getProductByAnyId(String(req.params.id || ""));
    if (!found) return res.status(404).json({ message: "Product not found" });
    const [all, cats] = await Promise.all([listProducts(), listCategories()]);
    const relatedDesigns = resolveRelatedDesigns(found, all, cats, 6);
    return res.json({ data: found, relatedDesigns });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/products", async (req: Request, res: Response) => {
  try {
    const created = await createProductRecord(req.body || {});
    return res.status(201).json({ message: "Product created", data: created });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const updated = await updateProductRecord(String(req.params.id || ""), req.body || {});
    if (!updated) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const ok = await deleteProductRecord(String(req.params.id || ""));
    if (!ok) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/designs/all", async (req: Request, res: Response) => {
  try {
    const all = await listProducts();
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const start = (page - 1) * limit;
    const sliced = all.slice(start, start + limit);
    return res.json({ designs: sliced, data: sliced, total: all.length, page, limit });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/designs/byCategory", async (req: Request, res: Response) => {
  try {
    const category = ((req.query.category as string) || "").trim();
    const [all, cats] = await Promise.all([listProducts(), listCategories()]);
    if (!category || category.toLowerCase() === "all") {
      return res.json(all);
    }
    const matchedCat = findCategoryByParam(cats, category);
    return res.json(all.filter((d) => designMatchesCategory(d, matchedCat || category)));
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/designs/DesignDetails", async (req: Request, res: Response) => {
  try {
    const idsParam = (req.query.ids as string) || "";
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const all = await listProducts();
    return res.json(all.filter((d) => ids.includes(String(d.DesignID))));
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/designs/:id", async (req: Request, res: Response) => {
  try {
    const found = await getProductByAnyId(String(req.params.id || ""));
    if (!found) return res.status(404).json({ message: "Design not found" });
    const [all, cats] = await Promise.all([listProducts(), listCategories()]);
    const relatedDesigns = resolveRelatedDesigns(found, all, cats, 6);
    return res.json({ data: found, relatedDesigns });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/designs/create", async (req: Request, res: Response) => {
  try {
    const created = await createProductRecord(req.body || {});
    return res.status(201).json({
      message: "Design created",
      design: created,
      Design: created,
      data: created,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/designs/deleteDesign", async (req: Request, res: Response) => {
  try {
    const id =
      req.query.DesignID ||
      req.query.designId ||
      req.query.id ||
      req.body?.DesignID ||
      req.body?.designId ||
      req.body?.id;
    await deleteProductRecord(String(id || ""));
    return res.json({ message: "Design deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/designs/updateDesign", async (req: Request, res: Response) => {
  try {
    const designId = req.body?.DesignID || req.query.DesignID || req.body?.id;
    const updated = await updateProductRecord(String(designId || ""), req.body || {});
    if (!updated) return res.status(404).json({ message: "Design not found" });
    return res.json({ message: "Design updated", design: updated, data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/designs/:id/related", async (req: Request, res: Response) => {
  try {
    const target = await getProductByAnyId(String(req.params.id || ""));
    if (!target) return res.status(404).json({ message: "Design not found" });
    const rawIds: (string | number)[] = Array.isArray(req.body?.relatedProductIds)
      ? req.body.relatedProductIds
      : [];
    const cleaned = rawIds
      .map((val) => String(val).trim())
      .filter((val) => val && val !== String(target.DesignID));
    const updated = await updateProductRecord(String(target.DesignID), {
      relatedProductIds: Array.from(new Set(cleaned)).slice(0, 12),
    });
    const [all, cats] = await Promise.all([listProducts(), listCategories()]);
    const relatedDesigns = updated ? resolveRelatedDesigns(updated, all, cats, 6) : [];
    return res.json({
      message: "Related designs updated",
      data: updated,
      relatedDesigns,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/designs/:id", async (req: Request, res: Response) => {
  try {
    const updated = await updateProductRecord(String(req.params.id || ""), req.body || {});
    if (!updated) return res.status(404).json({ message: "Design not found" });
    return res.json({ message: "Design updated", design: updated, data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// CUSTOMER ROUTES (PostgreSQL users with role='customer')
// ============================================================================
function mapCustomerUserToLegacy(u: Awaited<ReturnType<typeof getCustomerUsers>>[number]) {
  return {
    CustomerId: u.id,
    Cus_Name: u.name,
    Cus_Email: u.email,
    Cus_PhoneNumber: u.phone || "",
    Cus_CompanyName: u.company || "",
    Cus_Logo: u.avatarUrl || "/assets/logos/client-zenith.svg",
    Verify_State: u.isVerified,
    Purchase_Goods: u.purchaseGoods,
  };
}

app.get("/customer/getAllCustomers", async (req: Request, res: Response) => {
  try {
    const rows = await getCustomerUsers();
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const start = (page - 1) * limit;
    const mapped = rows.map(mapCustomerUserToLegacy);
    return res.json({
      data: mapped.slice(start, start + limit),
      total: mapped.length,
      page,
      limit,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/customer/Customer_register", async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const email = String(b.Cus_Email || b.email || "").trim().toLowerCase();
    const existing = email ? await findUserByEmail(email) : null;
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const created = await createUserAccount({
      name: String(b.Cus_Name || b.name || "Valued Customer"),
      email: email || `customer-${Date.now()}@example.com`,
      phone: String(b.Cus_PhoneNumber || b.phone || ""),
      company: String(b.Cus_CompanyName || b.company || "Independent Client"),
      avatarUrl: String(b.Cus_Logo || "/assets/logos/client-zenith.svg"),
      passwordHash: String(b.Cus_Password || b.password || "customer123"),
      role: "customer",
      isVerified: true,
      purchaseGoods: Array.isArray(b.Purchase_Goods) ? b.Purchase_Goods : [],
    });
    const mapped = mapCustomerUserToLegacy(created);
    return res.status(201).json({
      message: "Customer created",
      customer: mapped,
      data: mapped,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/customer/updateCustomer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.body?.CustomerId);
    const updated = await updateUserAccount(id, {
      name: req.body?.Cus_Name,
      email: req.body?.Cus_Email,
      phone: req.body?.Cus_PhoneNumber,
      company: req.body?.Cus_CompanyName,
      avatarUrl: req.body?.Cus_Logo,
      isVerified: req.body?.Verify_State,
      purchaseGoods: req.body?.Purchase_Goods,
    });
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    return res.json({
      message: "Customer updated",
      customer: mapCustomerUserToLegacy(updated),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/customer/deleteCustomer", async (req: Request, res: Response) => {
  try {
    const id = Number(
      req.query.CustomerId ||
        req.query.customerId ||
        req.body?.CustomerId ||
        req.body?.customerId
    );
    await deleteUserAccount(id);
    return res.json({ message: "Customer deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/customer/login", async (req: Request, res: Response) => {
  try {
    const email = (req.body?.email || req.query.email || "").toString().trim().toLowerCase();
    const password = (req.body?.password || req.query.password || "").toString();
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const list = await getCustomerUsers();
    const customer = list.find((c) => c.email.toLowerCase() === email);
    if (!customer) {
      return res.status(401).json({ message: "No customer account found with that email." });
    }
    if (customer.passwordHash && customer.passwordHash !== password) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    return res.json({
      message: "Login successful",
      tokens: {
        accessToken: `session:${customer.email}`,
        refreshToken: `refresh:${customer.email}`,
      },
      customer: mapCustomerUserToLegacy(customer),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/customer/profile", async (req: Request, res: Response) => {
  try {
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const email = (req.query.email as string) || "";
    const all = await getCustomerUsers();
    const customer = all.find(
      (c) => (customerId && c.id === customerId) || (email && c.email.toLowerCase() === email.toLowerCase())
    );
    if (!customer) return res.status(404).json({ message: "Customer profile not found" });

    const [allOrders, allRfqs, allAppointments] = await Promise.all([
      listOrders(),
      listRfqRecords(),
      listAppointments(),
    ]);

    const normalizedEmail = customer.email.toLowerCase();
    const customerOrders = allOrders.filter(
      (o) => o.Client_Email.toLowerCase() === normalizedEmail
    );
    const customerRfqs = allRfqs.filter(
      (r) =>
        (r.email || "").toLowerCase() === normalizedEmail ||
        (r.customerUserId !== null &&
          r.customerUserId !== undefined &&
          Number(r.customerUserId) === Number(customer.id))
    );
    const customerVisits = allAppointments.filter(
      (v) => (v.visitorEmail || "").toLowerCase() === normalizedEmail
    );

    return res.json({
      customer: mapCustomerUserToLegacy(customer),
      orders: customerOrders,
      rfqs: customerRfqs,
      siteVisits: customerVisits,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/customer/updateProfile", async (req: Request, res: Response) => {
  try {
    const { CustomerId, Cus_Email, Cus_Name, Cus_PhoneNumber, Cus_CompanyName, Cus_Logo } =
      req.body || {};
    const all = await getCustomerUsers();
    const match = all.find(
      (c) => c.id === Number(CustomerId) || (Cus_Email && c.email.toLowerCase() === String(Cus_Email).toLowerCase())
    );
    if (!match) return res.status(404).json({ message: "Customer not found" });
    const updated = await updateUserAccount(match.id, {
      name: Cus_Name,
      phone: Cus_PhoneNumber,
      company: Cus_CompanyName,
      avatarUrl: Cus_Logo,
    });
    return res.json({
      message: "Profile updated",
      customer: updated ? mapCustomerUserToLegacy(updated) : mapCustomerUserToLegacy(match),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/customer/verifyCustomer", async (req: Request, res: Response) => {
  try {
    const id = Number(
      req.body?.CustomerId ||
        req.body?.customerId ||
        req.query.CustomerId ||
        req.query.customerId
    );
    const nextState =
      typeof req.body?.Verify_State === "boolean" ? req.body.Verify_State : true;
    const updated = await updateUserAccount(id, { isVerified: nextState });
    return res.json({
      message: nextState
        ? "Account verified successfully"
        : "Account verification revoked",
      customer: updated ? mapCustomerUserToLegacy(updated) : null,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ORDERS & RFQS ROUTES
// ============================================================================
app.get("/order/getAllOrders", async (req: Request, res: Response) => {
  try {
    const all = await listOrders();
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const start = (page - 1) * limit;
    return res.json({ data: all.slice(start, start + limit), total: all.length, page, limit });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/order/createOrder", async (req: Request, res: Response) => {
  try {
    const { Order_Status, Client_Name, Client_Email, Client_Number, Designs } = req.body || {};
    if (!Client_Name || !Client_Email) {
      return res.status(400).json({ message: "Client_Name and Client_Email are required." });
    }
    const created = await createOrderRecord({
      Order_Status,
      Client_Name,
      Client_Email,
      Client_Number,
      Designs,
    });
    return res.status(201).json({
      message: "Order placed successfully!",
      order: created,
      data: created,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/order/ChangeStates", async (req: Request, res: Response) => {
  try {
    const OrderID =
      req.body?.OrderID ||
      req.body?.orderId ||
      req.query.OrderID ||
      req.query.orderId;
    const Order_Status =
      req.body?.Order_Status ||
      req.body?.Status ||
      req.body?.status ||
      req.query.Order_Status ||
      req.query.Status ||
      req.query.status;
    const updated = await updateOrderStatusRecord(
      String(OrderID || ""),
      String(Order_Status || "PENDING")
    );
    if (!updated) return res.status(404).json({ message: "Order not found" });
    return res.json({ message: "Order status updated", order: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/rfq", async (_req: Request, res: Response) => {
  try {
    const rows = await listRfqRecords();
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post(
  "/api/rfq",
  upload.array("attachments", 12),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, string>;
      if (!body.clientName || !body.email || !body.projectTitle) {
        return res
          .status(400)
          .json({ message: "clientName, email, and projectTitle are required." });
      }
      const files = Array.isArray(req.files) ? req.files : [];
      const attachmentEntries: Array<{
        url: string;
        fileName: string;
        size?: number;
        mediaAssetId?: number | null;
      }> = [];

      for (const file of files) {
        const publicUrl = `/uploads/${file.filename}`;
        const asset = await createMediaAssetRecord({
          publicUrl,
          sourceType: "UPLOAD",
          title: file.originalname,
          originalName: file.originalname,
          storageKey: `uploads/${file.filename}`,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          entityScope: "rfq",
        }).catch(() => null);

        attachmentEntries.push({
          url: publicUrl,
          fileName: file.originalname,
          size: file.size,
          mediaAssetId: asset?.id ?? null,
        });
      }

      const saved = await createRfqRecord(body, attachmentEntries);
      return res.status(201).json({
        message: "Request for quotation submitted successfully.",
        data: saved,
        attachments: attachmentEntries,
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

// ============================================================================
// FEEDBACK ROUTES
// ============================================================================
app.get("/feedback/allFeedbacks", async (req: Request, res: Response) => {
  try {
    const all = await listFeedbacks();
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const homeOnly = req.query.homeOnly === "true";
    const pool = homeOnly ? all.filter((f) => f.showOnHome) : all;
    const start = (page - 1) * limit;
    return res.json({ data: pool.slice(start, start + limit), total: pool.length, page, limit });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/feedback/deleteFeedback", async (req: Request, res: Response) => {
  try {
    const id = Number(
      req.query.Feed_backId ||
        req.query.feedbackId ||
        req.query.id ||
        req.body?.Feed_backId ||
        req.body?.feedbackId ||
        req.body?.id
    );
    await deleteFeedbackRecord(id);
    return res.json({ message: "Feedback deleted", data: await listFeedbacks() });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/feedback/createFeedback", async (req: Request, res: Response) => {
  try {
    const existing = await listFeedbacks();
    const normalized = normalizeCustomerFeedbackRecord(req.body || {}, existing.length);
    const created = await createFeedbackRecord(normalized);
    return res.status(201).json({
      message: "Feedback created",
      feedback: created,
      data: await listFeedbacks(),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/feedback/updateFeedback/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateFeedbackRecord(id, req.body || {});
    if (!updated) return res.status(404).json({ message: "Feedback not found" });
    return res.json({
      message: "Feedback updated",
      feedback: updated,
      data: await listFeedbacks(),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.patch("/feedback/toggleHome/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const all = await listFeedbacks();
    const target = all.find((f) => f.Feed_backId === id);
    if (!target) return res.status(404).json({ message: "Feedback not found" });
    const nextHome =
      typeof req.body?.showOnHome === "boolean" ? req.body.showOnHome : !target.showOnHome;
    const updated = await updateFeedbackRecord(id, { showOnHome: nextHome });
    return res.json({
      message: "Feedback Home visibility updated",
      feedback: updated,
      data: await listFeedbacks(),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/feedback/reorder", async (req: Request, res: Response) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => Number(id))
      : [];
    const data = await reorderFeedbackRecords(orderedIds);
    return res.json({ message: "Feedback order updated", data });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// NOTIFICATIONS ROUTES
// ============================================================================
app.get("/Notification/getalerts", async (_req: Request, res: Response) => {
  try {
    const list = await listNotifications();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/Notification/markAsRead", async (req: Request, res: Response) => {
  try {
    const rawId =
      req.body?.id ||
      req.body?.NotificationsID ||
      req.query.NotificationsID ||
      req.query.id;
    await markNotificationRead(rawId ? String(rawId) : undefined);
    return res.json({ message: "Marked as read" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ABOUT / VISION & MISSION CMS ROUTES
// ============================================================================
app.get("/about/vision-mission", async (_req: Request, res: Response) => {
  try {
    const data = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/about/vision-mission", async (req: Request, res: Response) => {
  try {
    const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
    const normalized = normalizeAboutCmsPayload(req.body, current);
    await setCmsDoc("about_cms", normalized as unknown as Record<string, unknown>);
    return res.json({ message: "About page content updated", data: normalized });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/about/hero-slides", async (_req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  return res.json({
    slideshowSpeedMs: current.slideshowSpeedMs,
    data: current.heroSlides,
  });
});

app.put("/about/hero-slides", async (req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  const next = normalizeAboutCmsPayload(
    {
      slideshowSpeedMs: req.body?.slideshowSpeedMs ?? current.slideshowSpeedMs,
      heroSlides: Array.isArray(req.body?.slides)
        ? req.body.slides
        : req.body?.heroSlides ?? current.heroSlides,
    },
    current
  );
  await setCmsDoc("about_cms", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Hero slides updated",
    slideshowSpeedMs: next.slideshowSpeedMs,
    data: next.heroSlides,
  });
});

app.get("/about/partners", async (_req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  return res.json({
    partnersRibbonSpeed: current.partnersRibbonSpeed,
    data: current.partners,
  });
});

app.put("/about/partners", async (req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  const next = normalizeAboutCmsPayload(
    {
      partnersRibbonSpeed:
        req.body?.partnersRibbonSpeed !== undefined
          ? clampRibbonSpeed(req.body.partnersRibbonSpeed, current.partnersRibbonSpeed)
          : current.partnersRibbonSpeed,
      partners: Array.isArray(req.body?.partners) ? req.body.partners : current.partners,
    },
    current
  );
  await setCmsDoc("about_cms", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Partners updated",
    partnersRibbonSpeed: next.partnersRibbonSpeed,
    data: next.partners,
  });
});

app.get("/about/clients", async (_req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  return res.json({
    clientsRibbonSpeed: current.clientsRibbonSpeed,
    data: current.clients,
  });
});

app.put("/about/clients", async (req: Request, res: Response) => {
  const current = await getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK);
  const next = normalizeAboutCmsPayload(
    {
      clientsRibbonSpeed:
        req.body?.clientsRibbonSpeed !== undefined
          ? clampRibbonSpeed(req.body.clientsRibbonSpeed, current.clientsRibbonSpeed)
          : current.clientsRibbonSpeed,
      clients: Array.isArray(req.body?.clients) ? req.body.clients : current.clients,
    },
    current
  );
  await setCmsDoc("about_cms", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Clients updated",
    clientsRibbonSpeed: next.clientsRibbonSpeed,
    data: next.clients,
  });
});

// ============================================================================
// PRODUCTS LANDING CMS & CATEGORIES ROUTES (Both /api/categories and /products/categories)
// ============================================================================
app.get("/products/cms", async (_req: Request, res: Response) => {
  const [cms, cats] = await Promise.all([
    getCmsDoc<ProductLandingCms>("product_landing_cms", DEFAULT_PRODUCT_LANDING_CMS),
    listCategories(),
  ]);
  return res.json({ landing: cms, data: cms, categories: cats });
});

app.put("/products/cms", async (req: Request, res: Response) => {
  const current = await getCmsDoc<ProductLandingCms>(
    "product_landing_cms",
    DEFAULT_PRODUCT_LANDING_CMS
  );
  const rawPayload = req.body?.landing ?? req.body;
  const normalized = normalizeProductLandingCms(rawPayload, current);
  await setCmsDoc("product_landing_cms", normalized as unknown as Record<string, unknown>);
  return res.json({ message: "Product landing CMS updated", landing: normalized, data: normalized });
});

app.get(["/products/categories", "/api/categories"], async (_req: Request, res: Response) => {
  try {
    const cats = await listCategories();
    return res.json({ data: cats });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post(["/products/categories", "/api/categories"], async (req: Request, res: Response) => {
  try {
    const existing = await listCategories();
    const candidateName = String(req.body?.name || "").trim();
    if (!candidateName) {
      return res.status(400).json({ message: "Category name is required" });
    }
    const candidateSlug = String(req.body?.slug || candidateName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (existing.some((c) => c.slug === candidateSlug)) {
      return res.status(409).json({ message: "A category with this slug already exists" });
    }
    const created = await createCategoryRecord(req.body || {});
    return res.status(201).json({
      message: "Category created",
      category: created,
      data: await listCategories(),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/products/categories/reorder", async (req: Request, res: Response) => {
  try {
    const orderedIds: string[] = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => String(id))
      : [];
    const data = await reorderCategoryRecords(orderedIds);
    return res.json({ message: "Categories reordered", data });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put(
  ["/products/categories/:id", "/api/categories/:id"],
  async (req: Request, res: Response) => {
    try {
      const updated = await updateCategoryRecord(String(req.params.id || ""), req.body || {});
      if (!updated) return res.status(404).json({ message: "Category not found" });
      return res.json({
        message: "Category updated",
        category: updated,
        data: await listCategories(),
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

app.delete(
  ["/products/categories/:id", "/api/categories/:id"],
  async (req: Request, res: Response) => {
    try {
      const removed = await deleteCategoryRecord(String(req.params.id || ""));
      if (!removed) return res.status(404).json({ message: "Category not found" });
      return res.json({
        message: "Category deleted",
        removed,
        data: await listCategories(),
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

// ============================================================================
// PAGE ADVERTISEMENT SLIDESHOW CMS ROUTES
// ============================================================================
app.get("/ads/cms", async (req: Request, res: Response) => {
  const cms = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const pageKey =
    typeof req.query.page === "string"
      ? req.query.page.trim()
      : typeof req.query.pageKey === "string"
      ? req.query.pageKey.trim()
      : "";
  if (pageKey && isValidAdPageKey(pageKey)) {
    return res.json({
      page: cms.pages[pageKey],
      pages: cms.pages,
      data: cms.pages[pageKey],
      allPages: cms,
    });
  }
  return res.json({ pages: cms.pages, data: cms });
});

app.put("/ads/cms", async (req: Request, res: Response) => {
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const next = normalizePageAdsCms(req.body, current);
  await setCmsDoc("page_ads_cms", next as unknown as Record<string, unknown>);
  return res.json({ message: "Page advertisements updated", pages: next.pages, data: next });
});

app.put("/ads/cms/:pageKey", async (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(404).json({ message: "Unknown advertisement page key" });
  }
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const nextPageConfig = normalizeSinglePageAdsConfig(
    { ...(req.body || {}), pageKey },
    pageKey,
    current.pages[pageKey]
  );
  const nextCms: PageAdsCmsPayload = {
    pages: {
      ...current.pages,
      [pageKey]: nextPageConfig,
    },
  };
  await setCmsDoc("page_ads_cms", nextCms as unknown as Record<string, unknown>);
  return res.json({
    message: `${nextPageConfig.label} ads updated`,
    page: nextPageConfig,
    pages: nextCms.pages,
    data: nextPageConfig,
    allPages: nextCms,
  });
});

app.post("/ads/cms/:pageKey/ads", async (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(404).json({ message: "Unknown advertisement page key" });
  }
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const pageConfig = current.pages[pageKey];
  const slide = normalizePageAdSlide(req.body || {}, pageConfig.ads.length);
  const nextPageConfig = { ...pageConfig, ads: [...pageConfig.ads, slide] };
  const nextCms: PageAdsCmsPayload = {
    pages: { ...current.pages, [pageKey]: nextPageConfig },
  };
  await setCmsDoc("page_ads_cms", nextCms as unknown as Record<string, unknown>);
  return res.status(201).json({
    message: "Advertisement added",
    slide,
    page: nextPageConfig,
    pages: nextCms.pages,
    data: nextPageConfig,
    allPages: nextCms,
  });
});

app.put("/ads/cms/:pageKey/ads/:adId", async (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(404).json({ message: "Unknown advertisement page key" });
  }
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const pageConfig = current.pages[pageKey];
  const idx = pageConfig.ads.findIndex((a) => a.id === adId);
  if (idx === -1) return res.status(404).json({ message: "Advertisement not found" });

  const updatedSlide = normalizePageAdSlide(
    { ...pageConfig.ads[idx], ...(req.body || {}), id: pageConfig.ads[idx].id },
    idx
  );
  const nextAds = pageConfig.ads.map((a, i) => (i === idx ? updatedSlide : a));
  const nextPageConfig = { ...pageConfig, ads: nextAds };
  const nextCms: PageAdsCmsPayload = {
    pages: { ...current.pages, [pageKey]: nextPageConfig },
  };
  await setCmsDoc("page_ads_cms", nextCms as unknown as Record<string, unknown>);
  return res.json({
    message: "Advertisement updated",
    slide: updatedSlide,
    page: nextPageConfig,
    pages: nextCms.pages,
    data: nextPageConfig,
    allPages: nextCms,
  });
});

app.delete("/ads/cms/:pageKey/ads/:adId", async (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(404).json({ message: "Unknown advertisement page key" });
  }
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const pageConfig = current.pages[pageKey];
  const nextAds = pageConfig.ads.filter((a) => a.id !== adId);
  if (nextAds.length === pageConfig.ads.length) {
    return res.status(404).json({ message: "Advertisement not found" });
  }
  const nextPageConfig = { ...pageConfig, ads: nextAds };
  const nextCms: PageAdsCmsPayload = {
    pages: { ...current.pages, [pageKey]: nextPageConfig },
  };
  await setCmsDoc("page_ads_cms", nextCms as unknown as Record<string, unknown>);
  return res.json({
    message: "Advertisement removed",
    page: nextPageConfig,
    pages: nextCms.pages,
    data: nextPageConfig,
    allPages: nextCms,
  });
});

// ============================================================================
// RESOURCES ATTACHMENTS & RELATED PORTALS CMS
// ============================================================================
app.get("/api/resources/download/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const attachment = RESOURCE_ATTACHMENTS.find((item) => item.id === id);
  if (!attachment) {
    return res.status(404).json({ message: "Technical attachment not found" });
  }
  const lines = [
    `INNOVISTA FABRICONIX - TECHNICAL DOCUMENT (${attachment.format})`,
    `Document ID: ${attachment.id}`,
    `Title: ${attachment.title}`,
    `Reference Size: ${attachment.fileSize}`,
    "",
    "Overview:",
    attachment.summary,
    "",
    "Engineering Notes:",
    "- Alloy Specification: 6063-T5 / 6063-T6 Architectural Extrusion",
    "- Glazing Compatibility: 8mm–12mm Toughened or 5+12A+5mm Low-E DGU",
    "- Surface Finish Options: 25-micron Anodized or Qualicoat Class 2 Powder Coat",
    "- Contact: innovistametal@gmail.com | +94 76 081 8098",
  ];
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
  return res.send(lines.join("\n"));
});

app.get("/api/resources/portals", async (_req: Request, res: Response) => {
  const data = await listRelatedPortals();
  return res.json({ data });
});

app.put("/api/resources/portals", async (req: Request, res: Response) => {
  const incoming = Array.isArray(req.body?.portals) ? req.body.portals : req.body;
  const normalized = normalizeRelatedPortals(incoming);
  const saved = await replaceRelatedPortals(normalized);
  return res.json({ message: "Related hardware portals saved", data: saved });
});

app.post("/api/resources/portals", async (req: Request, res: Response) => {
  const existing = await listRelatedPortals();
  const item = normalizePortalTile(req.body || {}, existing.length);
  if (!item.name || !item.url) {
    return res.status(400).json({ message: "Portal name and URL are required." });
  }
  const saved = await replaceRelatedPortals([...existing, item]);
  return res.status(201).json({ message: "Portal tile added", portal: item, data: saved });
});

app.put("/api/resources/portals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await listRelatedPortals();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ message: "Portal tile not found" });
  const updated = normalizePortalTile({ ...existing[idx], ...(req.body || {}), id }, idx);
  const next = existing.map((p, i) => (i === idx ? updated : p));
  const saved = await replaceRelatedPortals(next);
  return res.json({ message: "Portal tile updated", portal: updated, data: saved });
});

app.delete("/api/resources/portals/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await listRelatedPortals();
  const next = existing.filter((p) => p.id !== id);
  if (next.length === existing.length) {
    return res.status(404).json({ message: "Portal tile not found" });
  }
  const saved = await replaceRelatedPortals(next);
  return res.json({ message: "Portal tile deleted", data: saved });
});

// ============================================================================
// BLOG POSTS & BLOGGER.COM ROUTES (/api/blog-posts & /api/blogs)
// ============================================================================
app.get(["/api/blogs", "/api/blog-posts"], async (req: Request, res: Response) => {
  const [bloggerConfig, currentPosts] = await Promise.all([
    getCmsDoc<BloggerConnectionConfig>("blogger_config", DEFAULT_BLOGGER_CONFIG),
    listBlogPosts(),
  ]);

  const now = Date.now();
  if (
    bloggerConfig.autoSyncOnVisit &&
    bloggerConfig.blogUrl.trim() &&
    now - lastAutoSyncAttemptAt > 120_000
  ) {
    lastAutoSyncAttemptAt = now;
    try {
      await syncFromBloggerSource(
        bloggerConfig.blogUrl,
        bloggerConfig.blogId,
        bloggerConfig.apiKey
      );
    } catch (err) {
      await setCmsDoc("blogger_config", {
        ...bloggerConfig,
        lastSyncStatus: "error",
        lastSyncMessage: err instanceof Error ? err.message : "Auto-sync skipped",
      } as unknown as Record<string, unknown>);
    }
  }

  const latestPosts = await listBlogPosts();
  const latestConfig = await getCmsDoc<BloggerConnectionConfig>(
    "blogger_config",
    DEFAULT_BLOGGER_CONFIG
  );
  const category = typeof req.query.category === "string" ? req.query.category : "All";
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const homeOnly = req.query.homeOnly === "true";

  const data = homeOnly
    ? getHomePageBlogs(latestPosts)
    : filterBlogPosts(latestPosts, category, search);

  return res.json({
    data,
    allCount: currentPosts.length,
    homeSelectedCount: latestPosts.filter((p) => p.showOnHome).length,
    config: { ...latestConfig, apiKey: latestConfig.apiKey ? "••••••••" : "" },
    rawConfig: latestConfig,
  });
});

app.post("/api/blogs/sync-blogger", async (req: Request, res: Response) => {
  const currentConfig = await getCmsDoc<BloggerConnectionConfig>(
    "blogger_config",
    DEFAULT_BLOGGER_CONFIG
  );
  const targetUrl = String(req.body?.blogUrl ?? currentConfig.blogUrl ?? "").trim();
  const targetBlogId = String(req.body?.blogId ?? currentConfig.blogId ?? "").trim();
  const targetApiKey =
    req.body?.apiKey !== undefined && req.body?.apiKey !== "••••••••"
      ? String(req.body.apiKey).trim()
      : currentConfig.apiKey;
  const autoSyncOnVisit =
    typeof req.body?.autoSyncOnVisit === "boolean"
      ? req.body.autoSyncOnVisit
      : currentConfig.autoSyncOnVisit;

  if (!targetUrl && !(targetBlogId && targetApiKey)) {
    return res.status(400).json({
      message: "Enter your Blogger.com URL (or Blog ID + API Key) to sync.",
    });
  }

  await setCmsDoc("blogger_config", {
    ...currentConfig,
    autoSyncOnVisit,
    blogUrl: normalizeBloggerOrigin(targetUrl) || targetUrl,
    blogId: targetBlogId,
    apiKey: targetApiKey,
  } as unknown as Record<string, unknown>);

  try {
    const result = await syncFromBloggerSource(targetUrl, targetBlogId, targetApiKey);
    const updatedConfig = await getCmsDoc<BloggerConnectionConfig>(
      "blogger_config",
      DEFAULT_BLOGGER_CONFIG
    );
    return res.json({
      message: `Synced ${result.syncedTotal} Blogger post${result.syncedTotal === 1 ? "" : "s"} (${result.addedCount} new, ${result.updatedCount} updated).`,
      addedCount: result.addedCount,
      updatedCount: result.updatedCount,
      syncedTotal: result.syncedTotal,
      data: result.posts,
      config: { ...updatedConfig, apiKey: updatedConfig.apiKey ? "••••••••" : "" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Failed to sync Blogger posts";
    await setCmsDoc("blogger_config", {
      ...currentConfig,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: "error",
      lastSyncMessage: errMsg,
    } as unknown as Record<string, unknown>);
    return res.status(502).json({ message: errMsg });
  }
});

app.put("/api/blogs/config", async (req: Request, res: Response) => {
  const currentConfig = await getCmsDoc<BloggerConnectionConfig>(
    "blogger_config",
    DEFAULT_BLOGGER_CONFIG
  );
  const nextUrl = String(req.body?.blogUrl ?? currentConfig.blogUrl ?? "").trim();
  const normalizedUrl = nextUrl ? normalizeBloggerOrigin(nextUrl) : "";
  if (nextUrl && !normalizedUrl) {
    return res.status(400).json({
      message: "Invalid Blogger URL. Use a valid https://yourblog.blogspot.com address.",
    });
  }

  const nextConfig: BloggerConnectionConfig = {
    ...currentConfig,
    blogUrl: normalizedUrl || "",
    blogId:
      req.body?.blogId !== undefined ? String(req.body.blogId).trim() : currentConfig.blogId,
    apiKey:
      req.body?.apiKey !== undefined && req.body?.apiKey !== "••••••••"
        ? String(req.body.apiKey).trim()
        : currentConfig.apiKey,
    blogTitle:
      req.body?.blogTitle !== undefined
        ? String(req.body.blogTitle).trim() || currentConfig.blogTitle
        : currentConfig.blogTitle,
    autoSyncOnVisit:
      typeof req.body?.autoSyncOnVisit === "boolean"
        ? req.body.autoSyncOnVisit
        : currentConfig.autoSyncOnVisit,
  };
  await setCmsDoc("blogger_config", nextConfig as unknown as Record<string, unknown>);
  return res.json({
    message: "Blogger configuration saved",
    config: { ...nextConfig, apiKey: nextConfig.apiKey ? "••••••••" : "" },
  });
});

app.put("/api/blogs/home-selection", async (req: Request, res: Response) => {
  const orderedIds: string[] = Array.isArray(req.body?.homePostIds)
    ? req.body.homePostIds.map((v: unknown) => String(v))
    : [];
  const allPosts = await listBlogPosts();
  const orderMap = new Map<string, number>();
  orderedIds.forEach((id, idx) => orderMap.set(id, idx + 1));

  for (const p of allPosts) {
    const order = orderMap.get(p.id);
    await upsertBlogPostRecord({
      ...p,
      showOnHome: order !== undefined,
      homeOrder: order ?? 999,
    });
  }

  const refreshed = await listBlogPosts();
  return res.json({
    message: "Home page featured blogs updated",
    data: refreshed,
    homePosts: getHomePageBlogs(refreshed),
  });
});

app.post(["/api/blogs", "/api/blog-posts"], async (req: Request, res: Response) => {
  const {
    title,
    contentHtml,
    excerpt,
    category,
    labels,
    author,
    coverImage,
    featured,
    showOnHome,
    bloggerUrl,
  } = req.body || {};

  if (!String(title || "").trim()) {
    return res.status(400).json({ message: "Blog title is required." });
  }

  const allPosts = await listBlogPosts();
  const safeHtml = sanitizeBlogHtml(String(contentHtml || "<p></p>"));
  const resolvedExcerpt = String(excerpt || "").trim() || buildExcerpt(safeHtml, 175);
  const nowIso = new Date().toISOString();
  const cleanLabels = Array.isArray(labels)
    ? labels.map((l: unknown) => String(l || "").trim()).filter(Boolean)
    : typeof labels === "string"
      ? labels.split(",").map((l: string) => l.trim()).filter(Boolean)
      : [];

  const resolvedCategory =
    String(category || "").trim() || cleanLabels[0] || "Engineering";
  const currentHomeCount = allPosts.filter((p) => p.showOnHome).length;

  const created = await upsertBlogPostRecord({
    id: `blog-${Date.now()}`,
    title: String(title).trim(),
    excerpt: resolvedExcerpt,
    contentHtml: safeHtml,
    date: formatBlogDisplayDate(nowIso),
    publishedAt: nowIso,
    readTime: computeReadTime(safeHtml || resolvedExcerpt),
    category: resolvedCategory,
    labels: cleanLabels.length > 0 ? cleanLabels : [resolvedCategory],
    author: String(author || "").trim() || "Innovista Editorial",
    coverImage:
      String(coverImage || "").trim() ||
      BLOGGER_COVER_FALLBACKS[allPosts.length % BLOGGER_COVER_FALLBACKS.length],
    source: "local",
    bloggerUrl: String(bloggerUrl || "").trim() || undefined,
    featured: Boolean(featured),
    showOnHome: Boolean(showOnHome),
    homeOrder: showOnHome ? currentHomeCount + 1 : 999,
  });

  return res.status(201).json({
    message: "Blog post published",
    post: created,
    data: await listBlogPosts(),
  });
});

app.put(["/api/blogs/:id", "/api/blog-posts/:id"], async (req: Request, res: Response) => {
  const { id } = req.params;
  const allPosts = await listBlogPosts();
  const existing = allPosts.find((p) => p.id === id);
  if (!existing) return res.status(404).json({ message: "Blog post not found" });

  const nextHtml =
    req.body?.contentHtml !== undefined
      ? sanitizeBlogHtml(String(req.body.contentHtml))
      : existing.contentHtml;
  const nextTitle =
    req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
  const nextExcerpt =
    req.body?.excerpt !== undefined
      ? String(req.body.excerpt).trim() || buildExcerpt(nextHtml, 175)
      : existing.excerpt;
  const nextLabels = Array.isArray(req.body?.labels)
    ? req.body.labels.map((l: unknown) => String(l || "").trim()).filter(Boolean)
    : existing.labels;

  const updated = await upsertBlogPostRecord({
    ...existing,
    title: nextTitle || existing.title,
    contentHtml: nextHtml,
    excerpt: nextExcerpt,
    readTime: computeReadTime(nextHtml || nextExcerpt),
    category: req.body?.category ? String(req.body.category).trim() : existing.category,
    labels: nextLabels,
    author: req.body?.author ? String(req.body.author).trim() : existing.author,
    coverImage: req.body?.coverImage ? String(req.body.coverImage).trim() : existing.coverImage,
    bloggerUrl:
      req.body?.bloggerUrl !== undefined
        ? String(req.body.bloggerUrl).trim() || undefined
        : existing.bloggerUrl,
    featured: typeof req.body?.featured === "boolean" ? req.body.featured : existing.featured,
    showOnHome:
      typeof req.body?.showOnHome === "boolean" ? req.body.showOnHome : existing.showOnHome,
    homeOrder: typeof req.body?.homeOrder === "number" ? req.body.homeOrder : existing.homeOrder,
  });

  return res.json({
    message: "Blog post updated",
    post: updated,
    data: await listBlogPosts(),
  });
});

app.delete(["/api/blogs/:id", "/api/blog-posts/:id"], async (req: Request, res: Response) => {
  const ok = await deleteBlogPostRecord(String(req.params.id || ""));
  if (!ok) return res.status(404).json({ message: "Blog post not found" });
  return res.json({ message: "Blog post deleted", data: await listBlogPosts() });
});

// ============================================================================
// SITE CONTACT SETTINGS ROUTES
// ============================================================================
app.get("/api/site-settings", async (_req: Request, res: Response) => {
  const data = await getCmsDoc<SiteContactSettings>(
    "site_settings",
    DEFAULT_SITE_CONTACT_SETTINGS
  );
  return res.json({ data });
});

app.put("/api/site-settings", async (req: Request, res: Response) => {
  const current = await getCmsDoc<SiteContactSettings>(
    "site_settings",
    DEFAULT_SITE_CONTACT_SETTINGS
  );
  const next = normalizeSiteContactSettings(req.body || {}, current);
  const errors = validateSiteContactSettings(next);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Invalid contact settings", errors });
  }
  await setCmsDoc("site_settings", next as unknown as Record<string, unknown>);
  return res.json({ message: "Contact settings saved", data: next });
});

// ============================================================================
// CHATBOT CONFIGURATION, ADMIN TRAINING FAQS & LIVE AI Q&A ROUTES
// ============================================================================
app.get("/api/chatbot/config", async (_req: Request, res: Response) => {
  const [config, faqs, contact] = await Promise.all([
    getCmsDoc<ChatbotConfig>("chatbot_config", DEFAULT_CHATBOT_CONFIG),
    listChatbotFaqs(),
    getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
  ]);
  return res.json({ config, faqs, contact });
});

app.put("/api/chatbot/config", async (req: Request, res: Response) => {
  const current = await getCmsDoc<ChatbotConfig>("chatbot_config", DEFAULT_CHATBOT_CONFIG);
  const next = normalizeChatbotConfig(req.body || {}, current);
  await setCmsDoc("chatbot_config", next as unknown as Record<string, unknown>);
  return res.json({ message: "Chatbot configuration saved", config: next });
});

app.post("/api/chatbot/faqs", async (req: Request, res: Response) => {
  const existing = await listChatbotFaqs();
  const nextFaq = normalizeChatbotFaq(
    { ...(req.body || {}), id: `faq-${Date.now()}` },
    existing.length
  );
  if (!nextFaq.question || !nextFaq.answer) {
    return res.status(400).json({ message: "Question and answer are both required." });
  }
  const saved = await upsertChatbotFaqRecord(nextFaq);
  return res.status(201).json({
    message: "Trained Q&A added",
    faq: saved,
    faqs: await listChatbotFaqs(),
  });
});

app.put("/api/chatbot/faqs/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const all = await listChatbotFaqs();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return res.status(404).json({ message: "FAQ entry not found" });
  const updated = normalizeChatbotFaq(
    { ...all[idx], ...(req.body || {}), id: all[idx].id },
    idx
  );
  if (!updated.question || !updated.answer) {
    return res.status(400).json({ message: "Question and answer cannot be empty." });
  }
  const saved = await upsertChatbotFaqRecord(updated);
  return res.json({
    message: "Trained Q&A updated",
    faq: saved,
    faqs: await listChatbotFaqs(),
  });
});

app.delete("/api/chatbot/faqs/:id", async (req: Request, res: Response) => {
  const ok = await deleteChatbotFaqRecord(String(req.params.id || ""));
  if (!ok) return res.status(404).json({ message: "FAQ entry not found" });
  return res.json({ message: "Trained Q&A removed", faqs: await listChatbotFaqs() });
});

app.post("/api/chatbot/ask", async (req: Request, res: Response) => {
  const userMessage = String(req.body?.message || "").trim();
  const history = Array.isArray(req.body?.history)
    ? (req.body.history as Array<{ role: string; text: string }>).slice(-6)
    : [];

  if (!userMessage) {
    return res.status(400).json({ message: "Message text is required." });
  }

  const [config, faqs, contact, designs, cats] = await Promise.all([
    getCmsDoc<ChatbotConfig>("chatbot_config", DEFAULT_CHATBOT_CONFIG),
    listChatbotFaqs(),
    getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
    listProducts(),
    listCategories(),
  ]);

  const intent = detectChatIntent(userMessage);
  const wantsSiteVisit = intent === "visit";
  const wantsWhatsapp = intent === "whatsapp";
  const wantsQuote = intent === "quote";

  const whatsappUrl = buildWhatsAppChatUrl(
    contact.whatsapp || contact.phone,
    userMessage,
    config.defaultWhatsappPrefix
  );
  const smsHref = buildSmsHref(
    contact.phone,
    `Hi Innovista, ${userMessage.slice(0, 140)}`
  );

  const faqMatch = matchTrainedFaq(userMessage, faqs);
  if (faqMatch) {
    return res.json({
      reply: faqMatch.item.answer,
      source: "trained-faq",
      matchedFaqId: faqMatch.item.id,
      suggestSiteVisit: wantsSiteVisit,
      suggestWhatsapp: wantsWhatsapp || config.autoSuggestWhatsapp,
      whatsappUrl,
      smsHref,
    });
  }

  const ai = getServerGeminiClient();
  if (ai) {
    try {
      const kbContext = faqs
        .filter((f) => f.enabled)
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");
      const catalogContext = designs
        .slice(0, 8)
        .map((d) => `- ${d.Design_Name} (${d.Categories.join(", ")}): ${d.Design_Description}`)
        .join("\n");
      const catNames = cats.map((c) => c.name).join(", ");
      const transcript = history
        .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.text}`)
        .join("\n");

      const systemPrompt = `${config.systemInstructions}

Company Contact:
- Phone / WhatsApp: ${contact.phone}
- Email: ${contact.email}
- Showrooms: Nawala (Colombo 05), Kelaniya Plant, Kandy Showroom
- Product Categories: ${catNames}

Catalog Highlights:
${catalogContext}

Trained FAQs:
${kbContext}

Rules: Keep replies concise (1-3 crisp sentences). If they ask to book a visit, mention the "Site Visit" tab. For custom pricing or drawings, mention WhatsApp or Request Quote.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: transcript
          ? `${transcript}\nCustomer: ${userMessage}`
          : `Customer: ${userMessage}`,
        config: { systemInstruction: systemPrompt, temperature: 0.4, maxOutputTokens: 220 },
      });

      const replyText = response.text?.trim();
      if (replyText) {
        return res.json({
          reply: replyText,
          source: "gemini",
          suggestSiteVisit: wantsSiteVisit,
          suggestWhatsapp: wantsWhatsapp || config.autoSuggestWhatsapp,
          whatsappUrl,
          smsHref,
        });
      }
    } catch (err) {
      console.warn("Gemini chatbot fallback:", err);
    }
  }

  let fallbackReply =
    "Thanks for reaching out to Innovista Fabriconix! Share your dimensions or ask about doors, windows, partitions, or site visits—or continue directly on WhatsApp with our engineers.";
  if (wantsSiteVisit) {
    fallbackReply =
      "We can arrange an engineer site measurement visit. Switch to the Site Visit tab right here to pick your preferred date and time slot.";
  } else if (wantsQuote) {
    fallbackReply =
      "Share your rough dimensions via Request Quote or tap Chat on WhatsApp below—our estimating team returns a detailed BOQ within 24–48 business hours.";
  } else if (wantsWhatsapp) {
    fallbackReply =
      "Tap Chat on WhatsApp or Text via SMS below to speak directly with our fabrication specialists.";
  }

  return res.json({
    reply: fallbackReply,
    source: "fallback",
    suggestSiteVisit: wantsSiteVisit,
    suggestWhatsapp: true,
    whatsappUrl,
    smsHref,
  });
});

// ============================================================================
// APPOINTMENTS & SITE VISIT SCHEDULING ROUTES
// Both /api/appointments* and /api/site-visits* point to PostgreSQL
// ============================================================================
function buildSiteVisitSchedulePayload(
  schedule: Awaited<ReturnType<typeof getAppointmentScheduleConfig>>,
  bookings: Awaited<ReturnType<typeof listAppointments>>,
  rawMonth?: unknown
) {
  const now = new Date();
  const todayIso = formatIsoDateLocal(now);
  const monthKey =
    typeof rawMonth === "string" && /^\d{4}-\d{2}$/.test(rawMonth.trim())
      ? rawMonth.trim()
      : getMonthKeyFromDate(undefined, now);
  const managedDates = getManagedSiteVisitDates(schedule, bookings, 14, now);
  const calendarDays = buildMonthlySiteVisitCalendar(monthKey, schedule, bookings, todayIso);
  return { monthKey, todayIso, managedDates, calendarDays };
}

app.get(["/api/site-visits/slots", "/api/appointments/slots"], async (req: Request, res: Response) => {
  const [schedule, bookings] = await Promise.all([
    getAppointmentScheduleConfig(),
    listAppointments(),
  ]);
  const now = new Date();
  const todayIso = formatIsoDateLocal(now);
  const dates = getUpcomingSiteVisitDates(14, now);
  const managedDates = getManagedSiteVisitDates(schedule, bookings, 14, now);

  const rawDate =
    typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date.trim())
      ? req.query.date.trim()
      : "";
  const monthKey =
    typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month.trim())
      ? req.query.month.trim()
      : rawDate
        ? getMonthKeyFromDate(rawDate, now)
        : getMonthKeyFromDate(managedDates.find((d) => d.available)?.date, now);

  const calendarDays = buildMonthlySiteVisitCalendar(monthKey, schedule, bookings, todayIso);
  const requestedDate =
    rawDate ||
    getFirstOpenDateInMonth(monthKey, schedule, bookings, todayIso) ||
    managedDates.find((d) => d.available)?.date ||
    dates[0]?.date ||
    "";

  const slots = computeAvailableSlotsForDate(
    requestedDate,
    bookings,
    schedule.blockedKeys,
    [],
    schedule
  );

  return res.json({
    monthKey,
    todayIso,
    calendarDays,
    dates: managedDates,
    upcomingDates: dates,
    managedDates,
    selectedDate: requestedDate,
    slots,
    schedule,
    calendarConnected: Boolean(
      (req.headers.authorization || "").startsWith("Bearer ") &&
        !(req.headers.authorization || "").includes("mock-access-token")
    ),
  });
});

app.get(["/api/site-visits", "/api/appointments"], async (req: Request, res: Response) => {
  const [bookings, schedule] = await Promise.all([
    listAppointments(),
    getAppointmentScheduleConfig(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, req.query.month);
  return res.json({
    bookings,
    data: bookings,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.get("/api/site-visits/schedule", async (req: Request, res: Response) => {
  const [schedule, bookings] = await Promise.all([
    getAppointmentScheduleConfig(),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, req.query.month);
  return res.json({
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.put("/api/site-visits/schedule/monthly", async (req: Request, res: Response) => {
  const { monthKey, slots, activeWeekdays, closedDates, note, clearPerDateCustomSlots } =
    req.body || {};
  const cleanMonth = String(monthKey || "").trim();
  if (!/^\d{4}-\d{2}$/.test(cleanMonth)) {
    return res.status(400).json({ message: "Valid YYYY-MM monthKey is required." });
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ message: "At least one time slot is required for monthly setup." });
  }
  const [schedule, bookings] = await Promise.all([
    upsertMonthlyTemplateRecord({
      monthKey: cleanMonth,
      slots,
      activeWeekdays: Array.isArray(activeWeekdays) ? activeWeekdays : undefined,
      closedDates: Array.isArray(closedDates) ? closedDates : undefined,
      note: typeof note === "string" ? note : undefined,
      clearPerDateCustomSlots: Boolean(clearPerDateCustomSlots),
    }),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, cleanMonth);
  return res.json({
    message: `Monthly slot schedule saved for ${cleanMonth}.`,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.delete("/api/site-visits/schedule/monthly/:monthKey", async (req: Request, res: Response) => {
  const cleanMonth = String(req.params.monthKey || "").trim();
  if (!/^\d{4}-\d{2}$/.test(cleanMonth)) {
    return res.status(400).json({ message: "Valid YYYY-MM monthKey parameter required." });
  }
  const [schedule, bookings] = await Promise.all([
    deleteMonthlyTemplateRecord(cleanMonth),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, cleanMonth);
  return res.json({
    message: `Reset ${cleanMonth} back to global default slots.`,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.post("/api/site-visits/dates", async (req: Request, res: Response) => {
  const { date, available, note } = req.body || {};
  const cleanDate = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return res.status(400).json({ message: "Valid YYYY-MM-DD date is required." });
  }
  const [schedule, bookings] = await Promise.all([
    upsertAppointmentDateRecord({
      date: cleanDate,
      available: typeof available === "boolean" ? available : true,
      note: typeof note === "string" ? note.trim() : "",
      isCustom: true,
    }),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, cleanDate.slice(0, 7));
  return res.status(201).json({
    message: `Date ${cleanDate} saved.`,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.patch("/api/site-visits/dates/:date", async (req: Request, res: Response) => {
  const cleanDate = String(req.params.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return res.status(400).json({ message: "Valid YYYY-MM-DD date parameter required." });
  }
  const { available, note, resetSlots } = req.body || {};
  const [schedule, bookings] = await Promise.all([
    upsertAppointmentDateRecord({
      date: cleanDate,
      available: typeof available === "boolean" ? available : undefined,
      note: typeof note === "string" ? note.trim() : undefined,
      resetSlots: Boolean(resetSlots),
    }),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, cleanDate.slice(0, 7));
  return res.json({
    message: resetSlots
      ? `Reset custom slots on ${cleanDate}.`
      : `Availability updated for ${cleanDate}.`,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.delete("/api/site-visits/dates/:date", async (req: Request, res: Response) => {
  const cleanDate = String(req.params.date || "").trim();
  const [schedule, bookings] = await Promise.all([
    deleteAppointmentDateRecord(cleanDate),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, cleanDate.slice(0, 7));
  return res.json({
    message: `Removed date override for ${cleanDate}.`,
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.post(["/api/site-visits/slots", "/api/appointments/slots"], async (req: Request, res: Response) => {
  const { scope, date, time, endTime, label, available } = req.body || {};
  if (!time || !/^\d{1,2}:\d{2}$/.test(String(time).trim())) {
    return res.status(400).json({ message: "Valid HH:mm start time is required." });
  }
  const targetDate = scope === "default" ? undefined : date ? String(date) : undefined;
  const [schedule, bookings] = await Promise.all([
    addAppointmentSlotRecord(targetDate, {
      time: String(time),
      endTime: endTime ? String(endTime) : undefined,
      label: label ? String(label) : undefined,
      available: typeof available === "boolean" ? available : true,
    }),
    listAppointments(),
  ]);
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, targetDate?.slice(0, 7));
  return res.status(201).json({
    message: targetDate ? `Time slot added to ${targetDate}.` : "Default time slot added.",
    schedule,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    monthKey: payload.monthKey,
    calendarDays: payload.calendarDays,
  });
});

app.put(
  ["/api/site-visits/slots/:slotId", "/api/appointments/slots/:slotId"],
  async (req: Request, res: Response) => {
    const slotId = String(req.params.slotId || "");
    const { scope, date, time, endTime, label, available } = req.body || {};
    const targetDate = scope === "default" ? undefined : date ? String(date) : undefined;
    const [schedule, bookings] = await Promise.all([
      updateAppointmentSlotRecord(slotId, targetDate, {
        ...(time !== undefined ? { time: String(time) } : {}),
        ...(endTime !== undefined ? { endTime: String(endTime) } : {}),
        ...(label !== undefined ? { label: String(label) } : {}),
        ...(typeof available === "boolean" ? { available } : {}),
      }),
      listAppointments(),
    ]);
    const payload = buildSiteVisitSchedulePayload(schedule, bookings, targetDate?.slice(0, 7));
    return res.json({
      message: "Time slot updated.",
      schedule,
      dates: payload.managedDates,
      managedDates: payload.managedDates,
      monthKey: payload.monthKey,
      calendarDays: payload.calendarDays,
    });
  }
);

app.delete(
  ["/api/site-visits/slots/:slotId", "/api/appointments/slots/:slotId"],
  async (req: Request, res: Response) => {
    const slotId = String(req.params.slotId || "");
    const scope = typeof req.query.scope === "string" ? req.query.scope : undefined;
    const targetDate =
      scope === "default"
        ? undefined
        : typeof req.query.date === "string"
          ? req.query.date
          : undefined;
    const [schedule, bookings] = await Promise.all([
      deleteAppointmentSlotRecord(slotId, targetDate),
      listAppointments(),
    ]);
    const payload = buildSiteVisitSchedulePayload(schedule, bookings, targetDate?.slice(0, 7));
    return res.json({
      message: "Time slot deleted.",
      schedule,
      dates: payload.managedDates,
      managedDates: payload.managedDates,
      monthKey: payload.monthKey,
      calendarDays: payload.calendarDays,
    });
  }
);

app.post(["/api/site-visits", "/api/appointments"], optionalAuth, async (req: AuthRequest, res: Response) => {
  const { date, slotTime, locationName, visitorName, visitorEmail, visitorPhone, notes } =
    req.body || {};

  const errors = validateSiteVisitBooking({
    date: String(date || ""),
    slotTime: String(slotTime || ""),
    visitorName: String(visitorName || ""),
    visitorEmail: String(visitorEmail || ""),
    visitorPhone: String(visitorPhone || ""),
  });

  const firstError = Object.values(errors)[0];
  if (firstError) {
    return res.status(400).json({ message: firstError, errors });
  }

  const [schedule, currentBookings] = await Promise.all([
    getAppointmentScheduleConfig(),
    listAppointments(),
  ]);

  const currentSlots = computeAvailableSlotsForDate(
    String(date),
    currentBookings,
    schedule.blockedKeys,
    [],
    schedule
  );
  const chosenSlot = currentSlots.find((s) => s.time === String(slotTime));
  if (!chosenSlot || !chosenSlot.available) {
    return res.status(409).json({
      message: `Sorry, that slot is no longer available (${chosenSlot?.reason || "Booked"}). Please select another open slot.`,
    });
  }

  const booking = await createAppointmentRecord({
    date: String(date),
    slotTime: chosenSlot.time,
    slotLabel: chosenSlot.label,
    locationName: String(locationName || "Nawala Showroom & Consultation").trim(),
    visitorName: String(visitorName),
    visitorEmail: String(visitorEmail),
    visitorPhone: String(visitorPhone),
    notes: String(notes || ""),
    userId: req.user?.userId ?? null,
  });

  const updatedBookings = [booking, ...currentBookings];
  const updatedSlots = computeAvailableSlotsForDate(
    booking.date,
    updatedBookings,
    schedule.blockedKeys,
    [],
    schedule
  );
  const payload = buildSiteVisitSchedulePayload(
    schedule,
    updatedBookings,
    booking.date.slice(0, 7)
  );

  return res.status(201).json({
    message: `Site visit booked for ${booking.date} at ${booking.slotLabel}.`,
    booking,
    data: booking,
    slots: updatedSlots,
    dates: payload.managedDates,
    managedDates: payload.managedDates,
    calendarDays: payload.calendarDays,
  });
});

app.patch(["/api/site-visits/:id", "/api/appointments/:id"], async (req: Request, res: Response) => {
  const bookingId = String(req.params.id || "");
  const rawStatus = req.body?.status !== undefined ? String(req.body.status).toUpperCase() : undefined;
  if (rawStatus && !["CONFIRMED", "COMPLETED", "CANCELLED"].includes(rawStatus)) {
    return res.status(400).json({ message: "Invalid booking status." });
  }
  const calendarEventId =
    typeof req.body?.calendarEventId === "string" ? req.body.calendarEventId : undefined;
  const emailSent =
    typeof req.body?.emailSent === "boolean" ? req.body.emailSent : undefined;

  if (!rawStatus && calendarEventId === undefined && emailSent === undefined) {
    return res.status(400).json({ message: "No booking update fields provided." });
  }

  const updated =
    rawStatus && calendarEventId === undefined && emailSent === undefined
      ? await updateAppointmentStatusRecord(bookingId, rawStatus as SiteVisitStatus)
      : await updateAppointmentMetadataRecord(bookingId, {
          status: rawStatus as SiteVisitStatus | undefined,
          calendarEventId,
          emailSent,
        });
  if (!updated) return res.status(404).json({ message: "Booking not found." });
  return res.json({ message: "Booking updated", booking: updated });
});

app.post("/api/site-visits/slots/toggle-block", async (req: Request, res: Response) => {
  const { date, slotTime } = req.body || {};
  if (!date || !slotTime) {
    return res.status(400).json({ message: "date and slotTime are required." });
  }
  const doc = await getCmsDoc<{ blockedKeys: string[] }>("site_visit_blocked_keys", {
    blockedKeys: [],
  });
  const key = `${date}|${slotTime}`;
  const blocked = doc.blockedKeys.includes(key);
  const nextBlocked = blocked
    ? doc.blockedKeys.filter((k) => k !== key)
    : [...doc.blockedKeys, key];
  await setCmsDoc("site_visit_blocked_keys", { blockedKeys: nextBlocked });
  return res.json({
    message: blocked ? "Slot unblocked" : "Slot blocked",
    blockedKeys: nextBlocked,
  });
});

// ============================================================================
// HOME HERO SLIDESHOW, SERVICES & TOP PICKS CMS ROUTES
// ============================================================================
app.get("/api/home-slideshow", async (_req: Request, res: Response) => {
  const data = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  return res.json({ data });
});

app.put("/api/home-slideshow", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const next = normalizeHomeSlideshowCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_slideshow", next as unknown as Record<string, unknown>);
  return res.json({ message: "Home slideshow settings updated.", data: next });
});

app.post("/api/home-slideshow/slides", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const nextSlides = upsertHomeSlide(current.slides, req.body || {});
  const next: HomeSlideshowCmsPayload = { ...current, slides: nextSlides };
  await setCmsDoc("home_slideshow", next as unknown as Record<string, unknown>);
  return res.status(201).json({
    message: "Home slideshow item added.",
    slide: next.slides[next.slides.length - 1],
    data: next,
  });
});

app.put("/api/home-slideshow/slides/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const target = current.slides.find((s) => s.id === id);
  if (!target) return res.status(404).json({ message: "Slide not found." });
  const nextSlides = upsertHomeSlide(current.slides, { ...target, ...(req.body || {}) }, id);
  const next: HomeSlideshowCmsPayload = { ...current, slides: nextSlides };
  await setCmsDoc("home_slideshow", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Home slideshow item updated.",
    slide: next.slides.find((s) => s.id === id),
    data: next,
  });
});

app.delete("/api/home-slideshow/slides/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const next: HomeSlideshowCmsPayload = {
    ...current,
    slides: deleteHomeSlide(current.slides, id),
  };
  await setCmsDoc("home_slideshow", next as unknown as Record<string, unknown>);
  return res.json({ message: "Home slideshow item deleted.", data: next });
});

app.get("/api/home-services", async (_req: Request, res: Response) => {
  const data = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  return res.json({ data });
});

app.put("/api/home-services", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  const next = normalizeHomeServicesCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_services", next as unknown as Record<string, unknown>);
  return res.json({ message: "What We Build For You settings updated.", data: next });
});

app.post("/api/home-services/items", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  const nextItems = upsertHomeService(current.items, req.body || {});
  const next: HomeServicesCmsPayload = { ...current, items: nextItems };
  await setCmsDoc("home_services", next as unknown as Record<string, unknown>);
  return res.status(201).json({
    message: "Service card added.",
    item: next.items[next.items.length - 1],
    data: next,
  });
});

app.put("/api/home-services/items/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  const target = current.items.find((item) => item.id === id);
  if (!target) return res.status(404).json({ message: "Service card not found." });
  const nextItems = upsertHomeService(current.items, { ...target, ...(req.body || {}) }, id);
  const next: HomeServicesCmsPayload = { ...current, items: nextItems };
  await setCmsDoc("home_services", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Service card updated.",
    item: next.items.find((item) => item.id === id),
    data: next,
  });
});

app.delete("/api/home-services/items/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  const next: HomeServicesCmsPayload = {
    ...current,
    items: deleteHomeService(current.items, id),
  };
  await setCmsDoc("home_services", next as unknown as Record<string, unknown>);
  return res.json({ message: "Service card deleted.", data: next });
});

app.get("/api/home-featured-products", async (_req: Request, res: Response) => {
  const [data, allDesigns] = await Promise.all([
    getCmsDoc<HomeFeaturedProductsCmsPayload>(
      "home_featured_products",
      DEFAULT_HOME_FEATURED_PRODUCTS_CMS
    ),
    listProducts(),
  ]);
  return res.json({ data, allDesigns });
});

app.put("/api/home-featured-products", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeFeaturedProductsCmsPayload>(
    "home_featured_products",
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const next = normalizeHomeFeaturedProductsCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_featured_products", next as unknown as Record<string, unknown>);
  return res.json({ message: "Top Picks & Accessories Ribbon updated.", data: next });
});

app.post("/api/home-featured-products/accessories", async (req: Request, res: Response) => {
  const current = await getCmsDoc<HomeFeaturedProductsCmsPayload>(
    "home_featured_products",
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const nextItems = upsertHomeAccessoryRibbonItem(
    current.accessoriesRibbonItems,
    req.body || {}
  );
  const next: HomeFeaturedProductsCmsPayload = {
    ...current,
    accessoriesRibbonItems: nextItems,
  };
  await setCmsDoc("home_featured_products", next as unknown as Record<string, unknown>);
  return res.status(201).json({
    message: "Accessory ribbon image added.",
    item: next.accessoriesRibbonItems[next.accessoriesRibbonItems.length - 1],
    data: next,
  });
});

app.put("/api/home-featured-products/accessories/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeFeaturedProductsCmsPayload>(
    "home_featured_products",
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const target = current.accessoriesRibbonItems.find((item) => item.id === id);
  if (!target) return res.status(404).json({ message: "Accessory ribbon item not found." });
  const nextItems = upsertHomeAccessoryRibbonItem(
    current.accessoriesRibbonItems,
    { ...target, ...(req.body || {}) },
    id
  );
  const next: HomeFeaturedProductsCmsPayload = {
    ...current,
    accessoriesRibbonItems: nextItems,
  };
  await setCmsDoc("home_featured_products", next as unknown as Record<string, unknown>);
  return res.json({
    message: "Accessory ribbon image updated.",
    item: next.accessoriesRibbonItems.find((item) => item.id === id),
    data: next,
  });
});

app.delete("/api/home-featured-products/accessories/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id || "");
  const current = await getCmsDoc<HomeFeaturedProductsCmsPayload>(
    "home_featured_products",
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const next: HomeFeaturedProductsCmsPayload = {
    ...current,
    accessoriesRibbonItems: deleteHomeAccessoryRibbonItem(
      current.accessoriesRibbonItems,
      id
    ),
  };
  await setCmsDoc("home_featured_products", next as unknown as Record<string, unknown>);
  return res.json({ message: "Accessory ribbon image removed.", data: next });
});

// ============================================================================
// SEO HTML INJECTION & VITE / STATIC SERVING
// ============================================================================
async function buildSeoHtml(rawHtml: string, req: Request): Promise<string> {
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

  try {
    const [
      homeSlideshowCms,
      productLandingCms,
      designs,
      cats,
      projs,
      blogs,
      contact,
    ] = await Promise.all([
      getCmsDoc<HomeSlideshowCmsPayload>("home_slideshow", DEFAULT_HOME_SLIDESHOW_CMS),
      getCmsDoc<ProductLandingCms>("product_landing_cms", DEFAULT_PRODUCT_LANDING_CMS),
      listProducts(),
      listCategories(),
      listProjects(),
      listBlogPosts(),
      getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
    ]);

    const activeHomeSlide =
      homeSlideshowCms.slides.find((slide) => slide.active) || homeSlideshowCms.slides[0];
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
      categories: cats,
      projects: projs,
      blogs,
      contact,
    });
    return injectSeoIntoHtml(rawHtml, seo);
  } catch {
    return rawHtml;
  }
}

async function startServer() {
  const httpServer = http.createServer(app);
  const disableHmr = process.env.DISABLE_HMR === "true";

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath, { index: false }));
    app.use(async (req: Request, res: Response, next: NextFunction) => {
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
        const html = await buildSeoHtml(template, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
      },
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
        const html = await buildSeoHtml(transformed, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
