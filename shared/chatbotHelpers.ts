export type SupportedLanguage = "en" | "si" | "ta";

export type KnowledgePublicationStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type AiOperatingMode = "hybrid_credit_saver" | "local_only" | "ai_first";
export type PersonalityTone = "professional" | "friendly" | "technical" | "concise";
export type ResponseLengthMode = "short" | "balanced" | "detailed";

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

export interface KnowledgeTranslation {
  question?: string;
  answer?: string;
}

export interface KnowledgeAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface KnowledgeRevision {
  version: number;
  editedAt: string;
  editedBy: string;
  summary: string;
  status: KnowledgePublicationStatus;
}

export interface KnowledgeItemMeta {
  faqId: string;
  subcategory: string;
  alternativeQuestions: string[];
  synonyms: string[];
  relatedTopics: string[];
  status: KnowledgePublicationStatus;
  translations: Partial<Record<SupportedLanguage, KnowledgeTranslation>>;
  attachments: KnowledgeAttachment[];
  revisions: KnowledgeRevision[];
  usageCount: number;
  helpfulCount: number;
  lastMatchedAt?: string;
}

export interface KnowledgeItemExtended extends ChatbotFaqItem {
  subcategory: string;
  alternativeQuestions: string[];
  synonyms: string[];
  relatedTopics: string[];
  status: KnowledgePublicationStatus;
  translations: Partial<Record<SupportedLanguage, KnowledgeTranslation>>;
  attachments: KnowledgeAttachment[];
  revisions: KnowledgeRevision[];
  usageCount: number;
  helpfulCount: number;
  lastMatchedAt?: string;
}

export interface KnowledgeDocumentItem {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  language: SupportedLanguage | "all";
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  summary: string;
  extractedText: string;
  keywords: string[];
  status: KnowledgePublicationStatus;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
}

export type WorkflowStepInputType =
  | "text"
  | "phone"
  | "email"
  | "number"
  | "choice"
  | "file"
  | "multiline";

export interface WorkflowBranchRule {
  id: string;
  matchType: "contains" | "equals" | "regex";
  pattern: string;
  nextStepId?: string;
  overrideCompletionAction?: ChatbotWorkflow["completionAction"];
  extraReply?: string;
}

export interface WorkflowStep {
  id: string;
  fieldKey: keyof LeadDataFields | "custom_note";
  label: string;
  prompt: string;
  localizedPrompts?: Partial<Record<SupportedLanguage, string>>;
  inputType: WorkflowStepInputType;
  required: boolean;
  quickReplies: string[];
  skipIfCollected: boolean;
  validationMessage?: string;
  branchRules?: WorkflowBranchRule[];
}

export interface ChatbotWorkflow {
  id: string;
  name: string;
  intent: RichChatIntent;
  category: string;
  description: string;
  enabled: boolean;
  priority: number;
  triggerKeywords: string[];
  steps: WorkflowStep[];
  completionAction:
    | "create_lead"
    | "create_rfq"
    | "request_handover"
    | "book_visit"
    | "summary_only";
  completionMessage: string;
  localizedCompletionMessages?: Partial<Record<SupportedLanguage, string>>;
  updatedAt: string;
}

export interface LeadDataFields {
  name?: string;
  company?: string;
  contactNumber?: string;
  email?: string;
  requiredService?: string;
  projectDescription?: string;
  projectLocation?: string;
  approximateQuantity?: string;
  dimensions?: string;
  availableDrawings?: string;
  expectedTimeline?: string;
  additionalRequirements?: string;
}

export interface ChatAttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes?: number;
  uploadedAt: string;
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
  // Enhanced INNOASSIST controls
  personalityTone: PersonalityTone;
  responseLength: ResponseLengthMode;
  supportedLanguages: SupportedLanguage[];
  localizedWelcome: Record<SupportedLanguage, string>;
  localizedFallback: Record<SupportedLanguage, string>;
  aiMode: AiOperatingMode;
  aiConfidenceThreshold: number;
  knowledgeMatchThreshold: number;
  dailyAiCallLimit: number;
  aiCooldownSeconds: number;
  enableResponseCache: boolean;
  cacheTtlMinutes: number;
  memoryWindowTurns: number;
  leadCollectionEnabled: boolean;
  leadRequiredFields: Array<keyof LeadDataFields>;
  handoverEnabled: boolean;
  autoEscalateAfterFallbacks: number;
  restrictedTopics: string[];
  accentColor: string;
  notifyOnHandover: boolean;
  notifyOnLead: boolean;
  notifyOnUnanswered: boolean;
  retentionDays: number;
  enableFileUploads: boolean;
  enableFeedbackRating: boolean;
}

export type PublicChatbotConfig = Omit<
  ChatbotConfig,
  "systemInstructions" | "restrictedTopics" | "dailyAiCallLimit"
>;

export type RichChatIntent =
  | "general_inquiry"
  | "service_discovery"
  | "aluminium_fabrication"
  | "glass_solutions"
  | "steel_fabrication"
  | "construction_inquiry"
  | "quotation_request"
  | "project_inquiry"
  | "technical_inquiry"
  | "supplier_registration"
  | "customer_complaint"
  | "consultation_request"
  | "human_assistance"
  | "site_visit"
  | "whatsapp"
  | "sms";

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  enabled: true,
  assistantName: "INNOASSIST",
  welcomeMessage:
    "Hi! Welcome to Innovista Metal Fabriconix. Ask about aluminium, glass, steel systems, quotations, or book a site visit.",
  systemInstructions:
    "You are INNOASSIST, the official architectural & metal fabrication assistant of INNOVISTA METAL FABRICONIX (PVT) LTD in Sri Lanka. Be accurate, warm, and grounded strictly in published company knowledge and catalog facts. Never invent prices, technical specs, or internal company information. Never promise final commercial quotations—explain that official quotations require estimator BOQ verification.",
  whatsappTriggerLabel: "Chat on WhatsApp",
  defaultWhatsappPrefix: "Hi Innovista, I need help with:",
  quickPrompts: [
    "Request a quotation",
    "Aluminium & glass systems",
    "Book a site visit",
    "Talk to a specialist",
  ],
  autoSuggestWhatsapp: true,
  personalityTone: "professional",
  responseLength: "balanced",
  supportedLanguages: ["en", "si", "ta"],
  localizedWelcome: {
    en: "Hi! Welcome to Innovista Metal Fabriconix. Ask about aluminium, glass, steel systems, quotations, or book a site visit.",
    si: "ආයුබෝවන්! Innovista Metal Fabriconix වෙත සාදරයෙන් පිළිගනිමු. ඇලුමිනියම්, වීදුරු, වානේ පද්ධති, මිල ගණන් හෝ site visit පිළිබඳ විමසන්න.",
    ta: "வணக்கம்! Innovista Metal Fabriconix-க்கு வரவேற்கிறோம். அலுமினியம், கண்ணாடி, எஃகு வேலைகள், விலைப்பட்டியல் அல்லது தளப் பார்வை குறித்து கேளுங்கள்.",
  },
  localizedFallback: {
    en: "I want to make sure you receive verified engineering details. I could not confirm an exact answer in our published knowledge base, so I have logged this for our team. Would you like to connect with a specialist or submit project details for an official BOQ?",
    si: "ඔබට නිවැරදි තාක්ෂණික තොරතුරු ලබා දීමට අපි කැමතියි. මෙම විමසුම සඳහා අපගේ නිල දත්ත පද්ධතියේ සෘජු පිළිතුරක් සොයාගැනීමට නොහැකි වූ බැවින්, එය අපගේ ඉංජිනේරු කණ්ඩායම වෙත යොමු කර ඇත. විශේෂඥයෙකු සමඟ සම්බන්ධ වීමට කැමතිද?",
    ta: "சரியான தொழில்நுட்பத் தகவலை வழங்க விரும்புகிறோம். எங்கள் வெளியிடப்பட்ட அறிவுத்தளத்தில் இதற்கான நேரடி பதில் கிடைக்காததால், இதை எங்கள் பொறியாளர் குழுவிற்கு அனுப்பியுள்ளோம். மனித நிபுணருடன் பேச விரும்புகிறீர்களா?",
  },
  aiMode: "hybrid_credit_saver",
  aiConfidenceThreshold: 0.55,
  knowledgeMatchThreshold: 3.4,
  dailyAiCallLimit: 250,
  aiCooldownSeconds: 3,
  enableResponseCache: true,
  cacheTtlMinutes: 720,
  memoryWindowTurns: 8,
  leadCollectionEnabled: true,
  leadRequiredFields: ["name", "contactNumber", "requiredService", "projectLocation"],
  handoverEnabled: true,
  autoEscalateAfterFallbacks: 2,
  restrictedTopics: [
    "internal cost",
    "profit margin",
    "employee salary",
    "payroll",
    "admin password",
    "api key",
    "secret key",
    "database credentials",
    "other customer details",
    "private client phone",
  ],
  accentColor: "#0A74C9",
  notifyOnHandover: true,
  notifyOnLead: true,
  notifyOnUnanswered: true,
  retentionDays: 90,
  enableFileUploads: true,
  enableFeedbackRating: true,
};

export const DEFAULT_CHATBOT_FAQS: ChatbotFaqItem[] = [
  {
    id: "faq-1",
    question: "How do I book a site measurement visit?",
    answer:
      "Pick any open slot right here in the Site Visit tab or Contact section. Confirmed visits sync with Google Calendar and send an instant confirmation.",
    category: "Site Visit",
    keywords: [
      "site visit",
      "visit",
      "measurement",
      "book",
      "slot",
      "schedule",
      "appointment",
      "survey",
    ],
    enabled: true,
    priority: 10,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-2",
    question: "What glazing and aluminium products do you fabricate?",
    answer:
      "We fabricate thermally broken slim sliding doors, unitized curtain walls, acoustic partitions, casement windows, skylights, louvers, stainless steel railings, and frameless balustrades.",
    category: "Products",
    keywords: [
      "products",
      "sliding",
      "door",
      "window",
      "curtain wall",
      "skylight",
      "partition",
      "glass",
      "aluminium",
      "louver",
      "balustrade",
    ],
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
    keywords: [
      "coastal",
      "rust",
      "warranty",
      "sea",
      "powder coating",
      "anodized",
      "weather",
      "finish",
      "corrosion",
    ],
    enabled: true,
    priority: 8,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "faq-4",
    question: "How quickly can I get a project quotation?",
    answer:
      "Share your rough dimensions, quantities, or CAD drawings here or via Request Quote, and our estimators return a verified formal BOQ within 24–48 business hours.",
    category: "Quotation",
    keywords: [
      "quote",
      "quotation",
      "price",
      "pricing",
      "cost",
      "estimate",
      "boq",
      "rate",
    ],
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
    keywords: [
      "showroom",
      "address",
      "location",
      "colombo",
      "nawala",
      "kelaniya",
      "kandy",
      "hours",
      "open",
    ],
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
    keywords: [
      "install",
      "installation",
      "island",
      "sri lanka",
      "delivery",
      "galle",
      "negombo",
      "turnkey",
    ],
    enabled: true,
    priority: 7,
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

export const DEFAULT_KNOWLEDGE_META: Record<string, KnowledgeItemMeta> = {
  "faq-1": {
    faqId: "faq-1",
    subcategory: "Measurement & Survey",
    alternativeQuestions: [
      "Can an engineer visit my site for measurements?",
      "Schedule a measurement appointment",
      "Book site inspection",
    ],
    synonyms: ["site survey", "field measurement", "inspection", "site check"],
    relatedTopics: ["Consultation Request", "Showrooms"],
    status: "published",
    translations: {
      si: {
        question: "Site මිනුම් පරීක්ෂාවක් වෙන්කරවා ගන්නේ කෙසේද?",
        answer:
          "මෙහි ඇති Site Visit ටැබ් එක හෝ Contact පිටුව හරහා ඔබට කැමති දිනයක් සහ වේලාවක් වෙන්කරවා ගත හැකිය.",
      },
      ta: {
        question: "தள அளவீட்டுப் பார்வையை எவ்வாறு முன்பதிவு செய்வது?",
        answer:
          "இங்கிருக்கும் Site Visit தாவல் அல்லது Contact பக்கம் மூலம் உங்களுக்கு விருப்பமான நேரத்தைத் தேர்ந்தெடுக்கலாம்.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
  "faq-2": {
    faqId: "faq-2",
    subcategory: "Architectural Systems",
    alternativeQuestions: [
      "What services does Innovista Metal Fabriconix offer?",
      "Do you make aluminium doors, windows, and steel structures?",
      "Tell me about your glass and metal fabrication services",
    ],
    synonyms: ["fabricate", "systems", "catalog", "aluminium", "steel", "glazing"],
    relatedTopics: ["Quotation", "Quality & Warranty"],
    status: "published",
    translations: {
      si: {
        question: "ඔබ නිෂ්පාදනය කරන ඇලුමිනියම් සහ වීදුරු නිෂ්පාදන මොනවාද?",
        answer:
          "අපි Slim sliding doors, curtain walls, acoustic partitions, casement windows, skylights, louvers සහ මල නොබැඳෙන වානේ රේලින් නිෂ්පාදනය කරන්නෙමු.",
      },
      ta: {
        question: "நீங்கள் எந்த வகையான அலுமினியம் மற்றும் கண்ணாடி தயாரிப்புகளைச் செய்கிறீர்கள்?",
        answer:
          "நாங்கள் ஸ்லிம் ஸ்லைடிங் கதவுகள், கர்ட்டன் சுவர்கள், ஒலிப்புகா பிரிவுகள், ஜன்னல்கள், ஸ்கைலைட்கள் மற்றும் எஃகு கைப்பிடிகளைத் தயாரிக்கிறோம்.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
  "faq-3": {
    faqId: "faq-3",
    subcategory: "Surface Finishes",
    alternativeQuestions: [
      "Will aluminium rust near the beach or sea?",
      "What powder coating warranty do you provide?",
    ],
    synonyms: ["marine grade", "salt air", "beachfront", "pvdf", "guarantee"],
    relatedTopics: ["Products", "Installation"],
    status: "published",
    translations: {
      si: {
        question: "මුහුදුබඩ ප්‍රදේශ සඳහා ඔබේ ඇලුමිනියම් නිමාව සුදුසුද?",
        answer:
          "ඔව්. අපගේ marine-grade anodized සහ AAMA 2604/2605 PVDF powder coatings සඳහා වසර 15ක වෙරළබඩ කාලගුණ වගකීමක් ඇත.",
      },
      ta: {
        question: "கடற்கரைப் பகுதிகளுக்கு உங்கள் அலுமினிய பூச்சு பொருந்துமா?",
        answer:
          "ஆம். கடல் காற்றைத் தாங்கும் AAMA 2604/2605 PVDF பவுடர் கோட்டிங் மற்றும் 15 ஆண்டுகள் உத்தரவாதம் வழங்குகிறோம்.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
  "faq-4": {
    faqId: "faq-4",
    subcategory: "Estimating & BOQ",
    alternativeQuestions: [
      "How do I request a formal quote or BOQ?",
      "How much does a sliding door or curtain wall cost?",
      "Can you give me a price estimate?",
    ],
    synonyms: ["bill of quantities", "estimate", "budget", "rates", "commercial offer"],
    relatedTopics: ["Site Visit", "Products"],
    status: "published",
    translations: {
      si: {
        question: "ව්‍යාපෘතියක් සඳහා මිල ගණන් (Quotation) ලබා ගන්නේ කෙසේද?",
        answer:
          "ඔබගේ මිනුම්, ප්‍රමාණයන් හෝ CAD සැලසුම් මෙහි බෙදාගන්න. පැය 24–48 අතර නිල BOQ මිල ගණනක් අපගේ කණ්ඩායම මගින් ලබා දෙනු ඇත.",
      },
      ta: {
        question: "திட்டத்திற்கான விலைப்பட்டியல் (Quotation) எவ்வாறு பெறுவது?",
        answer:
          "உங்கள் அளவுகள் அல்லது வரைபடங்களைப் பகிருங்கள். 24–48 வேலை நேரத்திற்குள் எங்கள் பொறியாளர்கள் அதிகாரப்பூர்வ BOQ வழங்குவார்கள்.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
  "faq-5": {
    faqId: "faq-5",
    subcategory: "Branches & Hours",
    alternativeQuestions: [
      "Where is Innovista located?",
      "What time do your showrooms open and close?",
    ],
    synonyms: ["branch", "factory", "plant", "office", "working hours"],
    relatedTopics: ["Site Visit", "Installation"],
    status: "published",
    translations: {
      si: {
        question: "ඔබගේ ප්‍රදර්ශනාගාර පිහිටා ඇත්තේ කොහේද සහ විවෘත වේලාවන් මොනවාද?",
        answer:
          "නාවල (කොළඹ 05), කැලණිය කර්මාන්තශාලාව හෝ මහනුවර ප්‍රදර්ශනාගාරය සඳුදා සිට සෙනසුරාදා දක්වා පෙ.ව. 8:30 සිට ප.ව. 5:30 දක්වා විවෘතයි.",
      },
      ta: {
        question: "உங்கள் காட்சியகங்கள் எங்கே உள்ளன, திறக்கும் நேரம் என்ன?",
        answer:
          "நாவல (கொழும்பு 05), களனி தொழிற்சாலை மற்றும் கண்டி காட்சியகம் திங்கள் முதல் சனி வரை காலை 8:30 முதல் மாலை 5:30 வரை திறந்திருக்கும்.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
  "faq-6": {
    faqId: "faq-6",
    subcategory: "Delivery & Fitting",
    alternativeQuestions: [
      "Do you work outside Colombo?",
      "Can you install in Kandy, Galle, or Kurunegala?",
    ],
    synonyms: ["nationwide", "provinces", "fitting", "erection", "transport"],
    relatedTopics: ["Locations", "Site Visit"],
    status: "published",
    translations: {
      si: {
        question: "ඔබ ශ්‍රී ලංකාව පුරාම සවිකිරීම් සිදු කරනවාද?",
        answer:
          "ඔව්, අපගේ පළපුරුදු කණ්ඩායම් දිවයින පුරා මිනුම් ගැනීම, නිෂ්පාදනය සහ සවිකිරීමේ සේවා සපයයි.",
      },
      ta: {
        question: "இலங்கை முழுவதும் பொருத்தும் சேவை செய்கிறீர்களா?",
        answer:
          "ஆம், எங்கள் நிபுணர் குழுக்கள் தீவு முழுவதும் அளவீடு, தயாரிப்பு மற்றும் பொருத்தும் பணிகளை மேற்கொள்கின்றன.",
      },
    },
    attachments: [],
    revisions: [
      {
        version: 1,
        editedAt: "2025-01-10T09:00:00.000Z",
        editedBy: "System Seed",
        summary: "Initial published entry",
        status: "published",
      },
    ],
    usageCount: 0,
    helpfulCount: 0,
  },
};

function makeWorkflowStep(
  partial: Partial<WorkflowStep> & Pick<WorkflowStep, "id" | "fieldKey" | "label" | "prompt">
): WorkflowStep {
  return {
    inputType: "text",
    required: true,
    quickReplies: [],
    skipIfCollected: true,
    ...partial,
  };
}

export const DEFAULT_CHATBOT_WORKFLOWS: ChatbotWorkflow[] = [
  {
    id: "wf-quotation-request",
    name: "Quotation & BOQ Request",
    intent: "quotation_request",
    category: "Sales & Quotations",
    description: "Collects structured project scope, dimensions, drawings, and contact info for an official BOQ.",
    enabled: true,
    priority: 10,
    triggerKeywords: ["quote", "quotation", "boq", "estimate", "cost", "pricing", "price list"],
    steps: [
      makeWorkflowStep({
        id: "qt-service",
        fieldKey: "requiredService",
        label: "Required Service",
        prompt: "Which fabrication system do you need a quotation for?",
        localizedPrompts: {
          si: "ඔබට මිල ගණන් අවශ්‍ය වන්නේ කුමන නිෂ්පාදන පද්ධතිය සඳහාද?",
          ta: "எந்த தயாரிப்பு அமைப்பிற்கு விலைப்பட்டியல் தேவை?",
        },
        inputType: "choice",
        quickReplies: [
          "Aluminium Doors & Windows",
          "Glass Facade / Partition",
          "Steel Fabrication",
          "Skylight / Louvers",
        ],
      }),
      makeWorkflowStep({
        id: "qt-location",
        fieldKey: "projectLocation",
        label: "Project Location",
        prompt: "Where is the project site located (city/district)?",
        localizedPrompts: {
          si: "ව්‍යාපෘතිය පිහිටි නගරය හෝ ප්‍රදේශය කුමක්ද?",
          ta: "திட்ட தளம் எங்கே அமைந்துள்ளது?",
        },
      }),
      makeWorkflowStep({
        id: "qt-dims",
        fieldKey: "dimensions",
        label: "Dimensions & Quantity",
        prompt: "Please share approximate dimensions or quantities (or attach drawings/BOQ using the upload button).",
        localizedPrompts: {
          si: "ආසන්න මිනුම් හෝ ප්‍රමාණයන් සඳහන් කරන්න (නැතහොත් සැලසුම්/BOQ උඩුගත කරන්න).",
          ta: "தோராயமான அளவுகள் அல்லது எண்ணிக்கையைப் பகிரவும் (அல்லது வரைபடங்களைப் பதிவேற்றவும்).",
        },
        quickReplies: ["Will attach drawings", "Not measured yet — need site visit"],
        branchRules: [
          {
            id: "br-visit",
            matchType: "contains",
            pattern: "site visit",
            overrideCompletionAction: "book_visit",
            extraReply: "No problem! After collecting your contact details, you can pick a site measurement slot directly.",
          },
        ],
      }),
      makeWorkflowStep({
        id: "qt-timeline",
        fieldKey: "expectedTimeline",
        label: "Expected Timeline",
        prompt: "What is your expected completion timeline?",
        inputType: "choice",
        required: false,
        quickReplies: ["Urgent (2–4 weeks)", "1–3 months", "Planning stage"],
      }),
      makeWorkflowStep({
        id: "qt-name",
        fieldKey: "name",
        label: "Full Name",
        prompt: "May I have your name (and company name if commercial)?",
      }),
      makeWorkflowStep({
        id: "qt-phone",
        fieldKey: "contactNumber",
        label: "Contact Number",
        prompt: "What is the best phone or WhatsApp number to send your official BOQ?",
        inputType: "phone",
        validationMessage: "Please enter a valid contact phone number (at least 7 digits).",
      }),
      makeWorkflowStep({
        id: "qt-email",
        fieldKey: "email",
        label: "Email Address",
        prompt: "And your email address for sending the formal quotation?",
        inputType: "email",
        validationMessage: "Please enter a valid email address (e.g. name@company.com).",
      }),
    ],
    completionAction: "create_rfq",
    completionMessage:
      "Thank you! Your quotation inquiry has been logged for our estimating engineers. Remember, final commercial pricing is issued only after BOQ & drawing verification within 24–48 business hours.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-aluminium-fabrication",
    name: "Aluminium Fabrication Inquiry",
    intent: "aluminium_fabrication",
    category: "Aluminium Systems",
    description: "Guides customers asking about aluminium doors, windows, partitions, louvers, and finishes.",
    enabled: true,
    priority: 9,
    triggerKeywords: ["aluminium", "aluminum", "sliding door", "casement", "louver", "profile", "powder coat"],
    steps: [
      makeWorkflowStep({
        id: "al-type",
        fieldKey: "requiredService",
        label: "Aluminium System",
        prompt: "Which aluminium system are you exploring?",
        inputType: "choice",
        quickReplies: ["Slim Sliding Doors", "Casement / Awning Windows", "Office Partitions", "Architectural Louvers"],
      }),
      makeWorkflowStep({
        id: "al-desc",
        fieldKey: "projectDescription",
        label: "Project Specs",
        prompt: "Is this for a residential home, apartment, or commercial building? Feel free to share coastal exposure or acoustic needs.",
      }),
      makeWorkflowStep({
        id: "al-name",
        fieldKey: "name",
        label: "Name",
        prompt: "May I know your name so our aluminium specialist can follow up?",
      }),
      makeWorkflowStep({
        id: "al-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Please share your phone/WhatsApp number for profile samples or a site measurement.",
        inputType: "phone",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Got it! Your aluminium fabrication inquiry is registered. Our specialist team will share suitable profile series and finish options shortly.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-glass-solutions",
    name: "Glass Solutions Inquiry",
    intent: "glass_solutions",
    category: "Glazing & Facades",
    description: "Captures tempered, laminated, DGU, shower enclosure, balustrade, and skylight glass requirements.",
    enabled: true,
    priority: 9,
    triggerKeywords: ["glass", "glazing", "tempered", "laminated", "dgu", "balustrade", "shower", "skylight", "curtain wall"],
    steps: [
      makeWorkflowStep({
        id: "gl-type",
        fieldKey: "requiredService",
        label: "Glass Application",
        prompt: "Which glass solution do you require?",
        inputType: "choice",
        quickReplies: ["Frameless Balustrade", "Shower Cubicle", "Skylight / Canopy", "Curtain Wall / Double Glazed"],
      }),
      makeWorkflowStep({
        id: "gl-dims",
        fieldKey: "dimensions",
        label: "Area / Dimensions",
        prompt: "Approximately how many panels or what dimensions are needed?",
        required: false,
      }),
      makeWorkflowStep({
        id: "gl-name",
        fieldKey: "name",
        label: "Name",
        prompt: "Your name for our glazing engineer?",
      }),
      makeWorkflowStep({
        id: "gl-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Your phone or WhatsApp number?",
        inputType: "phone",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Thank you! Your glazing inquiry is recorded. Our glass engineering team will advise safe thickness and hardware options.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-steel-fabrication",
    name: "Steel Fabrication Inquiry",
    intent: "steel_fabrication",
    category: "Structural Steel",
    description: "Handles structural steel, stainless steel railings, staircases, canopies, and industrial steel works.",
    enabled: true,
    priority: 9,
    triggerKeywords: ["steel", "mild steel", "stainless", "ss railing", "staircase", "truss", "mezzanine", "gate"],
    steps: [
      makeWorkflowStep({
        id: "st-type",
        fieldKey: "requiredService",
        label: "Steel Scope",
        prompt: "What type of steel fabrication do you need?",
        inputType: "choice",
        quickReplies: ["Structural Steel / Mezzanine", "Stainless Steel Railings", "Steel Staircase / Canopy", "Custom Gates & Grilles"],
      }),
      makeWorkflowStep({
        id: "st-loc",
        fieldKey: "projectLocation",
        label: "Location",
        prompt: "Which city or district is the site in?",
      }),
      makeWorkflowStep({
        id: "st-name",
        fieldKey: "name",
        label: "Name",
        prompt: "What is your name or company name?",
      }),
      makeWorkflowStep({
        id: "st-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Best phone/WhatsApp number to reach you?",
        inputType: "phone",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Logged! Our steel fabrication division has received your inquiry and will review structural drawings or arrange a site check.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-construction-inquiry",
    name: "Construction & Turnkey Inquiry",
    intent: "construction_inquiry",
    category: "Construction",
    description: "Collects turnkey facade, commercial fit-out, and building envelope inquiries.",
    enabled: true,
    priority: 8,
    triggerKeywords: ["construction", "contractor", "building", "villa", "apartment", "commercial project", "turnkey"],
    steps: [
      makeWorkflowStep({
        id: "cn-desc",
        fieldKey: "projectDescription",
        label: "Construction Scope",
        prompt: "Tell us briefly about your construction project (e.g., new villa, office tower, renovation).",
      }),
      makeWorkflowStep({
        id: "cn-loc",
        fieldKey: "projectLocation",
        label: "Site Location",
        prompt: "Where is the construction site located?",
      }),
      makeWorkflowStep({
        id: "cn-time",
        fieldKey: "expectedTimeline",
        label: "Schedule",
        prompt: "When do you expect fabrication/installation to start?",
        required: false,
      }),
      makeWorkflowStep({
        id: "cn-name",
        fieldKey: "name",
        label: "Contact Name",
        prompt: "Your name and company (if applicable)?",
      }),
      makeWorkflowStep({
        id: "cn-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Your contact number?",
        inputType: "phone",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Thank you! Our turnkey project team has received your construction brief and will coordinate directly.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-service-discovery",
    name: "Service Discovery",
    intent: "service_discovery",
    category: "Discovery",
    description: "Helps first-time visitors explore Innovista services and narrow down their needs.",
    enabled: true,
    priority: 7,
    triggerKeywords: ["services", "what do you do", "help me choose", "solutions", "capabilities"],
    steps: [
      makeWorkflowStep({
        id: "sd-area",
        fieldKey: "requiredService",
        label: "Area of Interest",
        prompt: "We specialize in architectural aluminium, structural glazing, steel fabrication, and turnkey installation. Which area would you like to explore?",
        inputType: "choice",
        quickReplies: ["Aluminium Doors & Windows", "Glass & Facades", "Steel Works", "Book Site Consultation"],
        branchRules: [
          {
            id: "sd-visit",
            matchType: "contains",
            pattern: "consultation",
            overrideCompletionAction: "book_visit",
          },
        ],
      }),
      makeWorkflowStep({
        id: "sd-desc",
        fieldKey: "projectDescription",
        label: "Use Case",
        prompt: "Are you planning a residential home, commercial space, or renovation?",
        required: false,
        quickReplies: ["Residential Home", "Commercial / Office", "Renovation"],
      }),
    ],
    completionAction: "summary_only",
    completionMessage:
      "Great! You can ask any technical question now, upload a drawing for estimation, or switch to the Site Visit tab to book an engineer inspection.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-project-inquiry",
    name: "Project & Tender Inquiry",
    intent: "project_inquiry",
    category: "Projects",
    description: "Handles architectural tender, multi-unit, and contractor package inquiries.",
    enabled: true,
    priority: 8,
    triggerKeywords: ["project inquiry", "tender", "architect", "boq package", "contractor package", "apartment project"],
    steps: [
      makeWorkflowStep({
        id: "pj-comp",
        fieldKey: "company",
        label: "Company / Practice",
        prompt: "Which company, architectural practice, or contractor are you representing?",
      }),
      makeWorkflowStep({
        id: "pj-desc",
        fieldKey: "projectDescription",
        label: "Project Scope",
        prompt: "Please summarize the project scope and tender submission deadline.",
      }),
      makeWorkflowStep({
        id: "pj-name",
        fieldKey: "name",
        label: "Contact Person",
        prompt: "Your full name?",
      }),
      makeWorkflowStep({
        id: "pj-email",
        fieldKey: "email",
        label: "Email",
        prompt: "Official email address for tender correspondence?",
        inputType: "email",
      }),
      makeWorkflowStep({
        id: "pj-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Direct phone number?",
        inputType: "phone",
      }),
    ],
    completionAction: "create_rfq",
    completionMessage:
      "Thank you! Your project/tender inquiry is logged for our commercial engineering desk.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-technical-inquiry",
    name: "Technical Specification Inquiry",
    intent: "technical_inquiry",
    category: "Engineering",
    description: "Collects technical queries (wind load, acoustic dB, thermal break, alloy grade, glass thickness) for engineering review.",
    enabled: true,
    priority: 8,
    triggerKeywords: ["technical", "specification", "spec", "wind load", "u-value", "acoustic", "thickness", "cad", "detail"],
    steps: [
      makeWorkflowStep({
        id: "tc-topic",
        fieldKey: "projectDescription",
        label: "Technical Question",
        prompt: "Please describe the technical specification, span height, wind zone, or performance requirement you need verified.",
      }),
      makeWorkflowStep({
        id: "tc-email",
        fieldKey: "email",
        label: "Email",
        prompt: "Where can our engineering team send verified spec sheets or shop drawings?",
        inputType: "email",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Recorded! We never guess engineering specs—our technical team will send verified profile data sheets to your email.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-supplier-registration",
    name: "Supplier & Vendor Registration",
    intent: "supplier_registration",
    category: "Procurement",
    description: "Onboards aluminium, glass, hardware, sealant, or logistics suppliers.",
    enabled: true,
    priority: 7,
    triggerKeywords: ["supplier", "vendor", "supply", "partner with", "procurement", "sell materials"],
    steps: [
      makeWorkflowStep({
        id: "sp-company",
        fieldKey: "company",
        label: "Supplier Company",
        prompt: "What is your registered business/supplier name?",
      }),
      makeWorkflowStep({
        id: "sp-cat",
        fieldKey: "requiredService",
        label: "Materials Supplied",
        prompt: "What products or services do you supply (e.g., profiles, glass, hardware, powder coating, transport)?",
      }),
      makeWorkflowStep({
        id: "sp-name",
        fieldKey: "name",
        label: "Contact Person",
        prompt: "Key contact person's name?",
      }),
      makeWorkflowStep({
        id: "sp-email",
        fieldKey: "email",
        label: "Email",
        prompt: "Business email address?",
        inputType: "email",
      }),
      makeWorkflowStep({
        id: "sp-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Contact phone number?",
        inputType: "phone",
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Thank you! Your supplier registration details have been forwarded to Innovista Procurement.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-customer-complaint",
    name: "Customer Support & Complaint Escalation",
    intent: "customer_complaint",
    category: "After-Sales Support",
    description: "Prioritizes warranty issues, installation defects, leaks, or service complaints and escalates to a human.",
    enabled: true,
    priority: 10,
    triggerKeywords: ["complaint", "issue", "problem", "leak", "broken", "defect", "warranty claim", "not working", "delay"],
    steps: [
      makeWorkflowStep({
        id: "cp-desc",
        fieldKey: "projectDescription",
        label: "Issue Description",
        prompt: "I'm sorry to hear you're experiencing an issue. Please describe the problem (and your order/project reference if available).",
      }),
      makeWorkflowStep({
        id: "cp-name",
        fieldKey: "name",
        label: "Customer Name",
        prompt: "Your full name?",
      }),
      makeWorkflowStep({
        id: "cp-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Your phone number so our after-sales supervisor can contact you urgently?",
        inputType: "phone",
      }),
    ],
    completionAction: "request_handover",
    completionMessage:
      "Your support case has been escalated as priority to our after-sales team. A human coordinator will join this conversation or call you shortly.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-consultation-request",
    name: "Engineering Consultation Request",
    intent: "consultation_request",
    category: "Consultations",
    description: "Schedules showroom or on-site engineering consultations.",
    enabled: true,
    priority: 8,
    triggerKeywords: ["consultation", "consult", "advise", "recommend", "architectural meeting"],
    steps: [
      makeWorkflowStep({
        id: "cs-mode",
        fieldKey: "requiredService",
        label: "Consultation Mode",
        prompt: "Would you prefer an on-site measurement visit, showroom consultation (Nawala/Kandy), or online call?",
        inputType: "choice",
        quickReplies: ["On-Site Measurement", "Nawala Showroom", "Kandy Showroom", "Phone / Video Call"],
      }),
      makeWorkflowStep({
        id: "cs-name",
        fieldKey: "name",
        label: "Name",
        prompt: "May I have your name?",
      }),
      makeWorkflowStep({
        id: "cs-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Best phone number to confirm your consultation time?",
        inputType: "phone",
      }),
    ],
    completionAction: "book_visit",
    completionMessage:
      "Consultation details noted! You can also lock an exact date and time right now in the Site Visits tab.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-human-assistance",
    name: "Human Specialist Handover",
    intent: "human_assistance",
    category: "Live Support",
    description: "Transfers the conversation cleanly to a live Innovista administrator or specialist.",
    enabled: true,
    priority: 10,
    triggerKeywords: ["human", "agent", "representative", "person", "staff", "manager", "live support", "talk to someone"],
    steps: [
      makeWorkflowStep({
        id: "hu-name",
        fieldKey: "name",
        label: "Name",
        prompt: "Sure—I can connect you with a live Innovista specialist. What is your name?",
      }),
      makeWorkflowStep({
        id: "hu-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "And a phone/WhatsApp number in case our specialist needs to follow up offline?",
        inputType: "phone",
        required: false,
      }),
    ],
    completionAction: "request_handover",
    completionMessage:
      "You are now in the live specialist queue. An Innovista administrator has been alerted and will reply directly here (AI replies are paused while in human support).",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
  {
    id: "wf-general-inquiry",
    name: "General Customer Inquiry",
    intent: "general_inquiry",
    category: "General",
    description: "Handles general inquiries and captures optional callback details.",
    enabled: true,
    priority: 3,
    triggerKeywords: ["general", "other", "info", "information", "contact me"],
    steps: [
      makeWorkflowStep({
        id: "gn-topic",
        fieldKey: "projectDescription",
        label: "Inquiry",
        prompt: "How can we assist you today?",
      }),
      makeWorkflowStep({
        id: "gn-phone",
        fieldKey: "contactNumber",
        label: "Phone",
        prompt: "Optional: share your phone/WhatsApp if you'd like our team to call you back.",
        inputType: "phone",
        required: false,
      }),
    ],
    completionAction: "create_lead",
    completionMessage:
      "Thank you! Your inquiry has been noted for our customer care desk.",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

// ============================================================================
// NORMALIZERS
// ============================================================================

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

  const supportedLanguages = Array.isArray(input.supportedLanguages)
    ? (input.supportedLanguages.filter((l) =>
        l === "en" || l === "si" || l === "ta"
      ) as SupportedLanguage[])
    : fallback.supportedLanguages;

  const restrictedTopics = Array.isArray(input.restrictedTopics)
    ? input.restrictedTopics.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean)
    : typeof (input as { restrictedTopics?: unknown }).restrictedTopics === "string"
      ? String((input as { restrictedTopics?: unknown }).restrictedTopics)
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : fallback.restrictedTopics;

  const leadRequiredFields = Array.isArray(input.leadRequiredFields)
    ? (input.leadRequiredFields.filter(Boolean) as Array<keyof LeadDataFields>)
    : fallback.leadRequiredFields;

  const numClamp = (val: unknown, def: number, min: number, max: number) =>
    typeof val === "number" && Number.isFinite(val)
      ? Math.max(min, Math.min(max, val))
      : def;

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
    personalityTone:
      input.personalityTone === "professional" ||
      input.personalityTone === "friendly" ||
      input.personalityTone === "technical" ||
      input.personalityTone === "concise"
        ? input.personalityTone
        : fallback.personalityTone,
    responseLength:
      input.responseLength === "short" ||
      input.responseLength === "balanced" ||
      input.responseLength === "detailed"
        ? input.responseLength
        : fallback.responseLength,
    supportedLanguages:
      supportedLanguages.length > 0 ? supportedLanguages : fallback.supportedLanguages,
    localizedWelcome: {
      en: input.localizedWelcome?.en?.trim() || input.welcomeMessage?.trim() || fallback.localizedWelcome.en,
      si: input.localizedWelcome?.si?.trim() || fallback.localizedWelcome.si,
      ta: input.localizedWelcome?.ta?.trim() || fallback.localizedWelcome.ta,
    },
    localizedFallback: {
      en: input.localizedFallback?.en?.trim() || fallback.localizedFallback.en,
      si: input.localizedFallback?.si?.trim() || fallback.localizedFallback.si,
      ta: input.localizedFallback?.ta?.trim() || fallback.localizedFallback.ta,
    },
    aiMode:
      input.aiMode === "hybrid_credit_saver" ||
      input.aiMode === "local_only" ||
      input.aiMode === "ai_first"
        ? input.aiMode
        : fallback.aiMode,
    aiConfidenceThreshold: numClamp(
      input.aiConfidenceThreshold,
      fallback.aiConfidenceThreshold,
      0.1,
      0.95
    ),
    knowledgeMatchThreshold: numClamp(
      input.knowledgeMatchThreshold,
      fallback.knowledgeMatchThreshold,
      1.5,
      12
    ),
    dailyAiCallLimit: Math.round(
      numClamp(input.dailyAiCallLimit, fallback.dailyAiCallLimit, 0, 10000)
    ),
    aiCooldownSeconds: Math.round(
      numClamp(input.aiCooldownSeconds, fallback.aiCooldownSeconds, 0, 120)
    ),
    enableResponseCache:
      typeof input.enableResponseCache === "boolean"
        ? input.enableResponseCache
        : fallback.enableResponseCache,
    cacheTtlMinutes: Math.round(
      numClamp(input.cacheTtlMinutes, fallback.cacheTtlMinutes, 5, 10080)
    ),
    memoryWindowTurns: Math.round(
      numClamp(input.memoryWindowTurns, fallback.memoryWindowTurns, 2, 20)
    ),
    leadCollectionEnabled:
      typeof input.leadCollectionEnabled === "boolean"
        ? input.leadCollectionEnabled
        : fallback.leadCollectionEnabled,
    leadRequiredFields:
      leadRequiredFields.length > 0 ? leadRequiredFields : fallback.leadRequiredFields,
    handoverEnabled:
      typeof input.handoverEnabled === "boolean"
        ? input.handoverEnabled
        : fallback.handoverEnabled,
    autoEscalateAfterFallbacks: Math.round(
      numClamp(input.autoEscalateAfterFallbacks, fallback.autoEscalateAfterFallbacks, 1, 10)
    ),
    restrictedTopics,
    accentColor:
      typeof input.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.accentColor.trim())
        ? input.accentColor.trim()
        : fallback.accentColor,
    notifyOnHandover:
      typeof input.notifyOnHandover === "boolean"
        ? input.notifyOnHandover
        : fallback.notifyOnHandover,
    notifyOnLead:
      typeof input.notifyOnLead === "boolean" ? input.notifyOnLead : fallback.notifyOnLead,
    notifyOnUnanswered:
      typeof input.notifyOnUnanswered === "boolean"
        ? input.notifyOnUnanswered
        : fallback.notifyOnUnanswered,
    retentionDays: Math.round(numClamp(input.retentionDays, fallback.retentionDays, 7, 730)),
    enableFileUploads:
      typeof input.enableFileUploads === "boolean"
        ? input.enableFileUploads
        : fallback.enableFileUploads,
    enableFeedbackRating:
      typeof input.enableFeedbackRating === "boolean"
        ? input.enableFeedbackRating
        : fallback.enableFeedbackRating,
  };
}

export function getPublicChatbotConfig(cfg: ChatbotConfig): PublicChatbotConfig {
  const {
    systemInstructions: _sys,
    restrictedTopics: _res,
    dailyAiCallLimit: _lim,
    ...publicPart
  } = cfg;
  void _sys;
  void _res;
  void _lim;
  return publicPart;
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

export function normalizeKnowledgeMeta(
  faqId: string,
  raw?: Partial<KnowledgeItemMeta> | null,
  fallbackStatus: KnowledgePublicationStatus = "published"
): KnowledgeItemMeta {
  const input = raw || {};
  const listFrom = (val: unknown) =>
    Array.isArray(val)
      ? val.map((x) => String(x || "").trim()).filter(Boolean)
      : typeof val === "string"
        ? val
            .split(/\n|,/)
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

  const validStatus: KnowledgePublicationStatus =
    input.status === "draft" ||
    input.status === "review" ||
    input.status === "approved" ||
    input.status === "published" ||
    input.status === "archived"
      ? input.status
      : fallbackStatus;

  return {
    faqId,
    subcategory: typeof input.subcategory === "string" ? input.subcategory.trim() : "",
    alternativeQuestions: listFrom(input.alternativeQuestions),
    synonyms: listFrom(input.synonyms).map((s) => s.toLowerCase()),
    relatedTopics: listFrom(input.relatedTopics),
    status: validStatus,
    translations: {
      si: input.translations?.si
        ? {
            question: String(input.translations.si.question || "").trim(),
            answer: String(input.translations.si.answer || "").trim(),
          }
        : undefined,
      ta: input.translations?.ta
        ? {
            question: String(input.translations.ta.question || "").trim(),
            answer: String(input.translations.ta.answer || "").trim(),
          }
        : undefined,
    },
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    revisions: Array.isArray(input.revisions) ? input.revisions : [],
    usageCount: Number.isFinite(input.usageCount) ? Number(input.usageCount) : 0,
    helpfulCount: Number.isFinite(input.helpfulCount) ? Number(input.helpfulCount) : 0,
    lastMatchedAt: input.lastMatchedAt,
  };
}

// ============================================================================
// MULTILINGUAL DETECTION, FUZZY NLU, ABBREVIATIONS & SYNONYMS (0 AI CREDITS)
// ============================================================================

const SINGLISH_MARKERS = new Set([
  "kohomada",
  "mokakda",
  "keeyada",
  "kiyatada",
  "ganan",
  "mila",
  "visthara",
  "wisthara",
  "karanna",
  "puluwanda",
  "puluwan",
  "oyala",
  "oyage",
  "koheda",
  "kandy",
  "dora",
  "dorawal",
  "janel",
  "janeela",
  "wathura",
  "udaw",
  "sthoothi",
  "ayubowan",
]);

const TANGLISH_MARKERS = new Set([
  "epdi",
  "eppadi",
  "enna",
  "evvalavu",
  "vilai",
  "mudiyuma",
  "sollunga",
  "kathavu",
  "jannal",
  "enga",
  "irukku",
  "nanri",
  "vanakkam",
  "pannalama",
  "vena",
  "venum",
]);

export function detectChatLanguage(
  text: string,
  preferredLang?: SupportedLanguage
): SupportedLanguage {
  const raw = String(text || "");
  if (/[\u0D80-\u0DFF]/.test(raw)) return "si";
  if (/[\u0B80-\u0BFF]/.test(raw)) return "ta";

  const words = raw
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let siScore = 0;
  let taScore = 0;
  for (const w of words) {
    if (SINGLISH_MARKERS.has(w)) siScore++;
    if (TANGLISH_MARKERS.has(w)) taScore++;
  }
  if (siScore > taScore && siScore >= 1) return "si";
  if (taScore > siScore && taScore >= 1) return "ta";
  if (preferredLang === "si" || preferredLang === "ta" || preferredLang === "en") {
    return preferredLang;
  }
  return "en";
}

const DOMAIN_ABBREVIATIONS: Record<string, string> = {
  alu: "aluminium",
  alum: "aluminium",
  aluminum: "aluminium",
  al: "aluminium",
  ss: "stainless steel",
  ms: "mild steel",
  gi: "galvanized iron",
  dgu: "double glazed glass",
  ig: "insulated glass",
  tgh: "tempered glass",
  temp: "tempered",
  lam: "laminated",
  qt: "quotation",
  qte: "quotation",
  boq: "quotation estimate",
  est: "estimate",
  px: "price",
  pwdr: "powder",
  coat: "coating",
  warr: "warranty",
  gty: "warranty",
  loc: "location",
  addr: "address",
  hrs: "hours",
  hr: "hour",
  appt: "appointment",
  dim: "dimensions",
  dims: "dimensions",
  qty: "quantity",
  msg: "message",
  info: "information",
  spec: "specification",
  specs: "specifications",
  inst: "installation",
  fab: "fabrication",
  sl: "sri lanka",
  cmb: "colombo",
  kdy: "kandy",
  wa: "whatsapp",
  pls: "please",
  plz: "please",
  u: "you",
  ur: "your",
  r: "are",
};

const DOMAIN_SYNONYM_GROUPS: string[][] = [
  ["quote", "quotation", "price", "pricing", "cost", "estimate", "boq", "rate", "rates", "budget"],
  ["visit", "site visit", "measurement", "survey", "inspection", "appointment", "schedule", "slot"],
  ["door", "doors", "sliding", "casement", "bi-fold", "bifold", "entrance"],
  ["window", "windows", "louvre", "louver", "louvers", "casement", "awning"],
  ["glass", "glazing", "tempered", "laminated", "skylight", "balustrade", "partition", "facade"],
  ["aluminium", "aluminum", "profile", "extrusion", "frame"],
  ["steel", "stainless", "iron", "truss", "staircase", "railing", "gate", "mezzanine"],
  ["warranty", "guarantee", "coastal", "rust", "corrosion", "sea", "powder coating", "anodized"],
  ["showroom", "location", "address", "branch", "office", "nawala", "kelaniya", "kandy", "colombo"],
  ["hours", "open", "opening", "time", "timing", "saturday"],
  ["install", "installation", "fitting", "delivery", "turnkey", "islandwide"],
  ["human", "agent", "person", "staff", "specialist", "engineer", "support", "representative"],
  ["complaint", "issue", "problem", "defect", "leak", "broken", "damaged"],
  ["supplier", "vendor", "procurement", "supply"],
];

const DOMAIN_VOCAB: string[] = Array.from(
  new Set([
    ...Object.values(DOMAIN_ABBREVIATIONS).flatMap((v) => v.split(/\s+/)),
    ...DOMAIN_SYNONYM_GROUPS.flat(),
    "innovista",
    "fabriconix",
    "curtain",
    "wall",
    "acoustic",
    "thermal",
    "marine",
    "commercial",
    "residential",
    "consultation",
    "tender",
    "architect",
    "drawing",
    "drawings",
  ])
);

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[b.length];
}

function correctDomainTypo(token: string): string {
  if (token.length < 4) return token;
  if (DOMAIN_VOCAB.includes(token)) return token;
  let best = token;
  let bestDist = token.length >= 7 ? 2 : 1;
  for (const vocabWord of DOMAIN_VOCAB) {
    if (Math.abs(vocabWord.length - token.length) > bestDist) continue;
    const dist = levenshteinDistance(token, vocabWord);
    if (dist <= bestDist) {
      bestDist = dist;
      best = vocabWord;
      if (dist === 1) break;
    }
  }
  return best;
}

export function normalizeAndExpandQuery(text: string): {
  normalizedText: string;
  tokens: string[];
  expandedTokens: string[];
} {
  const cleaned = String(text || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0D80-\u0DFF\u0B80-\u0BFF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return { normalizedText: "", tokens: [], expandedTokens: [] };
  }

  const rawTokens = cleaned.split(/\s+/).filter((w) => w.length >= 2 || /^\d+$/.test(w));
  const tokens: string[] = [];
  for (const rawTok of rawTokens) {
    const abbr = DOMAIN_ABBREVIATIONS[rawTok];
    if (abbr) {
      tokens.push(...abbr.split(/\s+/));
    } else {
      tokens.push(correctDomainTypo(rawTok));
    }
  }

  const expandedSet = new Set<string>(tokens);
  for (const tok of tokens) {
    for (const group of DOMAIN_SYNONYM_GROUPS) {
      if (group.includes(tok)) {
        for (const syn of group) {
          expandedSet.add(syn);
        }
      }
    }
  }

  return {
    normalizedText: tokens.join(" "),
    tokens,
    expandedTokens: Array.from(expandedSet),
  };
}

export function splitMultiQuestions(query: string): string[] {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];
  // Split on explicit question marks, numbered lists, or conjunctions separating clauses
  const byMarks = trimmed
    .split(/(?:\?+|\n+|(?:^|\s)\d+[.)]\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const clauses: string[] = [];
  for (const rawPart of byMarks.length > 0 ? byMarks : [trimmed]) {
    const part = rawPart.replace(/^(?:and\s+also|and|also|plus|&)\s+/i, "").trim();
    if (part.length < 3) continue;
    const sub = part
      .split(/\s+(?:and\s+also|also|plus|&)\s+/i)
      .map((s) => s.replace(/^(?:and|also|plus|&)\s+/i, "").trim())
      .filter((s) => s.length >= 3);
    clauses.push(...(sub.length > 0 ? sub : [part]));
  }
  return Array.from(new Set(clauses)).slice(0, 4);
}

const KB_STOP_WORDS = new Set([
  "what",
  "where",
  "when",
  "which",
  "who",
  "whom",
  "whose",
  "why",
  "how",
  "is",
  "are",
  "was",
  "were",
  "am",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "will",
  "shall",
  "may",
  "might",
  "the",
  "and",
  "or",
  "but",
  "if",
  "in",
  "on",
  "at",
  "to",
  "of",
  "for",
  "from",
  "by",
  "with",
  "about",
  "into",
  "around",
  "over",
  "your",
  "you",
  "our",
  "we",
  "they",
  "their",
  "my",
  "me",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "any",
  "some",
  "all",
  "have",
  "has",
  "had",
  "not",
  "tell",
  "please",
  "pls",
  "plz",
]);

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0D80-\u0DFF\u0B80-\u0BFF\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !KB_STOP_WORDS.has(w));
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

  const { normalizedText, tokens, expandedTokens } = normalizeAndExpandQuery(cleanQuery);
  const queryTokens = Array.from(new Set([...tokenize(cleanQuery), ...tokens]));
  let best: FaqMatchResult | null = null;

  for (const faq of faqs) {
    if (!faq.enabled) continue;
    let score = 0;

    for (const kw of faq.keywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) continue;
      if (cleanQuery.includes(cleanKw) || normalizedText.includes(cleanKw)) {
        score += cleanKw.includes(" ") ? 6 : 4;
      } else if (expandedTokens.includes(cleanKw)) {
        score += 2.2;
      }
    }

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

export interface KnowledgeMatchHit {
  item: KnowledgeItemExtended;
  score: number;
  matchedField: string;
  localizedAnswer: string;
}

export interface DocumentMatchHit {
  doc: KnowledgeDocumentItem;
  snippet: string;
  score: number;
}

export function mergeFaqWithMeta(
  faq: ChatbotFaqItem,
  metaMap: Record<string, KnowledgeItemMeta>
): KnowledgeItemExtended {
  const meta =
    metaMap[faq.id] ||
    DEFAULT_KNOWLEDGE_META[faq.id] ||
    normalizeKnowledgeMeta(faq.id, undefined, "published");
  return {
    ...faq,
    subcategory: meta.subcategory,
    alternativeQuestions: meta.alternativeQuestions,
    synonyms: meta.synonyms,
    relatedTopics: meta.relatedTopics,
    status: meta.status,
    translations: meta.translations,
    attachments: meta.attachments,
    revisions: meta.revisions,
    usageCount: meta.usageCount,
    helpfulCount: meta.helpfulCount,
    lastMatchedAt: meta.lastMatchedAt,
  };
}

export function matchKnowledgeBase(
  query: string,
  items: KnowledgeItemExtended[],
  docs: KnowledgeDocumentItem[] = [],
  options?: {
    onlyPublished?: boolean;
    language?: SupportedLanguage;
    minScore?: number;
  }
): {
  bestKnowledge: KnowledgeMatchHit | null;
  topKnowledge: KnowledgeMatchHit[];
  matchedDocs: DocumentMatchHit[];
} {
  const onlyPublished = options?.onlyPublished !== false;
  const language = options?.language || "en";
  const minScore = options?.minScore ?? 3.2;

  const cleanQuery = String(query || "").trim().toLowerCase();
  if (!cleanQuery) {
    return { bestKnowledge: null, topKnowledge: [], matchedDocs: [] };
  }

  const { normalizedText, tokens, expandedTokens } = normalizeAndExpandQuery(cleanQuery);
  const directTokens = Array.from(new Set([...tokenize(cleanQuery), ...tokens]));
  const hits: KnowledgeMatchHit[] = [];

  for (const item of items) {
    if (!item.enabled) continue;
    if (onlyPublished && item.status !== "published") continue;

    let score = 0;
    let matchedField = "question";

    // Check keywords & synonyms
    const allKeywords = [...item.keywords, ...item.synonyms];
    for (const kw of allKeywords) {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) continue;
      if (cleanKw.includes(" ")) {
        if (cleanQuery.includes(cleanKw) || normalizedText.includes(cleanKw)) {
          score += 6.2;
          matchedField = "keywords";
        }
      } else if (directTokens.includes(cleanKw)) {
        score += 4.2;
        matchedField = "keywords";
      } else if (expandedTokens.includes(cleanKw)) {
        score += 2.3;
        matchedField = "synonyms";
      }
    }

    // Check primary + alternative + translated questions
    const candidateQuestions = [
      item.question,
      ...item.alternativeQuestions,
      item.translations?.si?.question || "",
      item.translations?.ta?.question || "",
    ].filter(Boolean);

    let bestCandScore = 0;
    for (const cand of candidateQuestions) {
      const candLower = cand.toLowerCase();
      if (candLower === cleanQuery || candLower === normalizedText) {
        bestCandScore = Math.max(bestCandScore, 12);
        matchedField = "exact_question";
        break;
      }
      const candTokens = new Set(tokenize(candLower));
      let overlap = 0;
      for (const t of directTokens) {
        if (candTokens.has(t)) overlap++;
      }
      const candScore = overlap * 3.1;
      if (candScore > bestCandScore) {
        bestCandScore = candScore;
        matchedField = "question";
      }
    }
    score += bestCandScore;

    // Check category / subcategory / related topics
    const metaTokens = new Set(
      tokenize(`${item.category} ${item.subcategory} ${item.relatedTopics.join(" ")}`)
    );
    for (const t of directTokens) {
      if (metaTokens.has(t)) score += 1.6;
    }

    // Check answer overlap
    const ansTokens = new Set(
      tokenize(
        `${item.answer} ${item.translations?.si?.answer || ""} ${item.translations?.ta?.answer || ""}`
      )
    );
    for (const t of directTokens) {
      if (ansTokens.has(t)) score += 1.2;
    }

    if (score > 0) {
      score += (item.priority || 5) * 0.12;
      if (score >= minScore) {
        const localized =
          (language === "si" && item.translations?.si?.answer?.trim()) ||
          (language === "ta" && item.translations?.ta?.answer?.trim()) ||
          item.answer;
        hits.push({
          item,
          score,
          matchedField,
          localizedAnswer: localized,
        });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);

  // Search company documents
  const docHits: DocumentMatchHit[] = [];
  for (const doc of docs) {
    if (onlyPublished && doc.status !== "published") continue;
    let docScore = 0;
    const titleLower = doc.title.toLowerCase();
    const docTokens = new Set(
      tokenize(`${doc.title} ${doc.category} ${doc.subcategory} ${doc.summary} ${doc.extractedText}`)
    );
    for (const kw of doc.keywords) {
      const k = kw.toLowerCase().trim();
      if (k && (cleanQuery.includes(k) || normalizedText.includes(k))) {
        docScore += 4;
      }
    }
    for (const t of directTokens) {
      if (titleLower.includes(t)) docScore += 3;
      else if (docTokens.has(t)) docScore += 1.4;
    }
    if (docScore >= 3.2) {
      const snippet = buildDocumentSnippet(doc.extractedText || doc.summary, directTokens);
      docHits.push({ doc, snippet, score: docScore });
    }
  }
  docHits.sort((a, b) => b.score - a.score);

  return {
    bestKnowledge: hits[0] || null,
    topKnowledge: hits.slice(0, 3),
    matchedDocs: docHits.slice(0, 2),
  };
}

function buildDocumentSnippet(text: string, queryTokens: string[]): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= 240) return clean;
  const sentences = clean.split(/(?<=[.!?])\s+/);
  let bestSentence = sentences[0] || clean.slice(0, 220);
  let bestScore = -1;
  for (const s of sentences) {
    const sl = s.toLowerCase();
    let hits = 0;
    for (const tok of queryTokens) {
      if (sl.includes(tok)) hits++;
    }
    if (hits > bestScore) {
      bestScore = hits;
      bestSentence = s;
    }
  }
  return bestSentence.slice(0, 260);
}

// ============================================================================
// INTENT DETECTION (16 INTENTS + LEGACY BACKWARD-COMPATIBLE MAP)
// ============================================================================

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

export function detectRichChatIntent(query: string): RichChatIntent {
  const { normalizedText } = normalizeAndExpandQuery(query);
  const q = `${query.toLowerCase()} ${normalizedText}`;

  if (/(whatsapp|wa\.me)/.test(q)) return "whatsapp";
  if (/(sms|text message|send sms)/.test(q)) return "sms";
  if (/(human|agent|representative|live support|talk to someone|speak to staff|real person|operator)/.test(q)) {
    return "human_assistance";
  }
  if (/(complaint|issue|problem|defect|leak|broken|damaged|not working|unhappy|warranty claim)/.test(q)) {
    return "customer_complaint";
  }
  if (/(supplier|vendor|procurement|supply materials|register as supplier)/.test(q)) {
    return "supplier_registration";
  }
  if (/(site visit|book.*visit|visit slot|measurement|appointment|schedule visit)/.test(q)) {
    return "site_visit";
  }
  if (/(consultation|consult|advise|showroom meeting|architectural meeting)/.test(q)) {
    return "consultation_request";
  }
  if (/\b(quotation|quote|boq|estimate|pricing|price|cost|how much|rate|rates|ganan|mila|vilai)\b/.test(q)) {
    return "quotation_request";
  }
  if (/\b(tender|project inquiry|contractor package|multi unit|apartment project|villa project)\b/.test(q)) {
    return "project_inquiry";
  }
  if (/\b(technical|specification|wind load|u value|acoustic|thickness|alloy|cad|shop drawing)\b/.test(q)) {
    return "technical_inquiry";
  }
  if (/\b(steel|stainless|mild steel|railing|staircase|truss|mezzanine|gate)\b/.test(q)) {
    return "steel_fabrication";
  }
  if (/(glass|glazing|tempered|laminated|balustrade|shower|skylight|curtain wall|double glazed)/.test(q)) {
    return "glass_solutions";
  }
  if (/(aluminium|aluminum|sliding door|casement|louver|partition|extrusion)/.test(q)) {
    return "aluminium_fabrication";
  }
  if (/(construction|building|renovation|turnkey|contractor)/.test(q)) {
    return "construction_inquiry";
  }
  if (/(what do you do|services|solutions|capabilities|products|catalog|help me choose)/.test(q)) {
    return "service_discovery";
  }
  return "general_inquiry";
}

// ============================================================================
// ENTITY EXTRACTION & PROGRESSIVE LEAD COLLECTION (NEVER RE-ASK KNOWN FIELDS)
// ============================================================================

export function extractLeadEntitiesFromText(
  text: string,
  existing: LeadDataFields = {}
): LeadDataFields {
  const next: LeadDataFields = { ...existing };
  const raw = String(text || "").trim();
  if (!raw) return next;

  // Email
  const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch && !next.email) {
    next.email = emailMatch[0].toLowerCase();
  }

  // Phone number (Sri Lanka +94 or local 07x / international)
  const phoneMatch = raw.match(/(?:\+?\d[\d\s-]{7,14}\d)/);
  if (phoneMatch && !next.contactNumber) {
    const digits = phoneMatch[0].replace(/[^\d+]/g, "");
    if (digits.replace(/[^\d]/g, "").length >= 9) {
      next.contactNumber = digits;
    }
  }

  // Dimensions (e.g. 10ft x 8ft, 3000x2400mm, 1200 mm x 2100 mm, 250 sqft)
  const dimMatch = raw.match(
    /\b\d+(?:\.\d+)?\s*(?:mm|cm|m|ft|feet|in|inch|inches)?\s*[x×*]\s*\d+(?:\.\d+)?\s*(?:mm|cm|m|ft|feet|in|inch|inches)?\b|\b\d+(?:\.\d+)?\s*(?:sq\.?\s*ft|sqft|sqm|m2)\b/i
  );
  if (dimMatch && !next.dimensions) {
    next.dimensions = dimMatch[0].trim();
  }

  // Approximate quantity
  const qtyMatch = raw.match(/\b(\d{1,5})\s*(?:nos|units|doors|windows|panels|sets|pcs|pieces)\b/i);
  if (qtyMatch && !next.approximateQuantity) {
    next.approximateQuantity = qtyMatch[0].trim();
  }

  // Known Sri Lankan locations
  const locMatch = raw.match(
    /\b(colombo(?:\s*\d{1,2})?|nawala|kelaniya|kandy|galle|negombo|gampaha|kurunegala|matara|maharagama|dehiwala|nugegoda|rajagiriya|battaramulla|malabe|kottawa|jaffna|trincomalee|kalutara|panadura|ratnapura|anuradhapura|badulla)\b/i
  );
  if (locMatch && !next.projectLocation) {
    next.projectLocation = locMatch[0].trim();
  }

  // Name intro ("I am X", "My name is X")
  const nameMatch = raw.match(/(?:my name is|i am|this is)\s+([A-Za-z][A-Za-z\s]{1,35})/i);
  if (nameMatch && !next.name) {
    next.name = nameMatch[1].trim().split(/\s+(?:from|at|in|and)\b/i)[0].trim();
  }

  // Required service detection
  if (!next.requiredService) {
    if (/sliding door|casement|aluminium|aluminum|louver|partition/i.test(raw)) {
      next.requiredService = "Aluminium Fabrication";
    } else if (/curtain wall|glass|balustrade|skylight|shower/i.test(raw)) {
      next.requiredService = "Glass Solutions";
    } else if (/steel|railing|staircase|truss|gate/i.test(raw)) {
      next.requiredService = "Steel Fabrication";
    }
  }

  return next;
}

export function validateWorkflowStepInput(
  step: WorkflowStep,
  value: string
): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    if (!step.required) return { valid: true, cleaned: "" };
    return { valid: false, cleaned: "", error: "Please provide a response to continue." };
  }
  if (step.inputType === "email") {
    const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (!emailMatch) {
      return {
        valid: false,
        cleaned: trimmed,
        error: step.validationMessage || "Please enter a valid email address.",
      };
    }
    return { valid: true, cleaned: emailMatch[0].toLowerCase() };
  }
  if (step.inputType === "phone") {
    const digits = trimmed.replace(/[^\d]/g, "");
    if (digits.length < 7 || digits.length > 15) {
      return {
        valid: false,
        cleaned: trimmed,
        error: step.validationMessage || "Please enter a valid phone number (7–15 digits).",
      };
    }
    return { valid: true, cleaned: trimmed };
  }
  if (step.inputType === "number") {
    if (!/\d/.test(trimmed)) {
      return {
        valid: false,
        cleaned: trimmed,
        error: step.validationMessage || "Please enter a numeric value.",
      };
    }
  }
  return { valid: true, cleaned: trimmed };
}

export function findNextUnfilledStepIndex(
  workflow: ChatbotWorkflow,
  startIndex: number,
  collected: LeadDataFields
): number {
  for (let i = startIndex; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    if (step.skipIfCollected && step.fieldKey !== "custom_note") {
      const existingVal = collected[step.fieldKey];
      if (typeof existingVal === "string" && existingVal.trim().length > 0) {
        continue;
      }
    }
    return i;
  }
  return -1;
}

export function getStepPromptForLanguage(
  step: WorkflowStep,
  lang: SupportedLanguage
): string {
  if (lang === "si" && step.localizedPrompts?.si?.trim()) {
    return step.localizedPrompts.si.trim();
  }
  if (lang === "ta" && step.localizedPrompts?.ta?.trim()) {
    return step.localizedPrompts.ta.trim();
  }
  return step.prompt;
}

// ============================================================================
// SECURITY, PROMPT INJECTION & RESTRICTED DATA GUARDS
// ============================================================================

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /disregard\s+(?:all\s+)?(?:previous|system)\s+(?:instructions?|rules?)/i,
  /reveal\s+(?:your\s+)?(?:system\s+prompt|instructions|api\s*key|secret|password|env)/i,
  /show\s+(?:me\s+)?(?:system\s+prompt|all\s+customers|other\s+customers|database|admin\s+password)/i,
  /\b(?:jailbreak|dan\s+mode|developer\s+mode|bypass\s+restrictions?)\b/i,
  /<\s*script\b|javascript:|onerror\s*=|onload\s*=/i,
  /\b(?:union\s+select|drop\s+table|insert\s+into|delete\s+from)\b/i,
];

export function detectPromptInjection(text: string): boolean {
  const s = String(text || "");
  return PROMPT_INJECTION_PATTERNS.some((re) => re.test(s));
}

export function containsRestrictedTopic(
  text: string,
  restrictedTopics: string[] = []
): string | null {
  const lower = String(text || "").toLowerCase();
  for (const topic of restrictedTopics) {
    const clean = topic.trim().toLowerCase();
    if (clean && lower.includes(clean)) {
      return clean;
    }
  }
  return null;
}

export function sanitizeUserChatInput(text: string, maxLen = 1500): string {
  const withoutControls = Array.from(String(text || ""))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("");
  return withoutControls
    .replace(/<\s*\/?\s*script[^>]*>/gi, "")
    .trim()
    .slice(0, maxLen);
}

// ============================================================================
// CONTACT URLS, 3D CURSOR MATH & TIMESTAMPS (EXISTING EXPORTS PRESERVED)
// ============================================================================

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
