import test from "node:test";
import assert from "node:assert/strict";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema.ts";
import {
  applyHeroThemeToAllCategories,
  createContactInquiryRecord,
  createNotificationRecord,
  createOrderRecord,
  createRfqRecord,
  createUserAccount,
  createUserSession,
  getAdminSecretConfig,
  getAppointmentScheduleConfig,
  getUserSessionByTokenHash,
  listCategories,
  listContactInquiries,
  listNotifications,
  listOrders,
  listRfqRecords,
  revokeAllUserSessionsForUser,
  revokeUserSessionByTokenHash,
  toggleBlockedSiteVisitKey,
  touchUserSession,
  updateContactInquiryStatus,
  updateRfqRecord,
  updateUserAccount,
  upsertAdminSecretConfig,
} from "./repositories.ts";
import { findUserByVerificationTokenHash } from "./users.ts";
import { encryptSecret, decryptSecret, sha256Hex } from "../utils/securityHelpers.ts";

test("PostgreSQL Drizzle schema defines all expected tables, columns, indexes, and check constraints", () => {
  const expectedTableConfigs = [
    { table: schema.users, name: "users" },
    { table: schema.userSessions, name: "user_sessions" },
    { table: schema.adminSecretConfigs, name: "admin_secret_configs" },
    { table: schema.securityChallenges, name: "security_challenges" },
    { table: schema.auditLogs, name: "audit_logs" },
    { table: schema.mediaAssets, name: "media_assets" },
    { table: schema.categories, name: "categories" },
    { table: schema.products, name: "products" },
    { table: schema.productCategories, name: "product_categories" },
    { table: schema.productImages, name: "product_images" },
    { table: schema.appointmentSlots, name: "appointment_slots" },
    { table: schema.appointmentDates, name: "appointment_dates" },
    { table: schema.appointmentSlotBlocks, name: "appointment_slot_blocks" },
    { table: schema.appointmentMonthlyTemplates, name: "appointment_monthly_templates" },
    { table: schema.appointments, name: "appointments" },
    { table: schema.blogPosts, name: "blog_posts" },
    { table: schema.projects, name: "projects" },
    { table: schema.projectImages, name: "project_images" },
    { table: schema.orders, name: "orders" },
    { table: schema.orderItems, name: "order_items" },
    { table: schema.rfqRequests, name: "rfq_requests" },
    { table: schema.rfqAttachments, name: "rfq_attachments" },
    { table: schema.customerFeedbacks, name: "customer_feedbacks" },
    { table: schema.relatedPortals, name: "related_portals" },
    { table: schema.notifications, name: "notifications" },
    { table: schema.cmsDocuments, name: "cms_documents" },
    { table: schema.contactInquiries, name: "contact_inquiries" },
    { table: schema.chatbotFaqs, name: "chatbot_faqs" },
    { table: schema.chatbotKnowledgeRevisions, name: "chatbot_knowledge_revisions" },
    { table: schema.chatbotDocuments, name: "chatbot_documents" },
    { table: schema.chatbotWorkflows, name: "chatbot_workflows" },
    { table: schema.chatbotSessions, name: "chatbot_sessions" },
    { table: schema.chatbotMessages, name: "chatbot_messages" },
    { table: schema.chatbotSessionNotes, name: "chatbot_session_notes" },
    { table: schema.chatbotUnansweredQuestions, name: "chatbot_unanswered_questions" },
    { table: schema.chatbotLeads, name: "chatbot_leads" },
    { table: schema.chatbotAiCache, name: "chatbot_ai_cache" },
    { table: schema.chatbotAiUsage, name: "chatbot_ai_usage" },
    { table: schema.chatbotConfigHistory, name: "chatbot_config_history" },
  ];

  for (const item of expectedTableConfigs) {
    const cfg = getTableConfig(item.table);
    assert.equal(cfg.name, item.name);
    assert.ok(cfg.columns.length > 0, `${item.name} should have columns`);
  }

  const usersCfg = getTableConfig(schema.users);
  const userColNames = new Set(usersCfg.columns.map((c) => c.name));
  for (const col of [
    "auth_provider",
    "last_password_changed_at",
    "suspended_at",
    "suspension_reason",
    "notes",
  ]) {
    assert.ok(userColNames.has(col), `users table missing column ${col}`);
  }
  assert.ok(
    usersCfg.checks.some((c) => c.name === "chk_users_role"),
    "users should have chk_users_role check constraint"
  );
  assert.ok(
    usersCfg.checks.some((c) => c.name === "chk_users_account_status"),
    "users should have chk_users_account_status check constraint"
  );
  assert.ok(
    usersCfg.indexes.some((i) => i.config.name === "idx_users_email_verify_token"),
    "users should have idx_users_email_verify_token"
  );

  const productsCfg = getTableConfig(schema.products);
  const prodColNames = new Set(productsCfg.columns.map((c) => c.name));
  for (const col of [
    "sku",
    "is_featured",
    "is_active",
    "stock_status",
    "lead_time_days",
    "warranty_summary",
    "sort_order",
  ]) {
    assert.ok(prodColNames.has(col), `products table missing column ${col}`);
  }

  const inquiriesCfg = getTableConfig(schema.contactInquiries);
  assert.ok(
    inquiriesCfg.checks.some((c) => c.name === "chk_contact_inquiries_status"),
    "contact_inquiries should enforce valid status values"
  );
  assert.ok(inquiriesCfg.foreignKeys.length >= 2, "contact_inquiries should link customer & admin");

  const orderItemsCfg = getTableConfig(schema.orderItems);
  assert.ok(
    orderItemsCfg.checks.some((c) => c.name === "chk_order_items_qty"),
    "order_items should enforce positive quantities"
  );
});

test("User governance, verification token index lookup, and user_sessions lifecycle work cleanly", async () => {
  const token = `verify-tok-${Date.now()}`;
  const tokenHash = sha256Hex(token);
  const created = await createUserAccount({
    name: "Test Client Governance",
    email: `gov-${Date.now()}@example.com`,
    role: "customer",
    authProvider: "local",
    notes: "VIP facade client",
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: new Date(Date.now() + 3600_000),
  });

  assert.equal(created.authProvider, "local");
  assert.equal(created.notes, "VIP facade client");

  const byToken = await findUserByVerificationTokenHash(tokenHash);
  assert.ok(byToken);
  assert.equal(byToken?.id, created.id);

  const s1 = await createUserSession({
    sessionKey: `sess-1-${Date.now()}`,
    userId: created.id,
    tokenHash: sha256Hex(`rt-1-${Date.now()}`),
    mfaVerified: true,
    ipAddress: "127.0.0.1",
    userAgent: "node-test",
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  const s2 = await createUserSession({
    sessionKey: `sess-2-${Date.now()}`,
    userId: created.id,
    tokenHash: sha256Hex(`rt-2-${Date.now()}`),
    mfaVerified: false,
    ipAddress: "127.0.0.1",
    userAgent: "node-test",
    expiresAt: new Date(Date.now() + 86_400_000),
  });

  const fetchedS1 = await getUserSessionByTokenHash(s1.tokenHash);
  assert.equal(fetchedS1?.sessionKey, s1.sessionKey);
  assert.equal(fetchedS1?.revokedAt, null);

  const touched = await touchUserSession(s1.sessionKey);
  assert.ok(touched?.lastUsedAt);

  const revokedSingle = await revokeUserSessionByTokenHash(s1.tokenHash);
  assert.equal(revokedSingle, true);
  assert.ok((await getUserSessionByTokenHash(s1.tokenHash))?.revokedAt);

  const suspended = await updateUserAccount(created.id, {
    accountStatus: "SUSPENDED",
    suspensionReason: "Payment hold",
  });
  assert.equal(suspended?.accountStatus, "SUSPENDED");
  assert.equal(suspended?.isActive, false);
  assert.equal(suspended?.suspensionReason, "Payment hold");
  assert.ok(suspended?.suspendedAt);

  const revokedCount = await revokeAllUserSessionsForUser(created.id);
  assert.ok(revokedCount >= 1);
  assert.ok((await getUserSessionByTokenHash(s2.tokenHash))?.revokedAt);
});

test("admin_secret_configs repository stores and rotates encrypted admin secret keys", async () => {
  const secret1 = "X9PQ-7M21@";
  const saved = await upsertAdminSecretConfig({
    encryptedKey: encryptSecret(secret1),
    keyHash: sha256Hex(secret1),
    rotationCount: 3,
    updatedByEmail: "security@innovista.lk",
  });
  assert.equal(saved.rotationCount, 3);
  assert.equal(decryptSecret(saved.encryptedKey), secret1);

  const loaded = await getAdminSecretConfig();
  assert.ok(loaded);
  assert.equal(loaded?.updatedByEmail, "security@innovista.lk");
  assert.equal(decryptSecret(loaded?.encryptedKey || ""), secret1);
});

test("appointment_slot_blocks toggleBlockedSiteVisitKey syncs with getAppointmentScheduleConfig", async () => {
  const date = "2026-12-28";
  const slotTime = "11:00";
  const key = `${date}|${slotTime}`;

  const blockedRes = await toggleBlockedSiteVisitKey({
    date,
    slotTime,
    reason: "Team briefing",
  });
  assert.equal(blockedRes.blocked, true);
  assert.ok(blockedRes.blockedKeys.includes(key));

  const scheduleAfterBlock = await getAppointmentScheduleConfig();
  assert.ok(scheduleAfterBlock.blockedKeys.includes(key));

  const unblockedRes = await toggleBlockedSiteVisitKey({ date, slotTime });
  assert.equal(unblockedRes.blocked, false);
  assert.equal(unblockedRes.blockedKeys.includes(key), false);
});

test("category hero themes, orders with metadata/items, RFQs, contact inquiries, and categorized notifications persist accurately", async () => {
  const themed = await applyHeroThemeToAllCategories({
    mode: "solid",
    startColor: "#0F172A",
    headlineColor: "#FFFFFF",
  });
  assert.ok(themed.length > 0);
  const cats = await listCategories();
  assert.equal(cats[0].heroTheme?.startColor, "#0F172A");
  assert.equal(cats[0].heroTheme?.headlineColor, "#FFFFFF");

  const order = await createOrderRecord({
    Client_Name: "Ruwan Silva",
    Client_Email: "ruwan@builder.lk",
    Client_Number: "+94 77 555 1122",
    Inquiry_Type: "Commercial Facade",
    Subject: "Nawala Tower Glazing",
    Notes: "Need anodized bronze sample",
    Source: "unit_test",
    Designs: [
      {
        DesignID: 1,
        Color: "Anodized Bronze",
        Size: "2400x3000mm",
        Quantity: 4,
        Notes: "Tempered low-E glass",
      },
    ],
  });
  assert.equal(order.Inquiry_Type, "Commercial Facade");
  assert.equal(order.Subject, "Nawala Tower Glazing");
  assert.equal(order.Designs[0].Design.Quantity, 4);
  assert.equal(order.Designs[0].Design.Color, "Anodized Bronze");
  assert.ok((await listOrders()).some((o) => o.OrderID === order.OrderID));

  const rfq = await createRfqRecord(
    {
      clientName: "Apex Builders",
      contactPerson: "Dilshan",
      email: "dilshan@apex.lk",
      phone: "+94 71 222 3344",
      projectTitle: "Colombo Curtain Wall",
      location: "Colombo 03",
      projectType: "Commercial",
      projectDescription: "Full curtain wall fabrication",
    },
    []
  );
  assert.ok(rfq.rfqCode);
  const updatedRfq = await updateRfqRecord(rfq.id, {
    status: "QUOTED",
    estimatedQuoteAmount: 1450000,
    currency: "LKR",
    adminNotes: "Site wind load verified",
  });
  assert.equal(updatedRfq?.status, "QUOTED");
  assert.equal(updatedRfq?.adminNotes, "Site wind load verified");
  assert.ok((await listRfqRecords()).some((r) => r.id === rfq.id));

  const inquiry = await createContactInquiryRecord({
    name: "Nadeesha Perera",
    email: "nadeesha@studio.lk",
    phone: "+94 76 888 9900",
    department: "Engineering Advisory",
    intent: "Acoustic Rating Query",
    subject: "STC 42 double glazing",
    message: "Requesting U-value sheet for casement window.",
    source: "contact_page",
  });
  assert.equal(inquiry.status, "NEW");
  const updatedInq = await updateContactInquiryStatus(inquiry.inquiryCode, {
    status: "RESOLVED",
  });
  assert.equal(updatedInq?.status, "RESOLVED");
  assert.ok((await listContactInquiries()).some((i) => i.id === inquiry.id));

  const notif = await createNotificationRecord({
    title: "Test Categorized Notification",
    body: "Inquiry resolved",
    category: "INQUIRY",
    relatedEntityType: "contact_inquiry",
    relatedEntityId: inquiry.inquiryCode,
    metadata: { priority: "normal" },
  });
  assert.equal(notif.category, "INQUIRY");
  assert.equal(notif.relatedEntityType, "contact_inquiry");
  assert.ok((await listNotifications()).some((n) => n.id === notif.id));
});
