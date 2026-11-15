import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_CHATBOT_WORKFLOWS,
  DEFAULT_KNOWLEDGE_META,
  mergeFaqWithMeta,
  normalizeAndExpandQuery,
  normalizeChatbotConfig,
  normalizeKnowledgeMeta,
  type ChatAttachmentItem,
  type ChatbotConfig,
  type ChatbotWorkflow,
  type KnowledgeDocumentItem,
  type KnowledgeItemExtended,
  type KnowledgeItemMeta,
  type KnowledgePublicationStatus,
  type LeadDataFields,
  type RichChatIntent,
  type SupportedLanguage,
} from "../../shared/chatbotHelpers.ts";
import { db, isMemoryFallbackActive, markDatabaseOffline } from "./index.ts";
import {
  chatbotAiCache,
  chatbotAiUsage,
  chatbotConfigHistory,
  chatbotDocuments,
  chatbotFaqs,
  chatbotKnowledgeRevisions,
  chatbotLeads,
  chatbotMessages,
  chatbotSessionNotes,
  chatbotSessions,
  chatbotUnansweredQuestions,
  chatbotWorkflows,
} from "./schema.ts";
import { ensureDatabaseSeeded } from "./seed.ts";
import {
  createNotificationRecord,
  createRfqRecord,
  ensureMediaAssetIdForUrl,
  getCmsDoc,
  listAppointments,
  listChatbotFaqs,
  listRfqRecords,
  setCmsDoc,
  upsertChatbotFaqRecord,
} from "./repositories.ts";

// ============================================================================
// TYPES FOR PERSISTED CHATBOT STATE
// ============================================================================

export type SessionSupportMode = "ai" | "waiting_human" | "human" | "resolved";
export type SessionStatus =
  | "OPEN"
  | "WAITING_HUMAN"
  | "IN_HUMAN_SUPPORT"
  | "ESCALATED"
  | "CLOSED";

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant" | "admin" | "system";
  senderName?: string;
  text: string;
  language?: SupportedLanguage;
  intent?: RichChatIntent | string;
  source?: string;
  confidence?: number;
  responseTimeMs?: number;
  quickReplies?: string[];
  followUpSuggestions?: string[];
  attachments?: ChatAttachmentItem[];
  timestamp: string;
}

export interface InternalSessionNote {
  id: string;
  authorName: string;
  authorEmail: string;
  note: string;
  createdAt: string;
}

export interface ChatbotSessionRecord {
  sessionId: string;
  sessionToken: string;
  customerUserId?: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  language: SupportedLanguage;
  detectedIntent: RichChatIntent;
  activeWorkflowId: string | null;
  activeWorkflowStepIndex: number;
  collectedLead: LeadDataFields;
  attachments: ChatAttachmentItem[];
  messages: PersistedChatMessage[];
  mode: SessionSupportMode;
  status: SessionStatus;
  assignedAdminId?: number | null;
  assignedAdminName?: string;
  assignedAdminEmail?: string;
  internalNotes: InternalSessionNote[];
  consecutiveFallbacks: number;
  leadId?: string | null;
  rating?: number | null;
  feedbackComment?: string;
  handoverCount: number;
  avgResponseTimeMs: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface UnansweredQuestionRecord {
  id: string;
  normalizedKey: string;
  question: string;
  sessionId: string;
  language: SupportedLanguage;
  suggestedCategory: string;
  reason: string;
  occurrenceCount: number;
  status: "PENDING" | "CONVERTED" | "DISMISSED";
  convertedFaqId?: string;
  sampleContexts: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export type LeadStage =
  | "POTENTIAL"
  | "QUALIFIED"
  | "RFQ_SYNCED"
  | "CONTACTED"
  | "WON"
  | "CLOSED";

export interface ChatbotLeadRecord {
  id: string;
  sessionId: string;
  sourceIntent: RichChatIntent | string;
  language: SupportedLanguage;
  status: LeadStage;
  isQualified: boolean;
  rfqId?: number | null;
  fields: LeadDataFields;
  attachments: ChatAttachmentItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiCacheEntry {
  key: string;
  querySample: string;
  language: SupportedLanguage;
  reply: string;
  followUpSuggestions: string[];
  detectedService?: string;
  confidence: number;
  hits: number;
  createdAt: string;
  expiresAt: string;
}

export interface AiUsageLedger {
  dateKey: string;
  geminiCallsToday: number;
  cacheHitsToday: number;
  localZeroCreditHitsToday: number;
  totalCallsAllTime: number;
  totalCreditsSavedAllTime: number;
  lastGeminiError?: string;
  lastGeminiErrorAt?: string;
}

export interface ConfigHistoryEntry {
  id: string;
  changedAt: string;
  changedBy: string;
  summary: string;
  snapshot: Partial<ChatbotConfig>;
}

const DOC_KB_META = "chatbot_knowledge_meta";
const DOC_KB_DOCS = "chatbot_documents";
const DOC_WORKFLOWS = "chatbot_workflows";
const DOC_SESSIONS = "chatbot_sessions";
const DOC_UNANSWERED = "chatbot_unanswered";
const DOC_LEADS = "chatbot_leads";
const DOC_AI_CACHE = "chatbot_ai_cache";
const DOC_AI_USAGE = "chatbot_ai_usage";
const DOC_CONFIG_HISTORY = "chatbot_config_history";

// ============================================================================
// CONFIG + HISTORY
// ============================================================================

export async function getStoredChatbotConfig(): Promise<ChatbotConfig> {
  const raw = await getCmsDoc<Partial<ChatbotConfig>>("chatbot_config", DEFAULT_CHATBOT_CONFIG);
  return normalizeChatbotConfig(raw, DEFAULT_CHATBOT_CONFIG);
}

export async function saveChatbotConfigWithHistory(
  next: ChatbotConfig,
  changedBy: string,
  summary = "Updated chatbot configuration"
): Promise<ChatbotConfig> {
  await setCmsDoc("chatbot_config", next as unknown as Record<string, unknown>);
  const historyKey = `cfg-${Date.now()}-${randomBytes(2).toString("hex")}`;
  const snapshot: Partial<ChatbotConfig> = {
    assistantName: next.assistantName,
    aiMode: next.aiMode,
    personalityTone: next.personalityTone,
    responseLength: next.responseLength,
    dailyAiCallLimit: next.dailyAiCallLimit,
    aiConfidenceThreshold: next.aiConfidenceThreshold,
    knowledgeMatchThreshold: next.knowledgeMatchThreshold,
    retentionDays: next.retentionDays,
    enabled: next.enabled,
  };

  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      await db.insert(chatbotConfigHistory).values({
        historyKey,
        changedBy,
        summary,
        snapshot: snapshot as Record<string, unknown>,
      });
      await clearAiResponseCache();
      return next;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const historyDoc = await getCmsDoc<{ items: ConfigHistoryEntry[] }>(DOC_CONFIG_HISTORY, {
    items: [],
  });
  const items = Array.isArray(historyDoc.items) ? historyDoc.items : [];
  items.unshift({
    id: historyKey,
    changedAt: new Date().toISOString(),
    changedBy,
    summary,
    snapshot,
  });
  await setCmsDoc(DOC_CONFIG_HISTORY, { items: items.slice(0, 50) });
  await clearAiResponseCache();
  return next;
}

export async function listChatbotConfigHistory(): Promise<ConfigHistoryEntry[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotConfigHistory)
        .orderBy(desc(chatbotConfigHistory.changedAt))
        .limit(50);
      return rows.map((r) => ({
        id: r.historyKey,
        changedAt: r.changedAt.toISOString(),
        changedBy: r.changedBy,
        summary: r.summary,
        snapshot: (r.snapshot || {}) as Partial<ChatbotConfig>,
      }));
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  const doc = await getCmsDoc<{ items: ConfigHistoryEntry[] }>(DOC_CONFIG_HISTORY, {
    items: [],
  });
  return Array.isArray(doc.items) ? doc.items : [];
}

// ============================================================================
// EXTENDED KNOWLEDGE BASE & COMPANY DOCUMENTS
// ============================================================================

export async function getKnowledgeMetaMap(): Promise<Record<string, KnowledgeItemMeta>> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const [faqRows, revisionRows] = await Promise.all([
        db.select().from(chatbotFaqs),
        db
          .select()
          .from(chatbotKnowledgeRevisions)
          .orderBy(desc(chatbotKnowledgeRevisions.version)),
      ]);
      const revMap = new Map<string, typeof revisionRows>();
      for (const rev of revisionRows) {
        const cur = revMap.get(rev.faqKey) || [];
        cur.push(rev);
        revMap.set(rev.faqKey, cur);
      }
      const out: Record<string, KnowledgeItemMeta> = {};
      for (const row of faqRows) {
        const revs = (revMap.get(row.faqKey) || []).map((r) => ({
          version: r.version,
          editedAt: r.editedAt.toISOString(),
          editedBy: r.editedByName,
          summary: r.summary,
          status: (r.status as KnowledgePublicationStatus) || "published",
        }));
        out[row.faqKey] = normalizeKnowledgeMeta(
          row.faqKey,
          {
            faqId: row.faqKey,
            subcategory: row.subcategory,
            alternativeQuestions: row.alternativeQuestions,
            synonyms: row.synonyms,
            relatedTopics: row.relatedTopics,
            status: (row.status as KnowledgePublicationStatus) || "published",
            translations: row.translations,
            attachments: row.attachments,
            revisions: revs,
            usageCount: row.usageCount,
            helpfulCount: row.helpfulCount,
            lastMatchedAt: row.lastMatchedAt ? row.lastMatchedAt.toISOString() : undefined,
          },
          "published"
        );
      }
      return out;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  const doc = await getCmsDoc<{ map: Record<string, KnowledgeItemMeta> }>(DOC_KB_META, {
    map: { ...DEFAULT_KNOWLEDGE_META },
  });
  return doc.map || { ...DEFAULT_KNOWLEDGE_META };
}

export async function saveKnowledgeMetaMap(
  map: Record<string, KnowledgeItemMeta>
): Promise<void> {
  await setCmsDoc(DOC_KB_META, { map });
}

export async function listExtendedKnowledgeItems(): Promise<KnowledgeItemExtended[]> {
  const [faqs, metaMap] = await Promise.all([listChatbotFaqs(), getKnowledgeMetaMap()]);
  return faqs.map((f) => mergeFaqWithMeta(f, metaMap));
}

export async function upsertExtendedKnowledgeMeta(
  faqId: string,
  metaInput: Partial<KnowledgeItemMeta>,
  editorName = "Admin",
  revisionSummary = "Updated knowledge entry"
): Promise<KnowledgeItemMeta> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const existingRows = await db
        .select()
        .from(chatbotFaqs)
        .where(eq(chatbotFaqs.faqKey, faqId))
        .limit(1);
      const row = existingRows[0];
      if (row) {
        const revRows = await db
          .select()
          .from(chatbotKnowledgeRevisions)
          .where(eq(chatbotKnowledgeRevisions.faqKey, faqId))
          .orderBy(desc(chatbotKnowledgeRevisions.version));
        const existingMeta = normalizeKnowledgeMeta(
          faqId,
          {
            faqId,
            subcategory: row.subcategory,
            alternativeQuestions: row.alternativeQuestions,
            synonyms: row.synonyms,
            relatedTopics: row.relatedTopics,
            status: row.status as KnowledgePublicationStatus,
            translations: row.translations,
            attachments: row.attachments,
            usageCount: row.usageCount,
            helpfulCount: row.helpfulCount,
            lastMatchedAt: row.lastMatchedAt?.toISOString(),
            revisions: revRows.map((r) => ({
              version: r.version,
              editedAt: r.editedAt.toISOString(),
              editedBy: r.editedByName,
              summary: r.summary,
              status: r.status as KnowledgePublicationStatus,
            })),
          },
          "published"
        );
        const merged = normalizeKnowledgeMeta(
          faqId,
          { ...existingMeta, ...metaInput },
          existingMeta.status
        );
        const nextVersion = (revRows[0]?.version || 0) + 1;

        await db
          .update(chatbotFaqs)
          .set({
            subcategory: merged.subcategory,
            alternativeQuestions: merged.alternativeQuestions,
            synonyms: merged.synonyms,
            relatedTopics: merged.relatedTopics,
            status: merged.status,
            translations: merged.translations,
            attachments: merged.attachments,
            usageCount: merged.usageCount,
            helpfulCount: merged.helpfulCount,
            updatedAt: new Date(),
          })
          .where(eq(chatbotFaqs.id, row.id));

        await db.insert(chatbotKnowledgeRevisions).values({
          faqId: row.id,
          faqKey: faqId,
          version: nextVersion,
          status: merged.status,
          summary: revisionSummary,
          editedByName: editorName,
        });

        merged.revisions = [
          {
            version: nextVersion,
            editedAt: new Date().toISOString(),
            editedBy: editorName,
            summary: revisionSummary,
            status: merged.status,
          },
          ...(existingMeta.revisions || []),
        ].slice(0, 20);

        await clearAiResponseCache();
        return merged;
      }
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const map = await getKnowledgeMetaMap();
  const existing =
    map[faqId] ||
    DEFAULT_KNOWLEDGE_META[faqId] ||
    normalizeKnowledgeMeta(faqId, undefined, "published");
  const merged = normalizeKnowledgeMeta(faqId, { ...existing, ...metaInput }, existing.status);
  const nextVersion = (existing.revisions?.length || 0) + 1;
  merged.revisions = [
    {
      version: nextVersion,
      editedAt: new Date().toISOString(),
      editedBy: editorName,
      summary: revisionSummary,
      status: merged.status,
    },
    ...(existing.revisions || []),
  ].slice(0, 20);

  map[faqId] = merged;
  await saveKnowledgeMetaMap(map);
  await clearAiResponseCache();
  return merged;
}

export async function removeKnowledgeMeta(faqId: string): Promise<void> {
  if (!isMemoryFallbackActive()) {
    try {
      await db
        .delete(chatbotKnowledgeRevisions)
        .where(eq(chatbotKnowledgeRevisions.faqKey, faqId));
      await clearAiResponseCache();
      return;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  const map = await getKnowledgeMetaMap();
  if (map[faqId]) {
    delete map[faqId];
    await saveKnowledgeMetaMap(map);
    await clearAiResponseCache();
  }
}

export async function incrementKnowledgeUsage(faqId: string): Promise<void> {
  if (!isMemoryFallbackActive()) {
    try {
      const existing = await db
        .select()
        .from(chatbotFaqs)
        .where(eq(chatbotFaqs.faqKey, faqId))
        .limit(1);
      if (existing[0]) {
        await db
          .update(chatbotFaqs)
          .set({
            usageCount: (existing[0].usageCount || 0) + 1,
            lastMatchedAt: new Date(),
          })
          .where(eq(chatbotFaqs.id, existing[0].id));
        return;
      }
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const map = await getKnowledgeMetaMap();
  const existing =
    map[faqId] ||
    DEFAULT_KNOWLEDGE_META[faqId] ||
    normalizeKnowledgeMeta(faqId, undefined, "published");
  existing.usageCount = (existing.usageCount || 0) + 1;
  existing.lastMatchedAt = new Date().toISOString();
  map[faqId] = existing;
  await saveKnowledgeMetaMap(map);
}

export async function listKnowledgeDocuments(): Promise<KnowledgeDocumentItem[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotDocuments)
        .orderBy(desc(chatbotDocuments.updatedAt));
      return rows.map((r) => ({
        id: r.docKey,
        title: r.title,
        category: r.category,
        subcategory: r.subcategory,
        language: (r.language as SupportedLanguage | "all") || "all",
        fileUrl: r.fileUrl,
        fileName: r.fileName,
        mimeType: r.mimeType,
        fileSizeBytes: r.fileSizeBytes,
        summary: r.summary,
        extractedText: r.extractedText,
        keywords: r.keywords,
        status: (r.status as KnowledgePublicationStatus) || "published",
        uploadedBy: r.uploadedBy,
        uploadedAt: r.uploadedAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  const doc = await getCmsDoc<{ items: KnowledgeDocumentItem[] }>(DOC_KB_DOCS, { items: [] });
  return Array.isArray(doc.items) ? doc.items : [];
}

export async function upsertKnowledgeDocument(
  item: Partial<KnowledgeDocumentItem> & { title: string; fileUrl: string; fileName: string }
): Promise<KnowledgeDocumentItem> {
  const now = new Date();
  const nowIso = now.toISOString();
  const id = item.id?.trim() || `kbdoc-${Date.now()}-${randomBytes(2).toString("hex")}`;
  const normalizedKeywords = Array.isArray(item.keywords)
    ? item.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
    : [];

  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const mediaAssetId = await ensureMediaAssetIdForUrl(item.fileUrl, item.title, "chatbot");
      const [saved] = await db
        .insert(chatbotDocuments)
        .values({
          docKey: id,
          title: item.title.trim(),
          category: (item.category || "Technical Catalogue").trim(),
          subcategory: (item.subcategory || "").trim(),
          language: item.language || "all",
          mediaAssetId,
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          mimeType: item.mimeType || "application/pdf",
          fileSizeBytes: Number(item.fileSizeBytes) || 0,
          summary: (item.summary || "").trim(),
          extractedText: (item.extractedText || "").trim(),
          keywords: normalizedKeywords,
          status: item.status || "published",
          uploadedBy: item.uploadedBy || "Admin",
          uploadedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: chatbotDocuments.docKey,
          set: {
            title: item.title.trim(),
            category: (item.category || "Technical Catalogue").trim(),
            subcategory: (item.subcategory || "").trim(),
            language: item.language || "all",
            mediaAssetId,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            mimeType: item.mimeType || "application/pdf",
            fileSizeBytes: Number(item.fileSizeBytes) || 0,
            summary: (item.summary || "").trim(),
            extractedText: (item.extractedText || "").trim(),
            keywords: normalizedKeywords,
            status: item.status || "published",
            uploadedBy: item.uploadedBy || "Admin",
            updatedAt: now,
          },
        })
        .returning();

      await clearAiResponseCache();
      return {
        id: saved.docKey,
        title: saved.title,
        category: saved.category,
        subcategory: saved.subcategory,
        language: (saved.language as SupportedLanguage | "all") || "all",
        fileUrl: saved.fileUrl,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSizeBytes: saved.fileSizeBytes,
        summary: saved.summary,
        extractedText: saved.extractedText,
        keywords: saved.keywords,
        status: (saved.status as KnowledgePublicationStatus) || "published",
        uploadedBy: saved.uploadedBy,
        uploadedAt: saved.uploadedAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listKnowledgeDocuments();
  const idx = list.findIndex((d) => d.id === id);

  const normalized: KnowledgeDocumentItem = {
    id,
    title: item.title.trim(),
    category: (item.category || "Technical Catalogue").trim(),
    subcategory: (item.subcategory || "").trim(),
    language: item.language || "all",
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    mimeType: item.mimeType || "application/pdf",
    fileSizeBytes: Number(item.fileSizeBytes) || 0,
    summary: (item.summary || "").trim(),
    extractedText: (item.extractedText || "").trim(),
    keywords: normalizedKeywords,
    status: item.status || "published",
    uploadedBy: item.uploadedBy || "Admin",
    uploadedAt: idx >= 0 ? list[idx].uploadedAt : nowIso,
    updatedAt: nowIso,
  };

  if (idx >= 0) {
    list[idx] = normalized;
  } else {
    list.unshift(normalized);
  }
  await setCmsDoc(DOC_KB_DOCS, { items: list });
  await clearAiResponseCache();
  return normalized;
}

export async function deleteKnowledgeDocument(id: string): Promise<boolean> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const deleted = await db
        .delete(chatbotDocuments)
        .where(eq(chatbotDocuments.docKey, id))
        .returning();
      if (deleted.length > 0) {
        await clearAiResponseCache();
        return true;
      }
      return false;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listKnowledgeDocuments();
  const next = list.filter((d) => d.id !== id);
  if (next.length === list.length) return false;
  await setCmsDoc(DOC_KB_DOCS, { items: next });
  await clearAiResponseCache();
  return true;
}

// ============================================================================
// CONFIGURABLE WORKFLOWS
// ============================================================================

export async function listChatbotWorkflows(): Promise<ChatbotWorkflow[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotWorkflows)
        .orderBy(desc(chatbotWorkflows.priority), asc(chatbotWorkflows.id));
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.workflowKey,
          name: r.name,
          intent: r.intent as RichChatIntent,
          category: r.category,
          description: r.description,
          enabled: r.enabled,
          priority: r.priority,
          triggerKeywords: r.triggerKeywords,
          steps: r.steps as unknown as ChatbotWorkflow["steps"],
          completionAction: r.completionAction as ChatbotWorkflow["completionAction"],
          completionMessage: r.completionMessage,
          localizedCompletionMessages:
            (r.localizedCompletionMessages as Partial<Record<SupportedLanguage, string>>) ||
            undefined,
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: ChatbotWorkflow[] }>(DOC_WORKFLOWS, {
    items: DEFAULT_CHATBOT_WORKFLOWS,
  });
  const items =
    Array.isArray(doc.items) && doc.items.length > 0 ? doc.items : DEFAULT_CHATBOT_WORKFLOWS;
  return [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export async function saveChatbotWorkflows(
  items: ChatbotWorkflow[]
): Promise<ChatbotWorkflow[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      for (const wf of items) {
        await db
          .insert(chatbotWorkflows)
          .values({
            workflowKey: wf.id,
            name: wf.name,
            intent: wf.intent,
            category: wf.category,
            description: wf.description,
            enabled: wf.enabled,
            priority: wf.priority,
            triggerKeywords: wf.triggerKeywords,
            steps: wf.steps as unknown as Array<Record<string, unknown>>,
            completionAction: wf.completionAction,
            completionMessage: wf.completionMessage,
            localizedCompletionMessages: wf.localizedCompletionMessages || {},
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: chatbotWorkflows.workflowKey,
            set: {
              name: wf.name,
              intent: wf.intent,
              category: wf.category,
              description: wf.description,
              enabled: wf.enabled,
              priority: wf.priority,
              triggerKeywords: wf.triggerKeywords,
              steps: wf.steps as unknown as Array<Record<string, unknown>>,
              completionAction: wf.completionAction,
              completionMessage: wf.completionMessage,
              localizedCompletionMessages: wf.localizedCompletionMessages || {},
              updatedAt: new Date(),
            },
          });
      }
      return listChatbotWorkflows();
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  await setCmsDoc(DOC_WORKFLOWS, { items });
  return listChatbotWorkflows();
}

export async function upsertChatbotWorkflow(
  workflow: Partial<ChatbotWorkflow> & { name: string }
): Promise<ChatbotWorkflow[]> {
  const items = await listChatbotWorkflows();
  const id = workflow.id?.trim() || `wf-${Date.now()}-${randomBytes(2).toString("hex")}`;
  const idx = items.findIndex((w) => w.id === id);
  const existing = idx >= 0 ? items[idx] : undefined;

  const saved: ChatbotWorkflow = {
    id,
    name: workflow.name.trim(),
    intent: workflow.intent || existing?.intent || "general_inquiry",
    category: (workflow.category || existing?.category || "General").trim(),
    description: (workflow.description ?? existing?.description ?? "").trim(),
    enabled: typeof workflow.enabled === "boolean" ? workflow.enabled : existing?.enabled ?? true,
    priority:
      typeof workflow.priority === "number" && Number.isFinite(workflow.priority)
        ? workflow.priority
        : existing?.priority ?? 5,
    triggerKeywords: Array.isArray(workflow.triggerKeywords)
      ? workflow.triggerKeywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
      : existing?.triggerKeywords || [],
    steps: Array.isArray(workflow.steps) ? workflow.steps : existing?.steps || [],
    completionAction: workflow.completionAction || existing?.completionAction || "create_lead",
    completionMessage: (
      workflow.completionMessage ??
      existing?.completionMessage ??
      "Thank you! Your details have been saved."
    ).trim(),
    localizedCompletionMessages:
      workflow.localizedCompletionMessages ?? existing?.localizedCompletionMessages,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) items[idx] = saved;
  else items.push(saved);

  return saveChatbotWorkflows(items);
}

export async function deleteChatbotWorkflow(id: string): Promise<boolean> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const deleted = await db
        .delete(chatbotWorkflows)
        .where(eq(chatbotWorkflows.workflowKey, id))
        .returning();
      return deleted.length > 0;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const items = await listChatbotWorkflows();
  const next = items.filter((w) => w.id !== id);
  if (next.length === items.length) return false;
  await saveChatbotWorkflows(next);
  return true;
}

// ============================================================================
// CONVERSATION SESSIONS & HUMAN HANDOVER
// ============================================================================

function mapDbSessionToRecord(
  row: typeof chatbotSessions.$inferSelect,
  msgRows: Array<typeof chatbotMessages.$inferSelect>,
  noteRows: Array<typeof chatbotSessionNotes.$inferSelect>
): ChatbotSessionRecord {
  return {
    sessionId: row.sessionId,
    sessionToken: row.sessionToken,
    customerUserId: row.customerUserId ?? null,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    customerCompany: row.customerCompany,
    language: (row.language as SupportedLanguage) || "en",
    detectedIntent: (row.detectedIntent as RichChatIntent) || "general_inquiry",
    activeWorkflowId: row.activeWorkflowId ?? null,
    activeWorkflowStepIndex: row.activeWorkflowStepIndex,
    collectedLead: (row.collectedLead || {}) as LeadDataFields,
    attachments: (row.attachments || []) as unknown as ChatAttachmentItem[],
    messages: msgRows
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map((m) => ({
        id: m.messageKey,
        role: m.role as PersistedChatMessage["role"],
        senderName: m.senderName || undefined,
        text: m.text,
        language: (m.language as SupportedLanguage) || undefined,
        intent: m.intent || undefined,
        source: m.source || undefined,
        confidence: m.confidence !== null && m.confidence !== undefined ? Number(m.confidence) : undefined,
        responseTimeMs: m.responseTimeMs ?? undefined,
        quickReplies: m.quickReplies,
        followUpSuggestions: m.followUpSuggestions,
        attachments: m.attachments as unknown as ChatAttachmentItem[],
        timestamp: m.createdAt.toISOString(),
      })),
    mode: (row.mode as SessionSupportMode) || "ai",
    status: (row.status as SessionStatus) || "OPEN",
    assignedAdminId: row.assignedAdminId ?? null,
    assignedAdminName: row.assignedAdminName || undefined,
    assignedAdminEmail: row.assignedAdminEmail || undefined,
    internalNotes: noteRows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({
        id: n.noteKey,
        authorName: n.authorName,
        authorEmail: n.authorEmail,
        note: n.note,
        createdAt: n.createdAt.toISOString(),
      })),
    consecutiveFallbacks: row.consecutiveFallbacks,
    leadId: row.leadCode ?? null,
    rating: row.rating ?? null,
    feedbackComment: row.feedbackComment || undefined,
    handoverCount: row.handoverCount,
    avgResponseTimeMs: row.avgResponseTimeMs,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  };
}

async function loadSessionsList(): Promise<ChatbotSessionRecord[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const sessionRows = await db
        .select()
        .from(chatbotSessions)
        .orderBy(desc(chatbotSessions.lastActivityAt));
      if (sessionRows.length === 0) return [];
      const refIds = sessionRows.map((s) => s.id);
      const [msgRows, noteRows] = await Promise.all([
        db.select().from(chatbotMessages).where(inArray(chatbotMessages.sessionRefId, refIds)),
        db.select().from(chatbotSessionNotes).where(inArray(chatbotSessionNotes.sessionRefId, refIds)),
      ]);
      const msgMap = new Map<number, typeof msgRows>();
      for (const m of msgRows) {
        const list = msgMap.get(m.sessionRefId) || [];
        list.push(m);
        msgMap.set(m.sessionRefId, list);
      }
      const noteMap = new Map<number, typeof noteRows>();
      for (const n of noteRows) {
        const list = noteMap.get(n.sessionRefId) || [];
        list.push(n);
        noteMap.set(n.sessionRefId, list);
      }
      return sessionRows.map((s) =>
        mapDbSessionToRecord(s, msgMap.get(s.id) || [], noteMap.get(s.id) || [])
      );
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: ChatbotSessionRecord[] }>(DOC_SESSIONS, { items: [] });
  return Array.isArray(doc.items) ? doc.items : [];
}

async function saveSessionsList(items: ChatbotSessionRecord[]): Promise<void> {
  // Keep latest 350 sessions in memory-fallback cms_documents mode
  const sorted = [...items].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  await setCmsDoc(DOC_SESSIONS, { items: sorted.slice(0, 350) });
}

export async function pruneExpiredChatSessions(retentionDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - Math.max(7, retentionDays) * 86_400_000);
  if (!isMemoryFallbackActive()) {
    try {
      const deleted = await db
        .delete(chatbotSessions)
        .where(lt(chatbotSessions.lastActivityAt, cutoffDate))
        .returning({ id: chatbotSessions.id });
      return deleted.length;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await loadSessionsList();
  const cutoff = cutoffDate.getTime();
  const kept = list.filter((s) => new Date(s.lastActivityAt).getTime() >= cutoff);
  if (kept.length !== list.length) {
    await saveSessionsList(kept);
  }
  return list.length - kept.length;
}

export async function listChatSessions(filters?: {
  status?: string;
  mode?: string;
  search?: string;
}): Promise<ChatbotSessionRecord[]> {
  let list = await loadSessionsList();
  if (filters?.status) {
    list = list.filter((s) => s.status === filters.status);
  }
  if (filters?.mode) {
    list = list.filter((s) => s.mode === filters.mode);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter((s) =>
      `${s.sessionId} ${s.customerName} ${s.customerEmail} ${s.customerPhone} ${s.detectedIntent}`
        .toLowerCase()
        .includes(q)
    );
  }
  return list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export async function getChatSession(sessionId: string): Promise<ChatbotSessionRecord | null> {
  if (!sessionId) return null;
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotSessions)
        .where(eq(chatbotSessions.sessionId, sessionId))
        .limit(1);
      if (!rows[0]) return null;
      const [msgRows, noteRows] = await Promise.all([
        db
          .select()
          .from(chatbotMessages)
          .where(eq(chatbotMessages.sessionRefId, rows[0].id))
          .orderBy(asc(chatbotMessages.createdAt), asc(chatbotMessages.id)),
        db
          .select()
          .from(chatbotSessionNotes)
          .where(eq(chatbotSessionNotes.sessionRefId, rows[0].id))
          .orderBy(desc(chatbotSessionNotes.createdAt)),
      ]);
      return mapDbSessionToRecord(rows[0], msgRows, noteRows);
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  const list = await loadSessionsList();
  return list.find((s) => s.sessionId === sessionId) || null;
}

export function createNewSessionRecord(input?: {
  sessionId?: string;
  customerUserId?: number | null;
  customerName?: string;
  customerEmail?: string;
  language?: SupportedLanguage;
}): ChatbotSessionRecord {
  const now = new Date().toISOString();
  return {
    sessionId:
      input?.sessionId?.trim() || `sess-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
    sessionToken: randomBytes(16).toString("hex"),
    customerUserId: input?.customerUserId ?? null,
    customerName: input?.customerName || "",
    customerEmail: input?.customerEmail || "",
    customerPhone: "",
    customerCompany: "",
    language: input?.language || "en",
    detectedIntent: "general_inquiry",
    activeWorkflowId: null,
    activeWorkflowStepIndex: 0,
    collectedLead: {
      name: input?.customerName || undefined,
      email: input?.customerEmail || undefined,
    },
    attachments: [],
    messages: [],
    mode: "ai",
    status: "OPEN",
    internalNotes: [],
    consecutiveFallbacks: 0,
    handoverCount: 0,
    avgResponseTimeMs: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
}

export async function upsertChatSession(
  session: ChatbotSessionRecord
): Promise<ChatbotSessionRecord> {
  const now = new Date();
  const next: ChatbotSessionRecord = {
    ...session,
    updatedAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
  };

  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const [savedSession] = await db
        .insert(chatbotSessions)
        .values({
          sessionId: next.sessionId,
          sessionToken: next.sessionToken,
          customerUserId: next.customerUserId ?? null,
          customerName: next.customerName,
          customerEmail: next.customerEmail,
          customerPhone: next.customerPhone,
          customerCompany: next.customerCompany,
          language: next.language,
          detectedIntent: next.detectedIntent,
          activeWorkflowId: next.activeWorkflowId,
          activeWorkflowStepIndex: next.activeWorkflowStepIndex,
          collectedLead: next.collectedLead as Record<string, unknown>,
          attachments: next.attachments as unknown as Array<Record<string, unknown>>,
          mode: next.mode,
          status: next.status,
          assignedAdminId: next.assignedAdminId ?? null,
          assignedAdminName: next.assignedAdminName || "",
          assignedAdminEmail: next.assignedAdminEmail || "",
          consecutiveFallbacks: next.consecutiveFallbacks,
          leadCode: next.leadId ?? null,
          rating: next.rating ?? null,
          feedbackComment: next.feedbackComment || "",
          handoverCount: next.handoverCount,
          avgResponseTimeMs: next.avgResponseTimeMs,
          createdAt: new Date(next.createdAt || now),
          updatedAt: now,
          lastActivityAt: now,
        })
        .onConflictDoUpdate({
          target: chatbotSessions.sessionId,
          set: {
            customerUserId: next.customerUserId ?? null,
            customerName: next.customerName,
            customerEmail: next.customerEmail,
            customerPhone: next.customerPhone,
            customerCompany: next.customerCompany,
            language: next.language,
            detectedIntent: next.detectedIntent,
            activeWorkflowId: next.activeWorkflowId,
            activeWorkflowStepIndex: next.activeWorkflowStepIndex,
            collectedLead: next.collectedLead as Record<string, unknown>,
            attachments: next.attachments as unknown as Array<Record<string, unknown>>,
            mode: next.mode,
            status: next.status,
            assignedAdminId: next.assignedAdminId ?? null,
            assignedAdminName: next.assignedAdminName || "",
            assignedAdminEmail: next.assignedAdminEmail || "",
            consecutiveFallbacks: next.consecutiveFallbacks,
            leadCode: next.leadId ?? null,
            rating: next.rating ?? null,
            feedbackComment: next.feedbackComment || "",
            handoverCount: next.handoverCount,
            avgResponseTimeMs: next.avgResponseTimeMs,
            updatedAt: now,
            lastActivityAt: now,
          },
        })
        .returning();

      for (const msg of next.messages) {
        await db
          .insert(chatbotMessages)
          .values({
            sessionRefId: savedSession.id,
            messageKey: msg.id,
            role: msg.role,
            senderName: msg.senderName || "",
            text: msg.text,
            language: msg.language || next.language,
            intent: msg.intent || "",
            source: msg.source || "",
            confidence: msg.confidence !== undefined ? String(msg.confidence) : null,
            responseTimeMs: msg.responseTimeMs ?? null,
            quickReplies: msg.quickReplies || [],
            followUpSuggestions: msg.followUpSuggestions || [],
            attachments: (msg.attachments || []) as unknown as Array<Record<string, unknown>>,
            createdAt: new Date(msg.timestamp || now),
          })
          .onConflictDoNothing();
      }

      for (const note of next.internalNotes) {
        await db
          .insert(chatbotSessionNotes)
          .values({
            sessionRefId: savedSession.id,
            noteKey: note.id,
            authorName: note.authorName,
            authorEmail: note.authorEmail,
            note: note.note,
            createdAt: new Date(note.createdAt || now),
          })
          .onConflictDoNothing();
      }

      return next;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await loadSessionsList();
  const idx = list.findIndex((s) => s.sessionId === next.sessionId);
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  await saveSessionsList(list);
  return next;
}

export async function findCustomerContactHistory(params: {
  email?: string;
  phone?: string;
  excludeSessionId?: string;
}) {
  const sessions = await loadSessionsList();
  const emailLower = (params.email || "").trim().toLowerCase();
  const phoneDigits = (params.phone || "").replace(/[^\d]/g, "");
  if (!emailLower && phoneDigits.length < 7) return [];

  return sessions
    .filter((s) => {
      if (params.excludeSessionId && s.sessionId === params.excludeSessionId) return false;
      const matchEmail = emailLower && s.customerEmail.toLowerCase() === emailLower;
      const sDigits = s.customerPhone.replace(/[^\d]/g, "");
      const matchPhone = phoneDigits.length >= 7 && sDigits.endsWith(phoneDigits.slice(-7));
      return Boolean(matchEmail || matchPhone);
    })
    .slice(0, 10)
    .map((s) => ({
      sessionId: s.sessionId,
      status: s.status,
      detectedIntent: s.detectedIntent,
      lastActivityAt: s.lastActivityAt,
      messageCount: s.messages.length,
    }));
}

// ============================================================================
// UNANSWERED QUESTIONS REVIEW QUEUE
// ============================================================================

export async function listUnansweredQuestions(): Promise<UnansweredQuestionRecord[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotUnansweredQuestions)
        .orderBy(desc(chatbotUnansweredQuestions.occurrenceCount), desc(chatbotUnansweredQuestions.lastSeenAt));
      const mapped: UnansweredQuestionRecord[] = rows.map((r) => ({
        id: r.questionKey,
        normalizedKey: r.normalizedKey,
        question: r.question,
        sessionId: r.sessionId,
        language: (r.language as SupportedLanguage) || "en",
        suggestedCategory: r.suggestedCategory,
        reason: r.reason,
        occurrenceCount: r.occurrenceCount,
        status: (r.status as UnansweredQuestionRecord["status"]) || "PENDING",
        convertedFaqId: r.convertedFaqKey || undefined,
        sampleContexts: r.sampleContexts,
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
      }));
      return mapped.sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        if (b.occurrenceCount !== a.occurrenceCount) return b.occurrenceCount - a.occurrenceCount;
        return b.lastSeenAt.localeCompare(a.lastSeenAt);
      });
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: UnansweredQuestionRecord[] }>(DOC_UNANSWERED, {
    items: [],
  });
  const items = Array.isArray(doc.items) ? doc.items : [];
  return [...items].sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
    if (b.occurrenceCount !== a.occurrenceCount) return b.occurrenceCount - a.occurrenceCount;
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });
}

export async function recordUnansweredQuestion(input: {
  question: string;
  sessionId: string;
  language: SupportedLanguage;
  suggestedCategory: string;
  reason: string;
  notifyAdmin?: boolean;
}): Promise<UnansweredQuestionRecord> {
  const norm =
    normalizeAndExpandQuery(input.question).normalizedText || input.question.toLowerCase().trim();
  const now = new Date();
  const nowIso = now.toISOString();

  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const existingRows = await db
        .select()
        .from(chatbotUnansweredQuestions)
        .where(
          and(
            eq(chatbotUnansweredQuestions.normalizedKey, norm),
            eq(chatbotUnansweredQuestions.status, "PENDING")
          )
        )
        .limit(1);

      if (existingRows[0]) {
        const cur = existingRows[0];
        const nextContexts = cur.sampleContexts.includes(input.sessionId)
          ? cur.sampleContexts
          : [input.sessionId, ...cur.sampleContexts].slice(0, 5);
        const [updated] = await db
          .update(chatbotUnansweredQuestions)
          .set({
            occurrenceCount: cur.occurrenceCount + 1,
            lastSeenAt: now,
            reason: input.reason,
            sampleContexts: nextContexts,
          })
          .where(eq(chatbotUnansweredQuestions.id, cur.id))
          .returning();
        return {
          id: updated.questionKey,
          normalizedKey: updated.normalizedKey,
          question: updated.question,
          sessionId: updated.sessionId,
          language: (updated.language as SupportedLanguage) || "en",
          suggestedCategory: updated.suggestedCategory,
          reason: updated.reason,
          occurrenceCount: updated.occurrenceCount,
          status: updated.status as UnansweredQuestionRecord["status"],
          convertedFaqId: updated.convertedFaqKey || undefined,
          sampleContexts: updated.sampleContexts,
          firstSeenAt: updated.firstSeenAt.toISOString(),
          lastSeenAt: updated.lastSeenAt.toISOString(),
        };
      }

      const sessRows = await db
        .select({ id: chatbotSessions.id })
        .from(chatbotSessions)
        .where(eq(chatbotSessions.sessionId, input.sessionId))
        .limit(1);
      const questionKey = `unans-${Date.now().toString(36)}-${randomBytes(2).toString("hex")}`;

      const [inserted] = await db
        .insert(chatbotUnansweredQuestions)
        .values({
          questionKey,
          normalizedKey: norm,
          question: input.question.trim(),
          sessionRefId: sessRows[0]?.id ?? null,
          sessionId: input.sessionId,
          language: input.language,
          suggestedCategory: input.suggestedCategory || "General",
          reason: input.reason,
          occurrenceCount: 1,
          status: "PENDING",
          sampleContexts: [input.sessionId],
          firstSeenAt: now,
          lastSeenAt: now,
        })
        .returning();

      if (input.notifyAdmin) {
        await createNotificationRecord({
          title: "INNOASSIST: Unanswered Customer Question",
          body: `[${input.language.toUpperCase()}] "${input.question.slice(0, 110)}" — queued for admin KB approval.`,
        }).catch(() => null);
      }

      return {
        id: inserted.questionKey,
        normalizedKey: inserted.normalizedKey,
        question: inserted.question,
        sessionId: inserted.sessionId,
        language: (inserted.language as SupportedLanguage) || "en",
        suggestedCategory: inserted.suggestedCategory,
        reason: inserted.reason,
        occurrenceCount: inserted.occurrenceCount,
        status: inserted.status as UnansweredQuestionRecord["status"],
        sampleContexts: inserted.sampleContexts,
        firstSeenAt: inserted.firstSeenAt.toISOString(),
        lastSeenAt: inserted.lastSeenAt.toISOString(),
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listUnansweredQuestions();
  const existing = list.find((u) => u.normalizedKey === norm && u.status === "PENDING");

  if (existing) {
    existing.occurrenceCount += 1;
    existing.lastSeenAt = nowIso;
    existing.reason = input.reason;
    if (!existing.sampleContexts.includes(input.sessionId)) {
      existing.sampleContexts = [input.sessionId, ...existing.sampleContexts].slice(0, 5);
    }
    await setCmsDoc(DOC_UNANSWERED, { items: list });
    return existing;
  }

  const record: UnansweredQuestionRecord = {
    id: `unans-${Date.now().toString(36)}-${randomBytes(2).toString("hex")}`,
    normalizedKey: norm,
    question: input.question.trim(),
    sessionId: input.sessionId,
    language: input.language,
    suggestedCategory: input.suggestedCategory || "General",
    reason: input.reason,
    occurrenceCount: 1,
    status: "PENDING",
    sampleContexts: [input.sessionId],
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
  };
  list.unshift(record);
  await setCmsDoc(DOC_UNANSWERED, { items: list.slice(0, 250) });

  if (input.notifyAdmin) {
    await createNotificationRecord({
      title: "INNOASSIST: Unanswered Customer Question",
      body: `[${input.language.toUpperCase()}] "${input.question.slice(0, 110)}" — queued for admin KB approval.`,
    }).catch(() => null);
  }

  return record;
}

export async function convertUnansweredToKnowledge(input: {
  unansweredId: string;
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  synonyms?: string[];
  alternativeQuestions?: string[];
  status: KnowledgePublicationStatus;
  editorName: string;
}): Promise<{ unanswered: UnansweredQuestionRecord | null; faqId: string }> {
  const list = await listUnansweredQuestions();
  const idx = list.findIndex((u) => u.id === input.unansweredId);
  if (idx === -1) return { unanswered: null, faqId: "" };

  const faqId = `faq-${Date.now().toString(36)}`;
  await upsertChatbotFaqRecord({
    id: faqId,
    question: input.question.trim(),
    answer: input.answer.trim(),
    category: input.category.trim() || "General",
    keywords: input.keywords,
    enabled: input.status === "published" || input.status === "approved",
    priority: 8,
    updatedAt: new Date().toISOString(),
  });

  await upsertExtendedKnowledgeMeta(
    faqId,
    {
      subcategory: input.subcategory || "",
      synonyms: input.synonyms || [],
      alternativeQuestions: input.alternativeQuestions || [list[idx].question],
      status: input.status,
    },
    input.editorName,
    `Converted from unanswered question (${list[idx].id})`
  );

  if (!isMemoryFallbackActive()) {
    try {
      const faqRow = await db
        .select({ id: chatbotFaqs.id })
        .from(chatbotFaqs)
        .where(eq(chatbotFaqs.faqKey, faqId))
        .limit(1);
      await db
        .update(chatbotUnansweredQuestions)
        .set({
          status: "CONVERTED",
          convertedFaqId: faqRow[0]?.id ?? null,
          convertedFaqKey: faqId,
        })
        .where(eq(chatbotUnansweredQuestions.questionKey, input.unansweredId));
      list[idx].status = "CONVERTED";
      list[idx].convertedFaqId = faqId;
      return { unanswered: list[idx], faqId };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  list[idx].status = "CONVERTED";
  list[idx].convertedFaqId = faqId;
  await setCmsDoc(DOC_UNANSWERED, { items: list });
  return { unanswered: list[idx], faqId };
}

export async function dismissOrDeleteUnanswered(
  id: string,
  action: "dismiss" | "delete"
): Promise<boolean> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      if (action === "delete") {
        const deleted = await db
          .delete(chatbotUnansweredQuestions)
          .where(eq(chatbotUnansweredQuestions.questionKey, id))
          .returning();
        return deleted.length > 0;
      }
      const updated = await db
        .update(chatbotUnansweredQuestions)
        .set({ status: "DISMISSED" })
        .where(eq(chatbotUnansweredQuestions.questionKey, id))
        .returning();
      return updated.length > 0;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listUnansweredQuestions();
  if (action === "delete") {
    const next = list.filter((u) => u.id !== id);
    if (next.length === list.length) return false;
    await setCmsDoc(DOC_UNANSWERED, { items: next });
    return true;
  }
  const target = list.find((u) => u.id === id);
  if (!target) return false;
  target.status = "DISMISSED";
  await setCmsDoc(DOC_UNANSWERED, { items: list });
  return true;
}

// ============================================================================
// STRUCTURED LEADS & RFQ SYNC
// ============================================================================

export async function listChatbotLeads(): Promise<ChatbotLeadRecord[]> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotLeads)
        .orderBy(desc(chatbotLeads.updatedAt));
      return rows.map((r) => ({
        id: r.leadCode,
        sessionId: r.sessionId,
        sourceIntent: r.sourceIntent,
        language: (r.language as SupportedLanguage) || "en",
        status: (r.status as LeadStage) || "POTENTIAL",
        isQualified: r.isQualified,
        rfqId: r.rfqId ?? null,
        fields: (r.fields || {}) as LeadDataFields,
        attachments: (r.attachments || []) as unknown as ChatAttachmentItem[],
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: ChatbotLeadRecord[] }>(DOC_LEADS, { items: [] });
  const items = Array.isArray(doc.items) ? doc.items : [];
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function isLeadQualified(fields: LeadDataFields): boolean {
  const hasContact = Boolean(fields.contactNumber?.trim() || fields.email?.trim());
  const hasScope = Boolean(
    fields.requiredService?.trim() ||
      fields.projectDescription?.trim() ||
      fields.dimensions?.trim()
  );
  return Boolean(fields.name?.trim() && hasContact && hasScope);
}

export async function createOrUpdateChatbotLead(input: {
  sessionId: string;
  sourceIntent: RichChatIntent | string;
  language: SupportedLanguage;
  fields: LeadDataFields;
  attachments?: ChatAttachmentItem[];
  notifyAdmin?: boolean;
}): Promise<ChatbotLeadRecord> {
  const now = new Date();
  const nowIso = now.toISOString();

  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const existingRows = await db
        .select()
        .from(chatbotLeads)
        .where(eq(chatbotLeads.sessionId, input.sessionId))
        .limit(1);
      const existing = existingRows[0];

      const mergedFields: LeadDataFields = {
        ...((existing?.fields || {}) as LeadDataFields),
        ...Object.fromEntries(
          Object.entries(input.fields).filter(([, v]) => typeof v === "string" && v.trim() !== "")
        ),
      };
      const qualified = isLeadQualified(mergedFields);
      const existingAtts = (existing?.attachments || []) as unknown as ChatAttachmentItem[];
      const nextAtts = [...existingAtts];
      for (const att of input.attachments || []) {
        if (!nextAtts.some((a) => a.fileUrl === att.fileUrl)) nextAtts.push(att);
      }

      if (existing) {
        const nextStatus =
          qualified && existing.status === "POTENTIAL" ? "QUALIFIED" : existing.status;
        const [updated] = await db
          .update(chatbotLeads)
          .set({
            sourceIntent: input.sourceIntent || existing.sourceIntent,
            language: input.language || existing.language,
            fields: mergedFields as Record<string, unknown>,
            customerName: mergedFields.name || existing.customerName,
            customerEmail: mergedFields.email || existing.customerEmail,
            customerPhone: mergedFields.contactNumber || existing.customerPhone,
            requiredService: mergedFields.requiredService || existing.requiredService,
            isQualified: qualified,
            status: nextStatus,
            attachments: nextAtts as unknown as Array<Record<string, unknown>>,
            updatedAt: now,
          })
          .where(eq(chatbotLeads.id, existing.id))
          .returning();

        if (!existing.isQualified && qualified && input.notifyAdmin) {
          await createNotificationRecord({
            title: "INNOASSIST: Qualified Lead Captured",
            body: `${mergedFields.name || "Customer"} (${mergedFields.contactNumber || mergedFields.email || "No phone"}) — ${mergedFields.requiredService || input.sourceIntent}`,
          }).catch(() => null);
        }

        return {
          id: updated.leadCode,
          sessionId: updated.sessionId,
          sourceIntent: updated.sourceIntent,
          language: (updated.language as SupportedLanguage) || "en",
          status: (updated.status as LeadStage) || "POTENTIAL",
          isQualified: updated.isQualified,
          rfqId: updated.rfqId ?? null,
          fields: (updated.fields || {}) as LeadDataFields,
          attachments: (updated.attachments || []) as unknown as ChatAttachmentItem[],
          notes: updated.notes,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      }

      const sessRows = await db
        .select({ id: chatbotSessions.id })
        .from(chatbotSessions)
        .where(eq(chatbotSessions.sessionId, input.sessionId))
        .limit(1);
      const leadCode = `LEAD-${Date.now().toString(36).toUpperCase()}`;

      const [inserted] = await db
        .insert(chatbotLeads)
        .values({
          leadCode,
          sessionRefId: sessRows[0]?.id ?? null,
          sessionId: input.sessionId,
          sourceIntent: String(input.sourceIntent),
          language: input.language,
          status: qualified ? "QUALIFIED" : "POTENTIAL",
          isQualified: qualified,
          customerName: mergedFields.name || "",
          customerEmail: mergedFields.email || "",
          customerPhone: mergedFields.contactNumber || "",
          requiredService: mergedFields.requiredService || "",
          fields: mergedFields as Record<string, unknown>,
          attachments: nextAtts as unknown as Array<Record<string, unknown>>,
          notes: "",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (input.notifyAdmin && (qualified || mergedFields.contactNumber || mergedFields.email)) {
        await createNotificationRecord({
          title: qualified
            ? "INNOASSIST: Qualified Lead Captured"
            : "INNOASSIST: New Chatbot Inquiry Lead",
          body: `${mergedFields.name || "Visitor"} (${mergedFields.contactNumber || mergedFields.email || input.sessionId}) — ${mergedFields.requiredService || input.sourceIntent}`,
        }).catch(() => null);
      }

      return {
        id: inserted.leadCode,
        sessionId: inserted.sessionId,
        sourceIntent: inserted.sourceIntent,
        language: (inserted.language as SupportedLanguage) || "en",
        status: (inserted.status as LeadStage) || "POTENTIAL",
        isQualified: inserted.isQualified,
        rfqId: inserted.rfqId ?? null,
        fields: (inserted.fields || {}) as LeadDataFields,
        attachments: (inserted.attachments || []) as unknown as ChatAttachmentItem[],
        notes: inserted.notes,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listChatbotLeads();
  const idx = list.findIndex((l) => l.sessionId === input.sessionId);
  const mergedFields: LeadDataFields = {
    ...(idx >= 0 ? list[idx].fields : {}),
    ...Object.fromEntries(
      Object.entries(input.fields).filter(([, v]) => typeof v === "string" && v.trim() !== "")
    ),
  };
  const qualified = isLeadQualified(mergedFields);
  const existingAtts = idx >= 0 ? list[idx].attachments : [];
  const nextAtts = [...existingAtts];
  for (const att of input.attachments || []) {
    if (!nextAtts.some((a) => a.fileUrl === att.fileUrl)) nextAtts.push(att);
  }

  if (idx >= 0) {
    const prevQualified = list[idx].isQualified;
    list[idx] = {
      ...list[idx],
      sourceIntent: input.sourceIntent || list[idx].sourceIntent,
      language: input.language || list[idx].language,
      fields: mergedFields,
      isQualified: qualified,
      status: qualified && list[idx].status === "POTENTIAL" ? "QUALIFIED" : list[idx].status,
      attachments: nextAtts,
      updatedAt: nowIso,
    };
    await setCmsDoc(DOC_LEADS, { items: list });
    if (!prevQualified && qualified && input.notifyAdmin) {
      await createNotificationRecord({
        title: "INNOASSIST: Qualified Lead Captured",
        body: `${mergedFields.name || "Customer"} (${mergedFields.contactNumber || mergedFields.email || "No phone"}) — ${mergedFields.requiredService || input.sourceIntent}`,
      }).catch(() => null);
    }
    return list[idx];
  }

  const created: ChatbotLeadRecord = {
    id: `LEAD-${Date.now().toString(36).toUpperCase()}`,
    sessionId: input.sessionId,
    sourceIntent: input.sourceIntent,
    language: input.language,
    status: qualified ? "QUALIFIED" : "POTENTIAL",
    isQualified: qualified,
    fields: mergedFields,
    attachments: nextAtts,
    notes: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  list.unshift(created);
  await setCmsDoc(DOC_LEADS, { items: list.slice(0, 300) });

  if (input.notifyAdmin && (qualified || mergedFields.contactNumber || mergedFields.email)) {
    await createNotificationRecord({
      title: qualified ? "INNOASSIST: Qualified Lead Captured" : "INNOASSIST: New Chatbot Inquiry Lead",
      body: `${mergedFields.name || "Visitor"} (${mergedFields.contactNumber || mergedFields.email || input.sessionId}) — ${mergedFields.requiredService || input.sourceIntent}`,
    }).catch(() => null);
  }

  return created;
}

export async function updateChatbotLead(
  leadId: string,
  patch: { status?: LeadStage; notes?: string }
): Promise<ChatbotLeadRecord | null> {
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const [updated] = await db
        .update(chatbotLeads)
        .set({
          ...(patch.status ? { status: patch.status } : {}),
          ...(typeof patch.notes === "string" ? { notes: patch.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(chatbotLeads.leadCode, leadId))
        .returning();
      if (!updated) return null;
      return {
        id: updated.leadCode,
        sessionId: updated.sessionId,
        sourceIntent: updated.sourceIntent,
        language: (updated.language as SupportedLanguage) || "en",
        status: (updated.status as LeadStage) || "POTENTIAL",
        isQualified: updated.isQualified,
        rfqId: updated.rfqId ?? null,
        fields: (updated.fields || {}) as LeadDataFields,
        attachments: (updated.attachments || []) as unknown as ChatAttachmentItem[],
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const list = await listChatbotLeads();
  const target = list.find((l) => l.id === leadId);
  if (!target) return null;
  if (patch.status) target.status = patch.status;
  if (typeof patch.notes === "string") target.notes = patch.notes;
  target.updatedAt = new Date().toISOString();
  await setCmsDoc(DOC_LEADS, { items: list });
  return target;
}

export async function syncChatbotLeadToRfq(leadId: string): Promise<ChatbotLeadRecord | null> {
  const list = await listChatbotLeads();
  const lead = list.find((l) => l.id === leadId);
  if (!lead) return null;
  if (lead.rfqId) return lead;

  const rfq = await createRfqRecord(
    {
      clientName: lead.fields.company || lead.fields.name || "Chatbot Lead",
      contactPerson: lead.fields.name || "Chatbot Visitor",
      email: lead.fields.email || "pending-email@innovistafabriconix.lk",
      phone: lead.fields.contactNumber || "Pending",
      projectTitle: `${lead.fields.requiredService || "Fabrication Inquiry"} (${lead.id})`,
      location: lead.fields.projectLocation || "Sri Lanka",
      projectType: lead.fields.requiredService || String(lead.sourceIntent),
      projectReferenceNumber: lead.sessionId,
      projectDescription:
        [
          lead.fields.projectDescription,
          lead.fields.dimensions ? `Dimensions: ${lead.fields.dimensions}` : "",
          lead.fields.approximateQuantity ? `Qty: ${lead.fields.approximateQuantity}` : "",
          lead.fields.expectedTimeline ? `Timeline: ${lead.fields.expectedTimeline}` : "",
          lead.fields.additionalRequirements ? `Notes: ${lead.fields.additionalRequirements}` : "",
        ]
          .filter(Boolean)
          .join("\n") || "Captured via INNOASSIST Chatbot",
    },
    lead.attachments.map((a) => ({
      url: a.fileUrl,
      fileName: a.fileName,
      size: a.sizeBytes,
    }))
  );

  const rfqNumId = Number(rfq.id) || Date.now();
  if (!isMemoryFallbackActive()) {
    try {
      const [updated] = await db
        .update(chatbotLeads)
        .set({
          rfqId: rfqNumId,
          status: "RFQ_SYNCED",
          updatedAt: new Date(),
        })
        .where(eq(chatbotLeads.leadCode, leadId))
        .returning();
      if (updated) {
        return {
          ...lead,
          rfqId: updated.rfqId ?? rfqNumId,
          status: "RFQ_SYNCED",
          updatedAt: updated.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  lead.rfqId = rfqNumId;
  lead.status = "RFQ_SYNCED";
  lead.updatedAt = new Date().toISOString();
  await setCmsDoc(DOC_LEADS, { items: list });
  return lead;
}

// ============================================================================
// AI CREDIT SAVER: RESPONSE CACHE & USAGE LEDGER
// ============================================================================

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getAiUsageStats(): Promise<AiUsageLedger> {
  const today = todayDateKey();
  if (!isMemoryFallbackActive()) {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(chatbotAiUsage)
        .where(eq(chatbotAiUsage.dateKey, today))
        .limit(1);
      if (rows[0]) {
        return {
          dateKey: rows[0].dateKey,
          geminiCallsToday: rows[0].geminiCallsToday,
          cacheHitsToday: rows[0].cacheHitsToday,
          localZeroCreditHitsToday: rows[0].localZeroCreditHitsToday,
          totalCallsAllTime: rows[0].totalCallsAllTime,
          totalCreditsSavedAllTime: rows[0].totalCreditsSavedAllTime,
          lastGeminiError: rows[0].lastGeminiError || undefined,
          lastGeminiErrorAt: rows[0].lastGeminiErrorAt?.toISOString(),
        };
      }
      // Pull cumulative all-time totals from latest prior day
      const latest = await db
        .select()
        .from(chatbotAiUsage)
        .orderBy(desc(chatbotAiUsage.dateKey))
        .limit(1);
      return {
        dateKey: today,
        geminiCallsToday: 0,
        cacheHitsToday: 0,
        localZeroCreditHitsToday: 0,
        totalCallsAllTime: latest[0]?.totalCallsAllTime ?? 0,
        totalCreditsSavedAllTime: latest[0]?.totalCreditsSavedAllTime ?? 0,
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const ledger = await getCmsDoc<AiUsageLedger>(DOC_AI_USAGE, {
    dateKey: today,
    geminiCallsToday: 0,
    cacheHitsToday: 0,
    localZeroCreditHitsToday: 0,
    totalCallsAllTime: 0,
    totalCreditsSavedAllTime: 0,
  });
  if (ledger.dateKey !== today) {
    return {
      ...ledger,
      dateKey: today,
      geminiCallsToday: 0,
      cacheHitsToday: 0,
      localZeroCreditHitsToday: 0,
    };
  }
  return ledger;
}

export async function recordAiUsageEvent(
  kind: "gemini_call" | "cache_hit" | "local_hit",
  errorMsg?: string
): Promise<AiUsageLedger> {
  const current = await getAiUsageStats();
  if (kind === "gemini_call") {
    current.geminiCallsToday += 1;
    current.totalCallsAllTime += 1;
  } else if (kind === "cache_hit") {
    current.cacheHitsToday += 1;
    current.totalCreditsSavedAllTime += 1;
  } else {
    current.localZeroCreditHitsToday += 1;
    current.totalCreditsSavedAllTime += 1;
  }
  if (errorMsg) {
    current.lastGeminiError = errorMsg.slice(0, 240);
    current.lastGeminiErrorAt = new Date().toISOString();
  }

  if (!isMemoryFallbackActive()) {
    try {
      await db
        .insert(chatbotAiUsage)
        .values({
          dateKey: current.dateKey,
          geminiCallsToday: current.geminiCallsToday,
          cacheHitsToday: current.cacheHitsToday,
          localZeroCreditHitsToday: current.localZeroCreditHitsToday,
          totalCallsAllTime: current.totalCallsAllTime,
          totalCreditsSavedAllTime: current.totalCreditsSavedAllTime,
          lastGeminiError: current.lastGeminiError ?? null,
          lastGeminiErrorAt: current.lastGeminiErrorAt
            ? new Date(current.lastGeminiErrorAt)
            : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: chatbotAiUsage.dateKey,
          set: {
            geminiCallsToday: current.geminiCallsToday,
            cacheHitsToday: current.cacheHitsToday,
            localZeroCreditHitsToday: current.localZeroCreditHitsToday,
            totalCallsAllTime: current.totalCallsAllTime,
            totalCreditsSavedAllTime: current.totalCreditsSavedAllTime,
            lastGeminiError: current.lastGeminiError ?? null,
            lastGeminiErrorAt: current.lastGeminiErrorAt
              ? new Date(current.lastGeminiErrorAt)
              : null,
            updatedAt: new Date(),
          },
        });
      return current;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  await setCmsDoc(DOC_AI_USAGE, current as unknown as Record<string, unknown>);
  return current;
}

export async function getCachedAiResponse(cacheKey: string): Promise<AiCacheEntry | null> {
  if (!isMemoryFallbackActive()) {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(chatbotAiCache)
        .where(and(eq(chatbotAiCache.cacheKey, cacheKey), gte(chatbotAiCache.expiresAt, now)))
        .limit(1);
      if (!rows[0]) return null;
      const entry = rows[0];
      const [updated] = await db
        .update(chatbotAiCache)
        .set({ hits: entry.hits + 1 })
        .where(eq(chatbotAiCache.id, entry.id))
        .returning();
      return {
        key: updated.cacheKey,
        querySample: updated.querySample,
        language: (updated.language as SupportedLanguage) || "en",
        reply: updated.reply,
        followUpSuggestions: updated.followUpSuggestions,
        detectedService: updated.detectedService || undefined,
        confidence: Number(updated.confidence),
        hits: updated.hits,
        createdAt: updated.createdAt.toISOString(),
        expiresAt: updated.expiresAt.toISOString(),
      };
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: AiCacheEntry[] }>(DOC_AI_CACHE, { items: [] });
  const items = Array.isArray(doc.items) ? doc.items : [];
  const nowMs = Date.now();
  const entry = items.find((c) => c.key === cacheKey && new Date(c.expiresAt).getTime() > nowMs);
  if (!entry) return null;
  entry.hits += 1;
  await setCmsDoc(DOC_AI_CACHE, { items });
  return entry;
}

export async function setCachedAiResponse(
  entry: Omit<AiCacheEntry, "hits" | "createdAt" | "expiresAt">,
  ttlMinutes: number
): Promise<void> {
  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + Math.max(5, ttlMinutes) * 60_000);

  if (!isMemoryFallbackActive()) {
    try {
      await db
        .insert(chatbotAiCache)
        .values({
          cacheKey: entry.key,
          querySample: entry.querySample,
          language: entry.language,
          reply: entry.reply,
          followUpSuggestions: entry.followUpSuggestions,
          detectedService: entry.detectedService || "",
          confidence: String(entry.confidence),
          hits: 0,
          createdAt: new Date(nowMs),
          expiresAt,
        })
        .onConflictDoUpdate({
          target: chatbotAiCache.cacheKey,
          set: {
            querySample: entry.querySample,
            language: entry.language,
            reply: entry.reply,
            followUpSuggestions: entry.followUpSuggestions,
            detectedService: entry.detectedService || "",
            confidence: String(entry.confidence),
            hits: 0,
            createdAt: new Date(nowMs),
            expiresAt,
          },
        });
      return;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }

  const doc = await getCmsDoc<{ items: AiCacheEntry[] }>(DOC_AI_CACHE, { items: [] });
  const items = (Array.isArray(doc.items) ? doc.items : []).filter(
    (c) => new Date(c.expiresAt).getTime() > nowMs && c.key !== entry.key
  );
  items.unshift({
    ...entry,
    hits: 0,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  await setCmsDoc(DOC_AI_CACHE, { items: items.slice(0, 200) });
}

export async function clearAiResponseCache(): Promise<void> {
  if (!isMemoryFallbackActive()) {
    try {
      await db.delete(chatbotAiCache);
      return;
    } catch (error) {
      markDatabaseOffline(error);
    }
  }
  await setCmsDoc(DOC_AI_CACHE, { items: [] });
}

// ============================================================================
// BUSINESS INTELLIGENCE & REAL DATABASE ANALYTICS
// ============================================================================

export interface ChatbotAnalyticsReport {
  generatedAt: string;
  totalConversations: number;
  dailyInteractions: Array<{ date: string; count: number }>;
  monthlyInteractions: Array<{ month: string; count: number }>;
  topRequestedServices: Array<{ service: string; count: number }>;
  topAskedFaqs: Array<{ id: string; question: string; category: string; usageCount: number }>;
  unansweredCount: number;
  unansweredPendingCount: number;
  topUnanswered: Array<{ question: string; count: number; language: string; category: string }>;
  potentialLeadsCount: number;
  qualifiedLeadsCount: number;
  leadConversionRatePct: number;
  languageDistribution: Record<SupportedLanguage, number>;
  avgCsatRating: number | null;
  csatResponsesCount: number;
  handoverCount: number;
  handoverRatePct: number;
  avgResponseTimeMs: number;
  commonCustomerProblems: Array<{ topic: string; count: number }>;
  totalSiteVisitsFromBot: number;
  totalRfqsSynced: number;
  aiUsage: AiUsageLedger;
}

export async function computeChatbotAnalytics(filters?: {
  fromDate?: string;
  toDate?: string;
  language?: string;
}): Promise<ChatbotAnalyticsReport> {
  const [allSessions, kbItems, unanswered, leads, aiUsage, appointments, rfqs] =
    await Promise.all([
      loadSessionsList(),
      listExtendedKnowledgeItems(),
      listUnansweredQuestions(),
      listChatbotLeads(),
      getAiUsageStats(),
      listAppointments(),
      listRfqRecords(),
    ]);

  const fromMs = filters?.fromDate ? new Date(filters.fromDate).getTime() : 0;
  const toMs = filters?.toDate
    ? new Date(`${filters.toDate}T23:59:59.999Z`).getTime()
    : Infinity;

  const sessions = allSessions.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    if (t < fromMs || t > toMs) return false;
    if (filters?.language && filters.language !== "all" && s.language !== filters.language) {
      return false;
    }
    return true;
  });

  const dailyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();
  const serviceMap = new Map<string, number>();
  const problemMap = new Map<string, number>();
  const langDist: Record<SupportedLanguage, number> = { en: 0, si: 0, ta: 0 };

  let ratingSum = 0;
  let ratingCount = 0;
  let handoverTotal = 0;
  let responseTimeSum = 0;
  let responseTimeCount = 0;

  for (const s of sessions) {
    langDist[s.language] = (langDist[s.language] || 0) + 1;
    const dayKey = s.createdAt.slice(0, 10);
    const monthKey = s.createdAt.slice(0, 7);
    const userMsgs = s.messages.filter((m) => m.role === "user").length || 1;
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + userMsgs);
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + userMsgs);

    const serviceLabel =
      s.collectedLead?.requiredService ||
      (s.detectedIntent !== "general_inquiry" ? s.detectedIntent.replace(/_/g, " ") : "General");
    serviceMap.set(serviceLabel, (serviceMap.get(serviceLabel) || 0) + 1);

    if (s.detectedIntent === "customer_complaint") {
      problemMap.set(
        "After-sales / Defect Complaint",
        (problemMap.get("After-sales / Defect Complaint") || 0) + 1
      );
    }
    if (s.consecutiveFallbacks > 0) {
      problemMap.set(
        "Unmatched Technical / Custom Query",
        (problemMap.get("Unmatched Technical / Custom Query") || 0) + 1
      );
    }
    if (s.handoverCount > 0) handoverTotal += 1;
    if (typeof s.rating === "number" && s.rating >= 1 && s.rating <= 5) {
      ratingSum += s.rating;
      ratingCount += 1;
    }
    if (s.avgResponseTimeMs > 0) {
      responseTimeSum += s.avgResponseTimeMs;
      responseTimeCount += 1;
    }
  }

  for (const u of unanswered) {
    problemMap.set(
      u.suggestedCategory || "Unresolved Question",
      (problemMap.get(u.suggestedCategory || "Unresolved Question") || 0) + u.occurrenceCount
    );
  }

  const filteredLeads = leads.filter((l) => {
    const t = new Date(l.createdAt).getTime();
    if (t < fromMs || t > toMs) return false;
    if (filters?.language && filters.language !== "all" && l.language !== filters.language) {
      return false;
    }
    return true;
  });

  const qualifiedLeadsCount = filteredLeads.filter((l) => l.isQualified).length;
  const potentialLeadsCount = filteredLeads.length;
  const totalConversations = sessions.length;

  return {
    generatedAt: new Date().toISOString(),
    totalConversations,
    dailyInteractions: Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
    monthlyInteractions: Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12),
    topRequestedServices: Array.from(serviceMap.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topAskedFaqs: [...kbItems]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 8)
      .map((f) => ({
        id: f.id,
        question: f.question,
        category: f.category,
        usageCount: f.usageCount || 0,
      })),
    unansweredCount: unanswered.length,
    unansweredPendingCount: unanswered.filter((u) => u.status === "PENDING").length,
    topUnanswered: unanswered.slice(0, 8).map((u) => ({
      question: u.question,
      count: u.occurrenceCount,
      language: u.language,
      category: u.suggestedCategory,
    })),
    potentialLeadsCount,
    qualifiedLeadsCount,
    leadConversionRatePct:
      totalConversations > 0
        ? Number(((qualifiedLeadsCount / totalConversations) * 100).toFixed(1))
        : 0,
    languageDistribution: langDist,
    avgCsatRating: ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : null,
    csatResponsesCount: ratingCount,
    handoverCount: handoverTotal,
    handoverRatePct:
      totalConversations > 0
        ? Number(((handoverTotal / totalConversations) * 100).toFixed(1))
        : 0,
    avgResponseTimeMs:
      responseTimeCount > 0 ? Math.round(responseTimeSum / responseTimeCount) : 0,
    commonCustomerProblems: Array.from(problemMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    totalSiteVisitsFromBot: appointments.filter(
      (a) =>
        String(a.notes || "").toLowerCase().includes("receptionist") ||
        String(a.notes || "").toLowerCase().includes("innoassist")
    ).length,
    totalRfqsSynced: rfqs.filter((r) => String(r.projectReferenceNumber || "").startsWith("sess-"))
      .length,
    aiUsage,
  };
}
