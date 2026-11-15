import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { App as AntdApp, Button, Input } from "antd";
import { CheckCircleFilled, CloseCircleFilled, SafetyCertificateOutlined } from "@ant-design/icons";
import { useAuth } from "../Context/AuthContext";

function CustomerVerify() {
  const { message: toast } = AntdApp.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { updateUser, user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const tokenParam = queryParams.get("token") || "";
  const emailParam = queryParams.get("email") || user?.email || "";

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    tokenParam ? "verifying" : "idle"
  );
  const [statusMessage, setStatusMessage] = useState(
    tokenParam ? "Verifying your email address..." : "Enter your 6-digit email verification code."
  );
  const [emailInput, setEmailInput] = useState(emailParam);
  const [codeInput, setCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenParam) return;
    setStatus("verifying");
    axios
      .post("/api/auth/verify-email", { token: tokenParam, email: emailParam })
      .then((res) => {
        setStatus("success");
        setStatusMessage(res.data?.message || "Email verified successfully!");
        updateUser({ emailVerified: true });
        setTimeout(() => navigate("/profile"), 1800);
      })
      .catch((err) => {
        setStatus("error");
        setStatusMessage(
          err?.response?.data?.message || "Verification link is invalid or expired."
        );
      });
  }, [tokenParam, emailParam, navigate, updateUser]);

  const handleManualVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailInput.trim() || !codeInput.trim()) {
      toast.warning("Enter both your email address and 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post("/api/auth/verify-email", {
        email: emailInput.trim(),
        code: codeInput.trim(),
      });
      setStatus("success");
      setStatusMessage(res.data?.message || "Email verified successfully!");
      updateUser({ emailVerified: true });
      toast.success("Email verified!");
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err: unknown) {
      setStatus("error");
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setStatusMessage(String(err.response.data.message));
      } else {
        setStatusMessage("Invalid verification code.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl shadow-md border border-slate-200/80 space-y-4 text-center">
        <div className="flex justify-center">
          {status === "success" ? (
            <CheckCircleFilled className="text-4xl text-emerald-500" />
          ) : status === "error" ? (
            <CloseCircleFilled className="text-4xl text-red-500" />
          ) : (
            <SafetyCertificateOutlined className="text-4xl text-[#22577A]" />
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900">Email Verification</h1>
        <p className="text-xs text-slate-600">{statusMessage}</p>

        {!tokenParam && status !== "success" && (
          <form onSubmit={handleManualVerify} className="space-y-3 text-left pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Email
              </label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@company.com"
                size="large"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Digit Verification Code
              </label>
              <Input
                maxLength={6}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                size="large"
                className="font-mono text-center tracking-widest"
              />
            </div>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              size="large"
              style={{ background: "#22577A", borderColor: "#22577A" }}
            >
              Verify Email
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default CustomerVerify;
