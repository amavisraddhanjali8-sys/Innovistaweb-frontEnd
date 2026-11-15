import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
} from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import axios from "axios";
import AdminLogo from "../../assets/Images/logo/AdminLogin.jpg";
import { useAuth } from "../../Context/AuthContext";
import {
  AccountStatusBanner,
  AdminSecretKeyStepPanel,
  CaptchaWidget,
  LoginSecurityStepper,
  useCaptchaChallenge,
  type AccountClassification,
  type LoginFlowStep,
} from "../../components/SecurityAuthWidgets";

interface LoginValues {
  identifier: string;
  password: string;
}

interface BootstrapValues {
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
}

function AdminLogin() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const captcha = useCaptchaChallenge();

  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifierInput, setIdentifierInput] = useState("");
  const [classification, setClassification] = useState<AccountClassification | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // 3-step Admin Login flow state
  const [loginStep, setLoginStep] = useState<LoginFlowStep>("credentials");
  const [stepToken, setStepToken] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [adminSecretKey, setAdminSecretKey] = useState("");

  // Password reset modal
  const [resetEmail, setResetEmail] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    axios
      .get<{ needsBootstrap: boolean }>("/api/auth/bootstrap-status")
      .then((res) => setNeedsBootstrap(Boolean(res.data?.needsBootstrap)))
      .catch(() => setNeedsBootstrap(false));
  }, []);

  const checkStatus = useCallback(async (raw: string) => {
    const clean = raw.trim();
    if (!clean || clean.length < 2) {
      setClassification(null);
      return;
    }
    setCheckingStatus(true);
    try {
      const res = await axios.post<{ classification: AccountClassification }>(
        "/api/auth/check-status",
        { identifier: clean }
      );
      setClassification(res.data.classification);
    } catch {
      // ignore transient error
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    const clean = identifierInput.trim();
    if (!clean || clean.length < 2 || needsBootstrap) {
      setClassification(null);
      return;
    }
    const t = window.setTimeout(() => void checkStatus(clean), 450);
    return () => window.clearTimeout(t);
  }, [identifierInput, needsBootstrap, checkStatus]);

  const resetAdminLoginFlow = useCallback(() => {
    setLoginStep("credentials");
    setStepToken("");
    setMfaToken("");
    setVerifiedEmail("");
    setAdminSecretKey("");
    setErrorText(null);
  }, []);

  // Step 1: Verify ID + Password -> transition to Step 2 Robot Verification
  const onFinishLogin = async (values: LoginValues) => {
    setErrorText(null);
    setLoading(true);
    try {
      const response = await axios.post("/auth/login", {
        identifier: values.identifier.trim(),
        password: values.password,
      });

      if (response.data?.classification) {
        setClassification(response.data.classification);
      }

      if (response.data?.nextStep === "ROBOT_VERIFICATION" && response.data?.stepToken) {
        setStepToken(response.data.stepToken);
        setVerifiedEmail(response.data?.user?.email || values.identifier.trim());
        setLoginStep("robot");
        void captcha.refreshCaptcha();
        message.info("Credentials verified. Complete robot verification to continue.");
        return;
      }

      setErrorText("Unexpected server response.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.classification) {
          setClassification(err.response.data.classification as AccountClassification);
        }
        setErrorText(String(err.response?.data?.message || "Invalid credentials."));
      } else {
        setErrorText("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Robot CAPTCHA -> transition to Step 3 Admin Secret Key
  const handleAdminRobotVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorText(null);
    const captchaErr = captcha.validateReady();
    if (captchaErr) {
      setErrorText(captchaErr);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("/auth/login/verify-captcha", {
        stepToken,
        ...captcha.getSubmissionPayload(),
      });
      if (response.data?.classification) {
        setClassification(response.data.classification);
      }
      if (response.data?.user?.email) {
        setVerifiedEmail(response.data.user.email);
      }
      if (response.data?.nextStep === "ADMIN_SECRET_KEY" && response.data?.mfaToken) {
        setMfaToken(response.data.mfaToken);
        setAdminSecretKey("");
        setLoginStep("admin_secret");
        message.info("Robot verification passed. Enter the Admin Secret Key.");
        return;
      }
      setErrorText("Unexpected verification step response.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorText(String(err.response.data.message));
      } else {
        setErrorText("Robot verification failed. Please check the code and try again.");
      }
      void captcha.refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify Admin Secret Key -> enter Admin Portal
  const handleAdminSecretKeyVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mfaToken) return;
    setErrorText(null);
    if (!adminSecretKey.trim()) {
      setErrorText("Please enter your Admin Secret Key.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/auth/login/verify-admin-secret", {
        mfaToken,
        secretKey: adminSecretKey.trim(),
      });
      if (res.data?.tokens?.accessToken && res.data?.admin) {
        loginAdmin(res.data.admin, res.data.tokens.accessToken, res.data.tokens.refreshToken);
        message.success(res.data?.message || "Admin Secret Key verified!");
        navigate("/admin-home");
      } else {
        setErrorText("Verification response incomplete.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorText(String(err.response.data.message));
      } else {
        setErrorText("Invalid Admin Secret Key.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinishBootstrap = async (values: BootstrapValues) => {
    setErrorText(null);
    const captchaErr = captcha.validateReady();
    if (captchaErr) {
      setErrorText(captchaErr);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/bootstrap-admin", {
        name: values.name.trim(),
        username: values.username?.trim() || undefined,
        email: values.email.trim(),
        phone: values.phone?.trim() || "",
        password: values.password,
        ...captcha.getSubmissionPayload(),
      });

      if (res.data?.tokens?.accessToken && res.data?.admin) {
        loginAdmin(
          res.data.admin,
          res.data.tokens.accessToken,
          res.data.tokens.refreshToken
        );
        message.success(res.data.message || "Verified Admin account created.");
        navigate("/AdminSecurity");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorText(String(err.response.data.message));
      } else {
        setErrorText("Could not initialize admin account.");
      }
      void captcha.refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post("/auth/ResetPassword", { email: resetEmail.trim() });
      message.success(response.data?.message || "Password reset instructions sent.");
      setIsResetModalOpen(false);
      setResetEmail("");
    } catch {
      message.error("Could not process password reset.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 px-4 py-6 pb-24 md:py-8 md:pb-8">
      <Card className="w-full max-w-[940px] rounded-2xl shadow-lg border-slate-200/80">
        <div className="text-center mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {needsBootstrap ? "Initialize Administrator Account" : "Administrator Portal Login"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {needsBootstrap
              ? "No administrator accounts exist yet. Create your primary Verified Admin account."
              : "3-Stage Protection: ID & Password → Robot Verification → Admin Secret Key."}
          </p>
        </div>

        <Row gutter={[32, 20]} align="middle" justify="center">
          <Col xs={24} md={10} className="text-center">
            <img
              src={AdminLogo}
              alt="Innovista Administrator Security"
              className="w-full max-w-[260px] max-h-[165px] md:max-h-none md:max-w-[300px] mx-auto rounded-2xl shadow-md object-cover"
            />
          </Col>

          <Col xs={24} md={14}>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              {errorText && (
                <div
                  role="alert"
                  data-testid="admin-login-error"
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700"
                >
                  {errorText}
                </div>
              )}

              {needsBootstrap ? (
                <Form layout="vertical" onFinish={onFinishBootstrap} autoComplete="off">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Form.Item
                      name="name"
                      label="Admin Full Name"
                      rules={[{ required: true, message: "Enter full name" }]}
                    >
                      <Input placeholder="Full name" data-testid="bootstrap-name" />
                    </Form.Item>
                    <Form.Item name="username" label="Username (optional)">
                      <Input placeholder="e.g. director.ops" data-testid="bootstrap-username" />
                    </Form.Item>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Form.Item
                      name="email"
                      label="Admin Email"
                      rules={[{ required: true, type: "email", message: "Enter valid email" }]}
                    >
                      <Input placeholder="admin@company.com" data-testid="bootstrap-email" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone">
                      <Input placeholder="+94 77 000 0000" data-testid="bootstrap-phone" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    name="password"
                    label="Strong Password"
                    rules={[
                      { required: true, message: "Enter a strong password" },
                      { min: 8, message: "At least 8 characters with letters & numbers" },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Min 8 chars (letters + numbers)"
                      data-testid="bootstrap-password"
                    />
                  </Form.Item>

                  <div className="mb-4">
                    <CaptchaWidget captcha={captcha} testIdPrefix="bootstrap-captcha" />
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    block
                    data-testid="bootstrap-submit"
                    style={{ background: "#22577A", borderColor: "#22577A" }}
                  >
                    Create First Verified Admin
                  </Button>
                </Form>
              ) : (
                <>
                  <LoginSecurityStepper step={loginStep} role="admin" />

                  {loginStep === "credentials" && (
                    <Form layout="vertical" onFinish={onFinishLogin} autoComplete="off">
                      <Form.Item
                        name="identifier"
                        label="Admin Email, Username, or User ID"
                        rules={[{ required: true, message: "Enter email, username, or user ID" }]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Email address, username, or user ID"
                          size="large"
                          data-testid="admin-identifier-input"
                          onChange={(e) => setIdentifierInput(e.target.value)}
                          onBlur={(e) => void checkStatus(e.target.value)}
                        />
                      </Form.Item>

                      {(checkingStatus || classification) && (
                        <div className="mb-3">
                          <AccountStatusBanner
                            classification={classification}
                            checking={checkingStatus}
                          />
                        </div>
                      )}

                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: "Please enter password" }]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Enter password"
                          size="large"
                          data-testid="admin-password-input"
                        />
                      </Form.Item>

                      <Button
                        block
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        data-testid="admin-login-submit"
                        style={{
                          background: "#22577A",
                          borderColor: "#22577A",
                          borderRadius: "10px",
                          fontWeight: 600,
                        }}
                      >
                        Sign In to Admin Portal
                      </Button>

                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={() => setIsResetModalOpen(true)}
                          className="text-xs font-medium text-[#22577A] hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </Form>
                  )}

                  {loginStep === "robot" && (
                    <form
                      onSubmit={handleAdminRobotVerify}
                      data-testid="admin-robot-step-form"
                      className="space-y-3.5"
                    >
                      {classification && (
                        <AccountStatusBanner classification={classification} />
                      )}

                      <CaptchaWidget captcha={captcha} testIdPrefix="admin-captcha" />

                      <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                          onClick={resetAdminLoginFlow}
                          disabled={loading}
                          data-testid="admin-robot-back-btn"
                          className="min-h-[42px]"
                        >
                          Back
                        </Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          data-testid="admin-robot-submit"
                          className="min-h-[42px]"
                          style={{ background: "#22577A", borderColor: "#22577A", fontWeight: 600 }}
                        >
                          Verify &amp; Continue
                        </Button>
                      </div>
                    </form>
                  )}

                  {loginStep === "admin_secret" && (
                    <AdminSecretKeyStepPanel
                      email={verifiedEmail || identifierInput}
                      secretKey={adminSecretKey}
                      onSecretKeyChange={setAdminSecretKey}
                      loading={loading}
                      onBack={resetAdminLoginFlow}
                      onSubmit={handleAdminSecretKeyVerify}
                      accentHex="#22577A"
                    />
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title="Reset Admin Password"
        open={isResetModalOpen}
        onCancel={() => setIsResetModalOpen(false)}
        footer={null}
        centered
        width="min(460px, calc(100vw - 24px))"
      >
        <form onSubmit={handleResetSubmit} className="space-y-3 pt-2">
          <p className="text-xs text-slate-500">
            Enter your administrator email address to issue password recovery instructions.
          </p>
          <Input
            type="email"
            value={resetEmail}
            placeholder="Enter your admin email"
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />
          <Button htmlType="submit" type="primary" block style={{ background: "#22577A" }}>
            Send Recovery Instructions
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default AdminLogin;
