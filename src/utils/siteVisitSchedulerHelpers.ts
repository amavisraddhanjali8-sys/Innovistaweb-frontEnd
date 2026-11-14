export type SiteVisitStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface SiteVisitSlotTemplate {
  id?: string;
  time: string;
  label: string;
  endTime: string;
  available?: boolean;
}

export interface ManagedSiteVisitSlot {
  id: string;
  time: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  label: string;
  available: boolean;
}

export interface ManagedSiteVisitDateConfig {
  date: string; // YYYY-MM-DD
  available: boolean;
  note?: string;
  isCustom?: boolean;
  slots?: ManagedSiteVisitSlot[];
}

export interface MonthlySlotTemplate {
  monthKey: string; // YYYY-MM
  slots: ManagedSiteVisitSlot[];
  activeWeekdays: number[]; // 0=Sun..6=Sat
  closedDates: string[]; // YYYY-MM-DD
  note?: string;
}

export interface SiteVisitScheduleConfig {
  defaultSlots: ManagedSiteVisitSlot[];
  dates: Record<string, ManagedSiteVisitDateConfig>;
  blockedKeys: string[];
  monthlyTemplates?: Record<string, MonthlySlotTemplate>;
}

export interface ManagedDateSummary {
  date: string;
  dayShort: string;
  dayNum: string;
  monthShort: string;
  available: boolean;
  isCustom: boolean;
  hasCustomSlots: boolean;
  note?: string;
  openSlotCount: number;
  totalSlotCount: number;
}

export interface MonthlyCalendarCell {
  isoDate: string; // "" for leading padding cells
  dayNum: number;
  dayShort: string;
  monthShort: string;
  weekday: number; // 0=Sun..6=Sat
  isCurrentMonth: boolean;
  isPast: boolean;
  available: boolean;
  openSlotCount: number;
  totalSlotCount: number;
  bookedCount: number;
  isCustom: boolean;
  hasCustomSlots: boolean;
  source: "date" | "month" | "default";
  note?: string;
}

export const DEFAULT_ACTIVE_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat

export const SITE_VISIT_SLOT_TEMPLATES: ManagedSiteVisitSlot[] = [
  { id: "slot-0930", time: "09:30", label: "09:30 AM", endTime: "10:30", available: true },
  { id: "slot-1100", time: "11:00", label: "11:00 AM", endTime: "12:00", available: true },
  { id: "slot-1400", time: "14:00", label: "02:00 PM", endTime: "15:00", available: true },
  { id: "slot-1530", time: "15:30", label: "03:30 PM", endTime: "16:30", available: true },
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
  id?: string;
  time: string;
  label: string;
  endTime: string;
  available: boolean;
  adminAvailable?: boolean;
  reason?: "Booked" | "Blocked" | "Unavailable" | "Date Unavailable" | "Calendar Busy";
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

export function getMonthKeyFromDate(isoDate?: string, fallbackDate: Date = new Date()): string {
  const trimmed = (isoDate || "").trim();
  if (/^\d{4}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const y = fallbackDate.getFullYear();
  const m = String(fallbackDate.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec((monthKey || "").trim());
  const base = match
    ? new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth() + delta, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthHeading(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec((monthKey || "").trim());
  if (!match) return monthKey;
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(dt);
}

export function listDaysInMonth(monthKey: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec((monthKey || "").trim());
  if (!match) return [];
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return [];
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= totalDays; d += 1) {
    out.push(`${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export function formatTime24ToLabel(time24: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time24 || "").trim());
  if (!match) return (time24 || "").trim() || "09:00 AM";
  const hours24 = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function normalizeSlotTime(raw: string, fallback = "09:30"): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec((raw || "").trim());
  if (!match) return fallback;
  const h = Math.max(0, Math.min(23, Number(match[1])));
  const m = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function computeDefaultEndTime(startTime: string): string {
  const norm = normalizeSlotTime(startTime);
  const [hStr, mStr] = norm.split(":");
  const h = (Number(hStr) + 1) % 24;
  return `${String(h).padStart(2, "0")}:${mStr}`;
}

export function normalizeManagedSlot(
  raw: Partial<ManagedSiteVisitSlot>,
  idx = 0
): ManagedSiteVisitSlot {
  const time = normalizeSlotTime(raw.time || "", "09:30");
  const endTime = normalizeSlotTime(raw.endTime || "", computeDefaultEndTime(time));
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim()
      : formatTime24ToLabel(time);
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `slot-${time.replace(":", "")}-${idx}`;
  return {
    id,
    time,
    endTime,
    label,
    available: typeof raw.available === "boolean" ? raw.available : true,
  };
}

export function sortManagedSlots(slots: ManagedSiteVisitSlot[]): ManagedSiteVisitSlot[] {
  return [...slots].sort((a, b) => a.time.localeCompare(b.time));
}

export function createDefaultSiteVisitSchedule(): SiteVisitScheduleConfig {
  return {
    defaultSlots: SITE_VISIT_SLOT_TEMPLATES.map((s) => ({ ...s })),
    dates: {},
    blockedKeys: [],
    monthlyTemplates: {},
  };
}

export function normalizeMonthlyTemplate(
  monthKey: string,
  raw: Partial<MonthlySlotTemplate> | null | undefined,
  fallbackSlots: ManagedSiteVisitSlot[] = SITE_VISIT_SLOT_TEMPLATES
): MonthlySlotTemplate | null {
  const cleanKey = (monthKey || "").trim();
  if (!/^\d{4}-\d{2}$/.test(cleanKey) || !raw || typeof raw !== "object") return null;

  const slots =
    Array.isArray(raw.slots) && raw.slots.length > 0
      ? sortManagedSlots(raw.slots.map((s, idx) => normalizeManagedSlot(s, idx)))
      : fallbackSlots.map((s) => ({ ...s }));

  const activeWeekdays = Array.isArray(raw.activeWeekdays)
    ? Array.from(
        new Set(
          raw.activeWeekdays
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
      ).sort((a, b) => a - b)
    : [...DEFAULT_ACTIVE_WEEKDAYS];

  const closedDates = Array.isArray(raw.closedDates)
    ? Array.from(
        new Set(
          raw.closedDates
            .map((d) => String(d || "").trim())
            .filter((d) => d.startsWith(`${cleanKey}-`) && /^\d{4}-\d{2}-\d{2}$/.test(d))
        )
      ).sort()
    : [];

  return {
    monthKey: cleanKey,
    slots,
    activeWeekdays,
    closedDates,
    note: typeof raw.note === "string" ? raw.note.trim() : "",
  };
}

export function normalizeSiteVisitScheduleConfig(
  raw?: Partial<SiteVisitScheduleConfig> | null
): SiteVisitScheduleConfig {
  const defaults = createDefaultSiteVisitSchedule();
  if (!raw || typeof raw !== "object") return defaults;

  const defaultSlots =
    Array.isArray(raw.defaultSlots) && raw.defaultSlots.length > 0
      ? sortManagedSlots(
          raw.defaultSlots.map((slot, idx) => normalizeManagedSlot(slot, idx))
        )
      : defaults.defaultSlots;

  const dates: Record<string, ManagedSiteVisitDateConfig> = {};
  if (raw.dates && typeof raw.dates === "object") {
    for (const [dateKey, cfg] of Object.entries(raw.dates)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !cfg) continue;
      dates[dateKey] = {
        date: dateKey,
        available: typeof cfg.available === "boolean" ? cfg.available : true,
        note: typeof cfg.note === "string" ? cfg.note.trim() : "",
        isCustom: Boolean(cfg.isCustom),
        slots:
          Array.isArray(cfg.slots) && cfg.slots.length > 0
            ? sortManagedSlots(cfg.slots.map((s, idx) => normalizeManagedSlot(s, idx)))
            : undefined,
      };
    }
  }

  const blockedKeys = Array.isArray(raw.blockedKeys)
    ? raw.blockedKeys.map((k) => String(k || "").trim()).filter(Boolean)
    : [];

  const monthlyTemplates: Record<string, MonthlySlotTemplate> = {};
  if (raw.monthlyTemplates && typeof raw.monthlyTemplates === "object") {
    for (const [mKey, tpl] of Object.entries(raw.monthlyTemplates)) {
      const normalized = normalizeMonthlyTemplate(mKey, tpl, defaultSlots);
      if (normalized) {
        monthlyTemplates[mKey] = normalized;
      }
    }
  }

  return { defaultSlots, dates, blockedKeys, monthlyTemplates };
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

function parseIsoWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

function parseDateBadge(isoDate: string): {
  dayShort: string;
  dayNum: string;
  monthShort: string;
  weekday: number;
} {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  return {
    dayShort: dayFmt.format(dt),
    dayNum: String(dt.getDate()),
    monthShort: monthFmt.format(dt),
    weekday: dt.getDay(),
  };
}

export function resolveEffectiveDateConfig(
  date: string,
  schedule?: SiteVisitScheduleConfig
): {
  available: boolean;
  slots: ManagedSiteVisitSlot[];
  source: "date" | "month" | "default";
  note: string;
  isCustom: boolean;
  hasCustomSlots: boolean;
} {
  const dateCfg = schedule?.dates?.[date];
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
  const monthCfg = monthKey ? schedule?.monthlyTemplates?.[monthKey] : undefined;
  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseIsoWeekday(date) : 1;

  const baseFallbackSlots =
    monthCfg?.slots && monthCfg.slots.length > 0
      ? monthCfg.slots
      : schedule?.defaultSlots?.length
        ? schedule.defaultSlots
        : SITE_VISIT_SLOT_TEMPLATES;

  const slots =
    dateCfg?.slots && dateCfg.slots.length > 0 ? dateCfg.slots : baseFallbackSlots;

  const source: "date" | "month" | "default" =
    dateCfg?.slots && dateCfg.slots.length > 0
      ? "date"
      : monthCfg
        ? "month"
        : "default";

  let available = true;
  if (dateCfg) {
    available = dateCfg.available !== false;
  } else if (monthCfg) {
    available =
      !monthCfg.closedDates.includes(date) && monthCfg.activeWeekdays.includes(weekday);
  } else {
    available = weekday !== 0;
  }

  return {
    available,
    slots,
    source,
    note: dateCfg?.note || monthCfg?.note || "",
    isCustom: Boolean(dateCfg?.isCustom),
    hasCustomSlots: Boolean(dateCfg?.slots && dateCfg.slots.length > 0),
  };
}

export function slotOverlapsBusyRange(
  date: string,
  slot: Pick<SiteVisitSlotTemplate, "time" | "endTime">,
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
  calendarBusy: CalendarBusyRange[] = [],
  schedule?: SiteVisitScheduleConfig
): SlotAvailabilityItem[] {
  const effective = resolveEffectiveDateConfig(date, schedule);
  const baseSlots = effective.slots;
  const isWholeDateUnavailable = !effective.available;

  const activeForDate = new Set(
    bookings
      .filter((b) => b.date === date && b.status !== "CANCELLED")
      .map((b) => b.slotTime)
  );
  const blockedSet = new Set([
    ...(blockedKeys || []),
    ...(schedule?.blockedKeys || []),
  ]);

  return sortManagedSlots(baseSlots).map((tpl) => {
    const key = `${date}|${tpl.time}`;
    const adminAvailable = tpl.available !== false && !isWholeDateUnavailable;

    if (isWholeDateUnavailable) {
      return {
        ...tpl,
        adminAvailable: false,
        available: false,
        reason: "Date Unavailable",
      };
    }
    if (tpl.available === false) {
      return {
        ...tpl,
        adminAvailable: false,
        available: false,
        reason: "Unavailable",
      };
    }
    if (blockedSet.has(key)) {
      return {
        ...tpl,
        adminAvailable: false,
        available: false,
        reason: "Blocked",
      };
    }
    if (activeForDate.has(tpl.time)) {
      return {
        ...tpl,
        adminAvailable,
        available: false,
        reason: "Booked",
      };
    }
    if (calendarBusy.length > 0 && slotOverlapsBusyRange(date, tpl, calendarBusy)) {
      return {
        ...tpl,
        adminAvailable,
        available: false,
        reason: "Calendar Busy",
      };
    }
    return { ...tpl, adminAvailable: true, available: true };
  });
}

export function getManagedSiteVisitDates(
  schedule: SiteVisitScheduleConfig,
  bookings: SiteVisitBooking[],
  upcomingCount = 10,
  fromDate: Date = new Date()
): ManagedDateSummary[] {
  const baseDates = getUpcomingSiteVisitDates(upcomingCount, fromDate);
  const todayIso = formatIsoDateLocal(fromDate);
  const dateMap = new Map<string, ManagedDateSummary>();

  const registerDate = (isoDate: string) => {
    const badge = parseDateBadge(isoDate);
    const effective = resolveEffectiveDateConfig(isoDate, schedule);
    const computedSlots = computeAvailableSlotsForDate(
      isoDate,
      bookings,
      schedule.blockedKeys,
      [],
      schedule
    );
    const openSlotCount = computedSlots.filter((s) => s.available).length;
    dateMap.set(isoDate, {
      date: isoDate,
      dayShort: badge.dayShort,
      dayNum: badge.dayNum,
      monthShort: badge.monthShort,
      available: effective.available,
      isCustom: effective.isCustom,
      hasCustomSlots: effective.hasCustomSlots,
      note: effective.note,
      openSlotCount,
      totalSlotCount: computedSlots.length,
    });
  };

  for (const d of baseDates) {
    registerDate(d.date);
  }
  for (const [dateKey, cfg] of Object.entries(schedule.dates)) {
    if (dateKey >= todayIso || cfg.isCustom) {
      registerDate(dateKey);
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMonthlySiteVisitCalendar(
  monthKey: string,
  schedule: SiteVisitScheduleConfig,
  bookings: SiteVisitBooking[],
  todayIso: string = formatIsoDateLocal(new Date())
): MonthlyCalendarCell[] {
  const days = listDaysInMonth(monthKey);
  if (days.length === 0) return [];

  const firstWeekday = parseIsoWeekday(days[0]);
  const cells: MonthlyCalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      isoDate: "",
      dayNum: 0,
      dayShort: "",
      monthShort: "",
      weekday: i,
      isCurrentMonth: false,
      isPast: true,
      available: false,
      openSlotCount: 0,
      totalSlotCount: 0,
      bookedCount: 0,
      isCustom: false,
      hasCustomSlots: false,
      source: "default",
    });
  }

  for (const isoDate of days) {
    const badge = parseDateBadge(isoDate);
    const effective = resolveEffectiveDateConfig(isoDate, schedule);
    const computedSlots = computeAvailableSlotsForDate(
      isoDate,
      bookings,
      schedule.blockedKeys,
      [],
      schedule
    );
    const openSlotCount = computedSlots.filter((s) => s.available).length;
    const bookedCount = bookings.filter(
      (b) => b.date === isoDate && b.status !== "CANCELLED"
    ).length;

    cells.push({
      isoDate,
      dayNum: Number(badge.dayNum),
      dayShort: badge.dayShort,
      monthShort: badge.monthShort,
      weekday: badge.weekday,
      isCurrentMonth: true,
      isPast: isoDate < todayIso,
      available: effective.available,
      openSlotCount,
      totalSlotCount: computedSlots.length,
      bookedCount,
      isCustom: effective.isCustom,
      hasCustomSlots: effective.hasCustomSlots,
      source: effective.source,
      note: effective.note,
    });
  }

  return cells;
}

export function getFirstOpenDateInMonth(
  monthKey: string,
  schedule: SiteVisitScheduleConfig,
  bookings: SiteVisitBooking[],
  todayIso: string = formatIsoDateLocal(new Date())
): string {
  const cells = buildMonthlySiteVisitCalendar(monthKey, schedule, bookings, todayIso).filter(
    (c) => c.isCurrentMonth && !c.isPast
  );
  const firstOpen = cells.find((c) => c.available && c.openSlotCount > 0);
  if (firstOpen) return firstOpen.isoDate;
  return cells[0]?.isoDate || `${monthKey}-01`;
}

export function applyMonthlyTemplateToSchedule(
  schedule: SiteVisitScheduleConfig,
  input: {
    monthKey: string;
    slots: Partial<ManagedSiteVisitSlot>[];
    activeWeekdays?: number[];
    closedDates?: string[];
    note?: string;
    clearPerDateCustomSlots?: boolean;
  }
): SiteVisitScheduleConfig {
  const normalized = normalizeMonthlyTemplate(
    input.monthKey,
    {
      monthKey: input.monthKey,
      slots: input.slots.map((s, idx) => normalizeManagedSlot(s, idx)),
      activeWeekdays: input.activeWeekdays,
      closedDates: input.closedDates,
      note: input.note,
    },
    schedule.defaultSlots
  );
  if (!normalized) return schedule;

  const nextDates: Record<string, ManagedSiteVisitDateConfig> = { ...schedule.dates };
  if (input.clearPerDateCustomSlots) {
    for (const [dateKey, cfg] of Object.entries(nextDates)) {
      if (dateKey.startsWith(`${normalized.monthKey}-`) && cfg.slots) {
        const rest = { ...cfg };
        delete rest.slots;
        nextDates[dateKey] = rest;
      }
    }
  }

  return {
    ...schedule,
    dates: nextDates,
    monthlyTemplates: {
      ...(schedule.monthlyTemplates || {}),
      [normalized.monthKey]: normalized,
    },
  };
}

export function deleteMonthlyTemplateFromSchedule(
  schedule: SiteVisitScheduleConfig,
  monthKey: string
): SiteVisitScheduleConfig {
  const nextTemplates = { ...(schedule.monthlyTemplates || {}) };
  delete nextTemplates[monthKey];
  return {
    ...schedule,
    monthlyTemplates: nextTemplates,
  };
}

export function upsertScheduleDate(
  schedule: SiteVisitScheduleConfig,
  input: { date: string; available?: boolean; note?: string; isCustom?: boolean; resetSlots?: boolean }
): SiteVisitScheduleConfig {
  const date = (input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return schedule;
  const prev = schedule.dates[date];
  return {
    ...schedule,
    dates: {
      ...schedule.dates,
      [date]: {
        date,
        available:
          typeof input.available === "boolean"
            ? input.available
            : prev?.available ?? true,
        note: typeof input.note === "string" ? input.note.trim() : prev?.note ?? "",
        isCustom:
          typeof input.isCustom === "boolean"
            ? input.isCustom
            : prev?.isCustom ?? true,
        slots: input.resetSlots ? undefined : prev?.slots,
      },
    },
  };
}

export function deleteScheduleDate(
  schedule: SiteVisitScheduleConfig,
  date: string
): SiteVisitScheduleConfig {
  const nextDates = { ...schedule.dates };
  delete nextDates[date];
  return {
    ...schedule,
    dates: nextDates,
    blockedKeys: schedule.blockedKeys.filter((k) => !k.startsWith(`${date}|`)),
  };
}

function getEditableSlotsForScope(
  schedule: SiteVisitScheduleConfig,
  scope: "default" | string
): ManagedSiteVisitSlot[] {
  if (scope === "default") {
    return schedule.defaultSlots.map((s) => ({ ...s }));
  }
  const existingDateCfg = schedule.dates[scope];
  if (existingDateCfg?.slots) {
    return existingDateCfg.slots.map((s) => ({ ...s }));
  }
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(scope) ? scope.slice(0, 7) : "";
  const monthCfg = monthKey ? schedule.monthlyTemplates?.[monthKey] : undefined;
  const sourceSlots =
    monthCfg?.slots && monthCfg.slots.length > 0 ? monthCfg.slots : schedule.defaultSlots;

  const blockedSet = new Set(schedule.blockedKeys);
  return sourceSlots.map((s) => ({
    ...s,
    available: s.available && !blockedSet.has(`${scope}|${s.time}`),
  }));
}

function applySlotsToScope(
  schedule: SiteVisitScheduleConfig,
  scope: "default" | string,
  nextSlots: ManagedSiteVisitSlot[]
): SiteVisitScheduleConfig {
  const sorted = sortManagedSlots(nextSlots);
  if (scope === "default") {
    return {
      ...schedule,
      defaultSlots: sorted,
    };
  }
  const prev = schedule.dates[scope];
  const nextBlocked = schedule.blockedKeys.filter((k) => !k.startsWith(`${scope}|`));
  return {
    ...schedule,
    blockedKeys: nextBlocked,
    dates: {
      ...schedule.dates,
      [scope]: {
        date: scope,
        available: prev?.available ?? true,
        note: prev?.note ?? "",
        isCustom: prev?.isCustom ?? false,
        slots: sorted,
      },
    },
  };
}

export function addScheduleSlot(
  schedule: SiteVisitScheduleConfig,
  scope: "default" | string,
  input: {
    id?: string;
    time: string;
    endTime?: string;
    label?: string;
    available?: boolean;
  }
): SiteVisitScheduleConfig {
  const current = getEditableSlotsForScope(schedule, scope);
  const newTime = normalizeSlotTime(input.time);
  const newSlot = normalizeManagedSlot(
    {
      id: input.id || `slot-${newTime.replace(":", "")}-${Date.now()}`,
      time: newTime,
      endTime: input.endTime || computeDefaultEndTime(newTime),
      label: input.label || formatTime24ToLabel(newTime),
      available: typeof input.available === "boolean" ? input.available : true,
    },
    current.length
  );

  // Replace if same HH:mm already exists in scope, else append
  const existingIdx = current.findIndex((s) => s.time === newSlot.time);
  const nextSlots =
    existingIdx >= 0
      ? current.map((s, idx) => (idx === existingIdx ? { ...newSlot, id: s.id } : s))
      : [...current, newSlot];

  return applySlotsToScope(schedule, scope, nextSlots);
}

export function updateScheduleSlot(
  schedule: SiteVisitScheduleConfig,
  scope: "default" | string,
  slotIdOrTime: string,
  patch: Partial<Pick<ManagedSiteVisitSlot, "time" | "endTime" | "label" | "available">>
): SiteVisitScheduleConfig {
  const current = getEditableSlotsForScope(schedule, scope);
  const idx = current.findIndex(
    (s) => s.id === slotIdOrTime || s.time === slotIdOrTime
  );
  if (idx === -1) return schedule;

  const prev = current[idx];
  const nextTime = patch.time ? normalizeSlotTime(patch.time, prev.time) : prev.time;
  const nextEnd = patch.endTime
    ? normalizeSlotTime(patch.endTime, prev.endTime)
    : patch.time && !patch.endTime
      ? computeDefaultEndTime(nextTime)
      : prev.endTime;
  const nextLabel =
    typeof patch.label === "string" && patch.label.trim()
      ? patch.label.trim()
      : patch.time
        ? formatTime24ToLabel(nextTime)
        : prev.label;
  const nextAvailable =
    typeof patch.available === "boolean" ? patch.available : prev.available;

  const nextSlots = current.map((s, i) =>
    i === idx
      ? {
          ...s,
          time: nextTime,
          endTime: nextEnd,
          label: nextLabel,
          available: nextAvailable,
        }
      : s
  );

  return applySlotsToScope(schedule, scope, nextSlots);
}

export function deleteScheduleSlot(
  schedule: SiteVisitScheduleConfig,
  scope: "default" | string,
  slotIdOrTime: string
): SiteVisitScheduleConfig {
  const current = getEditableSlotsForScope(schedule, scope);
  const nextSlots = current.filter(
    (s) => s.id !== slotIdOrTime && s.time !== slotIdOrTime
  );
  return applySlotsToScope(schedule, scope, nextSlots);
}

export function toggleScheduleSlotAvailability(
  schedule: SiteVisitScheduleConfig,
  date: string,
  slotIdOrTime: string
): SiteVisitScheduleConfig {
  const scope = date === "default" ? "default" : date;
  const current = getEditableSlotsForScope(schedule, scope);
  const target = current.find(
    (s) => s.id === slotIdOrTime || s.time === slotIdOrTime
  );
  if (!target) return schedule;
  return updateScheduleSlot(schedule, scope, target.id, {
    available: !target.available,
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
  slotEndTime?: string;
  slotLabel?: string;
}) {
  const tpl =
    SITE_VISIT_SLOT_TEMPLATES.find((s) => s.time === input.slotTime) || {
      time: input.slotTime,
      endTime: input.slotEndTime || computeDefaultEndTime(input.slotTime),
      label: input.slotLabel || formatTime24ToLabel(input.slotTime),
    };

  const startDateTime = `${input.date}T${tpl.time}:00+05:30`;
  const endDateTime = `${input.date}T${input.slotEndTime || tpl.endTime}:00+05:30`;

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
