import { useCallback, useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCheckCircle,
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
import {
  createGoogleCalendarEvent,
  fetchCalendarBusyEventsForDate,
  getWorkspaceAccessToken,
  initWorkspaceAuth,
  sendGmailConfirmation,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
} from "../services/googleWorkspaceService";
import { buildSmsHref, buildWhatsAppChatUrl } from "../utils/chatbotHelpers";
import {
  computeAvailableSlotsForDate,
  getUpcomingSiteVisitDates,
  validateSiteVisitBooking,
  type CalendarBusyRange,
  type SiteVisitBooking,
  type SlotAvailabilityItem,
} from "../utils/siteVisitSchedulerHelpers";
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

  const dates = getUpcomingSiteVisitDates(compact ? 6 : 8);
  const [selectedDate, setSelectedDate] = useState(dates[0]?.date || "");
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
    async (date: string, withCalendarBusy = Boolean(getWorkspaceAccessToken())) => {
      if (!date) return;
      setLoadingSlots(true);
      try {
        const res = await AxiosConfig.get<{ slots?: SlotAvailabilityItem[] }>(
          `/api/site-visits/slots?date=${encodeURIComponent(date)}`
        );
        let nextSlots = res.data?.slots || computeAvailableSlotsForDate(date, []);

        if (withCalendarBusy && getWorkspaceAccessToken()) {
          try {
            const busy = await fetchCalendarBusyEventsForDate(date);
            setCalendarBusy(busy);
            const blockedFromServer = nextSlots
              .filter((s) => !s.available && s.reason === "Blocked")
              .map((s) => `${date}|${s.time}`);
            const bookedFromServer: SiteVisitBooking[] = nextSlots
              .filter((s) => !s.available && s.reason === "Booked")
              .map((s) => ({
                id: s.time,
                date,
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
              date,
              bookedFromServer,
              blockedFromServer,
              busy
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
        const fallbackSlots = computeAvailableSlotsForDate(date, []);
        setSlots(fallbackSlots);
        setSelectedSlot(fallbackSlots[0]?.time || "");
      } finally {
        setLoadingSlots(false);
      }
    },
    []
  );

  useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

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
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        data: SiteVisitBooking;
        slots?: SlotAvailabilityItem[];
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
      if (res.data.slots) {
        setSlots(res.data.slots);
      } else {
        await loadSlots(selectedDate);
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

      {/* Date Strip */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Select Date
          </span>
          <span className="text-[11px] font-medium text-slate-400 tabular-nums">
            {selectedDate}
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {dates.map((d) => {
            const active = d.date === selectedDate;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                aria-pressed={active}
                className={`relative py-2 px-1 rounded-xl border text-center cursor-pointer transition-all ${
                  active
                    ? "bg-[#22577A] border-[#22577A] text-white shadow-xs"
                    : "bg-white border-slate-200 text-[#14171A] hover:border-[#3393B8]"
                }`}
              >
                <div
                  className={`text-[10px] font-semibold uppercase ${
                    active ? "text-sky-100" : "text-slate-400"
                  }`}
                >
                  {d.dayShort}
                </div>
                <div className="text-sm font-bold tabular-nums leading-tight">
                  {d.dayNum}
                </div>
                <div
                  className={`text-[10px] ${
                    active ? "text-sky-100" : "text-slate-400"
                  }`}
                >
                  {d.monthShort}
                </div>
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
            {slots.filter((s) => s.available).length} open
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const active = selectedSlot === slot.time && slot.available;
            return (
              <motion.button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot.time)}
                whileTap={slot.available ? { scale: 0.97 } : undefined}
                aria-pressed={active}
                className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                  !slot.available
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
                  className={`text-[10px] font-medium mt-0.5 ${
                    !slot.available
                      ? "text-slate-400"
                      : active
                        ? "text-sky-100"
                        : "text-emerald-600"
                  }`}
                >
                  {slot.available ? "Available" : slot.reason || "Unavailable"}
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
          disabled={submitting || !selectedSlot}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F97316] hover:brightness-105 text-white text-xs sm:text-sm font-bold shadow-[0_12px_26px_-10px_rgba(234,88,12,0.55)] cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
        >
          <FiSend className="text-sm" />
          <span>{submitting ? "Booking Slot..." : "Confirm Site Visit"}</span>
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
