import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import logo from "../assets/Images/logo/CompanyLogo.png";
import styles from "../cssModules/Navbar.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faBars,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { Button, Dropdown, Avatar, message } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../Context/AuthContext";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
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

  return (
    <nav className={styles.navbar}>
      <div className={styles.logoContainer}>
        <img src={logo} alt="Company Logo" />
      </div>
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
          <span>
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
          className={({ isActive }) =>
            `${isActive ? styles.activeLink : styles.link} cursor-target flex items-center`
          }
        >
          <img
            width="28"
            height="28"
            src="https://img.icons8.com/badges/48/shopping-cart.png"
            alt="shopping-cart"
          />
        </NavLink>

        {isLoggedIn && user ? (
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow trigger={["click"]}>
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
              <FontAwesomeIcon icon={faCaretDown} className="text-neutral-400 text-xs ml-0.5" />
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

      <button
        type="button"
        className={`${styles.showButton} ${isOpen ? styles.hidden : styles.visible} cursor-target`}
        onClick={() => setIsOpen(true)}
      >
        <FontAwesomeIcon icon={faBars} size="2xl" />
      </button>

      {isOpen && (
        <div className={styles.mobileMenu} ref={menuRef}>
          <div className={styles.mobileMenuHeader}>
            <img src={logo} alt="Company Logo" className={styles.mobileLogo} />
            <Button
              className={`${styles.closeBtn} cursor-target`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </Button>
          </div>
          <div className={styles.mobileLinks}>
            {isLoggedIn && user ? (
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3 mb-2">
                <div className="flex items-center gap-3">
                  <Avatar size={40} src={user.logo} icon={<UserOutlined />} className="bg-[#22577a]" />
                  <div>
                    <div className="font-bold text-neutral-900 text-sm">{user.name}</div>
                    <div className="text-xs text-neutral-500">{user.company || user.email}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200 text-sm">
                  <NavLink to="/profile" className={styles.link} onClick={handleLinkClick}>
                    👤 My Profile
                  </NavLink>
                  <NavLink to="/profile?tab=orders" className={styles.link} onClick={handleLinkClick}>
                    📦 My Orders & Quotations
                  </NavLink>
                  {user.role === "admin" && (
                    <NavLink to="/admin-home" className={styles.link} onClick={handleLinkClick}>
                      🛡️ Admin Dashboard
                    </NavLink>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                      message.success("Logged out");
                      navigate("/");
                    }}
                    className="text-left text-red-500 font-semibold cursor-pointer pt-1"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <NavLink
                to="/profile-login"
                className={({ isActive }) =>
                  `${isActive ? styles.activeLink : styles.link} cursor-target flex items-center gap-2 font-semibold text-base py-2`
                }
                onClick={handleLinkClick}
              >
                <UserOutlined className="text-[#22577a]" />
                <span>Profile Login / Sign In</span>
              </NavLink>
            )}

            <NavLink
              to="/"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              About Us
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              <span>
                Products
                <FontAwesomeIcon icon={faCaretDown} />
              </span>
            </NavLink>
            <NavLink
              to="/blogs"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Blogs
            </NavLink>
            <NavLink
              to="/news"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              News
            </NavLink>
            <NavLink
              to="/resources"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Resources
            </NavLink>
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Projects
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Contact
            </NavLink>
            <NavLink
              to="/OrderCart"
              className={({ isActive }) =>
                `${isActive ? styles.activeLink : styles.link} cursor-target`
              }
              onClick={handleLinkClick}
            >
              Order Cart
            </NavLink>
            <button
              className={`${styles.mobileQuoteBtn} cursor-target`}
              onClick={handleQuoteClick}
            >
              Get a Free Quote
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
