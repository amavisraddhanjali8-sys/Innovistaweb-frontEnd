/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import {
  CheckCircleOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  LoadingOutlined,
  MobileOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { solvePowChallenge } from "../utils/botShieldClient";

export interface AccountClassification {
  exists: boolean;
  statusCode:
    | "VERIFIED_ADMIN"
    | "UNVERIFIED_ADMIN"
    | "VERIFIED_CLIENT"
    | "UNVERIFIED_CLIENT"
    | "SUSPENDED_ADMIN"
    | "SUSPENDED_CLIENT"
    | "NOT_FOUND";
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

interface PowChallenge {
  salt: string;
  difficulty: number;
}

export interface CaptchaSubmissionPayload {
  captchaId: string;
  captchaAnswer: string;
  captchaPowNonce: string;
  captchaTelemetry: {
    humanShieldVerified: boolean;
    pointerCount: number;
    keyCount: number;
    dwellMs: number;
  };
  website: string;
}

export function useCaptchaChallenge() {
  const [captchaId, setCaptchaId] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [powChallenge, setPowChallenge] = useState<PowChallenge | null>(null);
  const [powNonce, setPowNonce] = useState("");
  const [solvingShield, setSolvingShield] = useState(false);
  const [humanShieldVerified, setHumanShieldVerified] = useState(false);

  const issuedAtRef = useRef<number>(Date.now());
  const pointerCountRef = useRef<number>(0);
  const keyCountRef = useRef<number>(0);

  const refreshCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    setHumanShieldVerified(false);
    setPowNonce("");
    setSolvingShield(false);
    pointerCountRef.current = 0;
    keyCountRef.current = 0;

    try {
      const res = await axios.get<{
        challengeId: string;
        svgMarkup: string;
        powChallenge?: PowChallenge;
      }>("/api/auth/captcha");
      setCaptchaId(res.data.challengeId || "");
      setSvgMarkup(res.data.svgMarkup || "");
      setPowChallenge(res.data.powChallenge || null);
      setCaptchaAnswer("");
      issuedAtRef.current = Date.now();
    } catch {
      setCaptchaId("");
      setSvgMarkup("");
      setPowChallenge(null);
    } finally {
      setLoadingCaptcha(false);
    }
  }, []);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  const recordPointerInteraction = useCallback(() => {
    pointerCountRef.current += 1;
  }, []);

  const recordKeyInteraction = useCallback(() => {
    keyCountRef.current += 1;
  }, []);

  const verifyHumanShield = useCallback(async () => {
    if (loadingCaptcha || solvingShield || !captchaId) return;
    pointerCountRef.current += 1;

    if (humanShieldVerified && powNonce) {
      return;
    }

    setSolvingShield(true);
    try {
      let solvedNonce = "human-verified";
      if (powChallenge?.salt) {
        const result = await solvePowChallenge(powChallenge.salt, powChallenge.difficulty || 3);
        solvedNonce = result.nonce;
      }
      setPowNonce(solvedNonce);
      setHumanShieldVerified(true);
    } catch {
      setPowNonce("");
      setHumanShieldVerified(false);
    } finally {
      setSolvingShield(false);
    }
  }, [captchaId, humanShieldVerified, loadingCaptcha, powChallenge, powNonce, solvingShield]);

  const validateReady = useCallback((): string | null => {
    if (!humanShieldVerified || !powNonce) {
      return "Please click 'Verify you are human' to complete the anti-bot security check.";
    }
    if (!captchaAnswer.trim()) {
      return "Please enter the 7-character distorted robot verification code.";
    }
    return null;
  }, [captchaAnswer, humanShieldVerified, powNonce]);

  const getSubmissionPayload = useCallback((): CaptchaSubmissionPayload => {
    return {
      captchaId,
      captchaAnswer,
      captchaPowNonce: powNonce,
      captchaTelemetry: {
        humanShieldVerified,
        pointerCount: pointerCountRef.current,
        keyCount: keyCountRef.current,
        dwellMs: Math.max(0, Date.now() - issuedAtRef.current),
      },
      website: honeypot,
    };
  }, [captchaAnswer, captchaId, honeypot, humanShieldVerified, powNonce]);

  return {
    captchaId,
    svgMarkup,
    captchaAnswer,
    setCaptchaAnswer,
    honeypot,
    setHoneypot,
    loadingCaptcha,
    solvingShield,
    humanShieldVerified,
    verifyHumanShield,
    recordPointerInteraction,
    recordKeyInteraction,
    validateReady,
    getSubmissionPayload,
    refreshCaptcha,
  };
}

export type UseCaptchaChallengeReturn = ReturnType<typeof useCaptchaChallenge>;

interface CaptchaWidgetProps {
  captcha: UseCaptchaChallengeReturn;
  testIdPrefix?: string;
}

export function CaptchaWidget({
  captcha,
  testIdPrefix = "captcha",
}: CaptchaWidgetProps) {
  return (
    <div
      data-testid={`${testIdPrefix}-widget`}
      onPointerDown={captcha.recordPointerInteraction}
      className="rounded-xl border border-slate-200 bg-slate-50/85 p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <SafetyCertificateOutlined className="text-[#22577A]" />
          <span>Robot Verification</span>
        </span>
        <button
          type="button"
          onClick={() => void captcha.refreshCaptcha()}
          disabled={captcha.loadingCaptcha}
          data-testid={`${testIdPrefix}-refresh`}
          className="inline-flex items-center gap-1 min-h-[34px] px-2 rounded-lg text-[11px] font-semibold text-[#22577A] hover:text-[#19435E] hover:bg-slate-200/50 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <ReloadOutlined spin={captcha.loadingCaptcha} />
          <span>New Code</span>
        </button>
      </div>

      {/* Layer 1: Interactive Human Shield + SHA-256 Proof-of-Work */}
      <button
        type="button"
        onClick={() => void captcha.verifyHumanShield()}
        disabled={captcha.loadingCaptcha || captcha.solvingShield}
        data-testid={`${testIdPrefix}-shield-btn`}
        aria-pressed={captcha.humanShieldVerified}
        className={`w-full min-h-[44px] rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
          captcha.humanShieldVerified
            ? "border-emerald-300 bg-emerald-50/90 text-emerald-900"
            : "border-slate-300 bg-white hover:border-[#22577A] text-slate-800 shadow-xs"
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
              captcha.humanShieldVerified
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-400 bg-white"
            }`}
          >
            {captcha.solvingShield ? (
              <LoadingOutlined className="text-xs text-[#22577A]" />
            ) : captcha.humanShieldVerified ? (
              <CheckCircleOutlined className="text-xs" />
            ) : null}
          </span>
          <span className="text-xs font-semibold truncate">
            {captcha.solvingShield
              ? "Verifying browser integrity..."
              : captcha.humanShieldVerified
              ? "Human shield verified"
              : "Click to verify you are human"}
          </span>
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            captcha.humanShieldVerified ? "text-emerald-700" : "text-slate-400"
          }`}
        >
          {captcha.humanShieldVerified ? "Verified" : "Anti-Bot"}
        </span>
      </button>

      {/* Layer 2: Hardened Distorted SVG & 7-Character Code Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div
          data-testid={`${testIdPrefix}-svg`}
          className="w-full sm:w-[205px] shrink-0 rounded-lg overflow-hidden border border-slate-300/80 bg-white flex items-center justify-center min-h-[68px] p-1 select-none [&_svg]:w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{
            __html:
              captcha.svgMarkup ||
              '<span style="font-size:11px;color:#64748b;padding:8px 16px;">Loading security code...</span>',
          }}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <label htmlFor={`${testIdPrefix}-input`} className="sr-only">
            Enter 7-character distorted security code
          </label>
          <input
            id={`${testIdPrefix}-input`}
            data-testid={`${testIdPrefix}-input`}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={10}
            value={captcha.captchaAnswer}
            onKeyDown={captcha.recordKeyInteraction}
            onChange={(e) => {
              captcha.recordKeyInteraction();
              captcha.setCaptchaAnswer(e.target.value.toUpperCase());
            }}
            placeholder="7-char code"
            className="w-full h-11 rounded-xl bg-white px-3 text-base sm:text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 border border-slate-200 focus:border-[#22577A] focus:outline-none focus:ring-2 focus:ring-[#22577A]/15"
          />
          <p className="m-0 text-[10.5px] text-slate-500 leading-tight px-0.5">
            Type the 7 distorted characters (case-insensitive)
          </p>
        </div>
      </div>

      {/* Anti-bot honeypot field (hidden from real users) */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={captcha.honeypot}
        onChange={(e) => captcha.setHoneypot(e.target.value)}
        className="sr-only"
      />
    </div>
  );
}

interface AccountStatusBannerProps {
  classification: AccountClassification | null;
  checking?: boolean;
}

export function AccountStatusBanner({ classification, checking }: AccountStatusBannerProps) {
  if (checking) {
    return (
      <div
        data-testid="account-status-checking"
        className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600"
      >
        Checking account verification &amp; role status...
      </div>
    );
  }

  if (!classification) return null;

  const toneStyles: Record<AccountClassification["badgeTone"], string> = {
    blue: "border-sky-200 bg-sky-50/90 text-sky-900",
    emerald: "border-emerald-200 bg-emerald-50/90 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/90 text-amber-900",
    red: "border-red-200 bg-red-50/90 text-red-900",
    slate: "border-slate-200 bg-slate-100/90 text-slate-800",
  };

  const icon =
    classification.badgeTone === "red" ? (
      <StopOutlined className="text-red-600 text-sm shrink-0 mt-0.5" />
    ) : classification.badgeTone === "amber" ? (
      <WarningOutlined className="text-amber-600 text-sm shrink-0 mt-0.5" />
    ) : classification.badgeTone === "emerald" || classification.badgeTone === "blue" ? (
      <CheckCircleOutlined
        className={`${
          classification.badgeTone === "blue" ? "text-sky-600" : "text-emerald-600"
        } text-sm shrink-0 mt-0.5`}
      />
    ) : (
      <InfoCircleOutlined className="text-slate-500 text-sm shrink-0 mt-0.5" />
    );

  return (
    <div
      data-testid="account-status-banner"
      data-status-code={classification.statusCode}
      className={`rounded-xl border px-3.5 py-2.5 text-xs ${toneStyles[classification.badgeTone]}`}
    >
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-bold tracking-tight">
              {classification.accountTypeLabel}
            </span>
            {classification.exists && (
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {classification.totpEnabled
                  ? "Google Authenticator 2FA"
                  : classification.emailVerified
                  ? "Email Verified"
                  : "Email Unverified"}
              </span>
            )}
          </div>
          <p className="m-0 text-[11.5px] leading-snug opacity-90">
            {classification.message}
          </p>
          {classification.userSummary && (
            <div className="text-[11px] opacity-80 pt-0.5">
              ID #{classification.userSummary.id}
              {classification.userSummary.username ? ` · @${classification.userSummary.username}` : ""}
              {` · ${classification.userSummary.name}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type LoginFlowStep = "credentials" | "robot" | "customer_totp" | "admin_secret";

export function LoginSecurityStepper({
  step,
  role,
}: {
  step: LoginFlowStep;
  role?: "admin" | "staff" | "customer" | null;
}) {
  const activeIdx = step === "credentials" ? 0 : step === "robot" ? 1 : 2;
  const step3Label =
    step === "admin_secret" || role === "admin" || role === "staff"
      ? "Secret Key"
      : step === "customer_totp" || role === "customer"
      ? "Authenticator"
      : "2FA / Key";

  const steps = [
    { label: "ID & Password" },
    { label: "Robot Check" },
    { label: step3Label },
  ];

  return (
    <div
      data-testid="login-step-indicator"
      data-active-step={step}
      className="grid grid-cols-3 gap-1.5 mb-3.5"
      aria-label="Login verification steps"
    >
      {steps.map((item, idx) => {
        const isDone = idx < activeIdx;
        const isActive = idx === activeIdx;
        return (
          <div
            key={item.label}
            className={`rounded-lg border px-2 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
              isDone
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : isActive
                ? "border-[#22577A]/35 bg-sky-50/90 text-[#19435E]"
                : "border-slate-200 bg-slate-50/60 text-slate-400"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                isDone
                  ? "bg-emerald-600 text-white"
                  : isActive
                  ? "bg-[#22577A] text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {isDone ? "✓" : idx + 1}
            </span>
            <span className="truncate">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface CustomerTotpStepPanelProps {
  email: string;
  totpEnrolled: boolean;
  qrDataUrl?: string | null;
  manualSecret?: string | null;
  code: string;
  onCodeChange: (value: string) => void;
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  accentHex?: string;
}

export function CustomerTotpStepPanel({
  email,
  totpEnrolled,
  qrDataUrl,
  manualSecret,
  code,
  onCodeChange,
  loading,
  onBack,
  onSubmit,
  accentHex = "#FF6B1E",
}: CustomerTotpStepPanelProps) {
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleCopySecret = async () => {
    if (!manualSecret) return;
    try {
      await navigator.clipboard.writeText(manualSecret);
      setCopiedSecret(true);
      window.setTimeout(() => setCopiedSecret(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      data-testid="customer-totp-step-form"
      className="space-y-3.5"
    >
      <div className="rounded-xl border border-sky-200 bg-sky-50/85 px-3.5 py-2.5 text-xs text-sky-950 flex items-start gap-2.5">
        <MobileOutlined className="text-[#22577A] text-base shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-bold">Google Authenticator Verification</div>
          <p className="m-0 mt-0.5 text-[11.5px] text-sky-900/90 leading-snug">
            {totpEnrolled
              ? `Enter the 6-digit rotating code from Google Authenticator for ${email}.`
              : `First-time setup for ${email}: scan the QR code below in Google Authenticator, then enter the 6-digit code.`}
          </p>
        </div>
      </div>

      {!totpEnrolled && qrDataUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col sm:flex-row items-center gap-3">
          <img
            src={qrDataUrl}
            alt="Customer Google Authenticator QR Code"
            data-testid="customer-totp-qr"
            className="w-32 h-32 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Manual Authenticator Key
            </div>
            {manualSecret && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <code
                  data-testid="customer-totp-manual-secret"
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-mono font-semibold text-slate-800 break-all select-all"
                >
                  {manualSecret}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopySecret()}
                  aria-label="Copy Google Authenticator manual key"
                  className="min-w-[34px] min-h-[34px] rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                >
                  {copiedSecret ? <CheckCircleOutlined className="text-emerald-600" /> : <CopyOutlined />}
                </button>
              </div>
            )}
            <p className="m-0 text-[11px] text-slate-500 leading-snug">
              Open Google Authenticator &rarr; Scan QR code (or enter setup key).
            </p>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="customer-totp-code"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          6-Digit Google Authenticator Code
        </label>
        <input
          id="customer-totp-code"
          data-testid="customer-totp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full h-12 rounded-xl bg-[#F4F5F7] border border-slate-200 px-4 text-center font-mono text-xl font-bold tracking-[0.4em] text-slate-900 focus:bg-white focus:border-[#22577A] focus:outline-none focus:ring-2 focus:ring-[#22577A]/15"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          data-testid="customer-totp-back-btn"
          className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          data-testid="customer-totp-submit"
          style={{ backgroundColor: accentHex }}
          className="flex-1 min-h-[44px] px-4 rounded-xl text-white font-semibold text-sm shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <LoadingOutlined />}
          <span>Verify &amp; Sign In</span>
        </button>
      </div>
    </form>
  );
}

interface AdminSecretKeyStepPanelProps {
  email: string;
  secretKey: string;
  onSecretKeyChange: (value: string) => void;
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  accentHex?: string;
}

export function AdminSecretKeyStepPanel({
  email,
  secretKey,
  onSecretKeyChange,
  loading,
  onBack,
  onSubmit,
  accentHex = "#22577A",
}: AdminSecretKeyStepPanelProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <form
      onSubmit={onSubmit}
      data-testid="admin-secret-key-step-form"
      className="space-y-3.5"
    >
      <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2.5 text-xs text-sky-950 flex items-start gap-2.5">
        <KeyOutlined className="text-[#22577A] text-base shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-bold">Administrator Secret Key Required</div>
          <p className="m-0 mt-0.5 text-[11.5px] text-sky-900/90 leading-snug">
            Enter the active Admin Secret Key for <strong>{email}</strong> to finish portal sign-in. Keys can be recreated in Admin Security.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-secret-key-input"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Admin Secret Key
        </label>
        <div className="relative">
          <input
            id="admin-secret-key-input"
            data-testid="admin-secret-key-input"
            type={showKey ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={secretKey}
            onChange={(e) => onSecretKeyChange(e.target.value)}
            placeholder="Enter Admin Secret Key"
            className="w-full h-12 rounded-xl bg-[#F4F5F7] border border-slate-200 pl-4 pr-11 text-base sm:text-sm font-mono font-bold tracking-wider text-slate-900 focus:bg-white focus:border-[#22577A] focus:outline-none focus:ring-2 focus:ring-[#22577A]/15"
          />
          <button
            type="button"
            onClick={() => setShowKey((prev) => !prev)}
            aria-label={showKey ? "Hide secret key" : "Show secret key"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            {showKey ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          data-testid="admin-secret-key-back-btn"
          className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          data-testid="admin-secret-key-submit"
          style={{ backgroundColor: accentHex }}
          className="flex-1 min-h-[44px] px-4 rounded-xl text-white font-semibold text-sm shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <LoadingOutlined />}
          <span>Verify Secret Key &amp; Enter Portal</span>
        </button>
      </div>
    </form>
  );
}
