import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, message } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LoadingOutlined,
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
  getAuthActionFromSearch,
  getAuthModeFromSearch,
  getDemoAccountCredentials,
  isAdminEmail,
  parsePostAuthRedirect,
  validateLoginInput,
  validateSignupInput,
  type SignupFields,
} from "../utils/authHelpers";

export default function ProfileLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginCustomer, loginAdmin, user } = useAuth();

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

  // Login state
  const [email, setEmail] = useState("duminda@zenithcapital.lk");
  const [password, setPassword] = useState("customer123");

  // Signup state
  const [signupFields, setSignupFields] = useState<SignupFields>({
    name: "",
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

  const performLogin = async (identifier: string, secret: string) => {
    setErrorMessage(null);
    const check = validateLoginInput(identifier, secret);
    if (!check.valid) {
      setErrorMessage(check.error || "Please enter valid credentials.");
      return;
    }

    setLoading(true);
    try {
      if (isAdminEmail(identifier)) {
        const response = await axios.post(
          `/auth/login?email=${encodeURIComponent(identifier.trim())}&password=${encodeURIComponent(secret)}`
        );

        if (response.data?.tokens) {
          loginAdmin(
            response.data.admin || {
              Admin_Name: "Super Admin",
              Admin_Email: identifier.trim(),
            },
            response.data.tokens.accessToken
          );
          message.success("Authenticated");
          navigate(parsePostAuthRedirect(location.search, "admin"));
        } else {
          setErrorMessage("Invalid admin credentials.");
        }
      } else {
        const response = await axios.post("/customer/login", {
          email: identifier.trim(),
          password: secret,
        });

        if (response.data?.customer) {
          loginCustomer(response.data.customer, response.data.tokens?.accessToken || "mock-token");
          message.success("Logged in");
          navigate(parsePostAuthRedirect(location.search, "customer"));
        } else {
          setErrorMessage("Account not found.");
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickDemo = async (kind: "client" | "admin") => {
    const creds = getDemoAccountCredentials(kind);
    setEmail(creds.email);
    setPassword(creds.password);
    await performLogin(creds.email, creds.password);
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
            Cus_CompanyName: dbUser?.company || "Google Workspace Client",
            Cus_Logo: dbUser?.avatarUrl || cred.user.photoURL || "",
            Verify_State: true,
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
    setSignupErrors({});
    setLoading(true);

    try {
      const payload = {
        Cus_Name: signupFields.name.trim(),
        Cus_Email: signupFields.email.trim(),
        Cus_PhoneNumber: signupFields.phone.trim(),
        Cus_CompanyName: signupFields.company.trim(),
        Cus_Password: signupFields.password,
        Cus_Logo: brandIcon,
      };

      const response = await axios.post("/customer/Customer_register", payload);
      if (response.data?.data) {
        loginCustomer(response.data.data, "mock-cus-token-" + Date.now());
        message.success("Account created");
        navigate(parsePostAuthRedirect(location.search, "customer"));
      } else {
        message.success("Account created");
        setMode("login");
      }
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMessage(String(err.response.data.message));
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
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
      message.success(res.data?.message || "Password reset instructions sent.");
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
    setMode(nextMode);
  };

  return (
    <div className="flex-1 w-full bg-[#F2F4F7] flex items-center justify-center px-4 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <PageMetadata
        title={mode === "login" ? "Client & Admin Login" : "Create Client Account"}
        description="Sign in to manage Innovista Fabriconix architectural fabrication orders, milestones, and specifications."
        canonicalPath="/profile-login"
        noIndex
      />
      {/* Main Split Card */}
      <div
        className="w-full max-w-[960px] bg-white rounded-[32px] p-3.5 sm:p-5 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.10)] border border-slate-100/90 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch"
      >
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
              Simplify your fabrication management with our user-friendly client &amp; admin dashboard.
            </p>
          </div>

          {/* 3D Character Duo Anchored to Bottom */}
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
          <div className="w-full max-w-[360px] mx-auto">
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
            <div className="text-center mt-4 mb-5">
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-neutral-900 leading-tight">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-[13px] text-neutral-400 mt-1">
                {mode === "login"
                  ? "Please login to your account"
                  : "Sign up for your client workspace"}
              </p>
            </div>

            {/* Contextual Auth Gate Banner when redirected from Add to Cart or Request Quote */}
            {redirectAction && (
              <div
                data-testid="auth-gate-notice"
                className="mb-4 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs font-medium text-[#22577A]"
              >
                {redirectAction === "cart"
                  ? "Sign up for a customer account (or login) to save systems and place fabrication orders."
                  : "Sign up for a customer account (or login) to submit a Request for Quotation."}
              </div>
            )}

            {/* Active Session Quick Return */}
            {user && (
              <div className="mb-4 rounded-xl bg-orange-50/80 border border-orange-100 px-3.5 py-2.5 flex items-center justify-between gap-2">
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

            {/* Inline Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-3.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {mode === "login" ? (
              <>
                <form onSubmit={handleLoginSubmit} noValidate className="space-y-3.5">
                  <div>
                    <label htmlFor="login-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="login-email"
                      name="email"
                      type="text"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-12 rounded-xl bg-[#F4F5F7] px-4 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="sr-only">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full h-12 rounded-xl bg-[#F4F5F7] pl-4 pr-11 text-[13.5px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email.includes("@") ? email : "");
                        setResetOpen(true);
                      }}
                      className="text-[12px] font-medium text-neutral-400 hover:text-[#E55309] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#FF6B1E]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    {loading && <LoadingOutlined />}
                    <span>Login</span>
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-4.5 flex items-center justify-center">
                  <div className="w-full border-t border-neutral-200" />
                  <span className="bg-white px-3 text-[12px] text-neutral-400 whitespace-nowrap shrink-0">
                    Or Login with
                  </span>
                  <div className="w-full border-t border-neutral-200" />
                </div>

                {/* Secondary Quick Auth Actions */}
                <div className="space-y-2.5">
                  <GoogleSignInButton
                    onClick={handleGoogleSignIn}
                    loading={loading}
                    className="w-full h-11"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo("client")}
                      className="h-11 rounded-xl border border-neutral-200 bg-white hover:border-[#FF6B1E]/45 hover:bg-orange-50/40 flex items-center justify-center gap-2 text-[13px] font-medium text-neutral-800 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <UserOutlined className="text-[#FF6B1E]" />
                      <span>Client Demo</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo("admin")}
                      className="h-11 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 flex items-center justify-center gap-2 text-[13px] font-medium text-neutral-800 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <SafetyCertificateOutlined className="text-[#22577a]" />
                      <span>Admin Demo</span>
                    </button>
                  </div>
                </div>

                {/* Footer Toggle */}
                <p className="mt-5 text-center text-[12.5px] text-neutral-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-[#E55309] hover:text-[#c74404] hover:underline cursor-pointer"
                  >
                    Signup
                  </button>
                </p>
              </>
            ) : (
              <>
                <form onSubmit={handleSignupSubmit} noValidate className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="signup-name" className="sr-only">
                        Full Name
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        value={signupFields.name}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Full name"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                      />
                      {signupErrors.name && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signup-company" className="sr-only">
                        Company Name
                      </label>
                      <input
                        id="signup-company"
                        type="text"
                        value={signupFields.company}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, company: e.target.value }))
                        }
                        placeholder="Company"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                      />
                      {signupErrors.company && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.company}</p>
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
                        type="email"
                        value={signupFields.email}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Email address"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
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
                        type="tel"
                        value={signupFields.phone}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="Phone number"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                      />
                      {signupErrors.phone && (
                        <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="sr-only">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={signupFields.password}
                        onChange={(e) =>
                          setSignupFields((prev) => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="Password (min 6 characters)"
                        className="w-full h-11 rounded-xl bg-[#F4F5F7] pl-3.5 pr-11 text-[13px] text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-[11px] text-red-600 mt-0.5 pl-1">{signupErrors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FF6B1E] hover:bg-[#F25D10] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#FF6B1E]/25 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 mt-1"
                  >
                    {loading && <LoadingOutlined />}
                    <span>Create Account</span>
                  </button>
                </form>

                <p className="mt-5 text-center text-[12.5px] text-neutral-400">
                  Already have an account?{" "}
                  <button
                    type="button"
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

      {/* Password Reset Modal */}
      <Modal
        open={resetOpen}
        onCancel={() => setResetOpen(false)}
        footer={null}
        centered
        title={<span className="text-base font-bold text-neutral-900">Reset Password</span>}
      >
        <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
          <p className="text-xs text-neutral-500">
            Enter your registered email address and we will send password reset instructions.
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
              className="w-full h-11 rounded-xl bg-[#F4F5F7] px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 border border-transparent focus:border-[#FF6B1E]/45 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B1E]/15 transition-all"
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
              <span>Send Link</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
