import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGmailRawMessage,
  buildGoogleCalendarEventPayload,
  computeAvailableSlotsForDate,
  getUpcomingSiteVisitDates,
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
