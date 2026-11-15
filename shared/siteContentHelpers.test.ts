import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTACT_DEPARTMENTS,
  CONTACT_LOCATIONS,
  ENGINEERING_GUIDELINES,
  NEWS_ARTICLES,
  RELATED_PORTALS,
  RESOURCE_ATTACHMENTS,
  RESOURCE_FAQS,
  buildNewsroomEditorialLayout,
  filterNewsArticles,
  getAttachmentDownloadHref,
  getCollageTileSpanClass,
  getGuidelineStepIndex,
  isContactPageFormValid,
  normalizeRelatedPortals,
  sanitizePortalUrl,
  validateContactPageForm,
} from "./siteContentHelpers.ts";

test("news articles filter cleanly by category and search keyword", () => {
  assert.equal(filterNewsArticles(NEWS_ARTICLES, "All", "").length, NEWS_ARTICLES.length);
  const launches = filterNewsArticles(NEWS_ARTICLES, "Launches", "");
  assert.ok(launches.length >= 4);
  assert.ok(launches.every((item) => item.category === "Launches"));

  const apex = filterNewsArticles(NEWS_ARTICLES, "All", "apex");
  assert.equal(apex.length, 1);
  assert.equal(apex[0].id, "news-apex-handover");

  const newsLayout = buildNewsroomEditorialLayout(NEWS_ARTICLES);
  assert.ok(newsLayout.centerDispatch);
  assert.equal(newsLayout.leftBriefs.length, 2);
  assert.equal(newsLayout.latestWire.length, 5);
  assert.equal(newsLayout.departmentSections.length, 3);
  assert.ok(newsLayout.departmentSections.every((sec) => sec.articles.length === 4));
});

test("resources and contact directories contain complete verified links and records", () => {
  assert.ok(RESOURCE_ATTACHMENTS.length >= 4);
  assert.ok(
    RESOURCE_ATTACHMENTS.every(
      (doc) =>
        doc.image.startsWith("/assets/") &&
        doc.fileName.endsWith(".txt") &&
        getAttachmentDownloadHref(doc.id) === `/api/resources/download/${doc.id}`
    )
  );
  assert.ok(RELATED_PORTALS.length >= 4);
  assert.ok(RELATED_PORTALS.every((portal) => portal.image.startsWith("/assets/")));
  assert.equal(ENGINEERING_GUIDELINES.length, 4);
  assert.ok(
    ENGINEERING_GUIDELINES.every(
      (step, idx) =>
        step.code === `0${idx + 1}` &&
        step.actionLabel.trim().length > 0 &&
        (step.actionTo.startsWith("/") || step.actionTo.startsWith("#"))
    )
  );
  assert.equal(getGuidelineStepIndex("03"), 2);
  assert.equal(getGuidelineStepIndex("unknown"), 0);
  assert.ok(RESOURCE_FAQS.length >= 4);
  assert.ok(CONTACT_DEPARTMENTS.length >= 4);
  assert.ok(CONTACT_LOCATIONS.length >= 3);

  for (const loc of CONTACT_LOCATIONS) {
    assert.ok(loc.mapUrl.startsWith("https://"));
    assert.ok(loc.phone.trim().length > 0);
  }
});

test("portal URL sanitization, normalization, and collage spans behave cleanly", () => {
  assert.deepEqual(sanitizePortalUrl("#/products"), { url: "/products", isExternal: false });
  assert.deepEqual(sanitizePortalUrl("https://www.schueco.com"), {
    url: "https://www.schueco.com",
    isExternal: true,
  });
  assert.deepEqual(sanitizePortalUrl("javascript:alert(1)"), {
    url: "/products",
    isExternal: false,
  });

  // Preserves intentional empty array so UI hides empty directory
  assert.equal(normalizeRelatedPortals([]).length, 0);

  const normalized = normalizeRelatedPortals([
    { name: "Test Tile", url: "https://example.com", image: "/uploads/test.jpg" },
  ]);
  assert.equal(normalized[0].isExternal, true);
  assert.equal(normalized[0].image, "/uploads/test.jpg");

  assert.equal(getCollageTileSpanClass(0, 6), "lg:col-span-6 lg:row-span-2");
  assert.equal(getCollageTileSpanClass(1, 6), "lg:col-span-3 lg:row-span-1");
  assert.equal(getCollageTileSpanClass(0, 1), "lg:col-span-12 lg:row-span-2");
});

test("contact page form validation strictly gates submission", () => {
  assert.equal(
    isContactPageFormValid({
      name: "A",
      email: "bad-email",
      phone: "12",
      department: "",
      message: "hi",
    }),
    false
  );

  const errors = validateContactPageForm({
    name: "",
    email: "bad",
    phone: "",
    department: "",
    message: "",
  });
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.ok(errors.department);
  assert.ok(errors.message);

  assert.equal(
    isContactPageFormValid({
      name: "Kasun Perera",
      email: "kasun@architect.lk",
      phone: "+94 77 123 4567",
      department: "Sales & Estimations",
      message: "Need structural glazing pricing for 4 floors.",
    }),
    true
  );
});
