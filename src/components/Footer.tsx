import { Link, useLocation } from "react-router-dom";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import companyLogo from "../assets/Images/logo/CompanyLogo.png";
import AnimatedSocialIcons from "./AnimatedSocialIcons";
import InteractiveContactSection from "./InteractiveContactSection";
import RequestQuoteButton from "./RequestQuoteButton";
import {
  FOOTER_LINK_COLUMNS,
  FOOTER_SERVICE_HIGHLIGHTS,
  formatTelHref,
} from "../utils/footerConsultationHelpers";

function Footer() {
  const location = useLocation();
  const { contactSettings } = useSiteSettings();
  const isContactPage = location.pathname === "/contact";

  return (
    <footer className="w-full bg-[#F8FAFC] text-[#14171A] border-t border-slate-200 overflow-hidden">
      {/* Upper Interactive 3D Character + Shuffle Deck + Get In Touch Form (suppressed on /contact to avoid duplicating Contact page section) */}
      {!isContactPage && (
        <InteractiveContactSection variant="footer" idPrefix="footer-contact" />
      )}

      {/* Slim Architectural Service Highlight Strip (from Image 2 dark contrast strip in Innovista navy) */}
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

      {/* Lower Rounded Footer Surface with Navigation Columns & Giant Brand Wordmark (Image 1 bottom) */}
      <div className="bg-gradient-to-r from-[#14171A] via-[#1B3A4E] to-[#22577A] pt-1">
        <div className="w-full rounded-t-[28px] sm:rounded-t-[36px] bg-gradient-to-br from-white via-[#F1F8FC] to-[#E2F1F8] pt-10 sm:pt-12 pb-20 md:pb-8 border-t border-white/80">
          <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
            {/* Multi-column Navigation + Direct Contact + Top-Right Social Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-7 pb-8 border-b border-slate-200/80">
              {FOOTER_LINK_COLUMNS.map((column) => (
                <div key={column.title} className="lg:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#14171A] mb-3.5 mt-0">
                    {column.title}
                  </h4>
                  <ul className="list-none p-0 m-0 space-y-2">
                    {column.items.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className="text-xs sm:text-[13px] text-[#5F6672] hover:text-[#22577A] transition-colors no-underline block"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="col-span-2 sm:col-span-1 lg:col-span-3 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#14171A] mb-1.5 mt-0">
                    Email
                  </h4>
                  <a
                    href={`mailto:${contactSettings.email}`}
                    className="text-xs sm:text-[13px] text-[#5F6672] hover:text-[#22577A] no-underline transition-colors"
                  >
                    {contactSettings.email}
                  </a>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#14171A] mb-1.5 mt-0">
                    Phone Number
                  </h4>
                  <a
                    href={formatTelHref(contactSettings.phone)}
                    className="text-xs sm:text-[13px] text-[#5F6672] hover:text-[#22577A] no-underline transition-colors"
                  >
                    {contactSettings.phone}
                  </a>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-2 lg:col-span-3 flex lg:justify-end items-start">
                <AnimatedSocialIcons
                  settings={contactSettings}
                  align="end"
                  keyPrefix="bottom"
                />
              </div>
            </div>

            {/* Oversized Architectural Brand Wordmark (Image 1 Hero Footer Signature) */}
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

              <p className="mt-4 text-[11px] sm:text-xs text-[#5F6672] text-center m-0">
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
