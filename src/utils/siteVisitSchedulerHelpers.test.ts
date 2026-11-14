import test from "node:test";
import assert from "node:assert/strict";
import {
  addScheduleSlot,
  buildGmailRawMessage,
  buildGoogleCalendarEventPayload,
  computeAvailableSlotsForDate,
  createDefaultSiteVisitSchedule,
  deleteScheduleDate,
  deleteScheduleSlot,
  getManagedSiteVisitDates,
  getUpcomingSiteVisitDates,
  toggleScheduleSlotAvailability,
  updateScheduleSlot,
  upsertScheduleDate,
  validateSiteVisitBooking,
  type SiteVisitBooking,
} from "./siteVisitSchedulerHelpers";

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
