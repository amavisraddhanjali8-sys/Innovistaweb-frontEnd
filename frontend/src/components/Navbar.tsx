import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useState,
  useRef,
  useEffect,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  FiBookOpen,
  FiBox,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiHome,
  FiInfo,
  FiLayers,
  FiLogOut,
  FiMail,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiSend,
  FiSettings,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import { AiFillHome } from "react-icons/ai";
import { App as AntdApp, Dropdown, Avatar } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  SettingOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import logo from "../assets/Images/logo/CompanyLogo.png";
import titleMark from "../assets/Images/logo/titleImage.png";
import styles from "../cssModules/Navbar.module.css";
import { useAuth } from "../Context/AuthContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import { detectHorizontalSwipe } from "../utils/touchGestureHelpers";
import {
  PRODUCT_QUICK_CATEGORIES,
  resolveDesktopNavActiveKey,
  resolveMobileDockActiveKey,
  type DesktopNavKey,
  type MobileDockKey,
} from "../utils/mobileNavHelpers";

interface DesktopNavItem {
  key: DesktopNavKey;
  to: string;
  label: string;
  hasDropdown?: boolean;
}

const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
  { key: "home", to: "/", label: "Home" },
  { key: "about", to: "/about", label: "About Us" },
  { key: "products", to: "/products", label: "Products", hasDropdown: true },
  { key: "blogs", to: "/blogs", label: "Blogs" },
  { key: "news", to: "/news", label: "News" },
  { key: "resources", to: "/resources", label: "Resources" },
  { key: "projects", to: "/projects", label: "Projects" },
  { key: "contact", to: "/contact", label: "Contact" },
];

interface DrawerMenuItem {
  to: string;
  label: string;
  subtitle: string;
  Icon: typeof FiHome;
  exact?: boolean;
}

const DRAWER_EXPLORE_ITEMS: DrawerMenuItem[] = [
  {
    to: "/",
    label: "Home",
    subtitle: "Showroom & architectural overview",
    Icon: FiHome,
    exact: true,
  },
  {
    to: "/products",
    label: "Products & Systems",
    subtitle: "Doors, windows, facades & glazing",
    Icon: FiLayers,
  },
  {
    to: "/projects",
    label: "Projects Portfolio",
    subtitle: "Commercial & residential builds",
    Icon: FiBox,
  },
  {
    to: "/resources",
    label: "Resources & Specs",
    subtitle: "CAD profiles & technical datasheets",
    Icon: FiFileText,
  },
];

const DRAWER_COMPANY_ITEMS: DrawerMenuItem[] = [
  {
    to: "/about",
    label: "About Us",
    subtitle: "Engineering team & fabrication legacy",
    Icon: FiInfo,
  },
  {
    to: "/blogs",
    label: "Architectural Blogs",
    subtitle: "Design insights & facade engineering",
    Icon: FiBookOpen,
  },
  {
    to: "/news",
    label: "Company News",
    subtitle: "Announcements & showroom updates",
    Icon: FiFileText,
  },
  {
    to: "/contact",
    label: "Contact Desks",
    subtitle: "Book a site visit or reach our engineers",
    Icon: FiMail,
  },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredDesktopKey, setHoveredDesktopKey] = useState<DesktopNavKey | null>(null);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const productsCloseTimerRef = useRef<number | null>(null);
  const drawerTouchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntdApp.useApp();
  const { user, isLoggedIn, logout } = useAuth();

  const activeDesktopKey = resolveDesktopNavActiveKey(location.pathname);
  const activeMobileDockKey = resolveMobileDockActiveKey(location.pathname);

  const profileMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Customer Portal",
      onClick: () => navigate("/profile"),
    },
    {
      key: "orders",
      icon: <ShoppingOutlined />,
      label: "My Orders",
      onClick: () => navigate("/profile?tab=orders"),
    },
    {
      key: "rfqs",
      icon: <FileTextOutlined />,
      label: "Request for Quotations",
      onClick: () => navigate("/profile?tab=rfqs"),
    },
    {
      key: "site-visits",
      icon: <CalendarOutlined />,
      label: "Site Visit Schedules",
      onClick: () => navigate("/profile?tab=site-visits"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Edit Profile Details",
      onClick: () => navigate("/profile?tab=settings"),
    },
    ...(user?.role === "admin"
      ? [
          {
            key: "admin-home",
            icon: <DashboardOutlined />,
            label: "Admin Management Portal",
            onClick: () => navigate("/admin-home"),
          },
          {
            key: "admin-slideshow",
            icon: <SettingOutlined />,
            label: "Home Hero Slideshow",
            onClick: () => navigate("/admin-home?tab=slideshow"),
          },
          {
            key: "admin-services",
            icon: <SettingOutlined />,
            label: "What We Build Services",
            onClick: () => navigate("/admin-home?tab=services"),
          },
          {
            key: "admin-top-picks",
            icon: <SettingOutlined />,
            label: "Home Top Picks & Accessories",
            onClick: () => navigate("/admin-home?tab=top-picks"),
          },
        ]
      : []),
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Sign Out",
      onClick: () => {
        logout();
        message.success("Signed out successfully.");
        navigate("/");
      },
    },
  ];

  // Track scroll for frosted glass menu bar elevation
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route transitions
  useEffect(() => {
    setIsOpen(false);
    setProductsMenuOpen(false);
    setHoveredDesktopKey(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleDrawerTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    drawerTouchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const handleDrawerTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const start = drawerTouchRef.current;
    drawerTouchRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const dir = detectHorizontalSwipe(
      start.x,
      start.y,
      touch.clientX,
      touch.clientY,
      Date.now() - start.t
    );
    if (dir === "right") {
      setIsOpen(false);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
    setProductsMenuOpen(false);
  };

  const handleQuoteClick = () => {
    setIsOpen(false);
    setProductsMenuOpen(false);
    if (!isLoggedIn) {
      message.info("Please create a customer account to request a quotation.");
      navigate(buildSignupRedirectUrl("/request-quote", "rfq"));
      return;
    }
    navigate("/request-quote");
  };

  const openProductsDropdown = () => {
    if (productsCloseTimerRef.current) {
      window.clearTimeout(productsCloseTimerRef.current);
      productsCloseTimerRef.current = null;
    }
    setProductsMenuOpen(true);
  };

  const scheduleCloseProductsDropdown = () => {
    if (productsCloseTimerRef.current) {
      window.clearTimeout(productsCloseTimerRef.current);
    }
    productsCloseTimerRef.current = window.setTimeout(() => {
      setProductsMenuOpen(false);
    }, 150);
  };

  const mobileDockTabs: Array<{
    key: MobileDockKey;
    label: string;
    to: string;
  }> = [
    { key: "home", label: "Home", to: "/" },
    { key: "products", label: "Explore", to: "/products" },
    {
      key: "quote",
      label: "Quote",
      to: isLoggedIn ? "/request-quote" : buildSignupRedirectUrl("/request-quote", "rfq"),
    },
    { key: "contact", label: "Contact", to: "/contact" },
    {
      key: "profile",
      label: isLoggedIn ? "Account" : "Sign In",
      to: isLoggedIn ? "/profile" : "/profile-login",
    },
  ];

  const renderDockIcon = (key: MobileDockKey, active: boolean) => {
    switch (key) {
      case "home":
        return active ? (
          <AiFillHome className="text-[19px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
        ) : (
          <FiHome className="text-[18px] text-white/90 stroke-[2]" />
        );
      case "products":
        return (
          <FiSearch
            className={`text-[18px] text-white ${active ? "stroke-[2.6]" : "stroke-[2] opacity-90"}`}
          />
        );
      case "quote":
        return (
          <FiPlus
            className={`text-[21px] text-white ${active ? "stroke-[2.8]" : "stroke-[2.2] opacity-95"}`}
          />
        );
      case "contact":
        return (
          <FiMessageCircle
            className={`text-[18px] text-white ${active ? "stroke-[2.5]" : "stroke-[2] opacity-90"}`}
          />
        );
      case "profile":
        return isLoggedIn &&
          user?.logo &&
          !user.logo.toLowerCase().includes(".svg") &&
          !user.logo.includes("/assets/logos/") ? (
          <img
            src={user.logo}
            alt={user.name || "Profile"}
            className={`w-[20px] h-[20px] rounded-full object-cover border ${
              active ? "border-white ring-2 ring-white/40" : "border-white/75"
            }`}
          />
        ) : (
          <FiUser
            className={`text-[18px] text-white ${active ? "stroke-[2.6]" : "stroke-[2] opacity-90"}`}
          />
        );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <header
        className={`${styles.navbarOuter} ${
          isScrolled ? styles.navbarOuterScrolled : ""
        }`}
      >
        <nav className={styles.navbar} aria-label="Primary navigation">
          <NavLink to="/" className={styles.logoContainer} aria-label="Innovista Home">
            <img src={logo} alt="Innovista Fabriconix Logo" />
          </NavLink>

          {/* Enhanced Desktop & Tablet Menu Bar with Shared-Layout Spring Motion */}
          <div
            className={styles.links}
            onMouseLeave={() => setHoveredDesktopKey(null)}
          >
            {DESKTOP_NAV_ITEMS.map((item) => {
              const isActive = activeDesktopKey === item.key;
              const isHovered = hoveredDesktopKey === item.key;

              if (item.hasDropdown) {
                return (
                  <div
                    key={item.key}
                    className="relative flex items-center"
                    onMouseEnter={() => {
                      setHoveredDesktopKey(item.key);
                      openProductsDropdown();
                    }}
                    onMouseLeave={scheduleCloseProductsDropdown}
                  >
                    <NavLink
                      to={item.to}
                      className={`relative px-3 py-2 no-underline inline-flex items-center gap-1.5 transition-colors duration-150 ${
                        isActive || isHovered || productsMenuOpen
                          ? "!text-[#22577A] font-semibold"
                          : "!text-slate-700 hover:!text-[#22577A]"
                      }`}
                    >
                      <span>{item.label}</span>
                      <motion.span
                        animate={{ rotate: productsMenuOpen ? 180 : 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex items-center text-[13px]"
                      >
                        <FiChevronDown />
                      </motion.span>
                      {isActive && (
                        <motion.span
                          layoutId="desktop-nav-active-bar"
                          aria-hidden="true"
                          transition={{ type: "spring", stiffness: 460, damping: 34 }}
                          className="absolute left-3 right-3 -bottom-0.5 h-[2.5px] rounded-full bg-gradient-to-r from-[#22577A] to-[#0ea5e9]"
                        />
                      )}
                    </NavLink>

                    {/* Animated Products Systems Mega-Popover */}
                    <AnimatePresence>
                      {productsMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 420, damping: 30 }}
                          onMouseEnter={openProductsDropdown}
                          onMouseLeave={scheduleCloseProductsDropdown}
                          role="menu"
                          aria-label="Product system categories"
                          className="absolute top-full left-0 mt-2 w-[332px] rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_44px_-12px_rgba(15,23,42,0.2)] p-2.5 z-[1100]"
                        >
                          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
                            Architectural Glazing &amp; Aluminium
                          </div>
                          <div className="space-y-1">
                            {PRODUCT_QUICK_CATEGORIES.map((cat, idx) => {
                              const PopIcon =
                                idx === 0
                                  ? FiLayers
                                  : idx === 1
                                    ? FiBox
                                    : idx === 2
                                      ? FiShield
                                      : idx === 3
                                        ? FiBookOpen
                                        : FiFileText;
                              return (
                                <motion.div
                                  key={cat.to}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03, duration: 0.16 }}
                                >
                                  <NavLink
                                    to={cat.to}
                                    onClick={handleLinkClick}
                                    role="menuitem"
                                    className={({ isActive: catActive }) =>
                                      `group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl no-underline transition-colors ${
                                        catActive
                                          ? "bg-[#22577A]/10 !text-[#22577A]"
                                          : "hover:bg-slate-50 !text-slate-800"
                                      }`
                                    }
                                  >
                                    {({ isActive: catActive }) => (
                                      <>
                                        <span className="flex items-center gap-2.5 min-w-0">
                                          <span
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                              catActive
                                                ? "bg-[#22577A] text-white"
                                                : "bg-slate-100 text-[#22577A] group-hover:bg-sky-50"
                                            }`}
                                          >
                                            <PopIcon className="text-sm" />
                                          </span>
                                          <span className="min-w-0">
                                            <span
                                              className={`block text-[13px] font-semibold leading-tight truncate ${
                                                catActive ? "text-[#22577A]" : "text-slate-800"
                                              }`}
                                            >
                                              {cat.label}
                                            </span>
                                            <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                                              {cat.description}
                                            </span>
                                          </span>
                                        </span>
                                        <FiChevronRight className="text-slate-400 text-sm shrink-0" />
                                      </>
                                    )}
                                  </NavLink>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.to === "/"}
                  onMouseEnter={() => setHoveredDesktopKey(item.key)}
                  className={`relative px-3 py-2 no-underline inline-flex items-center transition-colors duration-150 ${
                    isActive || isHovered
                      ? "!text-[#22577A] font-semibold"
                      : "!text-slate-700 hover:!text-[#22577A]"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="desktop-nav-active-bar"
                      aria-hidden="true"
                      transition={{ type: "spring", stiffness: 460, damping: 34 }}
                      className="absolute left-3 right-3 -bottom-0.5 h-[2.5px] rounded-full bg-gradient-to-r from-[#22577A] to-[#0ea5e9]"
                    />
                  )}
                </NavLink>
              );
            })}

            {isLoggedIn && user ? (
              <Dropdown
                menu={{ items: profileMenuItems }}
                placement="bottomRight"
                arrow
                trigger={["click"]}
              >
                <button
                  type="button"
                  aria-label="Customer Profile Menu"
                  title={user.name}
                  data-testid="navbar-profile-icon"
                  className="ml-1 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-[#22577A] hover:bg-[#194563] text-white border border-[#22577A] transition-all p-0 shrink-0 overflow-hidden shadow-xs"
                >
                  {user.logo &&
                  !user.logo.toLowerCase().includes(".svg") &&
                  !user.logo.includes("/assets/logos/") ? (
                    <Avatar
                      size={38}
                      src={user.logo}
                      icon={<UserOutlined />}
                      className="bg-[#22577a] text-white shrink-0"
                    />
                  ) : (
                    <FiUser className="text-[18px]" />
                  )}
                </button>
              </Dropdown>
            ) : (
              <NavLink
                to="/profile-login"
                aria-label="Customer Sign In or Profile"
                title="Customer Portal & Sign In"
                data-testid="navbar-profile-icon"
                className={({ isActive }) =>
                  `ml-1 w-10 h-10 rounded-full flex items-center justify-center border transition-all no-underline shrink-0 ${
                    isActive
                      ? "bg-[#22577A] text-white border-[#22577A] shadow-sm"
                      : "bg-slate-50 text-[#22577a] border-slate-200 hover:bg-sky-50 hover:border-[#3393B8]"
                  }`
                }
              >
                <FiUser className="text-[18px]" />
              </NavLink>
            )}
          </div>

          <button
            className={`${styles.quoteBtn} request-quote-fx`}
            onClick={handleQuoteClick}
          >
            <span className="relative z-10">Request Quote</span>
          </button>

          {/* Mobile & Tablet Top-Right Controls (Profile + Animated Morphing Menu Trigger) */}
          <div className={styles.mobileControls}>
            <NavLink
              to={isLoggedIn && user ? "/profile" : "/profile-login"}
              aria-label={isLoggedIn ? "Customer Portal" : "Customer Sign In or Profile"}
              data-testid="mobile-navbar-profile-icon"
              className={`w-11 h-11 rounded-full border flex items-center justify-center no-underline overflow-hidden transition-all ${
                isLoggedIn && user
                  ? "bg-[#22577A] border-[#22577A] text-white shadow-xs"
                  : "bg-white border-slate-200 text-[#22577A] hover:border-[#3393B8]"
              }`}
            >
              {isLoggedIn &&
              user &&
              user.logo &&
              !user.logo.toLowerCase().includes(".svg") &&
              !user.logo.includes("/assets/logos/") ? (
                <Avatar
                  size={36}
                  src={user.logo}
                  icon={<UserOutlined />}
                  className="bg-[#22577a] text-white"
                />
              ) : (
                <FiUser className="text-[19px]" />
              )}
            </NavLink>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isOpen}
              data-testid="mobile-menu-toggle-btn"
              className={styles.showButton}
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <span className="relative w-5 h-4 flex flex-col justify-between items-center">
                <motion.span
                  animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-5 h-[2px] rounded-full bg-slate-800 block origin-center"
                />
                <motion.span
                  animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.15 }}
                  className="w-4 h-[2px] rounded-full bg-[#e60000] block self-end"
                />
                <motion.span
                  animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-5 h-[2px] rounded-full bg-slate-800 block origin-center"
                />
              </span>
            </motion.button>
          </div>
        </nav>
      </header>

      {/* Spring-Animated Slide-Out Menu Bar / Navigation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-[1121px]:hidden fixed inset-0 z-[1300] bg-slate-950/45 backdrop-blur-sm flex justify-end"
          >
            <motion.aside
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              data-testid="enhanced-menu-drawer"
              onTouchStart={handleDrawerTouchStart}
              onTouchEnd={handleDrawerTouchEnd}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 390, damping: 36 }}
              className="w-[min(88vw,360px)] h-full bg-white shadow-[-14px_0_40px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
            >
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logo}
                    alt="Innovista Logo"
                    className="h-8 w-auto shrink-0"
                  />
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close navigation menu"
                  onClick={() => setIsOpen(false)}
                  className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <FiX className="text-xl" />
                </motion.button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 space-y-5">
                {/* User Portal / Sign-In Card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04, duration: 0.2 }}
                >
                  {isLoggedIn && user ? (
                    <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size={42}
                          src={user.logo}
                          icon={<UserOutlined />}
                          className="bg-[#22577a] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {user.company || user.email}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/80">
                        <NavLink
                          to="/profile"
                          onClick={handleLinkClick}
                          className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-[#22577A] flex items-center gap-2 no-underline"
                        >
                          <FiUser className="text-[#22577A] shrink-0" />
                          <span className="truncate">Portal</span>
                        </NavLink>
                        <NavLink
                          to="/profile?tab=orders"
                          onClick={handleLinkClick}
                          className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-[#22577A] flex items-center gap-2 no-underline"
                        >
                          <FiBox className="text-[#22577A] shrink-0" />
                          <span className="truncate">Orders</span>
                        </NavLink>
                        <NavLink
                          to="/profile?tab=rfqs"
                          onClick={handleLinkClick}
                          className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-[#22577A] flex items-center gap-2 no-underline"
                        >
                          <FiFileText className="text-[#22577A] shrink-0" />
                          <span className="truncate">My RFQs</span>
                        </NavLink>
                        <NavLink
                          to="/profile?tab=site-visits"
                          onClick={handleLinkClick}
                          className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-[#22577A] flex items-center gap-2 no-underline"
                        >
                          <FiCalendar className="text-[#22577A] shrink-0" />
                          <span className="truncate">Site Visits</span>
                        </NavLink>
                      </div>

                      {user.role === "admin" && (
                        <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200/80">
                          <NavLink
                            to="/admin-home"
                            onClick={handleLinkClick}
                            className="min-h-[42px] px-3 py-2 rounded-xl bg-[#22577A]/10 text-[#22577A] text-xs font-semibold flex items-center justify-between no-underline"
                          >
                            <span className="flex items-center gap-2">
                              <FiShield className="shrink-0" />
                              <span>Admin Management Portal</span>
                            </span>
                            <FiChevronRight />
                          </NavLink>
                          <NavLink
                            to="/BlogsAdmin"
                            onClick={handleLinkClick}
                            className="min-h-[42px] px-3 py-2 rounded-xl bg-white border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center justify-between no-underline"
                          >
                            <span className="flex items-center gap-2">
                              <FiSettings className="shrink-0 text-[#22577A]" />
                              <span>Blogger &amp; Home Blogs</span>
                            </span>
                            <FiChevronRight className="text-slate-400" />
                          </NavLink>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                          message.success("Signed out");
                          navigate("/");
                        }}
                        className="w-full min-h-[42px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[#e60000] font-semibold cursor-pointer bg-red-50/70 border border-red-100 hover:bg-red-100/80 transition-colors"
                      >
                        <FiLogOut className="shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <NavLink
                      to="/profile-login"
                      onClick={handleLinkClick}
                      className="min-h-[52px] flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-sky-50/60 border border-slate-200/90 !text-slate-900 no-underline hover:border-[#22577A]/40 transition-colors"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-[#22577A] text-white flex items-center justify-center shrink-0">
                          <FiUser className="text-base" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 leading-tight">
                            Client &amp; Admin Sign In
                          </span>
                          <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                            Orders, quotes &amp; showroom visits
                          </span>
                        </span>
                      </span>
                      <FiChevronRight className="text-slate-400 shrink-0" />
                    </NavLink>
                  )}
                </motion.div>

                {/* Grouped Section 1: Explore Architecture */}
                <div className="space-y-1.5">
                  <div className="px-2 text-[11px] font-semibold text-slate-400">
                    Explore Systems
                  </div>
                  {DRAWER_EXPLORE_ITEMS.map(({ to, label, subtitle, Icon, exact }, idx) => (
                    <motion.div
                      key={to}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.06 + idx * 0.035,
                        duration: 0.22,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <NavLink
                        to={to}
                        end={exact}
                        onClick={handleLinkClick}
                        className={({ isActive }) =>
                          `min-h-[52px] flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl no-underline transition-colors ${
                            isActive
                              ? "bg-[#e60000]/8 !text-[#c80013]"
                              : "!text-slate-800 hover:bg-slate-50"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? "bg-[#e60000] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon className="text-base" />
                              </span>
                              <span className="min-w-0">
                                <span
                                  className={`block text-sm font-semibold leading-tight ${
                                    isActive ? "text-[#c80013]" : "text-slate-800"
                                  }`}
                                >
                                  {label}
                                </span>
                                <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                                  {subtitle}
                                </span>
                              </span>
                            </span>
                            <FiChevronRight
                              className={`text-sm shrink-0 ${
                                isActive ? "text-[#e60000]" : "text-slate-300"
                              }`}
                            />
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>

                {/* Grouped Section 2: Company & Support */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="px-2 pt-2 text-[11px] font-semibold text-slate-400">
                    Company &amp; Support
                  </div>
                  {DRAWER_COMPANY_ITEMS.map(({ to, label, subtitle, Icon }, idx) => (
                    <motion.div
                      key={to}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.2 + idx * 0.035,
                        duration: 0.22,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <NavLink
                        to={to}
                        onClick={handleLinkClick}
                        className={({ isActive }) =>
                          `min-h-[52px] flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl no-underline transition-colors ${
                            isActive
                              ? "bg-[#e60000]/8 !text-[#c80013]"
                              : "!text-slate-800 hover:bg-slate-50"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? "bg-[#e60000] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon className="text-base" />
                              </span>
                              <span className="min-w-0">
                                <span
                                  className={`block text-sm font-semibold leading-tight ${
                                    isActive ? "text-[#c80013]" : "text-slate-800"
                                  }`}
                                >
                                  {label}
                                </span>
                                <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                                  {subtitle}
                                </span>
                              </span>
                            </span>
                            <FiChevronRight
                              className={`text-sm shrink-0 ${
                                isActive ? "text-[#e60000]" : "text-slate-300"
                              }`}
                            />
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Pinned Bottom CTA in Menu Drawer */}
              <div className="p-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200/80 bg-white shrink-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className={`${styles.mobileQuoteBtn} flex items-center justify-center gap-2`}
                  onClick={handleQuoteClick}
                >
                  <FiSend className="text-base" />
                  <span>Request Custom Quote</span>
                </motion.button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MOBILE-ONLY FLOATING CRIMSON CAPSULE NAVIGATION DOCK
          Inspired directly by uploaded mobile dock design + Innovista identity
         ===================================================================== */}
      <nav
        aria-label="Mobile quick navigation"
        data-testid="mobile-floating-dock"
        className="md:hidden fixed bottom-[calc(10px+env(safe-area-inset-bottom,0px))] left-2.5 right-2.5 mx-auto max-w-[420px] h-[60px] rounded-full z-50 pl-2 pr-2.5 py-1.5 flex items-center bg-gradient-to-br from-[#df0619] via-[#ca0013] to-[#a70010] border border-white/20 shadow-[0_14px_30px_-6px_rgba(190,0,20,0.48),0_4px_12px_rgba(15,23,42,0.18)]"
      >
        {/* Subtle glossy dome sheen along top rim */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-[1px] h-[1px] rounded-full bg-white/35"
        />

        {/* Left Circular White Brand Emblem Badge */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          aria-label="Innovista Home"
          data-testid="mobile-dock-brand-btn"
          onClick={() => {
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="w-[46px] h-[46px] rounded-full bg-white shrink-0 flex items-center justify-center p-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.22)] cursor-pointer border-0"
        >
          <img
            src={titleMark}
            alt="Innovista"
            className="w-7 h-7 object-contain"
          />
        </motion.button>

        {/* 5 Distributed Dock Tabs with Spring-Sliding Arch Card & White Dot */}
        <div className="grid grid-cols-5 flex-1 items-center h-full ml-1.5">
          {mobileDockTabs.map((tab) => {
            const isActive = activeMobileDockKey === tab.key;
            return (
              <motion.button
                key={tab.key}
                type="button"
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                data-testid={`mobile-dock-tab-${tab.key}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(tab.to)}
                className="relative h-full min-h-[46px] flex flex-col items-center justify-center bg-transparent border-0 cursor-pointer px-0.5 select-none"
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-dock-active-arch"
                    aria-hidden="true"
                    transition={{ type: "spring", stiffness: 440, damping: 32 }}
                    className="absolute inset-x-0.5 -top-[3px] -bottom-[2px] rounded-t-[18px] rounded-b-[14px] bg-white/18 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),0_4px_10px_rgba(0,0,0,0.16)]"
                  />
                )}

                <span className="relative z-10 flex flex-col items-center justify-center leading-none -mt-[1px]">
                  <motion.span
                    animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    className="inline-flex items-center justify-center"
                  >
                    {renderDockIcon(tab.key, isActive)}
                  </motion.span>
                  <span
                    className={`mt-[3px] text-[10px] tracking-tight whitespace-nowrap leading-none ${
                      isActive ? "font-semibold text-white" : "font-medium text-white/90"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="mobile-dock-active-dot"
                      aria-hidden="true"
                      transition={{ type: "spring", stiffness: 460, damping: 32 }}
                      className="mt-[3px] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.75)]"
                    />
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </MotionConfig>
  );
}
