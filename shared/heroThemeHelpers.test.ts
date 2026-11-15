import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HERO_THEME,
  DEFAULT_PAGE_HERO_THEMES,
  applySameColorToTheme,
  buildCategoryAccentFillCss,
  buildGradientExpression,
  buildHeroBackgroundCss,
  buildHeroImageMaskCss,
  clampAngleDeg,
  clampByte,
  ensureLightSurfaceAccent,
  extractFirstColorFromCss,
  formatRgbNumbers,
  formatRgbString,
  getHeroBackdropBaseColor,
  normalizeHeroTheme,
  normalizePageHeroThemes,
  parseColorInput,
  pickReadableSubheadlineColor,
  pickReadableTextColor,
  rgbToHex,
  sanitizeCustomCssGradient,
} from "./heroThemeHelpers.ts";

test("parseColorInput parses hex, rgb(), rgba(), and bare numeric triplets", () => {
  assert.deepEqual(parseColorInput("#3393B8"), { r: 51, g: 147, b: 184 });
  assert.deepEqual(parseColorInput("3393b8"), { r: 51, g: 147, b: 184 });
  assert.deepEqual(parseColorInput("#F0A"), { r: 255, g: 0, b: 170 });
  assert.deepEqual(parseColorInput("rgb(34, 87, 122)"), { r: 34, g: 87, b: 122 });
  assert.deepEqual(parseColorInput("rgba(230, 0, 0, 0.75)"), { r: 230, g: 0, b: 0 });
  assert.deepEqual(parseColorInput("140, 28, 36"), { r: 140, g: 28, b: 36 });
  assert.deepEqual(parseColorInput("51 147 184"), { r: 51, g: 147, b: 184 });
  assert.deepEqual(parseColorInput("300, -10, 128"), { r: 255, g: 0, b: 128 });
  assert.equal(parseColorInput("not-a-color"), null);
});

test("RGB formatting and byte/angle clamping behave deterministically", () => {
  assert.equal(clampByte(300), 255);
  assert.equal(clampByte(-12), 0);
  assert.equal(clampAngleDeg(370), 10);
  assert.equal(clampAngleDeg(-45), 315);
  assert.equal(rgbToHex({ r: 34, g: 87, b: 122 }), "#22577A");
  assert.equal(formatRgbString({ r: 34, g: 87, b: 122 }), "rgb(34, 87, 122)");
  assert.equal(formatRgbNumbers({ r: 34, g: 87, b: 122 }), "34, 87, 122");
});

test("WCAG contrast helpers pick readable foregrounds", () => {
  assert.equal(pickReadableTextColor("#102A42"), "#FFFFFF");
  assert.equal(pickReadableTextColor("rgb(245, 247, 250)"), "#0F172A");
  assert.equal(pickReadableSubheadlineColor("#FFFFFF"), "#334155");
  assert.equal(ensureLightSurfaceAccent("#22577A"), "#22577A");
  assert.equal(ensureLightSurfaceAccent("#FFFFFF", "#22577A"), "#22577A");
});

test("sanitizeCustomCssGradient rejects unsafe CSS and accepts valid declarations, multiline, and multi-layer gradients", () => {
  const fallback = "linear-gradient(180deg, rgb(51, 147, 184) 0%, rgb(255, 255, 255) 100%)";
  assert.equal(
    sanitizeCustomCssGradient("url(javascript:alert(1))", fallback),
    fallback
  );
  assert.equal(
    sanitizeCustomCssGradient("linear-gradient(90deg, rgb(10, 20, 30), #fff); color: red", fallback),
    fallback
  );
  assert.equal(
    sanitizeCustomCssGradient("linear-gradient(180deg", fallback),
    fallback
  );
  assert.equal(
    sanitizeCustomCssGradient("linear-gradient(180deg)", fallback),
    fallback
  );
  const valid = "linear-gradient(135deg, rgb(16, 42, 66) 0%, rgb(92, 182, 210) 100%)";
  assert.equal(sanitizeCustomCssGradient(valid, fallback), valid);
  assert.equal(
    sanitizeCustomCssGradient(`background-image: ${valid};`, fallback),
    valid
  );
  assert.equal(
    sanitizeCustomCssGradient(
      "linear-gradient(\n  135deg,\n  rgb(16, 42, 66) 0%,\n  rgb(92, 182, 210) 100%\n)",
      fallback
    ),
    valid
  );
  const layered =
    "radial-gradient(circle at top left, rgba(51, 147, 184, 0.4), transparent), linear-gradient(180deg, #102A42, #FFFFFF)";
  assert.equal(sanitizeCustomCssGradient(layered, fallback), layered);
  assert.equal(sanitizeCustomCssGradient("140, 28, 36", fallback), "rgb(140, 28, 36)");
  assert.equal(extractFirstColorFromCss("linear-gradient(90deg, #FFFFFF, #0F172A)"), "#FFFFFF");
  assert.equal(
    getHeroBackdropBaseColor({
      mode: "custom",
      startColor: "#102A42",
      customCssGradient: "linear-gradient(180deg, rgb(245, 247, 250) 0%, rgb(255, 255, 255) 100%)",
    }),
    "#F5F7FA"
  );
});

test("buildHeroBackgroundCss supports gradient, solid (with & without fade), and custom CSS", () => {
  const gradTheme = normalizeHeroTheme({
    mode: "gradient",
    startColor: "#102A42",
    midColor: "#22577A",
    useMidColor: true,
    endColor: "#FFFFFF",
    angleDeg: 135,
  });
  const gradCss = buildHeroBackgroundCss(gradTheme);
  assert.ok(gradCss.startsWith("linear-gradient(135deg, rgb(16, 42, 66)"));

  const solidNoFade = buildHeroBackgroundCss({
    mode: "solid",
    startColor: "140, 28, 36",
    fadeToPageBottom: false,
  });
  assert.equal(solidNoFade, "rgb(140, 28, 36)");

  const solidWithFade = buildHeroBackgroundCss({
    mode: "solid",
    startColor: "#22577A",
    fadeToPageBottom: true,
  });
  assert.ok(solidWithFade.includes("rgb(34, 87, 122) 70%"));
  assert.ok(solidWithFade.includes("rgb(255, 255, 255) 100%"));

  const customCss = "radial-gradient(circle at center, rgb(140, 28, 36) 0%, rgb(16, 42, 66) 100%)";
  assert.equal(
    buildHeroBackgroundCss({
      mode: "custom",
      customCssGradient: customCss,
    }),
    customCss
  );
});

test("buildHeroImageMaskCss and buildCategoryAccentFillCss output clean CSS", () => {
  assert.equal(
    buildHeroImageMaskCss({ imageBlendTopPercent: 0, imageBlendBottomPercent: 0 }),
    "none"
  );
  const mask = buildHeroImageMaskCss({ imageBlendTopPercent: 26, imageBlendBottomPercent: 20 });
  assert.ok(mask.includes("transparent 0%, black 26%"));
  assert.ok(mask.includes("black 80%, transparent 100%"));

  const accent = buildCategoryAccentFillCss({
    ...DEFAULT_HERO_THEME,
    mode: "solid",
    startColor: "#8C1C24",
  });
  assert.equal(accent, "rgb(140, 28, 36)");
});

test("applySameColorToTheme and normalizePageHeroThemes normalize consistently", () => {
  const solid = applySameColorToTheme(DEFAULT_HERO_THEME, "245, 245, 245", false);
  assert.equal(solid.mode, "solid");
  assert.equal(solid.startColor, "#F5F5F5");
  assert.equal(solid.headlineColor, "#0F172A");

  const expr = buildGradientExpression({
    ...DEFAULT_HERO_THEME,
    gradientShape: "radial",
  });
  assert.ok(expr.startsWith("radial-gradient(circle at 50% 24%"));

  const pages = normalizePageHeroThemes({
    projects: { mode: "solid", startColor: "#102A42", fadeToPageBottom: false },
  });
  assert.equal(pages.projects.mode, "solid");
  assert.equal(pages.resources.startColor, DEFAULT_PAGE_HERO_THEMES.resources.startColor);
  assert.equal(pages.contact.startColor, DEFAULT_PAGE_HERO_THEMES.contact.startColor);
});
import {
  DEFAULT_ABOUT_SECTIONS,
  DEFAULT_CLIENTS,
  DEFAULT_CLIENTS_RIBBON_SPEED,
  DEFAULT_CLIENT_FEEDBACKS,
  DEFAULT_DIRECTOR_MESSAGE,
  DEFAULT_FEEDBACK_SPEED_MS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_JOURNEY_MILESTONES,
  DEFAULT_JOURNEY_SPEED_MS,
  DEFAULT_PARTNERS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  DEFAULT_SLIDESHOW_SPEED_MS,
  DEFAULT_TEAM_MEMBERS,
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "./aboutContentHelpers.ts";
import {
  normalizeProductCategory,
  normalizeProductLandingCms,
} from "./productCatalogHelpers.ts";
import {
  normalizeHomeSlideshowCms,
} from "./homeSlideshowHelpers.ts";

const TEST_ABOUT_DEFAULTS: AboutCmsPayload = {
  slideshowSpeedMs: DEFAULT_SLIDESHOW_SPEED_MS,
  journeySpeedMs: DEFAULT_JOURNEY_SPEED_MS,
  feedbackSpeedMs: DEFAULT_FEEDBACK_SPEED_MS,
  partnersRibbonSpeed: DEFAULT_PARTNERS_RIBBON_SPEED,
  clientsRibbonSpeed: DEFAULT_CLIENTS_RIBBON_SPEED,
  heroSlides: DEFAULT_HERO_SLIDES,
  heroTheme: DEFAULT_HERO_THEME,
  vision: DEFAULT_ABOUT_SECTIONS.vision,
  mission: DEFAULT_ABOUT_SECTIONS.mission,
  directorMessage: DEFAULT_DIRECTOR_MESSAGE,
  teamMembers: DEFAULT_TEAM_MEMBERS,
  journeyMilestones: DEFAULT_JOURNEY_MILESTONES,
  partners: DEFAULT_PARTNERS,
  clients: DEFAULT_CLIENTS,
  clientFeedbacks: DEFAULT_CLIENT_FEEDBACKS,
};

test("CMS payload normalizers round-trip custom heroTheme values cleanly", () => {
  const customSolid = {
    mode: "solid" as const,
    startColor: "140, 28, 36",
    fadeToPageBottom: false,
  };

  const about = normalizeAboutCmsPayload({ heroTheme: customSolid }, TEST_ABOUT_DEFAULTS);
  assert.equal(about.heroTheme?.mode, "solid");
  assert.equal(about.heroTheme?.startColor, "#8C1C24");
  assert.equal(about.heroTheme?.fadeToPageBottom, false);

  const cat = normalizeProductCategory({ name: "Doors", heroTheme: customSolid });
  assert.equal(cat.heroTheme?.mode, "solid");
  assert.equal(cat.heroTheme?.startColor, "#8C1C24");

  const landing = normalizeProductLandingCms({
    heroTheme: {
      mode: "custom",
      customCssGradient: "linear-gradient(135deg, rgb(16, 42, 66) 0%, rgb(92, 182, 210) 100%)",
    },
  });
  assert.equal(landing.heroTheme?.mode, "custom");
  assert.ok(landing.heroTheme?.customCssGradient.includes("linear-gradient(135deg"));

  const home = normalizeHomeSlideshowCms({
    heroOverlayEnabled: true,
    heroTheme: { mode: "solid", startColor: "#102A42" },
  });
  assert.equal(home.heroOverlayEnabled, true);
  assert.equal(home.heroTheme?.startColor, "#102A42");
});
