import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiHeadphones,
  FiPaperclip,
  FiSend,
  FiSmartphone,
  FiStar,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import { useSiteVisitSlots } from "../Context/SiteVisitSlotContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import { detectVerticalSwipeDown } from "../utils/touchGestureHelpers";
import {
  DEFAULT_CHATBOT_CONFIG,
  buildSmsHref,
  buildWhatsAppChatUrl,
  formatChatTimestamp,
  type ChatAttachmentItem,
  type LeadDataFields,
  type PublicChatbotConfig,
  type SupportedLanguage,
} from "../../../shared/chatbotHelpers";
import {
  computeNextOpenSlot,
  evaluateBookingSubmitState,
  mergeCalendarCellsWithLocalState,
  mergeSlotsWithLocalState,
} from "../utils/siteVisitLocalStoreHelpers";
import {
  buildMonthlySiteVisitCalendar,
  createDefaultSiteVisitSchedule,
  formatIsoDateLocal,
  formatMonthHeading,
  getManagedSiteVisitDates,
  getMonthKeyFromDate,
  shiftMonthKey,
  type MonthlyCalendarCell,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SlotAvailabilityItem,
} from "../../../shared/siteVisitSchedulerHelpers";

const Chatbot3DReceptionistAvatar = lazy(
  () => import("./Chatbot3DReceptionistAvatar")
);

interface ChatMessageItem {
  id: string;
  role: "assistant" | "user" | "admin" | "system";
  senderName?: string;
  text: string;
  timestamp: string;
  intent?: string;
  source?: string;
  quickReplies?: string[];
  followUpSuggestions?: string[];
  attachments?: ChatAttachmentItem[];
  whatsappUrl?: string;
  smsUrl?: string;
  suggestSiteVisit?: boolean;
  suggestQuote?: boolean;
  suggestHandover?: boolean;
}

interface StoredSessionState {
  sessionId: string;
  sessionToken: string;
  language: SupportedLanguage;
}

const SESSION_STORAGE_KEY = "innoassist_session";

function loadStoredSession(): StoredSessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSessionState>;
    if (parsed.sessionId && parsed.sessionToken) {
      return {
        sessionId: parsed.sessionId,
        sessionToken: parsed.sessionToken,
        language:
          parsed.language === "si" || parsed.language === "ta" || parsed.language === "en"
            ? parsed.language
            : "en",
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveStoredSession(state: StoredSessionState): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "EN",
  si: "සිං",
  ta: "தமிழ்",
};

const CHATBOT_VISIT_WIDGET_ID = "floating-chatbot-visit";

export default function FloatingChatbotWidget() {
  const { isLoggedIn } = useAuth();
  const { contactSettings } = useSiteSettings();
  const {
    state: localSlotState,
    setWidgetSelection,
    clearWidgetSelection,
    reserveSlotAndNotify,
  } = useSiteVisitSlots();
  const [isOpen, setIsOpen] = useState(false);
  const [launcherHovered, setLauncherHovered] = useState(false);
  const [panelHovered, setPanelHovered] = useState(false);
  const [tab, setTab] = useState<"chat" | "visit">("chat");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDraft, setRequestDraft] = useState("");
  const initialSession = useMemo(() => loadStoredSession(), []);
  const [config, setConfig] = useState<PublicChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [language, setLanguage] = useState<SupportedLanguage>(initialSession?.language || "en");
  const [sessionId, setSessionId] = useState<string>(initialSession?.sessionId || "");
  const [sessionToken, setSessionToken] = useState<string>(initialSession?.sessionToken || "");
  const [supportMode, setSupportMode] = useState<"ai" | "waiting_human" | "human" | "resolved">("ai");
  const [assignedAdminName, setAssignedAdminName] = useState<string>("");
  const [collectedLead, setCollectedLead] = useState<LeadDataFields>({});
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      text:
        DEFAULT_CHATBOT_CONFIG.localizedWelcome[initialSession?.language || "en"] ||
        DEFAULT_CHATBOT_CONFIG.welcomeMessage,
      timestamp: formatChatTimestamp(new Date()),
      quickReplies: DEFAULT_CHATBOT_CONFIG.quickPrompts,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  // Dynamic Site Visit Tab State synced with Admin Schedule
  const todayIso = formatIsoDateLocal(new Date());
  const currentMonthKey = getMonthKeyFromDate(todayIso);
  const initialQuickDate =
    getManagedSiteVisitDates(createDefaultSiteVisitSchedule(), [], 4)[0]?.date ||
    todayIso;
  const [visitSchedule, setVisitSchedule] = useState<SiteVisitScheduleConfig>(() =>
    createDefaultSiteVisitSchedule()
  );
  const [quickMonth, setQuickMonth] = useState<string>(() =>
    getMonthKeyFromDate(initialQuickDate)
  );
  const [quickCalendarDays, setQuickCalendarDays] = useState<MonthlyCalendarCell[]>(() =>
    buildMonthlySiteVisitCalendar(
      getMonthKeyFromDate(initialQuickDate),
      createDefaultSiteVisitSchedule(),
      [],
      todayIso
    )
  );
  const [quickDate, setQuickDate] = useState(initialQuickDate);
  const [quickSlots, setQuickSlots] = useState<SlotAvailabilityItem[]>([]);
  const [quickSlot, setQuickSlot] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickError, setQuickError] = useState("");
  const [quickBookingDone, setQuickBookingDone] = useState<string | null>(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sheetTouchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowRequestModal(false);
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ config?: PublicChatbotConfig }>("/api/chatbot/config")
      .then((res) => {
        if (!active || !res.data?.config) return;
        const cfg = res.data.config;
        setConfig(cfg);
        setMessages((prev) =>
          prev.length === 1 && prev[0].id === "welcome-1"
            ? [
                {
                  ...prev[0],
                  text: cfg.localizedWelcome?.[language] || cfg.welcomeMessage,
                  quickReplies: cfg.quickPrompts,
                },
              ]
            : prev
        );
      })
      .catch(() => {
        // Keep defaults on transient network issues
      });
    return () => {
      active = false;
    };
  }, [language]);

  // Restore persisted conversation session on open/mount if sessionId & token exist
  useEffect(() => {
    if (!sessionId || !sessionToken) return;
    let active = true;
    AxiosConfig.get<{
      mode: "ai" | "waiting_human" | "human" | "resolved";
      language: SupportedLanguage;
      assignedAdminName?: string;
      collectedLead?: LeadDataFields;
      rating?: number | null;
      messages?: Array<{
        id: string;
        role: "user" | "assistant" | "admin" | "system";
        senderName?: string;
        text: string;
        intent?: string;
        source?: string;
        quickReplies?: string[];
        followUpSuggestions?: string[];
        attachments?: ChatAttachmentItem[];
        timestamp: string;
      }>;
    }>(`/api/chatbot/session/${encodeURIComponent(sessionId)}`, {
      headers: {
        "x-no-cache": "true",
        "x-chat-session-token": sessionToken,
      },
    })
      .then((res) => {
        if (!active || !res.data) return;
        setSupportMode(res.data.mode || "ai");
        setAssignedAdminName(res.data.assignedAdminName || "");
        if (res.data.collectedLead) setCollectedLead(res.data.collectedLead);
        if (typeof res.data.rating === "number") setSubmittedRating(res.data.rating);
        if (Array.isArray(res.data.messages) && res.data.messages.length > 0) {
          setMessages(
            res.data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              senderName: m.senderName,
              text: m.text,
              timestamp: formatChatTimestamp(new Date(m.timestamp)),
              intent: m.intent,
              source: m.source,
              quickReplies: m.quickReplies,
              followUpSuggestions: m.followUpSuggestions,
              attachments: m.attachments,
            }))
          );
        }
      })
      .catch(() => {
        // Session may have expired past retention window
      });
    return () => {
      active = false;
    };
  }, [sessionId, sessionToken]);

  // Live Human Takeover Polling (fetches live admin replies every 4s when waiting/in human support)
  useEffect(() => {
    if (!isOpen || tab !== "chat" || !sessionId || !sessionToken) return;
    if (supportMode !== "waiting_human" && supportMode !== "human") return;
    const timer = window.setInterval(() => {
      AxiosConfig.get<{
        mode: "ai" | "waiting_human" | "human" | "resolved";
        assignedAdminName?: string;
        messages?: Array<{
          id: string;
          role: "user" | "assistant" | "admin" | "system";
          senderName?: string;
          text: string;
          intent?: string;
          source?: string;
          quickReplies?: string[];
          followUpSuggestions?: string[];
          attachments?: ChatAttachmentItem[];
          timestamp: string;
        }>;
      }>(`/api/chatbot/session/${encodeURIComponent(sessionId)}`, {
        headers: {
          "x-no-cache": "true",
          "x-chat-session-token": sessionToken,
        },
      })
        .then((res) => {
          if (!res.data) return;
          setSupportMode(res.data.mode || "ai");
          setAssignedAdminName(res.data.assignedAdminName || "");
          if (Array.isArray(res.data.messages) && res.data.messages.length > 0) {
            setMessages(
              res.data.messages.map((m) => ({
                id: m.id,
                role: m.role,
                senderName: m.senderName,
                text: m.text,
                timestamp: formatChatTimestamp(new Date(m.timestamp)),
                intent: m.intent,
                source: m.source,
                quickReplies: m.quickReplies,
                followUpSuggestions: m.followUpSuggestions,
                attachments: m.attachments,
              }))
            );
          }
        })
        .catch(() => null);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isOpen, tab, sessionId, sessionToken, supportMode]);

  useEffect(() => {
    if (isOpen && tab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, tab]);

  // Fetch initial open slot count when chat panel opens & update whenever quickDate/quickMonth changes
  useEffect(() => {
    if (!isOpen || !quickDate) return;
    AxiosConfig.get<{
      calendarDays?: MonthlyCalendarCell[];
      schedule?: SiteVisitScheduleConfig;
      slots?: SlotAvailabilityItem[];
    }>(
      `/api/site-visits/slots?date=${encodeURIComponent(quickDate)}&month=${encodeURIComponent(quickMonth)}`
    )
      .then((res) => {
        if (res.data?.schedule) {
          setVisitSchedule(res.data.schedule);
        }
        if (Array.isArray(res.data?.calendarDays) && res.data.calendarDays.length > 0) {
          setQuickCalendarDays(res.data.calendarDays);
        }
        const list = res.data?.slots || [];
        setQuickSlots(list);
        const firstOpen = list.find((s) => s.available)?.time || "";
        setQuickSlot((prev) =>
          list.some((s) => s.time === prev && s.available) ? prev : firstOpen
        );
      })
      .catch(() => {});
  }, [isOpen, tab, quickDate, quickMonth]);

  const mergedQuickCalendarDays = useMemo(
    () => mergeCalendarCellsWithLocalState(quickCalendarDays, localSlotState),
    [quickCalendarDays, localSlotState]
  );

  const mergedQuickSlots = useMemo(
    () =>
      mergeSlotsWithLocalState(
        quickSlots,
        quickDate,
        localSlotState,
        CHATBOT_VISIT_WIDGET_ID,
        quickSlot
      ),
    [quickSlots, quickDate, localSlotState, quickSlot]
  );

  useEffect(() => {
    const nextOpen = computeNextOpenSlot(mergedQuickSlots, quickSlot);
    if (nextOpen !== quickSlot) {
      setQuickSlot(nextOpen);
    }
  }, [mergedQuickSlots, quickSlot]);

  useEffect(() => {
    if (!isOpen || tab !== "visit") {
      clearWidgetSelection(CHATBOT_VISIT_WIDGET_ID);
    }
  }, [isOpen, tab, clearWidgetSelection]);

  const openSlotCount = useMemo(
    () => mergedQuickSlots.filter((s) => !s.disabled).length,
    [mergedQuickSlots]
  );

  const quickSubmitState = evaluateBookingSubmitState(
    mergedQuickSlots,
    quickSlot,
    quickSubmitting
  );

  if (!config.enabled) return null;

  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.text || inputValue;
  const globalWhatsappUrl = buildWhatsAppChatUrl(
    contactSettings.whatsapp,
    latestUserMessage,
    config.defaultWhatsappPrefix
  );

  const handleQuickSelectDate = (isoDate: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
    clearWidgetSelection(CHATBOT_VISIT_WIDGET_ID);
    setQuickDate(isoDate);
    setQuickMonth(getMonthKeyFromDate(isoDate));
  };

  const handleQuickSelectSlot = (slotTime: string) => {
    setQuickSlot(slotTime);
    setWidgetSelection(CHATBOT_VISIT_WIDGET_ID, quickDate, slotTime);
  };

  const handleQuickShiftMonth = (delta: number) => {
    const nextMonth = shiftMonthKey(quickMonth, delta);
    if (nextMonth < currentMonthKey) return;
    setQuickMonth(nextMonth);
    AxiosConfig.get<{
      calendarDays?: MonthlyCalendarCell[];
      selectedDate?: string;
      schedule?: SiteVisitScheduleConfig;
      slots?: SlotAvailabilityItem[];
    }>(`/api/site-visits/slots?month=${encodeURIComponent(nextMonth)}`)
      .then((res) => {
        if (res.data?.schedule) setVisitSchedule(res.data.schedule);
        if (Array.isArray(res.data?.calendarDays)) setQuickCalendarDays(res.data.calendarDays);
        if (res.data?.selectedDate) setQuickDate(res.data.selectedDate);
        if (Array.isArray(res.data?.slots)) {
          setQuickSlots(res.data.slots);
          setQuickSlot(res.data.slots.find((s) => s.available)?.time || "");
        }
      })
      .catch(() => {
        const fallbackDays = buildMonthlySiteVisitCalendar(nextMonth, visitSchedule, [], todayIso);
        setQuickCalendarDays(fallbackDays);
        const firstOpen =
          fallbackDays.find((c) => c.isCurrentMonth && !c.isPast && c.available)?.isoDate ||
          `${nextMonth}-01`;
        setQuickDate(firstOpen);
      });
  };

  const handleSwitchLanguage = (nextLang: SupportedLanguage) => {
    setLanguage(nextLang);
    if (sessionId && sessionToken) {
      saveStoredSession({ sessionId, sessionToken, language: nextLang });
    }
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === "welcome-1"
        ? [
            {
              ...prev[0],
              text: config.localizedWelcome?.[nextLang] || config.welcomeMessage,
            },
          ]
        : prev
    );
  };

  const handleFileAttach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await AxiosConfig.post<{ attachment: ChatAttachmentItem }>(
        "/api/chatbot/upload",
        formData
      );
      if (res.data?.attachment) {
        setPendingAttachments((prev) => [...prev, res.data.attachment]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not upload file (allowed: PDF, images, DWG, DXF, XLSX, DOC).";
      setUploadError(msg);
    } finally {
      setUploadingFile(false);
    }
  };

  const sendMessage = async (textToSend: string) => {
    const trimmed =
      textToSend.trim() ||
      (pendingAttachments.length > 0
        ? `Attached file(s): ${pendingAttachments.map((a) => a.fileName).join(", ")}`
        : "");
    if (!trimmed || sending) return;

    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);
    setUploadError("");

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: formatChatTimestamp(new Date()),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    try {
      const res = await AxiosConfig.post<{
        sessionId: string;
        sessionToken: string;
        reply: string;
        language: SupportedLanguage;
        intent?: string;
        source?: string;
        aiPaused?: boolean;
        mode?: "ai" | "waiting_human" | "human" | "resolved";
        quickReplies?: string[];
        followUpSuggestions?: string[];
        collectedLead?: LeadDataFields;
        suggestSiteVisit?: boolean;
        suggestQuote?: boolean;
        suggestHandover?: boolean;
        whatsappUrl?: string;
        smsHref?: string;
      }>("/api/chatbot/ask", {
        message: trimmed,
        sessionId: sessionId || undefined,
        sessionToken: sessionToken || undefined,
        language,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });

      if (res.data.sessionId && res.data.sessionToken) {
        setSessionId(res.data.sessionId);
        setSessionToken(res.data.sessionToken);
        saveStoredSession({
          sessionId: res.data.sessionId,
          sessionToken: res.data.sessionToken,
          language: res.data.language || language,
        });
      }
      if (res.data.mode) setSupportMode(res.data.mode);
      if (res.data.collectedLead) setCollectedLead(res.data.collectedLead);

      if (res.data.reply && res.data.reply.trim().length > 0) {
        const assistantMsg: ChatMessageItem = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: res.data.reply,
          timestamp: formatChatTimestamp(new Date()),
          intent: res.data.intent,
          source: res.data.source,
          quickReplies: res.data.quickReplies,
          followUpSuggestions: res.data.followUpSuggestions,
          whatsappUrl: res.data.whatsappUrl,
          smsUrl: res.data.smsHref,
          suggestSiteVisit: res.data.suggestSiteVisit,
          suggestQuote: res.data.suggestQuote,
          suggestHandover: res.data.suggestHandover,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "assistant",
          text: `Reach us directly on WhatsApp (${contactSettings.phone}) for immediate assistance.`,
          timestamp: formatChatTimestamp(new Date()),
          whatsappUrl: buildWhatsAppChatUrl(
            contactSettings.whatsapp,
            trimmed,
            config.defaultWhatsappPrefix
          ),
          smsUrl: buildSmsHref(contactSettings.phone, trimmed),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleRequestHandover = async () => {
    if (!sessionId || !sessionToken) {
      await sendMessage("I would like to talk to a human specialist");
      return;
    }
    try {
      const res = await AxiosConfig.post<{
        mode: "ai" | "waiting_human" | "human" | "resolved";
        messages?: Array<{
          id: string;
          role: "user" | "assistant" | "admin" | "system";
          senderName?: string;
          text: string;
          timestamp: string;
        }>;
      }>(`/api/chatbot/session/${encodeURIComponent(sessionId)}/handover`, {
        sessionToken,
      });
      setSupportMode(res.data.mode || "waiting_human");
      if (Array.isArray(res.data.messages) && res.data.messages.length > 0) {
        setMessages(
          res.data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            senderName: m.senderName,
            text: m.text,
            timestamp: formatChatTimestamp(new Date(m.timestamp)),
          }))
        );
      }
    } catch {
      await sendMessage("Talk to a specialist");
    }
  };

  const handleSubmitCsat = async (stars: number) => {
    if (!sessionId || !sessionToken || submittingRating) return;
    setSubmittingRating(true);
    try {
      await AxiosConfig.post(
        `/api/chatbot/session/${encodeURIComponent(sessionId)}/feedback`,
        { sessionToken, rating: stars }
      );
      setSubmittedRating(stars);
    } catch {
      // ignore quietly
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const openRequestOverlay = () => {
    const seedText =
      inputValue.trim() ||
      latestUserMessage.trim() ||
      "Please share quotation & fabrication details";
    setRequestDraft(seedText);
    setShowRequestModal(true);
  };

  const handleConfirmSendRequest = () => {
    const text = requestDraft.trim();
    setShowRequestModal(false);
    setTab("chat");
    if (!text) return;
    setInputValue("");
    sendMessage(text);
  };

  const handleAssignSiteVisitFromRequest = () => {
    const text = requestDraft.trim();
    setShowRequestModal(false);
    if (text) {
      setQuickNote(text);
    }
    setTab("visit");
  };

  const handleQuickVisitBook = async (e: FormEvent) => {
    e.preventDefault();
    setQuickError("");
    if (!quickSubmitState.canBook) {
      setQuickError(quickSubmitState.disabledReason || "Select an open slot.");
      return;
    }
    if (
      !quickDate ||
      !quickSlot ||
      !quickName.trim() ||
      !quickEmail.trim() ||
      !quickPhone.trim()
    ) {
      setQuickError("Fill name, email, phone & slot.");
      return;
    }
    setQuickSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        data: SiteVisitBooking;
        slots?: SlotAvailabilityItem[];
        calendarDays?: MonthlyCalendarCell[];
      }>("/api/site-visits", {
        date: quickDate,
        slotTime: quickSlot,
        visitorName: quickName,
        visitorEmail: quickEmail,
        visitorPhone: quickPhone,
        locationName: "Nawala Showroom / Client Site",
        notes: quickNote.trim() || "Booked via Receptionist Desk",
      });
      const created = res.data.data;
      reserveSlotAndNotify(created, { showToast: true });
      clearWidgetSelection(CHATBOT_VISIT_WIDGET_ID);
      if (Array.isArray(res.data.slots)) {
        setQuickSlots(res.data.slots);
      }
      if (Array.isArray(res.data.calendarDays)) {
        setQuickCalendarDays(res.data.calendarDays);
      }
      setQuickBookingDone(
        `${created.id} · ${quickDate} (${created.slotLabel})`
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Slot unavailable. Pick another.";
      setQuickError(msg);
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleHeaderTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    sheetTouchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleHeaderTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const start = sheetTouchRef.current;
    sheetTouchRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    if (
      detectVerticalSwipeDown(
        start.x,
        start.y,
        touch.clientX,
        touch.clientY,
        Date.now() - start.t
      )
    ) {
      setShowRequestModal(false);
      setIsOpen(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={() => {
            setShowRequestModal(false);
            setIsOpen(false);
          }}
          className="sm:hidden fixed inset-0 z-[1240] bg-slate-900/35 backdrop-blur-[2px]"
        />
      )}
      <div
        data-testid="floating-chatbot-root"
        className={`fixed right-3 sm:right-6 bottom-[82px] md:bottom-6 ${
          isOpen ? "z-[1250]" : "z-[70]"
        } flex flex-col items-end gap-3 pointer-events-none`}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.section
              aria-label={config.assistantName}
              data-testid="floating-chatbot-panel"
              onMouseEnter={() => setPanelHovered(true)}
              onMouseLeave={() => setPanelHovered(false)}
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="pointer-events-auto max-sm:fixed max-sm:inset-x-2 max-sm:bottom-[80px] max-sm:w-auto max-sm:h-[min(76dvh,540px)] max-sm:max-h-[calc(100dvh-136px)] relative sm:w-[min(432px,calc(100vw-2rem))] rounded-[22px] sm:rounded-[24px] bg-white border border-slate-200/90 shadow-[0_24px_60px_-14px_rgba(15,23,42,0.26)] overflow-hidden flex flex-col sm:h-[min(620px,calc(100vh-7.5rem))] sm:max-h-[min(640px,calc(100vh-7.5rem))]"
            >
              {/* Mobile Bottom-Sheet Pull Handle + Header */}
              <div
                onTouchStart={handleHeaderTouchStart}
                onTouchEnd={handleHeaderTouchEnd}
                className="bg-white border-b border-slate-100 shrink-0"
              >
                <div className="sm:hidden flex justify-center pt-2 pb-0.5">
                  <span className="w-10 h-1 rounded-full bg-slate-300" />
                </div>
                <div className="px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 border border-slate-200/80 shrink-0">
                      <Suspense fallback={<div className="w-full h-full rounded-full" />}>
                        <Chatbot3DReceptionistAvatar
                          variant="concierge"
                          isHovered={panelHovered}
                          isSpeaking={sending}
                        />
                      </Suspense>
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-[#111827] truncate leading-tight">
                        {config.assistantName}
                      </div>
                      <div className="text-[12px] text-[#64748B] truncate mt-0.5">
                        {sending
                          ? "Typing reply..."
                          : supportMode === "human"
                            ? `${assignedAdminName || "Specialist"} Live`
                            : supportMode === "waiting_human"
                              ? "Waiting for specialist..."
                              : contactSettings.email || "innovistametal@gmail.com"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {config.supportedLanguages && config.supportedLanguages.length > 1 && (
                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {config.supportedLanguages.map((langCode) => (
                          <button
                            key={langCode}
                            type="button"
                            onClick={() => handleSwitchLanguage(langCode)}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold cursor-pointer border-0 transition-colors ${
                              language === langCode
                                ? "bg-[#0A74C9] text-white"
                                : "bg-transparent text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {LANGUAGE_LABELS[langCode]}
                          </button>
                        ))}
                      </div>
                    )}
                    <a
                      href={globalWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open WhatsApp chat"
                      title={config.whatsappTriggerLabel}
                      className="btn-anim-fx w-9 h-9 rounded-full bg-slate-50 hover:bg-emerald-50 text-emerald-600 border border-slate-200/70 flex items-center justify-center no-underline transition-colors"
                    >
                      <FaWhatsapp className="text-sm" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestModal(false);
                        setIsOpen(false);
                      }}
                      aria-label="Close chatbot"
                      className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer border border-slate-200/70 transition-colors"
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Live Human Handover Status Banner */}
                {(supportMode === "human" || supportMode === "waiting_human") && (
                  <div
                    className={`px-4 py-1.5 border-t text-[11px] font-semibold flex items-center justify-between gap-2 ${
                      supportMode === "human"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <span className="truncate">
                      {supportMode === "human"
                        ? `${assignedAdminName || "Specialist"} connected — AI replies paused`
                        : "In live support queue — an Innovista specialist will join shortly"}
                    </span>
                    {supportMode === "human" && (
                      <button
                        type="button"
                        onClick={() => sendMessage("back to ai")}
                        className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-700 text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        Resume AI
                      </button>
                    )}
                  </div>
                )}
              </div>

              {tab === "chat" ? (
                <>
                  {/* Messages Scroll Container */}
                  <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 bg-white">
                    {messages.map((msg, idx) => {
                      if (msg.role === "system") {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[10.5px] font-medium text-slate-600 text-center">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }
                      const isUser = msg.role === "user";
                      const isAdmin = msg.role === "admin";
                      const isLatestBot = idx === messages.length - 1 && !isUser;
                      const chipSuggestions =
                        msg.quickReplies && msg.quickReplies.length > 0
                          ? msg.quickReplies
                          : msg.followUpSuggestions && msg.followUpSuggestions.length > 0
                            ? msg.followUpSuggestions
                            : [];

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          className={`flex flex-col ${
                            isUser ? "items-end" : "items-start"
                          }`}
                        >
                          {isAdmin && (
                            <span className="text-[10px] font-bold text-emerald-700 mb-0.5 px-1">
                              {msg.senderName || "Innovista Specialist"} · Live
                            </span>
                          )}
                          <div
                            style={
                              isUser && config.accentColor
                                ? { backgroundColor: config.accentColor }
                                : undefined
                            }
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug whitespace-pre-line ${
                              isUser
                                ? "bg-[#0A74C9] text-white rounded-br-md shadow-xs"
                                : isAdmin
                                  ? "bg-emerald-50 border border-emerald-200 text-[#14171A] rounded-tl-md"
                                  : "bg-[#EEF2F6] text-[#14171A] rounded-tl-md"
                            }`}
                          >
                            {msg.text}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {msg.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold no-underline ${
                                      isUser
                                        ? "bg-white/20 text-white"
                                        : "bg-white border border-slate-200 text-[#0A74C9]"
                                    }`}
                                  >
                                    <FiPaperclip className="text-[10px]" />
                                    <span className="truncate max-w-[140px]">{att.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1 px-0.5 tabular-nums">
                            {msg.timestamp}
                          </span>

                          {/* Interactive Quick Replies & Follow-up Suggestions */}
                          {isLatestBot && chipSuggestions.length > 0 && msg.id !== "welcome-1" && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {chipSuggestions.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => sendMessage(chip)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0A74C9] text-[11px] font-semibold text-[#0A74C9] cursor-pointer transition-colors"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Contextual Action Pills */}
                          {!isUser &&
                            !isAdmin &&
                            (msg.intent === "visit" ||
                              msg.suggestSiteVisit ||
                              msg.intent === "whatsapp" ||
                              msg.intent === "sms" ||
                              msg.intent === "quote" ||
                              msg.suggestQuote ||
                              msg.suggestHandover ||
                              config.autoSuggestWhatsapp) &&
                            msg.id !== "welcome-1" && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {(msg.intent === "visit" || msg.suggestSiteVisit) && (
                                  <button
                                    type="button"
                                    onClick={() => setTab("visit")}
                                    className="px-2.5 py-1 rounded-lg bg-[#F0F9FF] border border-[#7DD3FC] text-[#0A74C9] text-[11px] font-semibold cursor-pointer"
                                  >
                                    Pick Slot
                                  </button>
                                )}
                                {(msg.intent === "quote" || msg.suggestQuote) && (
                                  <Link
                                    to={
                                      isLoggedIn
                                        ? "/request-quote"
                                        : buildSignupRedirectUrl("/request-quote", "rfq")
                                    }
                                    onClick={() => setIsOpen(false)}
                                    className="btn-anim-fx px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[#EA580C] text-[11px] font-semibold no-underline"
                                  >
                                    Request Quote
                                  </Link>
                                )}
                                {config.handoverEnabled &&
                                  supportMode === "ai" &&
                                  (msg.suggestHandover || isLatestBot) && (
                                    <button
                                      type="button"
                                      onClick={handleRequestHandover}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold cursor-pointer"
                                    >
                                      <FiHeadphones className="text-[11px]" />
                                      <span>Talk to Human</span>
                                    </button>
                                  )}
                                {msg.whatsappUrl && (
                                  <a
                                    href={msg.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-anim-fx inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold no-underline"
                                  >
                                    <FaWhatsapp className="text-xs" />
                                    <span>{config.whatsappTriggerLabel}</span>
                                  </a>
                                )}
                                {msg.smsUrl && (
                                  <a
                                    href={msg.smsUrl}
                                    className="btn-anim-fx inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold no-underline"
                                  >
                                    <FiSmartphone className="text-[11px]" />
                                    <span>SMS</span>
                                  </a>
                                )}
                              </div>
                            )}
                        </motion.div>
                      );
                    })}

                    {/* Quick starter prompts shown cleanly when only welcome message is present */}
                    {messages.length <= 1 && !sending && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {config.quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                              if (prompt.toLowerCase().includes("whatsapp")) {
                                window.open(
                                  globalWhatsappUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              } else {
                                sendMessage(prompt);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0A74C9] text-[11px] font-semibold text-[#0A74C9] cursor-pointer transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Compact CSAT Feedback Bar */}
                    {config.enableFeedbackRating &&
                      sessionId &&
                      messages.filter((m) => m.role === "assistant" || m.role === "admin").length >= 2 && (
                        <div className="pt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1.5">
                          <span className="text-[10.5px] font-semibold text-slate-600">
                            {submittedRating
                              ? `Rated ${submittedRating}/5 — Thank you!`
                              : "Helpful so far?"}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                disabled={submittingRating}
                                aria-label={`Rate ${star} stars`}
                                onClick={() => handleSubmitCsat(star)}
                                className="p-0.5 bg-transparent border-0 cursor-pointer text-amber-400 hover:scale-110 transition-transform"
                              >
                                <FiStar
                                  className={`text-xs ${
                                    submittedRating && star <= submittedRating
                                      ? "fill-amber-400 text-amber-500"
                                      : "text-slate-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {sending && (
                      <div className="flex items-start">
                        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-[#EEF2F6] flex items-center gap-1">
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#0A74C9]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#0A74C9]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0.4 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#0A74C9]"
                          />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Clean Mode Pills + Rounded Composer */}
                  <div className="px-4 pt-2.5 pb-3.5 border-t border-slate-100 bg-white space-y-2 shrink-0">
                    {collectedLead.requiredService && (
                      <div className="text-[10px] text-slate-500 truncate">
                        Active inquiry: <strong className="text-slate-700">{collectedLead.requiredService}</strong>
                        {collectedLead.projectLocation ? ` · ${collectedLead.projectLocation}` : ""}
                      </div>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setShowRequestModal(false);
                          setTab("chat");
                        }}
                        className={`px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          tab === "chat" && !showRequestModal
                            ? "bg-[#F0F9FF] border border-[#7DD3FC] text-[#0A74C9]"
                            : "bg-[#F1F5F9] border border-transparent text-[#475569] hover:text-[#111827]"
                        }`}
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={openRequestOverlay}
                        className={`px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          showRequestModal
                            ? "bg-[#F0F9FF] border border-[#7DD3FC] text-[#0A74C9]"
                            : "bg-[#F1F5F9] border border-transparent text-[#475569] hover:text-[#111827]"
                        }`}
                      >
                        Request
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRequestModal(false);
                          setTab("visit");
                        }}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap cursor-pointer bg-[#F1F5F9] border border-transparent text-[#475569] hover:text-[#111827] transition-colors"
                      >
                        Site Visits ({openSlotCount > 0 ? openSlotCount : "Open"})
                      </button>
                    </div>

                    {pendingAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pendingAttachments.map((att) => (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#0A74C9] text-[10.5px] font-semibold"
                          >
                            <span className="truncate max-w-[150px]">{att.fileName}</span>
                            <button
                              type="button"
                              aria-label={`Remove ${att.fileName}`}
                              onClick={() =>
                                setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))
                              }
                              className="bg-transparent border-0 p-0 text-slate-500 hover:text-red-600 cursor-pointer"
                            >
                              <FiX className="text-[11px]" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {uploadError && (
                      <div className="text-[10.5px] font-medium text-[#e60000]">{uploadError}</div>
                    )}

                    <form
                      onSubmit={handleChatSubmit}
                      className="flex items-center gap-1.5"
                    >
                      {config.enableFileUploads && (
                        <label
                          title="Upload drawing, BOQ, PDF or photo"
                          className={`w-10 h-11 sm:h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                            uploadingFile ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <FiPaperclip className="text-sm" />
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.xlsx,.csv,.txt,.doc,.docx"
                            onChange={handleFileAttach}
                          />
                        </label>
                      )}
                      <label htmlFor="floating-chatbot-input" className="sr-only">
                        Ask a question
                      </label>
                      <input
                        id="floating-chatbot-input"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                          language === "si"
                            ? "ඔබගේ ප්‍රශ්නය මෙහි ලියන්න..."
                            : language === "ta"
                              ? "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும்..."
                              : "Ask about products, quotes, drawings..."
                        }
                        className="flex-1 min-w-0 h-11 sm:h-10 px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:border-[#0A74C9] focus:outline-none text-base sm:text-[13px] text-[#14171A] placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={
                          sending ||
                          uploadingFile ||
                          (!inputValue.trim() && pendingAttachments.length === 0)
                        }
                        aria-label="Send message"
                        style={
                          config.accentColor ? { backgroundColor: config.accentColor } : undefined
                        }
                        className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-[#0A74C9] hover:bg-[#0862AD] text-white flex items-center justify-center cursor-pointer border-0 disabled:opacity-50 shrink-0 transition-colors"
                      >
                        <FiSend className="text-sm" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                /* Quick Site Visit Slot Booking Inside Chatbot */
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTab("chat")}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#F1F5F9] border border-transparent text-[#475569] hover:text-[#111827] cursor-pointer"
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        onClick={openRequestOverlay}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#F1F5F9] border border-transparent text-[#475569] hover:text-[#111827] cursor-pointer"
                      >
                        Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("visit")}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#F0F9FF] border border-[#7DD3FC] text-[#0A74C9] cursor-pointer"
                      >
                        Site Visits ({openSlotCount})
                      </button>
                    </div>
                  </div>

                  {quickBookingDone ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center space-y-2">
                      <div className="text-xs font-bold text-emerald-800">
                        Confirmed · {quickBookingDone}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={buildWhatsAppChatUrl(
                            contactSettings.whatsapp,
                            `Booked site visit ${quickBookingDone} (${quickName})`,
                            "Hi Innovista:"
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-anim-fx inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold no-underline"
                        >
                          <FaWhatsapp /> <span>Share on WhatsApp</span>
                        </a>
                        <Link
                          to="/contact"
                          onClick={() => setIsOpen(false)}
                          className="btn-anim-fx py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0A74C9] no-underline"
                        >
                          Sync with Google Calendar
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickBookingDone(null);
                            setQuickError("");
                          }}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
                        >
                          Book Another Slot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleQuickVisitBook} className="space-y-2.5">
                      {/* Compact Month & Date Picker */}
                      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickShiftMonth(-1)}
                              disabled={quickMonth <= currentMonthKey}
                              aria-label="Previous month"
                              className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center cursor-pointer disabled:opacity-40"
                            >
                              <FiChevronLeft className="text-xs" />
                            </button>
                            <span className="text-[11px] font-bold text-[#14171A] tabular-nums px-1">
                              {formatMonthHeading(quickMonth)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickShiftMonth(1)}
                              aria-label="Next month"
                              className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              <FiChevronRight className="text-xs" />
                            </button>
                          </div>
                          <input
                            type="date"
                            aria-label="Choose visit date"
                            min={todayIso}
                            value={quickDate}
                            onChange={(e) => {
                              if (e.target.value) handleQuickSelectDate(e.target.value);
                            }}
                            className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-[#14171A] tabular-nums"
                          />
                        </div>

                        <div className="grid grid-cols-7 gap-0.5 text-center">
                          {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                            <div key={`${w}-${idx}`} className="text-[9px] font-bold text-slate-400">
                              {w}
                            </div>
                          ))}
                          {mergedQuickCalendarDays.map((cell, idx) => {
                            if (!cell.isCurrentMonth || !cell.isoDate) {
                              return <div key={`qpad-${idx}`} className="h-7" />;
                            }
                            const active = cell.isoDate === quickDate;
                            const disabled = cell.isPast || !cell.available;
                            return (
                              <button
                                key={cell.isoDate}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleQuickSelectDate(cell.isoDate)}
                                title={`${cell.isoDate}: ${cell.openSlotCount} open`}
                                className={`h-7 rounded-md border text-[10px] font-bold tabular-nums flex items-center justify-center ${
                                  active
                                    ? "bg-[#0A74C9] border-[#0A74C9] text-white cursor-pointer"
                                    : disabled
                                      ? "bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-[#0A74C9] cursor-pointer"
                                }`}
                              >
                                {cell.dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {mergedQuickSlots.map((slot) => (
                          <button
                            key={slot.id || slot.time}
                            type="button"
                            disabled={slot.disabled}
                            data-testid={`chatbot-slot-${slot.time}`}
                            data-slot-status={slot.statusLabel}
                            onClick={() => handleQuickSelectSlot(slot.time)}
                            aria-pressed={slot.isSelectedByCurrent}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold tabular-nums text-left ${
                              slot.disabled
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                                : slot.isSelectedByCurrent
                                  ? "bg-[#0A74C9] border-[#0A74C9] text-white cursor-pointer"
                                  : "bg-white border-slate-200 text-slate-800 cursor-pointer"
                            }`}
                          >
                            <div className="truncate">{slot.label}</div>
                            <div
                              className={`text-[10px] font-normal truncate ${
                                slot.disabled
                                  ? "text-slate-400"
                                  : slot.isSelectedByCurrent
                                    ? "text-sky-100"
                                    : "text-emerald-600"
                              }`}
                            >
                              {slot.statusLabel}
                            </div>
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Full Name"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={quickEmail}
                        onChange={(e) => setQuickEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="Phone (+94...)"
                        value={quickPhone}
                        onChange={(e) => setQuickPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      {quickNote && (
                        <input
                          type="text"
                          placeholder="Visit note"
                          value={quickNote}
                          onChange={(e) => setQuickNote(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs"
                        />
                      )}

                      {quickError && (
                        <div className="text-[11px] font-medium text-[#e60000]">
                          {quickError}
                        </div>
                      )}

                      <button
                        type="submit"
                        data-testid="chatbot-visit-submit"
                        disabled={!quickSubmitState.canBook}
                        className="w-full py-2.5 rounded-xl bg-[#0A74C9] hover:bg-[#0862AD] text-white text-xs font-bold cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {quickSubmitting
                          ? "Booking..."
                          : quickSubmitState.allSlotsReserved
                            ? "All Slots Reserved"
                            : !quickSubmitState.canBook && quickSubmitState.disabledReason
                              ? quickSubmitState.disabledReason
                              : "Book Slot Now"}
                      </button>

                      <Link
                        to="/contact"
                        onClick={() => setIsOpen(false)}
                        className="block text-center text-[11px] font-semibold text-[#0A74C9] no-underline pt-1"
                      >
                        Open Full Google Calendar &amp; Gmail Scheduler →
                      </Link>
                    </form>
                  )}
                </div>
              )}

              {/* In-Card Centered "Send request" Confirmation Modal (Screenshot 3) */}
              <AnimatePresence>
                {showRequestModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="absolute inset-0 z-30 bg-slate-900/30 backdrop-blur-[1.5px] flex items-center justify-center p-4"
                  >
                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="chatbot-send-request-title"
                      data-testid="chatbot-request-modal"
                      initial={{ opacity: 0, scale: 0.94, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="w-full max-w-[316px] rounded-[18px] bg-white p-4 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.35)] border border-slate-100 space-y-3"
                    >
                      <div className="space-y-1">
                        <h3
                          id="chatbot-send-request-title"
                          className="text-[16px] font-bold text-[#111827] leading-tight m-0"
                        >
                          Send request
                        </h3>
                        <p className="text-[12px] text-[#64748B] leading-snug m-0">
                          Send this as a request to{" "}
                          <strong className="font-semibold text-[#111827]">
                            {config.assistantName}
                          </strong>
                          , or turn it into a scheduled site visit.
                        </p>
                      </div>

                      <input
                        type="text"
                        aria-label="Request message"
                        value={requestDraft}
                        onChange={(e) => setRequestDraft(e.target.value)}
                        className="w-full rounded-xl bg-[#F1F5F9] border border-slate-200/80 px-3 py-2.5 text-[12.5px] text-[#14171A] focus:bg-white focus:border-[#0A74C9] focus:outline-none"
                      />

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowRequestModal(false)}
                          className="px-2.5 py-2 rounded-xl border border-[#0A74C9]/45 bg-white hover:bg-slate-50 text-[#111827] text-[11.5px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmSendRequest}
                          className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-[#9DB0FF] hover:bg-[#8BA0FB] text-[#111827] text-[11.5px] font-semibold cursor-pointer border-0 whitespace-nowrap"
                        >
                          Send as request
                        </button>
                        <button
                          type="button"
                          onClick={handleAssignSiteVisitFromRequest}
                          className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-[#0A74C9] hover:bg-[#0862AD] text-white text-[11.5px] font-semibold cursor-pointer border-0 whitespace-nowrap"
                        >
                          Book Visit
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Pinned Floating 3D Speech-Bubble Bot Trigger (unclipped, borderless glow + cursor eyes + turn hover) */}
        <motion.button
          type="button"
          data-testid="floating-chatbot-ball"
          aria-label={
            isOpen ? "Close chatbot" : "Open Innovista 3D assistant"
          }
          aria-expanded={isOpen}
          onMouseEnter={() => setLauncherHovered(true)}
          onMouseLeave={() => setLauncherHovered(false)}
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={isOpen ? { scale: 1.07 } : { scale: 1.09, y: -4 }}
          whileTap={{ scale: 0.94 }}
          className={`pointer-events-auto relative items-center justify-center cursor-pointer transition-all ${
            isOpen
              ? "hidden sm:flex w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white text-slate-700 border border-slate-200/90 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.28)]"
              : "flex w-14 h-14 sm:w-[104px] sm:h-[104px] rounded-full bg-transparent border-0 p-0 overflow-visible"
          }`}
        >
          {isOpen ? (
            <FiX className="text-xl relative z-10" />
          ) : (
            <>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-1 rounded-full blur-md transition-opacity duration-300 bg-[radial-gradient(circle,rgba(56,189,248,0.34)_0%,rgba(192,38,211,0.26)_55%,transparent_75%)] ${
                  launcherHovered ? "opacity-100 scale-110" : "opacity-60"
                }`}
              />
              <Suspense
                fallback={
                  <span className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-fuchsia-600 shadow-md" />
                }
              >
                <Chatbot3DReceptionistAvatar
                  variant="launcher"
                  isHovered={launcherHovered}
                />
              </Suspense>
            </>
          )}
        </motion.button>
      </div>
    </MotionConfig>
  );
}
