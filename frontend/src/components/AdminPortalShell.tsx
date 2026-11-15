import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { App as AntdApp, ConfigProvider, Drawer, Modal } from "antd";
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
  FiShield,
  FiShoppingBag,
  FiSliders,
  FiUsers,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import companyLogo from "../assets/Images/logo/CompanyLogo.png";
import Notification from "../pages/Adminpages/Notification";
import PasswordReset from "./PasswordReset";
import {
  ADMIN_NAV_ITEMS,
  getActiveAdminNavKey,
  getAdminBreadcrumb,
} from "../utils/adminPortalHelpers";
import { detectHorizontalSwipe } from "../utils/touchGestureHelpers";

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
  testId?: string;
}

export interface ShellStatItem {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "red" | "navy";
}

interface AdminPortalShellProps {
  children: React.ReactNode;
  sectionTitle?: string;
  stats?: ShellStatItem[];
  actions?: ShellActionButton[];
  primaryAction?: ShellActionButton;
  // Backwards-compatible legacy props mapped into the single-column workspace
  sectionCode?: string;
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
  overview: <FiGrid className="text-[13px]" />,
  designs: <FiLayers className="text-[13px]" />,
  categories: <FiFolder className="text-[13px]" />,
  customers: <FiUsers className="text-[13px]" />,
  orders: <FiShoppingBag className="text-[13px]" />,
  projects: <FiBriefcase className="text-[13px]" />,
  feedback: <FiMessageSquare className="text-[13px]" />,
  "about-cms": <FiSliders className="text-[13px]" />,
  ads: <FiImage className="text-[13px]" />,
  portals: <FiExternalLink className="text-[13px]" />,
  blogs: <FiBookOpen className="text-[13px]" />,
  chatbot: <FiMessageCircle className="text-[13px]" />,
  security: <FiShield className="text-[13px]" />,
};

const DEFAULT_AVATAR = "/assets/about/director.jpg";

export default function AdminPortalShell({
  children,
  sectionTitle,
  stats,
  actions,
  primaryAction,
  bannerLeftLines,
  contextAvatar,
  railTopAction,
  kpiLabel,
  kpiValue,
  railSecondaryLeft,
  railSecondaryRight,
  railPrimaryAction,
  headerAction,
  refreshTrigger,
}: AdminPortalShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const drawerTouchRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const [summary, setSummary] = useState<AdminSummaryStats>({
    admins: 0,
    designs: 0,
    customers: 0,
    verifiedCustomers: 0,
    orders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    projects: 0,
    totalProjectBudget: 0,
    feedbacks: 0,
    unreadNotifications: 0,
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

  const adminName = user?.name || "Admin";
  const adminPhoto = contextAvatar || user?.logo || DEFAULT_AVATAR;

  const handleLogout = async () => {
    try {
      await AxiosConfig.post("/auth/logout");
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      logout();
      navigate("/admin-login", { replace: true });
    }
  };

  const resolvedTitle = sectionTitle || breadcrumb.title;

  // Resolve clean stat strip without duplicate KPI cards or hero banner clutter
  const resolvedStats: ShellStatItem[] = (() => {
    if (stats && stats.length > 0) return stats;
    if (bannerLeftLines && bannerLeftLines.length > 0) {
      const mapped: ShellStatItem[] = bannerLeftLines.map((line) => ({
        label: line.label,
        value: line.value,
      }));
      if (kpiLabel && kpiValue !== undefined && mapped.length < 4) {
        mapped.push({ label: kpiLabel, value: kpiValue });
      }
      return mapped.slice(0, 4);
    }
    return [
      { label: "Admins", value: summary.admins },
      { label: "Designs", value: summary.designs },
      { label: "Orders", value: summary.orders },
      { label: "Alerts", value: summary.unreadNotifications },
    ];
  })();

  // Consolidate and deduplicate workspace header actions cleanly
  const resolvedPrimary = primaryAction || headerAction || railPrimaryAction;
  const rawSecondary: ShellActionButton[] = actions
    ? actions
    : [railSecondaryLeft, railSecondaryRight, railTopAction, railPrimaryAction].filter(
        (item): item is ShellActionButton => Boolean(item)
      );

  const seenLabels = new Set<string>();
  if (resolvedPrimary) {
    seenLabels.add(resolvedPrimary.label.trim().toLowerCase());
  }
  const resolvedSecondary = rawSecondary.filter((item) => {
    const key = item.label.trim().toLowerCase();
    if (!key || seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  const statGridCols =
    resolvedStats.length >= 5
      ? "grid-cols-2 sm:grid-cols-5"
      : resolvedStats.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : resolvedStats.length === 2
      ? "grid-cols-2"
      : "grid-cols-2 sm:grid-cols-4";

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
      <AntdApp>
        <div className="min-h-screen bg-[#F5F7FA] text-[#14171A] flex flex-col">
          {/* 2-Tier Admin Portal Header: Top Logo/Utility Bar + Dedicated Nav Bar */}
          <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
            {/* Tier 1: Company Logo (Left Corner) + Utility Controls (Right) */}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 shrink-0 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Menu"
                  className="lg:hidden w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 cursor-pointer shrink-0"
                >
                  <FiMenu className="text-[18px]" />
                </button>

                <Link
                  to="/admin-home"
                  aria-label="Admin Overview"
                  className="flex items-center no-underline shrink-0"
                >
                  <img
                    src={companyLogo}
                    alt="Innovista"
                    className="h-8 sm:h-9 w-auto object-contain block"
                  />
                </Link>
              </div>

              {/* Right Utility Bar */}
              <div className="flex items-center gap-2 shrink-0">
                <Notification />

                <Link
                  to="/"
                  title="Store"
                  aria-label="Store"
                  className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 hover:border-[#22577A] hover:bg-white text-slate-600 hover:text-[#22577A] flex items-center justify-center transition-colors no-underline"
                >
                  <FiExternalLink className="text-[14px]" />
                </Link>

                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  title="Password"
                  aria-label="Password"
                  className="hidden sm:flex w-9 h-9 rounded-full bg-slate-50 border border-slate-200 hover:border-[#22577A] hover:bg-white text-slate-600 hover:text-[#22577A] items-center justify-center transition-colors cursor-pointer"
                >
                  <FiKey className="text-[14px]" />
                </button>

                <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

                <img
                  src={adminPhoto}
                  alt={adminName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] hover:text-[#E60000] text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FiLogOut className="text-[13px]" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            {/* Tier 2: Dedicated Secondary Admin Navigation Bar */}
            <div className="hidden lg:block border-t border-slate-200/80 bg-slate-50/85">
              <nav
                aria-label="Admin Navigation"
                className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 h-11 flex items-center justify-between gap-0.5 xl:gap-1"
              >
                {ADMIN_NAV_ITEMS.map((item) => {
                  const isActive = activeNavKey === item.key;
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      className={`relative h-11 inline-flex items-center gap-1 xl:gap-1.5 px-1.5 xl:px-2.5 text-[11.5px] xl:text-[12.5px] whitespace-nowrap shrink-0 no-underline transition-colors ${
                        isActive
                          ? "text-[#22577A] font-semibold bg-white/90"
                          : "text-slate-600 font-medium hover:text-[#22577A] hover:bg-white/60"
                      }`}
                    >
                      <span className={isActive ? "text-[#22577A]" : "text-slate-400"}>
                        {NAV_ICONS[item.key]}
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#22577A]"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          {/* Single-Column Full-Width Admin Workspace */}
          <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-5">
            {/* Workspace Header Row: 1-Word Title + Deduplicated 1-Word Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
                {resolvedTitle}
              </h1>

              {(resolvedSecondary.length > 0 || resolvedPrimary) && (
                <div className="flex flex-wrap items-center gap-2">
                  {resolvedSecondary.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      disabled={action.disabled || action.loading}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:border-[#22577A] text-xs font-semibold text-slate-700 hover:text-[#22577A] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {action.icon}
                      <span>{action.loading ? "..." : action.label}</span>
                    </button>
                  ))}

                  {resolvedPrimary && (
                    <button
                      type="button"
                      data-testid={resolvedPrimary.testId}
                      onClick={resolvedPrimary.onClick}
                      disabled={resolvedPrimary.disabled || resolvedPrimary.loading}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#22577A] hover:bg-[#19435E] border border-[#22577A] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {resolvedPrimary.icon}
                      <span>{resolvedPrimary.loading ? "..." : resolvedPrimary.label}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Clean Hairline Summary Metrics Strip */}
            {resolvedStats.length > 0 && (
              <div
                className={`grid ${statGridCols} bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden`}
              >
                {resolvedStats.map((stat) => {
                  const valueToneClass =
                    stat.tone === "green"
                      ? "text-emerald-700"
                      : stat.tone === "red"
                      ? "text-[#E60000]"
                      : stat.tone === "navy"
                      ? "text-[#22577A]"
                      : "text-slate-900";
                  return (
                    <div key={stat.label} className="px-4 py-3">
                      <div className="text-[11px] font-medium text-slate-500">
                        {stat.label}
                      </div>
                      <div
                        className={`mt-0.5 text-lg font-bold tracking-tight tabular-nums ${valueToneClass}`}
                      >
                        {stat.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Flat Workspace Surface */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 min-w-0">
              {children}
            </section>
          </main>

          {/* Mobile Drawer Navigation */}
          <Drawer
            title={
              <img
                src={companyLogo}
                alt="Innovista"
                className="h-7 w-auto object-contain block"
              />
            }
            placement="left"
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            width={260}
          >
            <div
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) drawerTouchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
              }}
              onTouchEnd={(e) => {
                const start = drawerTouchRef.current;
                const t = e.changedTouches[0];
                drawerTouchRef.current = null;
                if (!start || !t) return;
                if (
                  detectHorizontalSwipe(
                    start.x,
                    start.y,
                    t.clientX,
                    t.clientY,
                    Date.now() - start.time
                  ) === "left"
                ) {
                  setMobileMenuOpen(false);
                }
              }}
            >
              <div className="space-y-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const isActive = activeNavKey === item.key;
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium no-underline transition-colors ${
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

              <div className="mt-5 pt-4 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setResetOpen(true);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer bg-white"
                >
                  <FiKey />
                  <span>Password</span>
                </button>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 no-underline bg-white"
                >
                  <FiExternalLink />
                  <span>Store</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#E60000] text-white text-xs font-semibold cursor-pointer border-0"
                >
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </Drawer>

          {/* Global Password Reset Modal */}
          <Modal
            title={<span className="font-bold text-slate-900">Password</span>}
            open={resetOpen}
            onCancel={() => setResetOpen(false)}
            footer={null}
            centered
            width="min(480px, calc(100vw - 24px))"
          >
            <PasswordReset onSuccess={() => setResetOpen(false)} />
          </Modal>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}
