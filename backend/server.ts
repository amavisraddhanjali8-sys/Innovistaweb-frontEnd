import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
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
} from "../shared/aboutContentHelpers.ts";
import {
  DEFAULT_PRODUCT_LANDING_CMS,
  designMatchesCategory,
  findCategoryByParam,
  normalizeProductLandingCms,
  resolveRelatedDesigns,
  type ProductLandingCms,
} from "../shared/productCatalogHelpers.ts";
import {
  DEFAULT_PAGE_ADS_CMS,
  isValidAdPageKey,
  normalizePageAdSlide,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  type PageAdsCmsPayload,
} from "../shared/pageAdsHelpers.ts";
import {
  RESOURCE_ATTACHMENTS,
  normalizePortalTile,
  normalizeRelatedPortals,
} from "../shared/siteContentHelpers.ts";
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
} from "../shared/blogBloggerHelpers.ts";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  normalizeSiteContactSettings,
  validateSiteContactSettings,
  type SiteContactSettings,
} from "../shared/footerConsultationHelpers.ts";
import {
  getPublicChatbotConfig,
  normalizeChatbotConfig,
  normalizeChatbotFaq,
  type ChatAttachmentItem,
  type KnowledgePublicationStatus,
  type SupportedLanguage,
} from "../shared/chatbotHelpers.ts";
import {
  clearAiResponseCache,
  computeChatbotAnalytics,
  convertUnansweredToKnowledge,
  deleteChatbotWorkflow,
  deleteKnowledgeDocument,
  dismissOrDeleteUnanswered,
  findCustomerContactHistory,
  getAiUsageStats,
  getChatSession,
  getStoredChatbotConfig,
  listChatbotConfigHistory,
  listChatbotLeads,
  listChatbotWorkflows,
  listChatSessions,
  listExtendedKnowledgeItems,
  listKnowledgeDocuments,
  listUnansweredQuestions,
  removeKnowledgeMeta,
  saveChatbotConfigWithHistory,
  syncChatbotLeadToRfq,
  updateChatbotLead,
  upsertChatbotWorkflow,
  upsertChatSession,
  upsertExtendedKnowledgeMeta,
  upsertKnowledgeDocument,
} from "./db/chatbotStore.ts";
import {
  previewKnowledgeRetrieval,
  processInnoassistMessage,
} from "./services/innoassistEngine.ts";
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
} from "../shared/siteVisitSchedulerHelpers.ts";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  deleteHomeSlide,
  normalizeHomeSlideshowCms,
  upsertHomeSlide,
  type HomeSlideshowCmsPayload,
} from "../shared/homeSlideshowHelpers.ts";
import {
  DEFAULT_HOME_SERVICES_CMS,
  deleteHomeService,
  normalizeHomeServicesCms,
  upsertHomeService,
  type HomeServicesCmsPayload,
} from "../shared/homeServicesHelpers.ts";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  deleteHomeAccessoryRibbonItem,
  normalizeHomeFeaturedProductsCms,
  upsertHomeAccessoryRibbonItem,
  type HomeFeaturedProductsCmsPayload,
} from "../shared/homeTopPicksHelpers.ts";
import {
  injectSeoIntoHtml,
  resolveDynamicRouteSeo,
  resolveRequestOrigin,
} from "../shared/seoMetadataHelpers.ts";
import {
  normalizeCustomerFeedbackRecord,
} from "../shared/customerFeedbackHelpers.ts";
import {
  DEFAULT_HERO_THEME,
  DEFAULT_PAGE_HERO_THEMES,
  normalizeHeroTheme,
  normalizePageHeroThemes,
  type PageHeroThemesMap,
} from "../shared/heroThemeHelpers.ts";
import { randomBytes, randomInt } from "node:crypto";
import QRCode from "qrcode";
import { optionalAuth, requireAdminOrStaff, requireAuth, type AuthRequest } from "./middleware/auth.ts";
import { clearDatabaseOffline, createPool, isMemoryFallbackActive } from "./db/index.ts";
import {
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  findUserByVerificationTokenHash,
  getAdminAndStaffUsers,
  getCustomerUsers,
  getOrCreateUser,
  hasAnyAdminUser,
} from "./db/users.ts";
import {
  addAppointmentSlotRecord,
  applyHeroThemeToAllCategories,
  createAppointmentRecord,
  createAuditLog,
  createCategoryRecord,
  createContactInquiryRecord,
  createFeedbackRecord,
  createMediaAssetRecord,
  createNotificationRecord,
  createOrderRecord,
  createProductRecord,
  createProjectRecord,
  createRfqRecord,
  createSecurityChallenge,
  createUserAccount,
  createUserSession,
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
  getAdminSecretConfig,
  getAppointmentScheduleConfig,
  getCmsDoc,
  getProductByAnyId,
  getSecurityChallenge,
  getUserSessionByTokenHash,
  incrementChallengeAttempts,
  listAppointments,
  listAuditLogs,
  listBlogPosts,
  listCategories,
  listChatbotFaqs,
  listContactInquiries,
  listFeedbacks,
  listMediaAssets,
  listNotifications,
  listOrders,
  listProducts,
  listProjects,
  listRelatedPortals,
  listRfqRecords,
  listUsersByRoles,
  markChallengeConsumed,
  markNotificationRead,
  reorderCategoryRecords,
  reorderFeedbackRecords,
  replaceRelatedPortals,
  revokeAllUserSessionsForUser,
  revokeUserSessionByTokenHash,
  setCmsDoc,
  toggleBlockedSiteVisitKey,
  touchUserSession,
  updateAppointmentMetadataRecord,
  updateAppointmentSlotRecord,
  updateAppointmentStatusRecord,
  updateCategoryRecord,
  updateContactInquiryStatus,
  updateFeedbackRecord,
  updateOrderStatusRecord,
  updateProductRecord,
  updateProjectRecord,
  updateRfqRecord,
  updateUserAccount,
  upsertAdminSecretConfig,
  upsertAppointmentDateRecord,
  upsertBlogPostRecord,
  upsertChatbotFaqRecord,
  upsertMonthlyTemplateRecord,
} from "./db/repositories.ts";
import {
  DEFAULT_ADMIN_SECRET_KEY,
  buildAuditLogsCsv,
  buildTotpOtpAuthUri,
  classifyAccountStatus,
  decryptSecret,
  encryptSecret,
  generateAdminSecretKey,
  generateCaptchaChallenge,
  generateTotpSecret,
  hashPassword,
  issueSignedToken,
  maskAdminSecretKey,
  normalizeCaptchaAnswer,
  parseCaptchaChallengeMeta,
  sha256Hex,
  validateAdminSecretKeyFormat,
  validatePasswordStrength,
  verifyAdminSecretKeyInput,
  verifyCaptchaSecurityPayload,
  verifyPassword,
  verifySignedToken,
  verifyTotpCode,
} from "./utils/securityHelpers.ts";
import { validateProjectImageInput } from "../shared/projectValidation.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseCliFlag(flagName: string): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === flagName && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      return argv[i + 1];
    }
    if (arg.startsWith(`${flagName}=`)) {
      return arg.slice(flagName.length + 1);
    }
  }
  return undefined;
}

const app = express();
const PORT =
  parseInt(
    parseCliFlag("--port") || process.env.PORT || process.env.DEFAULT_APP_PORT || "3000",
    10
  ) || 3000;
const HOST = parseCliFlag("--host") || process.env.HOST || "0.0.0.0";

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security hardening headers (allow AI Studio preview iframe controlled by upstream CSP frame-ancestors)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Sliding-window rate limiter for auth & security endpoints
const rateLimitBuckets = new Map<string, number[]>();
function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function createRateLimiter(bucketName: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${bucketName}:${ip}`;
    const now = Date.now();
    const recent = (rateLimitBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxRequests) {
      void createAuditLog({
        eventId: `EVT-${Date.now().toString(36)}-${randomBytes(3).toString("hex").toUpperCase()}`,
        actorEmail: String(req.body?.email || req.body?.identifier || ""),
        actorRole: "anonymous",
        action: "RATE_LIMIT_EXCEEDED",
        category: "SECURITY",
        status: "BLOCKED",
        severity: "HIGH",
        ipAddress: ip,
        userAgent: String(req.headers["user-agent"] || ""),
        details: `Rate limit exceeded on ${bucketName} (${req.method} ${req.path})`,
        metadata: { bucketName, path: req.path },
      }).catch(() => null);
      return res.status(429).json({
        message: "Too many security requests from this IP. Please wait a moment and try again.",
      });
    }
    recent.push(now);
    rateLimitBuckets.set(key, recent);
    return next();
  };
}

const authRateLimiter = createRateLimiter("auth", 60, 60_000);
const strictLoginRateLimiter = createRateLimiter("login", 25, 60_000);
const publicSubmissionRateLimiter = createRateLimiter("public_submission", 30, 60_000);

async function recordAuditEvent(
  req: AuthRequest | Request,
  opts: {
    actorUserId?: number | null;
    actorEmail?: string;
    actorRole?: string;
    targetUserId?: number | null;
    targetIdentifier?: string;
    action: string;
    category: string;
    status: "SUCCESS" | "FAILURE" | "BLOCKED" | "PENDING";
    severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
    accountClassification?: string;
    details?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const authUser = (req as AuthRequest).user;
  const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
  await createAuditLog({
    eventId,
    actorUserId: opts.actorUserId !== undefined ? opts.actorUserId : authUser?.userId ?? null,
    actorEmail: opts.actorEmail ?? authUser?.email ?? "",
    actorRole: opts.actorRole ?? authUser?.role ?? "anonymous",
    targetUserId: opts.targetUserId ?? null,
    targetIdentifier: opts.targetIdentifier ?? "",
    action: opts.action,
    category: opts.category,
    status: opts.status,
    severity: opts.severity,
    accountClassification: opts.accountClassification ?? "",
    ipAddress: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 240),
    details: opts.details ?? "",
    metadata: opts.metadata ?? {},
  }).catch(() => null);
}

// Static uploads directory (hardened against inline script execution)
const uploadsDir = path.resolve(rootDir, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(
  "/uploads",
  (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(uploadsDir)
);

const SAFE_UPLOAD_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".ogg",
  ".ogv",
  ".pdf",
  ".dwg",
  ".dxf",
  ".xlsx",
  ".xls",
  ".csv",
  ".txt",
  ".md",
  ".doc",
  ".docx",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const ext = SAFE_UPLOAD_EXTENSIONS.has(rawExt) ? rawExt : ".bin";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ext || !SAFE_UPLOAD_EXTENSIONS.has(ext)) {
      cb(new Error(`Unsupported or unsafe file type: ${ext || "unknown"}`));
      return;
    }
    cb(null, true);
  },
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
  heroTheme: DEFAULT_HERO_THEME,
};

let lastAutoSyncAttemptAt = 0;

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
    const pool = createPool();
    if (pool) {
      await pool.query("SELECT 1");
      clearDatabaseOffline();
    }
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
  requireAuth,
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

app.get("/api/media", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/api/media", requireAuth, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/media/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
// AUTH, CAPTCHA, STATUS RECOGNITION, EMAIL VERIFICATION, ADMIN TOTP & AUDIT
// ============================================================================
function sanitizeUserRecord<
  T extends {
    passwordHash?: string | null;
    totpSecretEncrypted?: string | null;
    emailVerificationTokenHash?: string | null;
    emailVerificationCodeHash?: string | null;
  }
>(user: T) {
  const copy = { ...user };
  delete copy.passwordHash;
  delete copy.totpSecretEncrypted;
  delete copy.emailVerificationTokenHash;
  delete copy.emailVerificationCodeHash;
  return copy;
}

type DbUserRow = Awaited<ReturnType<typeof getCustomerUsers>>[number];

function mapAdminUserToLegacy(a: DbUserRow) {
  return {
    AdminId: a.id,
    Admin_Name: a.name,
    Admin_Username: a.username || null,
    Admin_Email: a.email,
    Admin_Phone: a.phone || "",
    Admin_Profile: a.avatarUrl || "/assets/about/director.jpg",
    role: a.role,
    isVerified: Boolean(a.isVerified),
    emailVerified: Boolean(a.emailVerified),
    accountStatus: (a.accountStatus as "ACTIVE" | "SUSPENDED") || "ACTIVE",
    totpEnabled: Boolean(a.totpEnabled),
  };
}

function mapCustomerUserToLegacy(u: DbUserRow) {
  return {
    CustomerId: u.id,
    Cus_Name: u.name,
    Cus_Username: u.username || null,
    Cus_Email: u.email,
    Cus_PhoneNumber: u.phone || "",
    Cus_CompanyName: u.company || "",
    Cus_Logo: u.avatarUrl || "/assets/logos/client-zenith.svg",
    Verify_State: Boolean(u.isVerified),
    Email_Verified: Boolean(u.emailVerified),
    Account_Status: (u.accountStatus as "ACTIVE" | "SUSPENDED") || "ACTIVE",
    Purchase_Goods: u.purchaseGoods || [],
    createdAt: u.createdAt,
  };
}

async function dispatchEmailVerification(params: {
  email: string;
  name: string;
  code: string;
  verifyUrl: string;
}): Promise<boolean> {
  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromAddress = (process.env.EMAIL_FROM || "Innovista Security <security@innovista.com>").trim();
  if (!resendApiKey) {
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.email],
        subject: "Verify your Innovista Fabriconix email address",
        html: `<p>Hello ${params.name},</p><p>Your Innovista verification code is: <strong>${params.code}</strong></p><p>Or click this verification link: <a href="${params.verifyUrl}">${params.verifyUrl}</a></p><p>This code expires in 24 hours.</p>`,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function issueEmailVerificationChallenge(user: DbUserRow, origin: string) {
  const code = String(randomInt(100000, 1000000));
  const rawToken = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 3600_000);
  await updateUserAccount(user.id, {
    emailVerificationCodeHash: sha256Hex(`${user.id}:${code}`),
    emailVerificationTokenHash: sha256Hex(rawToken),
    emailVerificationExpiresAt: expiresAt,
  });

  const verifyPath = `/#/CustomerVerify?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(
    user.email
  )}`;
  const verifyUrl = origin ? `${origin}${verifyPath}` : verifyPath;
  const emailDispatched = await dispatchEmailVerification({
    email: user.email,
    name: user.name,
    code,
    verifyUrl,
  });

  return {
    emailDispatched,
    expiresAt: expiresAt.toISOString(),
    verificationPreview: emailDispatched
      ? undefined
      : {
          code,
          verifyPath,
          note: "SMTP/Resend key is not configured in this environment; verify using the issued code below.",
        },
  };
}

async function verifyCaptchaInput(
  req: Request,
  bodyRaw: Record<string, unknown> | undefined
): Promise<{ ok: true } | { ok: false; status: number; message: string; reason: string }> {
  const b = bodyRaw || {};
  const honeypotRaw = b.website;
  if (typeof honeypotRaw === "string" && honeypotRaw.trim().length > 0) {
    await recordAuditEvent(req, {
      action: "BOT_HONEYPOT_TRIGGERED",
      category: "SECURITY",
      status: "BLOCKED",
      severity: "HIGH",
      targetIdentifier: String(b.identifier || b.email || b.Cus_Email || ""),
      details: "Bot trap honeypot field populated during authentication/registration attempt.",
    });
    return {
      ok: false,
      status: 400,
      reason: "BOT_HONEYPOT",
      message: "Automated submission rejected by bot trap protection.",
    };
  }

  const captchaId = String(b.captchaId || "").trim();
  const answer = String(b.captchaAnswer || "");
  if (!captchaId || !normalizeCaptchaAnswer(answer)) {
    return {
      ok: false,
      status: 400,
      reason: "CAPTCHA_MISSING",
      message: "Please complete the robot verification shield and enter the 7-character code.",
    };
  }

  const challenge = await getSecurityChallenge(captchaId);
  const now = Date.now();
  if (
    !challenge ||
    challenge.purpose !== "CAPTCHA" ||
    challenge.consumed ||
    new Date(challenge.expiresAt).getTime() < now ||
    challenge.attempts >= challenge.maxAttempts
  ) {
    return {
      ok: false,
      status: 400,
      reason: "CAPTCHA_EXPIRED",
      message: "Verification challenge expired or exceeded attempts. Please click 'New Code' and try again.",
    };
  }

  const storedMeta = parseCaptchaChallengeMeta(challenge.identifier);
  const outcome = verifyCaptchaSecurityPayload({
    challengeId: captchaId,
    challengeCreatedAtMs: new Date(challenge.createdAt).getTime(),
    expectedAnswerHash: challenge.answerHash,
    storedMeta,
    submittedAnswer: answer,
    submittedPowNonce: String(b.captchaPowNonce || ""),
    honeypot: typeof honeypotRaw === "string" ? honeypotRaw : "",
    telemetry:
      b.captchaTelemetry && typeof b.captchaTelemetry === "object"
        ? (b.captchaTelemetry as {
            humanShieldVerified?: boolean;
            pointerCount?: number;
            keyCount?: number;
            dwellMs?: number;
          })
        : null,
    nowMs: now,
  });

  if (outcome.ok === false) {
    if (outcome.burnChallenge) {
      await markChallengeConsumed(captchaId);
    } else {
      await incrementChallengeAttempts(captchaId);
    }

    if (outcome.auditAction) {
      await recordAuditEvent(req, {
        action: outcome.auditAction,
        category: "SECURITY",
        status: outcome.burnChallenge ? "BLOCKED" : "FAILURE",
        severity: outcome.auditSeverity || "WARNING",
        targetIdentifier: String(b.identifier || b.email || b.Cus_Email || ""),
        details: outcome.auditDetails || outcome.message,
        metadata: { challengeId: captchaId, reason: outcome.reason },
      });
    }

    return {
      ok: false,
      status: outcome.status,
      reason: outcome.reason,
      message: outcome.message,
    };
  }

  await markChallengeConsumed(captchaId);
  return { ok: true };
}

function issueUserSessionTokens(user: DbUserRow, mfaVerified: boolean) {
  const role = (user.role as "admin" | "staff" | "customer") || "customer";
  const accessToken = issueSignedToken(
    {
      sub: user.id,
      uid: user.uid,
      email: user.email,
      role,
      tokenType: "access",
      mfaVerified,
    },
    3600 * 4
  );
  const refreshToken = issueSignedToken(
    {
      sub: user.id,
      uid: user.uid,
      email: user.email,
      role,
      tokenType: "refresh",
      mfaVerified,
    },
    3600 * 24 * 7
  );
  return { accessToken, refreshToken };
}

async function persistUserSession(
  req: Request,
  userId: number,
  refreshToken: string,
  mfaVerified: boolean
) {
  await createUserSession({
    sessionKey: `sess-${randomBytes(12).toString("hex")}`,
    userId,
    tokenHash: sha256Hex(refreshToken),
    mfaVerified,
    ipAddress: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 240),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
  }).catch(() => null);
}

// Generate hardened anti-OCR SVG CAPTCHA + SHA-256 Proof-of-Work challenge
app.get("/api/auth/captcha", authRateLimiter, async (_req: Request, res: Response) => {
  try {
    const { code, svgMarkup, powSalt, powDifficulty, minDwellMs } = generateCaptchaChallenge();
    const challengeId = randomBytes(16).toString("hex");
    await createSecurityChallenge({
      challengeId,
      purpose: "CAPTCHA",
      identifier: JSON.stringify({ powSalt, powDifficulty, minDwellMs }),
      answerHash: sha256Hex(`${challengeId}:${normalizeCaptchaAnswer(code)}`),
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });
    return res.json({
      challengeId,
      svgMarkup,
      powChallenge: {
        salt: powSalt,
        difficulty: powDifficulty,
      },
      minDwellMs,
      expiresInSeconds: 300,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// Live pre-login account status & role recognition by Email, Username, or User ID
app.post(["/api/auth/check-status", "/auth/check-status"], authRateLimiter, async (req: Request, res: Response) => {
  try {
    const identifier = String(
      req.body?.identifier || req.body?.email || req.body?.username || ""
    ).trim();
    if (!identifier) {
      return res.status(400).json({
        message: "Please enter an email address, username, or user ID to verify account status.",
      });
    }
    const matched = await findUserByIdentifier(identifier);
    const classification = classifyAccountStatus(matched);

    await recordAuditEvent(req, {
      targetUserId: matched?.id ?? null,
      targetIdentifier: identifier,
      action: "ACCOUNT_STATUS_CHECKED",
      category: "AUTH",
      status: matched ? "SUCCESS" : "FAILURE",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: `Identifier status check: ${classification.accountTypeLabel}`,
    });

    return res.json({ classification });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// Check whether first-time admin bootstrap is required (when database has zero admins)
app.get("/api/auth/bootstrap-status", async (_req: Request, res: Response) => {
  try {
    const hasAdmin = await hasAnyAdminUser();
    return res.json({ needsBootstrap: !hasAdmin, hasAdmin });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// One-time initial Verified Admin account creation (strictly disabled once an admin exists)
app.post("/api/auth/bootstrap-admin", strictLoginRateLimiter, async (req: Request, res: Response) => {
  try {
    if (await hasAnyAdminUser()) {
      return res.status(403).json({
        message: "An administrator account already exists. Sign in with your admin credentials.",
      });
    }

    const captchaCheck = await verifyCaptchaInput(req, req.body);
    if (captchaCheck.ok === false) {
      return res.status(captchaCheck.status).json({ message: captchaCheck.message, reason: captchaCheck.reason });
    }

    const name = String(req.body?.name || req.body?.Admin_Name || "").trim();
    const email = String(req.body?.email || req.body?.Admin_Email || "").trim().toLowerCase();
    const username = String(req.body?.username || "").trim().toLowerCase();
    const phone = String(req.body?.phone || req.body?.Admin_Phone || "").trim();
    const password = String(req.body?.password || req.body?.Admin_Password || "");

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid full name and administrator email are required." });
    }
    if (username && !/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3-32 characters (letters, numbers, ., _, -)." });
    }
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }

    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (username && (await findUserByIdentifier(username))) {
      return res.status(409).json({ message: "That username is already taken." });
    }

    const created = await createUserAccount({
      name,
      username: username || null,
      email,
      phone,
      company: "Innovista Fabriconix HQ",
      role: "admin",
      passwordHash: hashPassword(password),
      avatarUrl: "/assets/about/director.jpg",
      isVerified: true,
      emailVerified: true,
      accountStatus: "ACTIVE",
      totpEnabled: false,
    });

    const tokens = issueUserSessionTokens(created, true);
    await persistUserSession(req, created.id, tokens.refreshToken, true);
    const classification = classifyAccountStatus(created);

    await recordAuditEvent(req, {
      actorUserId: created.id,
      actorEmail: created.email,
      actorRole: created.role,
      targetUserId: created.id,
      targetIdentifier: created.email,
      action: "ADMIN_BOOTSTRAP_CREATED",
      category: "AUTH",
      status: "SUCCESS",
      severity: "HIGH",
      accountClassification: classification.statusCode,
      details: "Initial verified administrator account created.",
    });

    return res.status(201).json({
      message: "Initial Verified Admin account created! You may now configure Google Authenticator 2FA in Admin Security.",
      tokens,
      classification,
      user: sanitizeUserRecord(created),
      admin: mapAdminUserToLegacy(created),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

interface AdminSecretKeyDoc {
  encryptedKey: string;
  keyHash: string;
  updatedAt: string;
  updatedByEmail: string;
  rotationCount: number;
}

async function getOrInitAdminSecretKey(): Promise<{
  secretKey: string;
  updatedAt: string;
  updatedByEmail: string;
  rotationCount: number;
  isDefault: boolean;
}> {
  const storedDb = await getAdminSecretConfig();
  const decryptedDb = storedDb?.encryptedKey ? decryptSecret(storedDb.encryptedKey) : null;
  if (storedDb && decryptedDb) {
    return {
      secretKey: decryptedDb,
      updatedAt:
        storedDb.updatedAt instanceof Date
          ? storedDb.updatedAt.toISOString()
          : String(storedDb.updatedAt || new Date().toISOString()),
      updatedByEmail: storedDb.updatedByEmail || "system",
      rotationCount: typeof storedDb.rotationCount === "number" ? storedDb.rotationCount : 0,
      isDefault: decryptedDb === DEFAULT_ADMIN_SECRET_KEY,
    };
  }

  // Migrate legacy CMS doc config into dedicated admin_secret_configs table if present
  const legacyStored = await getCmsDoc<AdminSecretKeyDoc | null>("admin_secret_key_config", null);
  const decryptedLegacy = legacyStored?.encryptedKey
    ? decryptSecret(legacyStored.encryptedKey)
    : null;
  if (legacyStored && decryptedLegacy) {
    const migrated = await upsertAdminSecretConfig({
      encryptedKey: legacyStored.encryptedKey,
      keyHash: legacyStored.keyHash || sha256Hex(decryptedLegacy),
      rotationCount: typeof legacyStored.rotationCount === "number" ? legacyStored.rotationCount : 0,
      updatedByEmail: legacyStored.updatedByEmail || "system",
    });
    return {
      secretKey: decryptedLegacy,
      updatedAt:
        migrated.updatedAt instanceof Date
          ? migrated.updatedAt.toISOString()
          : String(legacyStored.updatedAt || new Date().toISOString()),
      updatedByEmail: migrated.updatedByEmail || "system",
      rotationCount: migrated.rotationCount,
      isDefault: decryptedLegacy === DEFAULT_ADMIN_SECRET_KEY,
    };
  }

  const seeded = await upsertAdminSecretConfig({
    encryptedKey: encryptSecret(DEFAULT_ADMIN_SECRET_KEY),
    keyHash: sha256Hex(DEFAULT_ADMIN_SECRET_KEY),
    rotationCount: 0,
    updatedByEmail: "system",
  });
  return {
    secretKey: DEFAULT_ADMIN_SECRET_KEY,
    updatedAt:
      seeded.updatedAt instanceof Date
        ? seeded.updatedAt.toISOString()
        : new Date().toISOString(),
    updatedByEmail: seeded.updatedByEmail || "system",
    rotationCount: seeded.rotationCount,
    isDefault: true,
  };
}

// Step 1 of 3-step login: Verify ID/Email/Username + Password -> transition to Step 2 (Robot Verification)
async function handleCredentialLogin(req: Request, res: Response, expectedScope?: "admin" | "any") {
  try {
    const identifier = String(
      req.body?.identifier || req.body?.email || req.body?.username || ""
    ).trim();
    const password = String(req.body?.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email / username / user ID and password are required.",
      });
    }

    const matched = await findUserByIdentifier(identifier);
    const classification = classifyAccountStatus(matched);

    if (!matched) {
      await recordAuditEvent(req, {
        targetIdentifier: identifier,
        action: "LOGIN_ACCOUNT_NOT_CREATED",
        category: "AUTH",
        status: "FAILURE",
        severity: "WARNING",
        accountClassification: classification.statusCode,
        details: `Login attempted for non-existent identifier "${identifier}".`,
      });
      return res.status(404).json({
        message: "Account not created. No account exists for this email, username, or user ID.",
        classification,
      });
    }

    const isAdmin = matched.role === "admin" || matched.role === "staff";
    if (expectedScope === "admin" && !isAdmin) {
      await recordAuditEvent(req, {
        actorUserId: matched.id,
        actorEmail: matched.email,
        actorRole: matched.role,
        targetUserId: matched.id,
        targetIdentifier: identifier,
        action: "ADMIN_LOGIN_ROLE_REJECTED",
        category: "AUTH",
        status: "BLOCKED",
        severity: "HIGH",
        accountClassification: classification.statusCode,
        details: "Client account attempted sign-in on Administrator Login portal.",
      });
      return res.status(403).json({
        message: "This is a Client Account. Please sign in through the Client Login portal.",
        classification,
      });
    }

    if (classification.accountStatus === "SUSPENDED") {
      await recordAuditEvent(req, {
        actorUserId: matched.id,
        actorEmail: matched.email,
        actorRole: matched.role,
        targetUserId: matched.id,
        targetIdentifier: identifier,
        action: "LOGIN_BLOCKED_SUSPENDED",
        category: "SECURITY",
        status: "BLOCKED",
        severity: "HIGH",
        accountClassification: classification.statusCode,
        details: "Blocked login for suspended account.",
      });
      return res.status(403).json({
        message: classification.message,
        classification,
      });
    }

    if (classification.isLocked) {
      await recordAuditEvent(req, {
        actorUserId: matched.id,
        actorEmail: matched.email,
        actorRole: matched.role,
        targetUserId: matched.id,
        targetIdentifier: identifier,
        action: "LOGIN_BLOCKED_LOCKED",
        category: "SECURITY",
        status: "BLOCKED",
        severity: "HIGH",
        accountClassification: classification.statusCode,
        details: "Blocked login attempt while temporary brute-force lockout is active.",
      });
      return res.status(423).json({
        message: classification.message,
        classification,
      });
    }

    const passwordOk = verifyPassword(password, matched.passwordHash);
    if (!passwordOk) {
      const nextAttempts = (matched.failedLoginAttempts || 0) + 1;
      const shouldLock = nextAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60_000) : null;
      await updateUserAccount(matched.id, {
        failedLoginAttempts: nextAttempts,
        ...(lockedUntil ? { lockedUntil } : {}),
      });

      await recordAuditEvent(req, {
        actorUserId: matched.id,
        actorEmail: matched.email,
        actorRole: matched.role,
        targetUserId: matched.id,
        targetIdentifier: identifier,
        action: shouldLock ? "ACCOUNT_LOCKED_BRUTE_FORCE" : "LOGIN_FAILED_PASSWORD",
        category: "SECURITY",
        status: "FAILURE",
        severity: shouldLock ? "CRITICAL" : "WARNING",
        accountClassification: classification.statusCode,
        details: shouldLock
          ? "Account locked for 15 minutes after 5 consecutive failed password attempts."
          : `Incorrect password (attempt ${nextAttempts} of 5).`,
      });

      return res.status(401).json({
        message: shouldLock
          ? "Too many failed password attempts. This account is temporarily locked for 15 minutes."
          : `Incorrect password (${Math.max(0, 5 - nextAttempts)} attempts remaining before temporary lock).`,
        classification: classifyAccountStatus({
          ...matched,
          lockedUntil,
        }),
      });
    }

    // Credentials verified -> clear brute-force counter & issue single-use Robot Verification step token
    await updateUserAccount(matched.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const stepToken = issueSignedToken(
      {
        sub: matched.id,
        uid: matched.uid,
        email: matched.email,
        role: (matched.role as "admin" | "staff" | "customer") || "customer",
        tokenType: "step_captcha",
        mfaVerified: false,
      },
      300
    );

    await createSecurityChallenge({
      challengeId: sha256Hex(stepToken).slice(0, 32),
      purpose: "LOGIN_CAPTCHA",
      userId: matched.id,
      identifier: expectedScope || "any",
      answerHash: sha256Hex(stepToken),
      maxAttempts: 10,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });

    await recordAuditEvent(req, {
      actorUserId: matched.id,
      actorEmail: matched.email,
      actorRole: matched.role,
      targetUserId: matched.id,
      targetIdentifier: identifier,
      action: "LOGIN_CREDENTIALS_VERIFIED",
      category: "AUTH",
      status: "PENDING",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: `${classification.accountTypeLabel} credentials verified; advancing to Robot Verification step.`,
    });

    return res.json({
      message: "Credentials verified. Complete robot verification to continue.",
      nextStep: "ROBOT_VERIFICATION",
      stepToken,
      classification,
      user: sanitizeUserRecord(matched),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
}

app.post("/api/auth/login", strictLoginRateLimiter, (req: Request, res: Response) =>
  handleCredentialLogin(req, res, "any")
);

app.post("/auth/login", strictLoginRateLimiter, (req: Request, res: Response) =>
  handleCredentialLogin(req, res, "admin")
);

// Step 2 of 3-step login: Verify Robot CAPTCHA -> branch to Customer Google Authenticator OR Admin Secret Key
async function handleLoginRobotVerification(req: Request, res: Response) {
  try {
    const stepToken = String(req.body?.stepToken || "").trim();
    if (!stepToken) {
      return res.status(400).json({ message: "Login step token is required. Please enter your ID and password again." });
    }

    const parsed = verifySignedToken(stepToken);
    if (!parsed || parsed.tokenType !== "step_captcha") {
      return res.status(401).json({ message: "Verification session expired. Please sign in with your ID and password again." });
    }

    const stepChallengeId = sha256Hex(stepToken).slice(0, 32);
    const stepChallenge = await getSecurityChallenge(stepChallengeId);
    if (
      !stepChallenge ||
      stepChallenge.purpose !== "LOGIN_CAPTCHA" ||
      stepChallenge.consumed ||
      new Date(stepChallenge.expiresAt).getTime() < Date.now()
    ) {
      return res.status(401).json({ message: "Verification session expired or already used. Please sign in again." });
    }
    if (stepChallenge.attempts >= stepChallenge.maxAttempts) {
      return res.status(423).json({ message: "Too many robot verification failures. Please sign in again." });
    }

    const captchaCheck = await verifyCaptchaInput(req, req.body);
    if (captchaCheck.ok === false) {
      await incrementChallengeAttempts(stepChallengeId);
      return res.status(captchaCheck.status).json({
        message: captchaCheck.message,
        reason: captchaCheck.reason,
      });
    }

    const user = await findUserById(parsed.sub);
    if (!user) {
      return res.status(404).json({ message: "Account not found. Please sign in again." });
    }

    const classification = classifyAccountStatus(user);
    if (classification.accountStatus === "SUSPENDED") {
      await markChallengeConsumed(stepChallengeId);
      return res.status(403).json({ message: classification.message, classification });
    }

    await markChallengeConsumed(stepChallengeId);
    const isAdmin = user.role === "admin" || user.role === "staff";

    await recordAuditEvent(req, {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "LOGIN_ROBOT_VERIFIED",
      category: "SECURITY",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: isAdmin
        ? "Robot verification passed; issuing Admin Secret Key step-up challenge."
        : "Robot verification passed; issuing Customer Google Authenticator step-up challenge.",
    });

    if (isAdmin) {
      const mfaToken = issueSignedToken(
        {
          sub: user.id,
          uid: user.uid,
          email: user.email,
          role: (user.role as "admin" | "staff") || "admin",
          tokenType: "mfa",
          mfaVerified: false,
        },
        300
      );

      await createSecurityChallenge({
        challengeId: sha256Hex(mfaToken).slice(0, 32),
        purpose: "ADMIN_SECRET_KEY",
        userId: user.id,
        identifier: user.email,
        answerHash: sha256Hex(mfaToken),
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      });

      await recordAuditEvent(req, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: user.id,
        targetIdentifier: user.email,
        action: "ADMIN_SECRET_KEY_CHALLENGE_ISSUED",
        category: "MFA",
        status: "PENDING",
        severity: "INFO",
        accountClassification: classification.statusCode,
        details: "Waiting for Admin Secret Key verification.",
      });

      return res.json({
        message: "Robot verification passed. Enter the Admin Secret Key to complete sign-in.",
        nextStep: "ADMIN_SECRET_KEY",
        mfaToken,
        classification,
        user: sanitizeUserRecord(user),
      });
    }

    // Customer flow: verify with Google Authenticator (existing enrolled secret or inline QR enrollment)
    const existingSecret =
      user.totpEnabled && user.totpSecretEncrypted
        ? decryptSecret(user.totpSecretEncrypted)
        : null;

    if (existingSecret) {
      const mfaToken = issueSignedToken(
        {
          sub: user.id,
          uid: user.uid,
          email: user.email,
          role: "customer",
          tokenType: "mfa",
          mfaVerified: false,
        },
        300
      );

      await createSecurityChallenge({
        challengeId: sha256Hex(mfaToken).slice(0, 32),
        purpose: "CUSTOMER_TOTP",
        userId: user.id,
        identifier: user.email,
        answerHash: sha256Hex(mfaToken),
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      });

      await recordAuditEvent(req, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: user.id,
        targetIdentifier: user.email,
        action: "CLIENT_TOTP_CHALLENGE_ISSUED",
        category: "MFA",
        status: "PENDING",
        severity: "INFO",
        accountClassification: classification.statusCode,
        details: "Waiting for customer 6-digit Google Authenticator code.",
      });

      return res.json({
        message: "Robot verification passed. Enter the 6-digit code from Google Authenticator.",
        nextStep: "CUSTOMER_TOTP",
        totpEnrolled: true,
        mfaToken,
        classification,
        user: sanitizeUserRecord(user),
      });
    }

    // First-time Google Authenticator enrollment for customer
    const secret = generateTotpSecret();
    const otpauthUri = buildTotpOtpAuthUri({
      secret,
      email: user.email,
      issuer: "Innovista Fabriconix Client",
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 220,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    const mfaToken = issueSignedToken(
      {
        sub: user.id,
        uid: user.uid,
        email: user.email,
        role: "customer",
        tokenType: "mfa",
        mfaVerified: false,
      },
      600
    );

    await createSecurityChallenge({
      challengeId: sha256Hex(mfaToken).slice(0, 32),
      purpose: "CUSTOMER_TOTP_SETUP",
      userId: user.id,
      identifier: encryptSecret(secret),
      answerHash: sha256Hex(mfaToken),
      maxAttempts: 6,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    await recordAuditEvent(req, {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "CLIENT_TOTP_SETUP_ISSUED",
      category: "MFA",
      status: "PENDING",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: "Generated Google Authenticator QR setup secret for customer login verification.",
    });

    return res.json({
      message: "Robot verification passed. Scan the QR code with Google Authenticator and enter the 6-digit code.",
      nextStep: "CUSTOMER_TOTP",
      totpEnrolled: false,
      mfaToken,
      qrDataUrl,
      manualSecret: secret,
      classification,
      user: sanitizeUserRecord(user),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
}

app.post(
  ["/api/auth/login/verify-captcha", "/auth/login/verify-captcha"],
  strictLoginRateLimiter,
  handleLoginRobotVerification
);

// Step 3A: Verify 6-digit Google Authenticator TOTP code (Customers — enrolled or inline first-time setup)
app.post(
  ["/api/auth/verify-totp", "/api/auth/login/verify-customer-totp"],
  strictLoginRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const mfaToken = String(req.body?.mfaToken || "").trim();
      const code = String(req.body?.code || "").trim();
      if (!mfaToken || !code) {
        return res.status(400).json({ message: "Verification token and 6-digit Google Authenticator code are required." });
      }

      const parsed = verifySignedToken(mfaToken);
      if (!parsed || parsed.tokenType !== "mfa") {
        return res.status(401).json({ message: "Authenticator session expired or invalid. Please sign in again." });
      }

      const challengeId = sha256Hex(mfaToken).slice(0, 32);
      const challenge = await getSecurityChallenge(challengeId);
      if (
        !challenge ||
        challenge.consumed ||
        new Date(challenge.expiresAt).getTime() < Date.now() ||
        !["CUSTOMER_TOTP", "CUSTOMER_TOTP_SETUP", "ADMIN_MFA"].includes(challenge.purpose)
      ) {
        return res.status(401).json({ message: "Authenticator challenge expired or already used. Please sign in again." });
      }
      if (challenge.attempts >= challenge.maxAttempts) {
        return res.status(423).json({ message: "Too many failed authenticator codes. Please sign in again." });
      }

      const user = await findUserById(parsed.sub);
      if (!user) {
        return res.status(404).json({ message: "Account not found." });
      }

      const classification = classifyAccountStatus(user);
      if (classification.accountStatus === "SUSPENDED") {
        return res.status(403).json({ message: classification.message, classification });
      }

      const isSetupFlow = challenge.purpose === "CUSTOMER_TOTP_SETUP";
      const secret = isSetupFlow
        ? decryptSecret(challenge.identifier)
        : decryptSecret(user.totpSecretEncrypted);

      if (!secret || !verifyTotpCode(secret, code)) {
        await incrementChallengeAttempts(challengeId);
        await recordAuditEvent(req, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          targetUserId: user.id,
          targetIdentifier: user.email,
          action: "MFA_TOTP_FAILED",
          category: "MFA",
          status: "FAILURE",
          severity: "HIGH",
          accountClassification: classification.statusCode,
          details: "Invalid 6-digit Google Authenticator code submitted during login.",
        });
        return res.status(401).json({
          message: "Invalid 6-digit Google Authenticator code. Please check your app clock and try again.",
        });
      }

      await markChallengeConsumed(challengeId);
      const updatedUser = await updateUserAccount(user.id, {
        ...(isSetupFlow
          ? {
              totpSecretEncrypted: encryptSecret(secret),
              totpEnabled: true,
            }
          : {}),
        lastLoginAt: new Date(),
        lastLoginIp: getClientIp(req),
      });
      const finalUser = updatedUser || user;
      const finalClassification = classifyAccountStatus(finalUser);
      const tokens = issueUserSessionTokens(finalUser, true);
      await persistUserSession(req, finalUser.id, tokens.refreshToken, true);
      const isAdmin = finalUser.role === "admin" || finalUser.role === "staff";

      await recordAuditEvent(req, {
        actorUserId: finalUser.id,
        actorEmail: finalUser.email,
        actorRole: finalUser.role,
        targetUserId: finalUser.id,
        targetIdentifier: finalUser.email,
        action: isAdmin
          ? "ADMIN_LOGIN_MFA_VERIFIED"
          : isSetupFlow
          ? "CLIENT_TOTP_ENROLLED_AND_VERIFIED"
          : "CLIENT_LOGIN_MFA_VERIFIED",
        category: "MFA",
        status: "SUCCESS",
        severity: "INFO",
        accountClassification: finalClassification.statusCode,
        details: isAdmin
          ? "Admin authenticated with Google Authenticator TOTP."
          : isSetupFlow
          ? "Customer enrolled Google Authenticator 2FA and completed login."
          : "Customer authenticated with ID, password, robot check, and Google Authenticator 2FA.",
      });

      return res.json({
        message: isSetupFlow
          ? "Google Authenticator activated and verified. Welcome!"
          : "Google Authenticator verified. Signed in successfully.",
        tokens,
        classification: finalClassification,
        user: sanitizeUserRecord(finalUser),
        ...(isAdmin
          ? { admin: mapAdminUserToLegacy(finalUser) }
          : { customer: mapCustomerUserToLegacy(finalUser) }),
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

// Step 3B: Verify Admin Secret Key (Admins & Staff)
app.post(
  ["/api/auth/login/verify-admin-secret", "/auth/login/verify-admin-secret"],
  strictLoginRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const mfaToken = String(req.body?.mfaToken || "").trim();
      const secretKey = String(req.body?.secretKey || "").trim();
      if (!mfaToken || !secretKey) {
        return res.status(400).json({ message: "Verification token and Admin Secret Key are required." });
      }

      const parsed = verifySignedToken(mfaToken);
      if (!parsed || parsed.tokenType !== "mfa") {
        return res.status(401).json({ message: "Admin verification session expired. Please sign in again." });
      }

      const challengeId = sha256Hex(mfaToken).slice(0, 32);
      const challenge = await getSecurityChallenge(challengeId);
      if (
        !challenge ||
        challenge.purpose !== "ADMIN_SECRET_KEY" ||
        challenge.consumed ||
        new Date(challenge.expiresAt).getTime() < Date.now()
      ) {
        return res.status(401).json({ message: "Admin Secret Key challenge expired or already used. Please sign in again." });
      }
      if (challenge.attempts >= challenge.maxAttempts) {
        return res.status(423).json({ message: "Too many failed secret key attempts. Please sign in again." });
      }

      const user = await findUserById(parsed.sub);
      if (!user || (user.role !== "admin" && user.role !== "staff")) {
        return res.status(403).json({ message: "Administrator privileges required for Admin Secret Key verification." });
      }

      const classification = classifyAccountStatus(user);
      if (classification.accountStatus === "SUSPENDED") {
        return res.status(403).json({ message: classification.message, classification });
      }

      const activeConfig = await getOrInitAdminSecretKey();
      const keyMatch = verifyAdminSecretKeyInput(secretKey, activeConfig.secretKey);
      if (!keyMatch) {
        const updatedChallenge = await incrementChallengeAttempts(challengeId);
        const remaining = Math.max(
          0,
          challenge.maxAttempts - (updatedChallenge?.attempts ?? challenge.attempts + 1)
        );
        await recordAuditEvent(req, {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          targetUserId: user.id,
          targetIdentifier: user.email,
          action: "ADMIN_SECRET_KEY_FAILED",
          category: "MFA",
          status: "FAILURE",
          severity: "HIGH",
          accountClassification: classification.statusCode,
          details: `Invalid Admin Secret Key entered during login (${remaining} attempts remaining).`,
        });
        return res.status(401).json({
          message:
            remaining > 0
              ? `Invalid Admin Secret Key (${remaining} attempts remaining).`
              : "Invalid Admin Secret Key. Maximum attempts exceeded — please start login again.",
        });
      }

      await markChallengeConsumed(challengeId);
      const updatedUser = await updateUserAccount(user.id, {
        lastLoginAt: new Date(),
        lastLoginIp: getClientIp(req),
      });
      const finalUser = updatedUser || user;
      const finalClassification = classifyAccountStatus(finalUser);
      const tokens = issueUserSessionTokens(finalUser, true);
      await persistUserSession(req, finalUser.id, tokens.refreshToken, true);

      await recordAuditEvent(req, {
        actorUserId: finalUser.id,
        actorEmail: finalUser.email,
        actorRole: finalUser.role,
        targetUserId: finalUser.id,
        targetIdentifier: finalUser.email,
        action: "ADMIN_LOGIN_SECRET_VERIFIED",
        category: "MFA",
        status: "SUCCESS",
        severity: "INFO",
        accountClassification: finalClassification.statusCode,
        details: "Admin authenticated with ID, password, robot check, and Admin Secret Key.",
      });

      return res.json({
        message: "Admin Secret Key verified. Administrator session active.",
        tokens,
        classification: finalClassification,
        user: sanitizeUserRecord(finalUser),
        admin: mapAdminUserToLegacy(finalUser),
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

async function handleRefreshToken(req: Request, res: Response) {
  const bearer = (req.headers.authorization || "").startsWith("Bearer ")
    ? (req.headers.authorization || "").slice(7).trim()
    : "";
  const refreshToken = String(req.body?.refreshToken || req.query?.refreshToken || bearer || "").trim();
  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token." });
  }
  const payload = verifySignedToken(refreshToken);
  if (!payload || payload.tokenType !== "refresh") {
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }
  const tokenHash = sha256Hex(refreshToken);
  const existingSession = await getUserSessionByTokenHash(tokenHash);
  if (existingSession) {
    if (
      existingSession.revokedAt ||
      new Date(existingSession.expiresAt).getTime() < Date.now()
    ) {
      return res.status(401).json({ message: "Refresh session has been revoked or expired." });
    }
    await touchUserSession(existingSession.sessionKey).catch(() => null);
  }
  const user = await findUserById(payload.sub);
  if (!user || (user.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED" || !user.isActive) {
    return res.status(403).json({ message: "Account is suspended or no longer active." });
  }
  const mfaVerified = Boolean(payload.mfaVerified);
  const tokens = issueUserSessionTokens(user, mfaVerified);
  if (existingSession) {
    await revokeUserSessionByTokenHash(tokenHash).catch(() => false);
  }
  await persistUserSession(req, user.id, tokens.refreshToken, mfaVerified);
  return res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

app.get(["/auth/refresh", "/api/auth/refresh"], handleRefreshToken);
app.post(["/auth/refresh", "/api/auth/refresh"], handleRefreshToken);

app.post("/api/auth/firebase-session", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const dbUser = await getOrCreateUser(req.user.uid, req.user.email, {
    name: req.user.name,
    role: req.user.role,
  });
  return res.json({
    user: sanitizeUserRecord(dbUser),
    classification: classifyAccountStatus(dbUser),
  });
});

// Send or resend email verification code (for newly signed-up customers or unverified admins)
app.post("/api/auth/send-verification-email", authRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const identifier = String(
      req.body?.identifier || req.body?.email || req.user?.email || ""
    ).trim();
    const user = req.user?.userId
      ? await findUserById(req.user.userId)
      : identifier
      ? await findUserByIdentifier(identifier)
      : null;

    if (!user) {
      return res.status(404).json({ message: "No account found to send verification code to." });
    }
    if (user.emailVerified) {
      return res.json({
        message: "Email address is already verified.",
        emailVerified: true,
        classification: classifyAccountStatus(user),
      });
    }

    const origin = resolveRequestOrigin({
      appUrl: process.env.APP_URL,
      protocol: (req.headers["x-forwarded-proto"] as string) || req.protocol,
      host: (req.headers["x-forwarded-host"] as string) || req.get("host"),
    });
    const issued = await issueEmailVerificationChallenge(user, origin);

    await recordAuditEvent(req, {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "EMAIL_VERIFICATION_SENT",
      category: "EMAIL_VERIFICATION",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classifyAccountStatus(user).statusCode,
      details: issued.emailDispatched
        ? "Verification email dispatched via configured mail provider."
        : "Email verification challenge issued in database.",
    });

    return res.json({
      message: issued.emailDispatched
        ? `Verification code and link sent to ${user.email}.`
        : `Verification code generated for ${user.email}.`,
      ...issued,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// Verify email via 6-digit code OR verification link token
app.post(["/api/auth/verify-email", "/customer/verify-email"], authRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.body?.code || "").trim();
    const token = String(req.body?.token || "").trim();
    const identifier = String(
      req.body?.identifier || req.body?.email || req.user?.email || ""
    ).trim();

    if (!code && !token) {
      return res.status(400).json({ message: "Verification code or verification token is required." });
    }

    let user = req.user?.userId
      ? await findUserById(req.user.userId)
      : identifier
      ? await findUserByIdentifier(identifier)
      : null;

    if (!user && token) {
      user = await findUserByVerificationTokenHash(sha256Hex(token));
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found for verification." });
    }

    if (user.emailVerified) {
      return res.json({
        message: "Email is already verified.",
        classification: classifyAccountStatus(user),
        user: sanitizeUserRecord(user),
        customer: user.role === "customer" ? mapCustomerUserToLegacy(user) : undefined,
      });
    }

    const expMs = user.emailVerificationExpiresAt
      ? new Date(user.emailVerificationExpiresAt).getTime()
      : 0;
    if (!expMs || expMs < Date.now()) {
      return res.status(400).json({
        message: "Verification code or link has expired. Please request a new verification email.",
      });
    }

    const validByCode =
      Boolean(code) &&
      Boolean(user.emailVerificationCodeHash) &&
      sha256Hex(`${user.id}:${code}`) === user.emailVerificationCodeHash;
    const validByToken =
      Boolean(token) &&
      Boolean(user.emailVerificationTokenHash) &&
      sha256Hex(token) === user.emailVerificationTokenHash;

    if (!validByCode && !validByToken) {
      await recordAuditEvent(req, {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: user.id,
        targetIdentifier: user.email,
        action: "EMAIL_VERIFICATION_FAILED",
        category: "EMAIL_VERIFICATION",
        status: "FAILURE",
        severity: "WARNING",
        accountClassification: classifyAccountStatus(user).statusCode,
        details: "Invalid email verification code or token submitted.",
      });
      return res.status(400).json({ message: "Invalid email verification code or token." });
    }

    const updated = await updateUserAccount(user.id, {
      emailVerified: true,
      emailVerificationCodeHash: null,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });
    const finalUser = updated || user;
    const classification = classifyAccountStatus(finalUser);

    await recordAuditEvent(req, {
      actorUserId: finalUser.id,
      actorEmail: finalUser.email,
      actorRole: finalUser.role,
      targetUserId: finalUser.id,
      targetIdentifier: finalUser.email,
      action: "EMAIL_VERIFIED",
      category: "EMAIL_VERIFICATION",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: `Email verified for ${finalUser.email}.`,
    });

    return res.json({
      message: "Email verified successfully!",
      classification,
      user: sanitizeUserRecord(finalUser),
      customer: finalUser.role === "customer" ? mapCustomerUserToLegacy(finalUser) : undefined,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ADMIN-ONLY GOOGLE AUTHENTICATOR (TOTP 2FA) MANAGEMENT
// ============================================================================
app.get("/api/admin/totp/status", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const user = req.user?.userId ? await findUserById(req.user.userId) : null;
  if (!user) return res.status(404).json({ message: "Admin user not found." });
  return res.json({
    totpEnabled: Boolean(user.totpEnabled),
    hasPendingSetup: Boolean(user.totpSecretEncrypted && !user.totpEnabled),
    email: user.email,
    role: user.role,
  });
});

app.post("/api/admin/totp/setup", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ message: "Admin session required." });
    const user = await findUserById(req.user.userId);
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return res.status(403).json({
        message: "Google Authenticator 2FA is restricted exclusively to Administrator accounts.",
      });
    }

    const secret = generateTotpSecret();
    const otpauthUri = buildTotpOtpAuthUri({
      secret,
      email: user.email,
      issuer: "Innovista Fabriconix Admin",
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 240,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    await updateUserAccount(user.id, {
      totpSecretEncrypted: encryptSecret(secret),
      totpEnabled: false,
    });

    await recordAuditEvent(req, {
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "MFA_TOTP_SETUP_INITIATED",
      category: "MFA",
      status: "PENDING",
      severity: "INFO",
      accountClassification: classifyAccountStatus(user).statusCode,
      details: "Admin generated Google Authenticator QR setup secret.",
    });

    return res.json({
      message: "Scan the QR code in Google Authenticator, then enter the 6-digit code to activate 2FA.",
      qrDataUrl,
      manualSecret: secret,
      otpauthUri,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/admin/totp/enable", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ message: "Admin session required." });
    const user = await findUserById(req.user.userId);
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return res.status(403).json({ message: "Google Authenticator is restricted to Administrators." });
    }
    const secret = decryptSecret(user.totpSecretEncrypted);
    if (!secret) {
      return res.status(400).json({ message: "No pending Google Authenticator secret. Start setup first." });
    }
    const code = String(req.body?.code || "").trim();
    if (!verifyTotpCode(secret, code)) {
      await recordAuditEvent(req, {
        targetUserId: user.id,
        targetIdentifier: user.email,
        action: "MFA_TOTP_ENABLE_FAILED",
        category: "MFA",
        status: "FAILURE",
        severity: "WARNING",
        details: "Invalid TOTP verification code during 2FA enrollment.",
      });
      return res.status(400).json({ message: "Invalid 6-digit verification code. Please check Google Authenticator." });
    }

    const updated = await updateUserAccount(user.id, { totpEnabled: true });
    const tokens = updated ? issueUserSessionTokens(updated, true) : undefined;
    if (updated && tokens) {
      await persistUserSession(req, updated.id, tokens.refreshToken, true);
    }

    await recordAuditEvent(req, {
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "MFA_TOTP_ENABLED",
      category: "MFA",
      status: "SUCCESS",
      severity: "HIGH",
      accountClassification: classifyAccountStatus(updated || user).statusCode,
      details: "Google Authenticator 2FA enabled for admin account.",
    });

    return res.json({
      message: "Google Authenticator 2FA is now active on your administrator account.",
      totpEnabled: true,
      tokens,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/admin/totp/disable", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ message: "Admin session required." });
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: "Admin not found." });

    const password = String(req.body?.password || "");
    const code = String(req.body?.code || "").trim();
    const secret = decryptSecret(user.totpSecretEncrypted);

    const verifiedByCode = Boolean(secret && code && verifyTotpCode(secret, code));
    const verifiedByPassword = Boolean(password && verifyPassword(password, user.passwordHash));
    if (!verifiedByCode && !verifiedByPassword) {
      return res.status(401).json({
        message: "Provide your current password or a valid 6-digit Google Authenticator code to disable 2FA.",
      });
    }

    await updateUserAccount(user.id, {
      totpEnabled: false,
      totpSecretEncrypted: null,
    });

    await recordAuditEvent(req, {
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "MFA_TOTP_DISABLED",
      category: "MFA",
      status: "SUCCESS",
      severity: "HIGH",
      details: "Google Authenticator 2FA disabled on admin account.",
    });

    return res.json({ message: "Google Authenticator 2FA disabled.", totpEnabled: false });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ADMIN SECRET KEY MANAGEMENT (Default: A9HF-4K28@, Recreated in Admin Portal)
// ============================================================================
app.get("/api/admin/secret-key", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  try {
    const active = await getOrInitAdminSecretKey();
    return res.json({
      secretKey: active.secretKey,
      maskedKey: maskAdminSecretKey(active.secretKey),
      updatedAt: active.updatedAt,
      updatedByEmail: active.updatedByEmail,
      rotationCount: active.rotationCount,
      isDefault: active.isDefault,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/admin/secret-key/recreate", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const current = await getOrInitAdminSecretKey();
    const rawCustom = typeof req.body?.customKey === "string" ? req.body.customKey.trim() : "";

    let nextSecretKey = "";
    if (rawCustom) {
      const check = validateAdminSecretKeyFormat(rawCustom);
      if (!check.valid) {
        return res.status(400).json({ message: check.error });
      }
      nextSecretKey = check.normalized;
    } else {
      nextSecretKey = generateAdminSecretKey();
      if (nextSecretKey === current.secretKey) {
        nextSecretKey = generateAdminSecretKey();
      }
    }

    const encryptedKey = encryptSecret(nextSecretKey);
    const keyHash = sha256Hex(nextSecretKey);
    const nextRotationCount = current.rotationCount + 1;
    const updatedByEmail = req.user?.email || "admin";

    const savedConfig = await upsertAdminSecretConfig({
      encryptedKey,
      keyHash,
      rotationCount: nextRotationCount,
      updatedByUserId: req.user?.userId ?? null,
      updatedByEmail,
    });

    const updatedAtIso =
      savedConfig.updatedAt instanceof Date
        ? savedConfig.updatedAt.toISOString()
        : new Date().toISOString();

    await recordAuditEvent(req, {
      targetUserId: req.user?.userId ?? null,
      targetIdentifier: req.user?.email || "admin-secret-key",
      action: "ADMIN_SECRET_KEY_RECREATED",
      category: "SECURITY",
      status: "SUCCESS",
      severity: "HIGH",
      details: rawCustom
        ? "Admin updated custom Administrator Login Secret Key."
        : "Admin recreated a new randomized Administrator Login Secret Key.",
      metadata: { rotationCount: nextRotationCount, mode: rawCustom ? "custom" : "random" },
    });

    return res.json({
      message: rawCustom
        ? "Admin Secret Key updated and stored securely."
        : "New Admin Secret Key recreated and stored securely.",
      secretKey: nextSecretKey,
      maskedKey: maskAdminSecretKey(nextSecretKey),
      updatedAt: updatedAtIso,
      updatedByEmail,
      rotationCount: nextRotationCount,
      isDefault: nextSecretKey === DEFAULT_ADMIN_SECRET_KEY,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ADMIN SECURITY GOVERNANCE & DETAILED CSV AUDIT REPORT ENDPOINTS
// ============================================================================
app.patch("/api/admin/customers/:id/status", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    const target = await findUserById(id);
    if (!target) {
      return res.status(404).json({ message: "Customer account not found." });
    }

    const patch: Parameters<typeof updateUserAccount>[1] = {};
    const actions: string[] = [];

    if (typeof req.body?.isVerified === "boolean") {
      patch.isVerified = req.body.isVerified;
      actions.push(req.body.isVerified ? "ACCOUNT_VERIFIED" : "ACCOUNT_UNVERIFIED");
    }
    const reason = String(req.body?.reason || "").trim();
    if (req.body?.accountStatus === "ACTIVE" || req.body?.accountStatus === "SUSPENDED") {
      patch.accountStatus = req.body.accountStatus;
      patch.isActive = req.body.accountStatus !== "SUSPENDED";
      if (req.body.accountStatus === "SUSPENDED" && reason) {
        patch.suspensionReason = reason;
      } else if (req.body.accountStatus === "ACTIVE") {
        patch.suspensionReason = "";
      }
      actions.push(req.body.accountStatus === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REACTIVATED");
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No status update fields provided." });
    }

    const updated = await updateUserAccount(id, patch);
    if (patch.accountStatus === "SUSPENDED") {
      await revokeAllUserSessionsForUser(id).catch(() => 0);
    }
    const finalUser = updated || target;
    const classification = classifyAccountStatus(finalUser);

    await recordAuditEvent(req, {
      targetUserId: finalUser.id,
      targetIdentifier: finalUser.email,
      action: actions.join("+"),
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: patch.accountStatus === "SUSPENDED" ? "HIGH" : "INFO",
      accountClassification: classification.statusCode,
      details: reason
        ? `Admin updated ${finalUser.email}: ${actions.join(", ")} (${reason})`
        : `Admin updated ${finalUser.email}: ${actions.join(", ")}`,
    });

    return res.json({
      message:
        patch.accountStatus === "SUSPENDED"
          ? `Account ${finalUser.email} has been suspended.`
          : patch.accountStatus === "ACTIVE"
          ? `Account ${finalUser.email} reactivated.`
          : patch.isVerified
          ? `Account ${finalUser.email} verified by admin.`
          : `Verification revoked for ${finalUser.email}.`,
      customer: mapCustomerUserToLegacy(finalUser),
      classification,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/admin/audit-logs", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await listAuditLogs({
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 500,
    });

    const summary = {
      totalEvents: logs.length,
      criticalOrHigh: logs.filter((l) => l.severity === "CRITICAL" || l.severity === "HIGH").length,
      failedAuth: logs.filter((l) => l.status === "FAILURE" || l.status === "BLOCKED").length,
      csvExports: logs.filter((l) => l.action === "AUDIT_CSV_EXPORTED").length,
    };

    return res.json({ data: logs, total: logs.length, summary });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/admin/audit-logs/export.csv", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      limit: 5000,
    };

    await recordAuditEvent(req, {
      action: "AUDIT_CSV_EXPORTED",
      category: "REPORTING",
      status: "SUCCESS",
      severity: "INFO",
      details: "Admin exported detailed security & web audit report as CSV.",
      metadata: filters,
    });

    const logs = await listAuditLogs(filters);
    const csvContent = buildAuditLogsCsv(logs);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="innovista-web-audit-report-${stamp}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ADMIN & USER MANAGEMENT ROUTES (Protected)
// ============================================================================
app.get("/api/users", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const roleParam = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const rows = await listUsersByRoles(roleParam ? roleParam.split(",") : undefined);
    return res.json({ data: rows.map(sanitizeUserRecord) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/api/users", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, email, phone, company, role, avatarUrl, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and strong password are required." });
    }
    const pwCheck = validatePasswordStrength(String(password));
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }
    const existing = await findUserByEmail(String(email));
    if (existing) {
      return res.status(409).json({ message: "A user with that email already exists." });
    }
    if (username && (await findUserByIdentifier(String(username)))) {
      return res.status(409).json({ message: "That username is already in use." });
    }
    const assignedRole = role === "admin" || role === "staff" ? role : "customer";
    const created = await createUserAccount({
      name: String(name),
      username: username ? String(username).trim().toLowerCase() : null,
      email: String(email),
      phone: String(phone || ""),
      company: String(company || ""),
      role: assignedRole,
      avatarUrl: String(avatarUrl || ""),
      passwordHash: hashPassword(String(password)),
      isVerified: assignedRole === "admin" || assignedRole === "staff",
      emailVerified: false,
      accountStatus: "ACTIVE",
    });
    return res.status(201).json({ message: "User created", data: sanitizeUserRecord(created) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/api/users/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    const { name, phone, company, avatarUrl, isVerified, emailVerified, accountStatus, username } = req.body || {};
    const updated = await updateUserAccount(id, {
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(username !== undefined ? { username: username ? String(username) : null } : {}),
      ...(phone !== undefined ? { phone: String(phone) } : {}),
      ...(company !== undefined ? { company: String(company) } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: String(avatarUrl) } : {}),
      ...(typeof isVerified === "boolean" ? { isVerified } : {}),
      ...(typeof emailVerified === "boolean" ? { emailVerified } : {}),
      ...(accountStatus === "ACTIVE" || accountStatus === "SUSPENDED" ? { accountStatus } : {}),
    });
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User updated", data: sanitizeUserRecord(updated) });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/api/users/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    if (req.user?.userId === id) {
      return res.status(400).json({ message: "You cannot delete your own active administrator account." });
    }
    const deleted = await deleteUserAccount(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    await recordAuditEvent(req, {
      targetUserId: id,
      action: "USER_DELETED",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "HIGH",
      details: `Admin deleted user ID ${id}.`,
    });
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/register", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { Admin_Name, Admin_Email, Admin_Phone, Admin_Password, Admin_Profile, Admin_Username } =
      req.body || {};
    const email = String(Admin_Email || "").trim().toLowerCase();
    if (!Admin_Name || !email || !Admin_Password) {
      return res.status(400).json({ message: "Admin name, email, and strong password are required." });
    }
    const pwCheck = validatePasswordStrength(String(Admin_Password));
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (Admin_Username && (await findUserByIdentifier(String(Admin_Username)))) {
      return res.status(409).json({ message: "An account with this username already exists." });
    }
    const created = await createUserAccount({
      name: String(Admin_Name).trim(),
      username: Admin_Username ? String(Admin_Username).trim().toLowerCase() : null,
      email,
      phone: String(Admin_Phone || ""),
      company: "Innovista Fabriconix Executive",
      role: "admin",
      passwordHash: hashPassword(String(Admin_Password)),
      avatarUrl: String(Admin_Profile || "/assets/about/director.jpg"),
      isVerified: true,
      emailVerified: false,
      accountStatus: "ACTIVE",
      totpEnabled: false,
    });

    await recordAuditEvent(req, {
      targetUserId: created.id,
      targetIdentifier: created.email,
      action: "ADMIN_ACCOUNT_CREATED",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "HIGH",
      details: `Administrator created admin account ${created.email}.`,
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      admin: mapAdminUserToLegacy(created),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/auth/getAllAdmins", requireAdminOrStaff, async (_req: Request, res: Response) => {
  try {
    const list = await getAdminAndStaffUsers();
    return res.json({
      data: list.map(mapAdminUserToLegacy),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/auth/RemoveAdmin", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = Number(
      req.query.AdminId ||
        req.query.adminId ||
        req.body?.AdminId ||
        req.body?.adminId
    );
    if (req.user?.userId === adminId) {
      return res.status(400).json({ message: "You cannot delete your own active administrator account." });
    }
    await deleteUserAccount(adminId);
    await recordAuditEvent(req, {
      targetUserId: adminId,
      action: "ADMIN_REMOVED",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "HIGH",
      details: `Admin removed admin ID ${adminId}.`,
    });
    return res.json({ message: "Admin removed" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/ResetPassword", authRateLimiter, async (req: Request, res: Response) => {
  const email = String(req.body?.email || req.query?.email || "").trim().toLowerCase();
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || req.body?.password || "");

  if (token && newPassword) {
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }
    const challenge = await getSecurityChallenge(sha256Hex(token).slice(0, 32));
    if (!challenge || challenge.purpose !== "PASSWORD_RESET" || challenge.consumed || new Date(challenge.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Password reset token is invalid or expired." });
    }
    const targetUser = challenge.userId ? await findUserById(challenge.userId) : null;
    if (!targetUser) return res.status(404).json({ message: "User not found." });
    await updateUserAccount(targetUser.id, { passwordHash: hashPassword(newPassword), failedLoginAttempts: 0, lockedUntil: null });
    await revokeAllUserSessionsForUser(targetUser.id).catch(() => 0);
    await markChallengeConsumed(challenge.challengeId);
    await recordAuditEvent(req, {
      targetUserId: targetUser.id,
      targetIdentifier: targetUser.email,
      action: "PASSWORD_RESET_COMPLETED",
      category: "AUTH",
      status: "SUCCESS",
      severity: "HIGH",
      details: `Password updated via reset flow for ${targetUser.email}.`,
    });
    return res.json({ message: "Password updated successfully. You may now sign in." });
  }

  if (!email) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }
  const user = await findUserByEmail(email);
  if (user) {
    const resetToken = randomBytes(24).toString("hex");
    await createSecurityChallenge({
      challengeId: sha256Hex(resetToken).slice(0, 32),
      purpose: "PASSWORD_RESET",
      userId: user.id,
      identifier: user.email,
      answerHash: sha256Hex(resetToken),
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    await recordAuditEvent(req, {
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "PASSWORD_RESET_REQUESTED",
      category: "AUTH",
      status: "SUCCESS",
      severity: "INFO",
      details: `Password recovery requested for ${user.email}.`,
    });
  }
  return res.json({
    message: "If an account exists for that email, password recovery instructions have been issued.",
  });
});

app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) return res.status(401).json({ message: "Authentication required." });
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.passwordHash && !verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }
    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }
    await updateUserAccount(user.id, { passwordHash: hashPassword(newPassword) });
    await revokeAllUserSessionsForUser(user.id).catch(() => 0);
    await recordAuditEvent(req, {
      targetUserId: user.id,
      targetIdentifier: user.email,
      action: "PASSWORD_CHANGED",
      category: "AUTH",
      status: "SUCCESS",
      severity: "HIGH",
      details: `${user.email} updated account password.`,
    });
    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Please provide an email address." });
  }
  const user = await findUserByEmail(email);
  await recordAuditEvent(req, {
    targetUserId: user?.id ?? null,
    targetIdentifier: email,
    action: "FORGOT_PASSWORD_REQUESTED",
    category: "AUTH",
    status: "SUCCESS",
    severity: "INFO",
    details: `Forgot password inquiry for ${email}.`,
  });
  return res.json({
    message: `If an account is registered under ${email}, recovery instructions have been generated.`,
  });
});

app.get("/admin/summary", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  try {
    const [admins, allDesigns, allCustomers, allOrders, allProjects, allFeedbacks, allNotifs, auditRows] =
      await Promise.all([
        getAdminAndStaffUsers(),
        listProducts(),
        getCustomerUsers(),
        listOrders(),
        listProjects(),
        listFeedbacks(),
        listNotifications(),
        listAuditLogs({ limit: 500 }),
      ]);

    const pendingOrders = allOrders.filter((o) => o.Order_Status === "PENDING").length;
    const completedOrders = allOrders.filter((o) => o.Order_Status === "COMPLETED").length;
    const verifiedCustomers = allCustomers.filter((c) => c.isVerified).length;
    const suspendedCustomers = allCustomers.filter(
      (c) => (c.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED" || !c.isActive
    ).length;
    const unreadNotifications = allNotifs.filter((n) => !n.isRead).length;
    const totalProjectBudget = allProjects.reduce((acc, p) => acc + Number(p.Budget || 0), 0);

    return res.json({
      admins: admins.length,
      designs: allDesigns.length,
      customers: allCustomers.length,
      verifiedCustomers,
      suspendedCustomers,
      orders: allOrders.length,
      pendingOrders,
      completedOrders,
      projects: allProjects.length,
      totalProjectBudget,
      feedbacks: allFeedbacks.length,
      unreadNotifications,
      auditEvents: auditRows.length,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/auth/logout", optionalAuth, async (req: AuthRequest, res: Response) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (refreshToken) {
    await revokeUserSessionByTokenHash(sha256Hex(refreshToken)).catch(() => false);
  } else if (req.user?.userId && req.body?.allSessions !== false) {
    await revokeAllUserSessionsForUser(req.user.userId).catch(() => 0);
  }
  if (req.user) {
    await recordAuditEvent(req, {
      action: "USER_LOGOUT",
      category: "AUTH",
      status: "SUCCESS",
      severity: "INFO",
      details: `${req.user.email} signed out.`,
    });
  }
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

app.post("/projects/createProject", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    const title = String(body.Project_Title || "").trim();
    const clientName = String(body.Client_Name || "").trim();
    if (!title || !clientName) {
      return res
        .status(400)
        .json({ message: "Project title and client name are required." });
    }

    const imageCheck = validateProjectImageInput(body.Project_Images);
    if (!imageCheck.valid) {
      return res.status(400).json({ message: imageCheck.error });
    }

    const created = await createProjectRecord({
      ...body,
      Project_Title: title,
      Client_Name: clientName,
      Project_Images: imageCheck.sanitized,
    });
    return res.status(201).json({ message: "Project created", project: created });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/projects/deleteProject", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.query.ProjectID || req.body?.ProjectID);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Valid ProjectID is required." });
    }
    const deleted = await deleteProjectRecord(id);
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    return res.json({ message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/projects/updateProject", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.ProjectID || req.query.ProjectID);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Valid ProjectID is required." });
    }

    const body = { ...(req.body || {}) };
    if (body.Project_Images !== undefined) {
      const imageCheck = validateProjectImageInput(body.Project_Images);
      if (!imageCheck.valid) {
        return res.status(400).json({ message: imageCheck.error });
      }
      body.Project_Images = imageCheck.sanitized;
    }

    const updated = await updateProjectRecord(id, body);
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

app.post("/api/products", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const created = await createProductRecord(req.body || {});
    return res.status(201).json({ message: "Product created", data: created });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/api/products/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateProductRecord(String(req.params.id || ""), req.body || {});
    if (!updated) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/api/products/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/designs/create", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/designs/deleteDesign", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/designs/updateDesign", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const designId = req.body?.DesignID || req.query.DesignID || req.body?.id;
    const updated = await updateProductRecord(String(designId || ""), req.body || {});
    if (!updated) return res.status(404).json({ message: "Design not found" });
    return res.json({ message: "Design updated", design: updated, data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/designs/:id/related", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/designs/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
app.get("/customer/getAllCustomers", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/customer/Customer_register", strictLoginRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body || {};
    const isAdminCreator = Boolean(req.user && (req.user.role === "admin" || req.user.role === "staff"));

    if (!isAdminCreator) {
      const captchaCheck = await verifyCaptchaInput(req, b);
      if (captchaCheck.ok === false) {
        return res.status(captchaCheck.status).json({ message: captchaCheck.message, reason: captchaCheck.reason });
      }
    }

    const email = String(b.Cus_Email || b.email || "").trim().toLowerCase();
    const username = String(b.Cus_Username || b.username || "").trim().toLowerCase();
    const name = String(b.Cus_Name || b.name || "").trim();
    const password = String(b.Cus_Password || b.password || "");

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid full name and email address are required." });
    }
    if (username && !/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3-32 characters (letters, numbers, ., _, -)." });
    }
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.error });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (username && (await findUserByIdentifier(username))) {
      return res.status(409).json({ message: "That username is already taken." });
    }

    const created = await createUserAccount({
      name,
      username: username || null,
      email,
      phone: String(b.Cus_PhoneNumber || b.phone || "").trim(),
      company: String(b.Cus_CompanyName || b.company || "").trim(),
      avatarUrl: String(b.Cus_Logo || "/assets/logos/client-zenith.svg"),
      passwordHash: hashPassword(password),
      role: "customer",
      // Newly signed-up customers can sign in and browse right away as Unverified Clients;
      // admins can verify or suspend the account from Customer Manager.
      isVerified: isAdminCreator && typeof b.Verify_State === "boolean" ? b.Verify_State : false,
      emailVerified: false,
      accountStatus: "ACTIVE",
      purchaseGoods: Array.isArray(b.Purchase_Goods) ? b.Purchase_Goods : [],
    });

    const origin = resolveRequestOrigin({
      appUrl: process.env.APP_URL,
      protocol: (req.headers["x-forwarded-proto"] as string) || req.protocol,
      host: (req.headers["x-forwarded-host"] as string) || req.get("host"),
    });
    const verification = await issueEmailVerificationChallenge(created, origin);
    const refreshedUser = (await findUserById(created.id)) || created;
    const tokens = issueUserSessionTokens(refreshedUser, true);
    await persistUserSession(req, refreshedUser.id, tokens.refreshToken, true);
    const classification = classifyAccountStatus(refreshedUser);
    const mapped = mapCustomerUserToLegacy(refreshedUser);

    await recordAuditEvent(req, {
      actorUserId: isAdminCreator ? req.user?.userId : created.id,
      actorEmail: isAdminCreator ? req.user?.email : created.email,
      actorRole: isAdminCreator ? req.user?.role : "customer",
      targetUserId: created.id,
      targetIdentifier: created.email,
      action: isAdminCreator ? "ADMIN_CREATED_CUSTOMER" : "CUSTOMER_SIGNUP",
      category: "AUTH",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: `Client account created (${classification.accountTypeLabel}).`,
    });

    return res.status(201).json({
      message: "Account created! You can browse the site immediately while verifying your email.",
      tokens,
      classification,
      customer: mapped,
      data: mapped,
      user: sanitizeUserRecord(refreshedUser),
      verification,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/customer/updateCustomer", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.CustomerId);
    const updated = await updateUserAccount(id, {
      name: req.body?.Cus_Name,
      username: req.body?.Cus_Username,
      email: req.body?.Cus_Email,
      phone: req.body?.Cus_PhoneNumber,
      company: req.body?.Cus_CompanyName,
      avatarUrl: req.body?.Cus_Logo,
      isVerified: req.body?.Verify_State,
      accountStatus:
        req.body?.Account_Status === "ACTIVE" || req.body?.Account_Status === "SUSPENDED"
          ? req.body.Account_Status
          : undefined,
      ...(req.body?.Account_Status === "SUSPENDED" && typeof req.body?.reason === "string"
        ? { suspensionReason: req.body.reason.trim() }
        : req.body?.Account_Status === "ACTIVE"
        ? { suspensionReason: "" }
        : {}),
      purchaseGoods: req.body?.Purchase_Goods,
    });
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    if (req.body?.Account_Status === "SUSPENDED") {
      await revokeAllUserSessionsForUser(id).catch(() => 0);
    }
    await recordAuditEvent(req, {
      targetUserId: updated.id,
      targetIdentifier: updated.email,
      action: "ADMIN_UPDATED_CUSTOMER",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classifyAccountStatus(updated).statusCode,
      details: `Updated customer ${updated.email}.`,
    });
    return res.json({
      message: "Customer updated",
      customer: mapCustomerUserToLegacy(updated),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.delete("/customer/deleteCustomer", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(
      req.query.CustomerId ||
        req.query.customerId ||
        req.body?.CustomerId ||
        req.body?.customerId
    );
    await deleteUserAccount(id);
    await recordAuditEvent(req, {
      targetUserId: id,
      action: "CUSTOMER_DELETED",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "HIGH",
      details: `Admin deleted customer ID ${id}.`,
    });
    return res.json({ message: "Customer deleted" });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/customer/login", strictLoginRateLimiter, (req: Request, res: Response) =>
  handleCredentialLogin(req, res, "any")
);

app.get("/customer/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const requestedId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const requestedEmail = ((req.query.email as string) || "").trim().toLowerCase();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";

    let customer = req.user?.userId ? await findUserById(req.user.userId) : null;
    if (isAdmin && (requestedId || requestedEmail)) {
      customer =
        (requestedId ? await findUserById(requestedId) : null) ||
        (requestedEmail ? await findUserByEmail(requestedEmail) : null) ||
        customer;
    }

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
      classification: classifyAccountStatus(customer),
      orders: customerOrders,
      rfqs: customerRfqs,
      siteVisits: customerVisits,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/customer/updateProfile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { CustomerId, Cus_Email, Cus_Name, Cus_PhoneNumber, Cus_CompanyName, Cus_Logo, Cus_Username } =
      req.body || {};
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";
    let match = req.user?.userId ? await findUserById(req.user.userId) : null;
    if (isAdmin && (CustomerId || Cus_Email)) {
      match =
        (CustomerId ? await findUserById(Number(CustomerId)) : null) ||
        (Cus_Email ? await findUserByEmail(String(Cus_Email)) : null) ||
        match;
    }
    if (!match) return res.status(404).json({ message: "Customer not found" });
    const updated = await updateUserAccount(match.id, {
      ...(Cus_Name !== undefined ? { name: String(Cus_Name) } : {}),
      ...(Cus_Username !== undefined ? { username: Cus_Username ? String(Cus_Username) : null } : {}),
      ...(Cus_PhoneNumber !== undefined ? { phone: String(Cus_PhoneNumber) } : {}),
      ...(Cus_CompanyName !== undefined ? { company: String(Cus_CompanyName) } : {}),
      ...(Cus_Logo !== undefined ? { avatarUrl: String(Cus_Logo) } : {}),
    });
    return res.json({
      message: "Profile updated",
      customer: updated ? mapCustomerUserToLegacy(updated) : mapCustomerUserToLegacy(match),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/customer/verifyCustomer", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
    if (!updated) return res.status(404).json({ message: "Customer not found" });

    const classification = classifyAccountStatus(updated);
    await recordAuditEvent(req, {
      targetUserId: updated.id,
      targetIdentifier: updated.email,
      action: nextState ? "ACCOUNT_VERIFIED" : "ACCOUNT_UNVERIFIED",
      category: "ACCOUNT_GOVERNANCE",
      status: "SUCCESS",
      severity: "INFO",
      accountClassification: classification.statusCode,
      details: `Admin set verification state=${nextState} for ${updated.email}.`,
    });

    return res.json({
      message: nextState
        ? "Account verified successfully"
        : "Account verification revoked",
      customer: mapCustomerUserToLegacy(updated),
      classification,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

// ============================================================================
// ORDERS & RFQS ROUTES
// ============================================================================
app.get("/order/getAllOrders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const all = await listOrders();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";
    const scoped = isAdmin
      ? all
      : all.filter((o) => o.Client_Email.toLowerCase() === (req.user?.email || "").toLowerCase());
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const page = parseInt(req.query.page as string, 10) || 1;
    const start = (page - 1) * limit;
    return res.json({ data: scoped.slice(start, start + limit), total: scoped.length, page, limit });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/order/createOrder", publicSubmissionRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      Order_Status,
      Client_Name,
      Client_Email,
      Client_Number,
      Inquiry_Type,
      Subject,
      Notes,
      Source,
      Designs,
    } = req.body || {};
    if (!Client_Name || !Client_Email) {
      return res.status(400).json({ message: "Client_Name and Client_Email are required." });
    }
    const created = await createOrderRecord({
      Order_Status,
      Client_Name,
      Client_Email,
      Client_Number,
      Inquiry_Type,
      Subject,
      Notes,
      Source,
      Designs,
    });
    if (!Array.isArray(Designs) || Designs.length === 0 || Inquiry_Type || Subject || Notes) {
      await createContactInquiryRecord({
        customerUserId: req.user?.userId ?? null,
        name: String(Client_Name),
        email: String(Client_Email),
        phone: String(Client_Number || ""),
        department: String(Inquiry_Type || "Product Quote"),
        intent: String(Inquiry_Type || "Product Quote"),
        subject: String(Subject || `Inquiry ${created.OrderID}`),
        message: String(Notes || ""),
        source: String(Source || "order_form"),
        ipAddress: getClientIp(req),
      }).catch(() => null);
    }
    await recordAuditEvent(req, {
      targetIdentifier: String(Client_Email),
      action: "ORDER_CREATED",
      category: "COMMERCE",
      status: "SUCCESS",
      severity: "INFO",
      details: `Order ${created.OrderID} created for ${Client_Email}.`,
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

app.put("/order/ChangeStates", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
    await recordAuditEvent(req, {
      targetIdentifier: String(OrderID || ""),
      action: "ORDER_STATUS_UPDATED",
      category: "COMMERCE",
      status: "SUCCESS",
      severity: "INFO",
      details: `Order ${OrderID} updated to ${Order_Status}.`,
    });
    return res.json({ message: "Order status updated", order: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/rfq", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listRfqRecords();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";
    const scoped = isAdmin
      ? rows
      : rows.filter(
          (r) =>
            (r.email || "").toLowerCase() === (req.user?.email || "").toLowerCase() ||
            (req.user?.userId && Number(r.customerUserId) === Number(req.user.userId))
        );
    return res.json({ data: scoped });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post(
  "/api/rfq",
  publicSubmissionRateLimiter,
  optionalAuth,
  upload.array("attachments", 12),
  async (req: AuthRequest, res: Response) => {
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
          uploadedByUserId: req.user?.userId ?? null,
        }).catch(() => null);

        attachmentEntries.push({
          url: publicUrl,
          fileName: file.originalname,
          size: file.size,
          mediaAssetId: asset?.id ?? null,
        });
      }

      const saved = await createRfqRecord(
        { ...body, customerUserId: req.user?.userId ? String(req.user.userId) : body.customerUserId || "" },
        attachmentEntries
      );
      await recordAuditEvent(req, {
        targetIdentifier: String(body.email || ""),
        action: "RFQ_SUBMITTED",
        category: "COMMERCE",
        status: "SUCCESS",
        severity: "INFO",
        details: `RFQ submitted: ${body.projectTitle}`,
      });
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

app.patch("/api/rfq/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid RFQ ID." });
    }
    const body = req.body || {};
    const updated = await updateRfqRecord(id, {
      status: typeof body.status === "string" ? body.status : undefined,
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : undefined,
      estimatedQuoteAmount:
        body.estimatedQuoteAmount !== undefined ? body.estimatedQuoteAmount : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      assignedAdminId:
        body.assignedAdminId === null
          ? null
          : Number.isFinite(Number(body.assignedAdminId))
          ? Number(body.assignedAdminId)
          : undefined,
    });
    if (!updated) {
      return res.status(404).json({ message: "RFQ not found." });
    }
    return res.json({ message: "RFQ updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.get("/api/contact-inquiries", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listContactInquiries();
    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post(
  "/api/contact-inquiries",
  publicSubmissionRateLimiter,
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Valid name and email are required." });
      }
      const created = await createContactInquiryRecord({
        customerUserId: req.user?.userId ?? null,
        name,
        email,
        phone: String(body.phone || ""),
        department: String(body.department || "General Consultation"),
        intent: String(body.intent || body.department || "General Consultation"),
        subject: String(body.subject || ""),
        message: String(body.message || ""),
        source: String(body.source || "contact_page"),
        ipAddress: getClientIp(req),
      });
      await createNotificationRecord({
        title: "New Contact Inquiry",
        body: `${name} (${email}) submitted a ${created.department} inquiry.`,
        category: "INQUIRY",
        relatedEntityType: "contact_inquiry",
        relatedEntityId: created.inquiryCode,
        userId: req.user?.userId ?? null,
      }).catch(() => null);
      return res.status(201).json({
        message: "Inquiry submitted successfully.",
        data: created,
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

app.patch("/api/contact-inquiries/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const idOrCode = String(req.params.id || "").trim();
    const rawStatus =
      typeof req.body?.status === "string" ? req.body.status.toUpperCase() : undefined;
    if (rawStatus && !["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"].includes(rawStatus)) {
      return res.status(400).json({ message: "Invalid inquiry status." });
    }
    const updated = await updateContactInquiryStatus(idOrCode, {
      status: rawStatus as "NEW" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED" | undefined,
      assignedAdminId:
        req.body?.assignedAdminId === null
          ? null
          : Number.isFinite(Number(req.body?.assignedAdminId))
          ? Number(req.body.assignedAdminId)
          : undefined,
    });
    if (!updated) {
      return res.status(404).json({ message: "Contact inquiry not found." });
    }
    return res.json({ message: "Contact inquiry updated", data: updated });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

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

app.delete("/feedback/deleteFeedback", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/feedback/createFeedback", publicSubmissionRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
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

app.put("/feedback/updateFeedback/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.patch("/feedback/toggleHome/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/feedback/reorder", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
// NOTIFICATIONS ROUTES (Admin Protected)
// ============================================================================
app.get("/Notification/getalerts", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  try {
    const list = await listNotifications();
    return res.json({ data: list });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.post("/Notification/markAsRead", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/about/vision-mission", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/about/hero-slides", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/about/partners", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/about/clients", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/products/cms", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post(["/products/categories", "/api/categories"], requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/products/categories/reorder", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
  ["/products/categories/apply-theme", "/api/categories/apply-theme"],
  requireAdminOrStaff,
  async (req: AuthRequest, res: Response) => {
    try {
      const rawTheme = req.body?.theme ?? req.body;
      const data = await applyHeroThemeToAllCategories(rawTheme || {});
      return res.json({
        message: "Applied colors to all product categories",
        data,
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

app.put(
  ["/products/categories/:id", "/api/categories/:id"],
  requireAdminOrStaff,
  async (req: AuthRequest, res: Response) => {
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
  requireAdminOrStaff,
  async (req: AuthRequest, res: Response) => {
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
// PAGE HERO THEMES (PROJECTS / RESOURCES / CONTACT & GLOBAL SYNC)
// ============================================================================
app.get("/api/hero-themes", async (_req: Request, res: Response) => {
  try {
    const [rawPages, aboutCms, productCms] = await Promise.all([
      getCmsDoc<PageHeroThemesMap>("page_hero_themes", DEFAULT_PAGE_HERO_THEMES),
      getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK),
      getCmsDoc<ProductLandingCms>("product_landing_cms", DEFAULT_PRODUCT_LANDING_CMS),
    ]);
    return res.json({
      pageThemes: normalizePageHeroThemes(rawPages),
      aboutHeroTheme: normalizeHeroTheme(aboutCms?.heroTheme, DEFAULT_HERO_THEME),
      productLandingHeroTheme: normalizeHeroTheme(
        productCms?.heroTheme,
        DEFAULT_HERO_THEME
      ),
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

app.put("/api/hero-themes", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  try {
    const [currentPages, currentAbout, currentProduct] = await Promise.all([
      getCmsDoc<PageHeroThemesMap>("page_hero_themes", DEFAULT_PAGE_HERO_THEMES),
      getCmsDoc<AboutCmsPayload>("about_cms", DEFAULT_ABOUT_FALLBACK),
      getCmsDoc<ProductLandingCms>("product_landing_cms", DEFAULT_PRODUCT_LANDING_CMS),
    ]);

    if (req.body?.applyToAllSite && req.body?.theme) {
      const uniform = normalizeHeroTheme(req.body.theme, DEFAULT_HERO_THEME);
      const nextPages: PageHeroThemesMap = {
        projects: { ...uniform },
        resources: { ...uniform },
        contact: { ...uniform },
      };
      const nextAbout = normalizeAboutCmsPayload(
        { ...currentAbout, heroTheme: uniform },
        DEFAULT_ABOUT_FALLBACK
      );
      const nextProduct = normalizeProductLandingCms(
        { ...currentProduct, heroTheme: uniform },
        DEFAULT_PRODUCT_LANDING_CMS
      );
      await Promise.all([
        setCmsDoc("page_hero_themes", nextPages as unknown as Record<string, unknown>),
        setCmsDoc("about_cms", nextAbout as unknown as Record<string, unknown>),
        setCmsDoc("product_landing_cms", nextProduct as unknown as Record<string, unknown>),
        applyHeroThemeToAllCategories(uniform),
      ]);
      return res.json({
        message: "Applied color theme across all site hero banners & product categories",
        pageThemes: nextPages,
        aboutHeroTheme: uniform,
        productLandingHeroTheme: uniform,
      });
    }

    const incomingPages = req.body?.pageThemes ?? req.body;
    const mergedPages = normalizePageHeroThemes({
      projects: incomingPages?.projects ?? currentPages.projects,
      resources: incomingPages?.resources ?? currentPages.resources,
      contact: incomingPages?.contact ?? currentPages.contact,
    });
    await setCmsDoc(
      "page_hero_themes",
      mergedPages as unknown as Record<string, unknown>
    );

    let aboutHeroTheme = normalizeHeroTheme(currentAbout.heroTheme, DEFAULT_HERO_THEME);
    if (req.body?.aboutHeroTheme) {
      aboutHeroTheme = normalizeHeroTheme(req.body.aboutHeroTheme, DEFAULT_HERO_THEME);
      const nextAbout = normalizeAboutCmsPayload(
        { ...currentAbout, heroTheme: aboutHeroTheme },
        DEFAULT_ABOUT_FALLBACK
      );
      await setCmsDoc("about_cms", nextAbout as unknown as Record<string, unknown>);
    }

    let productLandingHeroTheme = normalizeHeroTheme(
      currentProduct.heroTheme,
      DEFAULT_HERO_THEME
    );
    if (req.body?.productLandingHeroTheme) {
      productLandingHeroTheme = normalizeHeroTheme(
        req.body.productLandingHeroTheme,
        DEFAULT_HERO_THEME
      );
      const nextProduct = normalizeProductLandingCms(
        { ...currentProduct, heroTheme: productLandingHeroTheme },
        DEFAULT_PRODUCT_LANDING_CMS
      );
      await setCmsDoc(
        "product_landing_cms",
        nextProduct as unknown as Record<string, unknown>
      );
    }

    return res.json({
      message: "Page hero colors updated",
      pageThemes: mergedPages,
      aboutHeroTheme,
      productLandingHeroTheme,
    });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
});

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

app.put("/ads/cms", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const current = await getCmsDoc<PageAdsCmsPayload>("page_ads_cms", DEFAULT_PAGE_ADS_CMS);
  const next = normalizePageAdsCms(req.body, current);
  await setCmsDoc("page_ads_cms", next as unknown as Record<string, unknown>);
  return res.json({ message: "Page advertisements updated", pages: next.pages, data: next });
});

app.put("/ads/cms/:pageKey", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/ads/cms/:pageKey/ads", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/ads/cms/:pageKey/ads/:adId", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/ads/cms/:pageKey/ads/:adId", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/resources/portals", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const incoming = Array.isArray(req.body?.portals) ? req.body.portals : req.body;
  const normalized = normalizeRelatedPortals(incoming);
  const saved = await replaceRelatedPortals(normalized);
  return res.json({ message: "Related hardware portals saved", data: saved });
});

app.post("/api/resources/portals", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const existing = await listRelatedPortals();
  const item = normalizePortalTile(req.body || {}, existing.length);
  if (!item.name || !item.url) {
    return res.status(400).json({ message: "Portal name and URL are required." });
  }
  const saved = await replaceRelatedPortals([...existing, item]);
  return res.status(201).json({ message: "Portal tile added", portal: item, data: saved });
});

app.put("/api/resources/portals/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = await listRelatedPortals();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ message: "Portal tile not found" });
  const updated = normalizePortalTile({ ...existing[idx], ...(req.body || {}), id }, idx);
  const next = existing.map((p, i) => (i === idx ? updated : p));
  const saved = await replaceRelatedPortals(next);
  return res.json({ message: "Portal tile updated", portal: updated, data: saved });
});

app.delete("/api/resources/portals/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
  });
});

app.post("/api/blogs/sync-blogger", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/blogs/config", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/blogs/home-selection", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post(["/api/blogs", "/api/blog-posts"], requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put(["/api/blogs/:id", "/api/blog-posts/:id"], requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete(["/api/blogs/:id", "/api/blog-posts/:id"], requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/site-settings", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
// INNOASSIST CHATBOT CONFIGURATION, KNOWLEDGE BASE, WORKFLOWS, HANDOVER & BI
// ============================================================================
const chatbotRateLimiter = createRateLimiter("chatbot_ask", 45, 60_000);
const CHATBOT_ALLOWED_UPLOAD_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".dwg",
  ".dxf",
  ".xlsx",
  ".xls",
  ".csv",
  ".txt",
  ".doc",
  ".docx",
]);

function canAccessChatSession(
  req: AuthRequest,
  session: Awaited<ReturnType<typeof getChatSession>>
): boolean {
  if (!session) return false;
  if (req.user?.role === "admin" || req.user?.role === "staff") return true;
  const token = String(
    req.headers["x-chat-session-token"] || req.query.token || req.body?.sessionToken || ""
  ).trim();
  if (token && token === session.sessionToken) return true;
  if (req.user?.userId && session.customerUserId && Number(req.user.userId) === Number(session.customerUserId)) {
    return true;
  }
  return false;
}

// Public Config (strips restricted topics, system instructions, and daily limits)
app.get("/api/chatbot/config", optionalAuth, async (req: AuthRequest, res: Response) => {
  const isStaff = req.user?.role === "admin" || req.user?.role === "staff";
  const [config, kbItems, contact, workflows] = await Promise.all([
    getStoredChatbotConfig(),
    listExtendedKnowledgeItems(),
    getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
    listChatbotWorkflows(),
  ]);
  const visibleFaqs = isStaff
    ? kbItems
    : kbItems.filter((f) => f.enabled && f.status === "published");
  return res.json({
    config: isStaff ? config : getPublicChatbotConfig(config),
    faqs: visibleFaqs,
    workflows: isStaff
      ? workflows
      : workflows
          .filter((w) => w.enabled)
          .map((w) => ({ id: w.id, name: w.name, intent: w.intent, category: w.category })),
    contact,
  });
});

// Admin Full Bundle (Protected)
app.get("/api/chatbot/admin/bundle", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  const [
    config,
    configHistory,
    faqs,
    documents,
    workflows,
    sessions,
    unanswered,
    leads,
    analytics,
    aiUsage,
    contact,
  ] = await Promise.all([
    getStoredChatbotConfig(),
    listChatbotConfigHistory(),
    listExtendedKnowledgeItems(),
    listKnowledgeDocuments(),
    listChatbotWorkflows(),
    listChatSessions(),
    listUnansweredQuestions(),
    listChatbotLeads(),
    computeChatbotAnalytics(),
    getAiUsageStats(),
    getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
  ]);
  return res.json({
    config,
    configHistory,
    faqs,
    documents,
    workflows,
    sessions,
    unanswered,
    leads,
    analytics,
    aiUsage,
    contact,
  });
});

app.put("/api/chatbot/config", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const current = await getStoredChatbotConfig();
  const next = normalizeChatbotConfig(req.body || {}, current);
  const editor = req.user?.email || req.user?.name || "Admin";
  await saveChatbotConfigWithHistory(
    next,
    editor,
    String(req.body?.changeSummary || "Updated INNOASSIST settings")
  );
  await recordAuditEvent(req, {
    targetIdentifier: "chatbot_config",
    action: "CHATBOT_CONFIG_UPDATED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: `Updated INNOASSIST configuration (AI mode: ${next.aiMode}, limit: ${next.dailyAiCallLimit}/day).`,
  });
  return res.json({
    message: "Chatbot configuration saved",
    config: next,
    configHistory: await listChatbotConfigHistory(),
  });
});

// Knowledge Base CRUD (Admin/Staff only)
app.post("/api/chatbot/faqs", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const existing = await listChatbotFaqs();
  const body = (req.body || {}) as Record<string, unknown>;
  const faqId = `faq-${Date.now()}`;
  const statusInput = (body.status as KnowledgePublicationStatus) || "published";
  const nextFaq = normalizeChatbotFaq(
    {
      ...body,
      id: faqId,
      enabled:
        typeof body.enabled === "boolean"
          ? body.enabled
          : statusInput === "published" || statusInput === "approved",
    },
    existing.length
  );
  if (!nextFaq.question || !nextFaq.answer) {
    return res.status(400).json({ message: "Question and answer are both required." });
  }
  const saved = await upsertChatbotFaqRecord(nextFaq);
  await upsertExtendedKnowledgeMeta(
    faqId,
    {
      subcategory: String(body.subcategory || ""),
      alternativeQuestions: Array.isArray(body.alternativeQuestions)
        ? (body.alternativeQuestions as string[])
        : typeof body.alternativeQuestions === "string"
          ? body.alternativeQuestions.split("\n")
          : [],
      synonyms: Array.isArray(body.synonyms)
        ? (body.synonyms as string[])
        : typeof body.synonyms === "string"
          ? body.synonyms.split(",")
          : [],
      relatedTopics: Array.isArray(body.relatedTopics)
        ? (body.relatedTopics as string[])
        : typeof body.relatedTopics === "string"
          ? body.relatedTopics.split(",")
          : [],
      status: statusInput,
      translations: (body.translations as Record<string, { question?: string; answer?: string }>) || {},
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    },
    req.user?.email || "Admin",
    "Created knowledge base entry"
  );
  await recordAuditEvent(req, {
    targetIdentifier: faqId,
    action: "CHATBOT_KB_CREATED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: `Created KB entry "${nextFaq.question.slice(0, 80)}" (${statusInput}).`,
  });
  return res.status(201).json({
    message: "Knowledge base entry added",
    faq: saved,
    faqs: await listExtendedKnowledgeItems(),
  });
});

app.put("/api/chatbot/faqs/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id || "");
  const all = await listExtendedKnowledgeItems();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return res.status(404).json({ message: "FAQ entry not found" });

  const body = (req.body || {}) as Record<string, unknown>;
  const nextStatus = (body.status as KnowledgePublicationStatus) || all[idx].status;
  const updated = normalizeChatbotFaq(
    {
      ...all[idx],
      ...body,
      id: all[idx].id,
      enabled:
        typeof body.enabled === "boolean"
          ? body.enabled
          : body.status
            ? nextStatus === "published" || nextStatus === "approved"
            : all[idx].enabled,
    },
    idx
  );
  if (!updated.question || !updated.answer) {
    return res.status(400).json({ message: "Question and answer cannot be empty." });
  }
  const saved = await upsertChatbotFaqRecord(updated);
  await upsertExtendedKnowledgeMeta(
    id,
    {
      subcategory:
        body.subcategory !== undefined ? String(body.subcategory || "") : all[idx].subcategory,
      alternativeQuestions:
        body.alternativeQuestions !== undefined
          ? Array.isArray(body.alternativeQuestions)
            ? (body.alternativeQuestions as string[])
            : String(body.alternativeQuestions || "").split("\n")
          : all[idx].alternativeQuestions,
      synonyms:
        body.synonyms !== undefined
          ? Array.isArray(body.synonyms)
            ? (body.synonyms as string[])
            : String(body.synonyms || "").split(",")
          : all[idx].synonyms,
      relatedTopics:
        body.relatedTopics !== undefined
          ? Array.isArray(body.relatedTopics)
            ? (body.relatedTopics as string[])
            : String(body.relatedTopics || "").split(",")
          : all[idx].relatedTopics,
      status: nextStatus,
      translations:
        body.translations !== undefined
          ? (body.translations as Record<string, { question?: string; answer?: string }>)
          : all[idx].translations,
      attachments: Array.isArray(body.attachments) ? body.attachments : all[idx].attachments,
    },
    req.user?.email || "Admin",
    String(body.revisionSummary || `Updated entry (${nextStatus})`)
  );
  await recordAuditEvent(req, {
    targetIdentifier: id,
    action: "CHATBOT_KB_UPDATED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: `Updated KB entry "${updated.question.slice(0, 80)}" (${nextStatus}).`,
  });
  return res.json({
    message: "Knowledge base entry updated",
    faq: saved,
    faqs: await listExtendedKnowledgeItems(),
  });
});

app.delete("/api/chatbot/faqs/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id || "");
  const ok = await deleteChatbotFaqRecord(id);
  if (!ok) return res.status(404).json({ message: "FAQ entry not found" });
  await removeKnowledgeMeta(id);
  await recordAuditEvent(req, {
    targetIdentifier: id,
    action: "CHATBOT_KB_DELETED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "WARNING",
    details: `Deleted KB entry ${id}.`,
  });
  return res.json({
    message: "Knowledge base entry removed",
    faqs: await listExtendedKnowledgeItems(),
  });
});

// Admin KB Retrieval Preview
app.post("/api/chatbot/kb/preview", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const query = String(req.body?.query || "").trim();
  const language = (req.body?.language as SupportedLanguage) || "en";
  const includeUnpublished = Boolean(req.body?.includeUnpublished);
  if (!query) {
    return res.status(400).json({ message: "Preview query text is required." });
  }
  const result = await previewKnowledgeRetrieval(query, language, includeUnpublished);
  return res.json(result);
});

// Admin Company Documents / PDFs / Technical Catalogues
app.post(
  "/api/chatbot/kb/documents",
  requireAdminOrStaff,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, string>;
      let fileUrl = String(body.fileUrl || "").trim();
      let fileName = String(body.fileName || "").trim();
      let mimeType = String(body.mimeType || "application/pdf");
      let fileSizeBytes = 0;

      if (req.file) {
        const ext = path.extname(req.file.originalname || "").toLowerCase();
        if (!CHATBOT_ALLOWED_UPLOAD_EXT.has(ext)) {
          fs.unlink(req.file.path, () => {});
          return res.status(400).json({ message: `Unsupported document file type: ${ext}` });
        }
        fileUrl = `/uploads/${req.file.filename}`;
        fileName = req.file.originalname;
        mimeType = req.file.mimetype;
        fileSizeBytes = req.file.size;
        await createMediaAssetRecord({
          publicUrl: fileUrl,
          sourceType: "UPLOAD",
          kind: "DOCUMENT",
          title: body.title || fileName,
          originalName: fileName,
          storageKey: `uploads/${req.file.filename}`,
          mimeType,
          fileSizeBytes,
          entityScope: "chatbot_kb_doc",
          uploadedByUserId: req.user?.userId ?? null,
        }).catch(() => null);
      }

      if (!body.title || !fileUrl) {
        return res.status(400).json({ message: "Document title and file are required." });
      }

      let extractedText = String(body.extractedText || "").trim();
      if (!extractedText && req.file && /\.(txt|csv|md)$/i.test(req.file.originalname || "")) {
        extractedText = fs.readFileSync(req.file.path, "utf-8").slice(0, 12000);
      }

      const saved = await upsertKnowledgeDocument({
        id: body.id || undefined,
        title: body.title,
        category: body.category || "Technical Catalogue",
        subcategory: body.subcategory || "",
        language: (body.language as SupportedLanguage | "all") || "all",
        fileUrl,
        fileName: fileName || body.title,
        mimeType,
        fileSizeBytes,
        summary: body.summary || "",
        extractedText,
        keywords: String(body.keywords || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        status: (body.status as KnowledgePublicationStatus) || "published",
        uploadedBy: req.user?.email || "Admin",
      });

      return res.status(201).json({
        message: "Knowledge document saved",
        document: saved,
        documents: await listKnowledgeDocuments(),
      });
    } catch (err) {
      return res.status(500).json({ message: (err as Error).message });
    }
  }
);

app.put("/api/chatbot/kb/documents/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id || "");
  const list = await listKnowledgeDocuments();
  const existing = list.find((d) => d.id === id);
  if (!existing) return res.status(404).json({ message: "Document not found" });
  const body = (req.body || {}) as Record<string, unknown>;
  const saved = await upsertKnowledgeDocument({
    ...existing,
    ...body,
    id,
    title: String(body.title ?? existing.title),
    fileUrl: existing.fileUrl,
    fileName: existing.fileName,
  });
  return res.json({
    message: "Knowledge document updated",
    document: saved,
    documents: await listKnowledgeDocuments(),
  });
});

app.delete("/api/chatbot/kb/documents/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const ok = await deleteKnowledgeDocument(String(req.params.id || ""));
  if (!ok) return res.status(404).json({ message: "Document not found" });
  return res.json({
    message: "Knowledge document deleted",
    documents: await listKnowledgeDocuments(),
  });
});

// Configurable Conversation Workflows (Admin/Staff)
app.get("/api/chatbot/workflows", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  return res.json({ workflows: await listChatbotWorkflows() });
});

app.post("/api/chatbot/workflows", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  if (!body.name) {
    return res.status(400).json({ message: "Workflow name is required." });
  }
  const workflows = await upsertChatbotWorkflow(body);
  await recordAuditEvent(req, {
    targetIdentifier: String(body.id || body.name),
    action: "CHATBOT_WORKFLOW_SAVED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: `Saved conversation workflow "${body.name}".`,
  });
  return res.json({ message: "Workflow saved", workflows });
});

app.delete("/api/chatbot/workflows/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const ok = await deleteChatbotWorkflow(String(req.params.id || ""));
  if (!ok) return res.status(404).json({ message: "Workflow not found" });
  return res.json({ message: "Workflow removed", workflows: await listChatbotWorkflows() });
});

// Public Secure Attachment Upload (Drawings, BOQs, Images)
app.post(
  "/api/chatbot/upload",
  chatbotRateLimiter,
  optionalAuth,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const ext = path.extname(req.file.originalname || "").toLowerCase();
    if (!CHATBOT_ALLOWED_UPLOAD_EXT.has(ext)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: "Allowed file types: PDF, PNG, JPG, WEBP, DWG, DXF, XLSX, CSV, TXT, DOC/DOCX.",
      });
    }
    if (req.file.size > 15 * 1024 * 1024) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Maximum customer attachment size is 15 MB." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    await createMediaAssetRecord({
      publicUrl: fileUrl,
      sourceType: "UPLOAD",
      kind: req.file.mimetype?.startsWith("image/") ? "IMAGE" : "DOCUMENT",
      title: req.file.originalname,
      originalName: req.file.originalname,
      storageKey: `uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      entityScope: "chatbot_attachment",
      uploadedByUserId: req.user?.userId ?? null,
    }).catch(() => null);

    const attachment: ChatAttachmentItem = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: req.file.originalname,
      fileUrl,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
    };
    return res.status(201).json({ attachment });
  }
);

// Public Ask Endpoint (Credit-Shielded Hybrid Brain)
app.post("/api/chatbot/ask", chatbotRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
  const userMessage = String(req.body?.message || "").trim();
  if (!userMessage) {
    return res.status(400).json({ message: "Message text is required." });
  }
  if (userMessage.length > 1500) {
    return res.status(400).json({ message: "Message must be 1500 characters or fewer." });
  }

  try {
    const result = await processInnoassistMessage({
      message: userMessage,
      sessionId: typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined,
      sessionToken:
        typeof req.body?.sessionToken === "string"
          ? req.body.sessionToken
          : typeof req.headers["x-chat-session-token"] === "string"
            ? req.headers["x-chat-session-token"]
            : undefined,
      preferredLanguage:
        req.body?.language === "si" || req.body?.language === "ta" || req.body?.language === "en"
          ? req.body.language
          : undefined,
      attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : undefined,
      customerUser: req.user
        ? { userId: req.user.userId, name: req.user.name, email: req.user.email }
        : null,
      ipAddress: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
    });
    return res.json(result);
  } catch (err) {
    console.error("INNOASSIST ask error:", err);
    return res.status(500).json({ message: "Unable to process message right now." });
  }
});

// Public Session Poll / Handover / Feedback (Scoped by sessionToken or owner)
app.get("/api/chatbot/session/:sessionId", optionalAuth, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.sessionId || ""));
  if (!canAccessChatSession(req, session)) {
    return res.status(403).json({ message: "Forbidden: Invalid session token." });
  }
  return res.json({
    sessionId: session!.sessionId,
    mode: session!.mode,
    status: session!.status,
    language: session!.language,
    assignedAdminName: session!.assignedAdminName || "",
    collectedLead: session!.collectedLead,
    messages: session!.messages,
    rating: session!.rating ?? null,
  });
});

app.post("/api/chatbot/session/:sessionId/handover", optionalAuth, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.sessionId || ""));
  if (!canAccessChatSession(req, session)) {
    return res.status(403).json({ message: "Forbidden: Invalid session token." });
  }
  session!.mode = "waiting_human";
  session!.status = "WAITING_HUMAN";
  session!.handoverCount += 1;
  session!.messages.push({
    id: `sys-${Date.now()}`,
    role: "system",
    text: "You requested a live specialist. An Innovista administrator has been notified and will reply here shortly.",
    timestamp: new Date().toISOString(),
  });
  await upsertChatSession(session!);
  await createNotificationRecord({
    title: "INNOASSIST: Live Specialist Requested",
    body: `${session!.customerName || "Visitor"} (${session!.customerPhone || session!.sessionId}) requested live human assistance.`,
  }).catch(() => null);
  return res.json({
    message: "Handover requested",
    mode: session!.mode,
    status: session!.status,
    messages: session!.messages,
  });
});

app.post("/api/chatbot/session/:sessionId/feedback", optionalAuth, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.sessionId || ""));
  if (!canAccessChatSession(req, session)) {
    return res.status(403).json({ message: "Forbidden: Invalid session token." });
  }
  const rating = Number(req.body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }
  session!.rating = Math.round(rating);
  session!.feedbackComment = String(req.body?.comment || "").slice(0, 500);
  await upsertChatSession(session!);
  return res.json({ message: "Thank you for your feedback!", rating: session!.rating });
});

// Admin Human Support & Conversation Takeover Routes
app.get("/api/chatbot/sessions", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const sessions = await listChatSessions({
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    mode: typeof req.query.mode === "string" ? req.query.mode : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
  });
  return res.json({ sessions });
});

app.get("/api/chatbot/sessions/:id/history", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  const history = await findCustomerContactHistory({
    email: session.customerEmail,
    phone: session.customerPhone,
    excludeSessionId: session.sessionId,
  });
  return res.json({ session, contactHistory: history });
});

app.post("/api/chatbot/sessions/:id/takeover", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  session.mode = "human";
  session.status = "IN_HUMAN_SUPPORT";
  session.assignedAdminId = req.user?.userId ?? null;
  session.assignedAdminName = req.user?.name || req.user?.email || "Innovista Specialist";
  session.assignedAdminEmail = req.user?.email || "";
  session.messages.push({
    id: `sys-${Date.now()}`,
    role: "system",
    text: `${session.assignedAdminName} joined the chat. AI auto-replies are paused.`,
    timestamp: new Date().toISOString(),
  });
  const saved = await upsertChatSession(session);
  await recordAuditEvent(req, {
    targetIdentifier: session.sessionId,
    action: "CHATBOT_HUMAN_TAKEOVER",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: `Admin ${session.assignedAdminName} took over session ${session.sessionId}.`,
  });
  return res.json({ message: "Takeover active — AI paused", session: saved });
});

app.post("/api/chatbot/sessions/:id/reply", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  const text = String(req.body?.message || "").trim();
  if (!text) return res.status(400).json({ message: "Reply message is required." });

  if (session.mode !== "human") {
    session.mode = "human";
    session.status = "IN_HUMAN_SUPPORT";
  }
  session.assignedAdminId = session.assignedAdminId || req.user?.userId || null;
  session.assignedAdminName =
    session.assignedAdminName || req.user?.name || req.user?.email || "Innovista Specialist";

  session.messages.push({
    id: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "admin",
    senderName: session.assignedAdminName,
    text,
    language: session.language,
    timestamp: new Date().toISOString(),
  });
  const saved = await upsertChatSession(session);
  return res.json({ message: "Reply sent", session: saved });
});

app.post("/api/chatbot/sessions/:id/return-ai", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  session.mode = "ai";
  session.status = req.body?.markResolved ? "CLOSED" : "OPEN";
  session.messages.push({
    id: `sys-${Date.now()}`,
    role: "system",
    text: "Human support session completed. INNOASSIST AI mode is active again.",
    timestamp: new Date().toISOString(),
  });
  const saved = await upsertChatSession(session);
  return res.json({ message: "Returned conversation to AI mode", session: saved });
});

app.post("/api/chatbot/sessions/:id/note", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  const note = String(req.body?.note || "").trim();
  if (!note) return res.status(400).json({ message: "Note cannot be empty." });
  session.internalNotes.unshift({
    id: `note-${Date.now()}`,
    authorName: req.user?.name || "Admin",
    authorEmail: req.user?.email || "",
    note,
    createdAt: new Date().toISOString(),
  });
  const saved = await upsertChatSession(session);
  return res.json({ message: "Internal note saved", session: saved });
});

app.post("/api/chatbot/sessions/:id/assign", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  session.assignedAdminId = req.body?.adminUserId ? Number(req.body.adminUserId) : null;
  session.assignedAdminName = String(req.body?.adminName || "Assigned Staff").trim();
  session.assignedAdminEmail = String(req.body?.adminEmail || "").trim();
  const saved = await upsertChatSession(session);
  return res.json({ message: "Conversation assigned/transferred", session: saved });
});

app.post("/api/chatbot/sessions/:id/status", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const session = await getChatSession(String(req.params.id || ""));
  if (!session) return res.status(404).json({ message: "Session not found" });
  const nextStatus = String(req.body?.status || "").toUpperCase();
  if (
    nextStatus !== "OPEN" &&
    nextStatus !== "WAITING_HUMAN" &&
    nextStatus !== "IN_HUMAN_SUPPORT" &&
    nextStatus !== "ESCALATED" &&
    nextStatus !== "CLOSED"
  ) {
    return res.status(400).json({ message: "Invalid session status." });
  }
  session.status = nextStatus;
  if (nextStatus === "CLOSED") session.mode = "resolved";
  const saved = await upsertChatSession(session);
  return res.json({ message: "Status updated", session: saved });
});

// Unanswered Questions Queue Routes (Admin/Staff)
app.get("/api/chatbot/unanswered", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  return res.json({ unanswered: await listUnansweredQuestions() });
});

app.post("/api/chatbot/unanswered/:id/convert", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  if (!body.question || !body.answer) {
    return res.status(400).json({ message: "Approved question and answer are required." });
  }
  const result = await convertUnansweredToKnowledge({
    unansweredId: String(req.params.id || ""),
    question: String(body.question),
    answer: String(body.answer),
    category: String(body.category || "General"),
    subcategory: String(body.subcategory || ""),
    keywords: Array.isArray(body.keywords)
      ? body.keywords
      : String(body.keywords || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
    synonyms: Array.isArray(body.synonyms)
      ? body.synonyms
      : String(body.synonyms || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
    status: (body.status as KnowledgePublicationStatus) || "published",
    editorName: req.user?.email || "Admin",
  });
  if (!result.unanswered) return res.status(404).json({ message: "Unanswered item not found." });
  return res.json({
    message: "Converted to Knowledge Base",
    unanswered: await listUnansweredQuestions(),
    faqs: await listExtendedKnowledgeItems(),
  });
});

app.delete("/api/chatbot/unanswered/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const mode = req.query.mode === "dismiss" ? "dismiss" : "delete";
  const ok = await dismissOrDeleteUnanswered(String(req.params.id || ""), mode);
  if (!ok) return res.status(404).json({ message: "Unanswered item not found" });
  return res.json({
    message: mode === "dismiss" ? "Dismissed" : "Deleted",
    unanswered: await listUnansweredQuestions(),
  });
});

// Leads & RFQ Sync Routes (Admin/Staff)
app.get("/api/chatbot/leads", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  return res.json({ leads: await listChatbotLeads() });
});

app.patch("/api/chatbot/leads/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const updated = await updateChatbotLead(String(req.params.id || ""), {
    status: req.body?.status,
    notes: req.body?.notes,
  });
  if (!updated) return res.status(404).json({ message: "Lead not found" });
  return res.json({ message: "Lead updated", lead: updated, leads: await listChatbotLeads() });
});

app.post("/api/chatbot/leads/:id/sync-rfq", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const synced = await syncChatbotLeadToRfq(String(req.params.id || ""));
  if (!synced) return res.status(404).json({ message: "Lead not found" });
  return res.json({ message: "Synced to RFQ table", lead: synced, leads: await listChatbotLeads() });
});

// Analytics, CSV Export & AI Credit Cache Controls (Admin/Staff)
app.get("/api/chatbot/analytics", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const report = await computeChatbotAnalytics({
    fromDate: typeof req.query.fromDate === "string" ? req.query.fromDate : undefined,
    toDate: typeof req.query.toDate === "string" ? req.query.toDate : undefined,
    language: typeof req.query.language === "string" ? req.query.language : undefined,
  });
  return res.json({ analytics: report });
});

app.get("/api/chatbot/analytics/export.csv", requireAdminOrStaff, async (_req: AuthRequest, res: Response) => {
  const [sessions, leads] = await Promise.all([listChatSessions(), listChatbotLeads()]);
  const escapeCsv = (val: unknown) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = [
    "SessionID",
    "CustomerName",
    "Email",
    "Phone",
    "Language",
    "Intent",
    "Status",
    "Mode",
    "Rating",
    "ResponseTimeMs",
    "LeadQualified",
    "RequiredService",
    "Location",
    "LastActivityAt",
  ].join(",");

  const rows = sessions.map((s) => {
    const lead = leads.find((l) => l.sessionId === s.sessionId);
    return [
      s.sessionId,
      s.customerName || lead?.fields.name || "",
      s.customerEmail || lead?.fields.email || "",
      s.customerPhone || lead?.fields.contactNumber || "",
      s.language,
      s.detectedIntent,
      s.status,
      s.mode,
      s.rating ?? "",
      s.avgResponseTimeMs,
      lead?.isQualified ? "YES" : "NO",
      lead?.fields.requiredService || "",
      lead?.fields.projectLocation || "",
      s.lastActivityAt,
    ]
      .map(escapeCsv)
      .join(",");
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="innoassist-analytics-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send([header, ...rows].join("\n"));
});

app.post("/api/chatbot/ai-cache/clear", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  await clearAiResponseCache();
  await recordAuditEvent(req, {
    targetIdentifier: "chatbot_ai_cache",
    action: "CHATBOT_AI_CACHE_CLEARED",
    category: "CHATBOT",
    status: "SUCCESS",
    severity: "INFO",
    details: "Cleared INNOASSIST AI response cache.",
  });
  return res.json({ message: "AI response cache cleared." });
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

app.get(["/api/site-visits/slots", "/api/appointments/slots"], optionalAuth, async (req: AuthRequest, res: Response) => {
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
    calendarConnected: Boolean(req.user && req.user.authProvider === "firebase"),
  });
});

app.get(["/api/site-visits", "/api/appointments"], requireAuth, async (req: AuthRequest, res: Response) => {
  const [bookings, schedule] = await Promise.all([
    listAppointments(),
    getAppointmentScheduleConfig(),
  ]);
  const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";
  const userEmail = (req.user?.email || "").toLowerCase();
  const scopedBookings = isAdmin
    ? bookings
    : bookings.filter(
        (b) =>
          (b.visitorEmail || "").toLowerCase() === userEmail ||
          (req.user?.userId && Number((b as { userId?: number | null }).userId) === Number(req.user.userId))
      );
  const payload = buildSiteVisitSchedulePayload(schedule, bookings, req.query.month);
  return res.json({
    bookings: scopedBookings,
    data: scopedBookings,
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

app.put("/api/site-visits/schedule/monthly", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/site-visits/schedule/monthly/:monthKey", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post("/api/site-visits/dates", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.patch("/api/site-visits/dates/:date", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/site-visits/dates/:date", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.post(["/api/site-visits/slots", "/api/appointments/slots"], requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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
  requireAdminOrStaff,
  async (req: AuthRequest, res: Response) => {
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
  requireAdminOrStaff,
  async (req: AuthRequest, res: Response) => {
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

app.post(["/api/site-visits", "/api/appointments"], publicSubmissionRateLimiter, optionalAuth, async (req: AuthRequest, res: Response) => {
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

app.patch(["/api/site-visits/:id", "/api/appointments/:id"], optionalAuth, async (req: AuthRequest, res: Response) => {
  const bookingId = String(req.params.id || "");
  const isAdmin = req.user?.role === "admin" || req.user?.role === "staff";
  const rawStatus = req.body?.status !== undefined ? String(req.body.status).toUpperCase() : undefined;
  if (rawStatus !== undefined && !isAdmin) {
    return res.status(req.user ? 403 : 401).json({
      message: "Administrator privileges required to update booking status.",
    });
  }
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

app.post("/api/site-visits/slots/toggle-block", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const { date, slotTime } = req.body || {};
  if (!date || !slotTime) {
    return res.status(400).json({ message: "date and slotTime are required." });
  }
  const result = await toggleBlockedSiteVisitKey({
    date: String(date),
    slotTime: String(slotTime),
    reason: typeof req.body?.reason === "string" ? req.body.reason : "",
    blockedByUserId: req.user?.userId ?? null,
  });
  return res.json({
    message: result.blocked ? "Slot blocked" : "Slot unblocked",
    blockedKeys: result.blockedKeys,
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

app.put("/api/home-slideshow", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const current = await getCmsDoc<HomeSlideshowCmsPayload>(
    "home_slideshow",
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const next = normalizeHomeSlideshowCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_slideshow", next as unknown as Record<string, unknown>);
  return res.json({ message: "Home slideshow settings updated.", data: next });
});

app.post("/api/home-slideshow/slides", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/home-slideshow/slides/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/home-slideshow/slides/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/home-services", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const current = await getCmsDoc<HomeServicesCmsPayload>(
    "home_services",
    DEFAULT_HOME_SERVICES_CMS
  );
  const next = normalizeHomeServicesCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_services", next as unknown as Record<string, unknown>);
  return res.json({ message: "What We Build For You settings updated.", data: next });
});

app.post("/api/home-services/items", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/home-services/items/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/home-services/items/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/home-featured-products", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
  const current = await getCmsDoc<HomeFeaturedProductsCmsPayload>(
    "home_featured_products",
    DEFAULT_HOME_FEATURED_PRODUCTS_CMS
  );
  const next = normalizeHomeFeaturedProductsCms({ ...current, ...(req.body || {}) });
  await setCmsDoc("home_featured_products", next as unknown as Record<string, unknown>);
  return res.json({ message: "Top Picks & Accessories Ribbon updated.", data: next });
});

app.post("/api/home-featured-products/accessories", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.put("/api/home-featured-products/accessories/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.delete("/api/home-featured-products/accessories/:id", requireAdminOrStaff, async (req: AuthRequest, res: Response) => {
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

app.use("/api", (_req: Request, res: Response) => {
  return res.status(404).json({ message: "API endpoint not found." });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err instanceof Error && err.message.startsWith("Unsupported or unsafe file type")) {
    return res.status(400).json({ message: err.message });
  }
  const errObj = err as { type?: string; status?: number; statusCode?: number; message?: string };
  if (errObj?.type === "entity.too.large" || errObj?.status === 413) {
    return res.status(413).json({ message: "Request payload exceeds the maximum allowed size." });
  }
  if (err instanceof SyntaxError && (errObj?.status === 400 || errObj?.statusCode === 400)) {
    return res.status(400).json({ message: "Malformed JSON request body." });
  }
  console.error("Unhandled server error:", err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ message: "Internal server error." });
  }
  return res.status(500).send("Internal Server Error");
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
  let viteServer: { close: () => Promise<void> } | null = null;

  httpServer.on("error", (err) => {
    console.error("HTTP server error:", err);
    process.exit(1);
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(rootDir, "dist");
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
        if (!fs.existsSync(indexPath)) {
          return res.status(503).json({
            message: "Frontend production bundle not found. Run npm run build before starting in production.",
          });
        }
        const template = fs.readFileSync(indexPath, "utf-8");
        const html = await buildSeoHtml(template, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const viteReadyPromise = (async () => {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        configFile: path.resolve(rootDir, "vite.config.ts"),
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : { server: httpServer },
        },
        appType: "spa",
      });
      viteServer = vite;
      return vite;
    })();

    viteReadyPromise.catch((err) => {
      console.error("Failed to initialize Vite middleware:", err);
      process.exit(1);
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
        const vite = await viteReadyPromise;
        const indexPath = path.resolve(rootDir, "frontend", "index.html");
        const template = fs.readFileSync(indexPath, "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        const html = await buildSeoHtml(transformed, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      try {
        const vite = await viteReadyPromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  }

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down gracefully...`);
    Promise.allSettled([
      viteServer ? viteServer.close() : Promise.resolve(),
      global._postgresPool ? global._postgresPool.end() : Promise.resolve(),
      new Promise<void>((resolve) => httpServer.close(() => resolve())),
    ]).finally(() => {
      process.exit(0);
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
