import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  App as AntdApp,
  Tabs,
  Button,
  Tag,
  Avatar,
  Form,
  Input,
  Upload,
  Spin,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  CheckCircleFilled,
  LogoutOutlined,
  UploadOutlined,
  ShoppingOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  PaperClipOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import PageMetadata from "../components/PageMetadata";
import PasswordReset from "../components/PasswordReset";
import {
  buildDraftCartOrderPayload,
  computeSiteVisitCountdown,
  filterCustomerPortalRecords,
  type CustomerOrderItem,
  type CustomerRfqItem,
  type CustomerSiteVisitItem,
} from "../utils/customerPortalHelpers";

interface ProfileFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  logo?: string;
}

export default function UserProfile() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoggedIn, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "orders");
  const [orders, setOrders] = useState<CustomerOrderItem[]>([]);
  const [rfqs, setRfqs] = useState<CustomerRfqItem[]>([]);
  const [siteVisits, setSiteVisits] = useState<CustomerSiteVisitItem[]>([]);
  const [loadingPortal, setLoadingPortal] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const [submittingDraftOrder, setSubmittingDraftOrder] = useState<boolean>(false);
  const [sendingVerifyCode, setSendingVerifyCode] = useState<boolean>(false);
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState<string>("");
  const [previewVerifyCode, setPreviewVerifyCode] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [draftCartIds, setDraftCartIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "[]");
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (!isLoggedIn && !sessionStorage.getItem("accessToken")) {
      navigate("/profile-login");
    }
  }, [isLoggedIn, navigate]);

  // Live 1-second timer for site visit countdowns
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("cart") || "[]");
        setDraftCartIds(Array.isArray(saved) ? saved.map(String) : []);
      } catch {
        setDraftCartIds([]);
      }
    };
    window.addEventListener("innovista-cart-updated", syncCart);
    return () => window.removeEventListener("innovista-cart-updated", syncCart);
  }, []);

  const userId = user?.id;
  const userRole = user?.role;
  const userEmail = user?.email;

  const fetchCustomerPortalData = useCallback(async () => {
    if (!userId || !userRole) return;
    setLoadingPortal(true);
    try {
      if (userRole === "admin") {
        const [ordersRes, rfqRes, visitsRes] = await Promise.all([
          AxiosConfig.get("/order/getAllOrders?limit=50"),
          AxiosConfig.get("/api/rfq"),
          AxiosConfig.get("/api/site-visits"),
        ]);
        setOrders(Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : []);
        setRfqs(Array.isArray(rfqRes.data?.data) ? rfqRes.data.data : []);
        setSiteVisits(
          Array.isArray(visitsRes.data?.bookings)
            ? visitsRes.data.bookings
            : Array.isArray(visitsRes.data?.data)
            ? visitsRes.data.data
            : []
        );
      } else {
        const res = await AxiosConfig.get(
          `/customer/profile?customerId=${encodeURIComponent(String(userId || ""))}&email=${encodeURIComponent(userEmail || "")}`
        );
        if (res.data?.customer) {
          const c = res.data.customer;
          updateUser({
            verified: Boolean(c.Verify_State),
            emailVerified: Boolean(c.Email_Verified),
            accountStatus: c.Account_Status || "ACTIVE",
            username: c.Cus_Username ?? undefined,
            classification: res.data?.classification?.statusCode,
          });
        }
        const filtered = filterCustomerPortalRecords({
          orders: (Array.isArray(res.data?.orders)
            ? res.data.orders
            : []) as CustomerOrderItem[],
          rfqs: (Array.isArray(res.data?.rfqs)
            ? res.data.rfqs
            : []) as CustomerRfqItem[],
          siteVisits: (Array.isArray(res.data?.siteVisits)
            ? res.data.siteVisits
            : []) as CustomerSiteVisitItem[],
          email: userEmail || "",
          userId,
          isAdmin: false,
        });
        setOrders(filtered.orders);
        setRfqs(filtered.rfqs);
        setSiteVisits(filtered.siteVisits);
      }
    } catch (err) {
      console.error("Failed to load customer portal workspace", err);
    } finally {
      setLoadingPortal(false);
    }
  }, [userId, userRole, userEmail, updateUser]);

  useEffect(() => {
    if (userId) {
      fetchCustomerPortalData();
    }
  }, [userId, fetchCustomerPortalData]);

  const sortedSiteVisits = useMemo(() => {
    return [...siteVisits].sort((a, b) => {
      const ca = computeSiteVisitCountdown(a.date, a.slotTime, a.status, nowMs);
      const cb = computeSiteVisitCountdown(b.date, b.slotTime, b.status, nowMs);
      const rank = (s: string) =>
        s === "in-progress" ? 0 : s === "upcoming" ? 1 : s === "completed" ? 2 : 3;
      const diffRank = rank(ca.state) - rank(cb.state);
      if (diffRank !== 0) return diffRank;
      return `${a.date} ${a.slotTime}`.localeCompare(`${b.date} ${b.slotTime}`);
    });
  }, [siteVisits, nowMs]);

  const nextUpcomingVisit = useMemo(() => {
    for (const v of sortedSiteVisits) {
      const cd = computeSiteVisitCountdown(v.date, v.slotTime, v.status, nowMs);
      if (cd.state === "upcoming" || cd.state === "in-progress") {
        return { visit: v, countdown: cd };
      }
    }
    return null;
  }, [sortedSiteVisits, nowMs]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  const handleSubmitDraftCart = async () => {
    if (!user || draftCartIds.length === 0) return;
    setSubmittingDraftOrder(true);
    try {
      const payload = buildDraftCartOrderPayload({
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        designIds: draftCartIds,
      });
      await AxiosConfig.post("/order/createOrder", payload);
      localStorage.removeItem("cart");
      setDraftCartIds([]);
      window.dispatchEvent(new Event("innovista-cart-updated"));
      message.success("Your selected designs have been submitted as an order.");
      await fetchCustomerPortalData();
    } catch (err) {
      console.error(err);
      message.error("Could not submit selected designs. Please try again.");
    } finally {
      setSubmittingDraftOrder(false);
    }
  };

  const handleClearDraftCart = () => {
    localStorage.removeItem("cart");
    setDraftCartIds([]);
    window.dispatchEvent(new Event("innovista-cart-updated"));
    message.info("Cleared saved design selections.");
  };

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      if (user?.role === "customer") {
        await AxiosConfig.put("/customer/updateProfile", {
          CustomerId: user.id,
          Cus_Name: values.name,
          Cus_PhoneNumber: values.phone,
          Cus_CompanyName: values.company,
          Cus_Logo: values.logo || user.logo,
        });
      }
      updateUser({
        name: values.name,
        phone: values.phone,
        company: values.company,
        logo: values.logo || user?.logo,
      });
      message.success("Saved");
    } catch (err) {
      console.error(err);
      message.error("Error saving");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await AxiosConfig.post("/api/upload", formData);

      const uploadedUrl = res.data?.secure_url || res.data?.url;
      if (uploadedUrl) {
        updateUser({ logo: uploadedUrl });
        if (user?.role === "customer") {
          await AxiosConfig.put("/customer/updateProfile", {
            CustomerId: user.id,
            Cus_Logo: uploadedUrl,
          });
        }
        message.success("Updated");
      }
    } catch (err) {
      console.error("Upload error", err);
      message.error("Upload failed");
    } finally {
      setAvatarUploading(false);
    }
    return false;
  };

  const handleSendEmailVerification = async () => {
    if (!user?.email) return;
    setSendingVerifyCode(true);
    try {
      const res = await AxiosConfig.post("/api/auth/send-verification-email", {
        email: user.email,
      });
      if (res.data?.verificationPreview?.code) {
        setPreviewVerifyCode(res.data.verificationPreview.code);
      }
      message.success(res.data?.message || "Verification code sent.");
    } catch (err) {
      console.error(err);
      message.error("Could not send verification code.");
    } finally {
      setSendingVerifyCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!user?.email || !verifyCodeInput.trim()) {
      message.warning("Please enter your 6-digit verification code.");
      return;
    }
    setVerifyingCode(true);
    try {
      const res = await AxiosConfig.post("/api/auth/verify-email", {
        email: user.email,
        code: verifyCodeInput.trim(),
      });
      updateUser({
        emailVerified: true,
        classification: res.data?.classification?.statusCode || user.classification,
      });
      setPreviewVerifyCode(null);
      setVerifyCodeInput("");
      message.success(res.data?.message || "Email verified successfully.");
    } catch {
      message.error("Invalid or expired verification code.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await AxiosConfig.post("/auth/logout");
    } catch {
      // ignore logout audit failure
    }
    logout();
    message.success("Signed out");
    navigate("/profile-login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 pb-24 sm:py-10 md:pb-10 px-4 sm:px-6 lg:px-8">
      <PageMetadata
        title={`${user.name} — Customer Portal`}
        description="View your Innovista Fabriconix fabrication orders, Request for Quotation (RFQ) submissions, and upcoming site visit countdowns."
        canonicalPath="/profile"
        noIndex
      />
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="relative group">
                {user.logo && (user.logo.toLowerCase().includes(".svg") || user.logo.includes("/assets/logos/")) ? (
                  <div className="w-[88px] h-[88px] rounded-full border-2 border-slate-200 bg-white flex items-center justify-center p-2.5 overflow-hidden">
                    <img
                      src={user.logo}
                      alt={user.company || user.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <Avatar
                    size={88}
                    src={user.logo}
                    icon={<UserOutlined />}
                    className="border-2 border-slate-200 bg-slate-100 object-cover"
                  />
                )}
                <Upload
                  beforeUpload={handleAvatarUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <button
                    type="button"
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-[10px] font-bold"
                  >
                    <UploadOutlined className="text-sm mb-0.5" />
                    {avatarUploading ? "..." : "Photo"}
                  </button>
                </Upload>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">
                    {user.name}
                  </h1>
                  {user.verified ? (
                    <Tag color="success" className="rounded-full px-2 py-0.5 text-xs font-semibold border-0">
                      <CheckCircleFilled className="mr-1" /> Admin Verified
                    </Tag>
                  ) : (
                    <Tag color="gold" className="rounded-full px-2 py-0.5 text-xs font-semibold border-0">
                      Pending Admin Approval
                    </Tag>
                  )}
                  <Tag
                    color={user.emailVerified ? "cyan" : "orange"}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold border-0"
                  >
                    {user.emailVerified ? "Email Verified" : "Email Unverified"}
                  </Tag>
                  <Tag
                    color={user.role === "admin" ? "volcano" : "blue"}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold border-0"
                  >
                    {user.role === "admin" ? "Admin" : "Client"}
                  </Tag>
                </div>
                <p className="text-xs font-medium text-slate-600 flex items-center justify-center sm:justify-start gap-1.5 m-0">
                  <BankOutlined className="text-slate-400" />
                  {user.company || "Client Account"}
                  {user.username ? ` · @${user.username}` : ""}
                  {` · ID #${user.id}`}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MailOutlined /> {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneOutlined /> {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <Button
                  size="middle"
                  icon={<DashboardOutlined />}
                  onClick={() => navigate("/admin-home")}
                  className="rounded-xl font-semibold text-xs"
                >
                  Admin
                </Button>
              )}
              <Button
                size="middle"
                danger
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
                className="rounded-xl font-semibold text-xs"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* 3-Card Summary Strip: Orders · RFQ Details · Site Visit Countdown */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => handleTabChange("orders")}
              data-testid="portal-kpi-orders"
              className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-sky-50/70 border-[#3393B8]/60 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#22577A]">
                <span>Fabrication Orders</span>
                <ShoppingOutlined />
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {orders.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {orders.filter((o) => o.Order_Status === "PENDING").length} in progress
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("rfqs")}
              data-testid="portal-kpi-rfqs"
              className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                activeTab === "rfqs"
                  ? "bg-sky-50/70 border-[#3393B8]/60 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#22577A]">
                <span>Quotation Requests (RFQs)</span>
                <FileTextOutlined />
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {rfqs.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Detailed project specifications
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("site-visits")}
              data-testid="portal-kpi-visits"
              className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                activeTab === "site-visits"
                  ? "bg-sky-50/70 border-[#3393B8]/60 shadow-xs"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#22577A]">
                <span>Site Visit Schedules</span>
                <CalendarOutlined />
              </div>
              <div
                data-testid="portal-next-visit-countdown"
                className="mt-1.5 text-lg sm:text-xl font-bold text-slate-900 tabular-nums truncate"
              >
                {nextUpcomingVisit
                  ? nextUpcomingVisit.countdown.formatted
                  : `${siteVisits.length} Scheduled`}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {nextUpcomingVisit
                  ? `${nextUpcomingVisit.visit.date} · ${nextUpcomingVisit.visit.slotLabel}`
                  : "Book site inspection anytime"}
              </div>
            </button>
          </div>
        </div>

        {/* Workspace Dashboard Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-4 sm:p-8">
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              {
                key: "orders",
                label: (
                  <span className="font-semibold px-2">
                    <ShoppingOutlined className="mr-1.5" />
                    Orders ({orders.length})
                  </span>
                ),
                children: (
                  <div className="pt-4 space-y-4">
                    {/* Optional Draft Selections from Add-to-Cart */}
                    {draftCartIds.length > 0 && (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#22577A]">
                            {draftCartIds.length} Saved Architectural{" "}
                            {draftCartIds.length === 1 ? "System" : "Systems"} Ready to Order
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Submit your selected designs directly to Innovista engineering as an order inquiry.
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="small"
                            onClick={handleClearDraftCart}
                            className="rounded-lg text-xs"
                          >
                            Clear
                          </Button>
                          <Button
                            type="primary"
                            size="small"
                            loading={submittingDraftOrder}
                            onClick={handleSubmitDraftCart}
                            className="bg-[#22577A] rounded-lg text-xs font-semibold"
                          >
                            Submit Order
                          </Button>
                        </div>
                      </div>
                    )}

                    {loadingPortal ? (
                      <div className="py-12 text-center">
                        <Spin />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <div className="text-slate-400 text-sm">
                          No orders placed yet.
                        </div>
                        <Button
                          type="primary"
                          onClick={() => navigate("/products")}
                          className="bg-[#22577A] rounded-xl text-xs font-semibold"
                        >
                          Explore Architectural Systems
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3" data-testid="customer-orders-list">
                        {orders.map((order, idx) => {
                          const statusColor =
                            order.Order_Status === "COMPLETED"
                              ? "success"
                              : order.Order_Status === "PENDING"
                              ? "processing"
                              : "warning";
                          const firstDesign = order.Designs?.[0]?.Design;
                          const imgRaw = firstDesign?.Design_Image;
                          const thumb = Array.isArray(imgRaw) ? imgRaw[0] : imgRaw;

                          return (
                            <div
                              key={order.OrderID || idx}
                              className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-[#3393B8]/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                {thumb && (
                                  <img
                                    src={thumb}
                                    alt={firstDesign?.Design_Name || "Design"}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                                  />
                                )}
                                <div className="space-y-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {order.OrderID}
                                    </span>
                                    <Tag color={statusColor} className="rounded-full px-2 py-0 text-xs border-0">
                                      {order.Order_Status}
                                    </Tag>
                                    <span className="text-xs text-slate-400 flex items-center gap-1 tabular-nums">
                                      <ClockCircleOutlined />
                                      {new Date(order.Order_Date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-700 font-semibold truncate">
                                    {firstDesign?.Design_Name || "Custom Architectural Glazing System"}
                                    {order.Designs && order.Designs.length > 1
                                      ? ` +${order.Designs.length - 1} more`
                                      : ""}
                                  </div>
                                  {order.Customer?.Cus_CompanyName && (
                                    <div className="text-[11px] text-slate-500">
                                      {order.Customer.Cus_CompanyName}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="small"
                                  onClick={() => navigate("/milestones")}
                                  className="rounded-lg text-xs"
                                >
                                  Milestones
                                </Button>
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => navigate("/products")}
                                  className="bg-[#22577a] rounded-lg text-xs"
                                >
                                  Specs
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "rfqs",
                label: (
                  <span className="font-semibold px-2">
                    <FileTextOutlined className="mr-1.5" />
                    RFQ Details ({rfqs.length})
                  </span>
                ),
                children: (
                  <div className="pt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 m-0">
                          Request for Quotation Submissions
                        </h2>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                          Full technical specs, delivery timelines, and estimation statuses.
                        </p>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate("/request-quote")}
                        className="bg-[#22577A] rounded-xl text-xs font-semibold"
                      >
                        New RFQ
                      </Button>
                    </div>

                    {loadingPortal ? (
                      <div className="py-12 text-center">
                        <Spin />
                      </div>
                    ) : rfqs.length === 0 ? (
                      <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
                        <div className="text-slate-500 text-sm">
                          No Request for Quotations submitted yet.
                        </div>
                        <Button
                          type="primary"
                          onClick={() => navigate("/request-quote")}
                          className="bg-[#22577A] rounded-xl text-xs font-semibold"
                        >
                          Submit Your First RFQ
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4" data-testid="customer-rfqs-list">
                        {rfqs.map((rfq) => {
                          const rfqStatusColor =
                            rfq.status === "QUOTED" || rfq.status === "APPROVED"
                              ? "success"
                              : rfq.status === "IN_REVIEW"
                              ? "processing"
                              : "blue";
                          return (
                            <article
                              key={rfq.id}
                              className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 hover:border-[#3393B8]/60 transition-colors"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-[#22577A] bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-lg">
                                      {rfq.projectReferenceNumber || `RFQ-${rfq.id}`}
                                    </span>
                                    <Tag color={rfqStatusColor} className="rounded-full px-2.5 py-0 text-xs font-semibold border-0">
                                      {rfq.status || "NEW"}
                                    </Tag>
                                    <span className="text-xs text-slate-400 tabular-nums">
                                      Submitted {new Date(rfq.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h3 className="text-base font-bold text-slate-900 m-0 pt-1">
                                    {rfq.projectTitle}
                                  </h3>
                                </div>

                                {rfq.budget && (
                                  <div className="text-right">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                      Est. Budget
                                    </div>
                                    <div className="text-sm font-bold text-[#22577A] tabular-nums">
                                      {rfq.budget}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed m-0">
                                {rfq.projectDescription}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">System Type</span>
                                  <span className="font-semibold text-slate-800">
                                    {rfq.projectType}
                                    {rfq.interiorStyle ? ` · ${rfq.interiorStyle}` : ""}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Site Location</span>
                                  <span className="font-semibold text-slate-800">{rfq.location}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Material &amp; Finish</span>
                                  <span className="font-semibold text-slate-800">
                                    {[rfq.materialBrand, rfq.colorCode].filter(Boolean).join(" · ") || "Standard Aluminium"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Target Delivery</span>
                                  <span className="font-semibold text-slate-800 tabular-nums">
                                    {rfq.latestDeliveryDate || "To be confirmed"}
                                  </span>
                                </div>
                              </div>

                              {(rfq.siteAddress || rfq.proposedVisitDates) && (
                                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
                                  {rfq.siteAddress && (
                                    <span>
                                      <strong className="text-slate-800">Site:</strong> {rfq.siteAddress}
                                    </span>
                                  )}
                                  {rfq.proposedVisitDates && (
                                    <span>
                                      <strong className="text-slate-800">Proposed Visit Dates:</strong> {rfq.proposedVisitDates}
                                    </span>
                                  )}
                                </div>
                              )}

                              {rfq.attachments && rfq.attachments.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {rfq.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-xs font-medium text-[#22577A] no-underline transition-colors"
                                    >
                                      <PaperClipOutlined />
                                      <span>{att.fileName}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "site-visits",
                label: (
                  <span className="font-semibold px-2">
                    <CalendarOutlined className="mr-1.5" />
                    Site Visit Schedules ({siteVisits.length})
                  </span>
                ),
                children: (
                  <div className="pt-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 m-0">
                          Scheduled Site Visits &amp; Live Countdown
                        </h2>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                          Real-time countdown to your upcoming showroom consultations and site laser measurements.
                        </p>
                      </div>
                      <Button
                        type="primary"
                        icon={<CalendarOutlined />}
                        onClick={() => navigate("/contact")}
                        className="bg-[#22577A] rounded-xl text-xs font-semibold"
                      >
                        Book Site Visit
                      </Button>
                    </div>

                    {loadingPortal ? (
                      <div className="py-12 text-center">
                        <Spin />
                      </div>
                    ) : sortedSiteVisits.length === 0 ? (
                      <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
                        <div className="text-slate-500 text-sm">
                          No site visits scheduled yet.
                        </div>
                        <Button
                          type="primary"
                          onClick={() => navigate("/contact")}
                          className="bg-[#22577A] rounded-xl text-xs font-semibold"
                        >
                          Schedule Site Measurement
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3.5" data-testid="customer-site-visits-list">
                        {sortedSiteVisits.map((visit) => {
                          const countdown = computeSiteVisitCountdown(
                            visit.date,
                            visit.slotTime,
                            visit.status,
                            nowMs
                          );
                          const statusTagColor =
                            visit.status === "COMPLETED"
                              ? "success"
                              : visit.status === "CANCELLED"
                              ? "error"
                              : "processing";

                          return (
                            <article
                              key={visit.id}
                              data-testid={`site-visit-card-${visit.id}`}
                              className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-[#3393B8]/60 transition-colors"
                            >
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {visit.id}
                                  </span>
                                  <Tag color={statusTagColor} className="rounded-full px-2.5 py-0 text-xs font-semibold border-0">
                                    {visit.status}
                                  </Tag>
                                  <span className="text-xs font-semibold text-[#22577A] tabular-nums">
                                    {visit.date} · {visit.slotLabel}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                  <EnvironmentOutlined className="text-[#3393B8]" />
                                  <span>{visit.locationName}</span>
                                </div>
                                {visit.notes && (
                                  <p className="text-xs text-slate-500 m-0">
                                    {visit.notes}
                                  </p>
                                )}
                              </div>

                              {/* Live Countdown Readout */}
                              <div
                                data-testid="visit-countdown"
                                id={`site-visit-countdown-${visit.id}`}
                                className={`shrink-0 rounded-2xl px-4 py-3 border text-center w-full lg:w-auto lg:min-w-[240px] ${
                                  countdown.state === "upcoming"
                                    ? countdown.isUrgent
                                      ? "bg-amber-50 border-amber-200 text-amber-900"
                                      : "bg-sky-50/80 border-sky-200 text-[#22577A]"
                                    : countdown.state === "in-progress"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                  {countdown.label}
                                </div>
                                {countdown.state === "upcoming" ? (
                                  <div className="mt-1.5 grid grid-cols-4 gap-1.5 tabular-nums">
                                    <div className="bg-white/90 rounded-lg px-2 py-1 border border-current/10">
                                      <div className="text-sm font-extrabold leading-tight">
                                        {String(countdown.days).padStart(2, "0")}
                                      </div>
                                      <div className="text-[9px] font-semibold uppercase opacity-70">
                                        Days
                                      </div>
                                    </div>
                                    <div className="bg-white/90 rounded-lg px-2 py-1 border border-current/10">
                                      <div className="text-sm font-extrabold leading-tight">
                                        {String(countdown.hours).padStart(2, "0")}
                                      </div>
                                      <div className="text-[9px] font-semibold uppercase opacity-70">
                                        Hrs
                                      </div>
                                    </div>
                                    <div className="bg-white/90 rounded-lg px-2 py-1 border border-current/10">
                                      <div className="text-sm font-extrabold leading-tight">
                                        {String(countdown.minutes).padStart(2, "0")}
                                      </div>
                                      <div className="text-[9px] font-semibold uppercase opacity-70">
                                        Min
                                      </div>
                                    </div>
                                    <div className="bg-white/90 rounded-lg px-2 py-1 border border-current/10">
                                      <div className="text-sm font-extrabold leading-tight">
                                        {String(countdown.seconds).padStart(2, "0")}
                                      </div>
                                      <div className="text-[9px] font-semibold uppercase opacity-70">
                                        Sec
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 text-base font-extrabold tabular-nums">
                                    {countdown.formatted}
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "settings",
                label: (
                  <span className="font-semibold px-2">
                    <UserOutlined className="mr-1" /> Settings
                  </span>
                ),
                children: (
                  <div className="max-w-md pt-4">
                    <Form
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                      initialValues={{
                        name: user.name,
                        email: user.email,
                        phone: user.phone || "",
                        company: user.company || "",
                        logo: user.logo,
                      }}
                    >
                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Name</span>}
                        name="name"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Company</span>}
                        name="company"
                      >
                        <Input size="large" placeholder="Optional company or project name" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Phone</span>}
                        name="phone"
                      >
                        <Input size="large" placeholder="e.g. +94 77 123 4567" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Photo URL</span>}
                        name="logo"
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={savingProfile}
                        className="w-full bg-[#22577a] hover:bg-[#1a4460] font-semibold rounded-xl text-sm h-11"
                      >
                        Save
                      </Button>
                    </Form>
                  </div>
                ),
              },
              {
                key: "security",
                label: (
                  <span className="font-semibold px-2">
                    <SafetyCertificateOutlined className="mr-1" /> Security
                  </span>
                ),
                children: (
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                        <div className="font-bold text-slate-900 text-sm">Account Verification &amp; Status</div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account ID:</span>
                          <span className="font-semibold text-slate-800">#{user.id}</span>
                        </div>
                        {user.username && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Username:</span>
                            <span className="font-semibold text-slate-800">@{user.username}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account Type:</span>
                          <span className="font-bold text-slate-800 uppercase">{user.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email Verification:</span>
                          <span className={`font-bold ${user.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Admin Verification:</span>
                          <span className={`font-bold ${user.verified ? "text-emerald-600" : "text-amber-600"}`}>
                            {user.verified ? "Verified by Admin" : "Pending Admin Review"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Account State:</span>
                          <span className={`font-bold ${user.accountStatus === "SUSPENDED" ? "text-red-600" : "text-emerald-600"}`}>
                            {user.accountStatus || "ACTIVE"}
                          </span>
                        </div>
                      </div>

                      {!user.emailVerified && (
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
                          <div className="text-xs font-bold text-amber-900">
                            Verify Your Email Address
                          </div>
                          <p className="text-[11px] text-amber-800 m-0">
                            Verify your email using a 6-digit security code. You can continue browsing while pending admin approval.
                          </p>
                          {previewVerifyCode && (
                            <div className="rounded-lg bg-white border border-amber-300 px-3 py-2 text-xs text-slate-700">
                              Verification Code:{" "}
                              <strong data-testid="profile-verify-code-preview" className="font-mono tracking-widest text-[#22577A]">
                                {previewVerifyCode}
                              </strong>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={verifyCodeInput}
                              onChange={(e) => setVerifyCodeInput(e.target.value)}
                              placeholder="6-digit code"
                              maxLength={6}
                              className="rounded-xl h-11 sm:h-9"
                            />
                            <Button
                              type="primary"
                              loading={verifyingCode}
                              onClick={handleVerifyEmailCode}
                              className="bg-[#22577A] rounded-xl font-semibold min-h-[44px] sm:min-h-[36px]"
                            >
                              Verify
                            </Button>
                          </div>
                          <Button
                            size="middle"
                            loading={sendingVerifyCode}
                            onClick={handleSendEmailVerification}
                            className="rounded-lg text-xs min-h-[40px] sm:min-h-[32px]"
                          >
                            Send / Resend Verification Code
                          </Button>
                        </div>
                      )}

                      <Button
                        danger
                        onClick={handleSignOut}
                        className="w-full rounded-xl text-xs font-semibold"
                      >
                        Logout
                      </Button>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Change Password</h3>
                      <PasswordReset />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
