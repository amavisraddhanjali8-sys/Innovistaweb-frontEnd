import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfigProvider, Drawer, Modal } from "antd";
import {
  FiBookOpen,
  FiBriefcase,
  FiExternalLink,
  FiFolder,
  FiGrid,
  FiImage,
  FiKey,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiMessageSquare,
  FiShoppingBag,
  FiSliders,
  FiUsers,
} from "react-icons/fi";
import axios from "axios";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import Notification from "../pages/Adminpages/Notification";
import PasswordReset from "./PasswordReset";
import {
  ADMIN_NAV_ITEMS,
  formatCurrencyLkr,
  getActiveAdminNavKey,
  getAdminBreadcrumb,
} from "../utils/adminPortalHelpers";

export interface AdminSummaryStats {
  admins: number;
  designs: number;
  categories?: number;
  customers: number;
  verifiedCustomers: number;
  orders: number;
  pendingOrders: number;
  completedOrders: number;
  projects: number;
  totalProjectBudget: number;
  feedbacks: number;
  unreadNotifications: number;
}

export interface ShellActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

interface AdminPortalShellProps {
  children: React.ReactNode;
  sectionCode?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  bannerLeftTitle?: string;
  bannerLeftLines?: Array<{ label: string; value: string }>;
  bannerRightTitle?: string;
  bannerRightLines?: string[];
  contextCardLabel?: string;
  contextTitle?: string;
  contextSubtitle?: string;
  contextMeta?: string;
  contextAvatar?: string;
  railTopAction?: ShellActionButton;
  kpiLabel?: string;
  kpiValue?: string | number;
  kpiNote?: string;
  kpiStatusText?: string;
  kpiStatusTone?: "navy" | "green" | "red";
  kpiFooterLabel?: string;
  kpiFooterValue?: string;
  railSecondaryLeft?: ShellActionButton;
  railSecondaryRight?: ShellActionButton;
  railPrimaryAction?: ShellActionButton;
  headerAction?: ShellActionButton;
  customRightRail?: React.ReactNode;
  refreshTrigger?: number | string;
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  overview: <FiGrid className="text-[15px]" />,
  designs: <FiLayers className="text-[15px]" />,
  categories: <FiFolder className="text-[15px]" />,
  customers: <FiUsers className="text-[15px]" />,
  orders: <FiShoppingBag className="text-[15px]" />,
  projects: <FiBriefcase className="text-[15px]" />,
  feedback: <FiMessageSquare className="text-[15px]" />,
  "about-cms": <FiSliders className="text-[15px]" />,
  ads: <FiImage className="text-[15px]" />,
  portals: <FiExternalLink className="text-[15px]" />,
  blogs: <FiBookOpen className="text-[15px]" />,
  chatbot: <FiMessageCircle className="text-[15px]" />,
};

const DEFAULT_AVATAR = "/assets/about/director.jpg";

export default function AdminPortalShell({
  children,
  sectionCode,
  sectionTitle,
  sectionSubtitle,
  bannerLeftTitle,
  bannerLeftLines,
  bannerRightTitle,
  bannerRightLines,
  contextCardLabel = "Active Admin",
  contextTitle,
  contextSubtitle,
  contextMeta,
  contextAvatar,
  railTopAction,
  kpiLabel,
  kpiValue,
  kpiNote,
  kpiStatusText,
  kpiStatusTone = "navy",
  kpiFooterLabel,
  kpiFooterValue,
  railSecondaryLeft,
  railSecondaryRight,
  railPrimaryAction,
  headerAction,
  customRightRail,
  refreshTrigger,
}: AdminPortalShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [summary, setSummary] = useState<AdminSummaryStats>({
    admins: 2,
    designs: 4,
    customers: 2,
    verifiedCustomers: 2,
    orders: 2,
    pendingOrders: 1,
    completedOrders: 1,
    projects: 4,
    totalProjectBudget: 44000000,
    feedbacks: 2,
    unreadNotifications: 2,
  });

  useEffect(() => {
    let active = true;
    AxiosConfig.get<AdminSummaryStats>("/admin/summary")
      .then((res) => {
        if (active && res.data) {
          setSummary(res.data);
        }
      })
      .catch(() => {
        // Keep last known summary quietly
      });
    return () => {
      active = false;
    };
  }, [location.pathname, refreshTrigger]);

  const activeNavKey = getActiveAdminNavKey(location.pathname);
  const breadcrumb = getAdminBreadcrumb(location.pathname);

  const adminName = user?.name || "Super Admin";
  const adminEmail = user?.email || "admin@innovista.com";
  const adminOrg = user?.company || "Innovista Fabriconix HQ";
  const adminPhoto = contextAvatar || user?.logo || DEFAULT_AVATAR;

  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const handleLogout = async () => {
    try {
      await axios.post(`/auth/logout?adminId=${user?.id || 1}`);
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      logout();
      navigate("/profile-login", { replace: true });
    }
  };

  const resolvedTitle = sectionTitle || breadcrumb.title;
  const resolvedSubtitle = sectionSubtitle || breadcrumb.subtitle;
  const resolvedBannerLeftTitle = bannerLeftTitle || sectionCode || breadcrumb.current;
  const resolvedBannerLeftLines = bannerLeftLines || [
    { label: "Pending Orders", value: String(summary.pendingOrders) },
    { label: "Active Designs", value: String(summary.designs) },
    { label: "Verified Clients", value: `${summary.verifiedCustomers} / ${summary.customers}` },
  ];
  const resolvedBannerRightTitle = bannerRightTitle || "Portal Operator";
  const resolvedBannerRightLines = bannerRightLines || [
    adminName,
    adminEmail,
    "Colombo 07, Sri Lanka",
  ];

  const resolvedKpiLabel = kpiLabel || "Total Orders Tracked";
  const resolvedKpiValue =
    kpiValue !== undefined ? kpiValue : `${summary.orders}`;
  const resolvedKpiNote = kpiNote || `${summary.completedOrders} completed`;
  const resolvedKpiStatus =
    kpiStatusText || `${summary.pendingOrders} pending fulfillment`;
  const resolvedFooterLabel = kpiFooterLabel || "Portfolio Value";
  const resolvedFooterValue =
    kpiFooterValue || formatCurrencyLkr(summary.totalProjectBudget);

  const statusToneClasses =
    kpiStatusTone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
      : kpiStatusTone === "red"
        ? "bg-red-50 text-[#E60000] border-red-200/70"
        : "bg-sky-50 text-[#22577A] border-sky-200/80";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#22577A",
          colorLink: "#3393B8",
          borderRadius: 10,
          fontFamily: "'Inter', system-ui, sans-serif",
        },
      }}
    >
      <div className="min-h-screen bg-[#F5F7FA] text-[#14171A] flex flex-col">
        {/* Top Horizontal Navigation Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90">
          <div className="max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
            {/* Left Brand Wordmark */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open admin menu"
                className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <FiMenu className="text-[18px]" />
              </button>

              <Link
                to="/admin-home"
                className="flex items-center gap-2 no-underline group"
              >
                <span className="text-[19px] font-bold tracking-tight text-[#22577A]">
                  Innovista<span className="text-[#E60000]">.</span>
                </span>
              </Link>
            </div>

            {/* Center Horizontal Tab Navigation */}
            <div
              role="navigation"
              aria-label="Admin Portal Navigation"
              className="hidden lg:flex items-center h-full gap-0.5 min-w-0 overflow-x-auto"
            >
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = activeNavKey === item.key;
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={`relative h-full inline-flex items-center gap-1 px-1.5 text-[11px] xl:text-xs whitespace-nowrap shrink-0 no-underline transition-colors ${
                      isActive
                        ? "text-[#22577A] font-semibold"
                        : "text-slate-500 font-medium hover:text-[#22577A]"
                    }`}
                  >
                    <span className={isActive ? "text-[#22577A]" : "text-slate-400"}>
                      {NAV_ICONS[item.key]}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-1 right-1 h-[2.5px] rounded-t-full bg-[#22577A]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Utility Zone */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Notification />

              <Link
                to="/"
                title="View Public Storefront"
                aria-label="View Public Storefront"
                className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/90 hover:border-[#3393B8] hover:bg-white text-slate-600 hover:text-[#22577A] flex items-center justify-center transition-colors no-underline"
              >
                <FiExternalLink className="text-[15px]" />
              </Link>

              <button
                type="button"
                onClick={() => setResetOpen(true)}
                title="Reset Admin Password"
                aria-label="Reset Admin Password"
                className="hidden sm:flex w-9 h-9 rounded-full bg-slate-50 border border-slate-200/90 hover:border-[#3393B8] hover:bg-white text-slate-600 hover:text-[#22577A] items-center justify-center transition-colors cursor-pointer"
              >
                <FiKey className="text-[15px]" />
              </button>

              <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

              <div className="flex items-center gap-2.5">
                <img
                  src={adminPhoto}
                  alt={adminName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] hover:text-[#E60000] text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FiLogOut className="text-[13px]" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Subheader Section Label + Contextual Action (No path slash trail) */}
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-[13px] font-semibold text-slate-900">
              {breadcrumb.current}
            </div>

            {headerAction ? (
              <button
                type="button"
                onClick={headerAction.onClick}
                disabled={headerAction.disabled || headerAction.loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-slate-700 hover:text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {headerAction.icon}
                <span>{headerAction.loading ? "Saving..." : headerAction.label}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-slate-700 hover:text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FiKey className="text-[13px]" />
                <span>Reset Password</span>
              </button>
            )}
          </div>
        </div>

        {/* Main 2-Column SaaS Workspace Grid */}
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Primary Workspace Card (8 Columns) */}
            <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-7 min-w-0">
              {/* Workspace Identity Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#22577A] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                    I
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
                      {resolvedTitle}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {resolvedSubtitle}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-[11px] leading-relaxed text-slate-400 shrink-0 tabular-nums">
                  <div className="font-medium text-slate-500">Innovista Architectural Systems</div>
                  <div>Colombo 07, Sri Lanka</div>
                  <div>{todayLabel}</div>
                </div>
              </div>

              {/* Signature Innovista Gradient Command Banner */}
              <div
                className="relative rounded-2xl px-5 py-5 sm:px-6 sm:py-6 text-white overflow-hidden mb-6"
                style={{
                  background:
                    "linear-gradient(135deg, #22577A 0%, #2A6F95 52%, #3393B8 100%)",
                }}
              >
                {/* Geometric Subtle Curve Overlay Matching Reference Architecture */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 600 180"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                >
                  <circle cx="490" cy="30" r="140" fill="#FFFFFF" fillOpacity="0.22" />
                  <circle cx="130" cy="170" r="130" fill="#FFFFFF" fillOpacity="0.16" />
                  <path
                    d="M0 150 Q 220 40 420 120 T 600 60 L 600 180 L 0 180 Z"
                    fill="#FFFFFF"
                    fillOpacity="0.08"
                  />
                </svg>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <div className="text-[11px] font-medium text-sky-100/90 uppercase tracking-wider">
                      Portal Module
                    </div>
                    <div className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                      {resolvedBannerLeftTitle}
                    </div>
                    <div className="mt-2.5 space-y-1 text-xs text-sky-50/90">
                      {resolvedBannerLeftLines.map((line) => (
                        <div key={line.label} className="flex items-center gap-2">
                          <span className="text-sky-100/80">{line.label}:</span>
                          <span className="font-semibold text-white tabular-nums">
                            {line.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[11px] font-medium text-sky-100/90 uppercase tracking-wider">
                      {resolvedBannerRightTitle}
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-white">
                      {resolvedBannerRightLines.map((line, i) => (
                        <div
                          key={i}
                          className={
                            i === 0
                              ? "text-sm font-bold text-white"
                              : "text-sky-100/90"
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Page Workspace Content */}
              <div className="min-w-0">{children}</div>
            </section>

            {/* Right Inspector & Summary Rail (4 Columns) */}
            <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 min-w-0">
              {customRightRail ? (
                customRightRail
              ) : (
                <>
                  {/* Card 1: Active Context / Operator Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-slate-900">
                        {contextCardLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-[#3393B8] uppercase tracking-wider">
                        Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <img
                        src={adminPhoto}
                        alt={contextTitle || adminName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {contextTitle || adminName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {contextSubtitle || adminEmail}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3.5">
                      <div className="text-xs font-semibold text-slate-800">
                        {adminOrg}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {contextMeta || "Colombo 07 · Sri Lanka Operations"}
                      </div>

                      {railTopAction ? (
                        <button
                          type="button"
                          onClick={railTopAction.onClick}
                          disabled={railTopAction.disabled}
                          className="mt-4 w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] hover:bg-slate-50 text-xs font-semibold text-[#22577A] transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          {railTopAction.icon}
                          <span>{railTopAction.label}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/DesignAdded")}
                          className="mt-4 w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] hover:bg-slate-50 text-xs font-semibold text-[#22577A] transition-colors cursor-pointer"
                        >
                          Add Design
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Key Numeric Metric Highlight Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {resolvedKpiLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">Live</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {resolvedKpiValue}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({resolvedKpiNote})
                      </span>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusToneClasses}`}
                      >
                        {resolvedKpiStatus}
                      </span>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{resolvedFooterLabel}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {resolvedFooterValue}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Right Dual Secondary + Primary Action Cluster */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={
                          railSecondaryLeft
                            ? railSecondaryLeft.onClick
                            : () => navigate("/OrdermanageAdmin")
                        }
                        className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {railSecondaryLeft?.icon || <FiShoppingBag className="text-[13px]" />}
                        <span>{railSecondaryLeft?.label || "Orders"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={
                          railSecondaryRight
                            ? railSecondaryRight.onClick
                            : () => navigate("/EditVisionMission")
                        }
                        className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        {railSecondaryRight?.icon || <FiSliders className="text-[13px]" />}
                        <span>{railSecondaryRight?.label || "About CMS"}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={
                        railPrimaryAction
                          ? railPrimaryAction.onClick
                          : () => setResetOpen(true)
                      }
                      disabled={railPrimaryAction?.disabled || railPrimaryAction?.loading}
                      className="w-full py-3 px-4 rounded-xl bg-[#22577A] hover:bg-[#19435E] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {railPrimaryAction?.icon}
                      <span>
                        {railPrimaryAction?.loading
                          ? "Processing..."
                          : railPrimaryAction?.label || "Reset Password"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        <Drawer
          title={
            <span className="font-bold text-[#22577A]">
              Innovista<span className="text-[#E60000]">.</span> Admin
            </span>
          }
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          width={270}
        >
          <div className="space-y-1.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = activeNavKey === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium no-underline transition-colors ${
                    isActive
                      ? "bg-[#22577A] text-white font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{NAV_ICONS[item.key]}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setResetOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer bg-white"
            >
              <FiKey />
              <span>Reset Password</span>
            </button>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 no-underline bg-white"
            >
              <FiExternalLink />
              <span>View Public Site</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#E60000] text-white text-xs font-semibold cursor-pointer border-0"
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </Drawer>

        {/* Global Password Reset Modal */}
        <Modal
          title={<span className="font-bold text-slate-900">Reset Admin Password</span>}
          open={resetOpen}
          onCancel={() => setResetOpen(false)}
          footer={null}
          centered
        >
          <PasswordReset onSuccess={() => setResetOpen(false)} />
        </Modal>
      </div>
    </ConfigProvider>
  );
}
