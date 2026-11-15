# INNOASSIST AI Setup, Credit Protection & Integration Guide

**INNOASSIST** is the official multilingual architectural & metal fabrication AI assistant for **INNOVISTA METAL FABRICONIX (PVT) LTD**.

This guide covers environment configuration, the **4-Layer AI Credit Protection Architecture**, PostgreSQL/In-Memory persistence, knowledge base publishing, configurable workflows, human takeover, security controls, and end-to-end verification.

---

## 1. Environment Variables & API Keys

Configure these variables in your server environment (or `.env` locally — never commit real secrets):

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Server-side API key for `@google/genai` (`gemini-4-hydrogen`). If omitted or quota-limited, INNOASSIST automatically serves answers from Published KB, Technical Docs, Workflows, Catalog, and Response Cache using **0 AI credits**. |
| `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` | Optional | PostgreSQL connection credentials. When omitted, the server transparently runs in `in-memory-fallback` mode. |
| `JWT_SECRET` | Recommended | Signing secret for Admin/Staff JWT authentication (`requireAdminOrStaff`). |
| `APP_URL` | Optional | Public URL used in email verification / links. |

> **Security Rule:** `GEMINI_API_KEY` is strictly server-side inside `backend/services/innoassistEngine.ts` and is never exposed to frontend bundles or unauthenticated `/api/chatbot/config` responses.

---

## 2. How AI Credit Protection Works (4-Layer Zero-Waste Architecture)

To prevent unexpected AI credit burn or failures when external AI quotas run low, every incoming customer message passes through this strict order:

1. **Layer 1 — Human Handover Lock (`0` credits)**  
   If an admin has taken over the session (`mode === "human"`), AI auto-replies are completely paused so only the human specialist responds. Customers can type `"back to ai"` or click **Resume AI** when ready.
2. **Layer 2 — Security & Topic Guard (`0` credits)**  
   Prompt-injection phrases (e.g., `"ignore previous instructions"`, `"reveal system prompt"`) and admin-configured restricted topics (`internal cost`, `employee salary`, `api key`, etc.) are blocked immediately before any model call and logged to the security audit table (`CHATBOT_PROMPT_INJECTION_BLOCKED`).
3. **Layer 3 — Deterministic Workflows, Multi-Question Splitter, Fuzzy KB & Local Catalog (`0` credits)**  
   - Progressive Workflows (`13` prebuilt + unlimited custom) handle quotations, inquiries, complaints, consultations, and supplier onboarding deterministically.
   - Multi-question splitting breaks compound questions (`"Where is your showroom? Also do you work in Kandy?"`) and answers each part locally.
   - Fuzzy Levenshtein matching + abbreviation/synonym expansion (`alum`, `qt`, `boq`, `dgu`, `ss`) matches published Knowledge Base entries and uploaded Company Documents in English, Sinhala, or Tamil.
   - Local Product Catalog retrieval answers product-family questions without calling Gemini.
4. **Layer 4 — Normalized AI Response Cache + Daily Budget Guard + `gemini-4-hydrogen`**  
   - Before calling Gemini, normalized queries hit the cached AI answer store (`enableResponseCache`, configurable TTL).
   - Enforces **Daily AI Call Limit** (`dailyAiCallLimit`), **Per-Session Cooldown** (`aiCooldownSeconds`), and **`aiMode`** (`hybrid_credit_saver`, `local_only`, `ai_first`).
   - Uses `@google/genai` model `gemini-4-hydrogen` with `ThinkingLevel.LOW` and structured JSON schema output (`confidence`, `cannotVerify`, `needsHumanHandover`, `followUpSuggestions`).
   - If the AI response has low confidence (`< aiConfidenceThreshold`) or lacks verified facts, it returns the localized safe fallback and adds the question to the **Unanswered Review Queue**—never inventing prices or specs.

### Recommended Credit-Saving Modes
- **Strict Zero-Credit Mode:** In **Admin → Chatbot → AI & Security**, set **AI Operating Mode** to `Local Only (0 AI Credits Used)`.
- **Balanced Production Mode (Default):** Keep `Hybrid Credit Saver` with Daily AI Call Budget (e.g. `250`) and Cache enabled.

---

## 3. Admin Portal Capabilities (`#/ChatbotAdmin`)

1. **Schedule**: Monthly/weekly/custom-date Site Visit Slot management and booking status tracking.
2. **Knowledge Base**:
   - Create/edit Q&A entries with **Category**, **Subcategory**, **Alternative Phrasings**, **Keywords**, **Synonyms**, **Related Topics**, **Priority**, **Status** (`draft | review | approved | published | archived`), and **EN / SI / TA** translations.
   - Only `published` entries are accessible to public visitors.
   - Upload **Company Documents, PDFs & Technical Catalogues** and attach searchable excerpts.
   - Test retrieval live using **AI Retrieval Preview** (see normalized/expanded tokens and match scores).
   - Inspect **Revision History** on every entry.
3. **Workflows**:
   - Manage all 13 prebuilt workflows (General Inquiry, Service Discovery, Aluminium, Glass, Steel, Construction, Quotation Request, Project Inquiry, Technical Inquiry, Supplier Registration, Customer Complaint, Consultation Request, Human Assistance) or create custom workflows without touching code.
   - Configure step validation (`phone`, `email`, `number`, `choice`), quick reply chips, `skipIfCollected` (never re-asking already provided info), conditional branching, and completion actions (`create_lead`, `create_rfq`, `request_handover`, `book_visit`).
4. **Live Support & Leads**:
   - Monitor sessions filtered by `WAITING_HUMAN`, `IN_HUMAN_SUPPORT`, `ESCALATED`, `OPEN`, `CLOSED`.
   - Click **Take Over (Pause AI)**, send live replies (polled automatically every 4s by the customer widget), assign/transfer staff, record private internal notes, inspect prior customer contact history, or click **Return to AI Mode**.
   - Review structured **Leads** (`POTENTIAL` vs `QUALIFIED`) with uploaded drawings/BOQs and sync directly to Admin RFQs via **Sync to RFQ**.
5. **Unanswered Queue**:
   - Repeated unanswered questions are automatically grouped, prioritized by frequency, and queued with language, suggested category, and session reference.
   - Admins review and explicitly click **Approve & Add to KB** (AI answers are never auto-published).
6. **Analytics & BI**:
   - Real DB-backed KPIs (conversations, qualified vs potential leads, conversion %, unanswered pending, CSAT rating, handover rate, avg response time, AI credits saved).
   - Filter by date range and language; export to **CSV** or multi-sheet **Excel (.xlsx)**.
7. **AI & Security**:
   - Configure tone, response length, EN/SI/TA greetings & fallbacks, AI budget/thresholds, restricted topics, retention days, notification triggers, and view Configuration Audit History.

---

## 4. API Endpoints Summary

### Public Widget Endpoints
- `GET /api/chatbot/config` — Returns sanitized public config, published KB FAQs, and enabled workflows.
- `POST /api/chatbot/ask` — Rate-limited hybrid engine endpoint (`message`, `sessionId`, `sessionToken`, `language`, `attachments`).
- `POST /api/chatbot/upload` — Uploads customer drawings/BOQs/images (`.pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.xlsx,.csv,.txt,.doc,.docx`, max 15 MB).
- `GET /api/chatbot/session/:sessionId` — Returns session messages/mode when authorized by `x-chat-session-token`.
- `POST /api/chatbot/session/:sessionId/handover` — Requests human specialist handover.
- `POST /api/chatbot/session/:sessionId/feedback` — Submits 1–5 star CSAT rating.

### Protected Admin/Staff Endpoints (`requireAdminOrStaff`)
- `GET /api/chatbot/admin/bundle` — Full admin portal bundle.
- `PUT /api/chatbot/config`, `POST /api/chatbot/ai-cache/clear`
- `POST/PUT/DELETE /api/chatbot/faqs(/:id)`, `POST /api/chatbot/kb/preview`
- `POST/PUT/DELETE /api/chatbot/kb/documents(/:id)`
- `GET/POST/DELETE /api/chatbot/workflows(/:id)`
- `GET /api/chatbot/sessions`, `GET /api/chatbot/sessions/:id/history`, `POST /api/chatbot/sessions/:id/{takeover,reply,return-ai,note,assign,status}`
- `GET/DELETE /api/chatbot/unanswered(/:id)`, `POST /api/chatbot/unanswered/:id/convert`
- `GET/PATCH /api/chatbot/leads(/:id)`, `POST /api/chatbot/leads/:id/sync-rfq`
- `GET /api/chatbot/analytics`, `GET /api/chatbot/analytics/export.csv`

---

## 5. Verification Checklist

1. Start server (`npm run dev`) and verify `/api/health` returns `ok`.
2. Open the public widget (`floating-chatbot-ball`), switch between `EN`, `සිං`, and `தமிழ்`, attach a file, and run a quotation workflow — confirm already-provided fields (name/phone/location) are not re-asked.
3. Verify draft KB entries are hidden from public `GET /api/chatbot/config` and `/api/chatbot/ask` responses.
4. Click **Talk to Human**, then open **Admin → Chatbot → Live Support & Leads**, click **Take Over**, send a live reply, and verify the customer receives it without conflicting AI messages.
5. Trigger an unanswered question, verify it appears in **Unanswered**, and convert it to a published KB entry.
6. Verify **Analytics & BI** loads metrics and exports `.csv` / `.xlsx` reports cleanly.
