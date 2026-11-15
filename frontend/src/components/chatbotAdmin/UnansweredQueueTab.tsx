import { useState, type FormEvent } from "react";
import { FiCheckCircle, FiHelpCircle, FiTrash2, FiX } from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import type { KnowledgePublicationStatus } from "../../../../shared/chatbotHelpers";
import type { ExtendedFaq, UnansweredQuestionRecord } from "./types";

interface UnansweredQueueTabProps {
  unanswered: UnansweredQuestionRecord[];
  onUnansweredChange: (next: UnansweredQuestionRecord[]) => void;
  onFaqsChange: (next: ExtendedFaq[]) => void;
  onNotify: (msg: string) => void;
}

export default function UnansweredQueueTab({
  unanswered,
  onUnansweredChange,
  onFaqsChange,
  onNotify,
}: UnansweredQueueTabProps) {
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "CONVERTED" | "DISMISSED" | "ALL">(
    "PENDING"
  );
  const [convertingItem, setConvertingItem] = useState<UnansweredQuestionRecord | null>(null);
  const [convQuestion, setConvQuestion] = useState("");
  const [convAnswer, setConvAnswer] = useState("");
  const [convCategory, setConvCategory] = useState("Products");
  const [convSubcategory, setConvSubcategory] = useState("");
  const [convKeywords, setConvKeywords] = useState("");
  const [convSynonyms, setConvSynonyms] = useState("");
  const [convStatus, setConvStatus] = useState<KnowledgePublicationStatus>("published");
  const [submitting, setSubmitting] = useState(false);

  const filtered = unanswered.filter((u) =>
    statusFilter === "ALL" ? true : u.status === statusFilter
  );

  const openConvertModal = (item: UnansweredQuestionRecord) => {
    setConvertingItem(item);
    setConvQuestion(item.question);
    setConvAnswer("");
    setConvCategory(item.suggestedCategory || "General");
    setConvSubcategory("");
    setConvKeywords("");
    setConvSynonyms("");
    setConvStatus("published");
  };

  const handleConvertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!convertingItem || !convQuestion.trim() || !convAnswer.trim()) return;
    setSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        unanswered: UnansweredQuestionRecord[];
        faqs: ExtendedFaq[];
      }>(`/api/chatbot/unanswered/${encodeURIComponent(convertingItem.id)}/convert`, {
        question: convQuestion.trim(),
        answer: convAnswer.trim(),
        category: convCategory.trim() || "General",
        subcategory: convSubcategory.trim(),
        keywords: convKeywords,
        synonyms: convSynonyms,
        status: convStatus,
      });
      if (res.data?.unanswered) onUnansweredChange(res.data.unanswered);
      if (res.data?.faqs) onFaqsChange(res.data.faqs);
      setConvertingItem(null);
      onNotify(`Converted unanswered question to Knowledge Base (${convStatus}).`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismissOrDelete = async (id: string, mode: "dismiss" | "delete") => {
    const res = await AxiosConfig.delete<{ unanswered: UnansweredQuestionRecord[] }>(
      `/api/chatbot/unanswered/${encodeURIComponent(id)}?mode=${mode}`
    );
    if (res.data?.unanswered) onUnansweredChange(res.data.unanswered);
    onNotify(mode === "dismiss" ? "Question dismissed." : "Question deleted.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["PENDING", "CONVERTED", "DISMISSED", "ALL"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                statusFilter === st
                  ? "bg-[#22577A] border-[#22577A] text-white"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {st} (
              {st === "ALL"
                ? unanswered.length
                : unanswered.filter((u) => u.status === st).length}
              )
            </button>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-slate-500">
          Sorted by repeat frequency. AI never auto-publishes without admin approval.
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
          No unanswered customer questions in this queue.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FiHelpCircle className="text-amber-600" />
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold tabular-nums">
                    Asked {item.occurrenceCount}x
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-[#22577A] text-[10px] font-bold uppercase">
                    {item.language} · {item.suggestedCategory}
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Reason: {item.reason} · Session: {item.sessionId}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#14171A]">{item.question}</div>
                <div className="text-[11px] text-slate-400 tabular-nums">
                  First seen: {new Date(item.firstSeenAt).toLocaleString()} · Last:{" "}
                  {new Date(item.lastSeenAt).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {item.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openConvertModal(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold border-0 cursor-pointer"
                    >
                      <FiCheckCircle />
                      <span>Approve &amp; Add to KB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissOrDelete(item.id, "dismiss")}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleDismissOrDelete(item.id, "delete")}
                  aria-label={`Delete ${item.question}`}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-slate-600 hover:text-[#E60000] cursor-pointer"
                >
                  <FiTrash2 className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert to Approved KB Modal */}
      {convertingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleConvertSubmit}
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="text-sm font-bold text-[#14171A]">
                Review &amp; Approve Knowledge Entry
              </div>
              <button
                type="button"
                onClick={() => setConvertingItem(null)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Approved Question
              </label>
              <input
                type="text"
                required
                value={convQuestion}
                onChange={(e) => setConvQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Verified Admin Answer
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write the verified answer..."
                value={convAnswer}
                onChange={(e) => setConvAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Category"
                value={convCategory}
                onChange={(e) => setConvCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Subcategory"
                value={convSubcategory}
                onChange={(e) => setConvSubcategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <select
                value={convStatus}
                onChange={(e) => setConvStatus(e.target.value as KnowledgePublicationStatus)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                <option value="published">Publish Now</option>
                <option value="approved">Approved</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Keywords (comma-separated)"
                value={convKeywords}
                onChange={(e) => setConvKeywords(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Synonyms (comma-separated)"
                value={convSynonyms}
                onChange={(e) => setConvSynonyms(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertingItem(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold border-0 cursor-pointer"
              >
                {submitting ? "Saving..." : "Confirm & Save to KB"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
