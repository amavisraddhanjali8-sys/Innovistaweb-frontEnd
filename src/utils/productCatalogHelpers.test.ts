import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  DEFAULT_WHY_CHOOSE_ITEMS,
  MAX_CERTIFICATION_IMAGES,
  buildAccessoryShuffleDeckOrder,
  classifyHexColorFamily,
  countActiveFilters,
  createEmptyDesignDraft,
  createInitialFilterState,
  designMatchesCategory,
  filterAndSortDesigns,
  findCategoryByParam,
  flattenAccessoryVariants,
  hasPerformanceSpec,
  normalizeAccessories,
  normalizeCertificationImages,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  normalizeWhyChooseItems,
  parseFeatureTableFromExcelArrayBuffer,
  resolveRelatedDesigns,
  sanitizeDesignImages,
  slugifyCategoryName,
} from "./productCatalogHelpers.ts";

describe("productCatalogHelpers", () => {
  it("slugifies category names cleanly including ampersands and spaces", () => {
    assert.equal(slugifyCategoryName("Doors"), "doors");
    assert.equal(slugifyCategoryName("Shop Front"), "shop-front");
    assert.equal(slugifyCategoryName("Louvers & Sunshades"), "louvers-and-sunshades");
    assert.equal(slugifyCategoryName("   "), "category");
  });

  it("classifies finish hex codes accurately into color families", () => {
    assert.equal(classifyHexColorFamily("#1F2937"), "charcoal");
    assert.equal(classifyHexColorFamily("#000000"), "charcoal");
    assert.equal(classifyHexColorFamily("#9CA3AF"), "silver");
    assert.equal(classifyHexColorFamily("#926B46"), "bronze");
    assert.equal(classifyHexColorFamily("#F8FAFC"), "white");
    assert.equal(classifyHexColorFamily("#1E3A8A"), "navy");
  });

  it("matches designs across singular/plural category naming variations", () => {
    const doorDesign = DEFAULT_DESIGNS_CATALOG[0];
    assert.equal(designMatchesCategory(doorDesign, "Door"), true);
    assert.equal(designMatchesCategory(doorDesign, "Doors"), true);
    assert.equal(designMatchesCategory(doorDesign, DEFAULT_PRODUCT_CATEGORIES[0]), true);
    assert.equal(designMatchesCategory(doorDesign, "Bathrooms"), false);

    const foundCat = findCategoryByParam(DEFAULT_PRODUCT_CATEGORIES, "Shop Front");
    assert.equal(foundCat?.slug, "shop-front");
  });

  it("guarantees every seeded product category has matching designs and valid hero slides", () => {
    for (const category of DEFAULT_PRODUCT_CATEGORIES) {
      assert.ok(category.heroSlides.length >= 2, `${category.name} has >=2 hero slides`);
      const matched = DEFAULT_DESIGNS_CATALOG.filter((d) =>
        designMatchesCategory(d, category)
      );
      assert.ok(
        matched.length >= 1,
        `Category ${category.name} should match at least one seeded design`
      );
    }
  });

  it("filters by search, category, finish color, price ceiling, and sorts accurately", () => {
    const filter = {
      ...createInitialFilterState("doors"),
      colorFamily: "bronze" as const,
      maxPrice: 600000,
      sortBy: "price-desc" as const,
    };

    const result = filterAndSortDesigns(
      DEFAULT_DESIGNS_CATALOG,
      DEFAULT_PRODUCT_CATEGORIES,
      filter
    );

    assert.equal(result.length, 2);
    assert.ok((result[0].price || 0) >= (result[1].price || 0));
    assert.equal(countActiveFilters(filter), 4);
    assert.equal(countActiveFilters(filter, true), 3);

    const byName = filterAndSortDesigns(
      DEFAULT_DESIGNS_CATALOG,
      DEFAULT_PRODUCT_CATEGORIES,
      { ...createInitialFilterState("all"), searchQuery: "fluted" }
    );
    assert.equal(byName.length, 1);
    assert.equal(byName[0].DesignID, 8);

    const byPluralMultiWord = filterAndSortDesigns(
      DEFAULT_DESIGNS_CATALOG,
      DEFAULT_PRODUCT_CATEGORIES,
      { ...createInitialFilterState("all"), searchQuery: "sliding doors" }
    );
    assert.ok(byPluralMultiWord.some((d) => d.DesignID === 1));

    const byPluralWindows = filterAndSortDesigns(
      DEFAULT_DESIGNS_CATALOG,
      DEFAULT_PRODUCT_CATEGORIES,
      { ...createInitialFilterState("all"), searchQuery: "casement windows" }
    );
    assert.ok(byPluralWindows.some((d) => d.DesignID === 2));
  });

  it("normalizes categories, product landing CMS, and sanitizes blocked external URLs", () => {
    const normalizedCat = normalizeProductCategory({
      name: "Acoustic Facades",
      coverImage: "https://images.unsplash.com/photo-123",
      slideshowSpeedMs: 500,
    });
    assert.equal(normalizedCat.slug, "acoustic-facades");
    assert.equal(normalizedCat.slideshowSpeedMs, 1500);
    assert.ok(!normalizedCat.coverImage.includes("unsplash.com"));
    assert.ok(normalizedCat.heroSlides.length >= 1);

    const normalizedLanding = normalizeProductLandingCms({
      slideshowSpeedMs: 99999,
      whyChooseHeading: "Why Choose Innovista",
      whyChooseUs: [
        { id: "w1", metric: "12 Yrs", title: "Finish Life", percent: 150, icon: "shield", accent: "red" },
      ],
      heroSlides: [
        { id: "s1", headline: "Test Slide", subheadline: "Sub", image: "https://picsum.photos/200" },
      ],
    });
    assert.equal(normalizedLanding.slideshowSpeedMs, 20000);
    assert.equal(normalizedLanding.whyChooseHeading, "Why Choose Innovista");
    assert.equal(normalizedLanding.whyChooseUs.length, 1);
    assert.equal(normalizedLanding.whyChooseUs[0].percent, 100);
    assert.equal(
      normalizedLanding.heroSlides[0].image,
      DEFAULT_PRODUCT_LANDING_CMS.heroSlides[0].image
    );

    const fallbackWhy = normalizeWhyChooseItems([]);
    assert.equal(fallbackWhy.length, DEFAULT_WHY_CHOOSE_ITEMS.length);

    const sanitized = sanitizeDesignImages(["https://images.unsplash.com/abc"]);
    assert.equal(sanitized[0], "/assets/products/door.jpg");
  });

  it("normalizes full product detail fields and strips self-references from relatedProductIds", () => {
    const normalized = normalizeDesignItem({
      DesignID: 42,
      Design_Name: "Custom Pivot Entrance",
      Categories: ["Doors"],
      Design_Image: ["https://images.unsplash.com/bad-link"],
      relatedProductIds: [42, "1", "1", 9, ""],
      configurations: ["3-3-0", "4-1-3"],
      faqs: [{ id: "f1", question: "Wind load rated?", answer: "Yes, up to 2400 Pa." }],
    });

    assert.equal(normalized.DesignID, 42);
    assert.equal(normalized.Design_Image[0], "/assets/products/door.jpg");
    assert.deepEqual(normalized.relatedProductIds, ["1", 9]);
    assert.deepEqual(normalized.configurations, ["3-3-0", "4-1-3"]);
    assert.equal(normalized.faqs?.length, 1);
    assert.ok((normalized.features?.length ?? 0) >= 3);
    assert.ok((normalized.certifications?.length ?? 0) >= 4);
    assert.ok((normalized.customizations?.length ?? 0) === 6);
    assert.ok((normalized.partnerServices?.length ?? 0) === 3);
    assert.ok((normalized.downloads?.length ?? 0) >= 2);
  });

  it("preserves empty/unconfigured sections on blank drafts or cleared products so UI hides them cleanly", () => {
    const draft = createEmptyDesignDraft();
    const normalized = normalizeDesignItem({
      ...draft,
      DesignID: 99,
      Design_Name: "Minimal Louver Fin",
    });

    assert.equal(normalized.clientShowcases?.length, 0);
    assert.equal(normalized.certifications?.length, 0);
    assert.equal(normalized.certificationImages?.length, 0);
    assert.equal(normalized.faqs?.length, 0);
    assert.equal(normalized.advantages?.length, 0);
    assert.equal(normalized.customizations?.length, 0);
    assert.equal(normalized.partnerServices?.length, 0);
    assert.equal(normalized.accessories?.length, 0);
    assert.equal(normalized.features?.length, 0);
    assert.equal(normalized.configurations?.length, 0);
    assert.equal(normalized.downloads?.length, 0);
    assert.equal(hasPerformanceSpec(normalized.performance), false);
  });

  it("caps certification images cleanly at MAX_CERTIFICATION_IMAGES (8)", () => {
    const twelveItems = Array.from({ length: 12 }, (_, i) => ({
      id: `c-${i + 1}`,
      title: `Certificate ${i + 1}`,
      image: "/assets/about/facade.jpg",
    }));

    const capped = normalizeCertificationImages(twelveItems);
    assert.equal(capped.length, MAX_CERTIFICATION_IMAGES);
    assert.equal(capped.length, 8);
    assert.equal(capped[7].title, "Certificate 8");
  });

  it("parses custom product feature table from Excel (.xlsx) workbook buffer", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Profile Series", "Glass Thickness", "Sound Insulation", ""],
      ["IS-20 Standard", "24 mm Double", "38 dB"],
      ["", "", ""],
      ["IS-20 Acoustic", "32 mm Laminated", "42 dB", "Extra Flag"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spec Matrix");
    const uint8 = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const parsed = parseFeatureTableFromExcelArrayBuffer(uint8);
    assert.equal(parsed.title, "Spec Matrix");
    assert.deepEqual(parsed.headers, [
      "Profile Series",
      "Glass Thickness",
      "Sound Insulation",
      "Column 4",
    ]);
    assert.equal(parsed.rows.length, 2);
    assert.deepEqual(parsed.rows[0], ["IS-20 Standard", "24 mm Double", "38 dB", ""]);
    assert.deepEqual(parsed.rows[1], ["IS-20 Acoustic", "32 mm Laminated", "42 dB", "Extra Flag"]);
  });

  it("normalizes product accessories with brand logos & multiple variants and flattens them for ribbon playback", () => {
    const normalized = normalizeAccessories([
      {
        id: "a1",
        name: "Multi-Point Handles",
        subtitle: "Architectural lever pulls",
        brandName: "NordicLock",
        brandLogo: "/assets/logos/partner-nordiclock.svg",
        image: "/assets/products/door.jpg",
        variants: [
          {
            id: "v1",
            name: "Matte Black Lever",
            code: "INV-01",
            finish: "Charcoal",
            spec: "SS316",
            image: "/assets/products/door.jpg",
          },
          {
            id: "v2",
            name: "Champagne Long Pull",
            code: "INV-02",
            finish: "Bronze",
            spec: "450mm",
            image: "/assets/products/hero-showroom.jpg",
          },
        ],
      },
      {
        id: "a2",
        name: "Unbranded Track",
        subtitle: "",
        brandName: "",
        brandLogo: "https://images.unsplash.com/blocked",
        image: "/assets/about/facade.jpg",
        variants: [],
      },
    ]);

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].brandName, "NordicLock");
    assert.equal(normalized[0].brandLogo, "/assets/logos/partner-nordiclock.svg");
    assert.equal(normalized[0].variants.length, 2);
    assert.equal(normalized[1].brandLogo, "");

    const deckOrder = buildAccessoryShuffleDeckOrder(normalized, 1, 3);
    assert.equal(deckOrder.length, 2);
    assert.equal(deckOrder[0].item.id, "a2");
    assert.equal(deckOrder[0].slotIndex, 0);
    assert.equal(deckOrder[1].item.id, "a1");
    assert.equal(deckOrder[1].slotIndex, 1);

    const cycled = buildAccessoryShuffleDeckOrder(["A", "B", "C", "D"], 3, 3);
    assert.deepEqual(
      cycled.map((c) => c.item),
      ["D", "A", "B"]
    );

    const flat = flattenAccessoryVariants(normalized);
    assert.equal(flat.length, 3);
    assert.equal(flat[1].variant.code, "INV-02");
    assert.equal(flat[1].accessoryIndex, 0);
    assert.equal(flat[1].variantIndex, 1);
  });

  it("resolves admin-linked related products in link order and excludes self or invalid IDs", () => {
    const base = {
      ...DEFAULT_DESIGNS_CATALOG[0],
      relatedProductIds: [8, 99999, 1, 5],
    };

    const resolved = resolveRelatedDesigns(
      base,
      DEFAULT_DESIGNS_CATALOG,
      DEFAULT_PRODUCT_CATEGORIES,
      4
    );

    assert.equal(resolved.length, 4);
    assert.equal(resolved[0].DesignID, 8);
    assert.equal(resolved[1].DesignID, 5);
    assert.ok(!resolved.some((d) => d.DesignID === 1), "Must exclude self DesignID");
    assert.equal(resolved[2].DesignID, 9, "Fills remaining slot with same-category Door item");
  });
});

