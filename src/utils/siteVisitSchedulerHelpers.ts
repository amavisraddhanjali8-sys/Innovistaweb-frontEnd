export type SiteVisitStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface SiteVisitSlotTemplate {
  time: string;
  label: string;
  endTime: string;
}

export const SITE_VISIT_SLOT_TEMPLATES: SiteVisitSlotTemplate[] = [
  { time: "09:30", label: "09:30 AM", endTime: "10:30" },
  { time: "11:00", label: "11:00 AM", endTime: "12:00" },
  { time: "14:00", label: "02:00 PM", endTime: "15:00" },
  { time: "15:30", label: "03:30 PM", endTime: "16:30" },
];

export interface SiteVisitBooking {
  id: string;
  date: string; // YYYY-MM-DD
  slotTime: string; // HH:mm
  slotLabel: string;
  locationName: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  notes: string;
  status: SiteVisitStatus;
  calendarEventId?: string;
  emailSent?: boolean;
  createdAt: string;
}

export interface SlotAvailabilityItem {
  time: string;
  label: string;
  endTime: string;
  available: boolean;
  reason?: "Booked" | "Blocked" | "Calendar Busy";
}

export interface CalendarBusyRange {
  start: string;
  end: string;
  summary?: string;
}

export function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getUpcomingSiteVisitDates(
  count = 10,
  fromDate: Date = new Date()
): Array<{ date: string; dayShort: string; dayNum: string; monthShort: string }> {
  const results: Array<{
    date: string;
    dayShort: string;
    dayNum: string;
    monthShort: string;
  }> = [];
  const cursor = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + 1
  );

  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

  let guard = 0;
  while (results.length < count && guard < 45) {
    guard += 1;
    // Skip Sundays (0)
    if (cursor.getDay() !== 0) {
      results.push({
        date: formatIsoDateLocal(cursor),
        dayShort: dayFmt.format(cursor),
        dayNum: String(cursor.getDate()),
        monthShort: monthFmt.format(cursor),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

export function slotOverlapsBusyRange(
  date: string,
  slot: SiteVisitSlotTemplate,
  busyRanges: CalendarBusyRange[]
): boolean {
  const slotStart = new Date(`${date}T${slot.time}:00+05:30`).getTime();
  const slotEnd = new Date(`${date}T${slot.endTime}:00+05:30`).getTime();
  if (!Number.isFinite(slotStart) || !Number.isFinite(slotEnd)) return false;

  return busyRanges.some((busy) => {
    const bStart = new Date(busy.start).getTime();
    const bEnd = new Date(busy.end).getTime();
    if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) return false;
    return slotStart < bEnd && slotEnd > bStart;
  });
}

export function computeAvailableSlotsForDate(
  date: string,
  bookings: SiteVisitBooking[],
  blockedKeys: string[] = [],
  calendarBusy: CalendarBusyRange[] = []
): SlotAvailabilityItem[] {
  const activeForDate = new Set(
    bookings
      .filter((b) => b.date === date && b.status !== "CANCELLED")
      .map((b) => b.slotTime)
  );
  const blockedSet = new Set(blockedKeys);

  return SITE_VISIT_SLOT_TEMPLATES.map((tpl) => {
    const key = `${date}|${tpl.time}`;
    if (blockedSet.has(key)) {
      return { ...tpl, available: false, reason: "Blocked" };
    }
    if (activeForDate.has(tpl.time)) {
      return { ...tpl, available: false, reason: "Booked" };
    }
    if (calendarBusy.length > 0 && slotOverlapsBusyRange(date, tpl, calendarBusy)) {
      return { ...tpl, available: false, reason: "Calendar Busy" };
    }
    return { ...tpl, available: true };
  });
}

export interface SiteVisitValidationErrors {
  date?: string;
  slotTime?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
}

export function validateSiteVisitBooking(input: {
  date: string;
  slotTime: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
}): SiteVisitValidationErrors {
  const errors: SiteVisitValidationErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) {
    errors.date = "Select a valid date.";
  }
  if (!input.slotTime?.trim()) {
    errors.slotTime = "Select an available time slot.";
  }
  if (!input.visitorName || input.visitorName.trim().length < 2) {
    errors.visitorName = "Enter your full name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.visitorEmail || "").trim())) {
    errors.visitorEmail = "Enter a valid email address.";
  }
  if (!input.visitorPhone || input.visitorPhone.replace(/[^\d]/g, "").length < 7) {
    errors.visitorPhone = "Enter a valid phone number.";
  }
  return errors;
}

export function buildGoogleCalendarEventPayload(input: {
  date: string;
  slotTime: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  locationName: string;
  notes?: string;
  companyEmail?: string;
}) {
  const tpl =
    SITE_VISIT_SLOT_TEMPLATES.find((s) => s.time === input.slotTime) || {
      time: input.slotTime,
      endTime: input.slotTime,
      label: input.slotTime,
    };

  const startDateTime = `${input.date}T${tpl.time}:00+05:30`;
  const endDateTime = `${input.date}T${tpl.endTime}:00+05:30`;

  const attendees: Array<{ email: string }> = [{ email: input.visitorEmail.trim() }];
  if (
    input.companyEmail &&
    input.companyEmail.trim().toLowerCase() !== input.visitorEmail.trim().toLowerCase()
  ) {
    attendees.push({ email: input.companyEmail.trim() });
  }

  return {
    summary: `Innovista Site Visit — ${input.visitorName.trim()}`,
    location: input.locationName || "Colombo / Client Site",
    description: [
      `Visitor: ${input.visitorName.trim()}`,
      `Phone: ${input.visitorPhone.trim()}`,
      `Email: ${input.visitorEmail.trim()}`,
      input.notes?.trim() ? `Project Notes: ${input.notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: startDateTime,
      timeZone: "Asia/Colombo",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Asia/Colombo",
    },
    attendees,
    reminders: {
      useDefault: true,
    },
  };
}

function toBase64UrlUtf8(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildGmailRawMessage(input: {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
}): string {
  const headers = [
    `To: ${input.to.trim()}`,
    input.cc?.trim() ? `Cc: ${input.cc.trim()}` : "",
    `Subject: ${input.subject.trim()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.bodyText,
  ].filter((line, idx, arr) => line !== "" || (idx > 0 && arr[idx - 1] !== ""));

  return toBase64UrlUtf8(headers.join("\r\n"));
}
