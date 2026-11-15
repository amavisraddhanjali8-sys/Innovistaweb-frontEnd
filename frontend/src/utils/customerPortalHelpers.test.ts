import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDraftCartOrderPayload,
  computeSiteVisitCountdown,
  filterCustomerPortalRecords,
  getLocalIsoDateOffset,
} from "./customerPortalHelpers.ts";

describe("customerPortalHelpers", () => {
  it("computes live countdown for upcoming, in-progress, elapsed, completed, and cancelled site visits", () => {
    const now = new Date(2026, 4, 10, 9, 0, 0, 0).getTime();

    // 2 days, 2 hours, 30 minutes, 0 seconds ahead
    const upcomingMultiDay = computeSiteVisitCountdown("2026-05-12", "11:30", "CONFIRMED", now);
    assert.equal(upcomingMultiDay.state, "upcoming");
    assert.equal(upcomingMultiDay.days, 2);
    assert.equal(upcomingMultiDay.hours, 2);
    assert.equal(upcomingMultiDay.minutes, 30);
    assert.equal(upcomingMultiDay.seconds, 0);
    assert.equal(upcomingMultiDay.formatted, "2d 02h 30m 00s");
    assert.equal(upcomingMultiDay.isUrgent, false);

    // Same day (2 hours ahead -> urgent)
    const sameDay = computeSiteVisitCountdown("2026-05-10", "11:00", "CONFIRMED", now);
    assert.equal(sameDay.state, "upcoming");
    assert.equal(sameDay.label, "Starts Today");
    assert.equal(sameDay.formatted, "02h 00m 00s");
    assert.equal(sameDay.isUrgent, true);

    // 46 hours ahead (2 calendar days: May 10 13:00 -> May 12 11:00) must read "Upcoming Visit", not "Tomorrow"
    const afternoonNow = new Date(2026, 4, 10, 13, 0, 0, 0).getTime();
    assert.equal(
      computeSiteVisitCountdown("2026-05-12", "11:00", "CONFIRMED", afternoonNow).label,
      "Upcoming Visit"
    );
    assert.equal(
      computeSiteVisitCountdown("2026-05-11", "11:00", "CONFIRMED", afternoonNow).label,
      "Tomorrow"
    );

    // Within the 1-hour slot window
    const live = computeSiteVisitCountdown("2026-05-10", "08:30", "CONFIRMED", now);
    assert.equal(live.state, "in-progress");
    assert.equal(live.formatted, "Live Now");

    // Past the 1-hour window
    const past = computeSiteVisitCountdown("2026-05-09", "09:30", "CONFIRMED", now);
    assert.equal(past.state, "elapsed");

    // Completed / Cancelled override
    assert.equal(
      computeSiteVisitCountdown("2026-05-12", "11:30", "COMPLETED", now).state,
      "completed"
    );
    assert.equal(
      computeSiteVisitCountdown("2026-05-12", "11:30", "CANCELLED", now).state,
      "cancelled"
    );
  });

  it("filters orders, RFQs, and site visits accurately per customer and returns all for admin", () => {
    const orders = [
      { OrderID: "ORD-1", Client_Email: "duminda@zenithcapital.lk" },
      { OrderID: "ORD-2", Client_Email: "other@example.com" },
    ];
    const rfqs = [
      { id: 1, email: "DUMINDA@zenithcapital.lk", customerUserId: 3 },
      { id: 2, email: "someone@else.lk", customerUserId: 3 },
      { id: 3, email: "other@example.com", customerUserId: 99 },
    ];
    const siteVisits = [
      { id: "SV-1", visitorEmail: "duminda@zenithcapital.lk" },
      { id: "SV-2", visitorEmail: "other@example.com" },
    ];

    const customerFiltered = filterCustomerPortalRecords({
      orders,
      rfqs,
      siteVisits,
      email: "duminda@zenithcapital.lk",
      userId: 3,
      isAdmin: false,
    });
    assert.equal(customerFiltered.orders.length, 1);
    assert.equal(customerFiltered.rfqs.length, 2);
    assert.equal(customerFiltered.siteVisits.length, 1);

    const adminView = filterCustomerPortalRecords({
      orders,
      rfqs,
      siteVisits,
      email: "admin@innovista.com",
      userId: 1,
      isAdmin: true,
    });
    assert.equal(adminView.orders.length, 2);
    assert.equal(adminView.rfqs.length, 3);
    assert.equal(adminView.siteVisits.length, 2);
  });

  it("builds draft cart order payloads and future ISO dates cleanly", () => {
    const payload = buildDraftCartOrderPayload({
      customerName: "Duminda Perera",
      customerEmail: "duminda@zenithcapital.lk",
      customerPhone: "+94 77 455 1200",
      designIds: ["1", 4],
    });
    assert.equal(payload.Order_Status, "PENDING");
    assert.equal(payload.Designs.length, 2);
    assert.deepEqual(payload.Designs[0], { DesignID: "1" });

    const iso = getLocalIsoDateOffset(3, new Date(2026, 4, 10));
    assert.equal(iso, "2026-05-13");
  });
});
