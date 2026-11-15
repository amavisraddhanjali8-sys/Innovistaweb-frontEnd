import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeNextWrappedIndex,
  detectHorizontalSwipe,
  detectVerticalSwipeDown,
  getResponsivePaginationConfig,
} from "./touchGestureHelpers.ts";

test("detectHorizontalSwipe identifies left and right swipes past threshold", () => {
  assert.equal(detectHorizontalSwipe(240, 300, 170, 310, 320), "left");
  assert.equal(detectHorizontalSwipe(120, 300, 210, 290, 350), "right");
});

test("detectHorizontalSwipe supports quick flicks shorter than default distance", () => {
  assert.equal(detectHorizontalSwipe(200, 300, 170, 302, 160), "left");
  assert.equal(detectHorizontalSwipe(200, 300, 170, 302, 500), null);
});

test("detectHorizontalSwipe ignores vertical scroll gestures and tiny taps", () => {
  // Predominantly vertical movement should not trigger slide change
  assert.equal(detectHorizontalSwipe(200, 200, 150, 280, 200), null);
  // Tap jitter
  assert.equal(detectHorizontalSwipe(200, 200, 208, 202, 90), null);
  // Invalid numbers
  assert.equal(detectHorizontalSwipe(Number.NaN, 0, 100, 0, 100), null);
});

test("detectVerticalSwipeDown detects downward sheet dismissal and rejects upward or sideways motion", () => {
  assert.equal(detectVerticalSwipeDown(180, 120, 188, 200, 320), true);
  assert.equal(detectVerticalSwipeDown(180, 120, 184, 158, 180), true);
  assert.equal(detectVerticalSwipeDown(180, 200, 180, 120, 180), false);
  assert.equal(detectVerticalSwipeDown(100, 100, 200, 150, 180), false);
});

test("computeNextWrappedIndex safely wraps forward and backward", () => {
  assert.equal(computeNextWrappedIndex(0, -1, 5), 4);
  assert.equal(computeNextWrappedIndex(4, 1, 5), 0);
  assert.equal(computeNextWrappedIndex(2, 2, 5), 4);
  assert.equal(computeNextWrappedIndex(0, 1, 0), 0);
});

test("getResponsivePaginationConfig adapts across mobile, tablet, and desktop", () => {
  assert.deepEqual(getResponsivePaginationConfig(390), {
    simple: true,
    showSizeChanger: false,
    maxButtons: 3,
  });
  assert.deepEqual(getResponsivePaginationConfig(768), {
    simple: false,
    showSizeChanger: false,
    maxButtons: 5,
  });
  assert.deepEqual(getResponsivePaginationConfig(1440), {
    simple: false,
    showSizeChanger: true,
    maxButtons: 7,
  });
});
