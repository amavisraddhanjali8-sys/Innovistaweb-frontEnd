import { useCallback, useEffect, useState } from "react";
import { App as AntdApp, Button, Input, Select, Table, Tag, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiKey,
  FiRefreshCw,
  FiShield,
  FiSmartphone,
} from "react-icons/fi";
import AdminPortalShell from "../../components/AdminPortalShell";
import AxiosConfig from "../../Context/AxiosConfig";
import { useAuth } from "../../Context/AuthContext";

interface AuditLogRow {
  id: number;
  createdAt: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetIdentifier?: string | null;
  action: string;
  category: string;
  status: string;
  severity: string;
  accountClassification?: string | null;
  ipAddress?: string | null;
  details?: string | null;
}

interface AuditSummary {
  totalEvents: number;
  criticalOrHigh: number;
  failedAuth: number;
  csvExports: number;
}

export default function AdminSecurityAudit() {
  const { message } = AntdApp.useApp();
  const { updateUser } = useAuth();

  // Admin-only Google Authenticator 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [setupQrUrl, setSetupQrUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disableInput, setDisableInput] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  // Admin Login Secret Key management state
  const [secretKeyInfo, setSecretKeyInfo] = useState<{
    secretKey: string;
    maskedKey: string;
    updatedAt: string;
    updatedByEmail: string;
    rotationCount: number;
    isDefault: boolean;
  } | null>(null);
  const [secretKeyLoading, setSecretKeyLoading] = useState(true);
  const [revealSecretKey, setRevealSecretKey] = useState(false);
  const [customSecretInput, setCustomSecretInput] = useState("");
  const [recreatingSecret, setRecreatingSecret] = useState(false);

  // Audit log & CSV export state
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({
    totalEvents: 0,
    criticalOrHigh: 0,
    failedAuth: 0,
    csvExports: 0,
  });
  const [logsLoading, setLogsLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");

  const fetchAdminSecretKey = useCallback(async () => {
    setSecretKeyLoading(true);
    try {
      const res = await AxiosConfig.get<{
        secretKey: string;
        maskedKey: string;
        updatedAt: string;
        updatedByEmail: string;
        rotationCount: number;
        isDefault: boolean;
      }>("/api/admin/secret-key");
      setSecretKeyInfo(res.data);
    } catch (err) {
      console.error("Failed to fetch admin secret key config", err);
    } finally {
      setSecretKeyLoading(false);
    }
  }, []);

  const fetchTotpStatus = useCallback(async () => {
    setTotpLoading(true);
    try {
      const res = await AxiosConfig.get<{ totpEnabled: boolean }>("/api/admin/totp/status");
      const enabled = Boolean(res.data?.totpEnabled);
      setTotpEnabled(enabled);
      updateUser({ totpEnabled: enabled });
    } catch (err) {
      console.error("Failed to fetch admin TOTP status", err);
    } finally {
      setTotpLoading(false);
    }
  }, [updateUser]);

  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (statusFilter) params.status = statusFilter;
      if (severity) params.severity = severity;

      const res = await AxiosConfig.get<{ data: AuditLogRow[]; summary: AuditSummary }>(
        "/api/admin/audit-logs",
        { params }
      );
      setLogs(Array.isArray(res.data?.data) ? res.data.data : []);
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch {
      message.error("Could not load web audit logs.");
    } finally {
      setLogsLoading(false);
    }
  }, [search, category, statusFilter, severity, message]);

  useEffect(() => {
    fetchAdminSecretKey();
    fetchTotpStatus();
  }, [fetchAdminSecretKey, fetchTotpStatus]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleRecreateSecretKey = async (useCustom = false) => {
    if (useCustom && !customSecretInput.trim()) {
      message.warning("Enter a custom Admin Secret Key (6-64 chars, no spaces).");
      return;
    }
    setRecreatingSecret(true);
    try {
      const res = await AxiosConfig.post<{
        message: string;
        secretKey: string;
        maskedKey: string;
        updatedAt: string;
        updatedByEmail: string;
        rotationCount: number;
        isDefault: boolean;
      }>(
        "/api/admin/secret-key/recreate",
        useCustom ? { customKey: customSecretInput.trim() } : {}
      );
      setSecretKeyInfo({
        secretKey: res.data.secretKey,
        maskedKey: res.data.maskedKey,
        updatedAt: res.data.updatedAt,
        updatedByEmail: res.data.updatedByEmail,
        rotationCount: res.data.rotationCount,
        isDefault: res.data.isDefault,
      });
      setRevealSecretKey(true);
      if (useCustom) setCustomSecretInput("");
      message.success(res.data?.message || "Admin Secret Key recreated.");
      fetchAuditLogs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || "Could not recreate Admin Secret Key.");
    } finally {
      setRecreatingSecret(false);
    }
  };

  const handleCopySecretKey = async () => {
    if (!secretKeyInfo?.secretKey) return;
    try {
      await navigator.clipboard.writeText(secretKeyInfo.secretKey);
      message.success("Active Admin Secret Key copied to clipboard.");
    } catch {
      message.warning("Clipboard copy blocked; click Reveal to view and copy manually.");
    }
  };

  const handleStartTotpSetup = async () => {
    setMfaSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        qrDataUrl: string;
        manualSecret: string;
        message?: string;
      }>("/api/admin/totp/setup");
      setSetupQrUrl(res.data.qrDataUrl);
      setManualSecret(res.data.manualSecret);
      setTotpCode("");
      message.info(
        res.data?.message ||
          "Scan the QR code in Google Authenticator and enter the 6-digit code."
      );
      fetchAuditLogs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || "Could not generate Google Authenticator setup.");
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleEnableTotp = async () => {
    if (!totpCode.trim()) {
      message.warning("Enter the 6-digit code from Google Authenticator.");
      return;
    }
    setMfaSubmitting(true);
    try {
      const res = await AxiosConfig.post<{
        totpEnabled: boolean;
        message?: string;
        tokens?: { accessToken?: string; refreshToken?: string };
      }>("/api/admin/totp/enable", { code: totpCode.trim() });

      if (res.data?.tokens?.accessToken) {
        sessionStorage.setItem("accessToken", res.data.tokens.accessToken);
      }
      if (res.data?.tokens?.refreshToken) {
        sessionStorage.setItem("refreshToken", res.data.tokens.refreshToken);
      }
      setTotpEnabled(true);
      updateUser({ totpEnabled: true });
      setSetupQrUrl(null);
      setManualSecret(null);
      setTotpCode("");
      message.success(res.data?.message || "Google Authenticator 2FA activated.");
      fetchAuditLogs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || "Invalid 6-digit Google Authenticator code.");
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!disableInput.trim()) {
      message.warning("Enter your current password or 6-digit TOTP code to disable 2FA.");
      return;
    }
    setMfaSubmitting(true);
    try {
      const val = disableInput.trim();
      const payload = /^\d{6}$/.test(val) ? { code: val } : { password: val };
      const res = await AxiosConfig.post<{ message?: string }>(
        "/api/admin/totp/disable",
        payload
      );
      setTotpEnabled(false);
      updateUser({ totpEnabled: false });
      setDisableInput("");
      message.success(res.data?.message || "Google Authenticator 2FA disabled.");
      fetchAuditLogs();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || "Verification failed; could not disable 2FA.");
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleDownloadCsv = async () => {
    setExportingCsv(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (category) params.category = category;
      if (statusFilter) params.status = statusFilter;
      if (severity) params.severity = severity;

      const res = await AxiosConfig.get<Blob>("/api/admin/audit-logs/export.csv", {
        params,
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute("download", `innovista-web-audit-report-${stamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Detailed Web Audit Report CSV downloaded.");
      fetchAuditLogs();
    } catch {
      message.error("Could not export CSV audit report.");
    } finally {
      setExportingCsv(false);
    }
  };

  const columns: ColumnsType<AuditLogRow> = [
    {
      title: "Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 155,
      render: (val: string) => (
        <span className="text-[11px] text-slate-600 tabular-nums">
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 210,
      render: (_, row) => (
        <div>
          <div className="text-xs font-semibold text-slate-900">{row.action}</div>
          <div className="text-[11px] text-slate-500">{row.category}</div>
        </div>
      ),
    },
    {
      title: "Actor",
      key: "actor",
      width: 210,
      render: (_, row) => (
        <div className="text-[11px]">
          <div className="font-medium text-slate-800 truncate max-w-[200px]">
            {row.actorEmail || row.targetIdentifier || "System"}
          </div>
          {row.targetIdentifier && row.actorEmail !== row.targetIdentifier && (
            <div className="text-slate-500 truncate max-w-[200px]">
              {row.targetIdentifier}
            </div>
          )}
          {row.accountClassification && (
            <div className="text-[#22577A] font-medium">{row.accountClassification}</div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 145,
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <Tag
            color={
              row.status === "SUCCESS"
                ? "green"
                : row.status === "BLOCKED"
                ? "red"
                : row.status === "FAILURE"
                ? "volcano"
                : "blue"
            }
            className="w-fit text-[10px] m-0"
          >
            {row.status}
          </Tag>
          <Tag
            color={
              row.severity === "CRITICAL"
                ? "red"
                : row.severity === "HIGH"
                ? "orange"
                : row.severity === "WARNING"
                ? "gold"
                : "default"
            }
            className="w-fit text-[10px] m-0"
          >
            {row.severity}
          </Tag>
        </div>
      ),
    },
    {
      title: "Details",
      key: "details",
      render: (_, row) => (
        <div className="text-[11px] text-slate-600">
          <div>{row.details || "—"}</div>
          {row.ipAddress && (
            <div className="text-slate-400 font-mono text-[10px] mt-0.5">
              {row.ipAddress}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminPortalShell
      sectionTitle="Security"
      stats={[
        { label: "Events", value: summary.totalEvents, tone: "navy" },
        { label: "Alerts", value: summary.criticalOrHigh },
        { label: "Blocked", value: summary.failedAuth },
        { label: "Exports", value: summary.csvExports, tone: "green" },
      ]}
      primaryAction={{
        label: exportingCsv ? "Exporting..." : "Export",
        icon: <FiDownload className="text-[13px]" />,
        loading: exportingCsv,
        testId: "download-audit-csv-btn",
        onClick: handleDownloadCsv,
      }}
    >
      <div className="space-y-6">
        {/* Secret */}
        <div
          data-testid="admin-secret-key-panel"
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#22577A] text-white flex items-center justify-center shrink-0">
                <FiKey className="text-base" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Secret
              </h2>
            </div>
            <Tag
              color={secretKeyInfo?.isDefault ? "blue" : "green"}
              className="font-semibold text-xs px-3 py-0.5 m-0"
            >
              {secretKeyLoading
                ? "..."
                : secretKeyInfo?.isDefault
                ? "Default"
                : `#${secretKeyInfo?.rotationCount ?? 1}`}
            </Tag>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Active Admin Secret Key
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code
                    data-testid="admin-secret-key-display"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-sm font-bold tracking-wider text-slate-900 select-all"
                  >
                    {secretKeyLoading
                      ? "••••••••"
                      : revealSecretKey
                      ? secretKeyInfo?.secretKey || "Unavailable"
                      : secretKeyInfo?.maskedKey || "••••••••"}
                  </code>
                  <Button
                    size="middle"
                    icon={revealSecretKey ? <FiEyeOff /> : <FiEye />}
                    onClick={() => setRevealSecretKey((prev) => !prev)}
                    data-testid="toggle-secret-key-visibility"
                  >
                    {revealSecretKey ? "Hide" : "Reveal"}
                  </Button>
                  <Button
                    size="middle"
                    icon={<FiCopy />}
                    onClick={handleCopySecretKey}
                    data-testid="copy-secret-key-btn"
                  >
                    Copy
                  </Button>
                </div>
                {secretKeyInfo && (
                  <div className="text-[11px] text-slate-400">
                    Last updated {new Date(secretKeyInfo.updatedAt).toLocaleString()} by{" "}
                    {secretKeyInfo.updatedByEmail} · Rotations: {secretKeyInfo.rotationCount}
                  </div>
                )}
              </div>

              <Popconfirm
                title="Rotate Secret Key?"
                okText="Rotate"
                cancelText="Cancel"
                onConfirm={() => void handleRecreateSecretKey(false)}
              >
                <Button
                  type="primary"
                  icon={<FiRefreshCw />}
                  loading={recreatingSecret}
                  data-testid="recreate-random-secret-key-btn"
                  style={{ background: "#22577A", borderColor: "#22577A" }}
                >
                  Rotate
                </Button>
              </Popconfirm>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={customSecretInput}
                onChange={(e) => setCustomSecretInput(e.target.value)}
                placeholder="Custom key"
                data-testid="custom-secret-key-input"
                className="flex-1 font-mono"
              />
              <Button
                loading={recreatingSecret}
                onClick={() => void handleRecreateSecretKey(true)}
                data-testid="save-custom-secret-key-btn"
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Authenticator */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#22577A] text-white flex items-center justify-center">
                <FiSmartphone className="text-base" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Authenticator
              </h2>
            </div>
            <Tag color={totpEnabled ? "success" : "blue"} className="font-semibold text-xs px-3 py-0.5 m-0">
              {totpLoading ? "..." : totpEnabled ? "Active" : "Secret"}
            </Tag>
          </div>

          {!totpEnabled ? (
            <div className="space-y-4">
              {!setupQrUrl ? (
                <Button
                  type="primary"
                  icon={<FiShield />}
                  loading={mfaSubmitting}
                  onClick={handleStartTotpSetup}
                  style={{ background: "#22577A", borderColor: "#22577A" }}
                >
                  Setup
                </Button>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col items-center justify-center gap-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                    <img
                      src={setupQrUrl}
                      alt="Authenticator QR"
                      data-testid="admin-totp-qr"
                      className="w-44 h-44 rounded-lg border border-slate-200 p-1 bg-white"
                    />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-medium">
                        Secret
                      </div>
                      <code
                        data-testid="admin-totp-manual-secret"
                        className="inline-block mt-1 px-2.5 py-1 rounded bg-slate-100 text-xs font-mono text-slate-800 select-all"
                      >
                        {manualSecret}
                      </code>
                    </div>
                  </div>
                  <div className="space-y-3 flex flex-col justify-center">
                    <div className="text-xs font-bold text-slate-900">
                      Verify
                    </div>
                    <Input
                      data-testid="admin-totp-enable-input"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="Code"
                      maxLength={6}
                      size="large"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="primary"
                        loading={mfaSubmitting}
                        onClick={handleEnableTotp}
                        style={{ background: "#22577A", borderColor: "#22577A" }}
                      >
                        Activate
                      </Button>
                      <Button
                        onClick={() => {
                          setSetupQrUrl(null);
                          setManualSecret(null);
                          setTotpCode("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-emerald-700 text-xs font-semibold">
                <FiCheckCircle className="text-base shrink-0" />
                <span>Enabled</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto shrink-0">
                <Input.Password
                  value={disableInput}
                  onChange={(e) => setDisableInput(e.target.value)}
                  placeholder="Code"
                  className="w-full sm:w-48"
                  size="middle"
                />
                <Popconfirm
                  title="Disable 2FA?"
                  onConfirm={handleDisableTotp}
                  okText="Disable"
                  cancelText="Cancel"
                >
                  <Button size="middle" danger loading={mfaSubmitting} className="w-full sm:w-auto">
                    Disable
                  </Button>
                </Popconfirm>
              </div>
            </div>
          )}
        </div>

        {/* Audit */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 m-0">
              Audit
            </h2>
            <Button
              icon={<FiRefreshCw />}
              onClick={fetchAuditLogs}
              loading={logsLoading}
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Input
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />
            <Select
              allowClear
              placeholder="Category"
              value={category || undefined}
              onChange={(v) => setCategory(v || "")}
              options={[
                { value: "AUTH", label: "AUTH" },
                { value: "MFA", label: "MFA" },
                { value: "ACCOUNT_GOVERNANCE", label: "ACCOUNT_GOVERNANCE" },
                { value: "EMAIL_VERIFICATION", label: "EMAIL_VERIFICATION" },
                { value: "SECURITY", label: "SECURITY" },
                { value: "REPORTING", label: "REPORTING" },
              ]}
            />
            <Select
              allowClear
              placeholder="Status"
              value={statusFilter || undefined}
              onChange={(v) => setStatusFilter(v || "")}
              options={[
                { value: "SUCCESS", label: "SUCCESS" },
                { value: "FAILURE", label: "FAILURE" },
                { value: "BLOCKED", label: "BLOCKED" },
                { value: "PENDING", label: "PENDING" },
              ]}
            />
            <Select
              allowClear
              placeholder="Severity"
              value={severity || undefined}
              onChange={(v) => setSeverity(v || "")}
              options={[
                { value: "INFO", label: "INFO" },
                { value: "WARNING", label: "WARNING" },
                { value: "HIGH", label: "HIGH" },
                { value: "CRITICAL", label: "CRITICAL" },
              ]}
            />
          </div>

          <Table<AuditLogRow>
            rowKey="id"
            columns={columns}
            dataSource={logs}
            loading={logsLoading}
            size="small"
            scroll={{ x: 760 }}
            pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
          />
        </div>
      </div>
    </AdminPortalShell>
  );
}
