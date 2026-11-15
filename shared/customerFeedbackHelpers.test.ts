import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_CUSTOMER_FEEDBACKS,
  DEFAULT_FEEDBACK_AVATAR,
  buildCustomerFeedbackPayload,
  clampFeedbackRating,
  formatCustomerRoleSubtitle,
  normalizeCustomerFeedbackRecord,
  resolveHomeFeedbackCards,
  sanitizeFeedbackImage,
  validateCustomerFeedbackForm,
} from "./customerFeedbackHelpers.ts";

describe("customerFeedbackHelpers", () => {
  it("normalizes feedback records with safe ratings, avatars, and showOnHome defaults", () => {
    const normalized = normalizeCustomerFeedbackRecord(
      {
        Feed_backId: 99,
        Customer: {
          Cus_Name: "  Nalin Jayawardena ",
          Cus_CompanyName: " Apex Tower ",
          Cus_Role: "Director",
          Cus_Avatar: "javascript:alert(1)",
        },
        Rating: 9,
        Feed_back_comment: "  Excellent thermal glazing performance.  ",
        Feed_Back_Images: ["https://images.unsplash.com/photo-123", "/assets/about/terrace.jpg"],
        Design: {
          Design_Name: "Slimline Sliding Door",
          DesignID: "1",
        },
      },
      2
    );

    assert.equal(normalized.Feed_backId, 99);
    assert.equal(normalized.Customer.Cus_Name, "Nalin Jayawardena");
    assert.equal(normalized.Customer.Cus_CompanyName, "Apex Tower");
    assert.equal(normalized.Customer.Cus_Avatar, "/assets/about/terrace.jpg");
    assert.equal(normalized.Rating, 5);
    assert.equal(normalized.Feed_back_comment, "Excellent thermal glazing performance.");
    assert.deepEqual(normalized.Feed_Back_Images, ["/assets/about/terrace.jpg"]);
    assert.equal(normalized.showOnHome, true);
    assert.equal(normalized.displayOrder, 2);
  });

  it("clamps rating values and formats role subtitles cleanly", () => {
    assert.equal(clampFeedbackRating(0), 1);
    assert.equal(clampFeedbackRating(4.4), 4);
    assert.equal(clampFeedbackRating("bad"), 5);

    assert.equal(
      formatCustomerRoleSubtitle({ Cus_Role: "Architect", Cus_CompanyName: "Studio X" }),
      "Architect · Studio X"
    );
    assert.equal(formatCustomerRoleSubtitle({ Cus_CompanyName: "NovaTech" }), "NovaTech");
    assert.equal(formatCustomerRoleSubtitle({}), "Verified Client");
  });

  it("filters out hidden home feedbacks and sorts home cards by displayOrder", () => {
    const cards = resolveHomeFeedbackCards([
      {
        ...DEFAULT_CUSTOMER_FEEDBACKS[0],
        Feed_backId: 10,
        showOnHome: true,
        displayOrder: 5,
      },
      {
        ...DEFAULT_CUSTOMER_FEEDBACKS[1],
        Feed_backId: 20,
        showOnHome: false,
        displayOrder: 0,
      },
      {
        ...DEFAULT_CUSTOMER_FEEDBACKS[2],
        Feed_backId: 30,
        showOnHome: true,
        displayOrder: 1,
      },
    ]);

    assert.equal(cards.length, 2);
    assert.equal(cards[0].feedbackId, 30);
    assert.equal(cards[1].feedbackId, 10);
    assert.equal(cards[0].designId, "3");
  });

  it("sanitizes unsafe/blocked images and builds validated feedback payloads", () => {
    assert.equal(
      sanitizeFeedbackImage("https://randomuser.me/api/portraits/men/1.jpg"),
      DEFAULT_FEEDBACK_AVATAR
    );
    assert.equal(
      validateCustomerFeedbackForm({
        customerName: "A",
        comment: "Too short",
        rating: 5,
      }),
      "Please enter the customer's name (at least 2 characters)."
    );
    assert.equal(
      validateCustomerFeedbackForm({
        customerName: "Saman Kumara",
        comment: "Short",
        rating: 5,
      }),
      "Please enter a testimonial comment (at least 10 characters)."
    );

    const payload = buildCustomerFeedbackPayload(
      {
        customerName: "Saman Kumara",
        customerRole: "Facilities Lead",
        companyName: "Ceylon Suites",
        designName: "Acoustic Partition",
        designId: "3",
        rating: 5,
        comment: "Zero street noise in our boardrooms after installation.",
        images: ["/assets/products/partition.jpg"],
        showOnHome: true,
      },
      0
    );

    assert.equal(payload.Customer.Cus_Name, "Saman Kumara");
    assert.equal(payload.Customer.Cus_Avatar, "/assets/products/partition.jpg");
    assert.equal(payload.Design.DesignID, "3");
    assert.equal(payload.showOnHome, true);
  });
});
