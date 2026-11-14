import { Suspense, lazy, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiGlobe,
  FiMail,
  FiMapPin,
} from "react-icons/fi";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import companyLogo from "../assets/Images/logo/CompanyLogo.png";
import AnimatedSocialIcons from "./AnimatedSocialIcons";
import FooterBuildingConstructionBg from "./FooterBuildingConstructionBg";
import InteractiveContactSection from "./InteractiveContactSection";
import RequestQuoteButton from "./RequestQuoteButton";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  FOOTER_LINK_COLUMNS,
  FOOTER_SERVICE_HIGHLIGHTS,
} from "../utils/footerConsultationHelpers";

const VintagePhone3DIcon = lazy(() => import("./VintagePhone3DIcon"));

function Footer() {
  const location = useLocation();
  const { contactSettings } = useSiteSettings();
  const lowerFooterHostRef = useRef<HTMLDivElement | null>(null);
  const isContactPage = location.pathname === "/contact";

  const websiteHref = contactSettings.website.startsWith("http")
    ? contactSettings.website
    : `https://${contactSettings.website}`;
  const showroomHours =
    contactSettings.showroomHours ||
    DEFAULT_SITE_CONTACT_SETTINGS.showroomHours ||
    "Mon – Sat · 8:30 AM – 6:00 PM";

  return (
    <footer className="w-full bg-[#F8FAFC] text-[#14171A] border-t border-slate-200 overflow-hidden">
      {/* Upper Interactive 3D Character + Shuffle Deck + Get In Touch Form */}
      {!isContactPage && (
        <InteractiveContactSection variant="footer" idPrefix="footer-contact" />
      )}

      {/* Slim Architectural Service Highlight Strip */}
      <div className="w-full bg-gradient-to-r from-[#14171A] via-[#1B3A4E] to-[#22577A] text-white">
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h3
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-base sm:text-lg font-bold text-white m-0"
            >
              Consult the architectural systems you need now!
            </h3>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-sky-100/90">
              {FOOTER_SERVICE_HIGHLIGHTS.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <FiCheckCircle className="text-[#5CB6D2] shrink-0" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          <RequestQuoteButton as="link" to="/request-quote" size="sm">
            <span>Request Quote</span>
            <FiArrowRight className="text-xs" />
          </RequestQuoteButton>
        </div>
      </div>

      {/* Lower Rounded Footer Surface with Soft Interactive Corporate Building Construction Motion */}
      <div className="bg-gradient-to-r from-[#14171A] via-[#1B3A4E] to-[#22577A] pt-1">
        <div
          ref={lowerFooterHostRef}
          className="relative overflow-hidden w-full rounded-t-[28px] sm:rounded-t-[36px] bg-gradient-to-br from-white via-[#F1F8FC] to-[#E2F1F8] pt-10 sm:pt-12 pb-20 md:pb-8 border-t border-white/80"
        >
          {/* Soft, non-harsh interactive building construction backdrop */}
          <FooterBuildingConstructionBg hostRef={lowerFooterHostRef} />

          <div className="relative z-10 w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
            {/* Upper Row: 4 Balanced Navigation Link Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pb-8 border-b border-slate-300/60">
              {FOOTER_LINK_COLUMNS.map((column) => (
                <div key={column.title}>
                  <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#14171A] mb-3.5 mt-0">
                    {column.title}
                  </h4>
                  <ul className="list-none p-0 m-0 space-y-2.5">
                    {column.items.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className="text-xs sm:text-[13px] font-medium text-[#3B4451] hover:text-[#22577A] transition-colors no-underline block"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Lower Row (below links, left-anchored): Simple Unboxed Contact Details + Blue/Red Gradient Phone */}
            <div className="py-7 border-b border-slate-300/60 grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-start lg:items-center">
              {/* Direct Hotline + Unboxed Blue & Red Gradient Telephone */}
              <div className="lg:col-span-4">
                <Suspense fallback={<div className="h-[82px]" />}>
                  <VintagePhone3DIcon
                    phone={contactSettings.phone}
                    whatsapp={contactSettings.whatsapp}
                    label="Direct Hotline"
                  />
                </Suspense>
              </div>

              {/* Simple Unboxed Contact Details */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <a
                  href={`mailto:${contactSettings.email}`}
                  className="group flex items-start gap-2.5 no-underline"
                >
                  <FiMail className="w-4 h-4 mt-0.5 text-[#22577A] group-hover:text-[#E60000] transition-colors shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#3B4451]">
                      Email Desk
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#14171A] group-hover:text-[#22577A] leading-snug break-all mt-0.5">
                      {contactSettings.email}
                    </span>
                  </div>
                </a>

                <Link
                  to="/contact"
                  className="group flex items-start gap-2.5 no-underline"
                >
                  <FiMapPin className="w-4 h-4 mt-0.5 text-[#E60000] group-hover:text-[#22577A] transition-colors shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#3B4451]">
                      Headquarters
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#14171A] group-hover:text-[#22577A] leading-snug break-words mt-0.5">
                      {contactSettings.address}
                    </span>
                  </div>
                </Link>

                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 no-underline"
                >
                  <FiGlobe className="w-4 h-4 mt-0.5 text-[#22577A] group-hover:text-[#E60000] transition-colors shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#3B4451]">
                      Official Portal
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#14171A] group-hover:text-[#22577A] leading-snug break-all mt-0.5">
                      {contactSettings.website}
                    </span>
                  </div>
                </a>

                <div className="flex items-start gap-2.5">
                  <FiClock className="w-4 h-4 mt-0.5 text-[#22577A] shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#3B4451]">
                      Showroom Hours
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#14171A] leading-snug break-words mt-0.5 tabular-nums">
                      {showroomHours}
                    </span>
                  </div>
                </div>
              </div>

              {/* Simple Unboxed Social Links */}
              <div className="lg:col-span-2 flex flex-col items-start lg:items-end gap-2">
                <div className="lg:text-right">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#14171A] m-0">
                    Follow Innovista
                  </h4>
                  <p className="text-[11px] text-[#3B4451] m-0 mt-0.5">
                    Project updates &amp; reels
                  </p>
                </div>
                <AnimatedSocialIcons
                  settings={contactSettings}
                  align="end"
                  size="sm"
                  keyPrefix="bottom"
                  variant="simple"
                />
              </div>
            </div>

            {/* Oversized Architectural Brand Wordmark */}
            <div className="pt-6 sm:pt-8 pb-4 flex flex-col items-center justify-center">
              <div
                aria-label="Innovista Fabriconix"
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 select-none text-center max-w-full"
              >
                <img
                  src={companyLogo}
                  alt="Innovista Logo"
                  className="h-9 sm:h-14 lg:h-20 w-auto object-contain shrink-0"
                />
                <span
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-[clamp(2rem,7.2vw,5.75rem)] font-black tracking-[-0.04em] leading-none text-[#14171A]"
                >
                  Innovista{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(to right, #e60000 0%, #6a2c40 25%, #22577a 55%, #3393B8 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Fabriconix
                  </span>
                </span>
              </div>

              <p className="mt-4 text-[11px] sm:text-xs font-medium text-[#3B4451] text-center m-0">
                Innovista Metal Fabriconix Pvt Ltd © {new Date().getFullYear()} All Rights Reserved · Architectural Aluminium &amp; Structural Glazing
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
