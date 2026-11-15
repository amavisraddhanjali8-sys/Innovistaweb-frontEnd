import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTER_POSES,
  buildContactDeckOrder,
  buildContactShuffleCards,
  composeSplitFullName,
  getContactCardTheme,
  getContactIntentMeta,
  getNextPose,
  splitFullName,
} from "./contactShowcaseHelpers";
import { DEFAULT_SITE_CONTACT_SETTINGS } from "../../../shared/footerConsultationHelpers";

test("getNextPose cycles through handshake -> call -> quote -> handshake", () => {
  assert.equal(getNextPose("handshake"), "call");
  assert.equal(getNextPose("call"), "quote");
  assert.equal(getNextPose("quote"), "handshake");
  assert.equal(CHARACTER_POSES.handshake.speechHeadline, "Contact Us!");
});

test("buildContactDeckOrder wraps cleanly and preserves visible slot depth", () => {
  const cards = buildContactShuffleCards(DEFAULT_SITE_CONTACT_SETTINGS);
  assert.equal(cards.length, 4);

  const deckAtStart = buildContactDeckOrder(cards, 0, 3);
  assert.deepEqual(
    deckAtStart.map((d) => [d.originalIndex, d.slotIndex]),
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ]
  );

  const deckWrapped = buildContactDeckOrder(cards, 3, 3);
  assert.deepEqual(
    deckWrapped.map((d) => [d.originalIndex, d.slotIndex]),
    [
      [3, 0],
      [0, 1],
      [1, 2],
    ]
  );

  assert.deepEqual(buildContactDeckOrder([], 0, 3), []);
});

test("splitFullName and composeSplitFullName round-trip cleanly", () => {
  assert.equal(composeSplitFullName("Kavinda", "Silva"), "Kavinda Silva");
  assert.equal(composeSplitFullName("  Amaya ", ""), "Amaya");

  assert.deepEqual(splitFullName("Kavinda Perera Silva"), {
    firstName: "Kavinda",
    lastName: "Perera Silva",
  });
  assert.deepEqual(splitFullName(""), { firstName: "", lastName: "" });
});

test("getContactIntentMeta returns valid department & preset for each toggle", () => {
  const quote = getContactIntentMeta("quote");
  const visit = getContactIntentMeta("visit");
  const callback = getContactIntentMeta("callback");

  assert.equal(quote.department, "Sales & Estimations");
  assert.equal(visit.department, "Technical & CAD Desk");
  assert.equal(callback.department, "After-Sales & Warranty");
  assert.ok(quote.subjectPreset.length > 5);
});

test("getContactCardTheme provides distinct gradients and labels per card kind", () => {
  const kinds = ["hotline", "sales", "engineering", "social"] as const;
  const gradients = new Set(kinds.map((k) => getContactCardTheme(k).gradient));
  assert.equal(gradients.size, 4);
  for (const kind of kinds) {
    const theme = getContactCardTheme(kind);
    assert.ok(theme.gradient.includes("linear-gradient"));
    assert.ok(theme.ctaLabel.length > 4);
  }
});
