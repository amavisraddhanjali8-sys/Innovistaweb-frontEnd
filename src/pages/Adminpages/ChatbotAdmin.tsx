import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FiCalendar,
  FiCheck,
  FiEdit2,
  FiMessageCircle,
  FiPlus,
  FiSave,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import {
  DEFAULT_CHATBOT_CONFIG,
  type ChatbotConfig,
  type ChatbotFaqItem,
} from "../../utils/chatbotHelpers";
import {
  computeAvailableSlotsForDate,
  getUpcomingSiteVisitDates,
  type SiteVisitBooking,
  type SiteVisitStatus,
  type SlotAvailabilityItem,
} from "../../utils/siteVisitSchedulerHelpers";

export default function ChatbotAdmin() {
  const [activeTab, setActiveTab] = useState<"setup" | "faqs" | "visits">("faqs");
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [faqs, setFaqs] = useState<ChatbotFaqItem[]>([]);
  const [bookings, setBookings] = useState<SiteVisitBooking[]>([]);
  const [blockedKeys, setBlockedKeys] = useState<string[]>([]);
  const [quickPromptsText, setQuickPromptsText] = useState(
    DEFAULT_CHATBOT_CONFIG.quickPrompts.join(", ")
  );

  const [savingConfig, setSavingConfig] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  // Add / Edit FAQ State
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("Products");
  const [faqKeywords, setFaqKeywords] = useState("");
  const [faqPriority, setFaqPriority] = useState(8);
  const [savingFaq, setSavingFaq] = useState(false);

  // Live Chatbot Test Preview
  const [testInput, setTestInput] = useState("");
  const [testReply, setTestReply] = useState("");
  const [testWhatsappUrl, setTestWhatsappUrl] = useState("");
  const [testingChat, setTestingChat] = useState(false);

  // Site Visit Slot Management
  const upcomingDates = getUpcomingSiteVisitDates(7);
  const [slotDate, setSlotDate] = useState(upcomingDates[0]?.date || "");
  const [dateSlots, setDateSlots] = useState<SlotAvailabilityItem[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [botRes, visitsRes] = await Promise.all([
        AxiosConfig.get<{ config: ChatbotConfig; faqs: ChatbotFaqItem[] }>(
          "/api/chatbot/config"
        ),
        AxiosConfig.get<{ data: SiteVisitBooking[]; blockedKeys: string[] }>(
          "/api/site-visits"
        ),
      ]);
      if (botRes.data?.config) {
        setConfig(botRes.data.config);
        setQuickPromptsText(botRes.data.config.quickPrompts.join(", "));
      }
      if (Array.isArray(botRes.data?.faqs)) {
        setFaqs(botRes.data.faqs);
      }
      if (Array.isArray(visitsRes.data?.data)) {
        setBookings(visitsRes.data.data);
      }
      if (Array.isArray(visitsRes.data?.blockedKeys)) {
        setBlockedKeys(visitsRes.data.blockedKeys);
      }
    } catch {
      // ignore cleanly
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!slotDate) return;
    setDateSlots(computeAvailableSlotsForDate(slotDate, bookings, blockedKeys));
  }, [slotDate, bookings, blockedKeys]);

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setStatusNotice("");
    try {
      const prompts = quickPromptsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await AxiosConfig.put<{ config: ChatbotConfig; message: string }>(
        "/api/chatbot/config",
        {
          ...config,
          quickPrompts: prompts,
        }
      );
      if (res.data?.config) setConfig(res.data.config);
      setStatusNotice("Chatbot settings saved.");
      setRefreshTick((t) => t + 1);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveFaq = async (e: FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    setSavingFaq(true);
    setStatusNotice("");
    try {
      const payload = {
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        category: faqCategory.trim() || "General",
        keywords: faqKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        priority: Number(faqPriority) || 5,
        enabled: true,
      };
      if (editingFaqId) {
        const res = await AxiosConfig.put<{ faqs: ChatbotFaqItem[] }>(
          `/api/chatbot/faqs/${editingFaqId}`,
          payload
        );
        setFaqs(res.data.faqs || []);
        setStatusNotice("Trained FAQ updated.");
      } else {
        const res = await AxiosConfig.post<{ faqs: ChatbotFaqItem[] }>(
          "/api/chatbot/faqs",
          payload
        );
        setFaqs(res.data.faqs || []);
        setStatusNotice("New FAQ added to chatbot training.");
      }
      setEditingFaqId(null);
      setFaqQuestion("");
      setFaqAnswer("");
      setFaqKeywords("");
      setFaqPriority(8);
    } finally {
      setSavingFaq(false);
    }
  };

  const handleToggleFaqEnabled = async (item: ChatbotFaqItem) => {
    const res = await AxiosConfig.put<{ faqs: ChatbotFaqItem[] }>(
      `/api/chatbot/faqs/${item.id}`,
      { enabled: !item.enabled }
    );
    setFaqs(res.data.faqs || []);
  };

  const handleDeleteFaq = async (id: string) => {
    const res = await AxiosConfig.delete<{ faqs: ChatbotFaqItem[] }>(
      `/api/chatbot/faqs/${id}`
    );
    setFaqs(res.data.faqs || []);
    setStatusNotice("FAQ training item removed.");
  };

  const handleEditFaq = (item: ChatbotFaqItem) => {
    setEditingFaqId(item.id);
    setFaqQuestion(item.question);
    setFaqAnswer(item.answer);
    setFaqCategory(item.category);
    setFaqKeywords(item.keywords.join(", "));
    setFaqPriority(item.priority);
    setActiveTab("faqs");
  };

  const handleTestChatbot = async (e: FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    setTestingChat(true);
    try {
      const res = await AxiosConfig.post<{
        reply: string;
        whatsappUrl?: string;
      }>("/api/chatbot/ask", {
        message: testInput.trim(),
      });
      setTestReply(res.data.reply);
      setTestWhatsappUrl(res.data.whatsappUrl || "");
    } finally {
      setTestingChat(false);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: SiteVisitStatus) => {
    await AxiosConfig.patch(`/api/site-visits/${id}`, { status });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setStatusNotice(`Booking ${id} marked ${status}.`);
  };

  const handleToggleBlockSlot = async (slotTime: string) => {
    const res = await AxiosConfig.post<{ blockedKeys: string[] }>(
      "/api/site-visits/slots/toggle-block",
      {
        date: slotDate,
        slotTime,
      }
    );
    setBlockedKeys(res.data.blockedKeys || []);
  };

  const activeFaqCount = faqs.filter((f) => f.enabled).length;
  const confirmedVisitCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <AdminPortalShell
      sectionCode="Chatbot & Bookings"
      refreshTrigger={refreshTick}
      bannerLeftTitle="AI Assistant & Site Visit Hub"
      bannerLeftLines={[
        { label: "Trained Q&As", value: `${activeFaqCount} active / ${faqs.length} total` },
        { label: "Site Visits", value: `${confirmedVisitCount} confirmed` },
        { label: "Widget State", value: config.enabled ? "Enabled" : "Paused" },
      ]}
      kpiLabel="Trained Knowledge Pairs"
      kpiValue={activeFaqCount}
      kpiNote={`${faqs.length} total`}
      kpiStatusText={config.enabled ? "Floating Widget Live" : "Widget Paused"}
      kpiStatusTone={config.enabled ? "green" : "red"}
      kpiFooterLabel="Site Visit Slots"
      kpiFooterValue={`${confirmedVisitCount} confirmed`}
    >
      <div className="space-y-5">
        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "faqs", label: "FAQ Training (Q&A)", icon: <FiMessageCircle /> },
              { id: "setup", label: "Bot Setup & Test", icon: <FiSave /> },
              { id: "visits", label: "Site Visits & Slots", icon: <FiCalendar /> },
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setActiveTab(tabItem.id as "faqs" | "setup" | "visits")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  activeTab === tabItem.id
                    ? "bg-[#22577A] text-white border-0"
                    : "bg-[#F8FAFC] text-slate-600 border border-slate-200 hover:border-[#22577A]"
                }`}
              >
                {tabItem.icon}
                <span>{tabItem.label}</span>
              </button>
            ))}
          </div>

          {statusNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <FiCheck />
              <span>{statusNotice}</span>
            </span>
          )}
        </div>

        {/* TAB 1: FAQ TRAINING MANAGER */}
        {activeTab === "faqs" && (
          <div className="space-y-5">
            <form
              onSubmit={handleSaveFaq}
              className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-3"
            >
              <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
                {editingFaqId ? "Edit Trained Q&A" : "Train New Question & Answer"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="faq-question" className="sr-only">
                    Customer Question
                  </label>
                  <input
                    id="faq-question"
                    type="text"
                    required
                    placeholder="Frequently asked question (e.g. What is delivery lead time?)"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="faq-category" className="sr-only">
                    Category
                  </label>
                  <input
                    id="faq-category"
                    type="text"
                    placeholder="Category (e.g. Pricing)"
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="faq-answer" className="sr-only">
                  Assistant Answer
                </label>
                <textarea
                  id="faq-answer"
                  rows={3}
                  required
                  placeholder="Exact verified answer..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <label htmlFor="faq-keywords" className="sr-only">
                    Trigger Keywords
                  </label>
                  <input
                    id="faq-keywords"
                    type="text"
                    placeholder="Keywords comma-separated (e.g. lead time, delivery, weeks)"
                    value={faqKeywords}
                    onChange={(e) => setFaqKeywords(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  {editingFaqId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFaqId(null);
                        setFaqQuestion("");
                        setFaqAnswer("");
                        setFaqKeywords("");
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingFaq}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0"
                  >
                    <FiPlus />
                    <span>{editingFaqId ? "Update Q&A" : "Add Q&A"}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Trained Q&A List */}
            <div className="space-y-2.5">
              {faqs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#22577A] text-[10px] font-bold uppercase">
                        {item.category}
                      </span>
                      <span className="text-sm font-bold text-[#14171A]">
                        {item.question}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 m-0 leading-relaxed">
                      {item.answer}
                    </p>
                    {item.keywords.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        Keywords: {item.keywords.join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFaqEnabled(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                        item.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-slate-100 border-slate-200 text-slate-500"
                      }`}
                    >
                      {item.enabled ? "Active" : "Paused"}
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
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BOT CONFIGURATION & LIVE TEST */}
        {activeTab === "setup" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <form onSubmit={handleSaveConfig} className="xl:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                <span className="text-xs font-bold text-[#14171A]">
                  Show Floating Chatbot Ball Across Public Pages
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                    config.enabled
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-300 text-slate-600"
                  }`}
                >
                  {config.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Assistant Name
                  </label>
                  <input
                    type="text"
                    value={config.assistantName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, assistantName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    WhatsApp Button Label
                  </label>
                  <input
                    type="text"
                    value={config.whatsappTriggerLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        whatsappTriggerLabel: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Welcome Greeting
                </label>
                <input
                  type="text"
                  value={config.welcomeMessage}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  WhatsApp Prefill Prefix
                </label>
                <input
                  type="text"
                  value={config.defaultWhatsappPrefix}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      defaultWhatsappPrefix: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Quick Prompts (comma-separated)
                </label>
                <input
                  type="text"
                  value={quickPromptsText}
                  onChange={(e) => setQuickPromptsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  System Instructions (Tone &amp; Rules)
                </label>
                <textarea
                  rows={3}
                  value={config.systemInstructions}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      systemInstructions: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0"
              >
                <FiSave />
                <span>{savingConfig ? "Saving..." : "Save Bot Configuration"}</span>
              </button>
            </form>

            {/* Live Sandbox Test */}
            <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3">
              <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
                Live Training Test
              </div>
              <form onSubmit={handleTestChatbot} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Test a customer question..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
                <button
                  type="submit"
                  disabled={testingChat}
                  className="px-3.5 py-2 rounded-xl bg-[#22577A] text-white text-xs font-bold cursor-pointer border-0"
                >
                  <FiSend />
                </button>
              </form>
              {testReply && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 text-xs text-slate-800">
                  <div>{testReply}</div>
                  {testWhatsappUrl && (
                    <a
                      href={testWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold no-underline"
                    >
                      <FaWhatsapp />
                      <span>Test WhatsApp Handoff Link</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SITE VISITS & SLOT BLOCKING */}
        {activeTab === "visits" && (
          <div className="space-y-5">
            {/* Slot Block / Unblock Control */}
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
                  Daily Slot Availability Control
                </span>
                <select
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                >
                  {upcomingDates.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.date} ({d.dayShort})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {dateSlots.map((slot) => {
                  const isBlocked = slot.reason === "Blocked";
                  const isBooked = slot.reason === "Booked";
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => handleToggleBlockSlot(slot.time)}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        isBooked
                          ? "bg-sky-50 border-sky-200 text-[#22577A] cursor-not-allowed"
                          : isBlocked
                            ? "bg-red-50 border-red-200 text-[#E60000] cursor-pointer"
                            : "bg-white border-slate-200 hover:border-[#22577A] text-[#14171A] cursor-pointer"
                      }`}
                    >
                      <div className="text-xs font-bold tabular-nums">{slot.label}</div>
                      <div className="text-[11px] font-medium mt-0.5">
                        {isBooked ? "Booked" : isBlocked ? "Blocked (Click Unblock)" : "Open (Click Block)"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-2.5">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#22577A] tabular-nums">
                        {b.id}
                      </span>
                      <span className="text-sm font-bold text-[#14171A]">
                        {b.visitorName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          b.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : b.status === "CANCELLED"
                              ? "bg-red-50 text-[#E60000]"
                              : "bg-sky-50 text-[#22577A]"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 tabular-nums">
                      {b.date} · {b.slotLabel} · {b.locationName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {b.visitorPhone} · {b.visitorEmail}
                      {b.calendarEventId ? " · Calendar Synced" : ""}
                      {b.emailSent ? " · Gmail Sent" : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["CONFIRMED", "COMPLETED", "CANCELLED"] as SiteVisitStatus[]).map(
                      (statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => handleUpdateBookingStatus(b.id, statusOption)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                            b.status === statusOption
                              ? "bg-[#22577A] border-[#22577A] text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:border-[#22577A]"
                          }`}
                        >
                          {statusOption}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminPortalShell>
  );
}
