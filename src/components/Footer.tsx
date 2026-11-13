import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSend,
} from "react-icons/fi";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import companyLogo from "../assets/Images/logo/CompanyLogo.png";
import {
  FOOTER_CONTACT_DETAILS,
  FOOTER_LINK_COLUMNS,
  FOOTER_SERVICE_HIGHLIGHTS,
  buildFooterConsultationPayload,
  createInitialFooterConsultationValues,
  isFooterConsultationValid,
  validateFooterConsultation,
  type FooterConsultationValues,
} from "../utils/footerConsultationHelpers";

type TouchedField = keyof FooterConsultationValues;

const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com",
    Icon: FaLinkedinIn,
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com",
    Icon: FaFacebookF,
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com",
    Icon: FaInstagram,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: "https://wa.me/94112345678",
    Icon: FaWhatsapp,
  },
];

function Footer() {
  const { user } = useAuth();
  const [values, setValues] = useState<FooterConsultationValues>(() =>
    createInitialFooterConsultationValues({
      defaultName: user?.name,
      defaultEmail: user?.email,
    })
  );
  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>(
    {}
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      name: prev.name || user?.name || "",
      email: prev.email || user?.email || "",
    }));
  }, [user?.name, user?.email]);

  const errors = validateFooterConsultation(values);
  const isFormValid = isFooterConsultationValid(values);

  const visibleError = (field: TouchedField): string | undefined => {
    if (!touched[field] && !attemptedSubmit) return undefined;
    return errors[field];
  };

  const markTouched = (field: TouchedField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!isFormValid) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      const payload = buildFooterConsultationPayload(values);
      const res = await AxiosConfig.post("/order/createOrder", payload);
      const refCode = res.data?.data?.OrderID || "CON-SENT";
      setSubmittedRef(refCode);
      setValues(
        createInitialFooterConsultationValues({
          defaultName: user?.name,
          defaultEmail: user?.email,
        })
      );
      setTouched({});
      setAttemptedSubmit(false);
    } catch {
      setSubmitError("Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const nameError = visibleError("name");
  const emailError = visibleError("email");
  const phoneError = visibleError("phone");
  const messageError = visibleError("message");

  return (
    <footer className="w-full bg-[#F8FAFC] text-[#14171A] border-t border-slate-200 overflow-hidden">
      {/* Upper Split Consultation & Contact Block */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Consultation Heading, 2x2 Contact Info Grid, Social Circles */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-7">
            <div>
              <span className="inline-block text-[11px] font-bold tracking-[0.18em] uppercase text-[#e60000]">
                Contact Us
              </span>
              <h2
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="mt-2 text-[28px] sm:text-[36px] font-extrabold tracking-tight leading-[1.16] text-[#14171A] m-0"
              >
                Order a{" "}
                <span className="bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] bg-clip-text text-transparent">
                  free consultation
                </span>{" "}
                — our experts will find the best solution
              </h2>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#5F6672] max-w-md m-0">
                Discuss structural glazing specs, custom aluminium extrusions, site measurements, or turnkey commercial facade schedules with our engineers.
              </p>
            </div>

            {/* 2x2 Architectural Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#3393B8] flex items-center justify-center shrink-0 shadow-xs">
                  <FiPhone className="text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#14171A]">
                    Phone Number
                  </div>
                  <a
                    href={`tel:${FOOTER_CONTACT_DETAILS.phone.replace(/\s+/g, "")}`}
                    className="text-xs text-[#5F6672] hover:text-[#22577A] no-underline transition-colors block truncate mt-0.5"
                  >
                    {FOOTER_CONTACT_DETAILS.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#3393B8] flex items-center justify-center shrink-0 shadow-xs">
                  <FiMail className="text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#14171A]">
                    Email Address
                  </div>
                  <a
                    href={`mailto:${FOOTER_CONTACT_DETAILS.email}`}
                    className="text-xs text-[#5F6672] hover:text-[#22577A] no-underline transition-colors block truncate mt-0.5"
                  >
                    {FOOTER_CONTACT_DETAILS.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#3393B8] flex items-center justify-center shrink-0 shadow-xs">
                  <FiGlobe className="text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#14171A]">Website</div>
                  <Link
                    to="/products"
                    className="text-xs text-[#5F6672] hover:text-[#22577A] no-underline transition-colors block truncate mt-0.5"
                  >
                    {FOOTER_CONTACT_DETAILS.website}
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#3393B8] flex items-center justify-center shrink-0 shadow-xs">
                  <FiMapPin className="text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#14171A]">Address</div>
                  <span className="text-xs text-[#5F6672] block mt-0.5 leading-snug">
                    {FOOTER_CONTACT_DETAILS.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Action Circles */}
            <div className="flex items-center gap-2.5 pt-1">
              {SOCIAL_LINKS.map(({ id, label, href, Icon }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-110 text-white flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5 no-underline"
                >
                  <Icon className="text-sm" />
                </a>
              ))}
            </div>
          </div>

          {/* Right Column: Floating White Consultation Form Card */}
          <div className="lg:col-span-7">
            <div className="rounded-[24px] bg-white border border-slate-200/90 p-6 sm:p-7 shadow-[0_16px_42px_-20px_rgba(34,87,122,0.22)]">
              {submittedRef ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-[#14171A] m-0">
                    Consultation Request Sent
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5F6672] m-0 max-w-md mx-auto">
                    Reference{" "}
                    <span className="font-bold text-[#22577A]">{submittedRef}</span>{" "}
                    has been logged with our engineering desk.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSubmittedRef(null)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold cursor-pointer"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="footer-consult-name"
                        className="block text-xs font-bold text-slate-700 mb-1.5"
                      >
                        Your Name <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="footer-consult-name"
                        name="name"
                        type="text"
                        required
                        aria-invalid={Boolean(nameError)}
                        value={values.name}
                        placeholder="Enter your name"
                        onBlur={() => markTouched("name")}
                        onChange={(e) => {
                          setValues((prev) => ({ ...prev, name: e.target.value }));
                          if (!touched.name) markTouched("name");
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#14171A] bg-[#F4F7FA] focus:bg-white focus:outline-none transition-colors ${
                          nameError
                            ? "border-[#e60000]"
                            : "border-slate-200 focus:border-[#3393B8]"
                        }`}
                      />
                      {nameError && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="footer-consult-email"
                        className="block text-xs font-bold text-slate-700 mb-1.5"
                      >
                        Email <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="footer-consult-email"
                        name="email"
                        type="email"
                        required
                        aria-invalid={Boolean(emailError)}
                        value={values.email}
                        placeholder="Enter your email"
                        onBlur={() => markTouched("email")}
                        onChange={(e) => {
                          setValues((prev) => ({ ...prev, email: e.target.value }));
                          if (!touched.email) markTouched("email");
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#14171A] bg-[#F4F7FA] focus:bg-white focus:outline-none transition-colors ${
                          emailError
                            ? "border-[#e60000]"
                            : "border-slate-200 focus:border-[#3393B8]"
                        }`}
                      />
                      {emailError && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {emailError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="footer-consult-phone"
                        className="block text-xs font-bold text-slate-700 mb-1.5"
                      >
                        Phone Number <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="footer-consult-phone"
                        name="phone"
                        type="tel"
                        required
                        aria-invalid={Boolean(phoneError)}
                        value={values.phone}
                        placeholder="+94 77 123 4567"
                        onBlur={() => markTouched("phone")}
                        onChange={(e) => {
                          setValues((prev) => ({ ...prev, phone: e.target.value }));
                          if (!touched.phone) markTouched("phone");
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#14171A] bg-[#F4F7FA] focus:bg-white focus:outline-none transition-colors ${
                          phoneError
                            ? "border-[#e60000]"
                            : "border-slate-200 focus:border-[#3393B8]"
                        }`}
                      />
                      {phoneError && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {phoneError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="footer-consult-subject"
                        className="block text-xs font-bold text-slate-700 mb-1.5"
                      >
                        Subject (Optional)
                      </label>
                      <input
                        id="footer-consult-subject"
                        name="subject"
                        type="text"
                        value={values.subject}
                        placeholder="e.g. Curtain wall or sliding doors"
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, subject: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-[#14171A] bg-[#F4F7FA] focus:bg-white focus:border-[#3393B8] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="footer-consult-message"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Message <span className="text-[#e60000]">*</span>
                    </label>
                    <textarea
                      id="footer-consult-message"
                      name="message"
                      rows={3}
                      required
                      aria-invalid={Boolean(messageError)}
                      value={values.message}
                      placeholder="Enter your message or question if you have any"
                      onBlur={() => markTouched("message")}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, message: e.target.value }));
                        if (!touched.message) markTouched("message");
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#14171A] bg-[#F4F7FA] focus:bg-white focus:outline-none transition-colors resize-none ${
                        messageError
                          ? "border-[#e60000]"
                          : "border-slate-200 focus:border-[#3393B8]"
                      }`}
                    />
                    {messageError && (
                      <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                        {messageError}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <p role="alert" className="text-xs font-medium text-[#e60000] m-0">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100"
                  >
                    <FiSend className="text-sm" />
                    <span>{submitting ? "Sending..." : "Send Consultation Request"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slim Architectural Service Highlight Strip (from Image 2 dark contrast strip in Innovista navy) */}
      <div className="w-full bg-gradient-to-r from-[#14171A] via-[#1B3A4E] to-[#22577A] text-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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

          <Link
            to="/request-quote"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-110 text-white text-xs font-semibold shadow-sm border border-white/20 transition-all no-underline shrink-0"
          >
            <span>Open Full RFQ</span>
            <FiArrowRight className="text-xs" />
          </Link>
        </div>
      </div>

      {/* Lower Rounded Footer Surface with Navigation Columns & Giant Brand Wordmark (Image 1 bottom) */}
      <div className="bg-gradient-to-r from-[#14171A] via-[#1B3A4E] to-[#22577A] pt-1">
        <div className="w-full rounded-t-[28px] sm:rounded-t-[36px] bg-gradient-to-br from-white via-[#F1F8FC] to-[#E2F1F8] pt-10 sm:pt-12 pb-6 sm:pb-8 border-t border-white/80">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10">
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
                    href={`mailto:${FOOTER_CONTACT_DETAILS.email}`}
                    className="text-xs sm:text-[13px] text-[#5F6672] hover:text-[#22577A] no-underline transition-colors"
                  >
                    {FOOTER_CONTACT_DETAILS.email}
                  </a>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-[#14171A] mb-1.5 mt-0">
                    Phone Number
                  </h4>
                  <a
                    href={`tel:${FOOTER_CONTACT_DETAILS.phone.replace(/\s+/g, "")}`}
                    className="text-xs sm:text-[13px] text-[#5F6672] hover:text-[#22577A] no-underline transition-colors"
                  >
                    {FOOTER_CONTACT_DETAILS.phone}
                  </a>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-2 lg:col-span-3 flex lg:justify-end items-start gap-2.5">
                {SOCIAL_LINKS.map(({ id, label, href, Icon }) => (
                  <a
                    key={`bottom-${id}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-110 text-white flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5 no-underline shrink-0"
                  >
                    <Icon className="text-sm" />
                  </a>
                ))}
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
