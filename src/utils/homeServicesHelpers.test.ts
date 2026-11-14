import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOME_SERVICES_CMS,
  clampServicesDurationMs,
  deleteHomeService,
  moveHomeService,
  normalizeHomeServicesCms,
  toggleHomeServiceActive,
  upsertHomeService,
} from "./homeServicesHelpers";

test("normalizeHomeServicesCms preserves defaults and clamps duration bounds", () => {
  assert.equal(DEFAULT_HOME_SERVICES_CMS.items.length, 12);
  const cms = normalizeHomeServicesCms({
    heading: "Custom Capabilities",
    subheading: "Built to your specification.",
    durationMs: 500,
    items: [
      {
        id: "srv-1",
        image: "/uploads/custom.jpg",
        title: "Skylight Canopies",
        description1: "Structural laminated glass roofs.",
        description2: "Weather-sealed aluminium rafters.",
        active: true,
      },
    ],
  });

  assert.equal(cms.heading, "Custom Capabilities");
  assert.equal(cms.subheading, "Built to your specification.");
  assert.equal(cms.durationMs, 3000);
  assert.equal(cms.items.length, 1);
  assert.equal(cms.items[0].title, "Skylight Canopies");
  assert.ok(clampServicesDurationMs(999999) <= 30000);
});

test("upsertHomeService, moveHomeService, toggleHomeServiceActive, and deleteHomeService work safely", () => {
  const initial = [...DEFAULT_HOME_SERVICES_CMS.items];

  // Add new service
  const withAdded = upsertHomeService(initial, {
    image: "/uploads/pergola.jpg",
    title: "Bioclimatic Aluminium Pergolas",
    description1: "Motorized louver roofs for terraces.",
    description2: "Integrated rainwater drainage channels.",
  });
  assert.equal(withAdded.length, initial.length + 1);
  const added = withAdded[withAdded.length - 1];
  assert.equal(added.title, "Bioclimatic Aluminium Pergolas");

  // Edit existing service
  const edited = upsertHomeService(
    withAdded,
    {
      image: "/uploads/pergola-v2.jpg",
      title: "Motorized Architectural Pergolas",
      description1: "Updated engineering overview.",
      description2: "LED perimeter lighting option.",
    },
    added.id
  );
  assert.equal(edited.length, withAdded.length);
  assert.equal(edited[edited.length - 1].title, "Motorized Architectural Pergolas");
  assert.equal(edited[edited.length - 1].image, "/uploads/pergola-v2.jpg");

  // Toggle visibility
  const hidden = toggleHomeServiceActive(edited, added.id);
  assert.equal(hidden[hidden.length - 1].active, false);
  const shown = toggleHomeServiceActive(hidden, added.id);
  assert.equal(shown[shown.length - 1].active, true);

  // Move up
  const moved = moveHomeService(shown, shown.length - 1, -1);
  assert.equal(moved[moved.length - 2].id, added.id);

  // Delete safely (never allows 0 services)
  const deleted = deleteHomeService(moved, added.id);
  assert.equal(deleted.length, initial.length);
  const single = deleteHomeService([deleted[0]], deleted[0].id);
  assert.equal(single.length, 1);
});
