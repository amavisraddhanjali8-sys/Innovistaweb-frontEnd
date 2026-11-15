import { getMemoryStore, type MemoryMediaAssetRecord, type MemoryProjectRecord } from "./memoryStore.ts";
import {
  normalizeDesignItem,
  normalizeProductCategory,
  type DesignItem,
  type ProductCategory,
} from "../../shared/productCatalogHelpers.ts";
import {
  normalizeHeroTheme,
  type HeroThemeConfig,
} from "../../shared/heroThemeHelpers.ts";
import {
  applyMonthlyTemplateToSchedule,
  computeDefaultEndTime,
  deleteMonthlyTemplateFromSchedule,
  formatTime24ToLabel,
  normalizeManagedSlot,
  normalizeSiteVisitScheduleConfig,
  normalizeSlotTime,
  sortManagedSlots,
  type ManagedSiteVisitSlot,
  type MonthlySlotTemplate,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SiteVisitStatus,
} from "../../shared/siteVisitSchedulerHelpers.ts";
import type { BlogPostItem } from "../../shared/blogBloggerHelpers.ts";
import type { CustomerFeedbackRecord } from "../../shared/customerFeedbackHelpers.ts";
import type { ChatbotFaqItem } from "../../shared/chatbotHelpers.ts";
import type { RelatedPortalItem } from "../../shared/siteContentHelpers.ts";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
  normalizeMediaAssetInput,
} from "../../shared/mediaAssetHelpers.ts";

// ============================================================================
// MEDIA ASSETS
// ============================================================================
export function listMediaAssetsMem(filters?: {
  kind?: string;
  sourceType?: string;
  entityScope?: string;
}): MemoryMediaAssetRecord[] {
  const store = getMemoryStore();
  return [...store.mediaAssets]
    .sort((a, b) => b.id - a.id)
    .filter((row) => {
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
}

export function createMediaAssetRecordMem(
  input: Parameters<typeof normalizeMediaAssetInput>[0] & { uploadedByUserId?: number | null }
): MemoryMediaAssetRecord {
  const normalized = normalizeMediaAssetInput(input);
  if (normalized.valid === false) {
    throw new Error(normalized.error);
  }
  const store = getMemoryStore();
  const data = normalized.data;
  const created: MemoryMediaAssetRecord = {
    id: store.nextMediaId++,
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
    createdAt: new Date(),
  };
  store.mediaAssets.push(created);
  return created;
}

export function ensureMediaAssetIdForUrlMem(
  url: string,
  title = "",
  entityScope = "general",
  uploadedByUserId: number | null = null
): number | null {
  const clean = (url || "").trim();
  if (!clean) return null;
  const store = getMemoryStore();
  const existing = store.mediaAssets.find((a) => a.publicUrl === clean);
  if (existing) return existing.id;
  const created: MemoryMediaAssetRecord = {
    id: store.nextMediaId++,
    kind: inferMediaKindFromUrlOrMime(clean),
    sourceType: inferSourceTypeFromUrl(clean),
    title: title || clean.split("/").pop() || "asset",
    originalName: clean.split("/").pop() || "asset",
    storageKey: clean.startsWith("/uploads/") ? clean.replace(/^\/+/, "") : "",
    publicUrl: clean,
    mimeType: "",
    fileSizeBytes: null,
    altText: title || "Architectural media asset",
    entityScope,
    uploadedByUserId,
    createdAt: new Date(),
  };
  store.mediaAssets.push(created);
  return created.id;
}

export function deleteMediaAssetRecordMem(id: number): MemoryMediaAssetRecord | null {
  const store = getMemoryStore();
  const idx = store.mediaAssets.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const [removed] = store.mediaAssets.splice(idx, 1);
  return removed;
}

// ============================================================================
// USERS
// ============================================================================
export function listUsersByRolesMem(roles?: string[]) {
  const store = getMemoryStore();
  const filtered =
    roles && roles.length > 0
      ? store.users.filter((u) => roles.includes(u.role))
      : store.users;
  return [...filtered].sort((a, b) => a.id - b.id);
}

export function createUserAccountMem(payload: {
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
  authProvider?: string;
  notes?: string;
  purchaseGoods?: string[];
}) {
  const store = getMemoryStore();
  const now = new Date();
  const created = {
    id: store.nextUserId++,
    uid: payload.uid || `${payload.role || "customer"}-${Date.now()}`,
    username: payload.username ? payload.username.trim().toLowerCase() : null,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
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
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: "",
    isActive: (payload.accountStatus || "ACTIVE") !== "SUSPENDED",
    authProvider: payload.authProvider || "local",
    lastPasswordChangedAt: payload.passwordHash ? now : null,
    suspendedAt: (payload.accountStatus || "ACTIVE") === "SUSPENDED" ? now : null,
    suspensionReason: "",
    notes: payload.notes || "",
    purchaseGoods: payload.purchaseGoods || [],
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(created);
  return created;
}

export function updateUserAccountMem(
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
    authProvider: string;
    lastPasswordChangedAt: Date | null;
    suspendedAt: Date | null;
    suspensionReason: string;
    notes: string;
    purchaseGoods: string[];
  }>
) {
  const store = getMemoryStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) return null;
  if (patch.username !== undefined) user.username = patch.username ? patch.username.trim().toLowerCase() : null;
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.email !== undefined) user.email = patch.email.trim().toLowerCase();
  if (patch.phone !== undefined) user.phone = patch.phone;
  if (patch.company !== undefined) user.company = patch.company;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.passwordHash !== undefined) {
    user.passwordHash = patch.passwordHash;
    user.lastPasswordChangedAt = patch.lastPasswordChangedAt ?? new Date();
  }
  if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
  if (patch.isVerified !== undefined) user.isVerified = patch.isVerified;
  if (patch.emailVerified !== undefined) user.emailVerified = patch.emailVerified;
  if (patch.accountStatus !== undefined) {
    user.accountStatus = patch.accountStatus;
    user.isActive = patch.accountStatus !== "SUSPENDED";
    user.suspendedAt = patch.accountStatus === "SUSPENDED" ? (patch.suspendedAt ?? new Date()) : null;
  }
  if (patch.emailVerificationTokenHash !== undefined)
    user.emailVerificationTokenHash = patch.emailVerificationTokenHash;
  if (patch.emailVerificationCodeHash !== undefined)
    user.emailVerificationCodeHash = patch.emailVerificationCodeHash;
  if (patch.emailVerificationExpiresAt !== undefined)
    user.emailVerificationExpiresAt = patch.emailVerificationExpiresAt;
  if (patch.totpSecretEncrypted !== undefined) user.totpSecretEncrypted = patch.totpSecretEncrypted;
  if (patch.totpEnabled !== undefined) user.totpEnabled = patch.totpEnabled;
  if (patch.failedLoginAttempts !== undefined) user.failedLoginAttempts = patch.failedLoginAttempts;
  if (patch.lockedUntil !== undefined) user.lockedUntil = patch.lockedUntil;
  if (patch.lastLoginAt !== undefined) user.lastLoginAt = patch.lastLoginAt;
  if (patch.lastLoginIp !== undefined) user.lastLoginIp = patch.lastLoginIp;
  if (patch.isActive !== undefined) user.isActive = patch.isActive;
  if (patch.authProvider !== undefined) user.authProvider = patch.authProvider;
  if (patch.lastPasswordChangedAt !== undefined) user.lastPasswordChangedAt = patch.lastPasswordChangedAt;
  if (patch.suspendedAt !== undefined) user.suspendedAt = patch.suspendedAt;
  if (patch.suspensionReason !== undefined) user.suspensionReason = patch.suspensionReason;
  if (patch.notes !== undefined) user.notes = patch.notes;
  if (patch.purchaseGoods !== undefined) user.purchaseGoods = patch.purchaseGoods;
  user.updatedAt = new Date();
  return user;
}

export function deleteUserAccountMem(id: number) {
  const store = getMemoryStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const [removed] = store.users.splice(idx, 1);
  return removed;
}

// ============================================================================
// CATEGORIES
// ============================================================================
export function listCategoriesMem(): ProductCategory[] {
  return [...getMemoryStore().categories].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function createCategoryRecordMem(raw: Partial<ProductCategory>): ProductCategory {
  const store = getMemoryStore();
  const normalized = normalizeProductCategory(raw, store.categories.length);
  ensureMediaAssetIdForUrlMem(normalized.coverImage, normalized.name, "category");
  store.categories.push(normalized);
  return normalized;
}

export function updateCategoryRecordMem(
  keyOrId: string,
  raw: Partial<ProductCategory>
): ProductCategory | null {
  const store = getMemoryStore();
  const idx = store.categories.findIndex(
    (c, i) =>
      c.CategoryID === keyOrId || c.slug === keyOrId || String(i + 1) === String(keyOrId)
  );
  if (idx === -1) return null;
  const current = store.categories[idx];
  const normalized = normalizeProductCategory(
    { ...current, ...raw, CategoryID: current.CategoryID },
    current.displayOrder
  );
  ensureMediaAssetIdForUrlMem(normalized.coverImage, normalized.name, "category");
  store.categories[idx] = normalized;
  return normalized;
}

export function applyHeroThemeToAllCategoriesMem(
  rawTheme: Partial<HeroThemeConfig>
): ProductCategory[] {
  const store = getMemoryStore();
  const normalizedTheme = normalizeHeroTheme(rawTheme);
  store.categories = store.categories.map((cat) => ({
    ...cat,
    heroTheme: { ...normalizedTheme },
  }));
  return listCategoriesMem();
}

export function reorderCategoryRecordsMem(orderedIds: string[]): ProductCategory[] {
  const store = getMemoryStore();
  orderedIds.forEach((id, orderIdx) => {
    const target = store.categories.find((c) => c.CategoryID === id || c.slug === id);
    if (target) {
      target.displayOrder = orderIdx;
    }
  });
  return listCategoriesMem();
}

export function deleteCategoryRecordMem(keyOrId: string): ProductCategory | null {
  const store = getMemoryStore();
  const idx = store.categories.findIndex(
    (c, i) =>
      c.CategoryID === keyOrId || c.slug === keyOrId || String(i + 1) === String(keyOrId)
  );
  if (idx === -1) return null;
  const [removed] = store.categories.splice(idx, 1);
  return removed;
}

// ============================================================================
// PRODUCTS (DESIGNS)
// ============================================================================
export function listProductsMem(): DesignItem[] {
  return [...getMemoryStore().products];
}

export function getProductByAnyIdMem(idOrKey: string | number): DesignItem | null {
  const target = String(idOrKey).trim();
  const store = getMemoryStore();
  return (
    store.products.find(
      (p) =>
        String(p.DesignID) === target ||
        p.Design_Name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target.toLowerCase()
    ) || null
  );
}

export function createProductRecordMem(raw: Partial<DesignItem>): DesignItem {
  const store = getMemoryStore();
  const maxId = store.products.reduce((acc, p) => {
    const n = Number(p.DesignID);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  const nextId = raw.DesignID ? Number(raw.DesignID) || raw.DesignID : maxId + 1;
  const normalized = normalizeDesignItem({
    ...raw,
    DesignID: nextId,
    Design_CreatedAt: raw.Design_CreatedAt || new Date().toISOString(),
  });
  normalized.Design_Image.forEach((img, idx) =>
    ensureMediaAssetIdForUrlMem(img, `${normalized.Design_Name} #${idx + 1}`, "product")
  );
  store.products.push(normalized);
  return normalized;
}

export function updateProductRecordMem(
  idOrKey: string | number,
  raw: Partial<DesignItem>
): DesignItem | null {
  const store = getMemoryStore();
  const target = String(idOrKey).trim();
  const idx = store.products.findIndex((p) => String(p.DesignID) === target);
  if (idx === -1) return null;
  const current = store.products[idx];
  const normalized = normalizeDesignItem({
    ...current,
    ...raw,
    DesignID: current.DesignID,
  });
  store.products[idx] = normalized;
  return normalized;
}

export function deleteProductRecordMem(idOrKey: string | number): boolean {
  const store = getMemoryStore();
  const target = String(idOrKey).trim();
  const idx = store.products.findIndex((p) => String(p.DesignID) === target);
  if (idx === -1) return false;
  store.products.splice(idx, 1);
  return true;
}

// ============================================================================
// APPOINTMENTS & TIME SLOTS
// ============================================================================
export function getAppointmentScheduleConfigMem(): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  const blockedDoc = store.cmsDocs.get("site_visit_blocked_keys") as
    | { blockedKeys?: string[] }
    | undefined;
  const monthlyDoc = store.cmsDocs.get("site_visit_monthly_templates") as
    | { monthlyTemplates?: Record<string, MonthlySlotTemplate> }
    | undefined;
  return normalizeSiteVisitScheduleConfig({
    defaultSlots: store.appointmentSlots,
    dates: store.appointmentDates,
    blockedKeys: Array.isArray(blockedDoc?.blockedKeys) ? blockedDoc.blockedKeys : [],
    monthlyTemplates: monthlyDoc?.monthlyTemplates || {},
  });
}

export function listAppointmentsMem(): SiteVisitBooking[] {
  return [...getMemoryStore().appointments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function createAppointmentRecordMem(input: {
  date: string;
  slotTime: string;
  slotLabel?: string;
  locationName?: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  notes?: string;
}): SiteVisitBooking {
  const store = getMemoryStore();
  const normalizedTime = normalizeSlotTime(input.slotTime);
  const matchingSlot = store.appointmentSlots.find((s) => s.time === normalizedTime);
  const bookingCode = `SV-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-3)}`;
  const booking: SiteVisitBooking = {
    id: bookingCode,
    date: input.date.trim(),
    slotTime: normalizedTime,
    slotLabel: input.slotLabel || matchingSlot?.label || formatTime24ToLabel(normalizedTime),
    locationName: input.locationName || "Nawala Showroom & Consultation",
    visitorName: input.visitorName.trim(),
    visitorEmail: input.visitorEmail.trim(),
    visitorPhone: input.visitorPhone.trim(),
    notes: (input.notes || "").trim(),
    status: "CONFIRMED",
    calendarEventId: "",
    emailSent: false,
    createdAt: new Date().toISOString(),
  };
  store.appointments.unshift(booking);
  return booking;
}

export function updateAppointmentStatusRecordMem(
  idOrCode: string,
  status: SiteVisitStatus
): SiteVisitBooking | null {
  const store = getMemoryStore();
  const target = store.appointments.find((a) => a.id === idOrCode);
  if (!target) return null;
  target.status = status;
  return target;
}

export function updateAppointmentMetadataRecordMem(
  idOrCode: string,
  patch: { status?: SiteVisitStatus; calendarEventId?: string; emailSent?: boolean }
): SiteVisitBooking | null {
  const store = getMemoryStore();
  const target = store.appointments.find((a) => a.id === idOrCode);
  if (!target) return null;
  if (patch.status) target.status = patch.status;
  if (typeof patch.calendarEventId === "string") target.calendarEventId = patch.calendarEventId;
  if (typeof patch.emailSent === "boolean") target.emailSent = patch.emailSent;
  return target;
}

function getBaseSlotsForDateMem(date: string): ManagedSiteVisitSlot[] {
  const schedule = getAppointmentScheduleConfigMem();
  const existing = schedule.dates[date];
  if (existing?.slots && existing.slots.length > 0) return existing.slots;
  const monthCfg = /^\d{4}-\d{2}/.test(date)
    ? schedule.monthlyTemplates?.[date.slice(0, 7)]
    : undefined;
  if (monthCfg?.slots && monthCfg.slots.length > 0) return monthCfg.slots;
  return schedule.defaultSlots;
}

export function addAppointmentSlotRecordMem(
  date: string | undefined,
  slotInput: { time: string; endTime?: string; label?: string; available?: boolean }
): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  const normTime = normalizeSlotTime(slotInput.time);
  const normalized = normalizeManagedSlot({
    id: `slot-${normTime.replace(":", "")}-${Date.now().toString(36)}`,
    time: normTime,
    endTime: slotInput.endTime
      ? normalizeSlotTime(slotInput.endTime)
      : computeDefaultEndTime(normTime),
    label: slotInput.label?.trim() || formatTime24ToLabel(normTime),
    available: slotInput.available ?? true,
  });

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const targetDate = date.trim();
    const existing = store.appointmentDates[targetDate];
    const baseSlots = getBaseSlotsForDateMem(targetDate);
    const nextSlots = sortManagedSlots([
      ...baseSlots.filter((s) => s.time !== normalized.time),
      normalized,
    ]);
    store.appointmentDates[targetDate] = {
      date: targetDate,
      available: existing?.available ?? true,
      note: existing?.note || "",
      isCustom: existing?.isCustom ?? false,
      slots: nextSlots,
    };
  } else {
    const idx = store.appointmentSlots.findIndex((s) => s.time === normalized.time);
    if (idx !== -1) {
      store.appointmentSlots[idx] = {
        ...store.appointmentSlots[idx],
        endTime: normalized.endTime,
        label: normalized.label,
        available: normalized.available,
      };
    } else {
      store.appointmentSlots.push(normalized);
      store.appointmentSlots = sortManagedSlots(store.appointmentSlots);
    }
  }
  return getAppointmentScheduleConfigMem();
}

export function updateAppointmentSlotRecordMem(
  slotId: string,
  date: string | undefined,
  patch: Partial<ManagedSiteVisitSlot>
): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const targetDate = date.trim();
    const existing = store.appointmentDates[targetDate];
    const baseSlots = getBaseSlotsForDateMem(targetDate);
    const nextSlots = sortManagedSlots(
      baseSlots.map((s) =>
        s.id === slotId || s.time === slotId
          ? normalizeManagedSlot({ ...s, ...patch, id: s.id })
          : s
      )
    );
    store.appointmentDates[targetDate] = {
      date: targetDate,
      available: existing?.available ?? true,
      note: existing?.note || "",
      isCustom: existing?.isCustom ?? false,
      slots: nextSlots,
    };
  } else {
    store.appointmentSlots = sortManagedSlots(
      store.appointmentSlots.map((s) => {
        if (s.id !== slotId && s.time !== slotId) return s;
        const nextTime = patch.time ? normalizeSlotTime(patch.time) : s.time;
        const nextEndTime = patch.endTime
          ? normalizeSlotTime(patch.endTime)
          : patch.time
          ? computeDefaultEndTime(nextTime)
          : s.endTime;
        const nextLabel =
          patch.label?.trim() || (patch.time ? formatTime24ToLabel(nextTime) : s.label);
        return {
          ...s,
          time: nextTime,
          endTime: nextEndTime,
          label: nextLabel,
          available: typeof patch.available === "boolean" ? patch.available : s.available,
        };
      })
    );
  }
  return getAppointmentScheduleConfigMem();
}

export function deleteAppointmentSlotRecordMem(
  slotId: string,
  date?: string
): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const targetDate = date.trim();
    const existing = store.appointmentDates[targetDate];
    const baseSlots = getBaseSlotsForDateMem(targetDate);
    store.appointmentDates[targetDate] = {
      date: targetDate,
      available: existing?.available ?? true,
      note: existing?.note || "",
      isCustom: existing?.isCustom ?? false,
      slots: baseSlots.filter((s) => s.id !== slotId && s.time !== slotId),
    };
  } else {
    store.appointmentSlots = store.appointmentSlots.filter(
      (s) => s.id !== slotId && s.time !== slotId
    );
  }
  return getAppointmentScheduleConfigMem();
}

export function upsertAppointmentDateRecordMem(input: {
  date: string;
  available?: boolean;
  note?: string;
  isCustom?: boolean;
  resetSlots?: boolean;
}): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  const visitDate = input.date.trim();
  const existing = store.appointmentDates[visitDate];
  store.appointmentDates[visitDate] = {
    date: visitDate,
    available: typeof input.available === "boolean" ? input.available : existing?.available ?? true,
    note: input.note !== undefined ? input.note : existing?.note || "",
    isCustom: input.isCustom !== undefined ? input.isCustom : existing?.isCustom ?? true,
    ...(input.resetSlots ? {} : existing?.slots ? { slots: existing.slots } : {}),
  };
  return getAppointmentScheduleConfigMem();
}

export function deleteAppointmentDateRecordMem(date: string): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  delete store.appointmentDates[date.trim()];
  return getAppointmentScheduleConfigMem();
}

export function upsertMonthlyTemplateRecordMem(input: {
  monthKey: string;
  slots: Partial<ManagedSiteVisitSlot>[];
  activeWeekdays?: number[];
  closedDates?: string[];
  note?: string;
  clearPerDateCustomSlots?: boolean;
}): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  const current = getAppointmentScheduleConfigMem();
  const updated = applyMonthlyTemplateToSchedule(current, input);
  store.appointmentDates = updated.dates;
  store.cmsDocs.set("site_visit_monthly_templates", {
    monthlyTemplates: updated.monthlyTemplates || {},
  });
  return getAppointmentScheduleConfigMem();
}

export function deleteMonthlyTemplateRecordMem(monthKey: string): SiteVisitScheduleConfig {
  const store = getMemoryStore();
  const current = getAppointmentScheduleConfigMem();
  const updated = deleteMonthlyTemplateFromSchedule(current, monthKey);
  store.cmsDocs.set("site_visit_monthly_templates", {
    monthlyTemplates: updated.monthlyTemplates || {},
  });
  return getAppointmentScheduleConfigMem();
}

// ============================================================================
// BLOG POSTS
// ============================================================================
export function listBlogPostsMem(): BlogPostItem[] {
  return [...getMemoryStore().blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );
}

export function upsertBlogPostRecordMem(post: BlogPostItem): BlogPostItem {
  const store = getMemoryStore();
  ensureMediaAssetIdForUrlMem(post.coverImage, post.title, "blog");
  const idx = store.blogPosts.findIndex((p) => p.id === post.id);
  if (idx !== -1) {
    store.blogPosts[idx] = { ...post };
  } else {
    store.blogPosts.push({ ...post });
  }
  return post;
}

export function deleteBlogPostRecordMem(idOrSlug: string): boolean {
  const store = getMemoryStore();
  const idx = store.blogPosts.findIndex((p) => p.id === idOrSlug);
  if (idx === -1) return false;
  store.blogPosts.splice(idx, 1);
  return true;
}

// ============================================================================
// PROJECTS
// ============================================================================
export function listProjectsMem(): MemoryProjectRecord[] {
  return [...getMemoryStore().projects].sort((a, b) => a.ProjectID - b.ProjectID);
}

export function createProjectRecordMem(input: {
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
}): MemoryProjectRecord {
  const store = getMemoryStore();
  const imgs = Array.isArray(input.Project_Images)
    ? input.Project_Images.map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const created: MemoryProjectRecord = {
    ProjectID: store.nextProjectId++,
    Project_Title: input.Project_Title,
    Project_Description: input.Project_Description || "",
    Project_Images: imgs,
    Location: input.Location || "",
    Client_Name: input.Client_Name,
    Client_Email: input.Client_Email || "",
    Client_Number: input.Client_Number || "",
    Client_Company: input.Client_Company || "",
    Project_CreatedAt: new Date().toISOString(),
    Project_FinishedDate: input.Project_FinishedDate || null,
    Budget: Number(input.Budget || 0),
  };
  imgs.forEach((img, i) =>
    ensureMediaAssetIdForUrlMem(img, `${created.Project_Title} #${i + 1}`, "project")
  );
  store.projects.push(created);
  return created;
}

export function updateProjectRecordMem(
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
): MemoryProjectRecord | null {
  const store = getMemoryStore();
  const proj = store.projects.find((p) => p.ProjectID === projectId);
  if (!proj) return null;
  if (input.Project_Title !== undefined) proj.Project_Title = input.Project_Title;
  if (input.Project_Description !== undefined) proj.Project_Description = input.Project_Description;
  if (input.Location !== undefined) proj.Location = input.Location;
  if (input.Client_Name !== undefined) proj.Client_Name = input.Client_Name;
  if (input.Client_Email !== undefined) proj.Client_Email = input.Client_Email;
  if (input.Client_Number !== undefined) proj.Client_Number = input.Client_Number;
  if (input.Client_Company !== undefined) proj.Client_Company = input.Client_Company;
  if (input.Project_FinishedDate !== undefined) proj.Project_FinishedDate = input.Project_FinishedDate;
  if (input.Budget !== undefined) proj.Budget = Number(input.Budget || 0);
  if (Array.isArray(input.Project_Images)) {
    proj.Project_Images = input.Project_Images.map((s) =>
      typeof s === "string" ? s.trim() : ""
    )
      .filter(Boolean)
      .slice(0, 3);
    proj.Project_Images.forEach((img, i) =>
      ensureMediaAssetIdForUrlMem(img, `${proj.Project_Title} #${i + 1}`, "project")
    );
  }
  return proj;
}

export function deleteProjectRecordMem(projectId: number): boolean {
  const store = getMemoryStore();
  const idx = store.projects.findIndex((p) => p.ProjectID === projectId);
  if (idx === -1) return false;
  store.projects.splice(idx, 1);
  return true;
}

// ============================================================================
// ORDERS & RFQS
// ============================================================================
export function listOrdersMem() {
  return [...getMemoryStore().orders].sort((a, b) =>
    b.Order_Date.localeCompare(a.Order_Date)
  );
}

export function createOrderRecordMem(input: {
  Order_Status?: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Inquiry_Type?: string;
  Subject?: string;
  Notes?: string;
  Source?: string;
  Designs?: Array<{
    DesignID?: string | number;
    Design_Name?: string;
    Design_Image?: string;
    Color?: string;
    Size?: string;
    Quantity?: number;
    Notes?: string;
  }>;
}) {
  const store = getMemoryStore();
  const orderCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const matchedCustomer = store.users.find(
    (u) => u.email.toLowerCase() === input.Client_Email.trim().toLowerCase()
  );

  const designList = Array.isArray(input.Designs) ? input.Designs : [];
  const items = designList.map((entry) => {
    const prod =
      entry.DesignID !== undefined ? getProductByAnyIdMem(entry.DesignID) : null;
    const qty = Number.isFinite(Number(entry.Quantity)) && Number(entry.Quantity) > 0
      ? Math.floor(Number(entry.Quantity))
      : 1;
    return {
      Design: {
        Design_Name: prod?.Design_Name || entry.Design_Name || "Custom Architectural Design",
        Design_Image: prod?.Design_Image?.[0] || entry.Design_Image || "/assets/products/door.jpg",
        ...(entry.Color ? { Color: entry.Color } : {}),
        ...(entry.Size ? { Size: entry.Size } : {}),
        Quantity: qty,
        ...(entry.Notes ? { Notes: entry.Notes } : {}),
      },
    };
  });

  const order = {
    OrderID: orderCode,
    Order_Date: new Date().toISOString(),
    Order_Status: input.Order_Status || "PENDING",
    Client_Name: input.Client_Name,
    Client_Email: input.Client_Email,
    Client_Number: input.Client_Number || "",
    Inquiry_Type: input.Inquiry_Type || "Product Quote",
    Subject: input.Subject || "",
    Notes: input.Notes || "",
    Source: input.Source || "web",
    Customer: {
      Cus_CompanyName: matchedCustomer?.company || "New Client",
      Cus_Logo: matchedCustomer?.avatarUrl || "/assets/logos/client-zenith.svg",
      Purchase_Goods: matchedCustomer?.purchaseGoods || ["Custom Inquiry"],
    },
    Designs: items,
  };
  store.orders.unshift(order);
  store.notifications.unshift({
    id: `notif-${Date.now()}`,
    NotificationsID: `notif-${Date.now()}`,
    Notifications_Title: "New Order / Quote Request",
    Notifications_Body: `${input.Client_Name} submitted inquiry ${orderCode}.`,
    category: "ORDER",
    relatedEntityType: "order",
    relatedEntityId: orderCode,
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  });
  return order;
}

export function updateOrderStatusRecordMem(orderCode: string, status: string) {
  const store = getMemoryStore();
  const order = store.orders.find((o) => o.OrderID === orderCode);
  if (!order) return null;
  order.Order_Status = status as "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  return order;
}

export function createRfqRecordMem(
  input: Record<string, string>,
  attachments: Array<{ url: string; fileName: string; size?: number; mediaAssetId?: number | null }>
) {
  const store = getMemoryStore();
  const rfqId = store.nextRfqId++;
  const now = new Date();
  const normalizedEmail = (input.email || "").trim().toLowerCase();
  const matchedCustomer = normalizedEmail
    ? store.users.find((u) => u.email.trim().toLowerCase() === normalizedEmail)
    : undefined;
  const parsedUserId = input.customerUserId ? Number(input.customerUserId) : NaN;
  const resolvedCustomerUserId =
    Number.isFinite(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : matchedCustomer?.id ?? null;
  const rfqCode = `RFQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const rfq = {
    id: rfqId,
    rfqCode,
    customerUserId: resolvedCustomerUserId,
    assignedAdminId: null,
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
    estimatedQuoteAmount: null,
    currency: "LKR",
    adminNotes: "",
    reviewedAt: null,
    status: "NEW",
    createdAt: now,
    attachments: attachments.map((att) => ({
      id: store.nextRfqAttachmentId++,
      rfqId,
      mediaAssetId: att.mediaAssetId ?? null,
      fileUrl: att.url,
      fileName: att.fileName,
      fileSizeBytes: att.size ?? null,
      createdAt: now,
    })),
  };
  store.rfqs.unshift(rfq);
  store.notifications.unshift({
    id: `notif-rfq-${rfqId}-${Date.now()}`,
    NotificationsID: `notif-rfq-${rfqId}-${Date.now()}`,
    Notifications_Title: "New Detailed RFQ Submitted",
    Notifications_Body: `${rfq.clientName} requested quotation for "${rfq.projectTitle}".`,
    category: "RFQ",
    relatedEntityType: "rfq",
    relatedEntityId: String(rfqId),
    Date_Timestamp: now.toISOString(),
    isRead: false,
  });
  return rfq;
}

export function listRfqRecordsMem() {
  return [...getMemoryStore().rfqs];
}

export function updateRfqRecordMem(
  id: number,
  patch: {
    status?: string;
    adminNotes?: string;
    estimatedQuoteAmount?: string | number | null;
    currency?: string;
    assignedAdminId?: number | null;
  }
) {
  const store = getMemoryStore();
  const rfq = store.rfqs.find((r) => r.id === id);
  if (!rfq) return null;
  if (patch.status !== undefined) {
    rfq.status = patch.status;
    rfq.reviewedAt = new Date();
  }
  if (patch.adminNotes !== undefined) rfq.adminNotes = patch.adminNotes;
  if (patch.estimatedQuoteAmount !== undefined) {
    rfq.estimatedQuoteAmount =
      patch.estimatedQuoteAmount === null ? null : String(patch.estimatedQuoteAmount);
  }
  if (patch.currency !== undefined) rfq.currency = patch.currency;
  if (patch.assignedAdminId !== undefined) rfq.assignedAdminId = patch.assignedAdminId;
  return rfq;
}

// ============================================================================
// FEEDBACKS, CHATBOT FAQS, PORTALS, NOTIFICATIONS & CMS DOCS
// ============================================================================
export function listFeedbacksMem(): CustomerFeedbackRecord[] {
  return [...getMemoryStore().feedbacks].sort(
    (a, b) => a.displayOrder - b.displayOrder || Number(a.Feed_backId) - Number(b.Feed_backId)
  );
}

export function createFeedbackRecordMem(
  fb: Omit<CustomerFeedbackRecord, "Feed_backId">
): CustomerFeedbackRecord {
  const store = getMemoryStore();
  const created: CustomerFeedbackRecord = {
    ...fb,
    Feed_backId: store.nextFeedbackId++,
    createdAt: fb.createdAt || new Date().toISOString(),
  };
  store.feedbacks.push(created);
  return created;
}

export function updateFeedbackRecordMem(
  id: number,
  patch: Partial<CustomerFeedbackRecord>
): CustomerFeedbackRecord | null {
  const store = getMemoryStore();
  const idx = store.feedbacks.findIndex((f) => Number(f.Feed_backId) === id);
  if (idx === -1) return null;
  const cur = store.feedbacks[idx];
  const updated: CustomerFeedbackRecord = {
    ...cur,
    ...patch,
    Customer: {
      ...cur.Customer,
      ...(patch.Customer || {}),
    },
    Design: {
      ...cur.Design,
      ...(patch.Design || {}),
    },
    Feed_backId: cur.Feed_backId,
  };
  store.feedbacks[idx] = updated;
  return updated;
}

export function deleteFeedbackRecordMem(id: number): boolean {
  const store = getMemoryStore();
  const idx = store.feedbacks.findIndex((f) => Number(f.Feed_backId) === id);
  if (idx === -1) return false;
  store.feedbacks.splice(idx, 1);
  return true;
}

export function reorderFeedbackRecordsMem(orderedIds: number[]): CustomerFeedbackRecord[] {
  const store = getMemoryStore();
  orderedIds.forEach((id, i) => {
    const fb = store.feedbacks.find((f) => Number(f.Feed_backId) === id);
    if (fb) fb.displayOrder = i;
  });
  return listFeedbacksMem();
}

export function listChatbotFaqsMem(): ChatbotFaqItem[] {
  return [...getMemoryStore().chatbotFaqs].sort((a, b) => b.priority - a.priority);
}

export function upsertChatbotFaqRecordMem(faq: ChatbotFaqItem): ChatbotFaqItem {
  const store = getMemoryStore();
  const next: ChatbotFaqItem = {
    ...faq,
    updatedAt: new Date().toISOString(),
  };
  const idx = store.chatbotFaqs.findIndex((f) => f.id === faq.id);
  if (idx !== -1) {
    store.chatbotFaqs[idx] = next;
  } else {
    store.chatbotFaqs.push(next);
  }
  return next;
}

export function deleteChatbotFaqRecordMem(faqKey: string): boolean {
  const store = getMemoryStore();
  const idx = store.chatbotFaqs.findIndex((f) => f.id === faqKey);
  if (idx === -1) return false;
  store.chatbotFaqs.splice(idx, 1);
  return true;
}

export function listRelatedPortalsMem(): RelatedPortalItem[] {
  return [...getMemoryStore().relatedPortals];
}

export function replaceRelatedPortalsMem(items: RelatedPortalItem[]): RelatedPortalItem[] {
  const store = getMemoryStore();
  store.relatedPortals = items.map((p) => ({ ...p }));
  return listRelatedPortalsMem();
}

export function listNotificationsMem() {
  return [...getMemoryStore().notifications].sort((a, b) =>
    b.Date_Timestamp.localeCompare(a.Date_Timestamp)
  );
}

export function markNotificationReadMem(notifKey?: string): boolean {
  const store = getMemoryStore();
  store.notifications.forEach((n) => {
    if (!notifKey || n.NotificationsID === notifKey) {
      n.isRead = true;
    }
  });
  return true;
}

export function createNotificationRecordMem(input: {
  title: string;
  body: string;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  notifKey?: string;
}) {
  const store = getMemoryStore();
  const id =
    input.notifKey || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const notif = {
    id,
    NotificationsID: id,
    Notifications_Title: input.title,
    Notifications_Body: input.body,
    category: input.category || "GENERAL",
    relatedEntityType: input.relatedEntityType || "",
    relatedEntityId: input.relatedEntityId || "",
    metadata: input.metadata || {},
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  };
  store.notifications.unshift(notif);
  return notif;
}

export function getCmsDocMem<T>(key: string, fallback: T): T {
  const store = getMemoryStore();
  const found = store.cmsDocs.get(key);
  if (!found) return fallback;
  return found as unknown as T;
}

export function setCmsDocMem<T extends Record<string, unknown>>(
  key: string,
  payload: T
): T {
  const store = getMemoryStore();
  store.cmsDocs.set(key, payload);
  return payload;
}

export function resetSeedDataCheckMem() {
  const store = getMemoryStore();
  return {
    users: store.users.length,
    categories: store.categories.length,
    products: store.products.length,
    appointments: store.appointments.length,
    blogPosts: store.blogPosts.length,
    mediaAssets: store.mediaAssets.length,
  };
}

// ============================================================================
// SECURITY CHALLENGES & AUDIT LOGS (Memory Fallback)
// ============================================================================
export function createSecurityChallengeMem(input: {
  challengeId: string;
  purpose: string;
  userId?: number | null;
  identifier?: string;
  answerHash: string;
  maxAttempts?: number;
  expiresAt: Date;
}) {
  const store = getMemoryStore();
  const created = {
    id: store.nextChallengeId++,
    challengeId: input.challengeId,
    purpose: input.purpose,
    userId: input.userId ?? null,
    identifier: input.identifier || "",
    answerHash: input.answerHash,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 5,
    consumed: false,
    expiresAt: input.expiresAt,
    createdAt: new Date(),
  };
  store.securityChallenges.push(created);
  return created;
}

export function getSecurityChallengeMem(challengeId: string) {
  const store = getMemoryStore();
  return store.securityChallenges.find((c) => c.challengeId === challengeId) || null;
}

export function incrementChallengeAttemptsMem(challengeId: string) {
  const store = getMemoryStore();
  const found = store.securityChallenges.find((c) => c.challengeId === challengeId);
  if (!found) return null;
  found.attempts += 1;
  return found;
}

export function markChallengeConsumedMem(challengeId: string) {
  const store = getMemoryStore();
  const found = store.securityChallenges.find((c) => c.challengeId === challengeId);
  if (!found) return null;
  found.consumed = true;
  return found;
}

export function createAuditLogMem(input: {
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
  const store = getMemoryStore();
  const record = {
    id: store.nextAuditLogId++,
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
    createdAt: new Date(),
  };
  store.auditLogs.unshift(record);
  return record;
}

export function listAuditLogsMem(filters?: {
  category?: string;
  status?: string;
  severity?: string;
  action?: string;
  search?: string;
  limit?: number;
}) {
  const store = getMemoryStore();
  const q = (filters?.search || "").trim().toLowerCase();
  const filtered = store.auditLogs.filter((row) => {
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
  const limit = filters?.limit && filters.limit > 0 ? filters.limit : 500;
  return filtered.slice(0, limit);
}

// ============================================================================
// USER SESSIONS, ADMIN SECRET CONFIG & SITE VISIT SLOT BLOCKS (Memory Fallback)
// ============================================================================
export function createUserSessionMem(input: {
  sessionKey: string;
  userId: number;
  tokenHash: string;
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}) {
  const store = getMemoryStore();
  const now = new Date();
  const record = {
    id: store.nextUserSessionId++,
    sessionKey: input.sessionKey,
    userId: input.userId,
    tokenHash: input.tokenHash,
    mfaVerified: Boolean(input.mfaVerified),
    ipAddress: input.ipAddress || "",
    userAgent: input.userAgent || "",
    expiresAt: input.expiresAt,
    revokedAt: null,
    lastUsedAt: now,
    createdAt: now,
  };
  store.userSessions.unshift(record);
  if (store.userSessions.length > 500) {
    store.userSessions.length = 500;
  }
  return record;
}

export function getUserSessionByTokenHashMem(tokenHash: string) {
  const store = getMemoryStore();
  return store.userSessions.find((s) => s.tokenHash === tokenHash) || null;
}

export function touchUserSessionMem(sessionKey: string) {
  const store = getMemoryStore();
  const found = store.userSessions.find((s) => s.sessionKey === sessionKey);
  if (found) found.lastUsedAt = new Date();
  return found || null;
}

export function revokeUserSessionByTokenHashMem(tokenHash: string) {
  const store = getMemoryStore();
  const found = store.userSessions.find((s) => s.tokenHash === tokenHash);
  if (!found) return false;
  found.revokedAt = new Date();
  return true;
}

export function revokeAllUserSessionsForUserMem(userId: number) {
  const store = getMemoryStore();
  const now = new Date();
  let count = 0;
  for (const s of store.userSessions) {
    if (s.userId === userId && !s.revokedAt) {
      s.revokedAt = now;
      count++;
    }
  }
  return count;
}

export function getAdminSecretConfigMem() {
  return getMemoryStore().adminSecretConfig;
}

export function upsertAdminSecretConfigMem(input: {
  encryptedKey: string;
  keyHash: string;
  rotationCount: number;
  updatedByUserId?: number | null;
  updatedByEmail: string;
}) {
  const store = getMemoryStore();
  const now = new Date();
  const next = {
    id: store.adminSecretConfig?.id ?? 1,
    configKey: "primary",
    encryptedKey: input.encryptedKey,
    keyHash: input.keyHash,
    rotationCount: input.rotationCount,
    updatedByUserId: input.updatedByUserId ?? null,
    updatedByEmail: input.updatedByEmail,
    updatedAt: now,
    createdAt: store.adminSecretConfig?.createdAt ?? now,
  };
  store.adminSecretConfig = next;
  return next;
}

export function toggleBlockedSiteVisitKeyMem(input: {
  date: string;
  slotTime: string;
  reason?: string;
}) {
  const store = getMemoryStore();
  const existing = (store.cmsDocs.get("site_visit_blocked_keys") as
    | { blockedKeys?: string[] }
    | undefined) || { blockedKeys: [] };
  const blockedKeys = Array.isArray(existing.blockedKeys) ? [...existing.blockedKeys] : [];
  const key = `${input.date}|${input.slotTime}`;
  const isBlocked = blockedKeys.includes(key);
  const nextBlocked = isBlocked ? blockedKeys.filter((k) => k !== key) : [...blockedKeys, key];
  store.cmsDocs.set("site_visit_blocked_keys", { blockedKeys: nextBlocked });
  return {
    blocked: !isBlocked,
    blockedKeys: nextBlocked,
  };
}

// ============================================================================
// CONTACT INQUIRIES (Memory Fallback)
// ============================================================================
export function listContactInquiriesMem() {
  return [...getMemoryStore().contactInquiries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function createContactInquiryRecordMem(input: {
  customerUserId?: number | null;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  intent?: string;
  subject?: string;
  message?: string;
  source?: string;
  ipAddress?: string;
}) {
  const store = getMemoryStore();
  const id = store.nextContactInquiryId++;
  const now = new Date();
  const inquiryCode = `INQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const created = {
    id,
    inquiryCode,
    customerUserId: input.customerUserId ?? null,
    assignedAdminId: null,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    department: (input.department || "General Consultation").trim(),
    intent: (input.intent || "General Consultation").trim(),
    subject: (input.subject || "").trim(),
    message: (input.message || "").trim(),
    source: (input.source || "web").trim(),
    status: "NEW" as const,
    ipAddress: input.ipAddress || "",
    createdAt: now,
    updatedAt: now,
  };
  store.contactInquiries.unshift(created);
  return created;
}

export function updateContactInquiryStatusMem(
  idOrCode: string | number,
  patch: {
    status?: "NEW" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";
    assignedAdminId?: number | null;
  }
) {
  const store = getMemoryStore();
  const target = String(idOrCode).trim();
  const found = store.contactInquiries.find(
    (c) => String(c.id) === target || c.inquiryCode === target
  );
  if (!found) return null;
  if (patch.status) found.status = patch.status;
  if (patch.assignedAdminId !== undefined) found.assignedAdminId = patch.assignedAdminId;
  found.updatedAt = new Date();
  return found;
}

