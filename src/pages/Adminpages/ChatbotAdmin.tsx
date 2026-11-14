import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
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
import { useSiteVisitSlots } from "../../Context/SiteVisitSlotContext";
import AdminPortalShell from "../../components/AdminPortalShell";
import {
  DEFAULT_CHATBOT_CONFIG,
  type ChatbotConfig,
  type ChatbotFaqItem,
} from "../../utils/chatbotHelpers";
import {
  DEFAULT_ACTIVE_WEEKDAYS,
  buildMonthlySiteVisitCalendar,
  computeAvailableSlotsForDate,
  computeDefaultEndTime,
  createDefaultSiteVisitSchedule,
  formatIsoDateLocal,
  formatMonthHeading,
  formatTime24ToLabel,
  getManagedSiteVisitDates,
  getMonthKeyFromDate,
  shiftMonthKey,
  sortManagedSlots,
  type ManagedDateSummary,
  type ManagedSiteVisitSlot,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SiteVisitStatus,
  type SlotAvailabilityItem,
} from "../../utils/siteVisitSchedulerHelpers";

export default function ChatbotAdmin() {
  const { releaseSlot } = useSiteVisitSlots();
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
  const todayIso = formatIsoDateLocal(new Date());
  const initialDate =
    getManagedSiteVisitDates(createDefaultSiteVisitSchedule(), [], 10)[0]?.date ||
    todayIso;
  const [adminMonth, setAdminMonth] = useState<string>(() =>
    getMonthKeyFromDate(initialDate)
  );
  const [slotDate, setSlotDate] = useState(initialDate);
  const [slotScope, setSlotScope] = useState<"date" | "default">("date");

  // Monthly-Wise Slot Setup State
  const [monthlyWeekdays, setMonthlyWeekdays] = useState<number[]>(() => [
    ...DEFAULT_ACTIVE_WEEKDAYS,
  ]);
  const [monthlySlotsDraft, setMonthlySlotsDraft] = useState<ManagedSiteVisitSlot[]>(
    () => createDefaultSiteVisitSchedule().defaultSlots
  );
  const [monthlyNote, setMonthlyNote] = useState("");
  const [clearDateOverridesOnSave, setClearDateOverridesOnSave] = useState(false);
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [monthlyDraftTime, setMonthlyDraftTime] = useState("17:00");
  const [monthlyDraftEndTime, setMonthlyDraftEndTime] = useState("18:00");
  const [monthlyDraftLabel, setMonthlyDraftLabel] = useState("");

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

  const syncMonthlyDraftFromSchedule = useCallback(
    (nextSchedule: SiteVisitScheduleConfig, monthKey: string) => {
      const tpl = nextSchedule.monthlyTemplates?.[monthKey];
      if (tpl) {
        setMonthlyWeekdays(
          tpl.activeWeekdays.length > 0
            ? [...tpl.activeWeekdays]
            : [...DEFAULT_ACTIVE_WEEKDAYS]
        );
        setMonthlySlotsDraft(
          tpl.slots.length > 0
            ? tpl.slots.map((s) => ({ ...s }))
            : nextSchedule.defaultSlots.map((s) => ({ ...s }))
        );
        setMonthlyNote(tpl.note || "");
      } else {
        setMonthlyWeekdays([...DEFAULT_ACTIVE_WEEKDAYS]);
        setMonthlySlotsDraft(nextSchedule.defaultSlots.map((s) => ({ ...s })));
        setMonthlyNote("");
      }
    },
    []
  );

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
          managedDates?: ManagedDateSummary[];
        }>(`/api/site-visits?month=${encodeURIComponent(adminMonth)}`),
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
        syncMonthlyDraftFromSchedule(visitsRes.data.schedule, adminMonth);
      }
      const nextManaged = visitsRes.data?.dates || visitsRes.data?.managedDates;
      if (Array.isArray(nextManaged) && nextManaged.length > 0) {
        setManagedDates(nextManaged);
        setSlotDate((prev) =>
          prev && /^\d{4}-\d{2}-\d{2}$/.test(prev)
            ? prev
            : nextManaged[0].date
        );
      }
    } catch {
      // ignore cleanly
    }
  }, [adminMonth, syncMonthlyDraftFromSchedule]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const applyScheduleResponse = (resData: {
    schedule?: SiteVisitScheduleConfig;
    dates?: ManagedDateSummary[];
    managedDates?: ManagedDateSummary[];
    message?: string;
  }) => {
    if (resData?.schedule) {
      setSchedule(resData.schedule);
      syncMonthlyDraftFromSchedule(resData.schedule, adminMonth);
    }
    const nextManaged = resData?.dates || resData?.managedDates;
    if (Array.isArray(nextManaged)) setManagedDates(nextManaged);
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
    const target = bookings.find((b) => b.id === id);
    if (status === "CANCELLED" && target) {
      releaseSlot(target.date, target.slotTime);
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setStatusNotice(`Booking ${id} marked ${status}.`);
  };

  // =================== DATE, MONTH & SLOT MANAGEMENT HANDLERS ===================

  const handleSelectAdminMonth = (nextMonth: string) => {
    if (!/^\d{4}-\d{2}$/.test(nextMonth)) return;
    setAdminMonth(nextMonth);
    syncMonthlyDraftFromSchedule(schedule, nextMonth);
    const nextCells = buildMonthlySiteVisitCalendar(nextMonth, schedule, bookings, todayIso);
    const firstActive =
      nextCells.find((c) => c.isCurrentMonth && !c.isPast && c.available)?.isoDate ||
      nextCells.find((c) => c.isCurrentMonth)?.isoDate ||
      `${nextMonth}-01`;
    setSlotDate(firstActive);
    setSlotScope("date");
  };

  const handleToggleMonthlyWeekday = (weekday: number) => {
    setMonthlyWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((d) => d !== weekday)
        : [...prev, weekday].sort((a, b) => a - b)
    );
  };

  const handleAddMonthlyDraftSlot = () => {
    if (!monthlyDraftTime) return;
    const label = monthlyDraftLabel.trim() || formatTime24ToLabel(monthlyDraftTime);
    const endTime = monthlyDraftEndTime || computeDefaultEndTime(monthlyDraftTime);
    const nextSlot: ManagedSiteVisitSlot = {
      id: `mslot-${monthlyDraftTime.replace(":", "")}-${Date.now().toString(36)}`,
      time: monthlyDraftTime,
      endTime,
      label,
      available: true,
    };
    setMonthlySlotsDraft((prev) =>
      sortManagedSlots([
        ...prev.filter((s) => s.time !== nextSlot.time),
        nextSlot,
      ])
    );
    setMonthlyDraftLabel("");
  };

  const handleToggleMonthlyDraftSlot = (slotTime: string) => {
    setMonthlySlotsDraft((prev) =>
      prev.map((s) => (s.time === slotTime ? { ...s, available: !s.available } : s))
    );
  };

  const handleRemoveMonthlyDraftSlot = (slotTime: string) => {
    setMonthlySlotsDraft((prev) => prev.filter((s) => s.time !== slotTime));
  };

  const handleSaveMonthlyTemplate = async (e: FormEvent) => {
    e.preventDefault();
    if (monthlySlotsDraft.length === 0) return;
    setSavingMonthly(true);
    try {
      const existingClosed = schedule.monthlyTemplates?.[adminMonth]?.closedDates || [];
      const res = await AxiosConfig.put("/api/site-visits/schedule/monthly", {
        monthKey: adminMonth,
        slots: monthlySlotsDraft,
        activeWeekdays: monthlyWeekdays,
        closedDates: existingClosed,
        note: monthlyNote.trim(),
        clearPerDateCustomSlots: clearDateOverridesOnSave,
      });
      applyScheduleResponse(res.data);
    } finally {
      setSavingMonthly(false);
    }
  };

  const handleResetMonthlyTemplate = async () => {
    setSavingMonthly(true);
    try {
      const res = await AxiosConfig.delete(
        `/api/site-visits/schedule/monthly/${encodeURIComponent(adminMonth)}`
      );
      applyScheduleResponse(res.data);
    } finally {
      setSavingMonthly(false);
    }
  };

  const handleAddOrUpdateDate = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newCustomDate)) return;
    const res = await AxiosConfig.post("/api/site-visits/dates", {
      date: newCustomDate,
      available: newCustomDateAvailable,
    });
    applyScheduleResponse(res.data);
    setAdminMonth(getMonthKeyFromDate(newCustomDate));
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

  const adminCalendarCells = buildMonthlySiteVisitCalendar(
    adminMonth,
    schedule,
    bookings,
    todayIso
  );
  const selectedCell = adminCalendarCells.find((c) => c.isoDate === slotDate);
  const selectedDateSummary = managedDates.find((d) => d.date === slotDate) || (selectedCell
    ? {
        date: selectedCell.isoDate,
        dayShort: selectedCell.dayShort,
        dayNum: String(selectedCell.dayNum),
        monthShort: selectedCell.monthShort,
        available: selectedCell.available,
        isCustom: selectedCell.isCustom,
        hasCustomSlots: selectedCell.hasCustomSlots,
        note: selectedCell.note,
        openSlotCount: selectedCell.openSlotCount,
        totalSlotCount: selectedCell.totalSlotCount,
      }
    : undefined);
  const hasMonthTemplate = Boolean(schedule.monthlyTemplates?.[adminMonth]);
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
            {/* Section A: Monthly Calendar & Single-Date Availability */}
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-[#14171A] uppercase tracking-wider m-0">
                    1. Monthly Calendar &amp; Visit Dates
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0">
                    Switch months, click any date to inspect or toggle availability, or add a specific custom date.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleSelectAdminMonth(shiftMonthKey(adminMonth, -1))}
                      aria-label="Previous admin month"
                      className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
                    >
                      <FiChevronLeft className="text-xs" />
                    </button>
                    <input
                      type="month"
                      aria-label="Select month"
                      value={adminMonth}
                      onChange={(e) => {
                        if (e.target.value) handleSelectAdminMonth(e.target.value);
                      }}
                      className="text-xs font-bold text-[#14171A] bg-transparent border-0 focus:outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleSelectAdminMonth(shiftMonthKey(adminMonth, 1))}
                      aria-label="Next admin month"
                      className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 cursor-pointer"
                    >
                      <FiChevronRight className="text-xs" />
                    </button>
                  </div>

                  <form
                    onSubmit={handleAddOrUpdateDate}
                    className="flex flex-wrap items-center gap-1.5"
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
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#14171A]"
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0"
                    >
                      <FiPlus className="text-xs" />
                      <span>Set Date</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* 7-Column Interactive Month Calendar */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="text-xs font-bold text-[#14171A] flex items-center gap-2">
                    <span>{formatMonthHeading(adminMonth)}</span>
                    {hasMonthTemplate && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#22577A] text-[10px] font-bold">
                        Custom Monthly Schedule Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Selected: <strong className="text-[#14171A] tabular-nums">{slotDate}</strong></span>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleDateAvailable(
                          slotDate,
                          selectedDateSummary?.available === false
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                        selectedDateSummary?.available !== false
                          ? "bg-red-50 border-red-200 text-[#E60000]"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      {selectedDateSummary?.available !== false
                        ? `Close ${slotDate}`
                        : `Reopen ${slotDate}`}
                    </button>
                    {selectedDateSummary?.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomDate(slotDate)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-[10px] font-semibold text-slate-600 hover:text-[#E60000] cursor-pointer"
                      >
                        <FiTrash2 className="text-[10px]" />
                        <span>Clear Override</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
                    <div
                      key={wd}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {adminCalendarCells.map((cell, idx) => {
                    if (!cell.isCurrentMonth || !cell.isoDate) {
                      return <div key={`apad-${idx}`} className="min-h-[62px]" />;
                    }
                    const isSelected = cell.isoDate === slotDate;
                    return (
                      <button
                        key={cell.isoDate}
                        type="button"
                        onClick={() => {
                          setSlotDate(cell.isoDate);
                          setSlotScope("date");
                        }}
                        className={`min-h-[62px] rounded-xl border p-1.5 flex flex-col justify-between text-left cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[#22577A] bg-sky-50/80 ring-1 ring-[#22577A]"
                            : !cell.available
                              ? "border-red-100 bg-red-50/40"
                              : cell.isPast
                                ? "border-slate-100 bg-slate-50/60 opacity-70"
                                : "border-slate-200 bg-white hover:border-[#3393B8]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="text-xs font-bold text-[#14171A] tabular-nums">
                            {cell.dayNum}
                          </span>
                          {cell.bookedCount > 0 && (
                            <span className="px-1 py-0.2 rounded bg-[#22577A] text-white text-[9px] font-bold tabular-nums">
                              {cell.bookedCount}B
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 w-full">
                          <div
                            className={`text-[10px] font-semibold tabular-nums truncate ${
                              !cell.available ? "text-[#E60000]" : "text-emerald-700"
                            }`}
                          >
                            {!cell.available
                              ? "Closed"
                              : `${cell.openSlotCount}/${cell.totalSlotCount} open`}
                          </div>
                          {cell.hasCustomSlots && (
                            <div className="text-[9px] font-bold text-amber-700 truncate">
                              Custom
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section B: Monthly-Wise Batch Slot Setup */}
            <form
              onSubmit={handleSaveMonthlyTemplate}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-[#14171A] uppercase tracking-wider m-0">
                    2. Monthly-Wise Slot Setup — {formatMonthHeading(adminMonth)}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 mb-0">
                    Configure which weekdays and time slots are available across the entire selected month ({adminMonth}).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasMonthTemplate && (
                    <button
                      type="button"
                      disabled={savingMonthly}
                      onClick={handleResetMonthlyTemplate}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#E60000] text-xs font-semibold text-slate-600 hover:text-[#E60000] cursor-pointer"
                    >
                      <FiRotateCcw className="text-xs" />
                      <span>Reset Month to Defaults</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingMonthly || monthlySlotsDraft.length === 0}
                    data-testid="save-monthly-slots-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0 disabled:opacity-50"
                  >
                    <FiSave className="text-xs" />
                    <span>
                      {savingMonthly
                        ? "Saving Month..."
                        : `Save Monthly Setup (${adminMonth})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Active Weekdays & Monthly Note */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Open Weekdays for {formatMonthHeading(adminMonth)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { idx: 0, label: "Sun" },
                      { idx: 1, label: "Mon" },
                      { idx: 2, label: "Tue" },
                      { idx: 3, label: "Wed" },
                      { idx: 4, label: "Thu" },
                      { idx: 5, label: "Fri" },
                      { idx: 6, label: "Sat" },
                    ].map((wd) => {
                      const active = monthlyWeekdays.includes(wd.idx);
                      return (
                        <button
                          key={wd.idx}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleToggleMonthlyWeekday(wd.idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-colors ${
                            active
                              ? "bg-[#22577A] border-[#22577A] text-white"
                              : "bg-[#F8FAFC] border-slate-200 text-slate-500 hover:border-[#22577A]"
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="monthly-schedule-note"
                    className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5"
                  >
                    Monthly Schedule Note (Optional)
                  </label>
                  <input
                    id="monthly-schedule-note"
                    type="text"
                    placeholder="e.g. Extended showroom hours for December"
                    value={monthlyNote}
                    onChange={(e) => setMonthlyNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs"
                  />
                </div>
              </div>

              {/* Monthly Time Slots Draft Editor */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Time Slots for {formatMonthHeading(adminMonth)} ({monthlySlotsDraft.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {monthlySlotsDraft.map((slot) => (
                    <div
                      key={slot.time}
                      className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#14171A] truncate tabular-nums">
                          {slot.label}
                        </div>
                        <div className="text-[10px] text-slate-500 tabular-nums">
                          {slot.time} – {slot.endTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMonthlyDraftSlot(slot.time)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer border ${
                            slot.available
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-red-50 border-red-200 text-[#E60000]"
                          }`}
                        >
                          {slot.available ? "Open" : "Off"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove monthly slot ${slot.label}`}
                          onClick={() => handleRemoveMonthlyDraftSlot(slot.time)}
                          className="p-1 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-[#E60000] cursor-pointer"
                        >
                          <FiTrash2 className="text-[11px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Slot into Monthly Draft */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAFC] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                  <div>
                    <label
                      htmlFor="monthly-slot-start"
                      className="block text-[10px] font-bold text-slate-500 mb-1"
                    >
                      Start Time
                    </label>
                    <input
                      id="monthly-slot-start"
                      type="time"
                      value={monthlyDraftTime}
                      onChange={(e) => {
                        setMonthlyDraftTime(e.target.value);
                        setMonthlyDraftEndTime(computeDefaultEndTime(e.target.value));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="monthly-slot-end"
                      className="block text-[10px] font-bold text-slate-500 mb-1"
                    >
                      End Time
                    </label>
                    <input
                      id="monthly-slot-end"
                      type="time"
                      value={monthlyDraftEndTime}
                      onChange={(e) => setMonthlyDraftEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold tabular-nums"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label
                      htmlFor="monthly-slot-label"
                      className="block text-[10px] font-bold text-slate-500 mb-1"
                    >
                      Slot Label
                    </label>
                    <input
                      id="monthly-slot-label"
                      type="text"
                      placeholder="e.g. 05:00 PM Evening Slot"
                      value={monthlyDraftLabel}
                      onChange={(e) => setMonthlyDraftLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMonthlyDraftSlot}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-white border border-[#22577A] text-[#22577A] hover:bg-[#22577A] hover:text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <FiPlus className="text-xs" />
                    <span>Add to Month</span>
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clearDateOverridesOnSave}
                    onChange={(e) => setClearDateOverridesOnSave(e.target.checked)}
                    className="rounded border-slate-300 text-[#22577A]"
                  />
                  <span>Replace existing per-date custom slot overrides in {adminMonth}</span>
                </label>
              </div>
            </form>

            {/* Section B: Add, Edit, Delete & Toggle Available / Unavailable Time Slots */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xs font-bold text-[#14171A] uppercase tracking-wider m-0">
                    3. Single-Date &amp; Global Time Slots Manager (Add · Edit · Delete · Toggle)
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
