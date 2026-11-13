import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_AD_PAGE_KEYS,
  DEFAULT_PAGE_ADS_CMS,
  countActiveAndPausedAds,
  getNextSlideIndex,
  getPrevSlideIndex,
  getVisibleAdsForPage,
  isValidAdPageKey,
  moveArrayItem,
  normalizePageAdButtons,
  normalizePageAdSlide,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  sanitizeAdLinkUrl,
  toggleAdSlidePaused,
} from "./pageAdsHelpers.ts";

describe("pageAdsHelpers", () => {
  it("provides seeded multi-ad configurations with referral buttons for every card page", () => {
    for (const key of ALL_AD_PAGE_KEYS) {
      const cfg = DEFAULT_PAGE_ADS_CMS.pages[key];
      assert.equal(cfg.pageKey, key);
      assert.equal(cfg.enabled, true);
      assert.ok(cfg.ads.length >= 2, `expected >= 2 default ads for ${key}`);
      assert.ok(cfg.slideshowSpeedMs >= 1500);
      assert.ok(
        cfg.ads[0].buttons && cfg.ads[0].buttons.length >= 1,
        `expected referral buttons on first ad for ${key}`
      );
    }
  });

  it("validates page keys strictly", () => {
    assert.equal(isValidAdPageKey("products"), true);
    assert.equal(isValidAdPageKey("category"), true);
    assert.equal(isValidAdPageKey("product-details"), true);
    assert.equal(isValidAdPageKey("projects"), true);
    assert.equal(isValidAdPageKey("blogs"), true);
    assert.equal(isValidAdPageKey("news"), true);
    assert.equal(isValidAdPageKey("home"), true);
    assert.equal(isValidAdPageKey("unknown-page"), false);
  });

  it("clamps slideshow speed ms and hides completely when ads array is empty or disabled", () => {
    const emptyAds = normalizeSinglePageAdsConfig(
      { slideshowSpeedMs: 100, ads: [], enabled: true },
      "projects"
    );
    assert.equal(emptyAds.slideshowSpeedMs, 1500);
    assert.equal(emptyAds.ads.length, 0);
    assert.equal(getVisibleAdsForPage(emptyAds).length, 0);

    const disabledAds = normalizeSinglePageAdsConfig(
      { enabled: false },
      "blogs"
    );
    assert.equal(getVisibleAdsForPage(disabledAds).length, 0);

    const slow = normalizeSinglePageAdsConfig(
      { slideshowSpeedMs: 99000 },
      "blogs"
    );
    assert.equal(slow.slideshowSpeedMs, 20000);
  });

  it("preserves individual paused state and excludes paused slides from public popup visibility", () => {
    const normalizedDefault = normalizePageAdSlide(
      { id: "a1", image: "/assets/products/door.jpg" },
      0
    );
    assert.equal(normalizedDefault?.paused, false);

    const normalizedPaused = normalizePageAdSlide(
      { id: "a2", image: "/assets/products/window.jpg", paused: true },
      1
    );
    assert.equal(normalizedPaused?.paused, true);

    const cfg = normalizeSinglePageAdsConfig(
      {
        enabled: true,
        ads: [
          { id: "a1", image: "/assets/products/door.jpg", title: "Active Ad", paused: false },
          { id: "a2", image: "/assets/products/window.jpg", title: "Paused Ad", paused: true },
        ],
      },
      "home"
    );

    const visible = getVisibleAdsForPage(cfg);
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, "a1");
    assert.deepEqual(countActiveAndPausedAds(cfg.ads), {
      activeCount: 1,
      pausedCount: 1,
    });

    const toggled = toggleAdSlidePaused(cfg.ads, "a2");
    assert.equal(toggled[1].paused, false);
    assert.equal(
      getVisibleAdsForPage({ ...cfg, ads: toggled }).length,
      2
    );

    const allPaused = toggleAdSlidePaused(cfg.ads, "a1");
    assert.equal(
      getVisibleAdsForPage({ ...cfg, ads: allPaused }).length,
      0
    );
  });

  it("sanitizes unsafe click-through links and filters invalid referral buttons", () => {
    assert.equal(sanitizeAdLinkUrl("#/products/category/doors"), "#/products/category/doors");
    assert.equal(sanitizeAdLinkUrl("/products"), "/products");
    assert.equal(sanitizeAdLinkUrl("https://example.com/promo"), "https://example.com/promo");
    assert.equal(sanitizeAdLinkUrl("javascript:alert(1)"), "");
    assert.equal(sanitizeAdLinkUrl("data:text/html,<script>"), "");

    const cleanButtons = normalizePageAdButtons([
      { id: "b1", label: "Shop Doors", url: "#/products/category/doors" },
      { id: "b2", label: "XSS Bad", url: "javascript:alert(1)" },
      { id: "b3", label: "", url: "#/products" },
      { id: "b4", label: "External Promo", url: "https://innovista.example.com" },
    ]);
    assert.equal(cleanButtons.length, 2);
    assert.equal(cleanButtons[0].label, "Shop Doors");
    assert.equal(cleanButtons[1].url, "https://innovista.example.com");
  });

  it("drops ad slides missing a valid image and preserves uploaded /assets & /uploads images and buttons", () => {
    assert.equal(normalizePageAdSlide({ image: "" }, 0, ""), null);
    const uploaded = normalizePageAdSlide(
      {
        id: "custom-1",
        image: "/uploads/promo-banner.png",
        title: "Monsoon Promo",
        linkUrl: "#/request-quote",
        buttons: [
          { id: "btn-1", label: "Claim Offer", url: "#/request-quote" },
        ],
      },
      0
    );
    assert.ok(uploaded);
    assert.equal(uploaded.image, "/uploads/promo-banner.png");
    assert.equal(uploaded.title, "Monsoon Promo");
    assert.equal(uploaded.linkUrl, "#/request-quote");
    assert.equal(uploaded.buttons?.length, 1);
    assert.equal(uploaded.buttons?.[0].label, "Claim Offer");
  });

  it("normalizes full CMS payload across all card pages", () => {
    const updated = normalizePageAdsCms({
      pages: {
        products: {
          slideshowSpeedMs: 2500,
          ads: [
            { id: "p1", image: "/assets/products/door.jpg", title: "Door Banner" },
            { id: "p2", image: "/assets/products/window.jpg", title: "Window Banner" },
          ],
        },
      },
    });
    assert.equal(updated.pages.products.slideshowSpeedMs, 2500);
    assert.equal(updated.pages.products.ads.length, 2);
    assert.equal(
      updated.pages.projects.ads.length,
      DEFAULT_PAGE_ADS_CMS.pages.projects.ads.length
    );
  });

  it("cycles slideshow indices and reorders ad lists deterministically", () => {
    assert.equal(getNextSlideIndex(0, 3), 1);
    assert.equal(getNextSlideIndex(2, 3), 0);
    assert.equal(getPrevSlideIndex(0, 3), 2);

    const reordered = moveArrayItem(["ad1", "ad2", "ad3"], 0, 2);
    assert.deepEqual(reordered, ["ad2", "ad3", "ad1"]);
  });
});
