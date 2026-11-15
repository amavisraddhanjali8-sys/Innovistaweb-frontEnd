import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiRefreshCw,
  FiSend,
  FiSmartphone,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import { useSiteVisitSlots } from "../Context/SiteVisitSlotContext";
import {
  createGoogleCalendarEvent,
  fetchCalendarBusyEventsForDate,
  getWorkspaceAccessToken,
  initWorkspaceAuth,
  sendGmailConfirmation,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
} from "../services/googleWorkspaceService";
import { buildSmsHref, buildWhatsAppChatUrl } from "../../../shared/chatbotHelpers";
import {
  computeNextOpenSlot,
  evaluateBookingSubmitState,
  mergeCalendarCellsWithLocalState,
  mergeSlotsWithLocalState,
} from "../utils/siteVisitLocalStoreHelpers";
import {
  buildMonthlySiteVisitCalendar,
  computeAvailableSlotsForDate,
  createDefaultSiteVisitSchedule,
  formatIsoDateLocal,
  formatMonthHeading,
  getManagedSiteVisitDates,
  getMonthKeyFromDate,
  shiftMonthKey,
  validateSiteVisitBooking,
  type CalendarBusyRange,
  type MonthlyCalendarCell,
  type SiteVisitBooking,
  type SiteVisitScheduleConfig,
  type SlotAvailabilityItem,
} from "../../../shared/siteVisitSchedulerHelpers";
import GoogleSignInButton from "./GoogleSignInButton";

interface SiteVisitBookingCardProps {
  idPrefix?: string;
  compact?: boolean;
  onBookingComplete?: (booking: SiteVisitBooking) => void;
}

const VISIT_LOCATIONS = [
  "Nawala Showroom (Colombo 05)",
  "Kelaniya Fabrication Plant",
  "Kandy Architectural Showroom",
  "On-Site Project Measurement",
];

export default function SiteVisitBookingCard({
  idPrefix = "site-visit",
  compact = false,
  onBookingComplete,
}: SiteVisitBookingCardProps) {
  const { user } = useAuth();
  const { contactSettings } = useSiteSettings();
  const {
    state: localSlotState,
    setWidgetSelection,
    clearWidgetSelection,
    reserveSlotAndNotify,
  } = useSiteVisitSlots();
  const todayIso = formatIsoDateLocal(new Date());
  const currentMonthKey = getMonthKeyFromDate(todayIso);

  const initialDate =
    getManagedSiteVisitDates(
      createDefaultSiteVisitSchedule(),
      [],
      compact ? 6 : 8
    )[0]?.date || todayIso;

  const [schedule, setSchedule] = useState<SiteVisitScheduleConfig>(() =>
    createDefaultSiteVisitSchedule()
  );
  const [viewMonth, setViewMonth] = useState<string>(() =>
    getMonthKeyFromDate(initialDate)
  );
  const [calendarDays, setCalendarDays] = useState<MonthlyCalendarCell[]>(() =>
    buildMonthlySiteVisitCalendar(
      getMonthKeyFromDate(initialDate),
      createDefaultSiteVisitSchedule(),
      [],
      todayIso
    )
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<SlotAvailabilityItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [locationName, setLocationName] = useState(VISIT_LOCATIONS[0]);
  const [visitorName, setVisitorName] = useState(user?.name || "");
  const [visitorEmail, setVisitorEmail] = useState(user?.email || "");
  const [visitorPhone, setVisitorPhone] = useState(user?.phone || "");
  const [notes, setNotes] = useState("");
  const [syncWithGoogleOnBook, setSyncWithGoogleOnBook] = useState(true);

  // Google Workspace OAuth state (token stored in memory only inside googleWorkspaceService)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState<CalendarBusyRange[]>([]);
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");

  // Form / Booking state
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookedRecord, setBookedRecord] = useState<SiteVisitBooking | null>(null);

  // Mandatory explicit confirmation modal before mutating Google Calendar or sending Gmail
  const [pendingGoogleConfirm, setPendingGoogleConfirm] =
    useState<SiteVisitBooking | null>(null);
  const [executingGoogleSync, setExecutingGoogleSync] = useState(false);
  const [googleSyncResult, setGoogleSyncResult] = useState<{
    calendarId?: string;
    calendarLink?: string;
    emailId?: string;
  } | null>(null);

  useEffect(() => {
    const unsub = initWorkspaceAuth(
      (gUser) => {
        setGoogleEmail(gUser.email || gUser.displayName || "Connected");
      },
      () => {
        setGoogleEmail(null);
      }
    );
    return () => unsub();
  }, []);

  const loadSlots = useCallback(
    async (
      date: string,
      withCalendarBusy = Boolean(getWorkspaceAccessToken()),
      explicitMonth?: string
    ) => {
      if (!date && !explicitMonth) return;
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (explicitMonth) params.set("month", explicitMonth);
        const res = await AxiosConfig.get<{
          monthKey?: string;
          calendarDays?: MonthlyCalendarCell[];
          selectedDate?: string;
          schedule?: SiteVisitScheduleConfig;
          slots?: SlotAvailabilityItem[];
        }>(`/api/site-visits/slots?${params.toString()}`);

        if (res.data?.schedule) {
          setSchedule(res.data.schedule);
        }
        if (Array.isArray(res.data?.calendarDays) && res.data.calendarDays.length > 0) {
          setCalendarDays(res.data.calendarDays);
        }
        if (!date && res.data?.selectedDate) {
          setSelectedDate(res.data.selectedDate);
        }

        const effectiveDate = date || res.data?.selectedDate || "";
        const serverSchedule = res.data?.schedule || schedule;
        let nextSlots =
          res.data?.slots ||
          computeAvailableSlotsForDate(effectiveDate, [], [], [], serverSchedule);

        if (withCalendarBusy && getWorkspaceAccessToken() && effectiveDate) {
          try {
            const busy = await fetchCalendarBusyEventsForDate(effectiveDate);
            setCalendarBusy(busy);
            const blockedFromServer = nextSlots
              .filter((s) => !s.available && s.reason === "Blocked")
              .map((s) => `${effectiveDate}|${s.time}`);
            const bookedFromServer: SiteVisitBooking[] = nextSlots
              .filter((s) => !s.available && s.reason === "Booked")
              .map((s) => ({
                id: s.time,
                date: effectiveDate,
                slotTime: s.time,
                slotLabel: s.label,
                locationName: "",
                visitorName: "",
                visitorEmail: "",
                visitorPhone: "",
                notes: "",
                status: "CONFIRMED",
                createdAt: "",
              }));
            nextSlots = computeAvailableSlotsForDate(
              effectiveDate,
              bookedFromServer,
              blockedFromServer,
              busy,
              serverSchedule
            );
          } catch (calErr) {
            setWorkspaceError(
              calErr instanceof Error ? calErr.message : "Could not read Calendar."
            );
          }
        }

        setSlots(nextSlots);
        setSelectedSlot((prev) => {
          const stillOpen = nextSlots.find((s) => s.time === prev && s.available);
          if (stillOpen) return prev;
          return nextSlots.find((s) => s.available)?.time || "";
        });
      } catch {
        if (date) {
          const fallbackSlots = computeAvailableSlotsForDate(date, [], [], [], schedule);
          setSlots(fallbackSlots);
          setSelectedSlot(fallbackSlots.find((s) => s.available)?.time || "");
        }
      } finally {
        setLoadingSlots(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const mergedCalendarDays = useMemo(
    () => mergeCalendarCellsWithLocalState(calendarDays, localSlotState),
    [calendarDays, localSlotState]
  );

  const mergedSlots = useMemo(
    () =>
      mergeSlotsWithLocalState(
        slots,
        selectedDate,
        localSlotState,
        idPrefix,
        selectedSlot
      ),
    [slots, selectedDate, localSlotState, idPrefix, selectedSlot]
  );

  useEffect(() => {
    const nextOpen = computeNextOpenSlot(mergedSlots, selectedSlot);
    if (nextOpen !== selectedSlot) {
      setSelectedSlot(nextOpen);
    }
  }, [mergedSlots, selectedSlot]);

  useEffect(() => {
    return () => {
      clearWidgetSelection(idPrefix);
    };
  }, [idPrefix, clearWidgetSelection]);

  useEffect(() => {
    loadSlots(selectedDate, Boolean(getWorkspaceAccessToken()), viewMonth);
  }, [selectedDate, viewMonth, loadSlots]);

  const handleSelectDate = (isoDate: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
    clearWidgetSelection(idPrefix);
    setSelectedDate(isoDate);
    setViewMonth(getMonthKeyFromDate(isoDate));
  };

  const handleSelectTimeSlot = (slotTime: string) => {
    setSelectedSlot(slotTime);
    setWidgetSelection(idPrefix, selectedDate, slotTime);
  };

  const handleShiftMonth = async (delta: number) => {
    const nextMonth = shiftMonthKey(viewMonth, delta);
    if (nextMonth < currentMonthKey) return;
    setViewMonth(nextMonth);
    setLoadingSlots(true);
    try {
      const res = await AxiosConfig.get<{
        calendarDays?: MonthlyCalendarCell[];
        selectedDate?: string;
        schedule?: SiteVisitScheduleConfig;
        slots?: SlotAvailabilityItem[];
      }>(`/api/site-visits/slots?month=${encodeURIComponent(nextMonth)}`);
      if (res.data?.schedule) setSchedule(res.data.schedule);
      if (Array.isArray(res.data?.calendarDays) && res.data.calendarDays.length > 0) {
        setCalendarDays(res.data.calendarDays);
      }
      if (res.data?.selectedDate) {
        setSelectedDate(res.data.selectedDate);
      }
      if (Array.isArray(res.data?.slots)) {
        setSlots(res.data.slots);
        setSelectedSlot(res.data.slots.find((s) => s.available)?.time || "");
      }
    } catch {
      const fallbackDays = buildMonthlySiteVisitCalendar(nextMonth, schedule, [], todayIso);
      setCalendarDays(fallbackDays);
      const firstValid =
        fallbackDays.find((c) => c.isCurrentMonth && !c.isPast && c.available)?.isoDate ||
        fallbackDays.find((c) => c.isCurrentMonth && !c.isPast)?.isoDate ||
        `${nextMonth}-01`;
      setSelectedDate(firstValid);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setWorkspaceError("");
    try {
      const { user: gUser } = await signInWithGoogleWorkspace();
      const label = gUser.email || gUser.displayName || "Google Account";
      setGoogleEmail(label);
      if (!visitorEmail && gUser.email) setVisitorEmail(gUser.email);
      if (!visitorName && gUser.displayName) setVisitorName(gUser.displayName);
      setWorkspaceStatus(`Synced calendar slots for ${label}`);
      await loadSlots(selectedDate, true);
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : "Google Sign-In was cancelled."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleWorkspace();
    setGoogleEmail(null);
    setCalendarBusy([]);
    setWorkspaceStatus("");
    await loadSlots(selectedDate, false);
  };

  const submitState = evaluateBookingSubmitState(
    mergedSlots,
    selectedSlot,
    submitting
  );

  const validationErrors = validateSiteVisitBooking({
    date: selectedDate,
    slotTime: selectedSlot,
    visitorName,
    visitorEmail,
    visitorPhone,
  });
  const isValid = Object.keys(validationErrors).length === 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttempted(true);
    setSubmitError("");
    if (!isValid || !submitState.canBook) return;

    setSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        data: SiteVisitBooking;
        slots?: SlotAvailabilityItem[];
        calendarDays?: MonthlyCalendarCell[];
      }>("/api/site-visits", {
        date: selectedDate,
        slotTime: selectedSlot,
        locationName,
        visitorName,
        visitorEmail,
        visitorPhone,
        notes,
      });

      const created = res.data.data;
      setBookedRecord(created);
      reserveSlotAndNotify(created, { showToast: true });
      clearWidgetSelection(idPrefix);
      if (Array.isArray(res.data.calendarDays)) {
        setCalendarDays(res.data.calendarDays);
      }
      if (res.data.slots) {
        setSlots(res.data.slots);
      } else {
        await loadSlots(selectedDate, Boolean(getWorkspaceAccessToken()), viewMonth);
      }
      onBookingComplete?.(created);

      // If user opted in and is signed into Google, open explicit confirmation modal
      if (syncWithGoogleOnBook && getWorkspaceAccessToken()) {
        setPendingGoogleConfirm(created);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not reserve this slot. Please try another.";
      setSubmitError(msg);
      await loadSlots(selectedDate);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCalendarAndGmail = async () => {
    if (!pendingGoogleConfirm) return;
    setExecutingGoogleSync(true);
    setWorkspaceError("");
    try {
      const booking = pendingGoogleConfirm;
      const calRes = await createGoogleCalendarEvent({
        date: booking.date,
        slotTime: booking.slotTime,
        visitorName: booking.visitorName,
        visitorEmail: booking.visitorEmail,
        visitorPhone: booking.visitorPhone,
        locationName: booking.locationName,
        notes: booking.notes,
        companyEmail: contactSettings.email,
      });

      const emailBody = [
        `Hello ${booking.visitorName},`,
        "",
        `Your site visit with Innovista Fabriconix is confirmed.`,
        `Reference: ${booking.id}`,
        `Date: ${booking.date}`,
        `Time Slot: ${booking.slotLabel} (Asia/Colombo)`,
        `Location: ${booking.locationName}`,
        `Contact Phone: ${booking.visitorPhone}`,
        booking.notes ? `Notes: ${booking.notes}` : "",
        "",
        `Need changes? Reply to this email or WhatsApp ${contactSettings.phone}.`,
      ]
        .filter(Boolean)
        .join("\n");

      const mailRes = await sendGmailConfirmation({
        to: booking.visitorEmail,
        cc: contactSettings.email,
        subject: `Site Visit Confirmed (${booking.id}) — ${booking.date} at ${booking.slotLabel}`,
        bodyText: emailBody,
      });

      await AxiosConfig.patch(`/api/site-visits/${booking.id}`, {
        calendarEventId: calRes.id,
        emailSent: true,
      });

      setGoogleSyncResult({
        calendarId: calRes.id,
        calendarLink: calRes.htmlLink,
        emailId: mailRes.id,
      });
      setBookedRecord((prev) =>
        prev ? { ...prev, calendarEventId: calRes.id, emailSent: true } : prev
      );
      setPendingGoogleConfirm(null);
      setWorkspaceStatus("Google Calendar event created & Gmail confirmation sent.");
      await loadSlots(booking.date, true);
    } catch (err) {
      setWorkspaceError(
        err instanceof Error
          ? err.message
          : "Google Calendar or Gmail action failed."
      );
    } finally {
      setExecutingGoogleSync(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-orange-100/90 bg-[#FEF6F0] focus:bg-white focus:border-[#22577A] focus:outline-none text-xs sm:text-sm text-[#14171A] placeholder:text-[#8E8A87] transition-colors";

  if (bookedRecord) {
    const summaryText = `Site Visit ${bookedRecord.id}: ${bookedRecord.date} (${bookedRecord.slotLabel}) at ${bookedRecord.locationName} — ${bookedRecord.visitorName} (${bookedRecord.visitorPhone})`;
    const waHref = buildWhatsAppChatUrl(
      contactSettings.whatsapp,
      summaryText,
      "Site Visit Confirmed:"
    );
    const smsHref = buildSmsHref(contactSettings.phone, summaryText);

    return (
      <div className="space-y-4 py-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <FiCheckCircle className="text-xl" />
          </div>
          <h3 className="text-base font-bold text-[#14171A] m-0">
            Slot Reserved · {bookedRecord.id}
          </h3>
          <div className="text-xs font-semibold text-[#22577A] tabular-nums">
            {bookedRecord.date} · {bookedRecord.slotLabel} · {bookedRecord.locationName}
          </div>
          {googleSyncResult && (
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-emerald-700">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200">
                <FiCalendar /> Calendar Added
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200">
                <FiMail /> Gmail Sent
              </span>
            </div>
          )}
        </div>

        {/* Google Calendar + Gmail Trigger */}
        {!googleSyncResult && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            {googleEmail ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 truncate">
                  Google: {googleEmail}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingGoogleConfirm(bookedRecord)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer border-0 whitespace-nowrap"
                >
                  <FiCalendar />
                  <span>Add to Calendar &amp; Send Email</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">
                  Sync to Google Calendar &amp; Gmail
                </span>
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  loading={googleLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Direct Phone SMS & Company WhatsApp Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold no-underline transition-colors"
          >
            <FiMessageCircle className="text-sm" />
            <span>Send to Company WhatsApp</span>
          </a>
          <a
            href={smsHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-[#14171A] text-xs font-bold no-underline transition-colors"
          >
            <FiSmartphone className="text-sm text-[#22577A]" />
            <span>Direct SMS to Phone</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => {
            setBookedRecord(null);
            setGoogleSyncResult(null);
            setNotes("");
            setAttempted(false);
          }}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
        >
          Book Another Slot
        </button>

        {/* Mandatory Explicit Confirmation Dialog */}
        {pendingGoogleConfirm && (
          <GoogleWorkspaceConfirmModal
            booking={pendingGoogleConfirm}
            companyEmail={contactSettings.email}
            loading={executingGoogleSync}
            error={workspaceError}
            onConfirm={handleConfirmCalendarAndGmail}
            onCancel={() => setPendingGoogleConfirm(null)}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
      {/* Top Google Calendar Sync Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-[#F8FAFC] px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <FiCalendar className="text-[#22577A] shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate">
            {googleEmail
              ? `Google Synced: ${googleEmail}${
                  calendarBusy.length > 0 ? ` (${calendarBusy.length} busy)` : ""
                }`
              : "Google Calendar & Gmail Sync"}
          </span>
        </div>

        {googleEmail ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => loadSlots(selectedDate, true)}
              aria-label="Refresh Google Calendar availability"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-slate-600 cursor-pointer"
            >
              <FiRefreshCw className={`text-xs ${loadingSlots ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleGoogleSignOut}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:text-[#E60000] cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={googleLoading}
          />
        )}
      </div>

      {workspaceStatus && !workspaceError && (
        <div className="text-[11px] font-medium text-emerald-700 px-1">
          {workspaceStatus}
        </div>
      )}
      {workspaceError && (
        <div role="alert" className="text-[11px] font-medium text-[#e60000] px-1">
          {workspaceError}
        </div>
      )}

      {/* Location Selector */}
      <div>
        <label htmlFor={`${idPrefix}-location`} className="sr-only">
          Visit Location
        </label>
        <div className="relative">
          <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#22577A] text-xs pointer-events-none" />
          <select
            id={`${idPrefix}-location`}
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className={`${inputClass} pl-9`}
          >
            {VISIT_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Calendar Date Picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleShiftMonth(-1)}
              disabled={viewMonth <= currentMonthKey}
              aria-label="Previous month"
              className="w-7 h-7 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:border-[#22577A] text-slate-700 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="text-sm" />
            </button>
            <span
              data-testid={`${idPrefix}-month-heading`}
              className="text-xs sm:text-sm font-bold text-[#14171A] px-1 tabular-nums"
            >
              {formatMonthHeading(viewMonth)}
            </span>
            <button
              type="button"
              onClick={() => handleShiftMonth(1)}
              aria-label="Next month"
              className="w-7 h-7 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:border-[#22577A] text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <FiChevronRight className="text-sm" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor={`${idPrefix}-date-jump`} className="text-[11px] font-semibold text-slate-500">
              Date:
            </label>
            <input
              id={`${idPrefix}-date-jump`}
              type="date"
              min={todayIso}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) handleSelectDate(e.target.value);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-[#FEF6F0] focus:bg-white focus:border-[#22577A] text-[11px] font-bold text-[#14171A] tabular-nums"
            />
          </div>
        </div>

        {/* 7-Column Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
            <div
              key={wd}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-0.5"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Interactive Calendar Cells */}
        <div className="grid grid-cols-7 gap-1">
          {mergedCalendarDays.map((cell, idx) => {
            if (!cell.isCurrentMonth || !cell.isoDate) {
              return <div key={`pad-${idx}`} aria-hidden="true" className="h-11 sm:h-12" />;
            }
            const active = cell.isoDate === selectedDate;
            const disabled = cell.isPast || !cell.available;
            const statusHint = cell.isPast
              ? "Past date"
              : !cell.available
                ? "Closed"
                : cell.openSlotCount === 0
                  ? "Fully reserved"
                  : `${cell.openSlotCount} slots open`;

            return (
              <button
                key={cell.isoDate}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectDate(cell.isoDate)}
                aria-pressed={active}
                aria-label={`${cell.isoDate}, ${statusHint}`}
                title={`${cell.isoDate} — ${statusHint}`}
                className={`h-11 sm:h-12 rounded-xl border px-0.5 flex flex-col items-center justify-center transition-all ${
                  active
                    ? "bg-[#22577A] border-[#22577A] text-white shadow-xs cursor-pointer"
                    : disabled
                      ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                      : cell.openSlotCount === 0
                        ? "bg-amber-50/70 border-amber-200 text-amber-700 hover:border-[#22577A] cursor-pointer"
                        : "bg-white border-slate-200 text-[#14171A] hover:border-[#3393B8] hover:bg-sky-50/40 cursor-pointer"
                }`}
              >
                <span className="text-xs font-bold tabular-nums leading-none">
                  {cell.dayNum}
                </span>
                <span
                  className={`text-[9px] font-semibold leading-none mt-1 tabular-nums ${
                    active
                      ? "text-sky-100"
                      : cell.isPast
                        ? "text-slate-300"
                        : !cell.available
                          ? "text-red-400"
                          : cell.openSlotCount === 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                  }`}
                >
                  {cell.isPast
                    ? "—"
                    : !cell.available
                      ? "Closed"
                      : cell.openSlotCount === 0
                        ? "Full"
                        : `${cell.openSlotCount} open`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Time Slots */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Available Slots
          </span>
          <span className="text-[11px] font-medium text-[#22577A] tabular-nums">
            {mergedSlots.filter((s) => !s.disabled).length} open
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mergedSlots.map((slot) => {
            const active = slot.isSelectedByCurrent;
            return (
              <motion.button
                key={slot.time}
                type="button"
                disabled={slot.disabled}
                data-testid={`${idPrefix}-slot-${slot.time}`}
                data-slot-status={slot.statusLabel}
                onClick={() => handleSelectTimeSlot(slot.time)}
                whileTap={!slot.disabled ? { scale: 0.97 } : undefined}
                aria-pressed={active}
                className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                  slot.disabled
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                    : active
                      ? "bg-gradient-to-r from-[#22577A] to-[#3393B8] border-[#22577A] text-white cursor-pointer shadow-xs"
                      : "bg-white border-slate-200 hover:border-[#3393B8] text-[#14171A] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-1 text-xs font-bold tabular-nums">
                  <FiClock className="text-[11px] shrink-0" />
                  <span>{slot.label}</span>
                </div>
                <div
                  className={`text-[10px] font-medium mt-0.5 truncate ${
                    slot.disabled
                      ? "text-slate-400"
                      : active
                        ? "text-sky-100"
                        : "text-emerald-600"
                  }`}
                >
                  {slot.statusLabel}
                </div>
              </motion.button>
            );
          })}
        </div>
        {attempted && validationErrors.slotTime && (
          <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
            {validationErrors.slotTime}
          </p>
        )}
      </div>

      {/* Visitor Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="sr-only">
            Full Name
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            placeholder="Full Name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            className={inputClass}
          />
          {attempted && validationErrors.visitorName && (
            <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
              {validationErrors.visitorName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${idPrefix}-phone`} className="sr-only">
            Phone Number
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            placeholder="Phone (+94...)"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            className={inputClass}
          />
          {attempted && validationErrors.visitorPhone && (
            <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
              {validationErrors.visitorPhone}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-email`} className="sr-only">
            Email Address
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            placeholder="Email Address"
            value={visitorEmail}
            onChange={(e) => setVisitorEmail(e.target.value)}
            className={inputClass}
          />
          {attempted && validationErrors.visitorEmail && (
            <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
              {validationErrors.visitorEmail}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${idPrefix}-notes`} className="sr-only">
            Site Notes
          </label>
          <input
            id={`${idPrefix}-notes`}
            type="text"
            placeholder="Project / Measurement Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {googleEmail && (
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncWithGoogleOnBook}
            onChange={(e) => setSyncWithGoogleOnBook(e.target.checked)}
            className="rounded border-slate-300 text-[#22577A]"
          />
          <span>Prompt to add Google Calendar event &amp; send Gmail confirmation</span>
        </label>
      )}

      {submitError && (
        <p role="alert" className="text-xs font-medium text-[#e60000] m-0">
          {submitError}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          type="submit"
          data-testid={`${idPrefix}-submit`}
          disabled={!submitState.canBook}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F97316] hover:brightness-105 text-white text-xs sm:text-sm font-bold shadow-[0_12px_26px_-10px_rgba(234,88,12,0.55)] cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
        >
          <FiSend className="text-sm" />
          <span>
            {submitting
              ? "Booking Slot..."
              : submitState.allSlotsReserved
                ? "All Slots Reserved"
                : !submitState.canBook && submitState.disabledReason
                  ? submitState.disabledReason
                  : "Confirm Site Visit"}
          </span>
        </button>

        <a
          href={buildSmsHref(
            contactSettings.phone,
            `Site visit inquiry for ${selectedDate} (${selectedSlot || "open slot"}) — ${visitorName || "Client"}`
          )}
          className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-[#14171A] text-xs font-bold no-underline whitespace-nowrap"
        >
          <FiSmartphone className="text-sm text-[#22577A]" />
          <span>Text Phone</span>
        </a>
      </div>

      {pendingGoogleConfirm && (
        <GoogleWorkspaceConfirmModal
          booking={pendingGoogleConfirm}
          companyEmail={contactSettings.email}
          loading={executingGoogleSync}
          error={workspaceError}
          onConfirm={handleConfirmCalendarAndGmail}
          onCancel={() => setPendingGoogleConfirm(null)}
        />
      )}
    </form>
  );
}

interface GoogleWorkspaceConfirmModalProps {
  booking: SiteVisitBooking;
  companyEmail: string;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function GoogleWorkspaceConfirmModal({
  booking,
  companyEmail,
  loading,
  error,
  onConfirm,
  onCancel,
}: GoogleWorkspaceConfirmModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-sync-confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#22577A] flex items-center justify-center shrink-0">
            <FiCalendar className="text-lg" />
          </div>
          <div>
            <h4
              id="google-sync-confirm-title"
              className="text-sm font-bold text-[#14171A] m-0"
            >
              Confirm Google Calendar &amp; Gmail Send
            </h4>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              Review before adding this event and sending confirmation email.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] border border-slate-200/80 p-3 space-y-1.5 text-xs text-slate-700">
          <div>
            <span className="font-semibold text-slate-900">Event:</span>{" "}
            Innovista Site Visit — {booking.visitorName}
          </div>
          <div className="tabular-nums">
            <span className="font-semibold text-slate-900">When:</span>{" "}
            {booking.date} · {booking.slotLabel} (Asia/Colombo)
          </div>
          <div>
            <span className="font-semibold text-slate-900">Location:</span>{" "}
            {booking.locationName}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Email To:</span>{" "}
            {booking.visitorEmail} (CC: {companyEmail})
          </div>
        </div>

        {error && (
          <div role="alert" className="text-xs font-medium text-[#e60000]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold cursor-pointer disabled:opacity-60 border-0"
          >
            {loading ? "Syncing..." : "Confirm & Send"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
