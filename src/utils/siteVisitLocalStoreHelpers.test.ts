import test from "node:test";
import assert from "node:assert/strict";
import {
  computeNextOpenSlot,
  createInitialSiteVisitLocalState,
  evaluateBookingSubmitState,
  makeSlotKey,
  mergeCalendarCellsWithLocalState,
  mergeSlotsWithLocalState,
  parseReservedSlotsFromStorage,
  parseSlotKey,
  serializeReservedSlots,
  siteVisitLocalReducer,
} from "./siteVisitLocalStoreHelpers";
import type { MonthlyCalendarCell, SlotAvailabilityItem } from "./siteVisitSchedulerHelpers";

const BASE_SLOTS: SlotAvailabilityItem[] = [
  { id: "slot-0930", time: "09:30", endTime: "10:30", label: "09:30 AM", available: true },
  { id: "slot-1100", time: "11:00", endTime: "12:00", label: "11:00 AM", available: true },
  { id: "slot-1400", time: "14:00", endTime: "15:00", label: "02:00 PM", available: false, reason: "Booked" },
];

test("makeSlotKey and parseSlotKey round-trip valid slot keys and reject malformed keys", () => {
  const key = makeSlotKey("2026-11-18", "09:30");
  assert.equal(key, "2026-11-18|09:30");
  assert.deepEqual(parseSlotKey(key), { date: "2026-11-18", slotTime: "09:30" });
  assert.equal(parseSlotKey("invalid-key"), null);
  assert.equal(makeSlotKey("", "09:30"), "");
});

test("siteVisitLocalReducer reserves slots, releases held widget selections, and emits toast", () => {
  let state = createInitialSiteVisitLocalState();

  state = siteVisitLocalReducer(state, {
    type: "SET_WIDGET_SELECTION",
    widgetId: "footer-visit",
    date: "2026-11-18",
    slotTime: "09:30",
  });
  assert.equal(state.heldByWidget["footer-visit"], "2026-11-18|09:30");

  state = siteVisitLocalReducer(state, {
    type: "RESERVE_SLOT",
    booking: {
      id: "SV-101",
      date: "2026-11-18",
      slotTime: "09:30",
      slotLabel: "09:30 AM",
      locationName: "Nawala Showroom",
      visitorName: "Nimal Perera",
    },
    toastId: "toast-1",
    nowMs: 1700000000000,
  });

  assert.ok(state.reservedByKey["2026-11-18|09:30"]);
  assert.equal(state.heldByWidget["footer-visit"], undefined);
  assert.equal(state.toasts.length, 1);
  assert.equal(state.toasts[0].id, "toast-1");
  assert.match(state.toasts[0].description, /2026-11-18 at 09:30 AM/);

  state = siteVisitLocalReducer(state, { type: "DISMISS_TOAST", toastId: "toast-1" });
  assert.equal(state.toasts.length, 0);

  state = siteVisitLocalReducer(state, {
    type: "RELEASE_SLOT",
    date: "2026-11-18",
    slotTime: "09:30",
  });
  assert.equal(state.reservedByKey["2026-11-18|09:30"], undefined);
});

test("mergeSlotsWithLocalState disables locally reserved, server-booked, and sibling-held slots", () => {
  let state = createInitialSiteVisitLocalState();
  state = siteVisitLocalReducer(state, {
    type: "RESERVE_SLOT",
    booking: {
      id: "SV-201",
      date: "2026-11-18",
      slotTime: "09:30",
      slotLabel: "09:30 AM",
      locationName: "Nawala Showroom",
      visitorName: "Amara",
    },
  });
  state = siteVisitLocalReducer(state, {
    type: "SET_WIDGET_SELECTION",
    widgetId: "chatbot-visit",
    date: "2026-11-18",
    slotTime: "11:00",
  });

  // For footer-visit: 09:30 is locally reserved, 11:00 is held by chatbot-visit, 14:00 is server Booked
  const mergedForFooter = mergeSlotsWithLocalState(
    BASE_SLOTS,
    "2026-11-18",
    state,
    "footer-visit",
    "09:30"
  );

  assert.equal(mergedForFooter[0].disabled, true);
  assert.equal(mergedForFooter[0].isLocallyReserved, true);
  assert.equal(mergedForFooter[0].statusLabel, "Reserved");

  assert.equal(mergedForFooter[1].disabled, true);
  assert.equal(mergedForFooter[1].isSelectedByOther, true);
  assert.equal(mergedForFooter[1].statusLabel, "Selected Elsewhere");

  assert.equal(mergedForFooter[2].disabled, true);
  assert.equal(mergedForFooter[2].statusLabel, "Booked");

  // For chatbot-visit: 11:00 stays open and marked as Selected
  const mergedForChatbot = mergeSlotsWithLocalState(
    BASE_SLOTS,
    "2026-11-18",
    state,
    "chatbot-visit",
    "11:00"
  );
  assert.equal(mergedForChatbot[1].disabled, false);
  assert.equal(mergedForChatbot[1].isSelectedByCurrent, true);
  assert.equal(mergedForChatbot[1].statusLabel, "Selected");
});

test("computeNextOpenSlot and evaluateBookingSubmitState enforce disabled submit when fully reserved", () => {
  let state = createInitialSiteVisitLocalState();
  state = siteVisitLocalReducer(state, {
    type: "RESERVE_SLOT",
    booking: {
      id: "SV-301",
      date: "2026-11-18",
      slotTime: "09:30",
      slotLabel: "09:30 AM",
      locationName: "Kandy Showroom",
      visitorName: "Kasun",
    },
  });

  const oneOpen = mergeSlotsWithLocalState(BASE_SLOTS, "2026-11-18", state, "footer-visit", "09:30");
  assert.equal(computeNextOpenSlot(oneOpen, "09:30"), "11:00");
  assert.equal(evaluateBookingSubmitState(oneOpen, "09:30", false).canBook, false);
  assert.equal(evaluateBookingSubmitState(oneOpen, "11:00", false).canBook, true);

  state = siteVisitLocalReducer(state, {
    type: "RESERVE_SLOT",
    booking: {
      id: "SV-302",
      date: "2026-11-18",
      slotTime: "11:00",
      slotLabel: "11:00 AM",
      locationName: "Kandy Showroom",
      visitorName: "Ruwan",
    },
  });
  const noneOpen = mergeSlotsWithLocalState(BASE_SLOTS, "2026-11-18", state, "footer-visit", "11:00");
  assert.equal(computeNextOpenSlot(noneOpen, "11:00"), "");
  const submitState = evaluateBookingSubmitState(noneOpen, "", false);
  assert.equal(submitState.canBook, false);
  assert.equal(submitState.allSlotsReserved, true);
});

test("mergeCalendarCellsWithLocalState updates openSlotCount and storage serialization prunes past dates", () => {
  let state = createInitialSiteVisitLocalState();
  state = siteVisitLocalReducer(state, {
    type: "RESERVE_SLOT",
    booking: {
      id: "SV-401",
      date: "2026-11-18",
      slotTime: "09:30",
      slotLabel: "09:30 AM",
      locationName: "Nawala Showroom",
      visitorName: "Dinesh",
    },
    showToast: false,
  });

  const sampleCells: MonthlyCalendarCell[] = [
    {
      isoDate: "2026-11-18",
      dayNum: 18,
      dayShort: "Wed",
      monthShort: "Nov",
      weekday: 3,
      isCurrentMonth: true,
      isPast: false,
      available: true,
      openSlotCount: 4,
      totalSlotCount: 4,
      bookedCount: 0,
      isCustom: false,
      hasCustomSlots: false,
      source: "default",
    },
  ];
  const updatedCells = mergeCalendarCellsWithLocalState(sampleCells, state);
  assert.equal(updatedCells[0].openSlotCount, 3);
  assert.equal(updatedCells[0].bookedCount, 1);

  const raw = serializeReservedSlots(
    {
      ...state.reservedByKey,
      "2026-10-01|09:30": {
        key: "2026-10-01|09:30",
        date: "2026-10-01",
        slotTime: "09:30",
        slotLabel: "09:30 AM",
        bookingId: "SV-OLD",
        locationName: "Old",
        visitorName: "Old",
        reservedAt: "2026-10-01T09:00:00.000Z",
      },
    },
    "2026-11-14"
  );
  const restored = parseReservedSlotsFromStorage(raw, "2026-11-14");
  assert.ok(restored["2026-11-18|09:30"]);
  assert.equal(restored["2026-10-01|09:30"], undefined);
});
