# Innovista Chatbot, Google Calendar, Gmail & Site Visit Setup Guide

This guide covers configuring the floating website assistant, FAQ training in the Admin Portal, Google Calendar & Gmail confirmation sync, WhatsApp handoff, and direct phone SMS routing.

---

## 1. AI Assistant Server Key (Optional Upgrade Over Local FAQ Matching)

The chatbot runs on the Express backend (`POST /api/chatbot/ask`) using `@google/genai` (`gemini-4-hydrogen`).

1. Open **Settings > Secrets** (or your host environment configuration).
2. Add `GEMINI_API_KEY` with your Gemini API key.
3. Restart the server (`npm run dev` / `npm start`).

> **Built-in Reliability:** If `GEMINI_API_KEY` is not present or rate-limited, the backend automatically answers from your **Admin-trained Q&A database** and intent-aware responses without errors.

---

## 2. Admin Panel: Chatbot Setup & FAQ Training

1. Sign in to the Admin Portal (`#/admin-login`).
2. Open the **Chatbot** tab (`#/ChatbotAdmin`).
3. **Train Frequently Asked Questions & Answers (`FAQ Training` tab)**:
   - Add common customer questions (e.g., lead times, coastal powder coating warranty, pricing, showroom locations) with exact verified answers and trigger keywords.
   - Toggle Q&As **Active / Paused**, edit existing replies, or remove outdated entries.
4. **Customize Assistant (`Bot Setup & Test` tab)**:
   - Toggle widget visibility across public pages.
   - Edit **Assistant Name**, **Welcome Greeting**, **WhatsApp Button Label**, **WhatsApp Prefill Prefix**, **Quick Prompts**, and **System Instructions**.
   - Test questions immediately in the **Live Training Test** box.

---

## 3. Company WhatsApp & Direct Phone SMS Routing

- Both the floating chatbot (`WhatsApp` header icon, reply action pill, and bottom bar) and the Site Visit confirmation card use the company's live WhatsApp and Phone settings configured in **Admin → Overview / Site Contact Settings** (or `.env` defaults):
  - `VITE_CONTACT_PHONE="+94 76 081 8098"`
  - `VITE_WHATSAPP_NUMBER="94760818098"`
  - `VITE_CONTACT_EMAIL="innovistametal@gmail.com"`
- **WhatsApp Handoff (`wa.me`)**: Prefills the customer's question or booking reference into a direct chat with your company WhatsApp number.
- **Direct Phone SMS (`sms:`)**: Opens the device SMS app addressed to the configured phone number with the inquiry or booking details prefilled.

---

## 4. Site Visit Slots, Google Calendar & Gmail Setup

1. **Available Slots**:
   - Upcoming dates automatically skip Sundays and offer 4 daily slots (`09:30 AM`, `11:00 AM`, `02:00 PM`, `03:30 PM`).
   - Already-booked slots and Admin-blocked slots are disabled automatically.
   - Admins can block or unblock individual slots per date under **Admin → Chatbot → Site Visits & Slots**, and update booking status (`CONFIRMED`, `COMPLETED`, `CANCELLED`).
2. **Google Calendar & Gmail Sync**:
   - On the **Site Visit** tab (Contact page, Footer contact card, or Chatbot quick link), click **Sign in with Google**.
   - Grant the requested permissions (`calendar.events` and `gmail.send`).
   - Busy calendar events for the selected date automatically mark conflicting time slots as **Calendar Busy**.
   - After reserving a slot, an explicit **Confirmation Modal** displays the event time, location, and email recipient before creating the Google Calendar event and sending the Gmail confirmation email.

---

## 5. Verification Checklist

1. Scroll any public page and verify the animated floating chatbot ball stays pinned at the bottom-right corner.
2. Open the chatbot, ask a trained FAQ question, and click **Chat on WhatsApp** to confirm prefilled `wa.me` routing.
3. Switch to **Site Visit**, verify booked slots are disabled, reserve an open slot, and verify it appears under **Admin → Chatbot → Site Visits & Slots** and **Orders / Notifications**.
