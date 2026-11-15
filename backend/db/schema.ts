import { relations } from "drizzle-orm";
import {
  boolean,
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
export const users = pgTable("users", {
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
  emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastLoginIp: text("last_login_ip").default(""),
  isActive: boolean("is_active").notNull().default(true),
  purchaseGoods: jsonb("purchase_goods").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 1B. SECURITY CHALLENGES (CAPTCHA, Admin MFA Step-Up, Email/Reset Tokens)
// ============================================================================
export const securityChallenges = pgTable("security_challenges", {
  id: serial("id").primaryKey(),
  challengeId: text("challenge_id").notNull().unique(),
  purpose: text("purpose").notNull(), // 'CAPTCHA' | 'ADMIN_MFA' | 'EMAIL_VERIFY' | 'PASSWORD_RESET'
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  identifier: text("identifier").default(""),
  answerHash: text("answer_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  consumed: boolean("consumed").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 1C. WEB AUDIT LOGS (Comprehensive Security & Operations Trail for CSV Export)
// ============================================================================
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email").default(""),
  actorRole: text("actor_role").default("anonymous"),
  targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetIdentifier: text("target_identifier").default(""),
  action: text("action").notNull(),
  category: text("category").notNull().default("AUTH"), // 'AUTH' | 'SECURITY' | 'ACCOUNT' | 'ADMIN' | 'COMMERCE' | 'SYSTEM'
  status: text("status").notNull().default("SUCCESS"), // 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'INFO'
  severity: text("severity").notNull().default("LOW"), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  accountClassification: text("account_classification").default(""),
  ipAddress: text("ip_address").default(""),
  userAgent: text("user_agent").default(""),
  details: text("details").default(""),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 2. MEDIA ASSETS (Unified Uploaded Files + External Links + Local Presets)
// ============================================================================
export const mediaAssets = pgTable("media_assets", {
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
  entityScope: text("entity_scope").default("general"), // 'product' | 'category' | 'blog' | 'project' | 'cms' | 'general'
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 3. CATEGORIES (Architectural Aluminium & Glazing System Categories)
// ============================================================================
export const categories = pgTable("categories", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 4. PRODUCTS (Architectural Designs, Specs, Accessories, FAQs & Related)
// ============================================================================
export const products = pgTable("products", {
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
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })]
);

export const productImages = pgTable("product_images", {
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
});

// ============================================================================
// 5. APPOINTMENTS, TIME SLOTS & DATES (Site Visit Booking System)
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
    uniqueIndex("uniq_appointment_date_slot_active").on(
      table.visitDate,
      table.slotTime,
      table.status
    ),
  ]
);

// ============================================================================
// 6. BLOG POSTS (Local + Blogger.com Sync)
// ============================================================================
export const blogPosts = pgTable("blog_posts", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 7. PROJECTS & PROJECT IMAGES
// ============================================================================
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").default(""),
  clientNumber: text("client_number").default(""),
  clientCompany: text("client_company").default(""),
  budget: numeric("budget", { precision: 14, scale: 2 }).notNull().default("0"),
  finishedDate: text("finished_date"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectImages = pgTable("project_images", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  mediaAssetId: integer("media_asset_id").references(() => mediaAssets.id, {
    onDelete: "set null",
  }),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ============================================================================
// 8. ORDERS, ORDER ITEMS & CUSTOM RFQs (RequestQuotePage)
// ============================================================================
export const orders = pgTable("orders", {
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
  orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  designName: text("design_name").notNull(),
  designImage: text("design_image").default(""),
  quantity: integer("quantity").notNull().default(1),
});

export const rfqRequests = pgTable("rfq_requests", {
  id: serial("id").primaryKey(),
  customerUserId: integer("customer_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
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
  status: text("status").notNull().default("NEW"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rfqAttachments = pgTable("rfq_attachments", {
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
});

// ============================================================================
// 9. CUSTOMER FEEDBACKS, CHATBOT FAQS, PORTALS, NOTIFICATIONS & CMS STORE
// ============================================================================
export const customerFeedbacks = pgTable("customer_feedbacks", {
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
});

export const chatbotFaqs = pgTable("chatbot_faqs", {
  id: serial("id").primaryKey(),
  faqKey: text("faq_key").notNull().unique(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(5),
  createdByUserId: integer("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const relatedPortals = pgTable("related_portals", {
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
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  notifKey: text("notif_key").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsDocuments = pgTable("cms_documents", {
  key: text("key").primaryKey(), // e.g. 'home_slideshow', 'home_services', 'home_featured_products', 'about_cms', 'product_landing_cms', 'page_ads_cms', 'blogger_config', 'site_settings', 'chatbot_config', 'site_visit_blocked_keys'
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  mediaAssets: many(mediaAssets),
  blogPosts: many(blogPosts),
  appointments: many(appointments, { relationName: "visitorAppointments" }),
  assignedAppointments: many(appointments, { relationName: "staffAppointments" }),
  orders: many(orders),
  projects: many(projects),
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
  }),
  attachments: many(rfqAttachments),
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
