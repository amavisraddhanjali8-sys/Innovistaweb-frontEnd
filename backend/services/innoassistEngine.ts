import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  buildSmsHref,
  buildWhatsAppChatUrl,
  containsRestrictedTopic,
  detectChatIntent,
  detectChatLanguage,
  detectPromptInjection,
  detectRichChatIntent,
  extractLeadEntitiesFromText,
  findNextUnfilledStepIndex,
  getStepPromptForLanguage,
  matchKnowledgeBase,
  normalizeAndExpandQuery,
  sanitizeUserChatInput,
  splitMultiQuestions,
  validateWorkflowStepInput,
  type ChatAttachmentItem,
  type ChatbotWorkflow,
  type LeadDataFields,
  type RichChatIntent,
  type SupportedLanguage,
} from "../../shared/chatbotHelpers.ts";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  type SiteContactSettings,
} from "../../shared/footerConsultationHelpers.ts";
import {
  createNewSessionRecord,
  createOrUpdateChatbotLead,
  getAiUsageStats,
  getCachedAiResponse,
  getChatSession,
  getStoredChatbotConfig,
  incrementKnowledgeUsage,
  listChatbotWorkflows,
  listExtendedKnowledgeItems,
  listKnowledgeDocuments,
  pruneExpiredChatSessions,
  recordAiUsageEvent,
  recordUnansweredQuestion,
  setCachedAiResponse,
  syncChatbotLeadToRfq,
  upsertChatSession,
  type ChatbotSessionRecord,
  type PersistedChatMessage,
} from "../db/chatbotStore.ts";
import {
  createAuditLog,
  createNotificationRecord,
  getCmsDoc,
  listCategories,
  listProducts,
} from "../db/repositories.ts";

export interface AskInnoassistInput {
  message: string;
  sessionId?: string;
  sessionToken?: string;
  preferredLanguage?: SupportedLanguage;
  attachments?: ChatAttachmentItem[];
  customerUser?: {
    userId?: number;
    name?: string;
    email?: string;
  } | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface AskInnoassistResult {
  sessionId: string;
  sessionToken: string;
  reply: string;
  language: SupportedLanguage;
  intent: string;
  richIntent: RichChatIntent;
  source:
    | "human-support"
    | "security-guard"
    | "workflow"
    | "published-kb"
    | "company-docs"
    | "catalog-local"
    | "ai-cache"
    | "gemini"
    | "fallback";
  aiPaused: boolean;
  mode: ChatbotSessionRecord["mode"];
  status: ChatbotSessionRecord["status"];
  confidence: number;
  creditSaved: boolean;
  matchedFaqId?: string;
  quickReplies: string[];
  followUpSuggestions: string[];
  collectedLead: LeadDataFields;
  leadId?: string | null;
  suggestSiteVisit: boolean;
  suggestWhatsapp: boolean;
  suggestQuote: boolean;
  suggestHandover: boolean;
  whatsappUrl: string;
  smsHref: string;
  messages: PersistedChatMessage[];
}

const sessionLastAiCallAt = new Map<string, number>();

function getGeminiClient(): GoogleGenAI | null {
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

function localizedText(
  lang: SupportedLanguage,
  en: string,
  si: string,
  ta: string
): string {
  if (lang === "si") return si;
  if (lang === "ta") return ta;
  return en;
}

function mapRichToLegacyIntent(
  rich: RichChatIntent,
  rawQuery: string
): "visit" | "whatsapp" | "quote" | "sms" | "general" {
  if (rich === "site_visit" || rich === "consultation_request") return "visit";
  if (rich === "whatsapp" || rich === "human_assistance" || rich === "customer_complaint") {
    return "whatsapp";
  }
  if (rich === "sms") return "sms";
  if (
    rich === "quotation_request" ||
    rich === "project_inquiry" ||
    rich === "aluminium_fabrication" ||
    rich === "glass_solutions" ||
    rich === "steel_fabrication" ||
    rich === "construction_inquiry"
  ) {
    return "quote";
  }
  return detectChatIntent(rawQuery);
}

function buildFollowUpsForIntent(
  richIntent: RichChatIntent,
  lang: SupportedLanguage,
  relatedTopics: string[] = []
): string[] {
  const fromTopics = relatedTopics.slice(0, 2);
  if (fromTopics.length >= 2) return fromTopics;

  if (lang === "si") {
    return ["මිල ගණන් (Quotation) ලබා ගන්න", "Site Visit වෙන්කරන්න", "විශේෂඥයෙකු සමඟ කතා කරන්න"];
  }
  if (lang === "ta") {
    return ["விலைப்பட்டியல் கோரவும்", "தளப் பார்வை முன்பதிவு", "நிபுணருடன் பேசவும்"];
  }
  switch (richIntent) {
    case "aluminium_fabrication":
    case "glass_solutions":
    case "steel_fabrication":
      return ["Request a quotation", "Book a site measurement visit", "Coastal coating warranty"];
    case "quotation_request":
    case "project_inquiry":
      return ["Book a site visit", "Upload drawings / BOQ", "Talk to a specialist"];
    default:
      return ["Aluminium & glass systems", "Request a quotation", "Book a site visit"];
  }
}

function findMatchingWorkflow(
  query: string,
  richIntent: RichChatIntent,
  workflows: ChatbotWorkflow[]
): ChatbotWorkflow | null {
  const enabled = workflows.filter((w) => w.enabled);
  const qLower = query.toLowerCase();

  // Direct intent match first (skip generic wf-general-inquiry so unknown questions reach AI & unanswered queue)
  const byIntent = enabled.find((w) => w.intent === richIntent && w.id !== "wf-general-inquiry");
  if (byIntent) {
    // Only auto-start workflow when user explicitly signals action/inquiry/support
    const actionSignals =
      /(quote|quotation|boq|estimate|need|want|looking for|book|consult|complaint|issue|defect|supplier|register|human|agent|specialist|help me choose|project|tender|price|cost)/i;
    if (
      richIntent === "quotation_request" ||
      richIntent === "human_assistance" ||
      richIntent === "customer_complaint" ||
      richIntent === "supplier_registration" ||
      richIntent === "consultation_request" ||
      richIntent === "service_discovery" ||
      actionSignals.test(qLower)
    ) {
      return byIntent;
    }
  }

  // Trigger keyword match for custom workflows
  for (const wf of enabled) {
    if (wf.id === "wf-general-inquiry") continue;
    for (const kw of wf.triggerKeywords) {
      if (kw && qLower.includes(kw.toLowerCase())) {
        if (
          /(need|want|looking|quote|book|help|issue|supply|human|agent|consult|project)/i.test(
            qLower
          )
        ) {
          return wf;
        }
      }
    }
  }
  return null;
}

function buildWorkflowCompletionSummary(
  wf: ChatbotWorkflow,
  collected: LeadDataFields,
  lang: SupportedLanguage
): string {
  const baseMsg =
    (lang === "si" && wf.localizedCompletionMessages?.si) ||
    (lang === "ta" && wf.localizedCompletionMessages?.ta) ||
    wf.completionMessage;

  const summaryParts = [
    collected.name ? `Name: ${collected.name}` : "",
    collected.company ? `Company: ${collected.company}` : "",
    collected.contactNumber ? `Phone: ${collected.contactNumber}` : "",
    collected.email ? `Email: ${collected.email}` : "",
    collected.requiredService ? `Service: ${collected.requiredService}` : "",
    collected.projectLocation ? `Location: ${collected.projectLocation}` : "",
    collected.dimensions ? `Dimensions: ${collected.dimensions}` : "",
  ].filter(Boolean);

  return summaryParts.length > 0
    ? `${baseMsg}\nSummary captured: ${summaryParts.join(" · ")}`
    : baseMsg;
}

function redactRestrictedContent(text: string, restrictedTopics: string[]): string {
  let output = text;
  // Never leak email/password/secret patterns or unauthorized pricing guarantees
  output = output.replace(/\b(?:sk-[a-zA-Z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,})\b/g, "[REDACTED]");
  for (const topic of restrictedTopics) {
    if (!topic) continue;
    const escaped = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(escaped, "gi"), "[restricted]");
  }
  return output;
}

export async function processInnoassistMessage(
  input: AskInnoassistInput
): Promise<AskInnoassistResult> {
  const startedAt = Date.now();
  const cleanMessage = sanitizeUserChatInput(input.message, 1500);
  const [config, kbItems, kbDocs, workflows, contact, products, categories] =
    await Promise.all([
      getStoredChatbotConfig(),
      listExtendedKnowledgeItems(),
      listKnowledgeDocuments(),
      listChatbotWorkflows(),
      getCmsDoc<SiteContactSettings>("site_settings", DEFAULT_SITE_CONTACT_SETTINGS),
      listProducts(),
      listCategories(),
    ]);

  // Background-safe retention cleanup
  void pruneExpiredChatSessions(config.retentionDays).catch(() => null);

  // Load or initialize persistent session
  let session: ChatbotSessionRecord | null = null;
  if (input.sessionId) {
    const existing = await getChatSession(input.sessionId);
    if (existing) {
      const tokenMatch = Boolean(input.sessionToken && existing.sessionToken === input.sessionToken);
      const userMatch = Boolean(
        input.customerUser?.userId &&
          existing.customerUserId &&
          Number(existing.customerUserId) === Number(input.customerUser.userId)
      );
      if (tokenMatch || userMatch) {
        session = existing;
      }
    }
  }
  if (!session) {
    session = createNewSessionRecord({
      customerUserId: input.customerUser?.userId ?? null,
      customerName: input.customerUser?.name || "",
      customerEmail: input.customerUser?.email || "",
      language: input.preferredLanguage || "en",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  } else {
    if (input.ipAddress) session.ipAddress = input.ipAddress;
    if (input.userAgent) session.userAgent = input.userAgent;
  }

  // Detect language & sanitize restricted languages
  let detectedLang = detectChatLanguage(
    cleanMessage,
    input.preferredLanguage || session.language
  );
  if (!config.supportedLanguages.includes(detectedLang)) {
    detectedLang = config.supportedLanguages[0] || "en";
  }
  session.language = detectedLang;

  // Merge any uploaded attachments on this turn
  if (Array.isArray(input.attachments) && input.attachments.length > 0) {
    for (const att of input.attachments) {
      if (!session.attachments.some((a) => a.fileUrl === att.fileUrl)) {
        session.attachments.push(att);
      }
    }
    if (!session.collectedLead.availableDrawings) {
      session.collectedLead.availableDrawings = input.attachments
        .map((a) => a.fileName)
        .join(", ");
    }
  }

  // Silently extract entities (name, phone, email, location, dims, qty, service) so we never repeat questions!
  session.collectedLead = extractLeadEntitiesFromText(cleanMessage, session.collectedLead);
  if (session.collectedLead.name && !session.customerName) {
    session.customerName = session.collectedLead.name;
  }
  if (session.collectedLead.email && !session.customerEmail) {
    session.customerEmail = session.collectedLead.email;
  }
  if (session.collectedLead.contactNumber && !session.customerPhone) {
    session.customerPhone = session.collectedLead.contactNumber;
  }
  if (session.collectedLead.company && !session.customerCompany) {
    session.customerCompany = session.collectedLead.company;
  }

  const richIntent = detectRichChatIntent(cleanMessage);
  const legacyIntent = mapRichToLegacyIntent(richIntent, cleanMessage);
  if (richIntent !== "general_inquiry") {
    session.detectedIntent = richIntent;
  }

  const whatsappUrl = buildWhatsAppChatUrl(
    contact.whatsapp || contact.phone,
    cleanMessage,
    config.defaultWhatsappPrefix
  );
  const smsHref = buildSmsHref(
    contact.phone,
    `Hi Innovista, ${cleanMessage.slice(0, 140)}`
  );

  // Append user message
  const userMsg: PersistedChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "user",
    text: cleanMessage,
    language: detectedLang,
    intent: richIntent,
    attachments: input.attachments,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);

  const finalizeReply = async (opts: {
    reply: string;
    source: AskInnoassistResult["source"];
    confidence: number;
    creditSaved: boolean;
    matchedFaqId?: string;
    quickReplies?: string[];
    followUpSuggestions?: string[];
    suggestSiteVisit?: boolean;
    suggestWhatsapp?: boolean;
    suggestQuote?: boolean;
    suggestHandover?: boolean;
    skipBotMessage?: boolean;
  }): Promise<AskInnoassistResult> => {
    const responseTimeMs = Math.max(1, Date.now() - startedAt);
    const safeReply = redactRestrictedContent(opts.reply, config.restrictedTopics);

    if (!opts.skipBotMessage) {
      const botMsg: PersistedChatMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        senderName: config.assistantName,
        text: safeReply,
        language: detectedLang,
        intent: legacyIntent,
        source: opts.source,
        confidence: opts.confidence,
        responseTimeMs,
        quickReplies: opts.quickReplies || [],
        followUpSuggestions: opts.followUpSuggestions || [],
        timestamp: new Date().toISOString(),
      };
      session!.messages.push(botMsg);
      const prevCount = Math.max(
        0,
        session!.messages.filter((m) => m.role === "assistant" && m.responseTimeMs).length - 1
      );
      session!.avgResponseTimeMs = Math.round(
        (session!.avgResponseTimeMs * prevCount + responseTimeMs) / (prevCount + 1)
      );
    }

    // Auto-create/update lead whenever any contact or project interest is collected
    if (
      config.leadCollectionEnabled &&
      (session!.collectedLead.contactNumber ||
        session!.collectedLead.email ||
        session!.collectedLead.requiredService ||
        session!.collectedLead.projectDescription)
    ) {
      const lead = await createOrUpdateChatbotLead({
        sessionId: session!.sessionId,
        sourceIntent: session!.detectedIntent,
        language: detectedLang,
        fields: session!.collectedLead,
        attachments: session!.attachments,
        notifyAdmin: config.notifyOnLead,
      });
      session!.leadId = lead.id;
    }

    // Prune messages inside session to reasonable window
    if (session!.messages.length > 80) {
      session!.messages = session!.messages.slice(-80);
    }
    const savedSession = await upsertChatSession(session!);

    return {
      sessionId: savedSession.sessionId,
      sessionToken: savedSession.sessionToken,
      reply: safeReply,
      language: detectedLang,
      intent: legacyIntent,
      richIntent: savedSession.detectedIntent,
      source: opts.source,
      aiPaused: savedSession.mode === "human" || savedSession.mode === "waiting_human",
      mode: savedSession.mode,
      status: savedSession.status,
      confidence: opts.confidence,
      creditSaved: opts.creditSaved,
      matchedFaqId: opts.matchedFaqId,
      quickReplies: opts.quickReplies || [],
      followUpSuggestions: opts.followUpSuggestions || [],
      collectedLead: savedSession.collectedLead,
      leadId: savedSession.leadId,
      suggestSiteVisit: Boolean(opts.suggestSiteVisit),
      suggestWhatsapp: Boolean(opts.suggestWhatsapp),
      suggestQuote: Boolean(opts.suggestQuote),
      suggestHandover: Boolean(opts.suggestHandover),
      whatsappUrl,
      smsHref,
      messages: savedSession.messages,
    };
  };

  // --------------------------------------------------------------------------
  // 1. HUMAN TAKEOVER LOCK (Prevent conflicting AI messages during live support)
  // --------------------------------------------------------------------------
  if (session.mode === "human") {
    if (/^\s*(?:back to ai|resume ai|use ai|exit human)\s*$/i.test(cleanMessage)) {
      session.mode = "ai";
      session.status = "OPEN";
      return finalizeReply({
        reply: localizedText(
          detectedLang,
          "Live support session ended. INNOASSIST AI is back online to help you.",
          "සජීවී සහාය අවසන්. INNOASSIST AI නැවත සූදානම්.",
          "நேரடி ஆதரவு முடிந்தது. INNOASSIST AI மீண்டும் உதவத் தயாராக உள்ளது."
        ),
        source: "human-support",
        confidence: 1,
        creditSaved: true,
      });
    }
    await createNotificationRecord({
      title: `Live Chat Message (${session.customerName || session.sessionId})`,
      body: cleanMessage.slice(0, 120),
    }).catch(() => null);
    return finalizeReply({
      reply: "",
      source: "human-support",
      confidence: 1,
      creditSaved: true,
      skipBotMessage: true,
      suggestHandover: true,
    });
  }

  // --------------------------------------------------------------------------
  // 2. SECURITY: PROMPT INJECTION & RESTRICTED TOPIC GUARD (0 AI CREDITS)
  // --------------------------------------------------------------------------
  if (detectPromptInjection(cleanMessage)) {
    await createAuditLog({
      eventId: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      actorEmail: session.customerEmail || "anonymous",
      actorRole: "customer",
      targetIdentifier: session.sessionId,
      action: "CHATBOT_PROMPT_INJECTION_BLOCKED",
      category: "SECURITY",
      status: "BLOCKED",
      severity: "HIGH",
      ipAddress: input.ipAddress || "",
      userAgent: input.userAgent || "",
      details: `Blocked suspicious prompt injection attempt in session ${session.sessionId}`,
      metadata: { sample: cleanMessage.slice(0, 120) },
    }).catch(() => null);

    return finalizeReply({
      reply: localizedText(
        detectedLang,
        "I can only assist with Innovista Metal Fabriconix products, fabrication services, quotations, and site visits. How can I help with your project?",
        "මට උදව් කළ හැක්කේ Innovista Metal Fabriconix නිෂ්පාදන, සේවා සහ site visits සම්බන්ධයෙන් පමණි.",
        "Innovista Metal Fabriconix தயாரிப்புகள், சேவைகள் மற்றும் தளப் பார்வைகள் குறித்து மட்டுமே என்னால் உதவ முடியும்."
      ),
      source: "security-guard",
      confidence: 1,
      creditSaved: true,
    });
  }

  const restrictedHit = containsRestrictedTopic(cleanMessage, config.restrictedTopics);
  if (restrictedHit) {
    return finalizeReply({
      reply: localizedText(
        detectedLang,
        "For security and privacy reasons, internal company records and private administrative information cannot be shared here. Please contact our authorized office desk if you have an official inquiry.",
        "ආරක්ෂක සහ පෞද්ගලිකත්ව හේතූන් මත අභ්‍යන්තර ආයතනික තොරතුරු මෙහි බෙදාගත නොහැක.",
        "பாதுகாப்பு மற்றும் தனியுரிமை காரணங்களால் உள் நிறுவனத் தகவல்களை இங்கே பகிர முடியாது."
      ),
      source: "security-guard",
      confidence: 1,
      creditSaved: true,
      suggestHandover: true,
    });
  }

  // --------------------------------------------------------------------------
  // 3. ACTIVE WORKFLOW ENGINE (0 AI CREDITS — CONDITIONAL, VALIDATED, NO RE-ASK)
  // --------------------------------------------------------------------------
  const cancelWorkflowRegex = /^(cancel|stop|nevermind|skip|exit workflow|main menu)$/i;
  if (session.activeWorkflowId && cancelWorkflowRegex.test(cleanMessage)) {
    session.activeWorkflowId = null;
    session.activeWorkflowStepIndex = 0;
    return finalizeReply({
      reply: localizedText(
        detectedLang,
        "No problem, I've paused that form. Feel free to ask any question or pick another option below.",
        "හරි, එම පියවර නවත්වා ඇත. ඔබට අවශ්‍ය ඕනෑම ප්‍රශ්නයක් විමසන්න.",
        "சரி, அந்த படிவத்தை நிறுத்திவிட்டேன். வேறு எந்தக் கேள்வியையும் கேட்கலாம்."
      ),
      source: "workflow",
      confidence: 1,
      creditSaved: true,
      quickReplies: config.quickPrompts,
    });
  }

  if (session.activeWorkflowId) {
    const activeWf = workflows.find((w) => w.id === session!.activeWorkflowId && w.enabled);
    if (activeWf) {
      const currentStep = activeWf.steps[session.activeWorkflowStepIndex];
      if (currentStep) {
        // Allow user to jump out cleanly if they asked a completely unrelated KB question with '?'
        const isDirectQuestionOverride =
          cleanMessage.endsWith("?") &&
          cleanMessage.split(/\s+/).length >= 4 &&
          currentStep.inputType !== "multiline";

        if (!isDirectQuestionOverride) {
          const check = validateWorkflowStepInput(currentStep, cleanMessage);
          if (!check.valid) {
            return finalizeReply({
              reply: `${check.error || "Invalid input."} ${getStepPromptForLanguage(currentStep, detectedLang)}`,
              source: "workflow",
              confidence: 1,
              creditSaved: true,
              quickReplies: currentStep.quickReplies,
            });
          }

          if (currentStep.fieldKey !== "custom_note" && check.cleaned) {
            session.collectedLead[currentStep.fieldKey] = check.cleaned;
            if (currentStep.fieldKey === "name") session.customerName = check.cleaned;
            if (currentStep.fieldKey === "email") session.customerEmail = check.cleaned;
            if (currentStep.fieldKey === "contactNumber") session.customerPhone = check.cleaned;
            if (currentStep.fieldKey === "company") session.customerCompany = check.cleaned;
          } else if (check.cleaned) {
            session.collectedLead.additionalRequirements = [
              session.collectedLead.additionalRequirements,
              check.cleaned,
            ]
              .filter(Boolean)
              .join(" | ");
          }

          // Check conditional branch rules
          let overrideAction = activeWf.completionAction;
          let extraPrefix = "";
          let nextIdxCandidate = session.activeWorkflowStepIndex + 1;
          for (const rule of currentStep.branchRules || []) {
            const matched =
              (rule.matchType === "contains" &&
                cleanMessage.toLowerCase().includes(rule.pattern.toLowerCase())) ||
              (rule.matchType === "equals" &&
                cleanMessage.toLowerCase() === rule.pattern.toLowerCase()) ||
              (rule.matchType === "regex" && new RegExp(rule.pattern, "i").test(cleanMessage));
            if (matched) {
              if (rule.overrideCompletionAction) overrideAction = rule.overrideCompletionAction;
              if (rule.extraReply) extraPrefix = `${rule.extraReply}\n\n`;
              if (rule.nextStepId) {
                const targetIdx = activeWf.steps.findIndex((s) => s.id === rule.nextStepId);
                if (targetIdx >= 0) nextIdxCandidate = targetIdx;
              }
              break;
            }
          }

          const nextIdx = findNextUnfilledStepIndex(
            activeWf,
            nextIdxCandidate,
            session.collectedLead
          );

          if (nextIdx >= 0) {
            session.activeWorkflowStepIndex = nextIdx;
            const nextStep = activeWf.steps[nextIdx];
            await recordAiUsageEvent("local_hit");
            return finalizeReply({
              reply: `${extraPrefix}${getStepPromptForLanguage(nextStep, detectedLang)}`,
              source: "workflow",
              confidence: 1,
              creditSaved: true,
              quickReplies: nextStep.quickReplies,
              suggestSiteVisit: overrideAction === "book_visit",
            });
          }

          // Workflow complete!
          session.activeWorkflowId = null;
          session.activeWorkflowStepIndex = 0;

          const lead = await createOrUpdateChatbotLead({
            sessionId: session.sessionId,
            sourceIntent: activeWf.intent,
            language: detectedLang,
            fields: session.collectedLead,
            attachments: session.attachments,
            notifyAdmin: config.notifyOnLead,
          });
          session.leadId = lead.id;

          if (overrideAction === "create_rfq") {
            await syncChatbotLeadToRfq(lead.id).catch(() => null);
          } else if (overrideAction === "request_handover" && config.handoverEnabled) {
            session.mode = "waiting_human";
            session.status = "WAITING_HUMAN";
            session.handoverCount += 1;
            if (config.notifyOnHandover) {
              await createNotificationRecord({
                title: "INNOASSIST: Customer Requested Human Support",
                body: `${session.customerName || "Visitor"} (${session.customerPhone || session.sessionId}) requested specialist assistance.`,
              }).catch(() => null);
            }
          }

          await recordAiUsageEvent("local_hit");
          return finalizeReply({
            reply: `${extraPrefix}${buildWorkflowCompletionSummary(activeWf, session.collectedLead, detectedLang)}`,
            source: "workflow",
            confidence: 1,
            creditSaved: true,
            suggestSiteVisit: overrideAction === "book_visit",
            suggestQuote: overrideAction === "create_rfq" || overrideAction === "create_lead",
            suggestWhatsapp: config.autoSuggestWhatsapp,
            suggestHandover: overrideAction === "request_handover",
            followUpSuggestions: buildFollowUpsForIntent(activeWf.intent, detectedLang),
          });
        }
      }
    } else {
      session.activeWorkflowId = null;
    }
  }

  // --------------------------------------------------------------------------
  // 4. DIRECT HUMAN HANDOVER REQUEST
  // --------------------------------------------------------------------------
  if (richIntent === "human_assistance" && config.handoverEnabled) {
    // If we already know name & contact, escalate directly; otherwise run human_assistance workflow
    if (session.collectedLead.name || session.customerName) {
      session.mode = "waiting_human";
      session.status = "WAITING_HUMAN";
      session.handoverCount += 1;
      if (config.notifyOnHandover) {
        await createNotificationRecord({
          title: "INNOASSIST: Human Specialist Requested",
          body: `${session.customerName || "Visitor"} (${session.customerPhone || session.sessionId}) is waiting in live chat.`,
        }).catch(() => null);
      }
      await recordAiUsageEvent("local_hit");
      return finalizeReply({
        reply: localizedText(
          detectedLang,
          "I have notified our specialist team and placed your chat in the live support queue. An Innovista administrator will join shortly (AI auto-replies will pause during live support).",
          "අපගේ විශේෂඥ කණ්ඩායමට දැනුම් දී ඇත. නියෝජිතයෙකු ඉක්මනින් සම්බන්ධ වනු ඇත.",
          "எங்கள் நிபுணர் குழுவிற்கு தெரிவிக்கப்பட்டுள்ளது. ஒரு பிரதிநிதி விரைவில் இணைவார்."
        ),
        source: "human-support",
        confidence: 1,
        creditSaved: true,
        suggestWhatsapp: true,
        suggestHandover: true,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 5. PUBLISHED KNOWLEDGE BASE + COMPANY DOCS + MULTI-QUESTION SPLITTER (0 CREDITS)
  // --------------------------------------------------------------------------
  const subQuestions = splitMultiQuestions(cleanMessage);
  if (subQuestions.length > 1) {
    const answers: string[] = [];
    const matchedIds: string[] = [];
    const followTopics: string[] = [];

    for (const part of subQuestions) {
      const kbRes = matchKnowledgeBase(part, kbItems, kbDocs, {
        onlyPublished: true,
        language: detectedLang,
        minScore: config.knowledgeMatchThreshold,
      });
      if (kbRes.bestKnowledge) {
        answers.push(`• ${kbRes.bestKnowledge.localizedAnswer}`);
        matchedIds.push(kbRes.bestKnowledge.item.id);
        followTopics.push(...kbRes.bestKnowledge.item.relatedTopics);
        void incrementKnowledgeUsage(kbRes.bestKnowledge.item.id).catch(() => null);
      } else if (kbRes.matchedDocs[0]) {
        answers.push(`• (${kbRes.matchedDocs[0].doc.title}): ${kbRes.matchedDocs[0].snippet}`);
      }
    }

    if (answers.length === subQuestions.length || answers.length >= 2) {
      await recordAiUsageEvent("local_hit");
      return finalizeReply({
        reply: answers.join("\n"),
        source: "published-kb",
        confidence: 0.9,
        creditSaved: true,
        matchedFaqId: matchedIds[0],
        followUpSuggestions: buildFollowUpsForIntent(richIntent, detectedLang, followTopics),
        suggestSiteVisit: legacyIntent === "visit",
        suggestQuote: legacyIntent === "quote",
        suggestWhatsapp: config.autoSuggestWhatsapp || legacyIntent === "whatsapp",
      });
    }
  }

  const singleKbRes = matchKnowledgeBase(cleanMessage, kbItems, kbDocs, {
    onlyPublished: true,
    language: detectedLang,
    minScore: config.knowledgeMatchThreshold,
  });

  // Check if user is initiating a configurable actionable workflow (quotation, complaint, supplier, consultation, project, service discovery)
  const triggeredWorkflow = findMatchingWorkflow(cleanMessage, richIntent, workflows);
  const hasProvidedLeadDetails = Boolean(
    session.collectedLead.name ||
      session.collectedLead.contactNumber ||
      session.collectedLead.email ||
      session.collectedLead.projectLocation
  );
  const looksLikePureInfoQuestion =
    /^(what|where|when|why|who|how|do you|does |is |are |can |could |would |which |tell me|explain)\b/i.test(
      cleanMessage
    ) && !hasProvidedLeadDetails && !/(quote|quotation|book|complaint|register|human|agent)/i.test(cleanMessage);

  const isExplicitActionWorkflow =
    triggeredWorkflow &&
    (!looksLikePureInfoQuestion ||
      richIntent === "customer_complaint" ||
      richIntent === "supplier_registration" ||
      richIntent === "human_assistance");

  if (isExplicitActionWorkflow && triggeredWorkflow) {
    const startIdx = findNextUnfilledStepIndex(
      triggeredWorkflow,
      0,
      session.collectedLead
    );
    if (startIdx >= 0) {
      session.activeWorkflowId = triggeredWorkflow.id;
      session.activeWorkflowStepIndex = startIdx;
      const firstStep = triggeredWorkflow.steps[startIdx];
      const kbPreface =
        singleKbRes.bestKnowledge &&
        singleKbRes.bestKnowledge.score >= config.knowledgeMatchThreshold + 1.2
          ? `${singleKbRes.bestKnowledge.localizedAnswer}\n\n`
          : "";
      await recordAiUsageEvent("local_hit");
      return finalizeReply({
        reply: `${kbPreface}${getStepPromptForLanguage(firstStep, detectedLang)}`,
        source: "workflow",
        confidence: 0.94,
        creditSaved: true,
        matchedFaqId: singleKbRes.bestKnowledge?.item.id,
        quickReplies: firstStep.quickReplies,
        suggestSiteVisit: triggeredWorkflow.completionAction === "book_visit",
        suggestQuote:
          triggeredWorkflow.completionAction === "create_rfq" ||
          triggeredWorkflow.completionAction === "create_lead",
      });
    }
  }

  if (singleKbRes.bestKnowledge && singleKbRes.bestKnowledge.score >= config.knowledgeMatchThreshold + 0.6) {
    const hit = singleKbRes.bestKnowledge;
    void incrementKnowledgeUsage(hit.item.id).catch(() => null);
    await recordAiUsageEvent("local_hit");
    return finalizeReply({
      reply: hit.localizedAnswer,
      source: "published-kb",
      confidence: Math.min(0.98, Number((hit.score / 12).toFixed(2))),
      creditSaved: true,
      matchedFaqId: hit.item.id,
      followUpSuggestions: buildFollowUpsForIntent(
        richIntent,
        detectedLang,
        hit.item.relatedTopics
      ),
      suggestSiteVisit: legacyIntent === "visit" || hit.item.category === "Site Visit",
      suggestQuote: legacyIntent === "quote" || hit.item.category === "Quotation",
      suggestWhatsapp: config.autoSuggestWhatsapp || legacyIntent === "whatsapp",
    });
  }

  // Check matching uploaded Company PDF/Technical Documents
  if (singleKbRes.matchedDocs[0] && singleKbRes.matchedDocs[0].score >= 5.0) {
    const docHit = singleKbRes.matchedDocs[0];
    await recordAiUsageEvent("local_hit");
    return finalizeReply({
      reply: `From our technical document "${docHit.doc.title}": ${docHit.snippet}`,
      source: "company-docs",
      confidence: 0.85,
      creditSaved: true,
      followUpSuggestions: buildFollowUpsForIntent(richIntent, detectedLang),
      suggestQuote: legacyIntent === "quote",
      suggestWhatsapp: config.autoSuggestWhatsapp,
    });
  }

  // Fallback workflow trigger if KB didn't match first (skip for informational questions)
  if (triggeredWorkflow && !looksLikePureInfoQuestion) {
    const startIdx = findNextUnfilledStepIndex(
      triggeredWorkflow,
      0,
      session.collectedLead
    );
    if (startIdx >= 0) {
      session.activeWorkflowId = triggeredWorkflow.id;
      session.activeWorkflowStepIndex = startIdx;
      const firstStep = triggeredWorkflow.steps[startIdx];
      await recordAiUsageEvent("local_hit");
      return finalizeReply({
        reply: getStepPromptForLanguage(firstStep, detectedLang),
        source: "workflow",
        confidence: 0.92,
        creditSaved: true,
        quickReplies: firstStep.quickReplies,
        suggestSiteVisit: triggeredWorkflow.completionAction === "book_visit",
        suggestQuote:
          triggeredWorkflow.completionAction === "create_rfq" ||
          triggeredWorkflow.completionAction === "create_lead",
      });
    }
  }

  // --------------------------------------------------------------------------
  // 7. LOCAL CATALOG MATCH (REAL PRODUCTS & CATEGORIES — 0 AI CREDITS)
  // --------------------------------------------------------------------------
  const { tokens } = normalizeAndExpandQuery(cleanMessage);
  const matchedProducts = products
    .map((p) => {
      const hay = `${p.Design_Name} ${p.Categories.join(" ")} ${p.Design_Description}`.toLowerCase();
      let hits = 0;
      for (const tok of tokens) {
        if (tok.length >= 3 && hay.includes(tok)) hits++;
      }
      return { product: p, hits };
    })
    .filter((m) => m.hits >= 2)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 2);

  if (matchedProducts.length > 0 && config.aiMode !== "ai_first") {
    const summaryLines = matchedProducts
      .map(
        ({ product }) =>
          `${product.Design_Name} (${product.Categories.join(", ")}): ${product.Design_Description.slice(0, 140)}`
      )
      .join(" ");
    await recordAiUsageEvent("local_hit");
    return finalizeReply({
      reply: `${summaryLines} Would you like to request an official BOQ or schedule a site measurement visit?`,
      source: "catalog-local",
      confidence: 0.8,
      creditSaved: true,
      followUpSuggestions: ["Request a quotation", "Book a site visit", "Talk to a specialist"],
      suggestQuote: true,
      suggestSiteVisit: true,
      suggestWhatsapp: config.autoSuggestWhatsapp,
    });
  }

  // --------------------------------------------------------------------------
  // 8. AI CREDIT GUARD + SMART CACHE + GEMINI 4 HYDROGEN
  // --------------------------------------------------------------------------
  const cacheKey = `${detectedLang}:${richIntent}:${normalizeAndExpandQuery(cleanMessage).normalizedText}`;
  if (config.enableResponseCache && cacheKey.length > 6) {
    const cached = await getCachedAiResponse(cacheKey);
    if (cached && cached.confidence >= config.aiConfidenceThreshold) {
      await recordAiUsageEvent("cache_hit");
      return finalizeReply({
        reply: cached.reply,
        source: "ai-cache",
        confidence: cached.confidence,
        creditSaved: true,
        followUpSuggestions:
          cached.followUpSuggestions.length > 0
            ? cached.followUpSuggestions
            : buildFollowUpsForIntent(richIntent, detectedLang),
        suggestSiteVisit: legacyIntent === "visit",
        suggestQuote: legacyIntent === "quote",
        suggestWhatsapp: config.autoSuggestWhatsapp || legacyIntent === "whatsapp",
      });
    }
  }

  // Check if AI is allowed (aiMode, budget, cooldown, API key)
  const usage = await getAiUsageStats();
  const lastCallAt = sessionLastAiCallAt.get(session.sessionId) || 0;
  const cooldownRemainingMs = config.aiCooldownSeconds * 1000 - (Date.now() - lastCallAt);

  const aiBlockedReason =
    config.aiMode === "local_only"
      ? "ai_disabled_local_only"
      : usage.geminiCallsToday >= config.dailyAiCallLimit
        ? "daily_ai_credit_limit_reached"
        : cooldownRemainingMs > 0
          ? "session_ai_cooldown"
          : !getGeminiClient()
            ? "gemini_api_key_not_configured"
            : null;

  if (!aiBlockedReason) {
    const ai = getGeminiClient()!;
    try {
      sessionLastAiCallAt.set(session.sessionId, Date.now());
      const publishedKb = kbItems.filter((f) => f.enabled && f.status === "published");
      const kbContext = publishedKb
        .slice(0, 20)
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");
      const docContext = kbDocs
        .filter((d) => d.status === "published")
        .slice(0, 5)
        .map((d) => `Doc "${d.title}": ${(d.summary || d.extractedText).slice(0, 300)}`)
        .join("\n");
      const catalogContext = products
        .slice(0, 10)
        .map((d) => `- ${d.Design_Name} (${d.Categories.join(", ")}): ${d.Design_Description}`)
        .join("\n");
      const catNames = categories.map((c) => c.name).join(", ");
      const recentTurns = session.messages
        .slice(-(config.memoryWindowTurns + 1), -1)
        .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.text}`)
        .join("\n");

      const lengthDirective =
        config.responseLength === "short"
          ? "Keep replies to 1-2 short sentences."
          : config.responseLength === "detailed"
            ? "Provide a clear, thorough 3-5 sentence engineering-friendly answer."
            : "Keep replies concise and helpful (2-3 clear sentences).";

      const langName =
        detectedLang === "si"
          ? "Sinhala (සිංහල)"
          : detectedLang === "ta"
            ? "Tamil (தமிழ்)"
            : "English";

      const knownLeadSummary = Object.entries(session.collectedLead)
        .filter(([, v]) => Boolean(v))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");

      const systemInstruction = `${config.systemInstructions}
Personality Tone: ${config.personalityTone}.
Response Length Rule: ${lengthDirective}
Target Language: Reply naturally in ${langName}.
Security & Accuracy Rules:
- Answer ONLY using the verified company knowledge, published documents, and catalog below.
- NEVER invent technical specifications, wind-load numbers, or exact commercial prices/discounts.
- NEVER make binding commercial commitments; explain that official pricing requires estimator BOQ verification.
- NEVER expose internal emails, restricted topics (${config.restrictedTopics.join(", ")}), or other customer details.
- Do NOT re-ask customer info already known: ${knownLeadSummary || "none yet"}.
- If the verified context does not contain the answer, set cannotVerify=true and low confidence (<0.4) and offer human specialist assistance.

Company Contact:
- Phone / WhatsApp: ${contact.phone}
- Email: ${contact.email}
- Showrooms: Nawala (Colombo 05), Kelaniya Plant, Kandy Showroom (Mon-Sat 8:30 AM - 5:30 PM)
- Product Categories: ${catNames}

Catalog Highlights:
${catalogContext}

Published Knowledge Base:
${kbContext}

Published Technical Documents:
${docContext || "None"}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: recentTurns
          ? `Conversation so far:\n${recentTurns}\nCustomer: ${cleanMessage}`
          : `Customer: ${cleanMessage}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: "Helpful customer-facing answer in the requested language.",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence score between 0 and 1 based on verified context.",
              },
              cannotVerify: {
                type: Type.BOOLEAN,
                description: "True if verified context lacks enough info to answer accurately.",
              },
              needsHumanHandover: {
                type: Type.BOOLEAN,
                description: "True if customer needs a human engineer or live specialist.",
              },
              detectedService: {
                type: Type.STRING,
                description: "Detected service category if applicable.",
              },
              followUpSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 short suggested next questions for the customer.",
              },
            },
            required: ["reply", "confidence", "cannotVerify"],
          },
        },
      });

      await recordAiUsageEvent("gemini_call");
      const rawJson = (response.text || "").trim();
      const parsed = JSON.parse(rawJson) as {
        reply?: string;
        confidence?: number;
        cannotVerify?: boolean;
        needsHumanHandover?: boolean;
        detectedService?: string;
        followUpSuggestions?: string[];
      };

      const confidence =
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7;

      if (parsed.detectedService && !session.collectedLead.requiredService) {
        session.collectedLead.requiredService = parsed.detectedService;
      }

      if (parsed.cannotVerify || confidence < config.aiConfidenceThreshold) {
        session.consecutiveFallbacks += 1;
        await recordUnansweredQuestion({
          question: cleanMessage,
          sessionId: session.sessionId,
          language: detectedLang,
          suggestedCategory: parsed.detectedService || richIntent.replace(/_/g, " "),
          reason: `low_ai_confidence (${confidence.toFixed(2)})`,
          notifyAdmin: config.notifyOnUnanswered,
        });

        const shouldEscalate =
          config.handoverEnabled &&
          session.consecutiveFallbacks >= config.autoEscalateAfterFallbacks;
        if (shouldEscalate) {
          session.status = "ESCALATED";
        }

        const safeLimitedReply =
          parsed.reply?.trim() ||
          config.localizedFallback[detectedLang] ||
          config.localizedFallback.en;

        return finalizeReply({
          reply: safeLimitedReply,
          source: "gemini",
          confidence,
          creditSaved: false,
          followUpSuggestions:
            parsed.followUpSuggestions?.slice(0, 3) ||
            buildFollowUpsForIntent(richIntent, detectedLang),
          suggestHandover: true,
          suggestWhatsapp: true,
          suggestSiteVisit: legacyIntent === "visit",
          suggestQuote: legacyIntent === "quote",
        });
      }

      session.consecutiveFallbacks = 0;
      const verifiedReply = (parsed.reply || "").trim();
      const followUps = (parsed.followUpSuggestions || []).slice(0, 3);

      if (config.enableResponseCache && verifiedReply) {
        await setCachedAiResponse(
          {
            key: cacheKey,
            querySample: cleanMessage.slice(0, 120),
            language: detectedLang,
            reply: verifiedReply,
            followUpSuggestions: followUps,
            detectedService: parsed.detectedService,
            confidence,
          },
          config.cacheTtlMinutes
        );
      }

      return finalizeReply({
        reply: verifiedReply,
        source: "gemini",
        confidence,
        creditSaved: false,
        followUpSuggestions:
          followUps.length > 0 ? followUps : buildFollowUpsForIntent(richIntent, detectedLang),
        suggestSiteVisit: legacyIntent === "visit",
        suggestQuote: legacyIntent === "quote",
        suggestWhatsapp: config.autoSuggestWhatsapp || legacyIntent === "whatsapp",
        suggestHandover: Boolean(parsed.needsHumanHandover),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Gemini chatbot fallback:", msg);
      await recordAiUsageEvent("local_hit", msg);
      // Fall through cleanly to unanswered logging & localized fallback
    }
  }

  // --------------------------------------------------------------------------
  // 9. PARTIAL KB / GRACEFUL LOCAL FALLBACK + UNANSWERED QUEUE LOGGING
  // --------------------------------------------------------------------------
  if (singleKbRes.bestKnowledge) {
    const partial = singleKbRes.bestKnowledge;
    void incrementKnowledgeUsage(partial.item.id).catch(() => null);
    await recordAiUsageEvent("local_hit");
    return finalizeReply({
      reply: partial.localizedAnswer,
      source: "published-kb",
      confidence: 0.65,
      creditSaved: true,
      matchedFaqId: partial.item.id,
      followUpSuggestions: buildFollowUpsForIntent(
        richIntent,
        detectedLang,
        partial.item.relatedTopics
      ),
      suggestSiteVisit: legacyIntent === "visit",
      suggestQuote: legacyIntent === "quote",
      suggestWhatsapp: config.autoSuggestWhatsapp,
    });
  }

  // Queue unanswered question for Admin Review (never auto-published!)
  session.consecutiveFallbacks += 1;
  await recordUnansweredQuestion({
    question: cleanMessage,
    sessionId: session.sessionId,
    language: detectedLang,
    suggestedCategory:
      richIntent !== "general_inquiry" ? richIntent.replace(/_/g, " ") : "General",
    reason: aiBlockedReason || "no_verified_kb_match",
    notifyAdmin: config.notifyOnUnanswered,
  });

  if (
    config.handoverEnabled &&
    session.consecutiveFallbacks >= config.autoEscalateAfterFallbacks
  ) {
    session.status = "ESCALATED";
  }

  let fallbackReply = config.localizedFallback[detectedLang] || config.localizedFallback.en;
  if (legacyIntent === "visit") {
    fallbackReply = localizedText(
      detectedLang,
      "We can arrange an engineer site measurement visit. Switch to the Site Visits tab right here to pick your preferred date and time slot.",
      "ඔබට මෙහි Site Visits ටැබ් එකෙන් කැමති දිනයක් සහ වේලාවක් වෙන්කරවා ගත හැකිය.",
      "இங்கிருக்கும் Site Visits தாவல் மூலம் திகதி மற்றும் நேரத்தைத் தேர்ந்தெடுக்கலாம்."
    );
  } else if (legacyIntent === "quote") {
    fallbackReply = localizedText(
      detectedLang,
      "Share your rough dimensions, upload drawings, or tell us your service type—our estimators issue verified formal BOQs within 24–48 business hours.",
      "ඔබගේ මිනුම් හෝ සැලසුම් මෙහි බෙදාගන්න. පැය 24–48 අතර නිල BOQ මිල ගණනක් ලබා දෙනු ඇත.",
      "உங்கள் அளவுகள் அல்லது வரைபடங்களைப் பகிருங்கள். 24–48 வேலை நேரத்திற்குள் அதிகாரப்பூர்வ BOQ வழங்கப்படும்."
    );
  }

  await recordAiUsageEvent("local_hit");
  return finalizeReply({
    reply: fallbackReply,
    source: "fallback",
    confidence: 0.3,
    creditSaved: true,
    quickReplies:
      detectedLang === "en"
        ? ["Request a quotation", "Book a site visit", "Talk to a specialist"]
        : config.quickPrompts,
    followUpSuggestions: buildFollowUpsForIntent(richIntent, detectedLang),
    suggestSiteVisit: legacyIntent === "visit",
    suggestQuote: legacyIntent === "quote",
    suggestWhatsapp: true,
    suggestHandover: true,
  });
}

export async function previewKnowledgeRetrieval(
  query: string,
  language: SupportedLanguage = "en",
  includeUnpublished = false
) {
  const [config, kbItems, kbDocs] = await Promise.all([
    getStoredChatbotConfig(),
    listExtendedKnowledgeItems(),
    listKnowledgeDocuments(),
  ]);
  const res = matchKnowledgeBase(query, kbItems, kbDocs, {
    onlyPublished: !includeUnpublished,
    language,
    minScore: Math.max(1.5, config.knowledgeMatchThreshold - 0.8),
  });
  return {
    query,
    language,
    normalized: normalizeAndExpandQuery(query),
    detectedIntent: detectRichChatIntent(query),
    threshold: config.knowledgeMatchThreshold,
    bestMatch: res.bestKnowledge
      ? {
          id: res.bestKnowledge.item.id,
          question: res.bestKnowledge.item.question,
          answer: res.bestKnowledge.localizedAnswer,
          status: res.bestKnowledge.item.status,
          score: Number(res.bestKnowledge.score.toFixed(2)),
          matchedField: res.bestKnowledge.matchedField,
        }
      : null,
    topMatches: res.topKnowledge.map((m) => ({
      id: m.item.id,
      question: m.item.question,
      status: m.item.status,
      score: Number(m.score.toFixed(2)),
      matchedField: m.matchedField,
    })),
    matchedDocuments: res.matchedDocs.map((d) => ({
      id: d.doc.id,
      title: d.doc.title,
      status: d.doc.status,
      score: Number(d.score.toFixed(2)),
      snippet: d.snippet,
    })),
  };
}
