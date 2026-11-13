import test from "node:test";
import assert from "node:assert/strict";
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
  DEFAULT_LOGO_SCALE,
  DEFAULT_PARTNERS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  DEFAULT_SLIDESHOW_SPEED_MS,
  DEFAULT_TEAM_MEMBERS,
  MAX_LOGO_SCALE,
  MAX_RIBBON_SPEED,
  MAX_SLIDESHOW_SPEED_MS,
  MIN_LOGO_SCALE,
  MIN_RIBBON_SPEED,
  MIN_SLIDESHOW_SPEED_MS,
  buildSmoothRoadPath,
  clampLogoScale,
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  computeRoadmapPoints,
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  normalizeAboutCmsPayload,
  normalizeHeroSlides,
  sanitizeAboutImage,
  type AboutCmsPayload,
} from "./aboutContentHelpers";

const BASE_DEFAULTS: AboutCmsPayload = {
  slideshowSpeedMs: DEFAULT_SLIDESHOW_SPEED_MS,
  journeySpeedMs: DEFAULT_JOURNEY_SPEED_MS,
  feedbackSpeedMs: DEFAULT_FEEDBACK_SPEED_MS,
  partnersRibbonSpeed: DEFAULT_PARTNERS_RIBBON_SPEED,
  clientsRibbonSpeed: DEFAULT_CLIENTS_RIBBON_SPEED,
  heroSlides: DEFAULT_HERO_SLIDES,
  vision: DEFAULT_ABOUT_SECTIONS.vision,
  mission: DEFAULT_ABOUT_SECTIONS.mission,
  directorMessage: DEFAULT_DIRECTOR_MESSAGE,
  teamMembers: DEFAULT_TEAM_MEMBERS,
  journeyMilestones: DEFAULT_JOURNEY_MILESTONES,
  partners: DEFAULT_PARTNERS,
  clients: DEFAULT_CLIENTS,
  clientFeedbacks: DEFAULT_CLIENT_FEEDBACKS,
};

test("aboutContentHelpers", async (t) => {
  await t.test("replaces blocked or empty URLs with local fallbacks", () => {
    assert.equal(sanitizeAboutImage("", "/assets/fallback.jpg"), "/assets/fallback.jpg");
    assert.equal(
      sanitizeAboutImage("https://images.unsplash.com/photo-123", "/assets/fallback.jpg"),
      "/assets/fallback.jpg"
    );
    assert.equal(
      sanitizeAboutImage("https://randomuser.me/api/portraits/men/1.jpg", "/assets/fallback.jpg"),
      "/assets/fallback.jpg"
    );
    assert.equal(
      sanitizeAboutImage("/assets/about/facade.jpg", "/assets/fallback.jpg"),
      "/assets/about/facade.jpg"
    );
  });

  await t.test("clamps slideshow speed safely within bounds", () => {
    assert.equal(clampSlideshowSpeedMs(500), MIN_SLIDESHOW_SPEED_MS);
    assert.equal(clampSlideshowSpeedMs(3000), 3000);
    assert.equal(clampSlideshowSpeedMs("2500"), 2500);
    assert.equal(clampSlideshowSpeedMs(99999), MAX_SLIDESHOW_SPEED_MS);
    assert.equal(clampSlideshowSpeedMs(undefined), DEFAULT_SLIDESHOW_SPEED_MS);
  });

  await t.test("normalizes hero slides and falls back cleanly on empty or blocked inputs", () => {
    const res = normalizeHeroSlides(
      [
        {
          id: "custom-1",
          headline: "Custom Hero Title",
          subheadline: "Custom Subheadline",
          image: "https://images.unsplash.com/broken",
        },
      ],
      DEFAULT_HERO_SLIDES
    );
    assert.equal(res.length, 1);
    assert.equal(res[0].headline, "Custom Hero Title");
    assert.equal(res[0].image, DEFAULT_HERO_SLIDES[0].image);

    const emptyRes = normalizeHeroSlides([], DEFAULT_HERO_SLIDES);
    assert.equal(emptyRes.length, DEFAULT_HERO_SLIDES.length);
  });

  await t.test("wraps slide indices correctly for next and previous actions", () => {
    assert.equal(getNextSlideIndex(0, 4), 1);
    assert.equal(getNextSlideIndex(3, 4), 0);
    assert.equal(getPrevSlideIndex(0, 4), 3);
    assert.equal(getPrevSlideIndex(2, 4), 1);
    assert.equal(getNextSlideIndex(0, 1), 0);
  });

  await t.test("reorders array items cleanly without mutation", () => {
    const list = ["a", "b", "c"];
    assert.deepEqual(moveArrayItem(list, 1, -1), ["b", "a", "c"]);
    assert.deepEqual(moveArrayItem(list, 0, -1), ["a", "b", "c"]);
    assert.deepEqual(moveArrayItem(list, 2, 1), ["a", "b", "c"]);
    assert.deepEqual(list, ["a", "b", "c"]);
  });

  await t.test("clamps ribbon speed and logo scale within safe bounds", () => {
    assert.equal(clampRibbonSpeed(2), MIN_RIBBON_SPEED);
    assert.equal(clampRibbonSpeed(90), 90);
    assert.equal(clampRibbonSpeed(999), MAX_RIBBON_SPEED);
    assert.equal(clampRibbonSpeed(undefined, DEFAULT_PARTNERS_RIBBON_SPEED), DEFAULT_PARTNERS_RIBBON_SPEED);

    assert.equal(clampLogoScale(0.2), MIN_LOGO_SCALE);
    assert.equal(clampLogoScale(1.32), 1.32);
    assert.equal(clampLogoScale(3.5), MAX_LOGO_SCALE);
    assert.equal(clampLogoScale(undefined), DEFAULT_LOGO_SCALE);
  });

  await t.test("normalizes full CMS payload across all About sections", () => {
    const normalized = normalizeAboutCmsPayload(
      {
        slideshowSpeedMs: 2500,
        journeySpeedMs: 3200,
        feedbackSpeedMs: 5000,
        partnersRibbonSpeed: 120,
        clientsRibbonSpeed: 40,
        partners: [
          {
            id: "p-custom",
            name: "Skyline Extrusions",
            category: "Aluminium Frames",
            description: "High-span curtain mullions.",
            logo: "/assets/logos/partner-aluprofile.svg",
            scale: 1.4,
          },
        ],
        clients: [
          {
            id: "c-custom",
            name: "Harbor Residences",
            sector: "Luxury Residential",
            projectScope: "Sliding Facades",
            logo: "/assets/logos/client-zenith.svg",
            scale: 0.78,
          },
        ],
      },
      BASE_DEFAULTS
    );

    assert.equal(normalized.slideshowSpeedMs, 2500);
    assert.equal(normalized.journeySpeedMs, 3200);
    assert.equal(normalized.feedbackSpeedMs, 5000);
    assert.equal(normalized.partnersRibbonSpeed, 120);
    assert.equal(normalized.clientsRibbonSpeed, 40);
    assert.equal(normalized.partners.length, 1);
    assert.equal(normalized.partners[0].name, "Skyline Extrusions");
    assert.equal(normalized.partners[0].scale, 1.4);
    assert.equal(normalized.clients.length, 1);
    assert.equal(normalized.clients[0].name, "Harbor Residences");
    assert.equal(normalized.clients[0].scale, 0.78);
    assert.equal(normalized.teamMembers.length, DEFAULT_TEAM_MEMBERS.length);
    assert.equal(normalized.journeyMilestones.length, DEFAULT_JOURNEY_MILESTONES.length);
    assert.equal(normalized.clientFeedbacks.length, DEFAULT_CLIENT_FEEDBACKS.length);
  });

  await t.test("computes valid SVG roadmap station points and smooth Bezier path", () => {
    assert.deepEqual(computeRoadmapPoints(0), []);
    assert.deepEqual(computeRoadmapPoints(1), [{ x: 500, y: 92 }]);

    const pts4 = computeRoadmapPoints(4);
    assert.equal(pts4.length, 4);
    assert.equal(pts4[0].x, 90);
    assert.equal(pts4[3].x, 910);
    assert.equal(pts4[0].y, 116);
    assert.equal(pts4[1].y, 62);

    const path = buildSmoothRoadPath(pts4);
    assert.ok(path.startsWith("M 90 116 C "));
    assert.ok(path.includes("910 62"));
    assert.equal(buildSmoothRoadPath([]), "");
  });
});
