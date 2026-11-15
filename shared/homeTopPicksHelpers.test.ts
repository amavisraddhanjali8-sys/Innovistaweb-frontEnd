import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  MAX_RIBBON_SPEED,
  MIN_RIBBON_SPEED,
  clampAccessoriesRibbonSpeed,
  deleteHomeAccessoryRibbonItem,
  getHomeProductDisplayImage,
  moveHomeAccessoryRibbonItem,
  moveSelectedHomeProduct,
  normalizeHomeFeaturedProductsCms,
  resolveSelectedHomeDesigns,
  toggleHomeAccessoryRibbonItemActive,
  toggleSelectedHomeProduct,
  upsertHomeAccessoryRibbonItem,
} from "./homeTopPicksHelpers.ts";
import { DEFAULT_DESIGNS_CATALOG } from "./productCatalogHelpers.ts";

test("normalizeHomeFeaturedProductsCms preserves defaults and clamps ribbon speed", () => {
  const normalized = normalizeHomeFeaturedProductsCms({});
  assert.equal(normalized.heading, "Our Top Picks");
  assert.deepEqual(normalized.selectedProductIds, [1, 2, 3, 4, 5, 6]);
  assert.ok(normalized.accessoriesRibbonItems.length >= 6);
  assert.equal(normalized.showAccessoriesRibbon, true);

  assert.equal(clampAccessoriesRibbonSpeed(2), MIN_RIBBON_SPEED);
  assert.equal(clampAccessoriesRibbonSpeed(999), MAX_RIBBON_SPEED);
  assert.equal(clampAccessoriesRibbonSpeed("invalid", 50), 50);
});

test("resolveSelectedHomeDesigns preserves admin sequence, resolves unique images, and falls back safely", () => {
  const resolved = resolveSelectedHomeDesigns([8, 2, 99999, 1], DEFAULT_DESIGNS_CATALOG);
  assert.deepEqual(
    resolved.map((d) => d.DesignID),
    [8, 2, 1]
  );

  // Each selected product has its own distinct photo and supports admin overrides
  const img1 = getHomeProductDisplayImage(resolved[0]);
  const img2 = getHomeProductDisplayImage(resolved[1]);
  assert.notEqual(img1, img2);

  const overridden = getHomeProductDisplayImage(resolved[0], {
    "8": "/uploads/custom-wardrobe.jpg",
  });
  assert.equal(overridden, "/uploads/custom-wardrobe.jpg");

  // Falls back cleanly when selected IDs yield zero matches
  const fallback = resolveSelectedHomeDesigns([99999], DEFAULT_DESIGNS_CATALOG, 4);
  assert.equal(fallback.length, 4);
});

test("toggleSelectedHomeProduct and moveSelectedHomeProduct manage Home selection cleanly", () => {
  let ids: (string | number)[] = [1, 2, 3];
  ids = toggleSelectedHomeProduct(ids, 8);
  assert.deepEqual(ids, [1, 2, 3, 8]);

  ids = moveSelectedHomeProduct(ids, 3, -1);
  assert.deepEqual(ids, [1, 2, 8, 3]);

  ids = toggleSelectedHomeProduct(ids, 2);
  assert.deepEqual(ids, [1, 8, 3]);

  // Prevents removing the last remaining Home product
  const single = toggleSelectedHomeProduct([1], 1);
  assert.deepEqual(single, [1]);
});

test("accessory ribbon item CRUD helpers add, edit, toggle visibility, reorder, and delete safely", () => {
  let items = DEFAULT_HOME_FEATURED_PRODUCTS_CMS.accessoriesRibbonItems.slice(0, 2);

  items = upsertHomeAccessoryRibbonItem(items, {
    title: "Coastal SS316 Pivot Hinge",
    subtitle: "INV-PVT-316",
    image: "/uploads/pivot-hinge.jpg",
    linkTo: "/products/9",
    active: true,
  });
  assert.equal(items.length, 3);
  const createdId = items[2].id;
  assert.equal(items[2].title, "Coastal SS316 Pivot Hinge");

  items = upsertHomeAccessoryRibbonItem(
    items,
    {
      title: "Marine Grade Pivot Hinge Pro",
      subtitle: "INV-PVT-PRO",
      image: "/uploads/pivot-hinge-pro.jpg",
    },
    createdId
  );
  assert.equal(items[2].title, "Marine Grade Pivot Hinge Pro");

  items = toggleHomeAccessoryRibbonItemActive(items, createdId);
  assert.equal(items[2].active, false);

  items = moveHomeAccessoryRibbonItem(items, 2, -1);
  assert.equal(items[1].id, createdId);

  items = deleteHomeAccessoryRibbonItem(items, createdId);
  assert.equal(items.length, 2);

  // Keeps at least 1 item
  const oneLeft = deleteHomeAccessoryRibbonItem([items[0]], items[0].id);
  assert.equal(oneLeft.length, 1);
});
