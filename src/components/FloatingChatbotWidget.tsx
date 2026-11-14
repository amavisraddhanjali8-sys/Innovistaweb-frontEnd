import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  FiCalendar,
  FiMessageCircle,
  FiMessageSquare,
  FiSend,
  FiSmartphone,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AxiosConfig from "../Context/AxiosConfig";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import {
  DEFAULT_CHATBOT_CONFIG,
  buildSmsHref,
  buildWhatsAppChatUrl,
  type ChatbotConfig,
} from "../utils/chatbotHelpers";
import {
  getUpcomingSiteVisitDates,
  type SlotAvailabilityItem,
} from "../utils/siteVisitSchedulerHelpers";

interface ChatMessageItem {
  id: string;
  role: "assistant" | "user";
  text: string;
  intent?: string;
  whatsappUrl?: string;
  smsUrl?: string;
}

export default function FloatingChatbotWidget() {
  const { contactSettings } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "visit">("chat");
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: DEFAULT_CHATBOT_CONFIG.welcomeMessage,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  // Quick Site Visit Tab State
  const upcomingDates = getUpcomingSiteVisitDates(4);
  const [quickDate, setQuickDate] = useState(upcomingDates[0]?.date || "");
  const [quickSlots, setQuickSlots] = useState<SlotAvailabilityItem[]>([]);
  const [quickSlot, setQuickSlot] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickError, setQuickError] = useState("");
  const [quickBookingDone, setQuickBookingDone] = useState<string | null>(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ config?: ChatbotConfig }>("/api/chatbot/config")
      .then((res) => {
        if (!active || !res.data?.config) return;
        setConfig(res.data.config);
        setMessages((prev) =>
          prev.length === 1 && prev[0].id === "welcome-1"
            ? [{ ...prev[0], text: res.data.config!.welcomeMessage }]
            : prev
        );
      })
      .catch(() => {
        // Keep clean defaults
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen && tab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== "visit" || !quickDate) return;
    AxiosConfig.get<{ slots?: SlotAvailabilityItem[] }>(
      `/api/site-visits/slots?date=${encodeURIComponent(quickDate)}`
    )
      .then((res) => {
        const list = res.data?.slots || [];
        setQuickSlots(list);
        const firstOpen = list.find((s) => s.available)?.time || "";
        setQuickSlot((prev) =>
          list.some((s) => s.time === prev && s.available) ? prev : firstOpen
        );
      })
      .catch(() => {});
  }, [isOpen, tab, quickDate]);

  if (!config.enabled) return null;

  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.text || inputValue;
  const globalWhatsappUrl = buildWhatsAppChatUrl(
    contactSettings.whatsapp,
    latestUserMessage,
    config.defaultWhatsappPrefix
  );
  const globalSmsUrl = buildSmsHref(contactSettings.phone, latestUserMessage);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputValue("");
    setSending(true);

    try {
      const res = await AxiosConfig.post<{
        reply: string;
        intent?: string;
        whatsappUrl?: string;
        smsUrl?: string;
      }>("/api/chatbot/ask", {
        message: trimmed,
        history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });

      const assistantMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: res.data.reply,
        intent: res.data.intent,
        whatsappUrl: res.data.whatsappUrl,
        smsUrl: res.data.smsUrl,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "assistant",
          text: `Reach us directly on WhatsApp (${contactSettings.phone}) for immediate assistance.`,
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

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickVisitBook = async (e: FormEvent) => {
    e.preventDefault();
    setQuickError("");
    if (!quickDate || !quickSlot || !quickName.trim() || !quickEmail.trim() || !quickPhone.trim()) {
      setQuickError("Fill name, email, phone & slot.");
      return;
    }
    setQuickSubmitting(true);
    try {
      const res = await AxiosConfig.post<{ data: { id: string; slotLabel: string } }>(
        "/api/site-visits",
        {
          date: quickDate,
          slotTime: quickSlot,
          visitorName: quickName,
          visitorEmail: quickEmail,
          visitorPhone: quickPhone,
          locationName: "Nawala Showroom / Client Site",
          notes: "Booked via Chatbot",
        }
      );
      setQuickBookingDone(`${res.data.data.id} · ${quickDate} (${res.data.data.slotLabel})`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Slot unavailable. Pick another.";
      setQuickError(msg);
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid="floating-chatbot-root"
        className="fixed right-4 sm:right-6 bottom-20 md:bottom-6 z-[70] flex flex-col items-end gap-3 pointer-events-none"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.section
              aria-label={config.assistantName}
              data-testid="floating-chatbot-panel"
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-[24px] bg-white border border-slate-200/90 shadow-[0_24px_60px_-15px_rgba(20,23,26,0.34)] overflow-hidden flex flex-col max-h-[min(540px,calc(100vh-8rem))]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#18415C] via-[#22577A] to-[#3393B8] px-4 py-3 text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center shrink-0">
                    <FiMessageSquare className="text-sm text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold truncate leading-tight">
                      {config.assistantName}
                    </div>
                    <div className="text-[10px] text-sky-100/90 truncate">
                      Innovista · WhatsApp &amp; Booking
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={globalWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open WhatsApp chat"
                    title={config.whatsappTriggerLabel}
                    className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center no-underline transition-colors shadow-xs"
                  >
                    <FaWhatsapp className="text-sm" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close chatbot"
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer border-0 transition-colors"
                  >
                    <FiX className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Compact Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1.5 bg-[#F8FAFC] border-b border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setTab("chat")}
                  className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer border-0 transition-colors flex items-center justify-center gap-1.5 ${
                    tab === "chat"
                      ? "bg-white text-[#22577A] shadow-xs"
                      : "bg-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FiMessageCircle className="text-xs" />
                  <span>Ask Assistant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("visit")}
                  className={`py-1.5 rounded-xl text-xs font-bold cursor-pointer border-0 transition-colors flex items-center justify-center gap-1.5 ${
                    tab === "visit"
                      ? "bg-white text-[#22577A] shadow-xs"
                      : "bg-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FiCalendar className="text-xs" />
                  <span>Site Visit Slots</span>
                </button>
              </div>

              {tab === "chat" ? (
                <>
                  {/* Messages Scroll Container */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-white">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user";
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
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                              isUser
                                ? "bg-gradient-to-r from-[#22577A] to-[#3393B8] text-white rounded-br-xs"
                                : "bg-[#F4F7FA] text-[#14171A] border border-slate-200/70 rounded-bl-xs"
                            }`}
                          >
                            {msg.text}
                          </div>

                          {/* Contextual Action Pills */}
                          {!isUser &&
                            (msg.intent === "visit" ||
                              msg.intent === "whatsapp" ||
                              msg.intent === "sms" ||
                              msg.intent === "quote" ||
                              config.autoSuggestWhatsapp) &&
                            msg.id !== "welcome-1" && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {msg.intent === "visit" && (
                                  <button
                                    type="button"
                                    onClick={() => setTab("visit")}
                                    className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#22577A] text-[11px] font-semibold cursor-pointer"
                                  >
                                    Pick Slot
                                  </button>
                                )}
                                {msg.intent === "quote" && (
                                  <Link
                                    to="/request-quote"
                                    onClick={() => setIsOpen(false)}
                                    className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[#EA580C] text-[11px] font-semibold no-underline"
                                  >
                                    Request Quote
                                  </Link>
                                )}
                                {msg.whatsappUrl && (
                                  <a
                                    href={msg.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold no-underline"
                                  >
                                    <FaWhatsapp className="text-xs" />
                                    <span>{config.whatsappTriggerLabel}</span>
                                  </a>
                                )}
                                {msg.smsUrl && (
                                  <a
                                    href={msg.smsUrl}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold no-underline"
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

                    {sending && (
                      <div className="flex items-start">
                        <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-[#F4F7FA] border border-slate-200/70 flex items-center gap-1">
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#22577A]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#22577A]"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: 0.4 }}
                            className="w-1.5 h-1.5 rounded-full bg-[#22577A]"
                          />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Prompts */}
                  <div className="px-3.5 py-2 border-t border-slate-100 bg-[#FAFCFE] flex items-center gap-1.5 overflow-x-auto">
                    {config.quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          if (prompt.toLowerCase().includes("whatsapp")) {
                            window.open(globalWhatsappUrl, "_blank", "noopener,noreferrer");
                          } else {
                            sendMessage(prompt);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] font-semibold text-[#22577A] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Input & Direct Company WhatsApp + SMS Bar */}
                  <div className="p-3 border-t border-slate-200/80 bg-white space-y-2">
                    <form onSubmit={handleChatSubmit} className="flex items-center gap-1.5">
                      <label htmlFor="floating-chatbot-input" className="sr-only">
                        Ask a question
                      </label>
                      <input
                        id="floating-chatbot-input"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white focus:border-[#22577A] focus:outline-none text-xs text-[#14171A]"
                      />
                      <button
                        type="submit"
                        disabled={sending || !inputValue.trim()}
                        aria-label="Send message"
                        className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#22577A] to-[#3393B8] text-white flex items-center justify-center cursor-pointer border-0 disabled:opacity-50 shrink-0"
                      >
                        <FiSend className="text-xs" />
                      </button>
                    </form>

                    <div className="grid grid-cols-2 gap-1.5">
                      <a
                        href={globalWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold no-underline transition-colors"
                      >
                        <FaWhatsapp className="text-xs shrink-0" />
                        <span className="truncate">{config.whatsappTriggerLabel}</span>
                      </a>
                      <a
                        href={globalSmsUrl}
                        className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-[#14171A] text-[11px] font-bold no-underline transition-colors"
                      >
                        <FiSmartphone className="text-xs text-[#22577A] shrink-0" />
                        <span className="truncate">Direct SMS</span>
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                /* Quick Site Visit Slot Booking Inside Chatbot */
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-white">
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
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold no-underline"
                        >
                          <FaWhatsapp /> <span>Share on WhatsApp</span>
                        </a>
                        <Link
                          to="/contact"
                          onClick={() => setIsOpen(false)}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#22577A] no-underline"
                        >
                          Sync with Google Calendar
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleQuickVisitBook} className="space-y-2.5">
                      <div className="grid grid-cols-4 gap-1">
                        {upcomingDates.map((d) => (
                          <button
                            key={d.date}
                            type="button"
                            onClick={() => setQuickDate(d.date)}
                            className={`py-1.5 rounded-lg border text-center cursor-pointer text-[11px] font-bold ${
                              quickDate === d.date
                                ? "bg-[#22577A] border-[#22577A] text-white"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <div>{d.dayShort}</div>
                            <div className="tabular-nums">{d.dayNum}</div>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {quickSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setQuickSlot(slot.time)}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold tabular-nums ${
                              !slot.available
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                : quickSlot === slot.time
                                  ? "bg-[#3393B8] border-[#3393B8] text-white cursor-pointer"
                                  : "bg-white border-slate-200 text-slate-800 cursor-pointer"
                            }`}
                          >
                            {slot.label}
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

                      {quickError && (
                        <div className="text-[11px] font-medium text-[#e60000]">
                          {quickError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={quickSubmitting || !quickSlot}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F97316] text-white text-xs font-bold cursor-pointer border-0 disabled:opacity-50"
                      >
                        {quickSubmitting ? "Booking..." : "Book Slot Now"}
                      </button>

                      <Link
                        to="/contact"
                        onClick={() => setIsOpen(false)}
                        className="block text-center text-[11px] font-semibold text-[#22577A] no-underline pt-1"
                      >
                        Open Full Google Calendar &amp; Gmail Scheduler →
                      </Link>
                    </form>
                  )}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Pinned Floating Right-Side Animated Chatbot Ball (hit target stays fixed for reliable clicks) */}
        <motion.button
          type="button"
          data-testid="floating-chatbot-ball"
          aria-label={isOpen ? "Close chatbot" : "Open Innovista chatbot"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.94 }}
          className="pointer-events-auto relative w-14 h-14 rounded-full bg-gradient-to-br from-[#18415C] via-[#22577A] to-[#0EA5E9] text-white border-2 border-white/85 shadow-[0_14px_30px_-6px_rgba(34,87,122,0.65)] flex items-center justify-center cursor-pointer"
        >
          {/* Ambient orbital halo */}
          {!isOpen && (
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.32, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-[#38BDF8] pointer-events-none"
            />
          )}
          <motion.span
            animate={isOpen ? { y: 0 } : { y: [0, -2.5, 0] }}
            transition={
              isOpen
                ? { duration: 0.2 }
                : { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
            }
            className="relative z-10 flex items-center justify-center"
          >
            {isOpen ? (
              <FiX className="text-xl" />
            ) : (
              <FiMessageSquare className="text-xl" />
            )}
          </motion.span>
        </motion.button>
      </div>
    </MotionConfig>
  );
}
