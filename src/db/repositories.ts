import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, markDatabaseOffline, isMemoryFallbackActive } from "./index.ts";
import {
  addAppointmentSlotRecordMem,
  applyHeroThemeToAllCategoriesMem,
  createAppointmentRecordMem,
  createAuditLogMem,
  createCategoryRecordMem,
  createFeedbackRecordMem,
  createMediaAssetRecordMem,
  createOrderRecordMem,
  createProductRecordMem,
  createProjectRecordMem,
  createRfqRecordMem,
  createSecurityChallengeMem,
  createUserAccountMem,
  deleteAppointmentDateRecordMem,
  deleteAppointmentSlotRecordMem,
  deleteBlogPostRecordMem,
  deleteCategoryRecordMem,
  deleteChatbotFaqRecordMem,
  deleteFeedbackRecordMem,
  deleteMediaAssetRecordMem,
  deleteMonthlyTemplateRecordMem,
  deleteProductRecordMem,
  deleteProjectRecordMem,
  deleteUserAccountMem,
  ensureMediaAssetIdForUrlMem,
  getAppointmentScheduleConfigMem,
  getCmsDocMem,
  getProductByAnyIdMem,
  getSecurityChallengeMem,
  incrementChallengeAttemptsMem,
  listAppointmentsMem,
  listAuditLogsMem,
  listBlogPostsMem,
  listCategoriesMem,
  listChatbotFaqsMem,
  listFeedbacksMem,
  listMediaAssetsMem,
  listNotificationsMem,
  listOrdersMem,
  listProductsMem,
  listProjectsMem,
  listRelatedPortalsMem,
  listRfqRecordsMem,
  listUsersByRolesMem,
  markChallengeConsumedMem,
  markNotificationReadMem,
  reorderCategoryRecordsMem,
  reorderFeedbackRecordsMem,
  replaceRelatedPortalsMem,
  resetSeedDataCheckMem,
  setCmsDocMem,
  updateAppointmentMetadataRecordMem,
  updateAppointmentSlotRecordMem,
  updateAppointmentStatusRecordMem,
  updateCategoryRecordMem,
  updateFeedbackRecordMem,
  updateOrderStatusRecordMem,
  updateProductRecordMem,
  updateProjectRecordMem,
  updateUserAccountMem,
  upsertAppointmentDateRecordMem,
  upsertBlogPostRecordMem,
  upsertChatbotFaqRecordMem,
  upsertMonthlyTemplateRecordMem,
} from "./memoryRepositories.ts";
import {
  appointmentDates,
  appointments,
  appointmentSlots,
  auditLogs,
  blogPosts,
  categories,
  chatbotFaqs,
  cmsDocuments,
  customerFeedbacks,
  mediaAssets,
  notifications,
  orderItems,
  orders,
  productCategories,
  productImages,
  products,
  projectImages,
  projects,
  relatedPortals,
  rfqAttachments,
  rfqRequests,
  securityChallenges,
  users,
} from "./schema.ts";
import { ensureDatabaseSeeded } from "./seed.ts";
import {
  normalizeDesignItem,
  normalizeProductCategory,
  type DesignItem,
  type ProductCategory,
} from "../utils/productCatalogHelpers.ts";
import {
  DEFAULT_HERO_THEME,
  normalizeHeroTheme,
  type HeroThemeConfig,
} from "../utils/heroThemeHelpers.ts";
import {
  applyMonthlyTemplateToSchedule,
  computeDefaultEndTime,
  deleteMonthlyTemplateFromSchedule,
  formatTime24ToLabel,
  normalizeManagedSlot,
  normalizeSiteVisitScheduleConfig,
  normalizeSlotTime,
  sortManagedSlots,
  type ManagedSiteVisitDateConfig,
  type ManagedSiteVisitSlot,
  type MonthlySlotTemplate,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SiteVisitStatus,
} from "../utils/siteVisitSchedulerHelpers.ts";
import type { BlogPostItem } from "../utils/blogBloggerHelpers.ts";
import type { CustomerFeedbackRecord } from "../utils/customerFeedbackHelpers.ts";
import type { ChatbotFaqItem } from "../utils/chatbotHelpers.ts";
import type { RelatedPortalItem } from "../utils/siteContentHelpers.ts";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
  normalizeMediaAssetInput,
} from "../utils/mediaAssetHelpers.ts";

// ============================================================================
// MEDIA ASSETS REPOSITORY (Uploads + External URLs + Presets)
// ============================================================================
export async function listMediaAssets(filters?: {
  kind?: string;
  sourceType?: string;
  entityScope?: string;
}) {
  if (isMemoryFallbackActive()) return listMediaAssetsMem(filters);
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.id));
    return rows.filter((row) => {
      if (filters?.kind && row.kind.toLowerCase() !== filters.kind.toLowerCase()) return false;
      if (
        filters?.sourceType &&
        row.sourceType.toLowerCase() !== filters.sourceType.toLowerCase()
      ) {
        return false;
      }
      if (
        filters?.entityScope &&
        (row.entityScope || "").toLowerCase() !== filters.entityScope.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  } catch (error) {
    markDatabaseOffline(error);
    return listMediaAssetsMem(filters);
  }
}

export async function createMediaAssetRecord(
  input: Parameters<typeof normalizeMediaAssetInput>[0] & { uploadedByUserId?: number | null }
) {
  const normalized = normalizeMediaAssetInput(input);
  if (normalized.valid === false) {
    throw new Error(normalized.error);
  }
  if (isMemoryFallbackActive()) return createMediaAssetRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const data = normalized.data;
    const [inserted] = await db
      .insert(mediaAssets)
      .values({
        kind: data.kind,
        sourceType: data.sourceType,
        title: data.title,
        originalName: data.originalName,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        altText: data.altText,
        entityScope: data.entityScope,
        uploadedByUserId: input.uploadedByUserId ?? null,
      })
      .returning();
    return inserted;
  } catch (error) {
    markDatabaseOffline(error);
    return createMediaAssetRecordMem(input);
  }
}

export async function ensureMediaAssetIdForUrl(
  url: string,
  title = "",
  entityScope = "general",
  uploadedByUserId: number | null = null
): Promise<number | null> {
  if (isMemoryFallbackActive()) {
    return ensureMediaAssetIdForUrlMem(url, title, entityScope, uploadedByUserId);
  }
  const clean = (url || "").trim();
  if (!clean) return null;
  try {
    const existing = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.publicUrl, clean))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const [inserted] = await db
      .insert(mediaAssets)
      .values({
        kind: inferMediaKindFromUrlOrMime(clean),
        sourceType: inferSourceTypeFromUrl(clean),
        title: title || clean.split("/").pop() || "asset",
        originalName: clean.split("/").pop() || "asset",
        storageKey: clean.startsWith("/uploads/") ? clean.replace(/^\/+/, "") : "",
        publicUrl: clean,
        altText: title || "Architectural media asset",
        entityScope,
        uploadedByUserId,
      })
      .returning();
    return inserted.id;
  } catch {
    return null;
  }
}

export async function deleteMediaAssetRecord(id: number) {
  if (isMemoryFallbackActive()) return deleteMediaAssetRecordMem(id);
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteMediaAssetRecordMem(id);
  }
}

// ============================================================================
// USERS (ADMINS / STAFF / CUSTOMERS)
// ============================================================================
export async function listUsersByRoles(roles?: string[]) {
  if (isMemoryFallbackActive()) return listUsersByRolesMem(roles);
  try {
    await ensureDatabaseSeeded();
    if (roles && roles.length > 0) {
      return await db
        .select()
        .from(users)
        .where(inArray(users.role, roles))
        .orderBy(asc(users.id));
    }
    return await db.select().from(users).orderBy(asc(users.id));
  } catch (error) {
    markDatabaseOffline(error);
    return listUsersByRolesMem(roles);
  }
}

export async function createUserAccount(payload: {
  uid?: string;
  username?: string | null;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: "admin" | "staff" | "customer";
  passwordHash?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  accountStatus?: string;
  emailVerificationTokenHash?: string | null;
  emailVerificationCodeHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  totpSecretEncrypted?: string | null;
  totpEnabled?: boolean;
  purchaseGoods?: string[];
}) {
  if (isMemoryFallbackActive()) return createUserAccountMem(payload);
  try {
    await ensureDatabaseSeeded();
    const cleanEmail = payload.email.trim().toLowerCase();
    const [created] = await db
      .insert(users)
      .values({
        uid: payload.uid || `${payload.role || "customer"}-${Date.now()}`,
        username: payload.username ? payload.username.trim().toLowerCase() : null,
        name: payload.name.trim(),
        email: cleanEmail,
        phone: payload.phone || "",
        company: payload.company || "",
        role: payload.role || "customer",
        passwordHash: payload.passwordHash || "",
        avatarUrl: payload.avatarUrl || "",
        isVerified: payload.isVerified ?? false,
        emailVerified: payload.emailVerified ?? false,
        accountStatus: payload.accountStatus || "ACTIVE",
        emailVerificationTokenHash: payload.emailVerificationTokenHash ?? null,
        emailVerificationCodeHash: payload.emailVerificationCodeHash ?? null,
        emailVerificationExpiresAt: payload.emailVerificationExpiresAt ?? null,
        totpSecretEncrypted: payload.totpSecretEncrypted ?? null,
        totpEnabled: payload.totpEnabled ?? false,
        isActive: (payload.accountStatus || "ACTIVE") !== "SUSPENDED",
        purchaseGoods: payload.purchaseGoods || [],
      })
      .returning();
    return created;
  } catch (error) {
    markDatabaseOffline(error);
    return createUserAccountMem(payload);
  }
}

export async function updateUserAccount(
  id: number,
  patch: Partial<{
    username: string | null;
    name: string;
    email: string;
    phone: string;
    company: string;
    role: string;
    passwordHash: string;
    avatarUrl: string;
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
    lastLoginIp: string;
    isActive: boolean;
    purchaseGoods: string[];
  }>
) {
  if (isMemoryFallbackActive()) return updateUserAccountMem(id, patch);
  try {
    await ensureDatabaseSeeded();
    const [updated] = await db
      .update(users)
      .set({
        ...(patch.username !== undefined
          ? { username: patch.username ? patch.username.trim().toLowerCase() : null }
          : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.company !== undefined ? { company: patch.company } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.passwordHash !== undefined ? { passwordHash: patch.passwordHash } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.isVerified !== undefined ? { isVerified: patch.isVerified } : {}),
        ...(patch.emailVerified !== undefined ? { emailVerified: patch.emailVerified } : {}),
        ...(patch.accountStatus !== undefined
          ? {
              accountStatus: patch.accountStatus,
              isActive: patch.accountStatus !== "SUSPENDED",
            }
          : {}),
        ...(patch.emailVerificationTokenHash !== undefined
          ? { emailVerificationTokenHash: patch.emailVerificationTokenHash }
          : {}),
        ...(patch.emailVerificationCodeHash !== undefined
          ? { emailVerificationCodeHash: patch.emailVerificationCodeHash }
          : {}),
        ...(patch.emailVerificationExpiresAt !== undefined
          ? { emailVerificationExpiresAt: patch.emailVerificationExpiresAt }
          : {}),
        ...(patch.totpSecretEncrypted !== undefined
          ? { totpSecretEncrypted: patch.totpSecretEncrypted }
          : {}),
        ...(patch.totpEnabled !== undefined ? { totpEnabled: patch.totpEnabled } : {}),
        ...(patch.failedLoginAttempts !== undefined
          ? { failedLoginAttempts: patch.failedLoginAttempts }
          : {}),
        ...(patch.lockedUntil !== undefined ? { lockedUntil: patch.lockedUntil } : {}),
        ...(patch.lastLoginAt !== undefined ? { lastLoginAt: patch.lastLoginAt } : {}),
        ...(patch.lastLoginIp !== undefined ? { lastLoginIp: patch.lastLoginIp } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.purchaseGoods !== undefined ? { purchaseGoods: patch.purchaseGoods } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated || null;
  } catch (error) {
    markDatabaseOffline(error);
    return updateUserAccountMem(id, patch);
  }
}

export async function deleteUserAccount(id: number) {
  if (isMemoryFallbackActive()) return deleteUserAccountMem(id);
  try {
    await ensureDatabaseSeeded();
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteUserAccountMem(id);
  }
}

// ============================================================================
// CATEGORIES REPOSITORY
// ============================================================================
function mapCategoryRow(row: typeof categories.$inferSelect): ProductCategory {
  return normalizeProductCategory(
    {
      CategoryID: row.categoryKey || String(row.id),
      name: row.name,
      slug: row.slug,
      tagline: row.tagline,
      description: row.description,
      coverImage: row.coverImage,
      featured: row.featured,
      displayOrder: row.displayOrder,
      slideshowSpeedMs: row.slideshowSpeedMs,
      heroSlides: row.heroSlides,
      specHighlights: row.specHighlights,
    },
    row.displayOrder
  );
}

async function loadCategoryThemeMap(): Promise<Record<string, HeroThemeConfig>> {
  const rows = await db
    .select()
    .from(cmsDocuments)
    .where(eq(cmsDocuments.key, "category_hero_themes"))
    .limit(1);
  const raw = (rows[0]?.payload || {}) as Record<string, Partial<HeroThemeConfig>>;
  const out: Record<string, HeroThemeConfig> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === "object") {
      out[k] = normalizeHeroTheme(v, DEFAULT_HERO_THEME);
    }
  }
  return out;
}

async function saveCategoryThemeMap(
  themeMap: Record<string, HeroThemeConfig>
): Promise<void> {
  await db
    .insert(cmsDocuments)
    .values({
      key: "category_hero_themes",
      payload: themeMap as unknown as Record<string, unknown>,
      updatedByUserId: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: cmsDocuments.key,
      set: {
        payload: themeMap as unknown as Record<string, unknown>,
        updatedByUserId: null,
        updatedAt: new Date(),
      },
    });
}

function mergeCategoryTheme(
  cat: ProductCategory,
  themeMap: Record<string, HeroThemeConfig>
): ProductCategory {
  const match = themeMap[cat.CategoryID] || themeMap[cat.slug];
  if (!match) return cat;
  return {
    ...cat,
    heroTheme: normalizeHeroTheme(match, DEFAULT_HERO_THEME),
  };
}

export async function listCategories(): Promise<ProductCategory[]> {
  if (isMemoryFallbackActive()) return listCategoriesMem();
  try {
    await ensureDatabaseSeeded();
    const [rows, themeMap] = await Promise.all([
      db
        .select()
        .from(categories)
        .orderBy(asc(categories.displayOrder), asc(categories.id)),
      loadCategoryThemeMap(),
    ]);
    return rows.map((row) => mergeCategoryTheme(mapCategoryRow(row), themeMap));
  } catch (error) {
    markDatabaseOffline(error);
    return listCategoriesMem();
  }
}

export async function createCategoryRecord(raw: Partial<ProductCategory>) {
  if (isMemoryFallbackActive()) return createCategoryRecordMem(raw);
  try {
    await ensureDatabaseSeeded();
    const existing = await db.select().from(categories);
    const normalized = normalizeProductCategory(raw, existing.length);
    const coverAssetId = await ensureMediaAssetIdForUrl(
      normalized.coverImage,
      normalized.name,
      "category"
    );

    const [inserted] = await db
      .insert(categories)
      .values({
        categoryKey: normalized.CategoryID,
        name: normalized.name,
        slug: normalized.slug,
        tagline: normalized.tagline,
        description: normalized.description,
        coverAssetId,
        coverImage: normalized.coverImage,
        featured: normalized.featured,
        displayOrder: normalized.displayOrder,
        slideshowSpeedMs: normalized.slideshowSpeedMs,
        heroSlides: normalized.heroSlides,
        specHighlights: normalized.specHighlights,
      })
      .returning();

    const mapped = mapCategoryRow(inserted);
    const theme = normalizeHeroTheme(raw.heroTheme, DEFAULT_HERO_THEME);
    const themeMap = await loadCategoryThemeMap();
    themeMap[mapped.CategoryID] = theme;
    themeMap[mapped.slug] = theme;
    await saveCategoryThemeMap(themeMap);
    return { ...mapped, heroTheme: theme };
  } catch (error) {
    markDatabaseOffline(error);
    return createCategoryRecordMem(raw);
  }
}

export async function updateCategoryRecord(keyOrId: string, raw: Partial<ProductCategory>) {
  if (isMemoryFallbackActive()) return updateCategoryRecordMem(keyOrId, raw);
  try {
    await ensureDatabaseSeeded();
    const [all, themeMap] = await Promise.all([
      db.select().from(categories),
      loadCategoryThemeMap(),
    ]);
    const match = all.find(
      (c) =>
        c.categoryKey === keyOrId ||
        c.slug === keyOrId ||
        String(c.id) === String(keyOrId)
    );
    if (!match) return null;

    const current = mergeCategoryTheme(mapCategoryRow(match), themeMap);
    const normalized = normalizeProductCategory(
      { ...current, ...raw, CategoryID: current.CategoryID },
      match.displayOrder
    );
    const coverAssetId = await ensureMediaAssetIdForUrl(
      normalized.coverImage,
      normalized.name,
      "category"
    );

    const [updated] = await db
      .update(categories)
      .set({
        name: normalized.name,
        slug: normalized.slug,
        tagline: normalized.tagline,
        description: normalized.description,
        coverAssetId,
        coverImage: normalized.coverImage,
        featured: normalized.featured,
        displayOrder: normalized.displayOrder,
        slideshowSpeedMs: normalized.slideshowSpeedMs,
        heroSlides: normalized.heroSlides,
        specHighlights: normalized.specHighlights,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, match.id))
      .returning();

    const theme = normalizeHeroTheme(
      raw.heroTheme ?? current.heroTheme,
      DEFAULT_HERO_THEME
    );
    if (match.slug !== normalized.slug) {
      delete themeMap[match.slug];
    }
    themeMap[current.CategoryID] = theme;
    themeMap[normalized.slug] = theme;
    await saveCategoryThemeMap(themeMap);

    return { ...mapCategoryRow(updated), heroTheme: theme };
  } catch (error) {
    markDatabaseOffline(error);
    return updateCategoryRecordMem(keyOrId, raw);
  }
}

export async function applyHeroThemeToAllCategories(
  rawTheme: Partial<HeroThemeConfig>
): Promise<ProductCategory[]> {
  if (isMemoryFallbackActive()) return applyHeroThemeToAllCategoriesMem(rawTheme);
  try {
    await ensureDatabaseSeeded();
    const theme = normalizeHeroTheme(rawTheme, DEFAULT_HERO_THEME);
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.displayOrder), asc(categories.id));
    const themeMap: Record<string, HeroThemeConfig> = {};
    for (const row of rows) {
      const key = row.categoryKey || String(row.id);
      themeMap[key] = { ...theme };
      themeMap[row.slug] = { ...theme };
    }
    await saveCategoryThemeMap(themeMap);
    return rows.map((row) => ({ ...mapCategoryRow(row), heroTheme: { ...theme } }));
  } catch (error) {
    markDatabaseOffline(error);
    return applyHeroThemeToAllCategoriesMem(rawTheme);
  }
}

export async function reorderCategoryRecords(orderedIds: string[]): Promise<ProductCategory[]> {
  if (isMemoryFallbackActive()) return reorderCategoryRecordsMem(orderedIds);
  try {
    await ensureDatabaseSeeded();
    const all = await db.select().from(categories).orderBy(asc(categories.displayOrder));
    for (let i = 0; i < orderedIds.length; i++) {
      const target = all.find(
        (c) => c.categoryKey === orderedIds[i] || String(c.id) === String(orderedIds[i])
      );
      if (target) {
        await db
          .update(categories)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(eq(categories.id, target.id));
      }
    }
    return await listCategories();
  } catch (error) {
    markDatabaseOffline(error);
    return reorderCategoryRecordsMem(orderedIds);
  }
}

export async function deleteCategoryRecord(keyOrId: string) {
  if (isMemoryFallbackActive()) return deleteCategoryRecordMem(keyOrId);
  try {
    await ensureDatabaseSeeded();
    const all = await db.select().from(categories);
    const match = all.find(
      (c) =>
        c.categoryKey === keyOrId ||
        c.slug === keyOrId ||
        String(c.id) === String(keyOrId)
    );
    if (!match) return null;
    await db.delete(categories).where(eq(categories.id, match.id));
    return mapCategoryRow(match);
  } catch (error) {
    markDatabaseOffline(error);
    return deleteCategoryRecordMem(keyOrId);
  }
}

// ============================================================================
// PRODUCTS (DESIGNS) REPOSITORY
// ============================================================================
async function hydrateProducts(rows: Array<typeof products.$inferSelect>): Promise<DesignItem[]> {
  if (rows.length === 0) return [];
  const productIds = rows.map((r) => r.id);
  const [catLinks, allCats, imgRows] = await Promise.all([
    db
      .select()
      .from(productCategories)
      .where(inArray(productCategories.productId, productIds)),
    db.select().from(categories),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
  ]);

  const catNameById = new Map(allCats.map((c) => [c.id, c.name]));

  return rows.map((row) => {
    const linkedCatNames = catLinks
      .filter((l) => l.productId === row.id)
      .map((l) => catNameById.get(l.categoryId))
      .filter((n): n is string => Boolean(n));

    if (linkedCatNames.length === 0 && row.primaryCategoryId) {
      const pName = catNameById.get(row.primaryCategoryId);
      if (pName) linkedCatNames.push(pName);
    }

    const images = imgRows
      .filter((img) => img.productId === row.id)
      .map((img) => img.imageUrl);

    const numericId = row.legacyDesignId && /^\d+$/.test(row.legacyDesignId)
      ? Number(row.legacyDesignId)
      : row.id;

    return normalizeDesignItem({
      DesignID: numericId,
      Design_Name: row.name,
      Design_Description: row.description,
      Categories: linkedCatNames,
      Design_Colors: row.colors,
      Design_Sizes: row.sizes,
      Design_BlogPosts: row.blogPostRefs,
      Design_Image: images.length > 0 ? images : ["/assets/products/door.jpg"],
      Design_CreatedAt: row.createdAt.toISOString(),
      price: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
      features: row.features,
      configurations: row.configurations,
      featureTable: row.featureTable || undefined,
      performance: (row.performance as unknown as DesignItem["performance"]) || undefined,
      downloads: row.downloads,
      certifications: (row.certifications as unknown as DesignItem["certifications"]) || undefined,
      certificationImages: row.certificationImages,
      accessoriesHeading: row.accessoriesHeading || undefined,
      accessoriesTagline: row.accessoriesTagline || undefined,
      accessoriesSlideshowSpeedMs: row.accessoriesSlideshowSpeedMs ?? undefined,
      accessoriesRibbonSpeed: row.accessoriesRibbonSpeed ?? undefined,
      accessories: (row.accessories as unknown as DesignItem["accessories"]) || undefined,
      faqs: row.faqs,
      advantages: row.advantages,
      customizations: (row.customizations as unknown as DesignItem["customizations"]) || undefined,
      partnerServices: row.partnerServices,
      partnerServiceBannerImage: row.partnerServiceBannerImage || undefined,
      clientShowcases: row.clientShowcases,
      relatedProductIds: row.relatedProductIds,
    });
  });
}

async function resolveProductRowByAnyId(idOrKey: string | number) {
  const target = String(idOrKey).trim();
  const all = await db.select().from(products).orderBy(asc(products.id));
  return (
    all.find(
      (p) =>
        p.legacyDesignId === target ||
        String(p.id) === target ||
        p.slug === target
    ) || null
  );
}

export async function listProducts(): Promise<DesignItem[]> {
  if (isMemoryFallbackActive()) return listProductsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(products).orderBy(asc(products.id));
    return await hydrateProducts(rows);
  } catch (error) {
    markDatabaseOffline(error);
    return listProductsMem();
  }
}

export async function getProductByAnyId(idOrKey: string | number): Promise<DesignItem | null> {
  if (isMemoryFallbackActive()) return getProductByAnyIdMem(idOrKey);
  try {
    await ensureDatabaseSeeded();
    const row = await resolveProductRowByAnyId(idOrKey);
    if (!row) return null;
    const hydrated = await hydrateProducts([row]);
    return hydrated[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return getProductByAnyIdMem(idOrKey);
  }
}

async function syncProductRelations(
  productId: number,
  categoryNames: string[],
  images: string[],
  productName: string
) {
  const allCats = await db.select().from(categories);
  const catIds: number[] = [];
  for (const label of categoryNames) {
    const clean = label.trim().toLowerCase();
    const matched = allCats.find(
      (c) =>
        c.name.toLowerCase() === clean ||
        c.slug.toLowerCase() === clean ||
        c.categoryKey.toLowerCase() === clean
    );
    if (matched && !catIds.includes(matched.id)) catIds.push(matched.id);
  }

  await db.delete(productCategories).where(eq(productCategories.productId, productId));
  for (const cid of catIds) {
    await db
      .insert(productCategories)
      .values({ productId, categoryId: cid })
      .onConflictDoNothing();
  }

  await db.delete(productImages).where(eq(productImages.productId, productId));
  for (let i = 0; i < images.length; i++) {
    const url = images[i];
    const assetId = await ensureMediaAssetIdForUrl(url, `${productName} #${i + 1}`, "product");
    await db.insert(productImages).values({
      productId,
      mediaAssetId: assetId,
      imageUrl: url,
      sortOrder: i,
    });
  }

  return catIds[0] ?? null;
}

export async function createProductRecord(raw: Partial<DesignItem>): Promise<DesignItem> {
  if (isMemoryFallbackActive()) return createProductRecordMem(raw);
  try {
    await ensureDatabaseSeeded();
    const existingAll = await db.select().from(products);
    const maxLegacy = existingAll.reduce((acc, row) => {
      const n = Number(row.legacyDesignId || row.id);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    const nextLegacyId = raw.DesignID ? String(raw.DesignID) : String(maxLegacy + 1);

    const normalized = normalizeDesignItem({
      ...raw,
      DesignID: Number(nextLegacyId) || nextLegacyId,
    });

    const firstImg = normalized.Design_Image[0] || "/assets/products/door.jpg";
    const coverAssetId = await ensureMediaAssetIdForUrl(firstImg, normalized.Design_Name, "product");
    const bannerAssetId = normalized.partnerServiceBannerImage
      ? await ensureMediaAssetIdForUrl(
          normalized.partnerServiceBannerImage,
          `${normalized.Design_Name} Banner`,
          "product"
        )
      : null;

    const slugBase = normalized.Design_Name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const [inserted] = await db
      .insert(products)
      .values({
        legacyDesignId: nextLegacyId,
        name: normalized.Design_Name,
        slug: `${slugBase || "system"}-${Date.now()}`,
        description: normalized.Design_Description,
        price: normalized.price !== undefined ? String(normalized.price) : null,
        coverAssetId,
        colors: normalized.Design_Colors,
        sizes: normalized.Design_Sizes,
        blogPostRefs: normalized.Design_BlogPosts,
        features: normalized.features || [],
        configurations: normalized.configurations || [],
        featureTable: normalized.featureTable || null,
        performance: (normalized.performance as unknown as Record<string, string>) || null,
        downloads: normalized.downloads || [],
        certifications: (normalized.certifications as unknown as Array<Record<string, string>>) || [],
        certificationImages: normalized.certificationImages || [],
        accessoriesHeading: normalized.accessoriesHeading || "",
        accessoriesTagline: normalized.accessoriesTagline || "",
        accessoriesSlideshowSpeedMs: normalized.accessoriesSlideshowSpeedMs ?? 4000,
        accessoriesRibbonSpeed: normalized.accessoriesRibbonSpeed ?? 45,
        accessories: (normalized.accessories as unknown as Array<Record<string, unknown>>) || [],
        faqs: normalized.faqs || [],
        advantages: normalized.advantages || [],
        customizations: (normalized.customizations as unknown as Array<{
          id: string;
          category: string;
          title: string;
          description: string;
        }>) || [],
        partnerServices: normalized.partnerServices || [],
        partnerServiceBannerAssetId: bannerAssetId,
        partnerServiceBannerImage: normalized.partnerServiceBannerImage || "",
        clientShowcases: normalized.clientShowcases || [],
        relatedProductIds: normalized.relatedProductIds || [],
      })
      .returning();

    const primaryCatId = await syncProductRelations(
      inserted.id,
      normalized.Categories,
      normalized.Design_Image,
      normalized.Design_Name
    );
    if (primaryCatId) {
      await db
        .update(products)
        .set({ primaryCategoryId: primaryCatId })
        .where(eq(products.id, inserted.id));
    }

    const hydrated = await hydrateProducts([inserted]);
    return hydrated[0];
  } catch (error) {
    markDatabaseOffline(error);
    return createProductRecordMem(raw);
  }
}

export async function updateProductRecord(
  idOrKey: string | number,
  raw: Partial<DesignItem>
): Promise<DesignItem | null> {
  if (isMemoryFallbackActive()) return updateProductRecordMem(idOrKey, raw);
  try {
    await ensureDatabaseSeeded();
    const row = await resolveProductRowByAnyId(idOrKey);
    if (!row) return null;

    const currentHydrated = (await hydrateProducts([row]))[0];
    const normalized = normalizeDesignItem({
      ...currentHydrated,
      ...raw,
      DesignID: currentHydrated.DesignID,
    });

    const firstImg = normalized.Design_Image[0] || "/assets/products/door.jpg";
    const coverAssetId = await ensureMediaAssetIdForUrl(firstImg, normalized.Design_Name, "product");
    const bannerAssetId = normalized.partnerServiceBannerImage
      ? await ensureMediaAssetIdForUrl(
          normalized.partnerServiceBannerImage,
          `${normalized.Design_Name} Banner`,
          "product"
        )
      : null;

    const primaryCatId = await syncProductRelations(
      row.id,
      normalized.Categories,
      normalized.Design_Image,
      normalized.Design_Name
    );

    const [updated] = await db
      .update(products)
      .set({
        name: normalized.Design_Name,
        description: normalized.Design_Description,
        price: normalized.price !== undefined ? String(normalized.price) : null,
        primaryCategoryId: primaryCatId,
        coverAssetId,
        colors: normalized.Design_Colors,
        sizes: normalized.Design_Sizes,
        blogPostRefs: normalized.Design_BlogPosts,
        features: normalized.features || [],
        configurations: normalized.configurations || [],
        featureTable: normalized.featureTable || null,
        performance: (normalized.performance as unknown as Record<string, string>) || null,
        downloads: normalized.downloads || [],
        certifications: (normalized.certifications as unknown as Array<Record<string, string>>) || [],
        certificationImages: normalized.certificationImages || [],
        accessoriesHeading: normalized.accessoriesHeading || "",
        accessoriesTagline: normalized.accessoriesTagline || "",
        accessoriesSlideshowSpeedMs: normalized.accessoriesSlideshowSpeedMs ?? 4000,
        accessoriesRibbonSpeed: normalized.accessoriesRibbonSpeed ?? 45,
        accessories: (normalized.accessories as unknown as Array<Record<string, unknown>>) || [],
        faqs: normalized.faqs || [],
        advantages: normalized.advantages || [],
        customizations: (normalized.customizations as unknown as Array<{
          id: string;
          category: string;
          title: string;
          description: string;
        }>) || [],
        partnerServices: normalized.partnerServices || [],
        partnerServiceBannerAssetId: bannerAssetId,
        partnerServiceBannerImage: normalized.partnerServiceBannerImage || "",
        clientShowcases: normalized.clientShowcases || [],
        relatedProductIds: normalized.relatedProductIds || [],
        updatedAt: new Date(),
      })
      .where(eq(products.id, row.id))
      .returning();

    return (await hydrateProducts([updated]))[0];
  } catch (error) {
    markDatabaseOffline(error);
    return updateProductRecordMem(idOrKey, raw);
  }
}

export async function deleteProductRecord(idOrKey: string | number): Promise<boolean> {
  if (isMemoryFallbackActive()) return deleteProductRecordMem(idOrKey);
  try {
    await ensureDatabaseSeeded();
    const row = await resolveProductRowByAnyId(idOrKey);
    if (!row) return false;
    await db.delete(products).where(eq(products.id, row.id));
    return true;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteProductRecordMem(idOrKey);
  }
}

// ============================================================================
// APPOINTMENTS & TIME SLOTS REPOSITORY
// ============================================================================
function mapAppointmentRow(row: typeof appointments.$inferSelect): SiteVisitBooking {
  return {
    id: row.bookingCode,
    date: row.visitDate,
    slotTime: row.slotTime,
    slotLabel: row.slotLabel,
    locationName: row.locationName,
    visitorName: row.visitorName,
    visitorEmail: row.visitorEmail,
    visitorPhone: row.visitorPhone,
    notes: row.notes,
    status: row.status as SiteVisitStatus,
    calendarEventId: row.calendarEventId || "",
    emailSent: row.emailSent,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAppointmentScheduleConfig(): Promise<SiteVisitScheduleConfig> {
  if (isMemoryFallbackActive()) return getAppointmentScheduleConfigMem();
  try {
    await ensureDatabaseSeeded();
    const [slotRows, dateRows, blockedDoc, monthlyDoc] = await Promise.all([
      db.select().from(appointmentSlots).orderBy(asc(appointmentSlots.sortOrder), asc(appointmentSlots.slotTime)),
      db.select().from(appointmentDates).orderBy(asc(appointmentDates.visitDate)),
      db.select().from(cmsDocuments).where(eq(cmsDocuments.key, "site_visit_blocked_keys")).limit(1),
      db.select().from(cmsDocuments).where(eq(cmsDocuments.key, "site_visit_monthly_templates")).limit(1),
    ]);

    const defaultSlots: ManagedSiteVisitSlot[] = slotRows.map((s) => ({
      id: s.slotKey,
      time: s.slotTime,
      endTime: s.endTime,
      label: s.label,
      available: s.available,
    }));

    const dates: Record<string, ManagedSiteVisitDateConfig> = {};
    for (const d of dateRows) {
      dates[d.visitDate] = {
        date: d.visitDate,
        available: d.available,
        note: d.note || undefined,
        isCustom: d.isCustom,
        ...(Array.isArray(d.customSlots) && d.customSlots.length > 0
          ? { slots: d.customSlots }
          : {}),
      };
    }

    const blockedKeys = Array.isArray(blockedDoc[0]?.payload?.blockedKeys)
      ? (blockedDoc[0].payload.blockedKeys as string[])
      : [];

    const monthlyTemplates =
      monthlyDoc[0]?.payload &&
      typeof monthlyDoc[0].payload === "object" &&
      "monthlyTemplates" in monthlyDoc[0].payload
        ? (monthlyDoc[0].payload.monthlyTemplates as Record<string, MonthlySlotTemplate>)
        : {};

    return normalizeSiteVisitScheduleConfig({
      defaultSlots,
      dates,
      blockedKeys,
      monthlyTemplates,
    });
  } catch (error) {
    markDatabaseOffline(error);
    return getAppointmentScheduleConfigMem();
  }
}

export async function listAppointments(): Promise<SiteVisitBooking[]> {
  if (isMemoryFallbackActive()) return listAppointmentsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));
    return rows.map(mapAppointmentRow);
  } catch (error) {
    markDatabaseOffline(error);
    return listAppointmentsMem();
  }
}

export async function createAppointmentRecord(input: {
  date: string;
  slotTime: string;
  slotLabel?: string;
  locationName?: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  notes?: string;
  userId?: number | null;
}) {
  if (isMemoryFallbackActive()) return createAppointmentRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const normalizedTime = normalizeSlotTime(input.slotTime);
    const allSlots = await db.select().from(appointmentSlots);
    const matchingSlot = allSlots.find((s) => s.slotTime === normalizedTime);
    const bookingCode = `SV-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-3)}`;

    const [inserted] = await db
      .insert(appointments)
      .values({
        bookingCode,
        slotId: matchingSlot?.id ?? null,
        visitDate: input.date.trim(),
        slotTime: normalizedTime,
        slotLabel: input.slotLabel || matchingSlot?.label || formatTime24ToLabel(normalizedTime),
        locationName: input.locationName || "Nawala Showroom & Consultation",
        visitorName: input.visitorName.trim(),
        visitorEmail: input.visitorEmail.trim(),
        visitorPhone: input.visitorPhone.trim(),
        notes: (input.notes || "").trim(),
        status: "CONFIRMED",
        userId: input.userId ?? null,
        calendarEventId: "",
        emailSent: false,
      })
      .returning();

    return mapAppointmentRow(inserted);
  } catch (error) {
    markDatabaseOffline(error);
    return createAppointmentRecordMem(input);
  }
}

export async function updateAppointmentStatusRecord(
  idOrCode: string,
  status: SiteVisitStatus
): Promise<SiteVisitBooking | null> {
  if (isMemoryFallbackActive()) return updateAppointmentStatusRecordMem(idOrCode, status);
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(appointments);
    const match = rows.find(
      (a) => a.bookingCode === idOrCode || String(a.id) === String(idOrCode)
    );
    if (!match) return null;

    const [updated] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, match.id))
      .returning();
    return mapAppointmentRow(updated);
  } catch (error) {
    markDatabaseOffline(error);
    return updateAppointmentStatusRecordMem(idOrCode, status);
  }
}

export async function updateAppointmentMetadataRecord(
  idOrCode: string,
  patch: { status?: SiteVisitStatus; calendarEventId?: string; emailSent?: boolean }
): Promise<SiteVisitBooking | null> {
  if (isMemoryFallbackActive()) return updateAppointmentMetadataRecordMem(idOrCode, patch);
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(appointments);
    const match = rows.find(
      (a) => a.bookingCode === idOrCode || String(a.id) === String(idOrCode)
    );
    if (!match) return null;

    const [updated] = await db
      .update(appointments)
      .set({
        ...(patch.status ? { status: patch.status } : {}),
        ...(typeof patch.calendarEventId === "string"
          ? { calendarEventId: patch.calendarEventId }
          : {}),
        ...(typeof patch.emailSent === "boolean" ? { emailSent: patch.emailSent } : {}),
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, match.id))
      .returning();
    return mapAppointmentRow(updated);
  } catch (error) {
    markDatabaseOffline(error);
    return updateAppointmentMetadataRecordMem(idOrCode, patch);
  }
}

async function resolveBaseSlotsForDateDb(targetDate: string): Promise<ManagedSiteVisitSlot[]> {
  const schedule = await getAppointmentScheduleConfig();
  const existing = schedule.dates[targetDate];
  if (existing?.slots && existing.slots.length > 0) return existing.slots;
  const monthCfg = /^\d{4}-\d{2}/.test(targetDate)
    ? schedule.monthlyTemplates?.[targetDate.slice(0, 7)]
    : undefined;
  if (monthCfg?.slots && monthCfg.slots.length > 0) return monthCfg.slots;
  return schedule.defaultSlots;
}

export async function addAppointmentSlotRecord(
  date: string | undefined,
  slotInput: { time: string; endTime?: string; label?: string; available?: boolean }
) {
  if (isMemoryFallbackActive()) return addAppointmentSlotRecordMem(date, slotInput);
  try {
    await ensureDatabaseSeeded();
    const normTime = normalizeSlotTime(slotInput.time);
    const normalized = normalizeManagedSlot({
      id: `slot-${normTime.replace(":", "")}-${Date.now().toString(36)}`,
      time: normTime,
      endTime: slotInput.endTime ? normalizeSlotTime(slotInput.endTime) : computeDefaultEndTime(normTime),
      label: slotInput.label?.trim() || formatTime24ToLabel(normTime),
      available: slotInput.available ?? true,
    });

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const targetDate = date.trim();
      const existing = await db
        .select()
        .from(appointmentDates)
        .where(eq(appointmentDates.visitDate, targetDate))
        .limit(1);

      const baseSlots = await resolveBaseSlotsForDateDb(targetDate);
      const nextSlots = sortManagedSlots([
        ...baseSlots.filter((s) => s.time !== normalized.time),
        normalized,
      ]);

      await db
        .insert(appointmentDates)
        .values({
          visitDate: targetDate,
          available: existing[0]?.available ?? true,
          note: existing[0]?.note || "",
          isCustom: existing[0]?.isCustom ?? false,
          customSlots: nextSlots,
        })
        .onConflictDoUpdate({
          target: appointmentDates.visitDate,
          set: { customSlots: nextSlots, updatedAt: new Date() },
        });
    } else {
      const existingSlots = await db.select().from(appointmentSlots);
      const duplicate = existingSlots.find((s) => s.slotTime === normalized.time);
      if (duplicate) {
        await db
          .update(appointmentSlots)
          .set({
            endTime: normalized.endTime,
            label: normalized.label,
            available: normalized.available,
          })
          .where(eq(appointmentSlots.id, duplicate.id));
      } else {
        await db.insert(appointmentSlots).values({
          slotKey: normalized.id,
          slotTime: normalized.time,
          endTime: normalized.endTime,
          label: normalized.label,
          available: normalized.available,
          sortOrder: existingSlots.length,
        });
      }
    }

    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return addAppointmentSlotRecordMem(date, slotInput);
  }
}

export async function updateAppointmentSlotRecord(
  slotId: string,
  date: string | undefined,
  patch: Partial<ManagedSiteVisitSlot>
) {
  if (isMemoryFallbackActive()) return updateAppointmentSlotRecordMem(slotId, date, patch);
  try {
    await ensureDatabaseSeeded();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const targetDate = date.trim();
      const existing = await db
        .select()
        .from(appointmentDates)
        .where(eq(appointmentDates.visitDate, targetDate))
        .limit(1);
      const baseSlots = await resolveBaseSlotsForDateDb(targetDate);

      const nextSlots = sortManagedSlots(
        baseSlots.map((s) =>
          s.id === slotId || s.time === slotId
            ? normalizeManagedSlot({ ...s, ...patch, id: s.id })
            : s
        )
      );

      await db
        .insert(appointmentDates)
        .values({
          visitDate: targetDate,
          available: existing[0]?.available ?? true,
          note: existing[0]?.note || "",
          isCustom: existing[0]?.isCustom ?? false,
          customSlots: nextSlots,
        })
        .onConflictDoUpdate({
          target: appointmentDates.visitDate,
          set: { customSlots: nextSlots, updatedAt: new Date() },
        });
    } else {
      const all = await db.select().from(appointmentSlots);
      const match = all.find(
        (s) => s.slotKey === slotId || s.slotTime === slotId || String(s.id) === String(slotId)
      );
      if (match) {
        const nextTime = patch.time ? normalizeSlotTime(patch.time) : match.slotTime;
        const nextEndTime = patch.endTime
          ? normalizeSlotTime(patch.endTime)
          : patch.time
          ? computeDefaultEndTime(nextTime)
          : match.endTime;
        const nextLabel = patch.label?.trim() || (patch.time ? formatTime24ToLabel(nextTime) : match.label);

        await db
          .update(appointmentSlots)
          .set({
            slotTime: nextTime,
            endTime: nextEndTime,
            label: nextLabel,
            available: typeof patch.available === "boolean" ? patch.available : match.available,
          })
          .where(eq(appointmentSlots.id, match.id));
      }
    }
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return updateAppointmentSlotRecordMem(slotId, date, patch);
  }
}

export async function deleteAppointmentSlotRecord(slotId: string, date?: string) {
  if (isMemoryFallbackActive()) return deleteAppointmentSlotRecordMem(slotId, date);
  try {
    await ensureDatabaseSeeded();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const targetDate = date.trim();
      const existing = await db
        .select()
        .from(appointmentDates)
        .where(eq(appointmentDates.visitDate, targetDate))
        .limit(1);
      const baseSlots = await resolveBaseSlotsForDateDb(targetDate);

      const nextSlots = baseSlots.filter((s) => s.id !== slotId && s.time !== slotId);
      await db
        .insert(appointmentDates)
        .values({
          visitDate: targetDate,
          available: existing[0]?.available ?? true,
          note: existing[0]?.note || "",
          isCustom: existing[0]?.isCustom ?? false,
          customSlots: nextSlots,
        })
        .onConflictDoUpdate({
          target: appointmentDates.visitDate,
          set: { customSlots: nextSlots, updatedAt: new Date() },
        });
    } else {
      const all = await db.select().from(appointmentSlots);
      const match = all.find(
        (s) => s.slotKey === slotId || s.slotTime === slotId || String(s.id) === String(slotId)
      );
      if (match) {
        await db.delete(appointmentSlots).where(eq(appointmentSlots.id, match.id));
      }
    }
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return deleteAppointmentSlotRecordMem(slotId, date);
  }
}

export async function upsertAppointmentDateRecord(input: {
  date: string;
  available?: boolean;
  note?: string;
  isCustom?: boolean;
  resetSlots?: boolean;
}) {
  if (isMemoryFallbackActive()) return upsertAppointmentDateRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const visitDate = input.date.trim();
    const existing = await db
      .select()
      .from(appointmentDates)
      .where(eq(appointmentDates.visitDate, visitDate))
      .limit(1);

    await db
      .insert(appointmentDates)
      .values({
        visitDate,
        available: typeof input.available === "boolean" ? input.available : true,
        note: input.note !== undefined ? input.note : existing[0]?.note || "",
        isCustom: input.isCustom !== undefined ? input.isCustom : true,
        customSlots: input.resetSlots ? [] : existing[0]?.customSlots || [],
      })
      .onConflictDoUpdate({
        target: appointmentDates.visitDate,
        set: {
          available:
            typeof input.available === "boolean"
              ? input.available
              : existing[0]?.available ?? true,
          note: input.note !== undefined ? input.note : existing[0]?.note || "",
          isCustom:
            input.isCustom !== undefined ? input.isCustom : existing[0]?.isCustom ?? false,
          ...(input.resetSlots ? { customSlots: [] } : {}),
          updatedAt: new Date(),
        },
      });
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return upsertAppointmentDateRecordMem(input);
  }
}

export async function deleteAppointmentDateRecord(date: string) {
  if (isMemoryFallbackActive()) return deleteAppointmentDateRecordMem(date);
  try {
    await ensureDatabaseSeeded();
    await db.delete(appointmentDates).where(eq(appointmentDates.visitDate, date.trim()));
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return deleteAppointmentDateRecordMem(date);
  }
}

export async function upsertMonthlyTemplateRecord(input: {
  monthKey: string;
  slots: Partial<ManagedSiteVisitSlot>[];
  activeWeekdays?: number[];
  closedDates?: string[];
  note?: string;
  clearPerDateCustomSlots?: boolean;
}): Promise<SiteVisitScheduleConfig> {
  if (isMemoryFallbackActive()) return upsertMonthlyTemplateRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const current = await getAppointmentScheduleConfig();
    const updated = applyMonthlyTemplateToSchedule(current, input);

    if (input.clearPerDateCustomSlots) {
      const monthRows = await db.select().from(appointmentDates);
      const matchingDates = monthRows
        .filter((r) => r.visitDate.startsWith(`${input.monthKey}-`))
        .map((r) => r.visitDate);
      if (matchingDates.length > 0) {
        await db
          .update(appointmentDates)
          .set({ customSlots: [], updatedAt: new Date() })
          .where(inArray(appointmentDates.visitDate, matchingDates));
      }
    }

    await setCmsDoc("site_visit_monthly_templates", {
      monthlyTemplates: updated.monthlyTemplates || {},
    });
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return upsertMonthlyTemplateRecordMem(input);
  }
}

export async function deleteMonthlyTemplateRecord(
  monthKey: string
): Promise<SiteVisitScheduleConfig> {
  if (isMemoryFallbackActive()) return deleteMonthlyTemplateRecordMem(monthKey);
  try {
    await ensureDatabaseSeeded();
    const current = await getAppointmentScheduleConfig();
    const updated = deleteMonthlyTemplateFromSchedule(current, monthKey);
    await setCmsDoc("site_visit_monthly_templates", {
      monthlyTemplates: updated.monthlyTemplates || {},
    });
    return await getAppointmentScheduleConfig();
  } catch (error) {
    markDatabaseOffline(error);
    return deleteMonthlyTemplateRecordMem(monthKey);
  }
}

// ============================================================================
// BLOG POSTS REPOSITORY
// ============================================================================
function mapBlogRow(row: typeof blogPosts.$inferSelect): BlogPostItem {
  return {
    id: row.slugKey || String(row.id),
    externalId: row.externalId || undefined,
    title: row.title,
    excerpt: row.excerpt,
    contentHtml: row.contentHtml,
    date: row.displayDate,
    publishedAt: row.publishedAt,
    readTime: row.readTime,
    category: row.category,
    labels: row.labels,
    author: row.authorName,
    coverImage: row.coverImage,
    source: row.source === "blogger" ? "blogger" : "local",
    bloggerUrl: row.bloggerUrl || undefined,
    featured: row.featured,
    showOnHome: row.showOnHome,
    homeOrder: row.homeOrder,
  };
}

export async function listBlogPosts(): Promise<BlogPostItem[]> {
  if (isMemoryFallbackActive()) return listBlogPostsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));
    return rows.map(mapBlogRow);
  } catch (error) {
    markDatabaseOffline(error);
    return listBlogPostsMem();
  }
}

export async function upsertBlogPostRecord(post: BlogPostItem): Promise<BlogPostItem> {
  if (isMemoryFallbackActive()) return upsertBlogPostRecordMem(post);
  try {
    await ensureDatabaseSeeded();
    const coverAssetId = await ensureMediaAssetIdForUrl(post.coverImage, post.title, "blog");
    const [saved] = await db
      .insert(blogPosts)
      .values({
        slugKey: post.id,
        externalId: post.externalId || null,
        title: post.title,
        excerpt: post.excerpt,
        contentHtml: post.contentHtml,
        displayDate: post.date,
        publishedAt: post.publishedAt,
        readTime: post.readTime,
        category: post.category,
        labels: post.labels,
        authorName: post.author,
        coverAssetId,
        coverImage: post.coverImage,
        source: post.source,
        bloggerUrl: post.bloggerUrl || "",
        featured: post.featured,
        showOnHome: post.showOnHome,
        homeOrder: post.homeOrder,
      })
      .onConflictDoUpdate({
        target: blogPosts.slugKey,
        set: {
          title: post.title,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          displayDate: post.date,
          publishedAt: post.publishedAt,
          readTime: post.readTime,
          category: post.category,
          labels: post.labels,
          authorName: post.author,
          coverAssetId,
          coverImage: post.coverImage,
          source: post.source,
          bloggerUrl: post.bloggerUrl || "",
          featured: post.featured,
          showOnHome: post.showOnHome,
          homeOrder: post.homeOrder,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapBlogRow(saved);
  } catch (error) {
    markDatabaseOffline(error);
    return upsertBlogPostRecordMem(post);
  }
}

export async function deleteBlogPostRecord(idOrSlug: string): Promise<boolean> {
  if (isMemoryFallbackActive()) return deleteBlogPostRecordMem(idOrSlug);
  try {
    await ensureDatabaseSeeded();
    const all = await db.select().from(blogPosts);
    const match = all.find(
      (b) => b.slugKey === idOrSlug || String(b.id) === String(idOrSlug)
    );
    if (!match) return false;
    await db.delete(blogPosts).where(eq(blogPosts.id, match.id));
    return true;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteBlogPostRecordMem(idOrSlug);
  }
}

// ============================================================================
// PROJECTS REPOSITORY
// ============================================================================
export async function listProjects() {
  if (isMemoryFallbackActive()) return listProjectsMem();
  try {
    await ensureDatabaseSeeded();
    const [projRows, imgRows] = await Promise.all([
      db.select().from(projects).orderBy(asc(projects.id)),
      db.select().from(projectImages).orderBy(asc(projectImages.sortOrder)),
    ]);

    return projRows.map((p) => ({
      ProjectID: p.id,
      Project_Title: p.title,
      Project_Description: p.description,
      Project_Images: imgRows
        .filter((i) => i.projectId === p.id)
        .map((i) => i.imageUrl),
      Location: p.location,
      Client_Name: p.clientName,
      Client_Email: p.clientEmail || "",
      Client_Number: p.clientNumber || "",
      Client_Company: p.clientCompany || "",
      Project_CreatedAt: p.createdAt.toISOString(),
      Project_FinishedDate: p.finishedDate || null,
      Budget: Number(p.budget || 0),
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listProjectsMem();
  }
}

export async function createProjectRecord(input: {
  Project_Title: string;
  Project_Description?: string;
  Project_Images?: string[];
  Location?: string;
  Client_Name: string;
  Client_Email?: string;
  Client_Number?: string;
  Client_Company?: string;
  Project_FinishedDate?: string | null;
  Budget?: number;
}) {
  if (isMemoryFallbackActive()) return createProjectRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const [inserted] = await db
      .insert(projects)
      .values({
        title: input.Project_Title,
        description: input.Project_Description || "",
        location: input.Location || "",
        clientName: input.Client_Name,
        clientEmail: input.Client_Email || "",
        clientNumber: input.Client_Number || "",
        clientCompany: input.Client_Company || "",
        finishedDate: input.Project_FinishedDate || null,
        budget: String(Number(input.Budget || 0)),
      })
      .returning();

    const imgs = Array.isArray(input.Project_Images) ? input.Project_Images : [];
    for (let i = 0; i < imgs.length; i++) {
      const assetId = await ensureMediaAssetIdForUrl(imgs[i], `${inserted.title} #${i + 1}`, "project");
      await db.insert(projectImages).values({
        projectId: inserted.id,
        mediaAssetId: assetId,
        imageUrl: imgs[i],
        sortOrder: i,
      });
    }

    const all = await listProjects();
    return all.find((p) => p.ProjectID === inserted.id)!;
  } catch (error) {
    markDatabaseOffline(error);
    return createProjectRecordMem(input);
  }
}

export async function updateProjectRecord(
  projectId: number,
  input: Partial<{
    Project_Title: string;
    Project_Description: string;
    Project_Images: string[];
    Location: string;
    Client_Name: string;
    Client_Email: string;
    Client_Number: string;
    Client_Company: string;
    Project_FinishedDate: string | null;
    Budget: number;
  }>
) {
  if (isMemoryFallbackActive()) return updateProjectRecordMem(projectId, input);
  try {
    await ensureDatabaseSeeded();
    const [updated] = await db
      .update(projects)
      .set({
        ...(input.Project_Title !== undefined ? { title: input.Project_Title } : {}),
        ...(input.Project_Description !== undefined ? { description: input.Project_Description } : {}),
        ...(input.Location !== undefined ? { location: input.Location } : {}),
        ...(input.Client_Name !== undefined ? { clientName: input.Client_Name } : {}),
        ...(input.Client_Email !== undefined ? { clientEmail: input.Client_Email } : {}),
        ...(input.Client_Number !== undefined ? { clientNumber: input.Client_Number } : {}),
        ...(input.Client_Company !== undefined ? { clientCompany: input.Client_Company } : {}),
        ...(input.Project_FinishedDate !== undefined ? { finishedDate: input.Project_FinishedDate } : {}),
        ...(input.Budget !== undefined ? { budget: String(Number(input.Budget || 0)) } : {}),
      })
      .where(eq(projects.id, projectId))
      .returning();
    if (!updated) return null;

    if (Array.isArray(input.Project_Images)) {
      await db.delete(projectImages).where(eq(projectImages.projectId, projectId));
      for (let i = 0; i < input.Project_Images.length; i++) {
        const assetId = await ensureMediaAssetIdForUrl(
          input.Project_Images[i],
          `${updated.title} #${i + 1}`,
          "project"
        );
        await db.insert(projectImages).values({
          projectId,
          mediaAssetId: assetId,
          imageUrl: input.Project_Images[i],
          sortOrder: i,
        });
      }
    }

    const all = await listProjects();
    return all.find((p) => p.ProjectID === projectId) || null;
  } catch (error) {
    markDatabaseOffline(error);
    return updateProjectRecordMem(projectId, input);
  }
}

export async function deleteProjectRecord(projectId: number): Promise<boolean> {
  if (isMemoryFallbackActive()) return deleteProjectRecordMem(projectId);
  try {
    await ensureDatabaseSeeded();
    const deleted = await db.delete(projects).where(eq(projects.id, projectId)).returning();
    return deleted.length > 0;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteProjectRecordMem(projectId);
  }
}

// ============================================================================
// ORDERS & RFQS REPOSITORY
// ============================================================================
export async function listOrders() {
  if (isMemoryFallbackActive()) return listOrdersMem();
  try {
    await ensureDatabaseSeeded();
    const [orderRows, itemRows] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.orderDate)),
      db.select().from(orderItems),
    ]);
    return orderRows.map((o) => ({
      OrderID: o.orderCode,
      Order_Date: o.orderDate.toISOString(),
      Order_Status: o.orderStatus as "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED",
      Client_Name: o.clientName,
      Client_Email: o.clientEmail,
      Client_Number: o.clientNumber || "",
      Customer: {
        Cus_CompanyName: o.customerCompany || "New Client",
        Cus_Logo: o.customerLogo || "/assets/logos/client-zenith.svg",
        Purchase_Goods: o.purchaseGoods,
      },
      Designs: itemRows
        .filter((it) => it.orderId === o.id)
        .map((it) => ({
          Design: {
            Design_Name: it.designName,
            Design_Image: it.designImage || "/assets/products/door.jpg",
          },
        })),
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listOrdersMem();
  }
}

export async function createOrderRecord(input: {
  Order_Status?: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Designs?: Array<{ DesignID?: string | number; Design_Name?: string; Design_Image?: string }>;
}) {
  if (isMemoryFallbackActive()) return createOrderRecordMem(input);
  try {
    await ensureDatabaseSeeded();
    const orderCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const matchedCustomer = await db
      .select()
      .from(users)
      .where(eq(users.email, input.Client_Email.trim().toLowerCase()))
      .limit(1);

    const [insertedOrder] = await db
      .insert(orders)
      .values({
        orderCode,
        customerUserId: matchedCustomer[0]?.id ?? null,
        orderStatus: input.Order_Status || "PENDING",
        clientName: input.Client_Name,
        clientEmail: input.Client_Email,
        clientNumber: input.Client_Number || "",
        customerCompany: matchedCustomer[0]?.company || "New Client",
        customerLogo: matchedCustomer[0]?.avatarUrl || "/assets/logos/client-zenith.svg",
        purchaseGoods: matchedCustomer[0]?.purchaseGoods || ["Custom Inquiry"],
      })
      .returning();

    const designList = Array.isArray(input.Designs) ? input.Designs : [];
    for (const entry of designList) {
      let productRow: typeof products.$inferSelect | null = null;
      if (entry.DesignID !== undefined) {
        productRow = await resolveProductRowByAnyId(entry.DesignID);
      }
      let firstImage = entry.Design_Image || "/assets/products/door.jpg";
      if (productRow) {
        const imgs = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, productRow.id))
          .orderBy(asc(productImages.sortOrder))
          .limit(1);
        if (imgs[0]?.imageUrl) firstImage = imgs[0].imageUrl;
      }

      await db.insert(orderItems).values({
        orderId: insertedOrder.id,
        productId: productRow?.id ?? null,
        designName: productRow?.name || entry.Design_Name || "Custom Architectural Design",
        designImage: firstImage,
        quantity: 1,
      });
    }

    await db.insert(notifications).values({
      notifKey: `notif-${Date.now()}`,
      title: "New Order / Quote Request",
      body: `${input.Client_Name} submitted inquiry ${orderCode}.`,
      userId: matchedCustomer[0]?.id ?? null,
      isRead: false,
    });

    const all = await listOrders();
    return all.find((o) => o.OrderID === orderCode)!;
  } catch (error) {
    markDatabaseOffline(error);
    return createOrderRecordMem(input);
  }
}

export async function updateOrderStatusRecord(orderCode: string, status: string) {
  if (isMemoryFallbackActive()) return updateOrderStatusRecordMem(orderCode, status);
  try {
    await ensureDatabaseSeeded();
    const [updated] = await db
      .update(orders)
      .set({ orderStatus: status })
      .where(eq(orders.orderCode, orderCode))
      .returning();
    if (!updated) return null;
    const all = await listOrders();
    return all.find((o) => o.OrderID === orderCode) || null;
  } catch (error) {
    markDatabaseOffline(error);
    return updateOrderStatusRecordMem(orderCode, status);
  }
}

export async function createRfqRecord(
  input: Record<string, string>,
  attachments: Array<{ url: string; fileName: string; size?: number; mediaAssetId?: number | null }>
) {
  if (isMemoryFallbackActive()) return createRfqRecordMem(input, attachments);
  try {
    await ensureDatabaseSeeded();
    const parsedUserId = input.customerUserId ? Number(input.customerUserId) : NaN;
    let resolvedCustomerUserId: number | null =
      Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
    if (resolvedCustomerUserId === null && input.email) {
      const matchedCustomer = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.trim().toLowerCase()))
        .limit(1);
      resolvedCustomerUserId = matchedCustomer[0]?.id ?? null;
    }

    const [inserted] = await db
      .insert(rfqRequests)
      .values({
        customerUserId: resolvedCustomerUserId,
        clientName: input.clientName || "",
        contactPerson: input.contactPerson || "",
        email: input.email || "",
        phone: input.phone || "",
        clientWebsite: input.clientWebsite || "",
        projectTitle: input.projectTitle || "",
        location: input.location || "",
        projectType: input.projectType || "Other",
        projectReferenceNumber: input.projectReferenceNumber || "",
        projectDescription: input.projectDescription || "",
        installationConditions: input.installationConditions || "",
        siteConstraints: input.siteConstraints || "",
        standards: input.standards || "",
        qualityExpectations: input.qualityExpectations || "",
        materialBrand: input.materialBrand || "",
        colorCode: input.colorCode || "",
        additionalFeatures: input.additionalFeatures || "",
        interiorStyle: input.interiorStyle || "Modern",
        paymentConditions: input.paymentConditions || "",
        budget: input.budget || "",
        latestDeliveryDate: input.latestDeliveryDate || "",
        proposedVisitDates: input.proposedVisitDates || "",
        siteAddress: input.siteAddress || "",
        googleMapsLink: input.googleMapsLink || "",
        status: "NEW",
      })
      .returning();

    for (const att of attachments) {
      await db.insert(rfqAttachments).values({
        rfqId: inserted.id,
        mediaAssetId: att.mediaAssetId ?? null,
        fileUrl: att.url,
        fileName: att.fileName,
        fileSizeBytes: att.size ?? null,
      });
    }

    await db.insert(notifications).values({
      notifKey: `notif-rfq-${inserted.id}-${Date.now()}`,
      title: "New Detailed RFQ Submitted",
      body: `${inserted.clientName} requested quotation for "${inserted.projectTitle}".`,
      isRead: false,
    });

    return inserted;
  } catch (error) {
    markDatabaseOffline(error);
    return createRfqRecordMem(input, attachments);
  }
}

export async function listRfqRecords() {
  if (isMemoryFallbackActive()) return listRfqRecordsMem();
  try {
    await ensureDatabaseSeeded();
    const [rfqs, atts] = await Promise.all([
      db.select().from(rfqRequests).orderBy(desc(rfqRequests.createdAt)),
      db.select().from(rfqAttachments),
    ]);
    return rfqs.map((r) => ({
      ...r,
      attachments: atts.filter((a) => a.rfqId === r.id),
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listRfqRecordsMem();
  }
}

// ============================================================================
// FEEDBACKS, FAQS, PORTALS, NOTIFICATIONS & CMS DOCUMENTS
// ============================================================================
function mapFeedbackRow(row: typeof customerFeedbacks.$inferSelect): CustomerFeedbackRecord {
  return {
    Feed_backId: row.id,
    Customer: {
      Cus_Name: row.customerName,
      Cus_CompanyName: row.companyName,
      Cus_Role: row.customerRole,
      Cus_Avatar: row.avatarUrl,
    },
    Rating: row.rating,
    Feed_back_comment: row.comment,
    Feed_Back_Images: row.images,
    Design: {
      Design_Name: row.designName,
      DesignID: row.designRefId || undefined,
    },
    showOnHome: row.showOnHome,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listFeedbacks(): Promise<CustomerFeedbackRecord[]> {
  if (isMemoryFallbackActive()) return listFeedbacksMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(customerFeedbacks)
      .orderBy(asc(customerFeedbacks.displayOrder), asc(customerFeedbacks.id));
    return rows.map(mapFeedbackRow);
  } catch (error) {
    markDatabaseOffline(error);
    return listFeedbacksMem();
  }
}

export async function createFeedbackRecord(fb: Omit<CustomerFeedbackRecord, "Feed_backId">) {
  if (isMemoryFallbackActive()) return createFeedbackRecordMem(fb);
  try {
    await ensureDatabaseSeeded();
    const avatarAssetId = fb.Customer.Cus_Avatar
      ? await ensureMediaAssetIdForUrl(fb.Customer.Cus_Avatar, fb.Customer.Cus_Name, "cms")
      : null;
    const [inserted] = await db
      .insert(customerFeedbacks)
      .values({
        customerName: fb.Customer.Cus_Name,
        companyName: fb.Customer.Cus_CompanyName,
        customerRole: fb.Customer.Cus_Role || "",
        avatarAssetId,
        avatarUrl: fb.Customer.Cus_Avatar || "/assets/about/director.jpg",
        designName: fb.Design.Design_Name,
        designRefId: fb.Design.DesignID || "",
        rating: fb.Rating,
        comment: fb.Feed_back_comment,
        images: fb.Feed_Back_Images,
        showOnHome: fb.showOnHome,
        displayOrder: fb.displayOrder,
      })
      .returning();
    return mapFeedbackRow(inserted);
  } catch (error) {
    markDatabaseOffline(error);
    return createFeedbackRecordMem(fb);
  }
}

export async function updateFeedbackRecord(
  id: number,
  patch: Partial<CustomerFeedbackRecord>
): Promise<CustomerFeedbackRecord | null> {
  if (isMemoryFallbackActive()) return updateFeedbackRecordMem(id, patch);
  try {
    await ensureDatabaseSeeded();
    const existing = await db
      .select()
      .from(customerFeedbacks)
      .where(eq(customerFeedbacks.id, id))
      .limit(1);
    if (!existing[0]) return null;
    const cur = mapFeedbackRow(existing[0]);

    const nextAvatar = patch.Customer?.Cus_Avatar ?? cur.Customer.Cus_Avatar ?? "";
    const avatarAssetId = nextAvatar
      ? await ensureMediaAssetIdForUrl(nextAvatar, patch.Customer?.Cus_Name || cur.Customer.Cus_Name, "cms")
      : null;

    const [updated] = await db
      .update(customerFeedbacks)
      .set({
        customerName: patch.Customer?.Cus_Name ?? cur.Customer.Cus_Name,
        companyName: patch.Customer?.Cus_CompanyName ?? cur.Customer.Cus_CompanyName,
        customerRole: patch.Customer?.Cus_Role ?? cur.Customer.Cus_Role ?? "",
        avatarAssetId,
        avatarUrl: nextAvatar,
        designName: patch.Design?.Design_Name ?? cur.Design.Design_Name,
        designRefId: patch.Design?.DesignID ?? cur.Design.DesignID ?? "",
        rating: patch.Rating ?? cur.Rating,
        comment: patch.Feed_back_comment ?? cur.Feed_back_comment,
        images: patch.Feed_Back_Images ?? cur.Feed_Back_Images,
        showOnHome: patch.showOnHome ?? cur.showOnHome,
        displayOrder: patch.displayOrder ?? cur.displayOrder,
      })
      .where(eq(customerFeedbacks.id, id))
      .returning();

    return mapFeedbackRow(updated);
  } catch (error) {
    markDatabaseOffline(error);
    return updateFeedbackRecordMem(id, patch);
  }
}

export async function deleteFeedbackRecord(id: number): Promise<boolean> {
  if (isMemoryFallbackActive()) return deleteFeedbackRecordMem(id);
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(customerFeedbacks)
      .where(eq(customerFeedbacks.id, id))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteFeedbackRecordMem(id);
  }
}

export async function reorderFeedbackRecords(orderedIds: number[]) {
  if (isMemoryFallbackActive()) return reorderFeedbackRecordsMem(orderedIds);
  try {
    await ensureDatabaseSeeded();
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(customerFeedbacks)
        .set({ displayOrder: i })
        .where(eq(customerFeedbacks.id, orderedIds[i]));
    }
    return await listFeedbacks();
  } catch (error) {
    markDatabaseOffline(error);
    return reorderFeedbackRecordsMem(orderedIds);
  }
}

export async function listChatbotFaqs(): Promise<ChatbotFaqItem[]> {
  if (isMemoryFallbackActive()) return listChatbotFaqsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(chatbotFaqs)
      .orderBy(desc(chatbotFaqs.priority), asc(chatbotFaqs.id));
    return rows.map((f) => ({
      id: f.faqKey,
      question: f.question,
      answer: f.answer,
      category: f.category,
      keywords: f.keywords,
      enabled: f.enabled,
      priority: f.priority,
      updatedAt: f.updatedAt.toISOString(),
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listChatbotFaqsMem();
  }
}

export async function upsertChatbotFaqRecord(faq: ChatbotFaqItem): Promise<ChatbotFaqItem> {
  if (isMemoryFallbackActive()) return upsertChatbotFaqRecordMem(faq);
  try {
    await ensureDatabaseSeeded();
    const [saved] = await db
      .insert(chatbotFaqs)
      .values({
        faqKey: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        keywords: faq.keywords,
        enabled: faq.enabled,
        priority: faq.priority,
      })
      .onConflictDoUpdate({
        target: chatbotFaqs.faqKey,
        set: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          keywords: faq.keywords,
          enabled: faq.enabled,
          priority: faq.priority,
          updatedAt: new Date(),
        },
      })
      .returning();
    return {
      id: saved.faqKey,
      question: saved.question,
      answer: saved.answer,
      category: saved.category,
      keywords: saved.keywords,
      enabled: saved.enabled,
      priority: saved.priority,
      updatedAt: saved.updatedAt.toISOString(),
    };
  } catch (error) {
    markDatabaseOffline(error);
    return upsertChatbotFaqRecordMem(faq);
  }
}

export async function deleteChatbotFaqRecord(faqKey: string): Promise<boolean> {
  if (isMemoryFallbackActive()) return deleteChatbotFaqRecordMem(faqKey);
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(chatbotFaqs)
      .where(eq(chatbotFaqs.faqKey, faqKey))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    markDatabaseOffline(error);
    return deleteChatbotFaqRecordMem(faqKey);
  }
}

export async function listRelatedPortals(): Promise<RelatedPortalItem[]> {
  if (isMemoryFallbackActive()) return listRelatedPortalsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(relatedPortals)
      .orderBy(asc(relatedPortals.sortOrder), asc(relatedPortals.id));
    return rows.map((p) => ({
      id: p.portalKey,
      name: p.name,
      category: p.category,
      summary: p.summary,
      url: p.url,
      image: p.imageUrl,
      isExternal: p.isExternal,
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listRelatedPortalsMem();
  }
}

export async function replaceRelatedPortals(items: RelatedPortalItem[]) {
  if (isMemoryFallbackActive()) return replaceRelatedPortalsMem(items);
  try {
    await ensureDatabaseSeeded();
    await db.delete(relatedPortals);
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const imageAssetId = await ensureMediaAssetIdForUrl(p.image, p.name, "cms");
      await db.insert(relatedPortals).values({
        portalKey: p.id,
        name: p.name,
        category: p.category,
        summary: p.summary,
        url: p.url,
        imageAssetId,
        imageUrl: p.image,
        isExternal: p.isExternal,
        sortOrder: i,
      });
    }
    return await listRelatedPortals();
  } catch (error) {
    markDatabaseOffline(error);
    return replaceRelatedPortalsMem(items);
  }
}

export async function listNotifications() {
  if (isMemoryFallbackActive()) return listNotificationsMem();
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
    return rows.map((n) => ({
      id: n.notifKey,
      NotificationsID: n.notifKey,
      Notifications_Title: n.title,
      Notifications_Body: n.body,
      Date_Timestamp: n.createdAt.toISOString(),
      isRead: n.isRead,
    }));
  } catch (error) {
    markDatabaseOffline(error);
    return listNotificationsMem();
  }
}

export async function markNotificationRead(notifKey?: string) {
  if (isMemoryFallbackActive()) return markNotificationReadMem(notifKey);
  try {
    await ensureDatabaseSeeded();
    if (notifKey) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.notifKey, notifKey));
    } else {
      await db.update(notifications).set({ isRead: true });
    }
    return true;
  } catch (error) {
    markDatabaseOffline(error);
    return markNotificationReadMem(notifKey);
  }
}

export async function getCmsDoc<T>(key: string, fallback: T): Promise<T> {
  if (isMemoryFallbackActive()) return getCmsDocMem(key, fallback);
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(cmsDocuments)
      .where(eq(cmsDocuments.key, key))
      .limit(1);
    if (!rows[0]) return fallback;
    return rows[0].payload as unknown as T;
  } catch (error) {
    markDatabaseOffline(error);
    return getCmsDocMem(key, fallback);
  }
}

export async function setCmsDoc<T extends Record<string, unknown>>(
  key: string,
  payload: T,
  updatedByUserId: number | null = null
): Promise<T> {
  if (isMemoryFallbackActive()) return setCmsDocMem(key, payload);
  try {
    await ensureDatabaseSeeded();
    await db
      .insert(cmsDocuments)
      .values({
        key,
        payload,
        updatedByUserId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cmsDocuments.key,
        set: {
          payload,
          updatedByUserId,
          updatedAt: new Date(),
        },
      });
    return payload;
  } catch (error) {
    markDatabaseOffline(error);
    return setCmsDocMem(key, payload);
  }
}

export async function resetSeedDataCheck() {
  if (isMemoryFallbackActive()) return resetSeedDataCheckMem();
  try {
    // Helper for testing/diagnostics using Drizzle count
    const [u, c, p, a, b, m] = await Promise.all([
      db.select({ id: users.id }).from(users),
      db.select({ id: categories.id }).from(categories),
      db.select({ id: products.id }).from(products),
      db.select({ id: appointments.id }).from(appointments),
      db.select({ id: blogPosts.id }).from(blogPosts),
      db.select({ id: mediaAssets.id }).from(mediaAssets),
    ]);
    return {
      users: u.length,
      categories: c.length,
      products: p.length,
      appointments: a.length,
      blogPosts: b.length,
      mediaAssets: m.length,
    };
  } catch (error) {
    markDatabaseOffline(error);
    return resetSeedDataCheckMem();
  }
}

// ============================================================================
// SECURITY CHALLENGES REPOSITORY (CAPTCHA, Admin MFA, Verification Tokens)
// ============================================================================
export async function createSecurityChallenge(input: {
  challengeId: string;
  purpose: string;
  userId?: number | null;
  identifier?: string;
  answerHash: string;
  maxAttempts?: number;
  expiresAt: Date;
}) {
  if (isMemoryFallbackActive()) return createSecurityChallengeMem(input);
  try {
    await ensureDatabaseSeeded();
    const [created] = await db
      .insert(securityChallenges)
      .values({
        challengeId: input.challengeId,
        purpose: input.purpose,
        userId: input.userId ?? null,
        identifier: input.identifier || "",
        answerHash: input.answerHash,
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 5,
        consumed: false,
        expiresAt: input.expiresAt,
      })
      .returning();
    return created;
  } catch (error) {
    markDatabaseOffline(error);
    return createSecurityChallengeMem(input);
  }
}

export async function getSecurityChallenge(challengeId: string) {
  if (!challengeId) return null;
  if (isMemoryFallbackActive()) return getSecurityChallengeMem(challengeId);
  try {
    const rows = await db
      .select()
      .from(securityChallenges)
      .where(eq(securityChallenges.challengeId, challengeId))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    markDatabaseOffline(error);
    return getSecurityChallengeMem(challengeId);
  }
}

export async function incrementChallengeAttempts(challengeId: string) {
  if (isMemoryFallbackActive()) return incrementChallengeAttemptsMem(challengeId);
  try {
    const cur = await getSecurityChallenge(challengeId);
    if (!cur) return null;
    const [updated] = await db
      .update(securityChallenges)
      .set({ attempts: cur.attempts + 1 })
      .where(eq(securityChallenges.challengeId, challengeId))
      .returning();
    return updated || null;
  } catch (error) {
    markDatabaseOffline(error);
    return incrementChallengeAttemptsMem(challengeId);
  }
}

export async function markChallengeConsumed(challengeId: string) {
  if (isMemoryFallbackActive()) return markChallengeConsumedMem(challengeId);
  try {
    const [updated] = await db
      .update(securityChallenges)
      .set({ consumed: true })
      .where(eq(securityChallenges.challengeId, challengeId))
      .returning();
    return updated || null;
  } catch (error) {
    markDatabaseOffline(error);
    return markChallengeConsumedMem(challengeId);
  }
}

// ============================================================================
// AUDIT LOGS REPOSITORY (Persistent Security & Web Audit Trail)
// ============================================================================
export async function createAuditLog(input: {
  eventId: string;
  actorUserId?: number | null;
  actorEmail?: string;
  actorRole?: string;
  targetUserId?: number | null;
  targetIdentifier?: string;
  action: string;
  category: string;
  status: string;
  severity: string;
  accountClassification?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}) {
  if (isMemoryFallbackActive()) return createAuditLogMem(input);
  try {
    await ensureDatabaseSeeded();
    const [created] = await db
      .insert(auditLogs)
      .values({
        eventId: input.eventId,
        actorUserId: input.actorUserId ?? null,
        actorEmail: input.actorEmail || "",
        actorRole: input.actorRole || "anonymous",
        targetUserId: input.targetUserId ?? null,
        targetIdentifier: input.targetIdentifier || "",
        action: input.action,
        category: input.category,
        status: input.status,
        severity: input.severity,
        accountClassification: input.accountClassification || "",
        ipAddress: input.ipAddress || "",
        userAgent: input.userAgent || "",
        details: input.details || "",
        metadata: input.metadata || {},
      })
      .returning();
    return created;
  } catch (error) {
    markDatabaseOffline(error);
    return createAuditLogMem(input);
  }
}

export async function listAuditLogs(filters?: {
  category?: string;
  status?: string;
  severity?: string;
  action?: string;
  search?: string;
  limit?: number;
}) {
  if (isMemoryFallbackActive()) return listAuditLogsMem(filters);
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));
    const q = (filters?.search || "").trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (filters?.category && row.category.toUpperCase() !== filters.category.toUpperCase()) return false;
      if (filters?.status && row.status.toUpperCase() !== filters.status.toUpperCase()) return false;
      if (filters?.severity && row.severity.toUpperCase() !== filters.severity.toUpperCase()) return false;
      if (filters?.action && !row.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
      if (q) {
        const hay = `${row.eventId} ${row.action} ${row.actorEmail || ""} ${row.targetIdentifier || ""} ${row.details || ""} ${row.ipAddress || ""} ${row.accountClassification || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 1000;
    return filtered.slice(0, limit);
  } catch (error) {
    markDatabaseOffline(error);
    return listAuditLogsMem(filters);
  }
}
