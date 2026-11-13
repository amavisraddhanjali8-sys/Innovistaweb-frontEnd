import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  FiBookOpen,
  FiBox,
  FiFileText,
  FiHome,
  FiInfo,
  FiLayers,
  FiLogOut,
  FiMail,
  FiMenu,
  FiSend,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiUser,
  FiX,
} from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { Dropdown, Avatar, message } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import logo from "../assets/Images/logo/CompanyLogo.png";
import styles from "../cssModules/Navbar.module.css";
import { useAuth } from "../Context/AuthContext";

const MOBILE_BOTTOM_TABS = [
  { to: "/", label: "Home", Icon: FiHome, exact: true },
  { to: "/products", label: "Products", Icon: FiLayers, exact: false },
  { to: "/blogs", label: "Blogs", Icon: FiBookOpen, exact: false },
  { to: "/news", label: "News", Icon: FiFileText, exact: false },
  { to: "/request-quote", label: "Quote", Icon: FiSend, exact: false },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();

  const profileMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "My Profile",
      onClick: () => navigate("/profile"),
    },
    {
      key: "orders",
      icon: <ShoppingOutlined />,
      label: "My Orders & Quotations",
      onClick: () => navigate("/profile?tab=orders"),
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

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLinkClick = () => setIsOpen(false);

  const handleQuoteClick = () => {
    setIsOpen(false);
    navigate("/request-quote");
  };

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium no-underline transition-colors ${
      isActive
        ? "bg-[#22577A]/10 text-[#22577A] font-semibold"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <>
      <nav className={styles.navbar}>
        <NavLink to="/" className={styles.logoContainer} aria-label="Innovista Home">
          <img src={logo} alt="Innovista Fabriconix Logo" />
        </NavLink>

        <div className={styles.links}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            About Us
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            <span className="inline-flex items-center gap-1">
              Products
              <FontAwesomeIcon icon={faCaretDown} />
            </span>
          </NavLink>
          <NavLink
            to="/blogs"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            Blogs
          </NavLink>
          <NavLink
            to="/news"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            News
          </NavLink>
          <NavLink
            to="/resources"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            Resources
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            Projects
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target`
            }
          >
            Contact
          </NavLink>
          <NavLink
            to="/OrderCart"
            aria-label="Order Cart"
            className={({ isActive }) =>
              `${isActive ? styles.activeLink : styles.link} cursor-target flex items-center`
            }
          >
            <FiShoppingBag className="text-[20px] text-[#22577a]" />
          </NavLink>

          {isLoggedIn && user ? (
            <Dropdown
              menu={{ items: profileMenuItems }}
              placement="bottomRight"
              arrow
              trigger={["click"]}
            >
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-all border border-neutral-200 text-left -mt-1 cursor-target"
              >
                <Avatar
                  size={26}
                  src={user.logo}
                  icon={<UserOutlined />}
                  className="bg-[#22577a] text-white shrink-0"
                />
                <span className="font-bold text-neutral-800 text-xs truncate max-w-[90px]">
                  {user.name.split(" ")[0]}
                </span>
                <FontAwesomeIcon
                  icon={faCaretDown}
                  className="text-neutral-400 text-xs ml-0.5"
                />
              </button>
            </Dropdown>
          ) : (
            <NavLink
              to="/profile-login"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target flex items-center gap-1.5`
              }
            >
              <UserOutlined className="text-base text-[#22577a]" />
              <span>Profile</span>
            </NavLink>
          )}
        </div>

        <button
          className={`${styles.quoteBtn} cursor-target`}
          onClick={handleQuoteClick}
        >
          Get a Free Quote
        </button>

        {/* Mobile Right Quick Controls (Cart + 44px Hamburger Button) */}
        <div className={styles.mobileControls}>
          <NavLink
            to="/OrderCart"
            aria-label="Order Cart"
            className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#22577A] no-underline"
          >
            <FiShoppingBag className="text-[19px]" />
          </NavLink>
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
            className={`${styles.showButton} ${isOpen ? styles.hidden : styles.visible}`}
            onClick={() => setIsOpen(true)}
          >
            <FiMenu className="text-[21px]" />
          </button>
        </div>

        {/* Full-Height Mobile Navigation Drawer */}
        {isOpen && (
          <div className={styles.mobileBackdrop}>
            <div
              className={styles.mobileMenu}
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className={styles.mobileMenuHeader}>
                <img
                  src={logo}
                  alt="Innovista Logo"
                  className={styles.mobileLogo}
                />
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  className={styles.closeBtn}
                  onClick={() => setIsOpen(false)}
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className={styles.mobileLinks}>
                {isLoggedIn && user ? (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 mb-1">
                    <div className="flex items-center gap-3">
                      <Avatar
                        size={40}
                        src={user.logo}
                        icon={<UserOutlined />}
                        className="bg-[#22577a] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {user.company || user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t border-slate-200/80">
                      <NavLink
                        to="/profile"
                        className={drawerLinkClass}
                        onClick={handleLinkClick}
                      >
                        <FiUser className="text-[#22577A] shrink-0" />
                        <span>My Profile</span>
                      </NavLink>
                      <NavLink
                        to="/profile?tab=orders"
                        className={drawerLinkClass}
                        onClick={handleLinkClick}
                      >
                        <FiBox className="text-[#22577A] shrink-0" />
                        <span>My Orders &amp; Quotations</span>
                      </NavLink>
                      {user.role === "admin" && (
                        <>
                          <NavLink
                            to="/admin-home"
                            className={drawerLinkClass}
                            onClick={handleLinkClick}
                          >
                            <FiShield className="text-[#22577A] shrink-0" />
                            <span>Admin Dashboard</span>
                          </NavLink>
                          <NavLink
                            to="/BlogsAdmin"
                            className={drawerLinkClass}
                            onClick={handleLinkClick}
                          >
                            <FiSettings className="text-[#22577A] shrink-0" />
                            <span>Blogger &amp; Home Blogs</span>
                          </NavLink>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                          message.success("Signed out");
                          navigate("/");
                        }}
                        className="min-h-[44px] flex items-center gap-3 px-3.5 py-2 rounded-xl text-left text-sm text-[#e60000] font-semibold cursor-pointer bg-transparent border-0 hover:bg-red-50 transition-colors"
                      >
                        <FiLogOut className="shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <NavLink
                    to="/profile-login"
                    className={drawerLinkClass}
                    onClick={handleLinkClick}
                  >
                    <FiUser className="text-[#22577A] shrink-0" />
                    <span>Profile Login / Sign In</span>
                  </NavLink>
                )}

                <NavLink to="/" end className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiHome className="text-[#3393B8] shrink-0" />
                  <span>Home</span>
                </NavLink>
                <NavLink to="/about" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiInfo className="text-[#3393B8] shrink-0" />
                  <span>About Us</span>
                </NavLink>
                <NavLink to="/products" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiLayers className="text-[#3393B8] shrink-0" />
                  <span>Products &amp; Systems</span>
                </NavLink>
                <NavLink to="/blogs" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiBookOpen className="text-[#3393B8] shrink-0" />
                  <span>Architectural Blogs</span>
                </NavLink>
                <NavLink to="/news" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiFileText className="text-[#3393B8] shrink-0" />
                  <span>Company News</span>
                </NavLink>
                <NavLink to="/resources" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiBox className="text-[#3393B8] shrink-0" />
                  <span>Resources &amp; Specs</span>
                </NavLink>
                <NavLink to="/projects" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiLayers className="text-[#3393B8] shrink-0" />
                  <span>Projects Portfolio</span>
                </NavLink>
                <NavLink to="/contact" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiMail className="text-[#3393B8] shrink-0" />
                  <span>Contact Desks</span>
                </NavLink>
                <NavLink to="/OrderCart" className={drawerLinkClass} onClick={handleLinkClick}>
                  <FiShoppingBag className="text-[#3393B8] shrink-0" />
                  <span>Order Cart</span>
                </NavLink>

                <button
                  type="button"
                  className={styles.mobileQuoteBtn}
                  onClick={handleQuoteClick}
                >
                  Get a Free Quote
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Thumb-Zone Mobile Bottom Navigation Bar (56px height, keeps total fixed bars <= 15% on 844px mobile) */}
      <div
        role="navigation"
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      >
        {MOBILE_BOTTOM_TABS.map(({ to, label, Icon, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold no-underline transition-colors ${
                isActive ? "text-[#22577A]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon
                className={`text-[18px] ${
                  isActive ? "text-[#22577A]" : "text-slate-500"
                }`}
              />
              <span className="leading-none">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
}
