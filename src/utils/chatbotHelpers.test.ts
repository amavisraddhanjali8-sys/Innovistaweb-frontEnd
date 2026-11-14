import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CHATBOT_CONFIG,
  DEFAULT_CHATBOT_FAQS,
  buildSmsHref,
  buildWhatsAppChatUrl,
  detectChatIntent,
  matchTrainedFaq,
  normalizeChatbotConfig,
  normalizeChatbotFaq,
} from "./chatbotHelpers";

test("matchTrainedFaq finds top relevant FAQ answer from trained keywords and question", () => {
  const match = matchTrainedFaq("What is your coastal sea breeze warranty?", DEFAULT_CHATBOT_FAQS);
  assert.ok(match);
  assert.equal(match.item.id, "faq-3");
  assert.match(match.item.answer, /15-year/i);
});

test("matchTrainedFaq ignores disabled FAQ entries", () => {
  const disabledFaqs = DEFAULT_CHATBOT_FAQS.map((item) =>
    item.id === "faq-3" ? { ...item, enabled: false } : item
  );
  const match = matchTrainedFaq("sea breeze warranty", disabledFaqs);
  assert.equal(match, null);
});

test("detectChatIntent identifies site visit, WhatsApp, SMS, and quote intents", () => {
  assert.equal(detectChatIntent("I want to book a site visit slot"), "visit");
  assert.equal(detectChatIntent("Connect me to WhatsApp support"), "whatsapp");
  assert.equal(detectChatIntent("Send an SMS message to phone"), "sms");
  assert.equal(detectChatIntent("Can you estimate sliding door pricing?"), "quote");
});

test("buildWhatsAppChatUrl and buildSmsHref sanitize numbers and encode text", () => {
  const waUrl = buildWhatsAppChatUrl("+94 76 081 8098", "Need glass partition quote", "Hi Innovista:");
  assert.equal(
    waUrl,
    "https://wa.me/94760818098?text=Hi%20Innovista%3A%20Need%20glass%20partition%20quote"
  );

  const smsUrl = buildSmsHref("+94 76 081 8098", "Call back for measurement");
  assert.equal(smsUrl, "sms:+94760818098?body=Call%20back%20for%20measurement");
});

test("normalizeChatbotConfig and normalizeChatbotFaq apply clean defaults", () => {
  const cfg = normalizeChatbotConfig({ assistantName: "  Innovista Bot  ", quickPrompts: ["Quote", ""] });
  assert.equal(cfg.assistantName, "Innovista Bot");
  assert.deepEqual(cfg.quickPrompts, ["Quote"]);
  assert.equal(cfg.enabled, DEFAULT_CHATBOT_CONFIG.enabled);

  const faq = normalizeChatbotFaq({
    question: "  Lead time? ",
    answer: " 3 weeks ",
    keywords: ["lead", "LEAD"] as string[],
    priority: 50,
  });
  assert.equal(faq.question, "Lead time?");
  assert.equal(faq.priority, 20);
});
