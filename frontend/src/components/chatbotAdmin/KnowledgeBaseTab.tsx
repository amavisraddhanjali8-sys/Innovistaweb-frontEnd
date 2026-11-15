import { useMemo, useState, type FormEvent } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import type {
  KnowledgePublicationStatus,
  SupportedLanguage,
} from "../../../../shared/chatbotHelpers";
import type { ExtendedFaq, KnowledgeDocumentItem } from "./types";

interface KnowledgeBaseTabProps {
  faqs: ExtendedFaq[];
  documents: KnowledgeDocumentItem[];
  onFaqsChange: (faqs: ExtendedFaq[]) => void;
  onDocumentsChange: (docs: KnowledgeDocumentItem[]) => void;
  onNotify: (msg: string) => void;
}

const STATUS_BADGES: Record<KnowledgePublicationStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-sky-50 text-[#22577A] border-sky-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-red-50 text-[#E60000] border-red-200",
};

export default function KnowledgeBaseTab({
  faqs,
  documents,
  onFaqsChange,
  onDocumentsChange,
  onNotify,
}: KnowledgeBaseTabProps) {
  const [subView, setSubView] = useState<"entries" | "documents" | "preview">("entries");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Add / Edit KB Entry Form State
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("Products");
  const [subcategory, setSubcategory] = useState("");
  const [altQuestionsText, setAltQuestionsText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [synonymsText, setSynonymsText] = useState("");
  const [relatedTopicsText, setRelatedTopicsText] = useState("");
  const [priority, setPriority] = useState(8);
  const [status, setStatus] = useState<KnowledgePublicationStatus>("published");
  const [siQuestion, setSiQuestion] = useState("");
  const [siAnswer, setSiAnswer] = useState("");
  const [taQuestion, setTaQuestion] = useState("");
  const [taAnswer, setTaAnswer] = useState("");
  const [showTranslations, setShowTranslations] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);

  // Company Document Upload State
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Technical Catalogue");
  const [docSubcategory, setDocSubcategory] = useState("");
  const [docLanguage, setDocLanguage] = useState<SupportedLanguage | "all">("all");
  const [docStatus, setDocStatus] = useState<KnowledgePublicationStatus>("published");
  const [docSummary, setDocSummary] = useState("");
  const [docExtractedText, setDocExtractedText] = useState("");
  const [docKeywords, setDocKeywords] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExternalUrl, setDocExternalUrl] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Live Retrieval Preview State
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewLang, setPreviewLang] = useState<SupportedLanguage>("en");
  const [previewIncludeDrafts, setPreviewIncludeDrafts] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    normalizedTokens: string[];
    expandedTokens: string[];
    bestKnowledge?: {
      score: number;
      matchedTerms: string[];
      localizedAnswer: string;
      item: ExtendedFaq;
    } | null;
    candidates?: Array<{
      score: number;
      matchedTerms: string[];
      item: ExtendedFaq;
    }>;
    matchedDocs?: Array<{
      score: number;
      snippet: string;
      doc: KnowledgeDocumentItem;
    }>;
  } | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))).sort(),
    [faqs]
  );

  const filteredFaqs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return faqs.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!q) return true;
      return `${item.question} ${item.answer} ${item.category} ${item.subcategory} ${item.keywords.join(" ")} ${item.synonyms.join(" ")} ${item.alternativeQuestions.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [faqs, searchFilter, statusFilter, categoryFilter]);

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setQuestion("");
    setAnswer("");
    setCategory("Products");
    setSubcategory("");
    setAltQuestionsText("");
    setKeywordsText("");
    setSynonymsText("");
    setRelatedTopicsText("");
    setPriority(8);
    setStatus("published");
    setSiQuestion("");
    setSiAnswer("");
    setTaQuestion("");
    setTaAnswer("");
  };

  const handleSaveFaq = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSavingFaq(true);
    try {
      const translations: ExtendedFaq["translations"] = {};
      if (siQuestion.trim() || siAnswer.trim()) {
        translations.si = { question: siQuestion.trim(), answer: siAnswer.trim() };
      }
      if (taQuestion.trim() || taAnswer.trim()) {
        translations.ta = { question: taQuestion.trim(), answer: taAnswer.trim() };
      }
      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || "General",
        subcategory: subcategory.trim(),
        alternativeQuestions: altQuestionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        keywords: keywordsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        synonyms: synonymsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        relatedTopics: relatedTopicsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        priority: Number(priority) || 5,
        status,
        enabled: status === "published" || status === "approved",
        translations,
      };
      if (editingFaqId) {
        const res = await AxiosConfig.put<{ faqs: ExtendedFaq[] }>(
          `/api/chatbot/faqs/${editingFaqId}`,
          payload
        );
        onFaqsChange(res.data.faqs || []);
        onNotify("Knowledge base entry updated & revision logged.");
      } else {
        const res = await AxiosConfig.post<{ faqs: ExtendedFaq[] }>(
          "/api/chatbot/faqs",
          payload
        );
        onFaqsChange(res.data.faqs || []);
        onNotify("New knowledge base entry saved.");
      }
      resetFaqForm();
    } finally {
      setSavingFaq(false);
    }
  };

  const handleEditFaq = (item: ExtendedFaq) => {
    setSubView("entries");
    setEditingFaqId(item.id);
    setQuestion(item.question);
    setAnswer(item.answer);
    setCategory(item.category);
    setSubcategory(item.subcategory || "");
    setAltQuestionsText((item.alternativeQuestions || []).join("\n"));
    setKeywordsText((item.keywords || []).join(", "));
    setSynonymsText((item.synonyms || []).join(", "));
    setRelatedTopicsText((item.relatedTopics || []).join(", "));
    setPriority(item.priority || 8);
    setStatus(item.status || "published");
    setSiQuestion(item.translations?.si?.question || "");
    setSiAnswer(item.translations?.si?.answer || "");
    setTaQuestion(item.translations?.ta?.question || "");
    setTaAnswer(item.translations?.ta?.answer || "");
    if (item.translations?.si || item.translations?.ta) {
      setShowTranslations(true);
    }
  };

  const handleChangeStatus = async (
    item: ExtendedFaq,
    nextStatus: KnowledgePublicationStatus
  ) => {
    const res = await AxiosConfig.put<{ faqs: ExtendedFaq[] }>(
      `/api/chatbot/faqs/${item.id}`,
      {
        status: nextStatus,
        enabled: nextStatus === "published" || nextStatus === "approved",
        revisionSummary: `Status changed to ${nextStatus}`,
      }
    );
    onFaqsChange(res.data.faqs || []);
    onNotify(`KB entry marked ${nextStatus}.`);
  };

  const handleDeleteFaq = async (id: string) => {
    const res = await AxiosConfig.delete<{ faqs: ExtendedFaq[] }>(
      `/api/chatbot/faqs/${id}`
    );
    onFaqsChange(res.data.faqs || []);
    onNotify("Knowledge base entry removed.");
  };

  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || (!docFile && !docExternalUrl.trim())) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("title", docTitle.trim());
      formData.append("category", docCategory.trim() || "Technical Catalogue");
      formData.append("subcategory", docSubcategory.trim());
      formData.append("language", docLanguage);
      formData.append("status", docStatus);
      formData.append("summary", docSummary.trim());
      formData.append("extractedText", docExtractedText.trim());
      formData.append("keywords", docKeywords.trim());
      if (docFile) {
        formData.append("file", docFile);
      } else {
        formData.append("fileUrl", docExternalUrl.trim());
        formData.append("fileName", docTitle.trim());
      }
      const res = await AxiosConfig.post<{ documents: KnowledgeDocumentItem[] }>(
        "/api/chatbot/kb/documents",
        formData
      );
      onDocumentsChange(res.data.documents || []);
      setDocTitle("");
      setDocSubcategory("");
      setDocSummary("");
      setDocExtractedText("");
      setDocKeywords("");
      setDocFile(null);
      setDocExternalUrl("");
      onNotify("Company document added to knowledge base.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleToggleDocStatus = async (doc: KnowledgeDocumentItem) => {
    const nextStatus: KnowledgePublicationStatus =
      doc.status === "published" ? "draft" : "published";
    const res = await AxiosConfig.put<{ documents: KnowledgeDocumentItem[] }>(
      `/api/chatbot/kb/documents/${doc.id}`,
      { status: nextStatus }
    );
    onDocumentsChange(res.data.documents || []);
    onNotify(`Document "${doc.title}" marked ${nextStatus}.`);
  };

  const handleDeleteDoc = async (id: string) => {
    const res = await AxiosConfig.delete<{ documents: KnowledgeDocumentItem[] }>(
      `/api/chatbot/kb/documents/${id}`
    );
    onDocumentsChange(res.data.documents || []);
    onNotify("Company document deleted.");
  };

  const handleRunPreview = async (e: FormEvent) => {
    e.preventDefault();
    if (!previewQuery.trim()) return;
    setPreviewLoading(true);
    try {
      const res = await AxiosConfig.post("/api/chatbot/kb/preview", {
        query: previewQuery.trim(),
        language: previewLang,
        includeUnpublished: previewIncludeDrafts,
      });
      setPreviewResult(res.data);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "entries", label: `Q&A Knowledge (${faqs.length})` },
            { id: "documents", label: `Company Docs & PDFs (${documents.length})` },
            { id: "preview", label: "AI Retrieval Preview" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubView(item.id as "entries" | "documents" | "preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-colors ${
                subView === item.id
                  ? "bg-[#22577A] border-[#22577A] text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-[#22577A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-slate-500">
          Public customers only receive <strong className="text-emerald-700">Published</strong> entries.
        </div>
      </div>

      {/* VIEW 1: ENTRIES */}
      {subView === "entries" && (
        <div className="space-y-5">
          <form
            onSubmit={handleSaveFaq}
            className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
                {editingFaqId ? "Edit Knowledge Entry" : "Add Verified Knowledge Entry"}
              </div>
              <button
                type="button"
                onClick={() => setShowTranslations((v) => !v)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#22577A] cursor-pointer"
              >
                {showTranslations ? "Hide SI / TA Translations" : "+ Sinhala & Tamil Versions"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Primary Question (EN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is delivery lead time for custom sliding doors?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Products, Quotation"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sliding Systems"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Verified Answer (EN)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Write the exact approved response..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm resize-y"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Alternative Phrasings (one per line)
                </label>
                <textarea
                  rows={2}
                  placeholder={"How long does fabrication take?\nDelivery duration for aluminium windows?"}
                  value={altQuestionsText}
                  onChange={(e) => setAltQuestionsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs resize-y"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="lead time, delivery, weeks"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                    Synonyms & Abbreviations
                  </label>
                  <input
                    type="text"
                    placeholder="eta, turnaround, duration"
                    value={synonymsText}
                    onChange={(e) => setSynonymsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                    Related Topics (follow-ups)
                  </label>
                  <input
                    type="text"
                    placeholder="Site Visit, Quotation"
                    value={relatedTopicsText}
                    onChange={(e) => setRelatedTopicsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                      Priority (1-10)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value) || 5)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as KnowledgePublicationStatus)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                    >
                      <option value="published">Published</option>
                      <option value="approved">Approved</option>
                      <option value="review">In Review</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {showTranslations && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#22577A]">Sinhala (සිංහල) Version</div>
                  <input
                    type="text"
                    placeholder="Sinhala question..."
                    value={siQuestion}
                    onChange={(e) => setSiQuestion(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <textarea
                    rows={2}
                    placeholder="Sinhala verified answer..."
                    value={siAnswer}
                    onChange={(e) => setSiAnswer(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-[#22577A]">Tamil (தமிழ்) Version</div>
                  <input
                    type="text"
                    placeholder="Tamil question..."
                    value={taQuestion}
                    onChange={(e) => setTaQuestion(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                  <textarea
                    rows={2}
                    placeholder="Tamil verified answer..."
                    value={taAnswer}
                    onChange={(e) => setTaAnswer(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              {editingFaqId && (
                <button
                  type="button"
                  onClick={resetFaqForm}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={savingFaq}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0"
              >
                <FiPlus />
                <span>{savingFaq ? "Saving..." : editingFaqId ? "Update Entry" : "Save Entry"}</span>
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search questions, synonyms, keywords..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="approved">Approved</option>
              <option value="review">In Review</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Entries List */}
          <div className="space-y-2.5">
            {filteredFaqs.map((item) => {
              const showRevs = expandedHistoryId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#22577A] text-[10px] font-bold uppercase">
                          {item.category}
                          {item.subcategory ? ` · ${item.subcategory}` : ""}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
                            STATUS_BADGES[item.status] || STATUS_BADGES.published
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                          Priority {item.priority} · Hits {item.usageCount || 0}
                        </span>
                        {(item.translations?.si?.answer || item.translations?.ta?.answer) && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {[
                              "EN",
                              item.translations?.si?.answer ? "SI" : "",
                              item.translations?.ta?.answer ? "TA" : "",
                            ]
                              .filter(Boolean)
                              .join("/")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-[#14171A]">{item.question}</div>
                      <p className="text-xs text-slate-600 m-0 leading-relaxed">{item.answer}</p>
                      {item.alternativeQuestions?.length > 0 && (
                        <div className="text-[11px] text-slate-500">
                          <strong>Alt phrasings:</strong> {item.alternativeQuestions.join(" | ")}
                        </div>
                      )}
                      {(item.keywords?.length > 0 || item.synonyms?.length > 0) && (
                        <div className="text-[11px] text-slate-400">
                          Keywords: {item.keywords.join(", ")}
                          {item.synonyms?.length > 0
                            ? ` · Synonyms: ${item.synonyms.join(", ")}`
                            : ""}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {item.status !== "published" && (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(item, "published")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold border-0 cursor-pointer"
                        >
                          <FiCheckCircle className="text-xs" />
                          <span>Publish</span>
                        </button>
                      )}
                      {item.status === "published" && (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(item, "draft")}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 cursor-pointer"
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(showRevs ? null : item.id)}
                        title="Revision history"
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 cursor-pointer"
                      >
                        <FiClock className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditFaq(item)}
                        aria-label={`Edit ${item.question}`}
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 cursor-pointer"
                      >
                        <FiEdit2 className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(item.id)}
                        aria-label={`Delete ${item.question}`}
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-slate-600 hover:text-[#E60000] cursor-pointer"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  </div>

                  {showRevs && item.revisions?.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 space-y-1.5">
                      <div className="text-[10.5px] font-bold text-slate-500 uppercase">
                        Revision History ({item.revisions.length})
                      </div>
                      {item.revisions.slice(0, 6).map((rev) => (
                        <div
                          key={`${rev.version}-${rev.editedAt}`}
                          className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 border-b border-slate-200/60 pb-1 last:border-0"
                        >
                          <span>
                            <strong>v{rev.version}</strong> ({rev.status}) — {rev.summary}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            {rev.editedBy} · {new Date(rev.editedAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: COMPANY DOCUMENTS & PDFs */}
      {subView === "documents" && (
        <div className="space-y-5">
          <form
            onSubmit={handleUploadDocument}
            className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-3"
          >
            <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
              Upload Company Catalogue, PDF or Technical Sheet
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Document title (e.g. Slim Sliding Series Spec Sheet)"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Category (e.g. Technical Catalogue)"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
              <input
                type="text"
                placeholder="Subcategory (optional)"
                value={docSubcategory}
                onChange={(e) => setDocSubcategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={docLanguage}
                onChange={(e) => setDocLanguage(e.target.value as SupportedLanguage | "all")}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="all">All Languages</option>
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
              <select
                value={docStatus}
                onChange={(e) => setDocStatus(e.target.value as KnowledgePublicationStatus)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="published">Published (Live in AI & Search)</option>
                <option value="draft">Draft (Hidden from Public)</option>
              </select>
              <input
                type="text"
                placeholder="Keywords (comma-separated)"
                value={docKeywords}
                onChange={(e) => setDocKeywords(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Upload File (PDF, DOCX, TXT, CSV, Images)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.csv,.md,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Or External Catalogue URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={docExternalUrl}
                  onChange={(e) => setDocExternalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Short summary for customers & AI..."
              value={docSummary}
              onChange={(e) => setDocSummary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs resize-none"
            />
            <textarea
              rows={3}
              placeholder="Paste key technical facts / excerpt from the PDF so AI retrieves exact snippets without extra token cost..."
              value={docExtractedText}
              onChange={(e) => setDocExtractedText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs resize-y"
            />

            <button
              type="submit"
              disabled={uploadingDoc}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold border-0 cursor-pointer"
            >
              <FiUpload />
              <span>{uploadingDoc ? "Uploading..." : "Save Document"}</span>
            </button>
          </form>

          <div className="space-y-2.5">
            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No technical documents or PDFs uploaded yet.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FiFileText className="text-[#22577A]" />
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-[#14171A] hover:text-[#22577A] no-underline"
                      >
                        {doc.title}
                      </a>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
                          STATUS_BADGES[doc.status] || STATUS_BADGES.published
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {doc.category} · {doc.language.toUpperCase()}
                      </span>
                    </div>
                    {doc.summary && <p className="text-xs text-slate-600 m-0">{doc.summary}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleDocStatus(doc)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      {doc.status === "published" ? "Move to Draft" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-slate-600 hover:text-[#E60000] cursor-pointer"
                    >
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: AI RETRIEVAL PREVIEW */}
      {subView === "preview" && (
        <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
          <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
            Preview How INNOASSIST Retrieves Knowledge (Fuzzy + Synonyms + Multilingual)
          </div>
          <form onSubmit={handleRunPreview} className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              required
              placeholder="Test phrasing, typos or synonyms (e.g. 'alumnum sliding dor sea beach rust warranty?')"
              value={previewQuery}
              onChange={(e) => setPreviewQuery(e.target.value)}
              className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
            />
            <select
              value={previewLang}
              onChange={(e) => setPreviewLang(e.target.value as SupportedLanguage)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
            >
              <option value="en">EN</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={previewIncludeDrafts}
                onChange={(e) => setPreviewIncludeDrafts(e.target.checked)}
              />
              <span>Include Drafts</span>
            </label>
            <button
              type="submit"
              disabled={previewLoading}
              className="px-4 py-2 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer"
            >
              {previewLoading ? "Testing..." : "Run Preview"}
            </button>
          </form>

          {previewResult && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-1">
                <div>
                  <strong>Normalized tokens:</strong>{" "}
                  {previewResult.normalizedTokens.join(", ") || "—"}
                </div>
                <div>
                  <strong>Expanded synonyms:</strong>{" "}
                  {previewResult.expandedTokens.join(", ") || "—"}
                </div>
              </div>

              {previewResult.bestKnowledge ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-800">
                      Top Match (Score {previewResult.bestKnowledge.score})
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Matched: {previewResult.bestKnowledge.matchedTerms.join(", ")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#14171A]">
                    {previewResult.bestKnowledge.item.question}
                  </div>
                  <div className="text-xs text-slate-700">
                    {previewResult.bestKnowledge.localizedAnswer}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  No local KB match exceeded threshold — INNOASSIST would route to Workflow, Catalog, Cache, Gemini AI, or Unanswered Queue.
                </div>
              )}

              {previewResult.candidates && previewResult.candidates.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Ranked Candidates
                  </div>
                  {previewResult.candidates.map((c) => (
                    <div
                      key={c.item.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="truncate font-semibold">{c.item.question}</span>
                      <span className="text-slate-500 tabular-nums shrink-0">
                        Score {c.score} ({c.item.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
