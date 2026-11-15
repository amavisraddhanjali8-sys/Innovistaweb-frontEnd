import test from "node:test";
import assert from "node:assert/strict";
import {
  addScheduleSlot,
  applyMonthlyTemplateToSchedule,
  buildGmailRawMessage,
  buildGoogleCalendarEventPayload,
  buildMonthlySiteVisitCalendar,
  computeAvailableSlotsForDate,
  createDefaultSiteVisitSchedule,
  deleteMonthlyTemplateFromSchedule,
  deleteScheduleDate,
  deleteScheduleSlot,
  getFirstOpenDateInMonth,
  getManagedSiteVisitDates,
  getUpcomingSiteVisitDates,
  shiftMonthKey,
  toggleScheduleSlotAvailability,
  updateScheduleSlot,
  upsertScheduleDate,
  validateSiteVisitBooking,
  type SiteVisitBooking,
} from "./siteVisitSchedulerHelpers.ts";

test("getUpcomingSiteVisitDates skips Sundays and returns requested count", () => {
  // Friday Nov 13, 2026 -> next days include Sat Nov 14, skips Sun Nov 15, then Mon Nov 16
  const dates = getUpcomingSiteVisitDates(4, new Date(2026, 10, 13));
  assert.equal(dates.length, 4);
  assert.equal(dates[0].date, "2026-11-14");
  assert.equal(dates[1].date, "2026-11-16");
});

test("computeAvailableSlotsForDate marks booked, blocked, and Google Calendar busy slots unavailable", () => {
  const bookings: SiteVisitBooking[] = [
    {
      id: "sv-1",
      date: "2026-11-16",
      slotTime: "09:30",
      slotLabel: "09:30 AM",
      locationName: "Nawala",
      visitorName: "Nimal",
      visitorEmail: "nimal@example.com",
      visitorPhone: "+94771234567",
      notes: "",
      status: "CONFIRMED",
      createdAt: "2026-11-13T00:00:00Z",
    },
    {
      id: "sv-2",
      date: "2026-11-16",
      slotTime: "15:30",
      slotLabel: "03:30 PM",
      locationName: "Nawala",
      visitorName: "Cancelled User",
      visitorEmail: "c@example.com",
      visitorPhone: "+94771234567",
      notes: "",
      status: "CANCELLED",
      createdAt: "2026-11-13T00:00:00Z",
    },
  ];

  const slots = computeAvailableSlotsForDate(
    "2026-11-16",
    bookings,
    ["2026-11-16|11:00"],
    [{ start: "2026-11-16T14:15:00+05:30", end: "2026-11-16T14:45:00+05:30" }]
  );

  assert.equal(slots[0].available, false);
  assert.equal(slots[0].reason, "Booked");
  assert.equal(slots[1].available, false);
  assert.equal(slots[1].reason, "Blocked");
  assert.equal(slots[2].available, false);
  assert.equal(slots[2].reason, "Calendar Busy");
  assert.equal(slots[3].available, true); // CANCELLED booking does not block slot
});

test("admin schedule helpers support adding/toggling/deleting dates and adding/editing/toggling/deleting slots", () => {
  let schedule = createDefaultSiteVisitSchedule();

  // Add a custom future date marked unavailable first, then toggle available
  schedule = upsertScheduleDate(schedule, {
    date: "2026-12-20",
    available: false,
    note: "Showroom Holiday",
    isCustom: true,
  });

  const closedSlots = computeAvailableSlotsForDate(
    "2026-12-20",
    [],
    schedule.blockedKeys,
    [],
    schedule
  );
  assert.equal(closedSlots.every((s) => !s.available && s.reason === "Date Unavailable"), true);

  // Mark date available and add a custom evening slot
  schedule = upsertScheduleDate(schedule, { date: "2026-12-20", available: true });
  schedule = addScheduleSlot(schedule, "2026-12-20", {
    time: "17:00",
    endTime: "18:00",
    label: "05:00 PM Evening",
    available: true,
  });

  let openSlots = computeAvailableSlotsForDate(
    "2026-12-20",
    [],
    schedule.blockedKeys,
    [],
    schedule
  );
  assert.equal(openSlots.length, 5);
  assert.equal(openSlots[4].time, "17:00");
  assert.equal(openSlots[4].label, "05:00 PM Evening");
  assert.equal(openSlots[4].available, true);

  // Edit slot label & time, then toggle unavailable
  const addedId = openSlots[4].id!;
  schedule = updateScheduleSlot(schedule, "2026-12-20", addedId, {
    time: "17:30",
    endTime: "18:30",
    label: "05:30 PM Extended",
  });
  schedule = toggleScheduleSlotAvailability(schedule, "2026-12-20", addedId);

  openSlots = computeAvailableSlotsForDate(
    "2026-12-20",
    [],
    schedule.blockedKeys,
    [],
    schedule
  );
  const edited = openSlots.find((s) => s.id === addedId);
  assert.ok(edited);
  if (!edited) return;
  assert.equal(edited.time, "17:30");
  assert.equal(edited.label, "05:30 PM Extended");
  assert.equal(edited.available, false);
  assert.equal(edited.reason, "Unavailable");

  // Managed dates list includes custom date with accurate counts
  const managed = getManagedSiteVisitDates(schedule, [], 4, new Date(2026, 10, 13));
  const customEntry = managed.find((d) => d.date === "2026-12-20");
  assert.ok(customEntry);
  if (!customEntry) return;
  assert.equal(customEntry.openSlotCount, 4);
  assert.equal(customEntry.totalSlotCount, 5);

  // Delete slot & delete custom date
  schedule = deleteScheduleSlot(schedule, "2026-12-20", addedId);
  openSlots = computeAvailableSlotsForDate(
    "2026-12-20",
    [],
    schedule.blockedKeys,
    [],
    schedule
  );
  assert.equal(openSlots.length, 4);

  schedule = deleteScheduleDate(schedule, "2026-12-20");
  assert.equal(Boolean(schedule.dates["2026-12-20"]), false);
});

test("monthly templates apply slot profiles across a month, respect activeWeekdays & closedDates, and build aligned calendar cells", () => {
  assert.equal(shiftMonthKey("2026-11", 1), "2026-12");
  assert.equal(shiftMonthKey("2026-12", 1), "2027-01");
  assert.equal(shiftMonthKey("2026-01", -1), "2025-12");

  let schedule = createDefaultSiteVisitSchedule();
  // Configure December 2026: Mon-Fri only (weekdays 1..5), Dec 25 closed, and 2 custom slots (10:00, 16:00)
  schedule = applyMonthlyTemplateToSchedule(schedule, {
    monthKey: "2026-12",
    activeWeekdays: [1, 2, 3, 4, 5],
    closedDates: ["2026-12-25"],
    note: "December Festive Hours",
    slots: [
      { time: "10:00", endTime: "11:00", label: "10:00 AM Festive", available: true },
      { time: "16:00", endTime: "17:00", label: "04:00 PM Festive", available: true },
    ],
  });

  // 2026-12-01 is Tuesday -> active weekday, 2 monthly slots
  const dec1Slots = computeAvailableSlotsForDate("2026-12-01", [], [], [], schedule);
  assert.equal(dec1Slots.length, 2);
  assert.equal(dec1Slots[0].label, "10:00 AM Festive");
  assert.equal(dec1Slots[1].available, true);

  // 2026-12-05 is Saturday (weekday 6) -> closed by Mon-Fri monthly mask
  const dec5Slots = computeAvailableSlotsForDate("2026-12-05", [], [], [], schedule);
  assert.equal(dec5Slots.every((s) => !s.available && s.reason === "Date Unavailable"), true);

  // 2026-12-25 is Friday -> closed by monthly closedDates
  const dec25Slots = computeAvailableSlotsForDate("2026-12-25", [], [], [], schedule);
  assert.equal(dec25Slots.every((s) => !s.available && s.reason === "Date Unavailable"), true);

  // Calendar grid for 2026-12: Dec 1 2026 is Tuesday (weekday 2) -> 2 leading pad cells + 31 days = 33 cells
  const cells = buildMonthlySiteVisitCalendar("2026-12", schedule, [], "2026-12-10");
  assert.equal(cells.length, 33);
  assert.equal(cells[0].isCurrentMonth, false);
  assert.equal(cells[1].isCurrentMonth, false);
  assert.equal(cells[2].isoDate, "2026-12-01");
  assert.equal(cells[2].isPast, true);

  const dec14Cell = cells.find((c) => c.isoDate === "2026-12-14");
  assert.ok(dec14Cell);
  assert.equal(dec14Cell?.available, true);
  assert.equal(dec14Cell?.openSlotCount, 2);
  assert.equal(dec14Cell?.source, "month");

  // First open date on or after 2026-12-10 -> 2026-12-10 (Thursday)
  assert.equal(getFirstOpenDateInMonth("2026-12", schedule, [], "2026-12-10"), "2026-12-10");

  // Other months (2027-01) still inherit global defaults (4 slots, Mon-Sat)
  const janSlots = computeAvailableSlotsForDate("2027-01-04", [], [], [], schedule);
  assert.equal(janSlots.length, 4);

  // Reset December back to global defaults
  schedule = deleteMonthlyTemplateFromSchedule(schedule, "2026-12");
  const dec1Reset = computeAvailableSlotsForDate("2026-12-01", [], [], [], schedule);
  assert.equal(dec1Reset.length, 4);
});

test("validateSiteVisitBooking checks required fields", () => {
  const invalid = validateSiteVisitBooking({
    date: "",
    slotTime: "",
    visitorName: "A",
    visitorEmail: "bad",
    visitorPhone: "123",
  });
  assert.ok(invalid.date);
  assert.ok(invalid.slotTime);
  assert.ok(invalid.visitorName);
  assert.ok(invalid.visitorEmail);
  assert.ok(invalid.visitorPhone);

  const valid = validateSiteVisitBooking({
    date: "2026-11-16",
    slotTime: "11:00",
    visitorName: "Kasun Perera",
    visitorEmail: "kasun@example.com",
    visitorPhone: "+94 77 123 4567",
  });
  assert.deepEqual(valid, {});
});

test("buildGoogleCalendarEventPayload & buildGmailRawMessage format clean payloads", () => {
  const cal = buildGoogleCalendarEventPayload({
    date: "2026-11-16",
    slotTime: "11:00",
    visitorName: "Kasun Perera",
    visitorEmail: "kasun@example.com",
    visitorPhone: "+94 77 123 4567",
    locationName: "Nawala Showroom",
    companyEmail: "innovistametal@gmail.com",
  });
  assert.equal(cal.start.dateTime, "2026-11-16T11:00:00+05:30");
  assert.equal(cal.end.dateTime, "2026-11-16T12:00:00+05:30");
  assert.equal(cal.attendees.length, 2);

  const raw = buildGmailRawMessage({
    to: "kasun@example.com",
    cc: "innovistametal@gmail.com",
    subject: "Site Visit Confirmed",
    bodyText: "See you at 11:00 AM.",
  });
  assert.equal(raw.includes("+"), false);
  assert.equal(raw.includes("/"), false);
  assert.equal(raw.includes("="), false);
});
