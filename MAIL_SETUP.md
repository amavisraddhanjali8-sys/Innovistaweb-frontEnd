# Web Mail & Contact Setup Guide — Innovista Fabriconix

This guide explains how to configure real email delivery and business phone/WhatsApp routing for the **Innovista Fabriconix** web application (`Footer` consultation form, `Contact` page, `RequestQuoteModal`, and `RequestQuotePage`).

---

## 1. Environment Variables (`.env`)

Create a `.env` file in the project root (copying from `.env.example`) and never commit `.env` to version control.

```dotenv
# Public Contact & Phone Setup (exposed to Vite client)
VITE_CONTACT_PHONE="+94 76 081 8098"
VITE_WHATSAPP_NUMBER="94760818098"
VITE_CONTACT_EMAIL="innovistametal@gmail.com"

# Option A: EmailJS (Browser-Side Mail Delivery)
VITE_EMAILJS_SERVICE_ID="service_xxxxxxxx"
VITE_EMAILJS_TEMPLATE_ID="template_xxxxxxxx"
VITE_EMAILJS_PUBLIC_KEY="your_emailjs_public_key"

# Option B: Backend SMTP / Gmail App Password (Server-Side)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="innovistametal@gmail.com"
SMTP_PASS="xxxx_xxxx_xxxx_xxxx"
CONTACT_RECEIVER_EMAIL="innovistametal@gmail.com"

# Option C: Resend / Webhook Transactional Relay (Optional)
RESEND_API_KEY=""
MAIL_WEBHOOK_URL=""
```

---

## 2. Option A — Quick Client-Side Setup with EmailJS (No SMTP Server Needed)

`@emailjs/browser` is already installed in `package.json`.

1. Sign in to [EmailJS](https://www.emailjs.com/) and open **Email Services** → **Add New Service**.
2. Choose **Gmail** (or your custom domain mail provider) and authorize `innovistametal@gmail.com`. Copy the **Service ID**.
3. Open **Email Templates** → **Create New Template** and define variables matching the consultation & quote forms:
   - `{{client_name}}` — Sender full name
   - `{{client_email}}` — Sender reply-to email
   - `{{client_phone}}` — Contact phone / WhatsApp number
   - `{{inquiry_type}}` — Consultation, Quotation, or Department desk
   - `{{subject}}` — Product or subject title
   - `{{message}}` — Inquiry notes / specifications
   - `{{order_ref}}` — Generated reference code (e.g. `ORD-9203`)
4. Set the template **To Email** field to `innovistametal@gmail.com` and **Reply-To** to `{{client_email}}`.
5. Copy the **Template ID** and your **Public Key** (from **Account** → **API Keys**) into `.env`.
6. Restart the dev server (`npm run dev`).

---

## 3. Option B — Production Backend Mail via Gmail SMTP & Nodemailer

For full-stack deployments running `server.ts`, server-side SMTP keeps credentials off the browser:

1. **Enable 2-Step Verification** on the Google Workspace / Gmail account (`innovistametal@gmail.com`).
2. Visit **Google Account** → **Security** → **App passwords** and generate a 16-character App Password named `Innovista Web`.
3. Install `nodemailer` on the server:
   ```bash
   npm install nodemailer
   npm install -D @types/nodemailer
   ```
4. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `CONTACT_RECEIVER_EMAIL` in `.env` (or your cloud host's secret manager).
5. Create a mailer helper in `server.ts` inside `POST /order/createOrder` (after saving the order/consultation record):
   ```ts
   import nodemailer from "nodemailer";

   const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
     ? nodemailer.createTransport({
         host: process.env.SMTP_HOST || "smtp.gmail.com",
         port: Number(process.env.SMTP_PORT || 465),
         secure: process.env.SMTP_SECURE !== "false",
         auth: {
           user: process.env.SMTP_USER,
           pass: process.env.SMTP_PASS,
         },
       })
     : null;
   ```
6. Send an HTML notification email to `CONTACT_RECEIVER_EMAIL` and an optional auto-acknowledgement to `req.body.Client_Email` with `replyTo: req.body.Client_Email`.

---

## 4. Option C — Transactional API (Resend / SendGrid / Postmark)

If your hosting platform blocks outbound SMTP ports (`25`, `465`, `587`), use HTTPS transactional APIs:

1. Verify your sending domain (e.g., `innovistafabriconix.lk`) by adding **SPF** (`TXT`) and **DKIM** (`CNAME`) DNS records.
2. Add `RESEND_API_KEY` (or SendGrid key) to `.env`.
3. Call `https://api.resend.com/emails` from `server.ts` using native `fetch()` with `Authorization: Bearer ${process.env.RESEND_API_KEY}`.

---

## 5. Phone Number & Live Contact Setup

The displayed phone number, WhatsApp link, email address, and social links can be configured in **two ways**:

1. **Static / Build-Time Defaults (`.env`)**:
   - `VITE_CONTACT_PHONE="+94 76 081 8098"`
   - `VITE_WHATSAPP_NUMBER="94760818098"`
   - `VITE_CONTACT_EMAIL="innovistametal@gmail.com"`
2. **Live Admin Portal Setup (`/admin-home`)**:
   - Sign in as Admin and open **Contact & Phone Setup** inside the Admin Command Center.
   - Update the Phone Number, WhatsApp digits, Email, Address, or Social URLs and click **Save Contact Settings** (`PUT /api/site-settings`). Changes immediately propagate to the Footer Contact Us section, Silent Ringing Phone widget, Contact page, and Contact Modal.

---

## 6. Verification Checklist

- [ ] Submit a test inquiry in the **Footer Consultation Form** and verify the reference ID is created and the email arrives in `innovistametal@gmail.com`.
- [ ] Click **Reply** in your inbox to confirm `Reply-To` resolves to the customer's email address.
- [ ] Check spam/junk folders and verify **SPF**, **DKIM**, and **DMARC** pass on custom domains.
- [ ] Test the **Phone Number** `tel:` link and **WhatsApp** link on both desktop and mobile viewports.
