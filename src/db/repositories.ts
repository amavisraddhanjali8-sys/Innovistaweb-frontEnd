import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./index.ts";
import {
  appointmentDates,
  appointments,
  appointmentSlots,
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
  computeDefaultEndTime,
  formatTime24ToLabel,
  normalizeManagedSlot,
  normalizeSiteVisitScheduleConfig,
  normalizeSlotTime,
  sortManagedSlots,
  type ManagedSiteVisitDateConfig,
  type ManagedSiteVisitSlot,
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
    console.error("Error listing media assets:", error);
    throw new Error("Database query failed while loading media assets.", { cause: error });
  }
}

export async function createMediaAssetRecord(
  input: Parameters<typeof normalizeMediaAssetInput>[0] & { uploadedByUserId?: number | null }
) {
  const normalized = normalizeMediaAssetInput(input);
  if (normalized.valid === false) {
    throw new Error(normalized.error);
  }
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
    console.error("Error creating media asset:", error);
    throw new Error("Database query failed while saving media asset.", { cause: error });
  }
}

export async function ensureMediaAssetIdForUrl(
  url: string,
  title = "",
  entityScope = "general",
  uploadedByUserId: number | null = null
): Promise<number | null> {
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
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error("Error deleting media asset:", error);
    throw new Error("Database query failed while deleting media asset.", { cause: error });
  }
}

// ============================================================================
// USERS (ADMINS / STAFF / CUSTOMERS)
// ============================================================================
export async function listUsersByRoles(roles?: string[]) {
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
    console.error("Error listing users:", error);
    throw new Error("Database query failed while loading users.", { cause: error });
  }
}

export async function createUserAccount(payload: {
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: "admin" | "staff" | "customer";
  passwordHash?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  purchaseGoods?: string[];
}) {
  try {
    await ensureDatabaseSeeded();
    const cleanEmail = payload.email.trim().toLowerCase();
    const [created] = await db
      .insert(users)
      .values({
        uid: payload.uid || `${payload.role || "customer"}-${Date.now()}`,
        name: payload.name.trim(),
        email: cleanEmail,
        phone: payload.phone || "",
        company: payload.company || "",
        role: payload.role || "customer",
        passwordHash: payload.passwordHash || "",
        avatarUrl: payload.avatarUrl || "/assets/about/director.jpg",
        isVerified: payload.isVerified ?? payload.role !== "customer",
        isActive: true,
        purchaseGoods: payload.purchaseGoods || [],
      })
      .returning();
    return created;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Database query failed while creating user.", { cause: error });
  }
}

export async function updateUserAccount(
  id: number,
  patch: Partial<{
    name: string;
    email: string;
    phone: string;
    company: string;
    role: string;
    avatarUrl: string;
    isVerified: boolean;
    isActive: boolean;
    purchaseGoods: string[];
  }>
) {
  try {
    await ensureDatabaseSeeded();
    const [updated] = await db
      .update(users)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.company !== undefined ? { company: patch.company } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.isVerified !== undefined ? { isVerified: patch.isVerified } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.purchaseGoods !== undefined ? { purchaseGoods: patch.purchaseGoods } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated || null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Database query failed while updating user.", { cause: error });
  }
}

export async function deleteUserAccount(id: number) {
  try {
    await ensureDatabaseSeeded();
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted[0] || null;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Database query failed while deleting user.", { cause: error });
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

export async function listCategories(): Promise<ProductCategory[]> {
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.displayOrder), asc(categories.id));
    return rows.map(mapCategoryRow);
  } catch (error) {
    console.error("Error listing categories:", error);
    throw new Error("Database query failed while loading categories.", { cause: error });
  }
}

export async function createCategoryRecord(raw: Partial<ProductCategory>) {
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
    return mapCategoryRow(inserted);
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Database query failed while creating category.", { cause: error });
  }
}

export async function updateCategoryRecord(keyOrId: string, raw: Partial<ProductCategory>) {
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

    const current = mapCategoryRow(match);
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

    return mapCategoryRow(updated);
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Database query failed while updating category.", { cause: error });
  }
}

export async function reorderCategoryRecords(orderedIds: string[]): Promise<ProductCategory[]> {
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
    console.error("Error reordering categories:", error);
    throw new Error("Database query failed while reordering categories.", { cause: error });
  }
}

export async function deleteCategoryRecord(keyOrId: string) {
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
    console.error("Error deleting category:", error);
    throw new Error("Database query failed while deleting category.", { cause: error });
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
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(products).orderBy(asc(products.id));
    return await hydrateProducts(rows);
  } catch (error) {
    console.error("Error listing products:", error);
    throw new Error("Database query failed while loading products.", { cause: error });
  }
}

export async function getProductByAnyId(idOrKey: string | number): Promise<DesignItem | null> {
  try {
    await ensureDatabaseSeeded();
    const row = await resolveProductRowByAnyId(idOrKey);
    if (!row) return null;
    const hydrated = await hydrateProducts([row]);
    return hydrated[0] || null;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw new Error("Database query failed while fetching product.", { cause: error });
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
    console.error("Error creating product:", error);
    throw new Error("Database query failed while creating product.", { cause: error });
  }
}

export async function updateProductRecord(
  idOrKey: string | number,
  raw: Partial<DesignItem>
): Promise<DesignItem | null> {
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
    console.error("Error updating product:", error);
    throw new Error("Database query failed while updating product.", { cause: error });
  }
}

export async function deleteProductRecord(idOrKey: string | number): Promise<boolean> {
  try {
    await ensureDatabaseSeeded();
    const row = await resolveProductRowByAnyId(idOrKey);
    if (!row) return false;
    await db.delete(products).where(eq(products.id, row.id));
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("Database query failed while deleting product.", { cause: error });
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
  try {
    await ensureDatabaseSeeded();
    const [slotRows, dateRows, blockedDoc] = await Promise.all([
      db.select().from(appointmentSlots).orderBy(asc(appointmentSlots.sortOrder), asc(appointmentSlots.slotTime)),
      db.select().from(appointmentDates).orderBy(asc(appointmentDates.visitDate)),
      db.select().from(cmsDocuments).where(eq(cmsDocuments.key, "site_visit_blocked_keys")).limit(1),
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

    return normalizeSiteVisitScheduleConfig({
      defaultSlots,
      dates,
      blockedKeys,
    });
  } catch (error) {
    console.error("Error loading appointment schedule:", error);
    throw new Error("Database query failed while loading appointment schedule.", { cause: error });
  }
}

export async function listAppointments(): Promise<SiteVisitBooking[]> {
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));
    return rows.map(mapAppointmentRow);
  } catch (error) {
    console.error("Error listing appointments:", error);
    throw new Error("Database query failed while loading appointments.", { cause: error });
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
    console.error("Error creating appointment:", error);
    throw new Error("Database query failed while creating appointment.", { cause: error });
  }
}

export async function updateAppointmentStatusRecord(
  idOrCode: string,
  status: SiteVisitStatus
): Promise<SiteVisitBooking | null> {
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
    console.error("Error updating appointment status:", error);
    throw new Error("Database query failed while updating appointment.", { cause: error });
  }
}

export async function addAppointmentSlotRecord(
  date: string | undefined,
  slotInput: { time: string; endTime?: string; label?: string; available?: boolean }
) {
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

      const defaultRows = await db
        .select()
        .from(appointmentSlots)
        .orderBy(asc(appointmentSlots.sortOrder));
      const baseSlots: ManagedSiteVisitSlot[] =
        existing[0]?.customSlots && existing[0].customSlots.length > 0
          ? existing[0].customSlots
          : defaultRows.map((s) => ({
              id: s.slotKey,
              time: s.slotTime,
              endTime: s.endTime,
              label: s.label,
              available: s.available,
            }));

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
    console.error("Error adding appointment slot:", error);
    throw new Error("Database query failed while adding appointment slot.", { cause: error });
  }
}

export async function updateAppointmentSlotRecord(
  slotId: string,
  date: string | undefined,
  patch: Partial<ManagedSiteVisitSlot>
) {
  try {
    await ensureDatabaseSeeded();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const targetDate = date.trim();
      const existing = await db
        .select()
        .from(appointmentDates)
        .where(eq(appointmentDates.visitDate, targetDate))
        .limit(1);
      const defaultRows = await db
        .select()
        .from(appointmentSlots)
        .orderBy(asc(appointmentSlots.sortOrder));
      const baseSlots: ManagedSiteVisitSlot[] =
        existing[0]?.customSlots && existing[0].customSlots.length > 0
          ? existing[0].customSlots
          : defaultRows.map((s) => ({
              id: s.slotKey,
              time: s.slotTime,
              endTime: s.endTime,
              label: s.label,
              available: s.available,
            }));

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
    console.error("Error updating appointment slot:", error);
    throw new Error("Database query failed while updating appointment slot.", { cause: error });
  }
}

export async function deleteAppointmentSlotRecord(slotId: string, date?: string) {
  try {
    await ensureDatabaseSeeded();
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      const targetDate = date.trim();
      const existing = await db
        .select()
        .from(appointmentDates)
        .where(eq(appointmentDates.visitDate, targetDate))
        .limit(1);
      const defaultRows = await db
        .select()
        .from(appointmentSlots)
        .orderBy(asc(appointmentSlots.sortOrder));
      const baseSlots: ManagedSiteVisitSlot[] =
        existing[0]?.customSlots && existing[0].customSlots.length > 0
          ? existing[0].customSlots
          : defaultRows.map((s) => ({
              id: s.slotKey,
              time: s.slotTime,
              endTime: s.endTime,
              label: s.label,
              available: s.available,
            }));

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
    console.error("Error deleting appointment slot:", error);
    throw new Error("Database query failed while deleting appointment slot.", { cause: error });
  }
}

export async function upsertAppointmentDateRecord(input: {
  date: string;
  available?: boolean;
  note?: string;
  isCustom?: boolean;
}) {
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
        customSlots: existing[0]?.customSlots || [],
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
          updatedAt: new Date(),
        },
      });
    return await getAppointmentScheduleConfig();
  } catch (error) {
    console.error("Error upserting appointment date:", error);
    throw new Error("Database query failed while updating appointment date.", { cause: error });
  }
}

export async function deleteAppointmentDateRecord(date: string) {
  try {
    await ensureDatabaseSeeded();
    await db.delete(appointmentDates).where(eq(appointmentDates.visitDate, date.trim()));
    return await getAppointmentScheduleConfig();
  } catch (error) {
    console.error("Error deleting appointment date:", error);
    throw new Error("Database query failed while deleting appointment date.", { cause: error });
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
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));
    return rows.map(mapBlogRow);
  } catch (error) {
    console.error("Error listing blog posts:", error);
    throw new Error("Database query failed while loading blog posts.", { cause: error });
  }
}

export async function upsertBlogPostRecord(post: BlogPostItem): Promise<BlogPostItem> {
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
    console.error("Error saving blog post:", error);
    throw new Error("Database query failed while saving blog post.", { cause: error });
  }
}

export async function deleteBlogPostRecord(idOrSlug: string): Promise<boolean> {
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
    console.error("Error deleting blog post:", error);
    throw new Error("Database query failed while deleting blog post.", { cause: error });
  }
}

// ============================================================================
// PROJECTS REPOSITORY
// ============================================================================
export async function listProjects() {
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
    console.error("Error listing projects:", error);
    throw new Error("Database query failed while loading projects.", { cause: error });
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
    console.error("Error creating project:", error);
    throw new Error("Database query failed while creating project.", { cause: error });
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
    console.error("Error updating project:", error);
    throw new Error("Database query failed while updating project.", { cause: error });
  }
}

export async function deleteProjectRecord(projectId: number): Promise<boolean> {
  try {
    await ensureDatabaseSeeded();
    const deleted = await db.delete(projects).where(eq(projects.id, projectId)).returning();
    return deleted.length > 0;
  } catch (error) {
    console.error("Error deleting project:", error);
    throw new Error("Database query failed while deleting project.", { cause: error });
  }
}

// ============================================================================
// ORDERS & RFQS REPOSITORY
// ============================================================================
export async function listOrders() {
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
    console.error("Error listing orders:", error);
    throw new Error("Database query failed while loading orders.", { cause: error });
  }
}

export async function createOrderRecord(input: {
  Order_Status?: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Designs?: Array<{ DesignID?: string | number; Design_Name?: string; Design_Image?: string }>;
}) {
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
    console.error("Error creating order:", error);
    throw new Error("Database query failed while creating order.", { cause: error });
  }
}

export async function updateOrderStatusRecord(orderCode: string, status: string) {
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
    console.error("Error updating order status:", error);
    throw new Error("Database query failed while updating order status.", { cause: error });
  }
}

export async function createRfqRecord(
  input: Record<string, string>,
  attachments: Array<{ url: string; fileName: string; size?: number; mediaAssetId?: number | null }>
) {
  try {
    await ensureDatabaseSeeded();
    const [inserted] = await db
      .insert(rfqRequests)
      .values({
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
    console.error("Error creating RFQ request:", error);
    throw new Error("Database query failed while saving RFQ.", { cause: error });
  }
}

export async function listRfqRecords() {
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
    console.error("Error listing RFQ requests:", error);
    throw new Error("Database query failed while loading RFQs.", { cause: error });
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
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(customerFeedbacks)
      .orderBy(asc(customerFeedbacks.displayOrder), asc(customerFeedbacks.id));
    return rows.map(mapFeedbackRow);
  } catch (error) {
    console.error("Error listing feedbacks:", error);
    throw new Error("Database query failed while loading customer feedbacks.", { cause: error });
  }
}

export async function createFeedbackRecord(fb: Omit<CustomerFeedbackRecord, "Feed_backId">) {
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
    console.error("Error creating feedback:", error);
    throw new Error("Database query failed while saving feedback.", { cause: error });
  }
}

export async function updateFeedbackRecord(
  id: number,
  patch: Partial<CustomerFeedbackRecord>
): Promise<CustomerFeedbackRecord | null> {
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
    console.error("Error updating feedback:", error);
    throw new Error("Database query failed while updating feedback.", { cause: error });
  }
}

export async function deleteFeedbackRecord(id: number): Promise<boolean> {
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(customerFeedbacks)
      .where(eq(customerFeedbacks.id, id))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error("Error deleting feedback:", error);
    throw new Error("Database query failed while deleting feedback.", { cause: error });
  }
}

export async function reorderFeedbackRecords(orderedIds: number[]) {
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
    console.error("Error reordering feedbacks:", error);
    throw new Error("Database query failed while reordering feedbacks.", { cause: error });
  }
}

export async function listChatbotFaqs(): Promise<ChatbotFaqItem[]> {
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
    console.error("Error listing chatbot FAQs:", error);
    throw new Error("Database query failed while loading chatbot FAQs.", { cause: error });
  }
}

export async function upsertChatbotFaqRecord(faq: ChatbotFaqItem): Promise<ChatbotFaqItem> {
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
    console.error("Error saving chatbot FAQ:", error);
    throw new Error("Database query failed while saving chatbot FAQ.", { cause: error });
  }
}

export async function deleteChatbotFaqRecord(faqKey: string): Promise<boolean> {
  try {
    await ensureDatabaseSeeded();
    const deleted = await db
      .delete(chatbotFaqs)
      .where(eq(chatbotFaqs.faqKey, faqKey))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error("Error deleting chatbot FAQ:", error);
    throw new Error("Database query failed while deleting chatbot FAQ.", { cause: error });
  }
}

export async function listRelatedPortals(): Promise<RelatedPortalItem[]> {
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
    console.error("Error listing related portals:", error);
    throw new Error("Database query failed while loading portals.", { cause: error });
  }
}

export async function replaceRelatedPortals(items: RelatedPortalItem[]) {
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
    console.error("Error replacing related portals:", error);
    throw new Error("Database query failed while saving portals.", { cause: error });
  }
}

export async function listNotifications() {
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
    console.error("Error listing notifications:", error);
    throw new Error("Database query failed while loading notifications.", { cause: error });
  }
}

export async function markNotificationRead(notifKey?: string) {
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
    console.error("Error marking notification read:", error);
    throw new Error("Database query failed while updating notification.", { cause: error });
  }
}

export async function getCmsDoc<T>(key: string, fallback: T): Promise<T> {
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
    console.error(`Error fetching CMS document ${key}:`, error);
    throw new Error("Database query failed while loading CMS settings.", { cause: error });
  }
}

export async function setCmsDoc<T extends Record<string, unknown>>(
  key: string,
  payload: T,
  updatedByUserId: number | null = null
): Promise<T> {
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
    console.error(`Error saving CMS document ${key}:`, error);
    throw new Error("Database query failed while saving CMS settings.", { cause: error });
  }
}

export async function resetSeedDataCheck() {
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
}
