import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// ============================================================================
// SERVER CRYPTO SECRET DERIVATION
// ============================================================================
const EPHEMERAL_FALLBACK = randomBytes(32).toString("hex");

function getMasterSecret(): string {
  const envSecret =
    process.env.SESSION_SECRET ||
    process.env.APP_AUTH_SECRET ||
    process.env.SQL_ADMIN_PASSWORD ||
    process.env.SQL_PASSWORD ||
    "";
  if (envSecret.trim()) {
    return `${envSecret.trim()}|${process.env.SQL_DB_NAME || "innovista"}`;
  }
  return EPHEMERAL_FALLBACK;
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(`enc:${getMasterSecret()}`).digest();
}

function getSigningKey(): Buffer {
  return createHash("sha256").update(`sig:${getMasterSecret()}`).digest();
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// ============================================================================
// PASSWORD HASHING & POLICY (scrypt + timingSafeEqual)
// ============================================================================
const WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "password123",
  "admin123",
  "customer123",
  "qwerty123",
  "innovista123",
]);

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  const pw = typeof password === "string" ? password : "";
  if (pw.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) {
    return { valid: false, error: "Please choose a stronger, non-default password." };
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return {
      valid: false,
      error: "Password must include at least one letter and one number.",
    };
  }
  return { valid: true };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$16384$${salt}$${derived}`;
}

export function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") {
    return false;
  }
  const [, , salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ============================================================================
// AES-256-GCM ENCRYPTION FOR ADMIN TOTP SECRETS
// ============================================================================
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return null;
  try {
    const [ivHex, tagHex, encHex] = parts;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

// ============================================================================
// HMAC-SHA256 SIGNED SESSION TOKENS
// ============================================================================
export interface SessionTokenPayload {
  sub: number;
  uid: string;
  email: string;
  role: "admin" | "staff" | "customer";
  tokenType: "access" | "refresh" | "mfa" | "step_captcha";
  mfaVerified?: boolean;
  iat: number;
  exp: number;
}

// ============================================================================
// ADMIN SECRET KEY POLICY (Default: A9HF-4K28@, Recreated in Admin Portal)
// ============================================================================
export const DEFAULT_ADMIN_SECRET_KEY = "A9HF-4K28@";
const ADMIN_SECRET_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAdminSecretKey(): string {
  const bytes = randomBytes(8);
  let left = "";
  let right = "";
  for (let i = 0; i < 4; i++) {
    left += ADMIN_SECRET_CHARSET[bytes[i] % ADMIN_SECRET_CHARSET.length];
    right += ADMIN_SECRET_CHARSET[bytes[i + 4] % ADMIN_SECRET_CHARSET.length];
  }
  return `${left}-${right}@`;
}

export function validateAdminSecretKeyFormat(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = typeof raw === "string" ? raw.trim() : "";
  if (!normalized) {
    return { valid: false, normalized: "", error: "Admin secret key is required." };
  }
  if (normalized.length < 6 || normalized.length > 64) {
    return {
      valid: false,
      normalized,
      error: "Admin secret key must be between 6 and 64 characters.",
    };
  }
  if (/\s/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Admin secret key cannot contain spaces.",
    };
  }
  return { valid: true, normalized };
}

export function maskAdminSecretKey(secret: string): string {
  const clean = (secret || "").trim();
  if (!clean) return "••••••••";
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${clean.slice(0, 2)}${"•".repeat(Math.max(4, clean.length - 4))}${clean.slice(-2)}`;
}

export function verifyAdminSecretKeyInput(submitted: string, expectedSecret: string): boolean {
  const cleanSubmitted = typeof submitted === "string" ? submitted.trim() : "";
  const cleanExpected = typeof expectedSecret === "string" ? expectedSecret.trim() : "";
  if (!cleanSubmitted || !cleanExpected) return false;
  const submittedHash = createHash("sha256").update(cleanSubmitted).digest();
  const expectedHash = createHash("sha256").update(cleanExpected).digest();
  return timingSafeEqual(submittedHash, expectedHash);
}

export function issueSignedToken(
  payload: Omit<SessionTokenPayload, "iat" | "exp">,
  ttlSeconds: number
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const full: SessionTokenPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const bodyB64 = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", getSigningKey())
    .update(`${headerB64}.${bodyB64}`)
    .digest("base64url");
  return `${headerB64}.${bodyB64}.${sig}`;
}

export function verifySignedToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  if (!headerB64 || !bodyB64 || !sigB64) return null;

  try {
    const expectedSig = createHmac("sha256", getSigningKey())
      .update(`${headerB64}.${bodyB64}`)
      .digest();
    const actualSig = Buffer.from(sigB64, "base64url");
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8")) as SessionTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!parsed || typeof parsed.exp !== "number" || parsed.exp < nowSec) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// GOOGLE AUTHENTICATOR TOTP (RFC 6238 / RFC 4226)
// ============================================================================
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

export function generateTotpCode(
  secretBase32: string,
  timestampMs = Date.now(),
  periodSec = 30,
  digits = 6
): string {
  const counter = Math.floor(timestampMs / 1000 / periodSec);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secretBase32);
  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(binary % mod).padStart(digits, "0");
}

export function verifyTotpCode(
  secretBase32: string,
  submittedCode: string,
  timestampMs = Date.now(),
  windowSteps = 1
): boolean {
  const cleanCode = String(submittedCode || "").replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(cleanCode) || !secretBase32) return false;
  const codeBuf = Buffer.from(cleanCode, "utf8");
  for (let step = -windowSteps; step <= windowSteps; step++) {
    const candidate = generateTotpCode(secretBase32, timestampMs + step * 30_000);
    const candBuf = Buffer.from(candidate, "utf8");
    if (candBuf.length === codeBuf.length && timingSafeEqual(candBuf, codeBuf)) {
      return true;
    }
  }
  return false;
}

export function buildTotpOtpAuthUri(params: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = params.issuer || "Innovista Fabriconix Admin";
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.email)}`;
  return `otpauth://totp/${label}?secret=${encodeURIComponent(
    params.secret
  )}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ============================================================================
// ACCOUNT STATUS & CLASSIFICATION ENGINE
// ============================================================================
export type AccountClassificationCode =
  | "VERIFIED_ADMIN"
  | "UNVERIFIED_ADMIN"
  | "VERIFIED_CLIENT"
  | "UNVERIFIED_CLIENT"
  | "SUSPENDED_ADMIN"
  | "SUSPENDED_CLIENT"
  | "NOT_FOUND";

export interface AccountClassificationResult {
  exists: boolean;
  statusCode: AccountClassificationCode;
  role: "admin" | "staff" | "customer" | null;
  accountTypeLabel: string;
  badgeTone: "emerald" | "blue" | "amber" | "red" | "slate";
  isVerified: boolean;
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "SUSPENDED" | "NOT_CREATED";
  totpEnabled: boolean;
  mfaRequired: boolean;
  canLogin: boolean;
  isLocked: boolean;
  userSummary?: {
    id: number;
    username: string | null;
    name: string;
    email: string;
  };
  message: string;
}

export interface ClassifiableUserInput {
  id: number;
  uid: string;
  username?: string | null;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  emailVerified?: boolean;
  accountStatus?: string | null;
  isActive?: boolean;
  totpEnabled?: boolean;
  lockedUntil?: Date | string | null;
}

export function classifyAccountStatus(
  user: ClassifiableUserInput | null | undefined,
  nowMs = Date.now()
): AccountClassificationResult {
  if (!user) {
    return {
      exists: false,
      statusCode: "NOT_FOUND",
      role: null,
      accountTypeLabel: "Account Not Created",
      badgeTone: "slate",
      isVerified: false,
      emailVerified: false,
      accountStatus: "NOT_CREATED",
      totpEnabled: false,
      mfaRequired: false,
      canLogin: false,
      isLocked: false,
      message:
        "No account found for this email, username, or user ID. You can create a new client account right away.",
    };
  }

  const normalizedRole =
    user.role === "admin" || user.role === "staff" ? user.role : "customer";
  const isAdmin = normalizedRole === "admin" || normalizedRole === "staff";
  const suspended =
    (user.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED" ||
    user.isActive === false;
  const emailVerified = Boolean(user.emailVerified);
  const adminVerified = Boolean(user.isVerified);
  const totpEnabled = Boolean(user.totpEnabled);

  const lockedUntilMs = user.lockedUntil
    ? new Date(user.lockedUntil).getTime()
    : 0;
  const isLocked = Number.isFinite(lockedUntilMs) && lockedUntilMs > nowMs;

  const summary = {
    id: user.id,
    username: user.username || null,
    name: user.name,
    email: user.email,
  };

  if (suspended) {
    return {
      exists: true,
      statusCode: isAdmin ? "SUSPENDED_ADMIN" : "SUSPENDED_CLIENT",
      role: normalizedRole,
      accountTypeLabel: isAdmin ? "Suspended Admin Account" : "Suspended Client Account",
      badgeTone: "red",
      isVerified: adminVerified,
      emailVerified,
      accountStatus: "SUSPENDED",
      totpEnabled,
      mfaRequired: isAdmin && totpEnabled,
      canLogin: false,
      isLocked,
      userSummary: summary,
      message:
        "This account has been suspended by an administrator. Contact Innovista Security Desk to restore access.",
    };
  }

  if (isAdmin) {
    const fullyVerified = adminVerified && emailVerified;
    return {
      exists: true,
      statusCode: fullyVerified ? "VERIFIED_ADMIN" : "UNVERIFIED_ADMIN",
      role: normalizedRole,
      accountTypeLabel: fullyVerified
        ? "Verified Admin Account"
        : "Unverified Admin Account",
      badgeTone: fullyVerified ? "blue" : "amber",
      isVerified: adminVerified,
      emailVerified,
      accountStatus: "ACTIVE",
      totpEnabled,
      mfaRequired: true,
      canLogin: !isLocked,
      isLocked,
      userSummary: summary,
      message: isLocked
        ? "This admin account is temporarily locked due to repeated failed attempts."
        : fullyVerified
        ? "Verified Admin Account detected. Robot verification and Admin Secret Key will be required after clicking Login."
        : "Unverified Admin Account detected. Robot verification and Admin Secret Key verification required on login.",
    };
  }

  const clientVerified = adminVerified && emailVerified;
  return {
    exists: true,
    statusCode: clientVerified ? "VERIFIED_CLIENT" : "UNVERIFIED_CLIENT",
    role: "customer",
    accountTypeLabel: clientVerified
      ? "Verified Client Account"
      : "Unverified Client Account",
    badgeTone: clientVerified ? "emerald" : "amber",
    isVerified: adminVerified,
    emailVerified,
    accountStatus: "ACTIVE",
    totpEnabled,
    mfaRequired: true,
    canLogin: !isLocked,
    isLocked,
    userSummary: summary,
    message: isLocked
      ? "This client account is temporarily locked due to repeated failed sign-in attempts."
      : clientVerified
      ? "Verified Client Account recognized. Robot verification and Google Authenticator 2FA follow credentials."
      : !emailVerified && !adminVerified
      ? "Unverified Client Account: Sign in with your password, complete robot check, and verify via Google Authenticator."
      : !emailVerified
      ? "Unverified Client Account: Admin approved; complete robot check and Google Authenticator on login."
      : "Unverified Client Account: Email verified; complete robot check and Google Authenticator on login.",
  };
}

// ============================================================================
// HARDENED ANTI-OCR CAPTCHA + MULTI-LAYER ANTI-BOT VERIFICATION
// ============================================================================
const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Visually distinct lowercase letterforms that never collide with 2-9 digits or uppercase ambiguous pairs
const SAFE_LOWERCASE_MAP: Record<string, string> = {
  A: "a",
  D: "d",
  E: "e",
  F: "f",
  H: "h",
  M: "m",
  N: "n",
  R: "r",
  T: "t",
};

const CAPTCHA_FONTS = [
  "'Georgia', 'Times New Roman', serif",
  "'Trebuchet MS', 'Segoe UI', sans-serif",
  "'Impact', 'Arial Black', sans-serif",
  "'Verdana', 'Geneva', sans-serif",
  "'Courier New', monospace",
];

const CAPTCHA_INKS = ["#0f172a", "#1e3a8a", "#7c2d12", "#064e3b", "#312e81", "#831843"];

export interface HardenedCaptchaChallenge {
  code: string;
  svgMarkup: string;
  powSalt: string;
  powDifficulty: number;
  minDwellMs: number;
}

export interface CaptchaChallengeMeta {
  powSalt: string;
  powDifficulty: number;
  minDwellMs: number;
}

export interface CaptchaClientTelemetry {
  humanShieldVerified?: boolean;
  pointerCount?: number;
  keyCount?: number;
  dwellMs?: number;
}

export type CaptchaVerificationOutcome =
  | { ok: true }
  | {
      ok: false;
      status: number;
      reason: string;
      message: string;
      burnChallenge: boolean;
      auditAction?: string;
      auditSeverity?: "WARNING" | "HIGH" | "CRITICAL";
      auditDetails?: string;
    };

export function generateCaptchaChallenge(): HardenedCaptchaChallenge {
  let code = "";
  const bytes = randomBytes(7);
  for (let i = 0; i < 7; i++) {
    code += CAPTCHA_CHARS[bytes[i] % CAPTCHA_CHARS.length];
  }

  const uid = randomBytes(4).toString("hex");
  const filterId = `warp_${uid}`;
  const bgGradId = `capBg_${uid}`;
  const turbSeed = (randomBytes(2).readUInt16BE(0) % 900) + 11;

  // Background crosshatch interference grid
  const bgGrid: string[] = [];
  for (let gx = -20; gx <= 264; gx += 18) {
    bgGrid.push(
      `<line x1="${gx}" y1="0" x2="${gx + 26}" y2="84" stroke="#94a3b8" stroke-width="0.7" stroke-opacity="0.22" />`
    );
  }
  for (let gy = 10; gy <= 76; gy += 16) {
    bgGrid.push(
      `<line x1="0" y1="${gy}" x2="264" y2="${gy + ((gy % 32 === 10) ? 8 : -8)}" stroke="#64748b" stroke-width="0.65" stroke-opacity="0.18" />`
    );
  }

  // Background curved interference Bezier paths & geometric shapes
  const bgCurves: string[] = [];
  for (let i = 0; i < 6; i++) {
    const b = randomBytes(8);
    const x1 = b[0] % 35;
    const y1 = 8 + (b[1] % 68);
    const cx1 = 55 + (b[2] % 65);
    const cy1 = 4 + (b[3] % 76);
    const cx2 = 140 + (b[4] % 65);
    const cy2 = 4 + (b[5] % 76);
    const x2 = 229 + (b[6] % 35);
    const y2 = 8 + (b[7] % 68);
    const strokeColors = ["#64748b", "#0284c7", "#ea580c", "#1d4ed8", "#334155"];
    const color = strokeColors[i % strokeColors.length];
    bgCurves.push(
      `<path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="1.35" stroke-opacity="0.34" />`
    );
  }

  // Scattered background ellipses/dots to disrupt connected-component segmentation
  const noiseDots: string[] = [];
  for (let i = 0; i < 18; i++) {
    const b = randomBytes(4);
    const cx = 8 + (b[0] % 248);
    const cy = 8 + (b[1] % 68);
    const r = (1.1 + (b[2] % 25) / 10).toFixed(1);
    const color = CAPTCHA_INKS[b[3] % CAPTCHA_INKS.length];
    noiseDots.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="${i % 2 === 0 ? "0.22" : "0.14"}" />`
    );
  }

  // Low-opacity decoy ghost characters to confuse bounding-box detectors
  const decoyGlyphs: string[] = [];
  for (let i = 0; i < 7; i++) {
    const b = randomBytes(5);
    const ch = CAPTCHA_CHARS[b[0] % CAPTCHA_CHARS.length];
    const gx = 18 + i * 35 + ((b[1] % 11) - 5);
    const gy = 22 + (b[2] % 48);
    const rot = (b[3] % 70) - 35;
    const font = CAPTCHA_FONTS[b[4] % CAPTCHA_FONTS.length];
    decoyGlyphs.push(
      `<text x="${gx}" y="${gy}" fill="#334155" fill-opacity="0.14" font-family="${font}" font-size="22" font-weight="700" transform="rotate(${rot} ${gx} ${gy})">${ch}</text>`
    );
  }

  // Primary 7 distorted mixed-case/multi-font characters inside turbulence warp filter
  const glyphs = code
    .split("")
    .map((ch, idx) => {
      const b = randomBytes(8);
      const displayChar =
        SAFE_LOWERCASE_MAP[ch] && b[7] % 2 === 0 ? SAFE_LOWERCASE_MAP[ch] : ch;
      const x = 27 + Math.round(idx * 31.5) + ((b[0] % 5) - 2);
      const y = 50 + ((b[1] % 15) - 7);
      const rot = (b[2] % 36) - 18;
      const skewX = (b[3] % 22) - 11;
      const skewY = (b[4] % 12) - 6;
      const fontSize = 26 + (b[5] % 6);
      const font = CAPTCHA_FONTS[(idx + b[6]) % CAPTCHA_FONTS.length];
      const ink = CAPTCHA_INKS[(idx + b[0]) % CAPTCHA_INKS.length];
      const isHollow = idx % 3 === 1;
      const fillAttr = isHollow
        ? `fill="${ink}" fill-opacity="0.16" stroke="${ink}" stroke-width="1.9"`
        : `fill="${ink}" fill-opacity="0.94" stroke="#f8fafc" stroke-width="0.45"`;

      return `<g transform="translate(${x} ${y}) rotate(${rot}) skewX(${skewX}) skewY(${skewY})">
        <text x="0" y="0" text-anchor="middle" ${fillAttr} font-family="${font}" font-size="${fontSize}" font-weight="900">${displayChar}</text>
      </g>`;
    })
    .join("");

  // Foreground occluding arcs & dashed slashes over the warped glyph layer
  const fgOcclusion: string[] = [];
  for (let i = 0; i < 4; i++) {
    const b = randomBytes(7);
    const x1 = b[0] % 25;
    const y1 = 16 + (b[1] % 52);
    const cx = 90 + (b[2] % 80);
    const cy = 6 + (b[3] % 72);
    const x2 = 236 + (b[4] % 26);
    const y2 = 16 + (b[5] % 52);
    const strokeColors = ["#0f172a", "#1e40af", "#9a3412", "#334155"];
    const dash = i % 2 === 1 ? ' stroke-dasharray="6 3 2 3"' : "";
    fgOcclusion.push(
      `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${strokeColors[b[6] % strokeColors.length]}" stroke-width="1.45" stroke-opacity="0.52"${dash} />`
    );
  }

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 264 84" width="264" height="84" role="img" aria-label="Hardened robot verification security code">
  <defs>
    <linearGradient id="${bgGradId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <filter id="${filterId}" x="-12%" y="-18%" width="124%" height="136%">
      <feTurbulence type="fractalNoise" baseFrequency="0.022 0.044" numOctaves="2" seed="${turbSeed}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="5.0" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <rect width="264" height="84" rx="10" fill="url(#${bgGradId})" stroke="#cbd5e1"/>
  ${bgGrid.join("")}
  ${bgCurves.join("")}
  ${noiseDots.join("")}
  ${decoyGlyphs.join("")}
  <g filter="url(#${filterId})">
    ${glyphs}
  </g>
  ${fgOcclusion.join("")}
</svg>`;

  return {
    code,
    svgMarkup,
    powSalt: randomBytes(12).toString("hex"),
    powDifficulty: 3,
    minDwellMs: 1200,
  };
}

export function normalizeCaptchaAnswer(input: string): string {
  return String(input || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function parseCaptchaChallengeMeta(rawIdentifier: string | null | undefined): CaptchaChallengeMeta | null {
  if (!rawIdentifier) return null;
  try {
    const parsed = JSON.parse(rawIdentifier) as Partial<CaptchaChallengeMeta>;
    if (typeof parsed.powSalt !== "string" || !parsed.powSalt) return null;
    return {
      powSalt: parsed.powSalt,
      powDifficulty: typeof parsed.powDifficulty === "number" ? parsed.powDifficulty : 3,
      minDwellMs: typeof parsed.minDwellMs === "number" ? parsed.minDwellMs : 1200,
    };
  } catch {
    return null;
  }
}

export function verifyPowSolution(powSalt: string, powNonce: string, powDifficulty = 3): boolean {
  const cleanSalt = String(powSalt || "").trim();
  const cleanNonce = String(powNonce || "").trim();
  if (!cleanSalt || !cleanNonce || cleanNonce.length > 48) return false;
  const targetPrefix = "0".repeat(Math.min(Math.max(1, Math.floor(powDifficulty)), 5));
  return sha256Hex(`${cleanSalt}:${cleanNonce}`).startsWith(targetPrefix);
}

export function verifyCaptchaSecurityPayload(input: {
  challengeId: string;
  challengeCreatedAtMs: number;
  expectedAnswerHash: string;
  storedMeta: CaptchaChallengeMeta | null;
  submittedAnswer: string;
  submittedPowNonce: string;
  honeypot: string;
  telemetry?: CaptchaClientTelemetry | null;
  nowMs?: number;
}): CaptchaVerificationOutcome {
  if (typeof input.honeypot === "string" && input.honeypot.trim().length > 0) {
    return {
      ok: false,
      status: 400,
      reason: "BOT_HONEYPOT",
      message: "Automated submission rejected by bot trap protection.",
      burnChallenge: true,
      auditAction: "BOT_HONEYPOT_TRIGGERED",
      auditSeverity: "HIGH",
      auditDetails: "Bot trap honeypot field populated during authentication/registration attempt.",
    };
  }

  const nowMs = typeof input.nowMs === "number" ? input.nowMs : Date.now();
  const minDwellMs = input.storedMeta?.minDwellMs ?? 1200;
  const elapsedMs = nowMs - input.challengeCreatedAtMs;
  if (Number.isFinite(input.challengeCreatedAtMs) && elapsedMs < minDwellMs) {
    return {
      ok: false,
      status: 400,
      reason: "BOT_TIMING_TOO_FAST",
      message: "Submission occurred too quickly for human verification. Please refresh and solve the challenge.",
      burnChallenge: true,
      auditAction: "BOT_TIMING_VIOLATION",
      auditSeverity: "HIGH",
      auditDetails: `Instantaneous bot submission blocked (${Math.max(0, elapsedMs)}ms < ${minDwellMs}ms minimum).`,
    };
  }

  const tel = input.telemetry || {};
  const pointerCount = typeof tel.pointerCount === "number" ? tel.pointerCount : 0;
  const keyCount = typeof tel.keyCount === "number" ? tel.keyCount : 0;
  if (tel.humanShieldVerified !== true || (pointerCount < 1 && keyCount < 4)) {
    return {
      ok: false,
      status: 400,
      reason: "BOT_SHIELD_REQUIRED",
      message: "Please click 'Verify you are human' and complete the interactive security check.",
      burnChallenge: false,
      auditAction: "BOT_SHIELD_INCOMPLETE",
      auditSeverity: "WARNING",
      auditDetails: "Submission attempted without completing interactive Human Shield verification.",
    };
  }

  if (input.storedMeta) {
    const powValid = verifyPowSolution(
      input.storedMeta.powSalt,
      input.submittedPowNonce,
      input.storedMeta.powDifficulty
    );
    if (!powValid) {
      return {
        ok: false,
        status: 400,
        reason: "BOT_POW_FAILED",
        message: "Cryptographic anti-bot proof failed. Please click 'New Code' and verify again.",
        burnChallenge: true,
        auditAction: "BOT_POW_REJECTED",
        auditSeverity: "HIGH",
        auditDetails: "Client Proof-of-Work SHA-256 verification failed or missing.",
      };
    }
  }

  const normalized = normalizeCaptchaAnswer(input.submittedAnswer);
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      reason: "CAPTCHA_MISSING",
      message: "Please enter the 7-character distorted security code.",
      burnChallenge: false,
    };
  }

  const submittedHash = sha256Hex(`${input.challengeId}:${normalized}`);
  const expectedBuf = Buffer.from(input.expectedAnswerHash, "hex");
  const actualBuf = Buffer.from(submittedHash, "hex");
  const codeMatch =
    expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);

  if (!codeMatch) {
    return {
      ok: false,
      status: 400,
      reason: "CAPTCHA_MISMATCH",
      message: "Incorrect robot verification code. Please check the distorted characters and try again.",
      burnChallenge: false,
      auditAction: "CAPTCHA_FAILED",
      auditSeverity: "WARNING",
      auditDetails: "User submitted incorrect 7-character hardened CAPTCHA code.",
    };
  }

  return { ok: true };
}

// ============================================================================
// DETAILED AUDIT CSV BUILDER (Formula-Injection Hardened + RFC 4180)
// ============================================================================
export interface AuditLogCsvRow {
  eventId: string;
  createdAt: Date | string;
  category: string;
  action: string;
  status: string;
  severity: string;
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetUserId?: number | null;
  targetIdentifier?: string | null;
  accountClassification?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function sanitizeCsvCell(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildAuditLogsCsv(rows: AuditLogCsvRow[]): string {
  const headers = [
    "Event ID",
    "Timestamp (UTC)",
    "Category",
    "Action",
    "Status",
    "Severity",
    "Actor User ID",
    "Actor Email",
    "Actor Role",
    "Target User ID",
    "Target Identifier",
    "Account Classification",
    "IP Address",
    "User Agent",
    "Details",
    "Metadata JSON",
  ];

  const lines = [headers.map(sanitizeCsvCell).join(",")];
  for (const r of rows) {
    const isoTime =
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : new Date(r.createdAt || Date.now()).toISOString();
    const cells = [
      r.eventId,
      isoTime,
      r.category,
      r.action,
      r.status,
      r.severity,
      r.actorUserId ?? "",
      r.actorEmail ?? "",
      r.actorRole ?? "",
      r.targetUserId ?? "",
      r.targetIdentifier ?? "",
      r.accountClassification ?? "",
      r.ipAddress ?? "",
      r.userAgent ?? "",
      r.details ?? "",
      JSON.stringify(r.metadata || {}),
    ];
    lines.push(cells.map(sanitizeCsvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
