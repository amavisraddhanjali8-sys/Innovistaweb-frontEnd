import type {
  MonthlyCalendarCell,
  SiteVisitBooking,
  SlotAvailabilityItem,
} from "../../../shared/siteVisitSchedulerHelpers.ts";

export const SITE_VISIT_STORAGE_KEY = "innovista_site_visit_local_reservations_v1";
export const BOOKING_TOAST_DURATION_MS = 5500;

export interface ReservedSlotEntry {
  key: string;
  date: string;
  slotTime: string;
  slotLabel: string;
  bookingId: string;
  locationName: string;
  visitorName: string;
  reservedAt: string;
}

export interface BookingToastItem {
  id: string;
  bookingId: string;
  title: string;
  description: string;
  date: string;
  slotLabel: string;
  locationName: string;
  createdAt: number;
}

export interface SiteVisitLocalState {
  reservedByKey: Record<string, ReservedSlotEntry>;
  heldByWidget: Record<string, string>;
  toasts: BookingToastItem[];
  slotsRevision: number;
}

export interface MergedSlotAvailabilityItem extends SlotAvailabilityItem {
  isLocallyReserved: boolean;
  isSelectedByCurrent: boolean;
  isSelectedByOther: boolean;
  isFullyReserved: boolean;
  disabled: boolean;
  statusLabel: string;
}

export type SiteVisitLocalAction =
  | { type: "HYDRATE_RESERVED"; reservedByKey: Record<string, ReservedSlotEntry> }
  | { type: "SET_WIDGET_SELECTION"; widgetId: string; date: string; slotTime: string }
  | { type: "CLEAR_WIDGET_SELECTION"; widgetId: string }
  | {
      type: "RESERVE_SLOT";
      booking: Pick<
        SiteVisitBooking,
        "id" | "date" | "slotTime" | "slotLabel" | "locationName" | "visitorName"
      >;
      showToast?: boolean;
      toastId?: string;
      nowMs?: number;
    }
  | { type: "RELEASE_SLOT"; date: string; slotTime: string }
  | { type: "DISMISS_TOAST"; toastId: string };

export function makeSlotKey(date: string, slotTime: string): string {
  const cleanDate = (date || "").trim();
  const cleanTime = (slotTime || "").trim();
  if (!cleanDate || !cleanTime) return "";
  return `${cleanDate}|${cleanTime}`;
}

export function parseSlotKey(key: string): { date: string; slotTime: string } | null {
  const trimmed = (key || "").trim();
  const idx = trimmed.indexOf("|");
  if (idx <= 0 || idx === trimmed.length - 1) return null;
  const date = trimmed.slice(0, idx);
  const slotTime = trimmed.slice(idx + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slotTime) return null;
  return { date, slotTime };
}

export function createInitialSiteVisitLocalState(
  reservedByKey: Record<string, ReservedSlotEntry> = {}
): SiteVisitLocalState {
  return {
    reservedByKey,
    heldByWidget: {},
    toasts: [],
    slotsRevision: 0,
  };
}

export function buildBookingToastItem(
  booking: Pick<
    SiteVisitBooking,
    "id" | "date" | "slotTime" | "slotLabel" | "locationName" | "visitorName"
  >,
  toastId?: string,
  nowMs: number = Date.now()
): BookingToastItem {
  const location = booking.locationName?.trim() || "Innovista Showroom";
  const slotText = booking.slotLabel?.trim() || booking.slotTime;
  return {
    id: toastId || `toast-${booking.id || nowMs}-${nowMs}`,
    bookingId: booking.id,
    title: "Site visit slot reserved",
    description: `${booking.date} at ${slotText} · ${location}`,
    date: booking.date,
    slotLabel: slotText,
    locationName: location,
    createdAt: nowMs,
  };
}

export function siteVisitLocalReducer(
  state: SiteVisitLocalState,
  action: SiteVisitLocalAction
): SiteVisitLocalState {
  switch (action.type) {
    case "HYDRATE_RESERVED": {
      return {
        ...state,
        reservedByKey: {
          ...action.reservedByKey,
          ...state.reservedByKey,
        },
        slotsRevision: state.slotsRevision + 1,
      };
    }

    case "SET_WIDGET_SELECTION": {
      const nextKey = makeSlotKey(action.date, action.slotTime);
      if (!action.widgetId) return state;
      if (!nextKey) {
        if (!(action.widgetId in state.heldByWidget)) return state;
        const nextHeld = { ...state.heldByWidget };
        delete nextHeld[action.widgetId];
        return { ...state, heldByWidget: nextHeld };
      }
      if (state.heldByWidget[action.widgetId] === nextKey) return state;
      return {
        ...state,
        heldByWidget: {
          ...state.heldByWidget,
          [action.widgetId]: nextKey,
        },
      };
    }

    case "CLEAR_WIDGET_SELECTION": {
      if (!(action.widgetId in state.heldByWidget)) return state;
      const nextHeld = { ...state.heldByWidget };
      delete nextHeld[action.widgetId];
      return {
        ...state,
        heldByWidget: nextHeld,
      };
    }

    case "RESERVE_SLOT": {
      const key = makeSlotKey(action.booking.date, action.booking.slotTime);
      if (!key) return state;

      const entry: ReservedSlotEntry = {
        key,
        date: action.booking.date,
        slotTime: action.booking.slotTime,
        slotLabel: action.booking.slotLabel || action.booking.slotTime,
        bookingId: action.booking.id || `SV-${Date.now()}`,
        locationName: action.booking.locationName || "Innovista Showroom",
        visitorName: action.booking.visitorName || "Guest",
        reservedAt: new Date(action.nowMs ?? Date.now()).toISOString(),
      };

      const nextHeld: Record<string, string> = {};
      for (const [wId, heldKey] of Object.entries(state.heldByWidget)) {
        if (heldKey !== key) {
          nextHeld[wId] = heldKey;
        }
      }

      const nextToasts =
        action.showToast === false
          ? state.toasts
          : [
              ...state.toasts.slice(-2),
              buildBookingToastItem(action.booking, action.toastId, action.nowMs),
            ];

      return {
        ...state,
        reservedByKey: {
          ...state.reservedByKey,
          [key]: entry,
        },
        heldByWidget: nextHeld,
        toasts: nextToasts,
        slotsRevision: state.slotsRevision + 1,
      };
    }

    case "RELEASE_SLOT": {
      const key = makeSlotKey(action.date, action.slotTime);
      if (!key || !(key in state.reservedByKey)) return state;
      const nextReserved = { ...state.reservedByKey };
      delete nextReserved[key];
      return {
        ...state,
        reservedByKey: nextReserved,
        slotsRevision: state.slotsRevision + 1,
      };
    }

    case "DISMISS_TOAST": {
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    }

    default:
      return state;
  }
}

export function mergeSlotsWithLocalState(
  slots: SlotAvailabilityItem[],
  date: string,
  state: Pick<SiteVisitLocalState, "reservedByKey" | "heldByWidget">,
  widgetId = "default",
  currentSelectedSlotTime = ""
): MergedSlotAvailabilityItem[] {
  return slots.map((slot) => {
    const key = makeSlotKey(date, slot.time);
    const isLocallyReserved = Boolean(key && state.reservedByKey[key]);
    const isSelectedByOther = Boolean(
      key &&
        Object.entries(state.heldByWidget).some(
          ([otherWidgetId, heldKey]) => otherWidgetId !== widgetId && heldKey === key
        )
    );
    const isServerUnavailable = !slot.available;
    const isFullyReserved = isServerUnavailable || isLocallyReserved || isSelectedByOther;
    const isSelectedByCurrent = !isFullyReserved && currentSelectedSlotTime === slot.time;

    let statusLabel = "Available";
    let reason = slot.reason;

    if (isServerUnavailable) {
      statusLabel = slot.reason || "Booked";
    } else if (isLocallyReserved) {
      statusLabel = "Reserved";
      reason = "Booked";
    } else if (isSelectedByOther) {
      statusLabel = "Selected Elsewhere";
    } else if (isSelectedByCurrent) {
      statusLabel = "Selected";
    }

    return {
      ...slot,
      available: !isFullyReserved,
      reason,
      isLocallyReserved,
      isSelectedByCurrent,
      isSelectedByOther,
      isFullyReserved,
      disabled: isFullyReserved,
      statusLabel,
    };
  });
}

export function computeNextOpenSlot(
  mergedSlots: MergedSlotAvailabilityItem[],
  preferredSlotTime = ""
): string {
  if (preferredSlotTime) {
    const stillOpen = mergedSlots.find(
      (s) => s.time === preferredSlotTime && !s.disabled
    );
    if (stillOpen) return stillOpen.time;
  }
  return mergedSlots.find((s) => !s.disabled)?.time || "";
}

export function evaluateBookingSubmitState(
  mergedSlots: MergedSlotAvailabilityItem[],
  selectedSlotTime: string,
  submitting: boolean
): {
  canBook: boolean;
  allSlotsReserved: boolean;
  disabledReason: string;
} {
  const openCount = mergedSlots.filter((s) => !s.disabled).length;
  const allSlotsReserved = mergedSlots.length > 0 && openCount === 0;

  if (submitting) {
    return { canBook: false, allSlotsReserved, disabledReason: "Submitting" };
  }
  if (allSlotsReserved) {
    return {
      canBook: false,
      allSlotsReserved: true,
      disabledReason: "All slots reserved",
    };
  }
  const chosen = mergedSlots.find((s) => s.time === selectedSlotTime);
  if (!chosen || chosen.disabled) {
    return {
      canBook: false,
      allSlotsReserved,
      disabledReason: chosen?.statusLabel || "Select an open slot",
    };
  }
  return {
    canBook: true,
    allSlotsReserved: false,
    disabledReason: "",
  };
}

export function mergeCalendarCellsWithLocalState(
  cells: MonthlyCalendarCell[],
  state: Pick<SiteVisitLocalState, "reservedByKey">
): MonthlyCalendarCell[] {
  const localDates = Object.values(state.reservedByKey);
  if (localDates.length === 0) return cells;

  return cells.map((cell) => {
    if (!cell.isCurrentMonth || !cell.isoDate || !cell.available) return cell;
    const localCountForDay = localDates.filter((entry) => entry.date === cell.isoDate).length;
    if (localCountForDay === 0) return cell;

    // Ensure cell reflects at least the locally reserved entries when offline or ahead of refresh
    const adjustedBooked = Math.max(cell.bookedCount, localCountForDay);
    const delta = Math.max(0, adjustedBooked - cell.bookedCount);
    const nextOpen = Math.max(0, cell.openSlotCount - delta);

    return {
      ...cell,
      bookedCount: adjustedBooked,
      openSlotCount: nextOpen,
    };
  });
}

export function parseReservedSlotsFromStorage(
  rawJson: string | null | undefined,
  todayIso: string
): Record<string, ReservedSlotEntry> {
  if (!rawJson || typeof rawJson !== "string") return {};
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, ReservedSlotEntry> = {};

    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Partial<ReservedSlotEntry>;
      const parsedKey = parseSlotKey(key);
      if (!parsedKey) continue;
      if (todayIso && parsedKey.date < todayIso) continue;
      out[key] = {
        key,
        date: parsedKey.date,
        slotTime: parsedKey.slotTime,
        slotLabel: String(entry.slotLabel || parsedKey.slotTime),
        bookingId: String(entry.bookingId || key),
        locationName: String(entry.locationName || "Innovista Showroom"),
        visitorName: String(entry.visitorName || "Guest"),
        reservedAt: String(entry.reservedAt || new Date().toISOString()),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeReservedSlots(
  reservedByKey: Record<string, ReservedSlotEntry>,
  todayIso: string
): string {
  const cleaned: Record<string, ReservedSlotEntry> = {};
  for (const [key, entry] of Object.entries(reservedByKey)) {
    if (todayIso && entry.date < todayIso) continue;
    cleaned[key] = entry;
  }
  return JSON.stringify(cleaned);
}
