export interface ChatbotFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  enabled: boolean;
  priority: number;
  updatedAt: string;
}

export interface ChatbotConfig {
  enabled: boolean;
  assistantName: string;
  welcomeMessage: string;
  systemInstructions: string;
  whatsappTriggerLabel: string;
  defaultWhatsappPrefix: string;
  quickPrompts: string[];
  autoSuggestWhatsapp: boolean;
}

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  enabled: true,
  assistantName: "Innovista Assistant",
  welcomeMessage:
    "Hi! Ask about glazing systems, quotes, showroom hours, or book a site visit.",
  systemInstructions:
    "You are Innovista Fabriconix's concise architectural assistant in Sri Lanka. Give crisp, direct answers under 3 short sentences. Use trained Q&As first, guide users to book site visit slots, text via SMS, or hand off smoothly to company WhatsApp when custom fabrication sizing is needed.",
  whatsappTriggerLabel: "Chat on WhatsApp",
  defaultWhatsappPrefix: "Hi Innovista, I need help with:",
  quickPrompts: [
    "Book a site visit",
    "Slim sliding door pricing",
    "Coastal coating warranty",
    "Talk on WhatsApp",
  ],
  autoSuggestWhatsapp: true,
};

export const DEFAULT_CHATBOT_FAQS: ChatbotFaqItem[] = [
  {
    id: "faq-1",
    question: "How do I book a site measurement visit?",
    answer:
      "Pick any open slot right here in the Site Visit tab or Contact section. Confirmed visits sync with Google Calendar and send an instant confirmation.",
    category: "Site Visit",
    keywords: ["site visit", "visit", "measurement", "book", "slot", "schedule", "appointment"],
    enabled: true,
    priority: 10,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-2",
    question: "What glazing and aluminium products do you fabricate?",
    answer:
      "We fabricate thermally broken slim sliding doors, unitized curtain walls, acoustic partitions, casement windows, skylights, louvers, and frameless balustrades.",
    category: "Products",
    keywords: ["products", "sliding", "door", "window", "curtain wall", "skylight", "partition", "glass"],
    enabled: true,
    priority: 9,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-3",
    question: "Are your aluminium finishes suitable for coastal sea breeze areas?",
    answer:
      "Yes. We use marine-grade anodized and AAMA 2604/2605 PVDF powder coatings backed by a 15-year coastal weather warranty.",
    category: "Quality & Warranty",
    keywords: ["coastal", "rust", "warranty", "sea", "powder coating", "anodized", "weather", "finish"],
    enabled: true,
    priority: 8,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-4",
    question: "How quickly can I get a project quotation?",
    answer:
      "Share your rough dimensions or CAD drawings via Request Quote or WhatsApp and our estimators return a detailed BOQ within 24–48 business hours.",
    category: "Quotation",
    keywords: ["quote", "quotation", "price", "pricing", "cost", "estimate", "boq", "rate"],
    enabled: true,
    priority: 8,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-5",
    question: "Where are your showrooms and what are opening hours?",
    answer:
      "Visit us at Nawala (Colombo 05), Kelaniya Plant, or Kandy Showroom — Monday to Saturday, 8:30 AM to 5:30 PM.",
    category: "Locations",
    keywords: ["showroom", "address", "location", "colombo", "nawala", "kandy", "hours", "open"],
    enabled: true,
    priority: 7,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-6",
    question: "Do you handle island-wide installation across Sri Lanka?",
    answer:
      "Yes, our certified installation crews handle site measurements, fabrication, and turnkey fitting across Western, Central, Southern, and North-Western provinces.",
    category: "Installation",
    keywords: ["install", "installation", "island", "sri lanka", "delivery", "galle", "negombo"],
    enabled: true,
    priority: 7,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

export function normalizeChatbotConfig(
  raw?: Partial<ChatbotConfig> | null,
  fallback: ChatbotConfig = DEFAULT_CHATBOT_CONFIG
): ChatbotConfig {
  const input = raw || {};
  const quickPrompts = Array.isArray(input.quickPrompts)
    ? input.quickPrompts
        .map((q) => String(q || "").trim())
        .filter(Boolean)
        .slice(0, 6)
    : fallback.quickPrompts;

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    assistantName:
      typeof input.assistantName === "string" && input.assistantName.trim()
        ? input.assistantName.trim()
        : fallback.assistantName,
    welcomeMessage:
      typeof input.welcomeMessage === "string" && input.welcomeMessage.trim()
        ? input.welcomeMessage.trim()
        : fallback.welcomeMessage,
    systemInstructions:
      typeof input.systemInstructions === "string" && input.systemInstructions.trim()
        ? input.systemInstructions.trim()
        : fallback.systemInstructions,
    whatsappTriggerLabel:
      typeof input.whatsappTriggerLabel === "string" && input.whatsappTriggerLabel.trim()
        ? input.whatsappTriggerLabel.trim()
        : fallback.whatsappTriggerLabel,
    defaultWhatsappPrefix:
      typeof input.defaultWhatsappPrefix === "string" && input.defaultWhatsappPrefix.trim()
        ? input.defaultWhatsappPrefix.trim()
        : fallback.defaultWhatsappPrefix,
    quickPrompts: quickPrompts.length > 0 ? quickPrompts : fallback.quickPrompts,
    autoSuggestWhatsapp:
      typeof input.autoSuggestWhatsapp === "boolean"
        ? input.autoSuggestWhatsapp
        : fallback.autoSuggestWhatsapp,
  };
}

export function normalizeChatbotFaq(
  raw: Partial<ChatbotFaqItem>,
  idx = 0
): ChatbotFaqItem {
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)
    : typeof (raw as { keywords?: unknown }).keywords === "string"
      ? String((raw as { keywords?: unknown }).keywords)
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      : [];

  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `faq-${Date.now()}-${idx}`,
    question,
    answer,
    category:
      typeof raw.category === "string" && raw.category.trim()
        ? raw.category.trim()
        : "General",
    keywords,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    priority:
      typeof raw.priority === "number" && Number.isFinite(raw.priority)
        ? Math.max(1, Math.min(20, Math.round(raw.priority)))
        : 5,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

export interface FaqMatchResult {
  item: ChatbotFaqItem;
  score: number;
}

export function matchTrainedFaq(
  query: string,
  faqs: ChatbotFaqItem[]
): FaqMatchResult | null {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return null;

  const queryTokens = tokenize(cleanQuery);
  let best: FaqMatchResult | null = null;

  for (const faq of faqs) {
    if (!faq.enabled) continue;
    let score = 0;

    // Exact or substring keyword hit
    for (const kw of faq.keywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) continue;
      if (cleanQuery.includes(cleanKw)) {
        score += cleanKw.includes(" ") ? 6 : 4;
      }
    }

    // Token overlap against question & answer
    const qTokens = new Set(tokenize(faq.question));
    const aTokens = new Set(tokenize(faq.answer));
    for (const tok of queryTokens) {
      if (qTokens.has(tok)) score += 3;
      else if (aTokens.has(tok)) score += 1.5;
    }

    if (score > 0) {
      score += (faq.priority || 5) * 0.1;
      if (!best || score > best.score) {
        best = { item: faq, score };
      }
    }
  }

  return best && best.score >= 3 ? best : null;
}

export function detectChatIntent(
  query: string
): "visit" | "whatsapp" | "quote" | "sms" | "general" {
  const q = query.toLowerCase();
  if (/(whatsapp|wa\.me|human|agent|live chat|talk to)/.test(q)) return "whatsapp";
  if (/(site visit|book.*visit|visit slot|measurement|appointment|schedule)/.test(q)) {
    return "visit";
  }
  if (/(sms|text message|message phone|call me|phone)/.test(q)) return "sms";
  if (/(quote|pricing|price|estimate|boq|cost)/.test(q)) return "quote";
  return "general";
}

export function sanitizePhoneDigits(phoneOrWhatsapp: string): string {
  return String(phoneOrWhatsapp || "").replace(/[^\d]/g, "");
}

export function buildWhatsAppChatUrl(
  whatsappNumber: string,
  message: string,
  prefix = "Hi Innovista,"
): string {
  const digits = sanitizePhoneDigits(whatsappNumber) || "94760818098";
  const body = message.trim() ? `${prefix} ${message.trim()}` : prefix;
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

export function buildSmsHref(phone: string, message: string): string {
  const cleanPhone = String(phone || "").replace(/[^\d+]/g, "") || "+94760818098";
  const body = message.trim();
  return body
    ? `sms:${cleanPhone}?body=${encodeURIComponent(body)}`
    : `sms:${cleanPhone}`;
}

export interface ChatbotCursorTargets {
  nx: number;
  ny: number;
  eyeX: number;
  eyeY: number;
  headYaw: number;
  headPitch: number;
}

export function computeChatbotCursorTargets(
  pointerX: number,
  pointerY: number,
  centerX: number,
  centerY: number,
  viewportWidth = 1440,
  viewportHeight = 900
): ChatbotCursorTargets {
  const safeW = Math.max(240, viewportWidth || 1440);
  const safeH = Math.max(240, viewportHeight || 900);
  const spanX = safeW * 0.48;
  const spanY = safeH * 0.48;

  const rawX = (pointerX - centerX) / spanX;
  const rawY = (pointerY - centerY) / spanY;

  const nx = Math.max(-1, Math.min(1, rawX));
  const ny = Math.max(-1, Math.min(1, rawY));

  return {
    nx,
    ny,
    eyeX: Number((nx * 0.145).toFixed(4)),
    eyeY: Number((-ny * 0.075).toFixed(4)),
    headYaw: Number((nx * 0.58).toFixed(4)),
    headPitch: Number((ny * 0.34).toFixed(4)),
  };
}

export function formatChatTimestamp(dateInput: Date | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "Now";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
