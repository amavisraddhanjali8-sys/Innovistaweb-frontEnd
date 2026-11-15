import test from "node:test";
import assert from "node:assert/strict";
import {
  BUILDING_CYCLE_SECONDS,
  BUILDING_FLOOR_COUNT,
  computeBuildingConstructionFrame,
  computeVintagePhoneRingState,
} from "./footerBuildingHelpers.ts";

test("corporate building construction progresses smoothly through core, slabs, and glazing", () => {
  const early = computeBuildingConstructionFrame(0.9, 0, 0);
  const mid = computeBuildingConstructionFrame(BUILDING_CYCLE_SECONDS * 0.52, 0.5, -0.5);
  const late = computeBuildingConstructionFrame(BUILDING_CYCLE_SECONDS * 0.86, 2, -2);

  assert.equal(early.floors.length, BUILDING_FLOOR_COUNT);
  assert.ok(early.coreProgress < mid.coreProgress);
  assert.ok(late.floors[0].glazingProgress >= 0.99);
  assert.ok(late.floors[BUILDING_FLOOR_COUNT - 1].slabProgress > early.floors[0].slabProgress);

  // Pointer parallax is clamped cleanly even on out-of-range inputs
  assert.ok(Math.abs(late.parallaxX) <= 14);
  assert.ok(Math.abs(late.parallaxY) <= 8);
});

test("vintage 3D phone automatically shakes and scales up and down across its attention cycle", () => {
  const scales: number[] = [];
  let maxShake = 0;
  let maxHandsetLift = 0;

  for (let i = 0; i < 40; i += 1) {
    const t = i * 0.08;
    const state = computeVintagePhoneRingState(t, false, false);
    scales.push(state.scale);
    maxShake = Math.max(maxShake, Math.abs(state.bodyShakeZ), Math.abs(state.handsetShakeZ));
    maxHandsetLift = Math.max(maxHandsetLift, state.handsetLiftY);
  }

  const minScale = Math.min(...scales);
  const maxScale = Math.max(...scales);

  assert.ok(maxScale - minScale > 0.12, `Expected visible scale oscillation, got ${minScale}..${maxScale}`);
  assert.ok(maxShake > 0.08, "Expected automatic ringing shake angle");
  assert.ok(maxHandsetLift > 0.03, "Expected handset rattle bounce during ring burst");

  const hovered = computeVintagePhoneRingState(0.5, true, false);
  const idle = computeVintagePhoneRingState(0.5, false, false);
  assert.ok(hovered.scale >= idle.scale);
});
