import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App as AntdApp, Modal } from "antd";
import {
  FiBriefcase,
  FiFilm,
  FiKey,
  FiLayers,
  FiMessageSquare,
  FiPhone,
  FiPlus,
  FiSave,
  FiShield,
  FiShoppingBag,
  FiSliders,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import { useSiteSettings } from "../../Context/SiteSettingsContext";
import AdminPortalShell, { type AdminSummaryStats } from "../../components/AdminPortalShell";
import AdminRegisterForm from "../AdminRegisterForm";
import ManageAllAdmins from "./ManageAllAdmins";
import PasswordReset from "../../components/PasswordReset";
import HomeSlideshowEditor from "../../components/HomeSlideshowEditor";
import HomeServicesEditor from "../../components/HomeServicesEditor";
import HomeTopPicksEditor from "../../components/HomeTopPicksEditor";
import {
  validateSiteContactSettings,
  type SiteContactSettings,
} from "../../utils/footerConsultationHelpers";

interface AdminHomeProps {
  defaultMode?: "team" | "register" | "contact" | "slideshow" | "services" | "top-picks";
}

function AdminHome({ defaultMode = "team" }: AdminHomeProps) {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contactSettings, updateContactSettings } = useSiteSettings();
  const [activeMode, setActiveMode] = useState<
    "team" | "register" | "contact" | "slideshow" | "services" | "top-picks"
  >(() => {
    const t = searchParams.get("tab");
    if (
      t === "register" ||
      t === "slideshow" ||
      t === "services" ||
      t === "top-picks" ||
      t === "contact" ||
      t === "team"
    ) {
      return t;
    }
    return defaultMode;
  });
  const [heroSlidesCount, setHeroSlidesCount] = useState(6);
  const [servicesCount, setServicesCount] = useState(12);
  const [topPicksCount, setTopPicksCount] = useState(6);
  const [contactDraft, setContactDraft] = useState<SiteContactSettings>(contactSettings);
  const [savingContact, setSavingContact] = useState(false);
  const [adminRefresh, setAdminRefresh] = useState(0);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [stats, setStats] = useState<AdminSummaryStats>({
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
    const requested = searchParams.get("tab");
    if (
      requested === "register" ||
      requested === "slideshow" ||
      requested === "services" ||
      requested === "top-picks" ||
      requested === "contact" ||
      requested === "team"
    ) {
      setActiveMode(requested);
    } else {
      setActiveMode(defaultMode);
    }
  }, [searchParams, defaultMode]);

  const handleSelectMode = (
    mode: "team" | "register" | "contact" | "slideshow" | "services" | "top-picks"
  ) => {
    setActiveMode(mode);
    if (
      mode === "slideshow" ||
      mode === "services" ||
      mode === "top-picks" ||
      mode === "contact"
    ) {
      setSearchParams({ tab: mode });
    } else {
      setSearchParams({});
    }
  };

  const loadSummary = () => {
    AxiosConfig.get<AdminSummaryStats>("/admin/summary")
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {
        // Ignore transient failure
      });
    AxiosConfig.get<{ data?: { slides?: unknown[] } }>("/api/home-slideshow")
      .then((res) => {
        const slides = res.data?.data?.slides;
        if (Array.isArray(slides)) {
          setHeroSlidesCount(slides.length);
        }
      })
      .catch(() => {
        // Keep fallback count
      });
    AxiosConfig.get<{ data?: { items?: unknown[] } }>("/api/home-services")
      .then((res) => {
        const items = res.data?.data?.items;
        if (Array.isArray(items)) {
          setServicesCount(items.length);
        }
      })
      .catch(() => {
        // Keep fallback count
      });
    AxiosConfig.get<{ data?: { selectedProductIds?: unknown[] } }>(
      "/api/home-featured-products"
    )
      .then((res) => {
        const selected = res.data?.data?.selectedProductIds;
        if (Array.isArray(selected)) {
          setTopPicksCount(selected.length);
        }
      })
      .catch(() => {
        // Keep fallback count
      });
  };

  useEffect(() => {
    loadSummary();
  }, [adminRefresh]);

  useEffect(() => {
    setContactDraft(contactSettings);
  }, [contactSettings]);

  const handleSaveContactSettings = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateSiteContactSettings(contactDraft);
    if (Object.keys(errs).length > 0) {
      message.error(Object.values(errs)[0] || "Please check contact fields.");
      return;
    }
    try {
      setSavingContact(true);
      await updateContactSettings(contactDraft);
      message.success("Phone number and contact channels updated.");
    } catch {
      message.error("Could not update contact settings.");
    } finally {
      setSavingContact(false);
    }
  };

  const metricRows = [
    {
      label: "Designs",
      value: stats.designs,
      path: "/ViewAllDesigns",
      icon: <FiLayers className="text-[#22577A]" />,
    },
    {
      label: "Customers",
      value: stats.customers,
      path: "/CustomerManager",
      icon: <FiUsers className="text-[#3393B8]" />,
    },
    {
      label: "Orders",
      value: stats.orders,
      path: "/OrdermanageAdmin",
      icon: <FiShoppingBag className="text-[#22577A]" />,
    },
    {
      label: "Projects",
      value: stats.projects,
      path: "/AddProjects",
      icon: <FiBriefcase className="text-[#3393B8]" />,
    },
  ];

  return (
    <AdminPortalShell
      sectionCode="Overview & Team"
      sectionTitle="Admin Command Center"
      sectionSubtitle="Monitor portal operations, manage operator access, and launch workflows."
      refreshTrigger={adminRefresh}
      bannerLeftLines={[
        { label: "Active Admins", value: String(stats.admins) },
        { label: "Pending Orders", value: String(stats.pendingOrders) },
        { label: "Unread Alerts", value: String(stats.unreadNotifications) },
      ]}
      headerAction={{
        label: activeMode === "team" ? "Register Admin" : "View Admin Team",
        icon: <FiPlus className="text-[13px]" />,
        onClick: () =>
          setActiveMode((prev) => (prev === "team" ? "register" : "team")),
      }}
      railTopAction={{
        label: "Add New Design",
        icon: <FiPlus className="text-[13px]" />,
        onClick: () => navigate("/DesignAdded"),
      }}
      kpiLabel="Pending Orders"
      kpiValue={stats.pendingOrders}
      kpiNote={`${stats.orders} total`}
      kpiStatusText={`${stats.completedOrders} ${stats.completedOrders === 1 ? "completed order" : "completed orders"}`}
      kpiStatusTone={stats.pendingOrders > 0 ? "navy" : "green"}
      railSecondaryLeft={{
        label: "View Orders",
        icon: <FiShoppingBag className="text-[13px]" />,
        onClick: () => navigate("/OrdermanageAdmin"),
      }}
      railSecondaryRight={{
        label: "About CMS",
        icon: <FiSliders className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission"),
      }}
      railPrimaryAction={{
        label: "Reset Password",
        icon: <FiKey className="text-[14px]" />,
        onClick: () => setResetModalOpen(true),
      }}
    >
      {/* Clean Hairline Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200/80 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 mb-6 bg-slate-50/40">
        {metricRows.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className="p-3.5 text-left hover:bg-white transition-colors cursor-pointer first:rounded-tl-xl sm:first:rounded-l-xl last:rounded-br-xl sm:last:rounded-r-xl"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{item.label}</span>
              {item.icon}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {item.value}
            </div>
          </button>
        ))}
      </div>

      {/* Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {activeMode === "team"
              ? "Administrator Directory"
              : activeMode === "register"
              ? "Create New Admin"
              : activeMode === "slideshow"
              ? "Home Hero Slideshow (Videos, Images & Content)"
              : activeMode === "services"
              ? "What We Build For You (Services Carousel)"
              : activeMode === "top-picks"
              ? "Home Top Picks & Accessories Ribbon"
              : "Phone Number & Contact Setup"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeMode === "team"
              ? "Authorized operators with control panel access."
              : activeMode === "register"
              ? "Invite a new operator to the Innovista admin portal."
              : activeMode === "slideshow"
              ? "Add, edit, upload, or delete videos, photos, stats, and slide copy on the Home hero."
              : activeMode === "services"
              ? "Add, edit, upload, reorder, or delete the service cards and text in What We Build For You."
              : activeMode === "top-picks"
              ? "Select featured products shown on Home, customize product photos, and configure the Accessories Ribbon slideshow below."
              : "Configure the public phone number, WhatsApp, email, and social URLs shown in Footer & Contact."}
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => handleSelectMode("team")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "team"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admins ({stats.admins})
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("register")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "register"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            + Register
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("slideshow")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "slideshow"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiFilm className="text-xs" />
            <span>Home Slideshow ({heroSlidesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("services")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "services"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiLayers className="text-xs" />
            <span>What We Build ({servicesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("top-picks")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "top-picks"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiStar className="text-xs" />
            <span>Top Picks &amp; Accessories ({topPicksCount})</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/AdminFeedback")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap text-slate-600 hover:text-[#22577A] hover:bg-white"
          >
            <FiMessageSquare className="text-xs" />
            <span>Customer Feedbacks ({stats.feedbacks})</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("contact")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "contact"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FiPhone className="text-xs" />
            <span>Phone &amp; Contact</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/AdminSecurity")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap text-[#22577A] hover:bg-white"
          >
            <FiShield className="text-xs" />
            <span>Security, 2FA &amp; Audit CSV</span>
          </button>
        </div>
      </div>

      {activeMode === "team" ? (
        <ManageAllAdmins
          refreshTrigger={adminRefresh}
          onCountChange={(count) =>
            setStats((prev) => ({ ...prev, admins: count }))
          }
        />
      ) : activeMode === "register" ? (
        <AdminRegisterForm
          onSuccess={() => {
            setAdminRefresh((c) => c + 1);
            handleSelectMode("team");
          }}
        />
      ) : activeMode === "slideshow" ? (
        <HomeSlideshowEditor
          onCountChange={(count) => setHeroSlidesCount(count)}
        />
      ) : activeMode === "services" ? (
        <HomeServicesEditor
          onCountChange={(count) => setServicesCount(count)}
        />
      ) : activeMode === "top-picks" ? (
        <HomeTopPicksEditor
          onCountChange={(count) => setTopPicksCount(count)}
        />
      ) : (
        <form onSubmit={handleSaveContactSettings} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admin-contact-phone" className="block text-xs font-bold text-slate-700 mb-1">
                Public Phone Number
              </label>
              <input
                id="admin-contact-phone"
                type="tel"
                value={contactDraft.phone}
                onChange={(e) => setContactDraft((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+94 76 081 8098"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>
            <div>
              <label htmlFor="admin-contact-whatsapp" className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Number (digits with country code)
              </label>
              <input
                id="admin-contact-whatsapp"
                type="text"
                value={contactDraft.whatsapp}
                onChange={(e) => setContactDraft((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="94760818098"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>
            <div>
              <label htmlFor="admin-contact-email" className="block text-xs font-bold text-slate-700 mb-1">
                Consultation Receiver Email
              </label>
              <input
                id="admin-contact-email"
                type="email"
                value={contactDraft.email}
                onChange={(e) => setContactDraft((p) => ({ ...p, email: e.target.value }))}
                placeholder="innovistametal@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>
            <div>
              <label htmlFor="admin-contact-website" className="block text-xs font-bold text-slate-700 mb-1">
                Website Display Label
              </label>
              <input
                id="admin-contact-website"
                type="text"
                value={contactDraft.website}
                onChange={(e) => setContactDraft((p) => ({ ...p, website: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="admin-contact-address" className="block text-xs font-bold text-slate-700 mb-1">
                Showroom / Office Address
              </label>
              <input
                id="admin-contact-address"
                type="text"
                value={contactDraft.address}
                onChange={(e) => setContactDraft((p) => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingContact}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              <FiSave className="text-xs" />
              <span>{savingContact ? "Saving..." : "Save Contact Settings"}</span>
            </button>
          </div>
        </form>
      )}

      <Modal
        title={<span className="font-bold text-slate-900">Reset Admin Password</span>}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        centered
      >
        <PasswordReset onSuccess={() => setResetModalOpen(false)} />
      </Modal>
    </AdminPortalShell>
  );
}

export default AdminHome;
