import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as AntdApp, Modal } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";
import PageMetadata from "../components/PageMetadata";
import loginCharacters from "../assets/images/login_dashboard_characters_1794509717439.jpg";
import brandIcon from "../assets/Images/logo/titleImage.png";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import GoogleSignInButton from "../components/GoogleSignInButton";
import {
  AccountStatusBanner,
  AdminSecretKeyStepPanel,
  CaptchaWidget,
  CustomerTotpStepPanel,
  LoginSecurityStepper,
  useCaptchaChallenge,
  type AccountClassification,
  type LoginFlowStep,
} from "../components/SecurityAuthWidgets";
import {
  getAuthActionFromSearch,
  getAuthModeFromSearch,
  parsePostAuthRedirect,
  validateLoginInput,
  validateSignupInput,
  type SignupFields,
} from "../utils/authHelpers";

export default function ProfileLogin() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, loginAdmin, updateUser, user } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">(() =>
    getAuthModeFromSearch(location.search)
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(getAuthModeFromSearch(location.search));
  }, [location.search]);

  const redirectAction = getAuthActionFromSearch(location.search);

  // Login state (zero hardcoded demo credentials)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [classification, setClassification] = useState<AccountClassification | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const lastCheckedIdRef = useRef("");

  // Server SVG CAPTCHA & anti-bot honeypot
  const captcha = useCaptchaChallenge();

  // Multi-step login state: Step 1 Credentials -> Step 2 Robot Check -> Step 3 Customer TOTP or Admin Secret Key
  const [loginStep, setLoginStep] = useState<LoginFlowStep>("credentials");
  const [stepToken, setStepToken] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [mfaUserEmail, setMfaUserEmail] = useState("");
  const [customerTotpMeta, setCustomerTotpMeta] = useState<{
    totpEnrolled: boolean;
    qrDataUrl?: string | null;
    manualSecret?: string | null;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [adminSecretKey, setAdminSecretKey] = useState("");

  // Post-signup immediate browse + optional email verification modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [issuedCodePreview, setIssuedCodePreview] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [signedUpRedirect, setSignedUpRedirect] = useState<string>("/profile");

  // Signup state
  const [signupFields, setSignupFields] = useState<SignupFields>({
    name: "",
    username: "",
    company: "",
    email: "",
    phone: "",
    password: "",
  });
  const [signupErrors, setSignupErrors] = useState<Partial<Record<keyof SignupFields, string>>>({});

  // Forgot password modal state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);

  const checkAccountStatus = useCallback(async (rawId: string) => {
    const clean = rawId.trim();
    if (!clean || clean.length < 2) {
      setClassification(null);
      lastCheckedIdRef.current = "";
      return null;
    }
    if (lastCheckedIdRef.current === clean) {
      return classification;
    }
    setCheckingStatus(true);
    try {
      const res = await axios.post<{ classification: AccountClassification }>(
        "/api/auth/check-status",
        { identifier: clean }
      );
      lastCheckedIdRef.current = clean;
      setClassification(res.data.classification);
      return res.data.classification;
    } catch {
      return null;
    } finally {
      setCheckingStatus(false);
    }
  }, [classification]);

  // Debounced live status recognition when user enters email, username, or user ID
  useEffect(() => {
    if (mode !== "login") return;
    const clean = identifier.trim();
    if (!clean || clean.length < 2) {
      setClassification(null);
      lastCheckedIdRef.current = "";
      return;
    }
    const timer = window.setTimeout(() => {
      void checkAccountStatus(clean);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [identifier, mode, checkAccountStatus]);

  const resetLoginFlow = useCallback(() => {
    setLoginStep("credentials");
    setStepToken("");
    setMfaToken("");
    setMfaUserEmail("");
    setCustomerTotpMeta(null);
    setMfaCode("");
    setAdminSecretKey("");
    setErrorMessage(null);
  }, []);

  // Step 1: Validate ID/Email/Username + Password -> transition to Step 2 Robot Verification
  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const check = validateLoginInput(identifier, password);
    if (!check.valid) {
      setErrorMessage(check.error || "Please enter your ID and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      if (response.data?.classification) {
        setClassification(response.data.classification);
      }

      if (response.data?.nextStep === "ROBOT_VERIFICATION" && response.data?.stepToken) {
        setStepToken(response.data.stepToken);
        setMfaUserEmail(response.data?.user?.email || identifier.trim());
        setLoginStep("robot");
        void captcha.refreshCaptcha();
        message.info("Credentials verified. Complete robot verification to continue.");
        return;
      }

      setErrorMessage("Unexpected verification response. Please try again.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.classification) {
          setClassification(err.response.data.classification as AccountClassification);
        }
        setErrorMessage(
          String(err.response?.data?.message || "Login failed. Please verify your details.")
        );
      } else {
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Robot CAPTCHA -> transition to Customer Google Authenticator OR Admin Secret Key
  const handleRobotVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const captchaReadyErr = captcha.validateReady();
    if (captchaReadyErr) {
      setErrorMessage(captchaReadyErr);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login/verify-captcha", {
        stepToken,
        ...captcha.getSubmissionPayload(),
      });

      if (response.data?.classification) {
        setClassification(response.data.classification);
      }
      if (response.data?.user?.email) {
        setMfaUserEmail(response.data.user.email);
      }

      if (response.data?.nextStep === "ADMIN_SECRET_KEY" && response.data?.mfaToken) {
        setMfaToken(response.data.mfaToken);
        setAdminSecretKey("");
        setLoginStep("admin_secret");
        message.info("Robot verification passed. Enter the Admin Secret Key.");
        return;
      }

      if (response.data?.nextStep === "CUSTOMER_TOTP" && response.data?.mfaToken) {
        setMfaToken(response.data.mfaToken);
        setCustomerTotpMeta({
          totpEnrolled: Boolean(response.data.totpEnrolled),
          qrDataUrl: response.data.qrDataUrl || null,
          manualSecret: response.data.manualSecret || null,
        });
        setMfaCode("");
        setLoginStep("customer_totp");
        message.info(
          response.data.totpEnrolled
            ? "Robot verification passed. Enter your 6-digit Google Authenticator code."
            : "Scan the QR code in Google Authenticator and enter the 6-digit code."
        );
        return;
      }

      setErrorMessage("Unexpected verification step response. Please start again.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Robot verification failed. Please check the code and try again.");
      }
      void captcha.refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Step 3A: Verify Customer 6-digit Google Authenticator code
  const handleCustomerTotpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setErrorMessage("Enter the 6-digit code from Google Authenticator.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/verify-totp", {
        mfaToken,
        code: mfaCode.trim(),
      });
      if (res.data?.tokens?.accessToken && res.data?.customer) {
        loginCustomer(res.data.customer, res.data.tokens.accessToken, res.data.tokens.refreshToken);
        message.success(res.data?.message || "Google Authenticator verified!");
        navigate(parsePostAuthRedirect(location.search, "customer"));
      } else if (res.data?.tokens?.accessToken && res.data?.admin) {
        loginAdmin(res.data.admin, res.data.tokens.accessToken, res.data.tokens.refreshToken);
        message.success("Authenticated!");
        navigate(parsePostAuthRedirect(location.search, "admin"));
      } else {
        setErrorMessage("Verification response incomplete.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Invalid 6-digit Google Authenticator code.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3B: Verify Admin Secret Key
  const handleAdminSecretSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!adminSecretKey.trim()) {
      setErrorMessage("Please enter the Admin Secret Key.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login/verify-admin-secret", {
        mfaToken,
        secretKey: adminSecretKey.trim(),
      });
      if (res.data?.tokens?.accessToken && res.data?.admin) {
        loginAdmin(res.data.admin, res.data.tokens.accessToken, res.data.tokens.refreshToken);
        message.success(res.data?.message || "Admin Secret Key verified!");
        navigate(parsePostAuthRedirect(location.search, "admin"));
      } else {
        setErrorMessage("Admin verification response incomplete.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Invalid Admin Secret Key.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await axios.post(
        "/api/auth/firebase-session",
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      const dbUser = res.data?.user;
      if (dbUser?.role === "admin" || dbUser?.role === "staff") {
        loginAdmin(
          {
            AdminId: dbUser.id,
            Admin_Name: dbUser.name,
            Admin_Email: dbUser.email,
            Admin_Phone: dbUser.phone,
            Admin_Profile: dbUser.avatarUrl,
            isVerified: Boolean(dbUser.isVerified),
            emailVerified: Boolean(dbUser.emailVerified),
            totpEnabled: Boolean(dbUser.totpEnabled),
          },
          idToken
        );
        message.success("Signed in with Google");
        navigate(parsePostAuthRedirect(location.search, "admin"));
      } else {
        loginCustomer(
          {
            CustomerId: dbUser?.id || cred.user.uid,
            Cus_Name: dbUser?.name || cred.user.displayName || "Client",
            Cus_Email: dbUser?.email || cred.user.email || "",
            Cus_PhoneNumber: dbUser?.phone || "",
            Cus_CompanyName: dbUser?.company || "",
            Cus_Logo: dbUser?.avatarUrl || cred.user.photoURL || "",
            Verify_State: Boolean(dbUser?.isVerified),
            Email_Verified: Boolean(dbUser?.emailVerified ?? cred.user.emailVerified),
          },
          idToken
        );
        message.success("Signed in with Google");
        navigate(parsePostAuthRedirect(location.search, "customer"));
      }
    } catch (err) {
      console.error("Google Sign-In failed:", err);
      setErrorMessage("Google Sign-In was cancelled or failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const result = validateSignupInput(signupFields);
    if (!result.valid) {
      setSignupErrors(result.errors);
      return;
    }
    const captchaReadyErr = captcha.validateReady();
    if (captchaReadyErr) {
      setErrorMessage(captchaReadyErr);
      return;
    }
    setSignupErrors({});
    setLoading(true);

    try {
      const payload = {
        Cus_Name: signupFields.name.trim(),
        Cus_Username: signupFields.username?.trim() || undefined,
        Cus_Email: signupFields.email.trim(),
        Cus_PhoneNumber: signupFields.phone.trim(),
        Cus_CompanyName: signupFields.company.trim(),
        Cus_Password: signupFields.password,
        Cus_Logo: brandIcon,
        ...captcha.getSubmissionPayload(),
      };

      const response = await axios.post("/customer/Customer_register", payload);
      const customerData = response.data?.customer || response.data?.data;
      const tokens = response.data?.tokens;

      if (customerData && tokens?.accessToken) {
        loginCustomer(customerData, tokens.accessToken, tokens.refreshToken);
        const targetDest = parsePostAuthRedirect(location.search, "customer");
        setSignedUpRedirect(targetDest);
        const previewCode = response.data?.verification?.verificationPreview?.code || null;
        setIssuedCodePreview(previewCode);
        setVerifyCode("");
        setVerifyModalOpen(true);
        message.success("Account created! You can browse the site right away.");
      } else {
        message.success("Account created");
        setMode("login");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
      void captcha.refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmailVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      message.warning("Enter the 6-digit email verification code.");
      return;
    }
    setVerifyingEmail(true);
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await axios.post(
        "/api/auth/verify-email",
        { email: user?.email || signupFields.email.trim(), code: verifyCode.trim() },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (res.data?.customer) {
        updateUser({
          emailVerified: true,
          classification: res.data.classification?.statusCode,
        });
      }
      message.success("Email verified successfully!");
      setVerifyModalOpen(false);
      navigate(signedUpRedirect);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message.error(String(err.response.data.message));
      } else {
        message.error("Invalid verification code.");
      }
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      message.warning("Please enter your registered email address.");
      return;
    }
    setResetSending(true);
    try {
      const res = await axios.post("/auth/ResetPassword", { email: resetEmail.trim() });
      message.success(res.data?.message || "Password reset instructions issued.");
      setResetOpen(false);
      setResetEmail("");
    } catch {
      message.error("Could not send password reset email.");
    } finally {
      setResetSending(false);
    }
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setErrorMessage(null);
    setSignupErrors({});
    setClassification(null);
    resetLoginFlow();
    setMode(nextMode);
    if (nextMode === "signup") {
      void captcha.refreshCaptcha();
    }
  };

  return (
    <div className="flex-1 w-full bg-[#F2F4F7] flex items-center justify-center px-4 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8 lg:px-8">
      <PageMetadata
        title={mode === "login" ? "Client & Admin Login" : "Create Client Account"}
        description="Sign in to manage Innovista Fabriconix architectural fabrication orders, milestones, and specifications."
        canonicalPath="/profile-login"
        noIndex
      />
      {/* Main Split Card */}
      <div className="w-full max-w-[980px] bg-white rounded-[32px] p-3.5 sm:p-5 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.10)] border border-slate-100/90 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        {/* Left Orange Brand Panel */}
        <section
          aria-label="Innovista Dashboard Highlight"
          className="lg:col-span-6 relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#FF7621] via-[#FF6816] to-[#FF6612] text-white px-6 py-5 sm:px-8 sm:pt-8 sm:pb-6 lg:px-9 lg:pt-8 lg:pb-0 flex flex-col justify-between"
        >
          <div className="relative z-10">
            <h2 className="text-[24px] sm:text-[32px] lg:text-[36px] font-bold leading-[1.15] tracking-tight text-white">
              Simplify
              <br />
              management with
              <br />
              <span className="relative inline-block pb-2.5">
                our dashboard.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 260 18"
                  fill="none"
                  className="absolute left-0 bottom-0 w-full h-3.5 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 13.5C72 3.5 184 2.5 257 11.5"
                    stroke="rgba(255, 255, 255, 0.92)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>
            <p className="mt-2.5 sm:mt-3.5 text-[13px] sm:text-[13.5px] leading-relaxed text-white/90 max-w-[330px] font-normal">
              Protected client &amp; administrator portal with real-time account status detection,
              robot verification, and administrator 2FA.
            </p>
          </div>

          <div className="hidden lg:flex relative z-10 mt-2 -mx-6 justify-center items-end overflow-hidden">
            <img
              src={loginCharacters}
              alt="Team members collaborating with a dashboard"
              referrerPolicy="no-referrer"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 22%, black 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 22%, black 100%), linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
              className="w-full max-w-[390px] max-h-[295px] object-cover object-top select-none pointer-events-none block"
            />
          </div>
        </section>

        {/* Right Pure White Form Column */}
        <section
          aria-label={mode === "login" ? "Account Login" : "Create Client Account"}
          className="lg:col-span-6 flex flex-col justify-center px-3 py-3 sm:px-7 sm:py-5"
        >
          <div className="w-full max-w-[380px] mx-auto">
            {/* Brand Lockup */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-[#FF6B1E] flex items-center justify-center shadow-sm shadow-[#FF6B1E]/25 shrink-0">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4.5 h-4.5 text-white"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </span>
              <span className="text-[19px] font-bold tracking-tight text-neutral-900">
                Innovista
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mt-3.5 mb-4">
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-neutral-900 leading-tight">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-[13px] text-neutral-500 mt-1">
                {mode === "login"
                  ? "Sign in with your email, username, or user ID"
                  : "Create your client workspace and browse immediately"}
              </p>
            </div>

            {redirectAction && (
              <div
                data-testid="auth-gate-notice"
                className="mb-3.5 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs font-medium text-[#22577A]"
              >
                {redirectAction === "cart"
                  ? "Sign up for a customer account (or login) to save systems and place fabrication orders."
                  : "Sign up for a customer account (or login) to submit a Request for Quotation."}
              </div>
            )}

            {user && (
              <div className="mb-3.5 rounded-xl bg-orange-50/80 border border-orange-100 px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-700 truncate">
                  Signed in as <strong className="text-neutral-900">{user.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate(parsePostAuthRedirect(location.search, user.role))}
                  className="text-xs font-semibold text-[#E55309] hover:text-[#c74404] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Portal →
                </button>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                data-testid="login-error-alert"
                className="mb-3.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {mode === "login" ? (
              <>
                <LoginSecurityStepper step={loginStep} role={classification?.role} />

                {loginStep === "credentials" && (
                  <>
                    <form onSubmit={handleLoginSubmit} noValidate className="space-y-3">
                      <div>
                        <label htmlFor="login-identifier" className="sr-only">
                          Email address, username, or user ID
                        </label>
                        <div className="relative">
                          <input
                            id="login-identifier"
                            data-testid="login-identifier-input"
                            name="identifier"
                            type="text"
                            autoComplete="username"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            onBlur={() => {
                              if (identifier.trim().length >= 2) {
                                void checkAccountStatus(identifier);
                              }
                            }}
                            placeholder="Email address, username, or user ID"
                            className="w-full h-11 rounded-xl bg-[#F4F5F7] pl-4 pr-20 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                          />
                          <button
                            type="button"
                            data-testid="check-account-status-btn"
                            onClick={() => void checkAccountStatus(identifier)}
                            disabled={!identifier.trim() || checkingStatus}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[34px] px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#22577A] hover:border-[#22577A] cursor-pointer disabled:opacity-40"
                          >
                            {checkingStatus ? "..." : "Status"}
                          </button>
                        </div>
                      </div>

                      {/* Real-time Account Classification & Verification Recognition Banner */}
                      {(checkingStatus || classification) && (
                        <AccountStatusBanner
                          classification={classification}
                          checking={checkingStatus}
                        />
                      )}

                      <div>
                        <label htmlFor="login-password" className="sr-only">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="login-password"
                            data-testid="login-password-input"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full h-11 rounded-xl bg-[#F4F5F7] pl-4 pr-11 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                          >
                            {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end -mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(identifier.includes("@") ? identifier : "");
                            setResetOpen(true);
                          }}
                          className="text-[12px] font-medium text-neutral-500 hover:text-[#E55309] transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        data-testid="login-submit-btn"
                        className="w-full h-11 rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#FF6B1E]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                      >
                        {loading && <LoadingOutlined />}
                        <span>Login</span>
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4 flex items-center justify-center">
                      <div className="w-full border-t border-neutral-200" />
                      <span className="bg-white px-3 text-[12px] text-neutral-400 whitespace-nowrap shrink-0">
                        Or Continue with
                      </span>
                      <div className="w-full border-t border-neutral-200" />
                    </div>

                    <GoogleSignInButton
                      onClick={handleGoogleSignIn}
                      loading={loading}
                      className="w-full h-11"
                    />
                  </>
                )}

                {loginStep === "robot" && (
                  <form
                    onSubmit={handleRobotVerifySubmit}
                    data-testid="login-robot-step-form"
                    className="space-y-3.5"
                  >
                    {classification && (
                      <AccountStatusBanner classification={classification} />
                    )}

                    <CaptchaWidget captcha={captcha} testIdPrefix="login-captcha" />

                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={resetLoginFlow}
                        disabled={loading}
                        data-testid="login-robot-back-btn"
                        className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        data-testid="login-robot-submit-btn"
                        className="flex-1 min-h-[44px] rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] text-white font-semibold text-sm shadow-md shadow-[#FF6B1E]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loading && <LoadingOutlined />}
                        <span>Verify &amp; Continue</span>
                      </button>
                    </div>
                  </form>
                )}

                {loginStep === "customer_totp" && (
                  <CustomerTotpStepPanel
                    email={mfaUserEmail || identifier}
                    totpEnrolled={Boolean(customerTotpMeta?.totpEnrolled)}
                    qrDataUrl={customerTotpMeta?.qrDataUrl}
                    manualSecret={customerTotpMeta?.manualSecret}
                    code={mfaCode}
                    onCodeChange={setMfaCode}
                    loading={loading}
                    onBack={resetLoginFlow}
                    onSubmit={handleCustomerTotpSubmit}
                    accentHex="#FF6B1E"
                  />
                )}

                {loginStep === "admin_secret" && (
                  <AdminSecretKeyStepPanel
                    email={mfaUserEmail || identifier}
                    secretKey={adminSecretKey}
                    onSecretKeyChange={setAdminSecretKey}
                    loading={loading}
                    onBack={resetLoginFlow}
                    onSubmit={handleAdminSecretSubmit}
                    accentHex="#22577A"
                  />
                )}

                <p className="mt-4 text-center text-[12.5px] text-neutral-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    data-testid="switch-to-signup-btn"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-[#E55309] hover:text-[#c74404] hover:underline cursor-pointer"
                  >
                    Signup
                  </button>
                </p>
              </>
            ) : (
              <>
                <form onSubmit={handleSignupSubmit} noValidate className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="signup-name" className="sr-only">
                        Full Name
                      </label>
                      <input
                        id="signup-name"
                        data-testid="signup-name-input"
                        type="text"
                        value={signupFields.name}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Full name *"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                      />
                      {signupErrors.name && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signup-username" className="sr-only">
                        Username
                      </label>
                      <input
                        id="signup-username"
                        data-testid="signup-username-input"
                        type="text"
                        value={signupFields.username || ""}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="Username (optional)"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                      />
                      {signupErrors.username && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="signup-email" className="sr-only">
                        Email address
                      </label>
                      <input
                        id="signup-email"
                        data-testid="signup-email-input"
                        type="email"
                        value={signupFields.email}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Email address *"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                      />
                      {signupErrors.email && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signup-phone" className="sr-only">
                        Phone Number
                      </label>
                      <input
                        id="signup-phone"
                        data-testid="signup-phone-input"
                        type="tel"
                        value={signupFields.phone}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="Phone number *"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                      />
                      {signupErrors.phone && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-company" className="sr-only">
                      Company Name
                    </label>
                    <input
                      id="signup-company"
                      data-testid="signup-company-input"
                      type="text"
                      value={signupFields.company}
                      onChange={(e) =>
                        setSignupFields((prev) => ({ ...prev, company: e.target.value }))
                      }
                      placeholder="Company / Organization *"
                      className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                    />
                    {signupErrors.company && (
                      <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.company}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="sr-only">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        data-testid="signup-password-input"
                        type={showPassword ? "text" : "password"}
                        value={signupFields.password}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="Password (min 8 chars, letters + numbers) *"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] pl-3.5 pr-11 text-base sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.password}</p>
                    )}
                  </div>

                  <CaptchaWidget captcha={captcha} testIdPrefix="signup-captcha" />

                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="signup-submit-btn"
                    className="w-full h-11 rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#FF6B1E]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 mt-1"
                  >
                    {loading && <LoadingOutlined />}
                    <span>Create Account</span>
                  </button>
                </form>

                <p className="mt-4 text-center text-[12.5px] text-neutral-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    data-testid="switch-to-login-btn"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-[#E55309] hover:text-[#c74404] hover:underline cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Post-Signup Immediate Browse + Email Verification Modal */}
      <Modal
        open={verifyModalOpen}
        onCancel={() => {
          setVerifyModalOpen(false);
          navigate(signedUpRedirect);
        }}
        footer={null}
        centered
        width="min(480px, calc(100vw - 24px))"
        title={
          <span className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <CheckCircleOutlined className="text-emerald-600" />
            <span>Account Active — Verify Your Email</span>
          </span>
        }
      >
        <form onSubmit={handleConfirmEmailVerification} className="space-y-4 pt-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-900">
            Your client account is active and you can browse the site right away. Confirm your email address below (an administrator may also verify your account in Customer Manager).
          </div>

          {issuedCodePreview && (
            <div
              data-testid="signup-email-code-preview"
              className="rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs text-sky-900"
            >
              Email verification code:{" "}
              <strong className="font-mono tracking-widest text-sm">{issuedCodePreview}</strong>
            </div>
          )}

          <div>
            <label htmlFor="signup-verify-code" className="block text-xs font-bold text-slate-700 mb-1">
              6-Digit Email Verification Code
            </label>
            <input
              id="signup-verify-code"
              data-testid="signup-verify-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit code"
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 font-mono text-base font-bold tracking-widest text-slate-900 focus:outline-none focus:border-[#22577A]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1">
            <button
              type="button"
              data-testid="browse-site-now-btn"
              onClick={() => {
                setVerifyModalOpen(false);
                navigate(signedUpRedirect);
              }}
              className="min-h-[44px] sm:min-h-[40px] px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Verify Later &amp; Browse Site
            </button>
            <button
              type="submit"
              disabled={verifyingEmail}
              data-testid="confirm-signup-email-btn"
              className="min-h-[44px] sm:min-h-[40px] px-5 rounded-xl bg-[#22577A] hover:bg-[#19435E] text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
            >
              {verifyingEmail ? "Verifying..." : "Verify Email Now"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        footer={null}
        centered
        width="min(460px, calc(100vw - 24px))"
        title={<span className="text-base font-bold text-neutral-900">Reset Password</span>}
      >
        <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
          <p className="text-xs text-neutral-500">
            Enter your registered email address and we will issue password recovery instructions.
          </p>
          <div>
            <label htmlFor="reset-email" className="sr-only">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="h-10 px-4 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetSending}
              className="h-10 px-5 rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] text-xs font-semibold text-white cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {resetSending && <LoadingOutlined />}
              <span>Send Instructions</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
