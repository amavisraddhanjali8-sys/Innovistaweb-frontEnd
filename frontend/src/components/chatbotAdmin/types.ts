import type {
  ChatbotConfig,
  ChatbotWorkflow,
  KnowledgeDocumentItem,
  KnowledgeItemExtended,
  LeadDataFields,
  RichChatIntent,
  SupportedLanguage,
  ChatAttachmentItem,
} from "../../../../shared/chatbotHelpers";

export type ExtendedFaq = KnowledgeItemExtended;

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant" | "admin" | "system";
  senderName?: string;
  text: string;
  language?: SupportedLanguage;
  intent?: string;
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
  mode: "ai" | "waiting_human" | "human" | "resolved";
  status: "OPEN" | "WAITING_HUMAN" | "IN_HUMAN_SUPPORT" | "ESCALATED" | "CLOSED";
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

export type LeadStage = "POTENTIAL" | "QUALIFIED" | "RFQ_SYNCED" | "CONTACTED" | "WON" | "CLOSED";

export interface ChatbotLeadRecord {
  id: string;
  sessionId: string;
  sourceIntent: string;
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

export interface ConfigHistoryEntry {
  id: string;
  changedAt: string;
  changedBy: string;
  summary: string;
  snapshot: Partial<ChatbotConfig>;
}

export interface AdminStaffOption {
  AdminId: number;
  Admin_Name: string;
  Admin_Email: string;
  role: string;
}

export type { ChatbotConfig, ChatbotWorkflow, KnowledgeDocumentItem };
