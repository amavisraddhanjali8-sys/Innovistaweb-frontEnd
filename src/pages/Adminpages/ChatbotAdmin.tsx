import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit2,
  FiMessageCircle,
  FiPlus,
  FiRotateCcw,
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
  computeDefaultEndTime,
  createDefaultSiteVisitSchedule,
  formatTime24ToLabel,
  getManagedSiteVisitDates,
  type ManagedDateSummary,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SiteVisitStatus,
  type SlotAvailabilityItem,
} from "../../utils/siteVisitSchedulerHelpers";

export default function ChatbotAdmin() {
  const [activeTab, setActiveTab] = useState<"setup" | "faqs" | "visits">("visits");
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [faqs, setFaqs] = useState<ChatbotFaqItem[]>([]);
  const [bookings, setBookings] = useState<SiteVisitBooking[]>([]);
  const [schedule, setSchedule] = useState<SiteVisitScheduleConfig>(() =>
    createDefaultSiteVisitSchedule()
  );
  const [managedDates, setManagedDates] = useState<ManagedDateSummary[]>(() =>
    getManagedSiteVisitDates(createDefaultSiteVisitSchedule(), [], 10)
  );
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

  // Site Visit Date & Slot CRUD State
  const [slotDate, setSlotDate] = useState(
    () =>
      getManagedSiteVisitDates(createDefaultSiteVisitSchedule(), [], 10)[0]
        ?.date || ""
  );
  const [slotScope, setSlotScope] = useState<"date" | "default">("date");

  // Add Date form
  const [newCustomDate, setNewCustomDate] = useState("");
  const [newCustomDateAvailable, setNewCustomDateAvailable] = useState(true);

  // Add Time Slot form
  const [newSlotTime, setNewSlotTime] = useState("17:00");
  const [newSlotEndTime, setNewSlotEndTime] = useState("18:00");
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotAvailable, setNewSlotAvailable] = useState(true);

  // Inline Edit Time Slot state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlotTime, setEditSlotTime] = useState("");
  const [editSlotEndTime, setEditSlotEndTime] = useState("");
  const [editSlotLabel, setEditSlotLabel] = useState("");
  const [editSlotAvailable, setEditSlotAvailable] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [botRes, visitsRes] = await Promise.all([
        AxiosConfig.get<{ config: ChatbotConfig; faqs: ChatbotFaqItem[] }>(
          "/api/chatbot/config"
        ),
        AxiosConfig.get<{
          data: SiteVisitBooking[];
          schedule?: SiteVisitScheduleConfig;
          dates?: ManagedDateSummary[];
        }>("/api/site-visits"),
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
      if (visitsRes.data?.schedule) {
        setSchedule(visitsRes.data.schedule);
      }
      if (Array.isArray(visitsRes.data?.dates) && visitsRes.data.dates.length > 0) {
        setManagedDates(visitsRes.data.dates);
        setSlotDate((prev) =>
          visitsRes.data.dates!.some((d) => d.date === prev)
            ? prev
            : visitsRes.data.dates![0].date
        );
      }
    } catch {
      // ignore cleanly
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const applyScheduleResponse = (resData: {
    schedule?: SiteVisitScheduleConfig;
    dates?: ManagedDateSummary[];
    message?: string;
  }) => {
    if (resData?.schedule) setSchedule(resData.schedule);
    if (Array.isArray(resData?.dates)) setManagedDates(resData.dates);
    if (resData?.message) setStatusNotice(resData.message);
    setRefreshTick((t) => t + 1);
  };

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

  // =================== DATE & SLOT MANAGEMENT HANDLERS ===================

  const handleAddOrUpdateDate = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newCustomDate)) return;
    const res = await AxiosConfig.post("/api/site-visits/dates", {
      date: newCustomDate,
      available: newCustomDateAvailable,
    });
    applyScheduleResponse(res.data);
    setSlotDate(newCustomDate);
    setNewCustomDate("");
  };

  const handleToggleDateAvailable = async (
    targetDate: string,
    nextAvailable: boolean
  ) => {
    const res = await AxiosConfig.patch(
      `/api/site-visits/dates/${encodeURIComponent(targetDate)}`,
      { available: nextAvailable }
    );
    applyScheduleResponse(res.data);
  };

  const handleDeleteCustomDate = async (targetDate: string) => {
    const res = await AxiosConfig.delete(
      `/api/site-visits/dates/${encodeURIComponent(targetDate)}`
    );
    applyScheduleResponse(res.data);
  };

  const handleResetDateSlots = async (targetDate: string) => {
    const res = await AxiosConfig.patch(
      `/api/site-visits/dates/${encodeURIComponent(targetDate)}`,
      { resetSlots: true }
    );
    applyScheduleResponse(res.data);
  };

  const handleAddTimeSlot = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSlotTime) return;
    const label = newSlotLabel.trim() || formatTime24ToLabel(newSlotTime);
    const endTime = newSlotEndTime || computeDefaultEndTime(newSlotTime);
    const res = await AxiosConfig.post("/api/site-visits/slots", {
      scope: slotScope === "default" ? "default" : "date",
      date: slotScope === "default" ? undefined : slotDate,
      time: newSlotTime,
      endTime,
      label,
      available: newSlotAvailable,
    });
    applyScheduleResponse(res.data);
    setNewSlotLabel("");
  };

  const handleStartEditSlot = (slot: SlotAvailabilityItem) => {
    setEditingSlotId(slot.id || slot.time);
    setEditSlotTime(slot.time);
    setEditSlotEndTime(slot.endTime || computeDefaultEndTime(slot.time));
    setEditSlotLabel(slot.label);
    setEditSlotAvailable(slot.adminAvailable !== false);
  };

  const handleSaveEditedSlot = async (slotIdOrTime: string) => {
    const res = await AxiosConfig.put(
      `/api/site-visits/slots/${encodeURIComponent(slotIdOrTime)}`,
      {
        scope: slotScope === "default" ? "default" : "date",
        date: slotScope === "default" ? undefined : slotDate,
        time: editSlotTime,
        endTime: editSlotEndTime,
        label: editSlotLabel.trim() || formatTime24ToLabel(editSlotTime),
        available: editSlotAvailable,
      }
    );
    applyScheduleResponse(res.data);
    setEditingSlotId(null);
  };

  const handleToggleSlotAvailable = async (slot: SlotAvailabilityItem) => {
    const slotIdOrTime = slot.id || slot.time;
    const nextAvail = !(slot.adminAvailable !== false);
    const res = await AxiosConfig.put(
      `/api/site-visits/slots/${encodeURIComponent(slotIdOrTime)}`,
      {
        scope: slotScope === "default" ? "default" : "date",
        date: slotScope === "default" ? undefined : slotDate,
        available: nextAvail,
      }
    );
    applyScheduleResponse(res.data);
  };

  const handleDeleteSlot = async (slotIdOrTime: string) => {
    const query =
      slotScope === "default"
        ? "scope=default"
        : `scope=date&date=${encodeURIComponent(slotDate)}`;
    const res = await AxiosConfig.delete(
      `/api/site-visits/slots/${encodeURIComponent(slotIdOrTime)}?${query}`
    );
    applyScheduleResponse(res.data);
    if (editingSlotId === slotIdOrTime) setEditingSlotId(null);
  };

  const selectedDateSummary = managedDates.find((d) => d.date === slotDate);
  const displayedSlots: SlotAvailabilityItem[] =
    slotScope === "default"
      ? schedule.defaultSlots.map((s) => ({
          ...s,
          adminAvailable: s.available,
          reason: s.available ? undefined : "Unavailable",
        }))
      : computeAvailableSlotsForDate(
          slotDate,
          bookings,
          schedule.blockedKeys,
          [],
          schedule
        );

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
      kpiStatusText={config.enabled ? "3D Receptionist Live" : "Widget Paused"}
      kpiStatusTone={config.enabled ? "green" : "red"}
      kpiFooterLabel="Site Visit Slots"
      kpiFooterValue={`${confirmedVisitCount} confirmed`}
    >
      <div className="space-y-5">
        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "visits", label: "Dates & Time Slots", icon: <FiCalendar /> },
              { id: "faqs", label: "FAQ Training (Q&A)", icon: <FiMessageCircle /> },
              { id: "setup", label: "3D Receptionist Setup", icon: <FiSave /> },
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

        {/* TAB 1: FULL DATE & TIME SLOT MANAGEMENT + BOOKINGS */}
        {activeTab === "visits" && (
          <div className="space-y-5">
            {/* Section A: Manage Available & Unavailable Dates */}
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-[#14171A] uppercase tracking-wider m-0">
                    1. Configure Visit Dates (Available / Unavailable)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0">
                    Add custom dates, close full days as Unavailable, or pick a date to edit its time slots below.
                  </p>
                </div>

                <form
                  onSubmit={handleAddOrUpdateDate}
                  className="flex flex-wrap items-center gap-2"
                >
                  <label htmlFor="admin-add-visit-date" className="sr-only">
                    Add site visit date
                  </label>
                  <input
                    id="admin-add-visit-date"
                    type="date"
                    required
                    value={newCustomDate}
                    onChange={(e) => setNewCustomDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#14171A]"
                  />
                  <select
                    aria-label="Initial date status"
                    value={newCustomDateAvailable ? "available" : "unavailable"}
                    onChange={(e) =>
                      setNewCustomDateAvailable(e.target.value === "available")
                    }
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#14171A]"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0"
                  >
                    <FiPlus className="text-xs" />
                    <span>Add Date</span>
                  </button>
                </form>
              </div>

              {/* Selectable Date Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {managedDates.map((d) => {
                  const isSelected = d.date === slotDate;
                  return (
                    <div
                      key={d.date}
                      className={`rounded-xl border p-2.5 flex flex-col gap-1.5 transition-colors ${
                        isSelected
                          ? "border-[#22577A] bg-sky-50/70"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSlotDate(d.date);
                          setSlotScope("date");
                        }}
                        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-bold text-[#14171A] tabular-nums whitespace-nowrap">
                            {d.date}
                          </span>
                          {d.isCustom && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          {d.dayShort} · {d.openSlotCount}/{d.totalSlotCount} open
                        </div>
                      </button>

                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleToggleDateAvailable(d.date, !d.available)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border ${
                            d.available
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-red-50 border-red-200 text-[#E60000]"
                          }`}
                        >
                          {d.available ? "Available" : "Unavailable"}
                        </button>

                        {d.isCustom && (
                          <button
                            type="button"
                            aria-label={`Delete date ${d.date}`}
                            onClick={() => handleDeleteCustomDate(d.date)}
                            className="p-1 rounded-md border border-slate-200 bg-white hover:border-[#E60000] text-slate-500 hover:text-[#E60000] cursor-pointer"
                          >
                            <FiTrash2 className="text-[11px]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Add, Edit, Delete & Toggle Available / Unavailable Time Slots */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-[#14171A] uppercase tracking-wider m-0">
                    2. Time Slots Manager (Add · Edit · Delete · Available / Unavailable)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0">
                    {slotScope === "default"
                      ? "Editing global default daily slots applied to upcoming dates without overrides."
                      : `Managing time slots for ${slotDate} (${selectedDateSummary?.available === false ? "Whole Date Marked Unavailable" : "Date Open"}).`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSlotScope("date")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      slotScope === "date"
                        ? "bg-[#22577A] border-[#22577A] text-white"
                        : "bg-[#F8FAFC] border-slate-200 text-slate-600"
                    }`}
                  >
                    Selected Date ({slotDate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotScope("default")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      slotScope === "default"
                        ? "bg-[#22577A] border-[#22577A] text-white"
                        : "bg-[#F8FAFC] border-slate-200 text-slate-600"
                    }`}
                  >
                    Default Daily Slots
                  </button>
                  {slotScope === "date" && selectedDateSummary?.hasCustomSlots && (
                    <button
                      type="button"
                      onClick={() => handleResetDateSlots(slotDate)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-[11px] font-semibold text-slate-600 cursor-pointer"
                    >
                      <FiRotateCcw className="text-[11px]" />
                      <span>Reset Date to Defaults</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add New Time Slot Form */}
              <form
                onSubmit={handleAddTimeSlot}
                className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end"
              >
                <div>
                  <label
                    htmlFor="new-slot-start"
                    className="block text-[11px] font-bold text-slate-500 mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    id="new-slot-start"
                    type="time"
                    required
                    value={newSlotTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSlotTime(val);
                      setNewSlotEndTime(computeDefaultEndTime(val));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-slot-end"
                    className="block text-[11px] font-bold text-slate-500 mb-1"
                  >
                    End Time
                  </label>
                  <input
                    id="new-slot-end"
                    type="time"
                    required
                    value={newSlotEndTime}
                    onChange={(e) => setNewSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label
                    htmlFor="new-slot-label"
                    className="block text-[11px] font-bold text-slate-500 mb-1"
                  >
                    Display Label
                  </label>
                  <input
                    id="new-slot-label"
                    type="text"
                    placeholder="e.g. 05:00 PM Evening Consultation"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-slot-status"
                    className="block text-[11px] font-bold text-slate-500 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="new-slot-status"
                    value={newSlotAvailable ? "available" : "unavailable"}
                    onChange={(e) => setNewSlotAvailable(e.target.value === "available")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0 h-[36px] whitespace-nowrap"
                >
                  <FiPlus />
                  <span>Add Time Slot</span>
                </button>
              </form>

              {/* Slots Cards with Inline Edit, Toggle Available/Unavailable, and Delete */}
              {displayedSlots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
                  No time slots configured for this view yet. Add a time slot above.
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedSlots.map((slot) => {
                    const slotKey = slot.id || slot.time;
                    const isEditing = editingSlotId === slotKey;
                    const isBooked = slot.reason === "Booked";
                    const isAdminAvail = slot.adminAvailable !== false;

                    if (isEditing) {
                      return (
                        <div
                          key={slotKey}
                          className="rounded-xl border border-[#22577A] bg-sky-50/50 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-center"
                        >
                          <input
                            type="time"
                            aria-label="Edit start time"
                            value={editSlotTime}
                            onChange={(e) => setEditSlotTime(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                          />
                          <input
                            type="time"
                            aria-label="Edit end time"
                            value={editSlotEndTime}
                            onChange={(e) => setEditSlotEndTime(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                          />
                          <input
                            type="text"
                            aria-label="Edit slot label"
                            value={editSlotLabel}
                            onChange={(e) => setEditSlotLabel(e.target.value)}
                            className="lg:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                          <select
                            aria-label="Edit slot availability"
                            value={editSlotAvailable ? "available" : "unavailable"}
                            onChange={(e) =>
                              setEditSlotAvailable(e.target.value === "available")
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                          </select>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleSaveEditedSlot(slotKey)}
                              className="px-3 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold cursor-pointer border-0"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSlotId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={slotKey}
                        className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#22577A] shrink-0">
                            <FiClock className="text-xs" />
                          </span>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-[#14171A] tabular-nums">
                              {slot.label}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {slot.time} – {slot.endTime}
                              {isBooked && " · Customer Booked"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSlotAvailable(slot)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                              isAdminAvail
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-red-50 border-red-200 text-[#E60000]"
                            }`}
                          >
                            {isAdminAvail ? "Available" : "Unavailable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditSlot(slot)}
                            aria-label={`Edit slot ${slot.label}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <FiEdit2 className="text-xs" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slotKey)}
                            aria-label={`Delete slot ${slot.label}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-[11px] font-semibold text-slate-600 hover:text-[#E60000] cursor-pointer"
                          >
                            <FiTrash2 className="text-xs" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section C: Bookings List */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
                Customer Visit Requests ({bookings.length})
              </div>
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

        {/* TAB 2: FAQ TRAINING MANAGER */}
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

        {/* TAB 3: BOT CONFIGURATION & LIVE TEST */}
        {activeTab === "setup" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <form onSubmit={handleSaveConfig} className="xl:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                <span className="text-xs font-bold text-[#14171A]">
                  Show Floating 3D Receptionist Across Public Pages
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
                    Receptionist Name
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
                      className="btn-anim-fx inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold no-underline"
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
      </div>
    </AdminPortalShell>
  );
}
