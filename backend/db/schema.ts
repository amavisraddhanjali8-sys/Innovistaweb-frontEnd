import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================================
// 1. USERS (Admin, Staff, and Customer Accounts linked with Firebase Auth)
// ============================================================================
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    uid: text("uid").notNull().unique(), // Firebase Auth UID or deterministic internal UID
    username: text("username").unique(), // Optional unique username for login & status recognition
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").default(""),
    company: text("company").default(""),
    role: text("role").notNull().default("customer"), // 'admin' | 'staff' | 'customer'
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url").default(""),
    isVerified: boolean("is_verified").notNull().default(false), // Admin verification state
    emailVerified: boolean("email_verified").notNull().default(false),
    accountStatus: text("account_status").notNull().default("ACTIVE"), // 'ACTIVE' | 'SUSPENDED'
    emailVerificationTokenHash: text("email_verification_token_hash"),
    emailVerificationCodeHash: text("email_verification_code_hash"),
    emailVerificationExpiresAt: timestamp("email_verification_expires_at", {
      withTimezone: true,
    }),
    totpSecretEncrypted: text("totp_secret_encrypted"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: text("last_login_ip").default(""),
    isActive: boolean("is_active").notNull().default(true),
    authProvider: text("auth_provider").notNull().default("local"), // 'local' | 'firebase'
    lastPasswordChangedAt: timestamp("last_password_changed_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason").default(""),
    notes: text("notes").default(""),
    purchaseGoods: jsonb("purchase_goods").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
    index("idx_users_account_status").on(table.accountStatus),
    index("idx_users_email_verified").on(table.emailVerified),
    index("idx_users_email_verify_token").on(table.emailVerificationTokenHash),
    index("idx_users_created_at").on(table.createdAt),
    check("chk_users_role", sql`${table.role} IN ('admin', 'staff', 'customer')`),
    check("chk_users_account_status", sql`${table.accountStatus} IN ('ACTIVE', 'SUSPENDED')`),
    check("chk_users_failed_attempts", sql`${table.failedLoginAttempts} >= 0`),
  ]
);

// ============================================================================
// 1B. USER SESSIONS (Tracked & Revocable Refresh Tokens + Device Audit)
// ============================================================================
export const userSessions = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    sessionKey: text("session_key").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    mfaVerified: boolean("mfa_verified").notNull().default(false),
    ipAddress: text("ip_address").default(""),
    userAgent: text("user_agent").default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_sessions_user_id").on(table.userId),
    index("idx_user_sessions_expires_at").on(table.expiresAt),
  ]
);

// ============================================================================
// 1C. ADMIN SECRET CONFIGS (Encrypted Admin Step-3 Key Config, Isolated from CMS)
// ============================================================================
export const adminSecretConfigs = pgTable("admin_secret_configs", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique().default("primary"),
  encryptedKey: text("encrypted_key").notNull(),
  keyHash: text("key_hash").notNull(),
  rotationCount: integer("rotation_count").notNull().default(0),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedByEmail: text("updated_by_email").notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 1D. SECURITY CHALLENGES (CAPTCHA, Admin MFA Step-Up, Email/Reset Tokens)
// ============================================================================
export const securityChallenges = pgTable(
  "security_challenges",
  {
    id: serial("id").primaryKey(),
    challengeId: text("challenge_id").notNull().unique(),
    purpose: text("purpose").notNull(), // 'CAPTCHA' | 'ADMIN_MFA' | 'ADMIN_SECRET_KEY' | 'EMAIL_VERIFY' | 'PASSWORD_RESET'
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    identifier: text("identifier").default(""),
    answerHash: text("answer_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    consumed: boolean("consumed").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_security_challenges_purpose_exp").on(table.purpose, table.expiresAt),
    index("idx_security_challenges_user_id").on(table.userId),
    index("idx_security_challenges_consumed").on(table.consumed),
  ]
);

// ============================================================================
// 1E. WEB AUDIT LOGS (Comprehensive Security & Operations Trail for CSV Export)
// ============================================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    eventId: text("event_id").notNull().unique(),
    actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email").default(""),
    actorRole: text("actor_role").default("anonymous"),
    targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
    targetIdentifier: text("target_identifier").default(""),
    action: text("action").notNull(),
    category: text("category").notNull().default("AUTH"), // 'AUTH' | 'SECURITY' | 'ACCOUNT' | 'ADMIN' | 'COMMERCE' | 'CHATBOT' | 'SYSTEM'
    status: text("status").notNull().default("SUCCESS"), // 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'INFO' | 'PENDING'
    severity: text("severity").notNull().default("INFO"), // 'INFO' | 'LOW' | 'MEDIUM' | 'WARNING' | 'HIGH' | 'CRITICAL'
    accountClassification: text("account_classification").default(""),
    ipAddress: text("ip_address").default(""),
    userAgent: text("user_agent").default(""),
    details: text("details").default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_cat_created").on(table.category, table.createdAt),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_actor_user_id").on(table.actorUserId),
    index("idx_audit_logs_target_user").on(table.targetUserId),
    index("idx_audit_logs_status").on(table.status),
    index("idx_audit_logs_severity").on(table.severity),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// ============================================================================
// 2. MEDIA ASSETS (Unified Uploaded Files + External Links + Local Presets)
// ============================================================================
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull().default("IMAGE"), // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    sourceType: text("source_type").notNull().default("UPLOAD"), // 'UPLOAD' | 'EXTERNAL_URL' | 'PRESET'
    title: text("title").default(""),
    originalName: text("original_name").default(""),
    storageKey: text("storage_key").default(""),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type").default(""),
    fileSizeBytes: integer("file_size_bytes"),
    altText: text("alt_text").default(""),
    entityScope: text("entity_scope").default("general"), // 'product' | 'category' | 'blog' | 'project' | 'cms' | 'chatbot' | 'rfq' | 'general'
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_media_assets_public_url").on(table.publicUrl),
    index("idx_media_assets_scope").on(table.entityScope),
    index("idx_media_assets_kind").on(table.kind),
    index("idx_media_assets_uploaded_by").on(table.uploadedByUserId),
  ]
);

// ============================================================================
// 3. CATEGORIES (Architectural Aluminium & Glazing System Categories)
// ============================================================================
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    categoryKey: text("category_key").notNull().unique(), // Matches legacy CategoryID ('doors', 'windows', etc.)
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    coverAssetId: integer("cover_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    coverImage: text("cover_image").notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    slideshowSpeedMs: integer("slideshow_speed_ms").notNull().default(5500),
    heroSlides: jsonb("hero_slides")
      .$type<Array<{ id: string; headline: string; subheadline: string; image: string }>>()
      .notNull()
      .default([]),
    specHighlights: jsonb("spec_highlights").$type<string[]>().notNull().default([]),
    heroTheme: jsonb("hero_theme").$type<Record<string, unknown> | null>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_categories_featured_order").on(table.featured, table.displayOrder),
    index("idx_categories_is_active").on(table.isActive),
  ]
);

// ============================================================================
// 4. PRODUCTS (Architectural Designs, Specs, Accessories, FAQs & Related)
// ============================================================================
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    legacyDesignId: text("legacy_design_id").unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 2 }),
    primaryCategoryId: integer("primary_category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    coverAssetId: integer("cover_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    colors: jsonb("colors").$type<string[]>().notNull().default([]),
    sizes: jsonb("sizes").$type<string[]>().notNull().default([]),
    blogPostRefs: jsonb("blog_post_refs").$type<string[]>().notNull().default([]),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    configurations: jsonb("configurations").$type<string[]>().notNull().default([]),
    featureTable: jsonb("feature_table").$type<{
      title: string;
      headers: string[];
      rows: string[][];
    } | null>(),
    performance: jsonb("performance").$type<Record<string, string> | null>(),
    downloads: jsonb("downloads")
      .$type<Array<{ id: string; title: string; fileType: "PDF" | "CAD"; url: string }>>()
      .notNull()
      .default([]),
    certifications: jsonb("certifications")
      .$type<Array<Record<string, string>>>()
      .notNull()
      .default([]),
    certificationImages: jsonb("certification_images")
      .$type<Array<{ id: string; title: string; image: string }>>()
      .notNull()
      .default([]),
    accessoriesHeading: text("accessories_heading").default(""),
    accessoriesTagline: text("accessories_tagline").default(""),
    accessoriesSlideshowSpeedMs: integer("accessories_slideshow_speed_ms").default(4000),
    accessoriesRibbonSpeed: integer("accessories_ribbon_speed").default(45),
    accessories: jsonb("accessories").$type<Array<Record<string, unknown>>>().notNull().default([]),
    faqs: jsonb("faqs")
      .$type<Array<{ id: string; question: string; answer: string }>>()
      .notNull()
      .default([]),
    advantages: jsonb("advantages")
      .$type<Array<{ id: string; title: string; description: string; image: string }>>()
      .notNull()
      .default([]),
    customizations: jsonb("customizations")
      .$type<Array<{ id: string; category: string; title: string; description: string }>>()
      .notNull()
      .default([]),
    partnerServices: jsonb("partner_services")
      .$type<Array<{ id: string; step: string; title: string; description: string }>>()
      .notNull()
      .default([]),
    partnerServiceBannerAssetId: integer("partner_service_banner_asset_id").references(
      () => mediaAssets.id,
      { onDelete: "set null" }
    ),
    partnerServiceBannerImage: text("partner_service_banner_image").default(""),
    clientShowcases: jsonb("client_showcases")
      .$type<Array<{ id: string; location: string; title: string; image: string }>>()
      .notNull()
      .default([]),
    relatedProductIds: jsonb("related_product_ids").$type<Array<string | number>>().notNull().default([]),
    sku: text("sku").default(""),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    stockStatus: text("stock_status").notNull().default("IN_STOCK"),
    leadTimeDays: integer("lead_time_days"),
    warrantySummary: text("warranty_summary").default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_slug").on(table.slug),
    index("idx_products_primary_category").on(table.primaryCategoryId),
    index("idx_products_active_sort").on(table.isActive, table.sortOrder),
    index("idx_products_featured").on(table.isFeatured),
    index("idx_products_updated_at").on(table.updatedAt),
  ]
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index("idx_product_categories_cat").on(table.categoryId),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_product_images_prod_order").on(table.productId, table.sortOrder)]
);

// ============================================================================
// 5. APPOINTMENTS, TIME SLOTS, DATES, BLOCKS & MONTHLY TEMPLATES (Site Visits)
// ============================================================================
export const appointmentSlots = pgTable("appointment_slots", {
  id: serial("id").primaryKey(),
  slotKey: text("slot_key").notNull().unique(), // e.g. 'slot-0930'
  slotTime: text("slot_time").notNull(), // HH:mm (24h)
  endTime: text("end_time").notNull(), // HH:mm (24h)
  label: text("label").notNull(), // e.g. '09:30 AM'
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentDates = pgTable("appointment_dates", {
  visitDate: text("visit_date").primaryKey(), // YYYY-MM-DD
  available: boolean("available").notNull().default(true),
  note: text("note").notNull().default(""),
  isCustom: boolean("is_custom").notNull().default(false),
  customSlots: jsonb("custom_slots")
    .$type<Array<{ id: string; time: string; endTime: string; label: string; available: boolean }>>()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentSlotBlocks = pgTable(
  "appointment_slot_blocks",
  {
    id: serial("id").primaryKey(),
    blockKey: text("block_key").notNull().unique(), // '${visitDate}|${slotTime}'
    visitDate: text("visit_date").notNull(),
    slotTime: text("slot_time").notNull(),
    reason: text("reason").notNull().default(""),
    blockedByUserId: integer("blocked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_appointment_slot_blocks_date").on(table.visitDate)]
);

export const appointmentMonthlyTemplates = pgTable("appointment_monthly_templates", {
  monthKey: text("month_key").primaryKey(), // YYYY-MM
  activeWeekdays: jsonb("active_weekdays").$type<number[]>().notNull().default([1, 2, 3, 4, 5, 6]),
  closedDates: jsonb("closed_dates").$type<string[]>().notNull().default([]),
  slots: jsonb("slots")
    .$type<Array<{ id: string; time: string; endTime: string; label: string; available: boolean }>>()
    .notNull()
    .default([]),
  note: text("note").notNull().default(""),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    bookingCode: text("booking_code").notNull().unique(), // e.g. 'SV-2041'
    slotId: integer("slot_id").references(() => appointmentSlots.id, {
      onDelete: "set null",
    }),
    visitDate: text("visit_date").notNull(), // YYYY-MM-DD
    slotTime: text("slot_time").notNull(), // HH:mm
    slotLabel: text("slot_label").notNull(),
    locationName: text("location_name").notNull(),
    visitorName: text("visitor_name").notNull(),
    visitorEmail: text("visitor_email").notNull(),
    visitorPhone: text("visitor_phone").notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("CONFIRMED"), // 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'PENDING'
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedStaffId: integer("assigned_staff_id").references(() => users.id, {
      onDelete: "set null",
    }),
    calendarEventId: text("calendar_event_id").default(""),
    emailSent: boolean("email_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Partial unique index: only active ('CONFIRMED' / 'PENDING') bookings lock a date+slot
    // so multiple historical CANCELLED or COMPLETED rows never trigger constraint collisions.
    uniqueIndex("uniq_appointment_date_slot_active")
      .on(table.visitDate, table.slotTime)
      .where(sql`${table.status} IN ('CONFIRMED', 'PENDING')`),
    index("idx_appointments_visit_date").on(table.visitDate),
    index("idx_appointments_status").on(table.status),
    index("idx_appointments_user_id").on(table.userId),
    index("idx_appointments_visitor_email").on(table.visitorEmail),
  ]
);

// ============================================================================
// 6. BLOG POSTS (Local + Blogger.com Sync)
// ============================================================================
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slugKey: text("slug_key").notNull().unique(),
    externalId: text("external_id"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    contentHtml: text("content_html").notNull().default(""),
    displayDate: text("display_date").notNull().default(""),
    publishedAt: text("published_at").notNull(),
    readTime: text("read_time").notNull().default("4 min read"),
    category: text("category").notNull().default("Engineering"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    authorName: text("author_name").notNull().default("Innovista Editorial"),
    authorUserId: integer("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    coverAssetId: integer("cover_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    coverImage: text("cover_image").notNull().default(""),
    source: text("source").notNull().default("local"), // 'local' | 'blogger'
    bloggerUrl: text("blogger_url").default(""),
    featured: boolean("featured").notNull().default(false),
    showOnHome: boolean("show_on_home").notNull().default(false),
    homeOrder: integer("home_order").notNull().default(0),
    seoTitle: text("seo_title").default(""),
    seoDescription: text("seo_description").default(""),
    isPublished: boolean("is_published").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_blog_posts_home").on(table.showOnHome, table.homeOrder),
    index("idx_blog_posts_category").on(table.category),
    index("idx_blog_posts_source").on(table.source),
    index("idx_blog_posts_published").on(table.publishedAt),
  ]
);

// ============================================================================
// 7. PROJECTS & PROJECT IMAGES
// ============================================================================
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").default(""),
    clientNumber: text("client_number").default(""),
    clientCompany: text("client_company").default(""),
    budget: numeric("budget", { precision: 14, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("COMPLETED"),
    category: text("category").notNull().default("Residential"),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    areaSqFt: integer("area_sq_ft"),
    finishedDate: text("finished_date"),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_projects_created_at").on(table.createdAt),
    index("idx_projects_status").on(table.status),
    index("idx_projects_featured").on(table.isFeatured),
  ]
);

export const projectImages = pgTable(
  "project_images",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("idx_project_images_proj_order").on(table.projectId, table.sortOrder)]
);

// ============================================================================
// 8. ORDERS, ORDER ITEMS & CUSTOM RFQs (RequestQuotePage)
// ============================================================================
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderCode: text("order_code").notNull().unique(), // e.g. 'ORD-9201'
    customerUserId: integer("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    orderStatus: text("order_status").notNull().default("PENDING"), // 'PENDING' | 'SEND' | 'VIEWORDER' | 'COMPLETED'
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    clientNumber: text("client_number").default(""),
    customerCompany: text("customer_company").default(""),
    customerLogo: text("customer_logo").default(""),
    purchaseGoods: jsonb("purchase_goods").$type<string[]>().notNull().default([]),
    inquiryType: text("inquiry_type").notNull().default("Product Quote"),
    subject: text("subject").default(""),
    source: text("source").notNull().default("web"),
    assignedAdminId: integer("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes").default(""),
    currency: text("currency").notNull().default("LKR"),
    totalEstimatedAmount: numeric("total_estimated_amount", { precision: 14, scale: 2 }),
    orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_customer_user_id").on(table.customerUserId),
    index("idx_orders_assigned_admin").on(table.assignedAdminId),
    index("idx_orders_client_email").on(table.clientEmail),
    index("idx_orders_status").on(table.orderStatus),
    index("idx_orders_date").on(table.orderDate),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    designName: text("design_name").notNull(),
    designImage: text("design_image").default(""),
    productSlug: text("product_slug").default(""),
    selectedColor: text("selected_color").default(""),
    selectedSize: text("selected_size").default(""),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }),
    notes: text("notes").default(""),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_product_id").on(table.productId),
    check("chk_order_items_qty", sql`${table.quantity} > 0`),
  ]
);

export const rfqRequests = pgTable(
  "rfq_requests",
  {
    id: serial("id").primaryKey(),
    rfqCode: text("rfq_code").unique(),
    customerUserId: integer("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAdminId: integer("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceSessionId: text("source_session_id").default(""),
    clientName: text("client_name").notNull(),
    contactPerson: text("contact_person").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    clientWebsite: text("client_website").default(""),
    projectTitle: text("project_title").notNull(),
    location: text("location").notNull(),
    projectType: text("project_type").notNull(),
    projectReferenceNumber: text("project_reference_number").default(""),
    projectDescription: text("project_description").notNull(),
    installationConditions: text("installation_conditions").default(""),
    siteConstraints: text("site_constraints").default(""),
    standards: text("standards").default(""),
    qualityExpectations: text("quality_expectations").default(""),
    materialBrand: text("material_brand").default(""),
    colorCode: text("color_code").default(""),
    additionalFeatures: text("additional_features").default(""),
    interiorStyle: text("interior_style").default("Modern"),
    paymentConditions: text("payment_conditions").default(""),
    budget: text("budget").default(""),
    latestDeliveryDate: text("latest_delivery_date").default(""),
    proposedVisitDates: text("proposed_visit_dates").default(""),
    siteAddress: text("site_address").default(""),
    googleMapsLink: text("google_maps_link").default(""),
    estimatedQuoteAmount: numeric("estimated_quote_amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("LKR"),
    adminNotes: text("admin_notes").default(""),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    status: text("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_rfq_requests_customer_user_id").on(table.customerUserId),
    index("idx_rfq_requests_assigned_admin").on(table.assignedAdminId),
    index("idx_rfq_requests_email").on(table.email),
    index("idx_rfq_requests_status").on(table.status),
    index("idx_rfq_requests_created_at").on(table.createdAt),
  ]
);

export const rfqAttachments = pgTable(
  "rfq_attachments",
  {
    id: serial("id").primaryKey(),
    rfqId: integer("rfq_id")
      .notNull()
      .references(() => rfqRequests.id, { onDelete: "cascade" }),
    mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_rfq_attachments_rfq_id").on(table.rfqId)]
);

// ============================================================================
// 9. CUSTOMER FEEDBACKS, PORTALS, NOTIFICATIONS & CMS STORE
// ============================================================================
export const customerFeedbacks = pgTable(
  "customer_feedbacks",
  {
    id: serial("id").primaryKey(),
    customerUserId: integer("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    companyName: text("company_name").notNull().default(""),
    customerRole: text("customer_role").notNull().default(""),
    avatarAssetId: integer("avatar_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    avatarUrl: text("avatar_url").notNull().default(""),
    designName: text("design_name").notNull().default(""),
    designRefId: text("design_ref_id").default(""),
    rating: integer("rating").notNull().default(5),
    comment: text("comment").notNull(),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    showOnHome: boolean("show_on_home").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_feedbacks_product_id").on(table.productId),
    index("idx_customer_feedbacks_home_order").on(table.showOnHome, table.displayOrder),
    check("chk_customer_feedbacks_rating", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ]
);

export const relatedPortals = pgTable(
  "related_portals",
  {
    id: serial("id").primaryKey(),
    portalKey: text("portal_key").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    summary: text("summary").notNull().default(""),
    url: text("url").notNull(),
    imageAssetId: integer("image_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    imageUrl: text("image_url").notNull(),
    isExternal: boolean("is_external").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("idx_related_portals_sort").on(table.sortOrder)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    notifKey: text("notif_key").notNull().unique(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull().default("GENERAL"),
    relatedEntityType: text("related_entity_type").default(""),
    relatedEntityId: text("related_entity_id").default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_read_created").on(table.isRead, table.createdAt),
    index("idx_notifications_user_id").on(table.userId),
  ]
);

export const cmsDocuments = pgTable(
  "cms_documents",
  {
    key: text("key").primaryKey(), // Public/admin CMS payloads ('home_slideshow', 'about_cms', 'site_settings', 'chatbot_config', etc.)
    docType: text("doc_type").notNull().default("cms"), // 'cms' | 'config' | 'theme'
    isPublic: boolean("is_public").notNull().default(true),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_cms_documents_doc_type").on(table.docType)]
);

// ============================================================================
// 9B. CONTACT INQUIRIES (Normalized Consultation, Support & Callback Inquiries)
// ============================================================================
export const contactInquiries = pgTable(
  "contact_inquiries",
  {
    id: serial("id").primaryKey(),
    inquiryCode: text("inquiry_code").notNull().unique(),
    customerUserId: integer("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAdminId: integer("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    department: text("department").notNull().default("General Consultation"),
    intent: text("intent").notNull().default("General Consultation"),
    subject: text("subject").notNull().default(""),
    message: text("message").notNull().default(""),
    source: text("source").notNull().default("web"),
    status: text("status").notNull().default("NEW"), // 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED'
    ipAddress: text("ip_address").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_contact_inquiries_status").on(table.status),
    index("idx_contact_inquiries_email").on(table.email),
    index("idx_contact_inquiries_created_at").on(table.createdAt),
    check(
      "chk_contact_inquiries_status",
      sql`${table.status} IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED')`
    ),
  ]
);

// ============================================================================
// 10. INNOASSIST AI KNOWLEDGE BASE, WORKFLOWS, SESSIONS, LEADS & ANALYTICS
// ============================================================================
export const chatbotFaqs = pgTable(
  "chatbot_faqs",
  {
    id: serial("id").primaryKey(),
    faqKey: text("faq_key").notNull().unique(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: text("category").notNull().default("General"),
    subcategory: text("subcategory").notNull().default(""),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    alternativeQuestions: jsonb("alternative_questions").$type<string[]>().notNull().default([]),
    synonyms: jsonb("synonyms").$type<string[]>().notNull().default([]),
    relatedTopics: jsonb("related_topics").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("published"), // 'draft' | 'review' | 'approved' | 'published' | 'archived'
    translations: jsonb("translations")
      .$type<Partial<Record<"en" | "si" | "ta", { question?: string; answer?: string }>>>()
      .notNull()
      .default({}),
    attachments: jsonb("attachments")
      .$type<
        Array<{ id: string; fileName: string; fileUrl: string; mimeType?: string; sizeBytes?: number }>
      >()
      .notNull()
      .default([]),
    usageCount: integer("usage_count").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),
    lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(5),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_faqs_status_enabled_prio").on(table.status, table.enabled, table.priority),
    index("idx_chatbot_faqs_category").on(table.category),
  ]
);

export const chatbotKnowledgeRevisions = pgTable(
  "chatbot_knowledge_revisions",
  {
    id: serial("id").primaryKey(),
    faqId: integer("faq_id")
      .notNull()
      .references(() => chatbotFaqs.id, { onDelete: "cascade" }),
    faqKey: text("faq_key").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("published"),
    summary: text("summary").notNull().default("Updated knowledge entry"),
    editedByUserId: integer("edited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    editedByName: text("edited_by_name").notNull().default("Admin"),
    editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_kb_revisions_faq_id").on(table.faqId),
    index("idx_chatbot_kb_revisions_faq_key").on(table.faqKey),
  ]
);

export const chatbotDocuments = pgTable(
  "chatbot_documents",
  {
    id: serial("id").primaryKey(),
    docKey: text("doc_key").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull().default("Technical Catalogue"),
    subcategory: text("subcategory").notNull().default(""),
    language: text("language").notNull().default("all"), // 'all' | 'en' | 'si' | 'ta'
    mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull().default("application/pdf"),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),
    summary: text("summary").notNull().default(""),
    extractedText: text("extracted_text").notNull().default(""),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("published"),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedBy: text("uploaded_by").notNull().default("Admin"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_documents_status_lang").on(table.status, table.language),
    index("idx_chatbot_documents_category").on(table.category),
  ]
);

export const chatbotWorkflows = pgTable(
  "chatbot_workflows",
  {
    id: serial("id").primaryKey(),
    workflowKey: text("workflow_key").notNull().unique(),
    name: text("name").notNull(),
    intent: text("intent").notNull().default("general_inquiry"),
    category: text("category").notNull().default("General"),
    description: text("description").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(5),
    triggerKeywords: jsonb("trigger_keywords").$type<string[]>().notNull().default([]),
    steps: jsonb("steps").$type<Array<Record<string, unknown>>>().notNull().default([]),
    completionAction: text("completion_action").notNull().default("create_lead"),
    completionMessage: text("completion_message").notNull().default(""),
    localizedCompletionMessages: jsonb("localized_completion_messages")
      .$type<Partial<Record<"en" | "si" | "ta", string>>>()
      .default({}),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_workflows_enabled_prio").on(table.enabled, table.priority),
    index("idx_chatbot_workflows_intent").on(table.intent),
  ]
);

export const chatbotSessions = pgTable(
  "chatbot_sessions",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull().unique(),
    sessionToken: text("session_token").notNull(),
    customerUserId: integer("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull().default(""),
    customerEmail: text("customer_email").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    customerCompany: text("customer_company").notNull().default(""),
    language: text("language").notNull().default("en"),
    detectedIntent: text("detected_intent").notNull().default("general_inquiry"),
    activeWorkflowId: text("active_workflow_id"),
    activeWorkflowStepIndex: integer("active_workflow_step_index").notNull().default(0),
    collectedLead: jsonb("collected_lead").$type<Record<string, unknown>>().notNull().default({}),
    attachments: jsonb("attachments").$type<Array<Record<string, unknown>>>().notNull().default([]),
    mode: text("mode").notNull().default("ai"), // 'ai' | 'waiting_human' | 'human' | 'resolved'
    status: text("status").notNull().default("OPEN"), // 'OPEN' | 'WAITING_HUMAN' | 'IN_HUMAN_SUPPORT' | 'ESCALATED' | 'CLOSED'
    assignedAdminId: integer("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAdminName: text("assigned_admin_name").default(""),
    assignedAdminEmail: text("assigned_admin_email").default(""),
    consecutiveFallbacks: integer("consecutive_fallbacks").notNull().default(0),
    leadCode: text("lead_code"),
    rating: integer("rating"),
    feedbackComment: text("feedback_comment").default(""),
    handoverCount: integer("handover_count").notNull().default(0),
    avgResponseTimeMs: integer("avg_response_time_ms").notNull().default(0),
    ipAddress: text("ip_address").default(""),
    userAgent: text("user_agent").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_sessions_status").on(table.status),
    index("idx_chatbot_sessions_mode").on(table.mode),
    index("idx_chatbot_sessions_last_activity").on(table.lastActivityAt),
    index("idx_chatbot_sessions_customer_email").on(table.customerEmail),
    index("idx_chatbot_sessions_customer_phone").on(table.customerPhone),
    index("idx_chatbot_sessions_customer_user_id").on(table.customerUserId),
    check(
      "chk_chatbot_sessions_rating",
      sql`${table.rating} IS NULL OR (${table.rating} >= 1 AND ${table.rating} <= 5)`
    ),
    check("chk_chatbot_sessions_fallbacks", sql`${table.consecutiveFallbacks} >= 0`),
  ]
);

export const chatbotMessages = pgTable(
  "chatbot_messages",
  {
    id: serial("id").primaryKey(),
    sessionRefId: integer("session_ref_id")
      .notNull()
      .references(() => chatbotSessions.id, { onDelete: "cascade" }),
    messageKey: text("message_key").notNull().unique(),
    role: text("role").notNull(), // 'user' | 'assistant' | 'admin' | 'system'
    senderName: text("sender_name").default(""),
    text: text("text").notNull(),
    language: text("language").default("en"),
    intent: text("intent").default(""),
    source: text("source").default(""),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    responseTimeMs: integer("response_time_ms"),
    quickReplies: jsonb("quick_replies").$type<string[]>().notNull().default([]),
    followUpSuggestions: jsonb("follow_up_suggestions").$type<string[]>().notNull().default([]),
    attachments: jsonb("attachments").$type<Array<Record<string, unknown>>>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_chatbot_messages_session_created").on(table.sessionRefId, table.createdAt)]
);

export const chatbotSessionNotes = pgTable(
  "chatbot_session_notes",
  {
    id: serial("id").primaryKey(),
    sessionRefId: integer("session_ref_id")
      .notNull()
      .references(() => chatbotSessions.id, { onDelete: "cascade" }),
    noteKey: text("note_key").notNull().unique(),
    authorUserId: integer("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull().default(""),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_chatbot_session_notes_session_ref").on(table.sessionRefId)]
);

export const chatbotUnansweredQuestions = pgTable(
  "chatbot_unanswered_questions",
  {
    id: serial("id").primaryKey(),
    questionKey: text("question_key").notNull().unique(),
    normalizedKey: text("normalized_key").notNull(),
    question: text("question").notNull(),
    sessionRefId: integer("session_ref_id").references(() => chatbotSessions.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id").notNull(),
    language: text("language").notNull().default("en"),
    suggestedCategory: text("suggested_category").notNull().default("General"),
    reason: text("reason").notNull().default(""),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    status: text("status").notNull().default("PENDING"), // 'PENDING' | 'CONVERTED' | 'DISMISSED'
    convertedFaqId: integer("converted_faq_id").references(() => chatbotFaqs.id, {
      onDelete: "set null",
    }),
    convertedFaqKey: text("converted_faq_key"),
    sampleContexts: jsonb("sample_contexts").$type<string[]>().notNull().default([]),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_unanswered_status_occ").on(table.status, table.occurrenceCount),
    index("idx_chatbot_unanswered_norm_key").on(table.normalizedKey),
    index("idx_chatbot_unanswered_lang").on(table.language),
  ]
);

export const chatbotLeads = pgTable(
  "chatbot_leads",
  {
    id: serial("id").primaryKey(),
    leadCode: text("lead_code").notNull().unique(),
    sessionRefId: integer("session_ref_id").references(() => chatbotSessions.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id").notNull(),
    sourceIntent: text("source_intent").notNull().default("general_inquiry"),
    language: text("language").notNull().default("en"),
    status: text("status").notNull().default("POTENTIAL"), // 'POTENTIAL' | 'QUALIFIED' | 'RFQ_SYNCED' | 'CONTACTED' | 'WON' | 'CLOSED'
    isQualified: boolean("is_qualified").notNull().default(false),
    rfqId: integer("rfq_id").references(() => rfqRequests.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull().default(""),
    customerEmail: text("customer_email").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    requiredService: text("required_service").notNull().default(""),
    fields: jsonb("fields").$type<Record<string, unknown>>().notNull().default({}),
    attachments: jsonb("attachments").$type<Array<Record<string, unknown>>>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chatbot_leads_session_id").on(table.sessionId),
    index("idx_chatbot_leads_status").on(table.status),
    index("idx_chatbot_leads_qualified").on(table.isQualified),
    index("idx_chatbot_leads_updated_at").on(table.updatedAt),
  ]
);

export const chatbotAiCache = pgTable(
  "chatbot_ai_cache",
  {
    id: serial("id").primaryKey(),
    cacheKey: text("cache_key").notNull().unique(),
    querySample: text("query_sample").notNull(),
    language: text("language").notNull().default("en"),
    reply: text("reply").notNull(),
    followUpSuggestions: jsonb("follow_up_suggestions").$type<string[]>().notNull().default([]),
    detectedService: text("detected_service").default(""),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.85"),
    hits: integer("hits").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("idx_chatbot_ai_cache_expires").on(table.expiresAt)]
);

export const chatbotAiUsage = pgTable("chatbot_ai_usage", {
  id: serial("id").primaryKey(),
  dateKey: text("date_key").notNull().unique(), // YYYY-MM-DD
  geminiCallsToday: integer("gemini_calls_today").notNull().default(0),
  cacheHitsToday: integer("cache_hits_today").notNull().default(0),
  localZeroCreditHitsToday: integer("local_zero_credit_hits_today").notNull().default(0),
  totalCallsAllTime: integer("total_calls_all_time").notNull().default(0),
  totalCreditsSavedAllTime: integer("total_credits_saved_all_time").notNull().default(0),
  lastGeminiError: text("last_gemini_error"),
  lastGeminiErrorAt: timestamp("last_gemini_error_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotConfigHistory = pgTable(
  "chatbot_config_history",
  {
    id: serial("id").primaryKey(),
    historyKey: text("history_key").notNull().unique(),
    changedByUserId: integer("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    changedBy: text("changed_by").notNull(),
    summary: text("summary").notNull().default("Updated chatbot configuration"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_chatbot_config_history_changed_at").on(table.changedAt)]
);

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  userSessions: many(userSessions),
  securityChallenges: many(securityChallenges),
  mediaAssets: many(mediaAssets),
  blogPosts: many(blogPosts),
  appointments: many(appointments, { relationName: "visitorAppointments" }),
  assignedAppointments: many(appointments, { relationName: "staffAppointments" }),
  orders: many(orders, { relationName: "customerOrders" }),
  assignedOrders: many(orders, { relationName: "assignedAdminOrders" }),
  rfqRequests: many(rfqRequests, { relationName: "customerRfqs" }),
  assignedRfqs: many(rfqRequests, { relationName: "assignedAdminRfqs" }),
  contactInquiries: many(contactInquiries, { relationName: "customerInquiries" }),
  assignedInquiries: many(contactInquiries, { relationName: "assignedAdminInquiries" }),
  projects: many(projects),
  notifications: many(notifications),
  chatbotSessions: many(chatbotSessions, { relationName: "customerChatSessions" }),
  assignedChatSessions: many(chatbotSessions, { relationName: "adminChatSessions" }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const adminSecretConfigsRelations = relations(adminSecretConfigs, ({ one }) => ({
  updatedBy: one(users, {
    fields: [adminSecretConfigs.updatedByUserId],
    references: [users.id],
  }),
}));

export const securityChallengesRelations = relations(securityChallenges, ({ one }) => ({
  user: one(users, {
    fields: [securityChallenges.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
    relationName: "auditActor",
  }),
  target: one(users, {
    fields: [auditLogs.targetUserId],
    references: [users.id],
    relationName: "auditTarget",
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [mediaAssets.uploadedByUserId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  coverAsset: one(mediaAssets, {
    fields: [categories.coverAssetId],
    references: [mediaAssets.id],
  }),
  productLinks: many(productCategories),
  primaryProducts: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  primaryCategory: one(categories, {
    fields: [products.primaryCategoryId],
    references: [categories.id],
  }),
  coverAsset: one(mediaAssets, {
    fields: [products.coverAssetId],
    references: [mediaAssets.id],
  }),
  createdBy: one(users, {
    fields: [products.createdByUserId],
    references: [users.id],
  }),
  categoryLinks: many(productCategories),
  images: many(productImages),
  feedbacks: many(customerFeedbacks),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [productImages.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const appointmentSlotsRelations = relations(appointmentSlots, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentSlotBlocksRelations = relations(appointmentSlotBlocks, ({ one }) => ({
  blockedBy: one(users, {
    fields: [appointmentSlotBlocks.blockedByUserId],
    references: [users.id],
  }),
}));

export const appointmentMonthlyTemplatesRelations = relations(
  appointmentMonthlyTemplates,
  ({ one }) => ({
    updatedBy: one(users, {
      fields: [appointmentMonthlyTemplates.updatedByUserId],
      references: [users.id],
    }),
  })
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  slot: one(appointmentSlots, {
    fields: [appointments.slotId],
    references: [appointmentSlots.id],
  }),
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
    relationName: "visitorAppointments",
  }),
  assignedStaff: one(users, {
    fields: [appointments.assignedStaffId],
    references: [users.id],
    relationName: "staffAppointments",
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorUserId],
    references: [users.id],
  }),
  coverAsset: one(mediaAssets, {
    fields: [blogPosts.coverAssetId],
    references: [mediaAssets.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdByUserId],
    references: [users.id],
  }),
  images: many(projectImages),
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, {
    fields: [projectImages.projectId],
    references: [projects.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [projectImages.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerUserId],
    references: [users.id],
    relationName: "customerOrders",
  }),
  assignedAdmin: one(users, {
    fields: [orders.assignedAdminId],
    references: [users.id],
    relationName: "assignedAdminOrders",
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const rfqRequestsRelations = relations(rfqRequests, ({ one, many }) => ({
  customer: one(users, {
    fields: [rfqRequests.customerUserId],
    references: [users.id],
    relationName: "customerRfqs",
  }),
  assignedAdmin: one(users, {
    fields: [rfqRequests.assignedAdminId],
    references: [users.id],
    relationName: "assignedAdminRfqs",
  }),
  attachments: many(rfqAttachments),
  chatbotLeads: many(chatbotLeads),
}));

export const rfqAttachmentsRelations = relations(rfqAttachments, ({ one }) => ({
  rfq: one(rfqRequests, {
    fields: [rfqAttachments.rfqId],
    references: [rfqRequests.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [rfqAttachments.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const customerFeedbacksRelations = relations(customerFeedbacks, ({ one }) => ({
  customer: one(users, {
    fields: [customerFeedbacks.customerUserId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [customerFeedbacks.productId],
    references: [products.id],
  }),
  avatarAsset: one(mediaAssets, {
    fields: [customerFeedbacks.avatarAssetId],
    references: [mediaAssets.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const contactInquiriesRelations = relations(contactInquiries, ({ one }) => ({
  customer: one(users, {
    fields: [contactInquiries.customerUserId],
    references: [users.id],
    relationName: "customerInquiries",
  }),
  assignedAdmin: one(users, {
    fields: [contactInquiries.assignedAdminId],
    references: [users.id],
    relationName: "assignedAdminInquiries",
  }),
}));

export const chatbotFaqsRelations = relations(chatbotFaqs, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [chatbotFaqs.createdByUserId],
    references: [users.id],
  }),
  revisions: many(chatbotKnowledgeRevisions),
  convertedFromQuestions: many(chatbotUnansweredQuestions),
}));

export const chatbotKnowledgeRevisionsRelations = relations(
  chatbotKnowledgeRevisions,
  ({ one }) => ({
    faq: one(chatbotFaqs, {
      fields: [chatbotKnowledgeRevisions.faqId],
      references: [chatbotFaqs.id],
    }),
    editedBy: one(users, {
      fields: [chatbotKnowledgeRevisions.editedByUserId],
      references: [users.id],
    }),
  })
);

export const chatbotDocumentsRelations = relations(chatbotDocuments, ({ one }) => ({
  mediaAsset: one(mediaAssets, {
    fields: [chatbotDocuments.mediaAssetId],
    references: [mediaAssets.id],
  }),
  uploadedByUser: one(users, {
    fields: [chatbotDocuments.uploadedByUserId],
    references: [users.id],
  }),
}));

export const chatbotWorkflowsRelations = relations(chatbotWorkflows, ({ one }) => ({
  updatedBy: one(users, {
    fields: [chatbotWorkflows.updatedByUserId],
    references: [users.id],
  }),
}));

export const chatbotSessionsRelations = relations(chatbotSessions, ({ one, many }) => ({
  customerUser: one(users, {
    fields: [chatbotSessions.customerUserId],
    references: [users.id],
    relationName: "customerChatSessions",
  }),
  assignedAdmin: one(users, {
    fields: [chatbotSessions.assignedAdminId],
    references: [users.id],
    relationName: "adminChatSessions",
  }),
  messages: many(chatbotMessages),
  notes: many(chatbotSessionNotes),
  leads: many(chatbotLeads),
  unansweredQuestions: many(chatbotUnansweredQuestions),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  session: one(chatbotSessions, {
    fields: [chatbotMessages.sessionRefId],
    references: [chatbotSessions.id],
  }),
}));

export const chatbotSessionNotesRelations = relations(chatbotSessionNotes, ({ one }) => ({
  session: one(chatbotSessions, {
    fields: [chatbotSessionNotes.sessionRefId],
    references: [chatbotSessions.id],
  }),
  author: one(users, {
    fields: [chatbotSessionNotes.authorUserId],
    references: [users.id],
  }),
}));

export const chatbotUnansweredQuestionsRelations = relations(
  chatbotUnansweredQuestions,
  ({ one }) => ({
    session: one(chatbotSessions, {
      fields: [chatbotUnansweredQuestions.sessionRefId],
      references: [chatbotSessions.id],
    }),
    convertedFaq: one(chatbotFaqs, {
      fields: [chatbotUnansweredQuestions.convertedFaqId],
      references: [chatbotFaqs.id],
    }),
  })
);

export const chatbotLeadsRelations = relations(chatbotLeads, ({ one }) => ({
  session: one(chatbotSessions, {
    fields: [chatbotLeads.sessionRefId],
    references: [chatbotSessions.id],
  }),
  rfq: one(rfqRequests, {
    fields: [chatbotLeads.rfqId],
    references: [rfqRequests.id],
  }),
}));

export const chatbotConfigHistoryRelations = relations(chatbotConfigHistory, ({ one }) => ({
  changedByUser: one(users, {
    fields: [chatbotConfigHistory.changedByUserId],
    references: [users.id],
  }),
}));

// ============================================================================
// EXPORTED TYPES
// ============================================================================
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type UserSessionRow = typeof userSessions.$inferSelect;
export type AdminSecretConfigRow = typeof adminSecretConfigs.$inferSelect;
export type SecurityChallengeRow = typeof securityChallenges.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type MediaAssetRow = typeof mediaAssets.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type AppointmentRow = typeof appointments.$inferSelect;
export type BlogPostRow = typeof blogPosts.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type RfqRequestRow = typeof rfqRequests.$inferSelect;
export type CustomerFeedbackRow = typeof customerFeedbacks.$inferSelect;
export type ContactInquiryRow = typeof contactInquiries.$inferSelect;
export type ChatbotFaqRow = typeof chatbotFaqs.$inferSelect;
export type ChatbotKnowledgeRevisionRow = typeof chatbotKnowledgeRevisions.$inferSelect;
export type ChatbotDocumentRow = typeof chatbotDocuments.$inferSelect;
export type ChatbotWorkflowRow = typeof chatbotWorkflows.$inferSelect;
export type ChatbotSessionRow = typeof chatbotSessions.$inferSelect;
export type ChatbotMessageRow = typeof chatbotMessages.$inferSelect;
export type ChatbotSessionNoteRow = typeof chatbotSessionNotes.$inferSelect;
export type ChatbotUnansweredQuestionRow = typeof chatbotUnansweredQuestions.$inferSelect;
export type ChatbotLeadRow = typeof chatbotLeads.$inferSelect;
export type ChatbotAiCacheRow = typeof chatbotAiCache.$inferSelect;
export type ChatbotAiUsageRow = typeof chatbotAiUsage.$inferSelect;
export type ChatbotConfigHistoryRow = typeof chatbotConfigHistory.$inferSelect;
