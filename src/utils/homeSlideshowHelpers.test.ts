import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOME_SLIDESHOW_CMS,
  clampHomeSlideshowSpeedMs,
  deleteHomeSlide,
  inferMediaTypeFromUrl,
  moveHomeSlide,
  normalizeHomeSlideshowCms,
  parseVideoEmbedUrl,
  upsertHomeSlide,
} from "./homeSlideshowHelpers";

test("inferMediaTypeFromUrl detects uploaded videos, mp4s, embeds, and images", () => {
  assert.equal(inferMediaTypeFromUrl("/uploads/clip-123.mp4"), "video");
  assert.equal(inferMediaTypeFromUrl("/uploads/reel.webm?v=2"), "video");
  assert.equal(
    inferMediaTypeFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "video"
  );
  assert.equal(inferMediaTypeFromUrl("/assets/homeslider/image1.jpg"), "image");
  assert.equal(inferMediaTypeFromUrl("/uploads/photo.png"), "image");
});

test("parseVideoEmbedUrl converts YouTube and Vimeo URLs into autoplay muted embed URLs", () => {
  const ytWatch = parseVideoEmbedUrl("https://www.youtube.com/watch?v=abc123456");
  assert.ok(ytWatch?.includes("https://www.youtube.com/embed/abc123456"));
  assert.ok(ytWatch?.includes("autoplay=1&mute=1"));

  const ytShort = parseVideoEmbedUrl("https://youtu.be/xyz987654");
  assert.ok(ytShort?.includes("https://www.youtube.com/embed/xyz987654"));

  const vimeo = parseVideoEmbedUrl("https://vimeo.com/76979871");
  assert.equal(
    vimeo,
    "https://player.vimeo.com/video/76979871?autoplay=1&muted=1&loop=1&background=1"
  );

  assert.equal(parseVideoEmbedUrl("/uploads/factory.mp4"), null);
});

test("normalizeHomeSlideshowCms preserves default stats, CTA buttons, and safe bounds", () => {
  const cms = normalizeHomeSlideshowCms({
    slideshowSpeedMs: 500,
    slides: [
      {
        id: "v-1",
        mediaType: "video",
        mediaUrl: "/uploads/facade-tour.mp4",
        headline: "Architectural Glazing Film",
      },
    ],
  });

  assert.equal(cms.slideshowSpeedMs, 2000);
  assert.equal(cms.primaryButtonLabel, "Contact Us");
  assert.equal(cms.secondaryButtonLabel, "Explore Our Products");
  assert.equal(cms.stats.length, 3);
  assert.equal(cms.stats[0].number, 20);
  assert.equal(cms.slides[0].mediaType, "video");
  assert.equal(cms.slides[0].headline, "Architectural Glazing Film");
  assert.ok(clampHomeSlideshowSpeedMs(999999) <= 25000);
});

test("upsertHomeSlide, moveHomeSlide, and deleteHomeSlide handle video CRUD safely", () => {
  const initial = [...DEFAULT_HOME_SLIDESHOW_CMS.slides];

  // Add video slide
  const withAdded = upsertHomeSlide(initial, {
    mediaType: "video",
    mediaUrl: "/uploads/showroom-loop.mp4",
    headline: "Colombo Flagship Showroom",
    description: "Custom slimline aluminium systems in motion.",
  });
  assert.equal(withAdded.length, initial.length + 1);
  const added = withAdded[withAdded.length - 1];
  assert.equal(added.mediaType, "video");

  // Edit existing video slide
  const edited = upsertHomeSlide(
    withAdded,
    {
      mediaType: "video",
      mediaUrl: "/uploads/showroom-loop-v2.webm",
      headline: "Updated Showroom Video",
      description: "Edited video slide copy.",
    },
    added.id
  );
  assert.equal(edited.length, withAdded.length);
  assert.equal(edited[edited.length - 1].headline, "Updated Showroom Video");
  assert.equal(edited[edited.length - 1].mediaUrl, "/uploads/showroom-loop-v2.webm");

  // Reorder slide up
  const moved = moveHomeSlide(edited, edited.length - 1, -1);
  assert.equal(moved[moved.length - 2].id, added.id);

  // Delete slide, never allowing 0 slides
  const deleted = deleteHomeSlide(moved, added.id);
  assert.equal(deleted.length, initial.length);
  const single = deleteHomeSlide([deleted[0]], deleted[0].id);
  assert.equal(single.length, 1);
});
