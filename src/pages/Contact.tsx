import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
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
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import RequestQuoteModal from "../components/RequestQuoteModal";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import type { HeroSlide } from "../utils/aboutContentHelpers";
import {
  CONTACT_DEPARTMENTS,
  CONTACT_LOCATIONS,
  isContactPageFormValid,
  validateContactPageForm,
  type ContactPageFormValues,
} from "../utils/siteContentHelpers";

const CONTACT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "contact-hero-1",
    headline: "Contact Innovista",
    subheadline: "Sales desks, CAD support, fabrication plant, and showrooms across Sri Lanka.",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "contact-hero-2",
    headline: "Visit Our Showrooms",
    subheadline: "Inspect full-scale slim sliding doors, acoustic glass, and finishes in person.",
    image: "/assets/products/showroom.jpg",
  },
];

type TouchedField = keyof ContactPageFormValues;

export default function Contact() {
  const { user } = useAuth();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const [values, setValues] = useState<ContactPageFormValues>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    department: "Sales & Estimations",
    message: "",
  });
  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>(
    {}
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const errors = validateContactPageForm(values);
  const isFormValid = isContactPageFormValid(values);

  const getFieldError = (field: TouchedField): string | undefined => {
    if (!touched[field] && !attemptedSubmit) return undefined;
    return errors[field];
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!isFormValid) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await AxiosConfig.post("/order/createOrder", {
        Client_Name: values.name.trim(),
        Client_Email: values.email.trim(),
        Client_Number: values.phone.trim(),
        Inquiry_Type: values.department,
        Product_Name: `Direct Inquiry — ${values.department}`,
        Notes: values.message.trim(),
        Designs: [],
      });
      setSubmittedRef(res.data?.data?.OrderID || "CNT-SENT");
    } catch {
      setSubmitError("Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white flex flex-col">
      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        productName="Showroom Consultation & Measurement"
        defaultInquiryType="Site Measurement Visit"
      />

      <ShowcaseHeroSlideshow
        slides={CONTACT_HERO_SLIDES}
        slideshowSpeedMs={5000}
        ariaLabel="Contact Innovista locations"
        eyebrowText="Direct Channels"
      />

      {/* Section 1: Department Contact Desks */}
      <section className="w-full bg-white py-10 sm:py-12">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-10">
          <AboutTaglineHeading
            kicker="Speak With Specialists"
            heading="Department Desks"
            tagline="Call, email, or book a visit directly with the right team."
            align="center"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_DEPARTMENTS.map((dept) => (
              <div
                key={dept.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4 hover:border-[#3393B8]/60 hover:shadow-sm transition-all"
              >
                <div>
                  <h3
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="text-[16px] font-bold text-[#14171A] m-0"
                  >
                    {dept.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#5F6672] m-0 leading-relaxed">
                    {dept.role}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-[#3393B8] shrink-0" />
                      <span className="font-semibold">{dept.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiMail className="text-[#3393B8] shrink-0" />
                      <span className="truncate">{dept.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <FiClock className="text-slate-400 shrink-0" />
                      <span>{dept.hours}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${dept.phone.replace(/\s+/g, "")}`}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold no-underline"
                  >
                    Call Desk
                  </a>
                  <a
                    href={`mailto:${dept.email}`}
                    className="flex-1 text-center px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
                  >
                    Email
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Physical Locations & Showrooms */}
      <section className="w-full bg-[#F8FAFC] py-10 sm:py-12 border-y border-slate-200/80">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-10">
          <AboutTaglineHeading
            kicker="Showrooms & Plant"
            heading="Our Locations"
            tagline="Visit our showrooms or CNC manufacturing hub."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONTACT_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[11px] font-semibold text-[#22577A]">
                    {loc.badge}
                  </span>
                  <h3
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="mt-2.5 text-[17px] font-bold text-[#14171A] m-0"
                  >
                    {loc.name}
                  </h3>
                  <div className="mt-3 space-y-2 text-xs text-[#5F6672]">
                    <div className="flex items-start gap-2">
                      <FiMapPin className="text-[#3393B8] shrink-0 mt-0.5" />
                      <span>{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="text-[#3393B8] shrink-0" />
                      <span>{loc.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-[#3393B8] shrink-0" />
                      <span className="font-semibold text-[#14171A]">
                        {loc.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <a
                    href={loc.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
                  >
                    <span>Directions</span>
                    <FiExternalLink className="text-xs" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setQuoteModalOpen(true)}
                    className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer"
                  >
                    Book Visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Direct Message Form & Connected Portals */}
      <section className="w-full bg-white py-12">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-5">
            <AboutTaglineHeading
              kicker="Send a Message"
              heading="Direct Inquiry"
              tagline="Fast routing to sales, engineering, or client care."
              align="left"
              compact
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://wa.me/94774551200"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold no-underline"
              >
                <FaWhatsapp className="text-sm" />
                <span>WhatsApp Desk</span>
              </a>
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
              >
                <span>Open Full RFQ</span>
                <FiArrowRight className="text-xs" />
              </Link>
              <Link
                to="/resources"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
              >
                <span>Resources &amp; FAQs</span>
              </Link>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-slate-200 hover:border-[#3393B8] text-[#22577A] flex items-center justify-center no-underline"
              >
                <FaLinkedinIn className="text-xs" />
              </a>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-slate-200 hover:border-[#3393B8] text-[#22577A] flex items-center justify-center no-underline"
              >
                <FaFacebookF className="text-xs" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-slate-200 hover:border-[#3393B8] text-[#22577A] flex items-center justify-center no-underline"
              >
                <FaInstagram className="text-xs" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 sm:p-7">
              {submittedRef ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <h3 className="text-base font-bold text-[#14171A] m-0">
                    Inquiry Received
                  </h3>
                  <p className="text-xs text-[#5F6672] m-0">
                    Reference{" "}
                    <span className="font-bold text-[#22577A]">{submittedRef}</span>{" "}
                    routed to {values.department}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRef(null);
                      setValues((prev) => ({ ...prev, message: "" }));
                      setTouched({});
                      setAttemptedSubmit(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-xs font-semibold cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-page-name"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Full Name <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="contact-page-name"
                        type="text"
                        required
                        value={values.name}
                        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Your name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#14171A] focus:outline-none focus:border-[#3393B8]"
                      />
                      {getFieldError("name") && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {getFieldError("name")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-page-email"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Email <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="contact-page-email"
                        type="email"
                        required
                        value={values.email}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#14171A] focus:outline-none focus:border-[#3393B8]"
                      />
                      {getFieldError("email") && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {getFieldError("email")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-page-phone"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Phone <span className="text-[#e60000]">*</span>
                      </label>
                      <input
                        id="contact-page-phone"
                        type="tel"
                        required
                        value={values.phone}
                        onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="+94 77 123 4567"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#14171A] focus:outline-none focus:border-[#3393B8]"
                      />
                      {getFieldError("phone") && (
                        <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                          {getFieldError("phone")}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-page-department"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Department <span className="text-[#e60000]">*</span>
                      </label>
                      <select
                        id="contact-page-department"
                        value={values.department}
                        onChange={(e) =>
                          setValues((p) => ({ ...p, department: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#14171A] focus:outline-none focus:border-[#3393B8]"
                      >
                        {CONTACT_DEPARTMENTS.map((d) => (
                          <option key={d.id} value={d.title}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-page-message"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Message <span className="text-[#e60000]">*</span>
                    </label>
                    <textarea
                      id="contact-page-message"
                      rows={3}
                      required
                      value={values.message}
                      onBlur={() => setTouched((p) => ({ ...p, message: true }))}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder="How can our team help?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#14171A] focus:outline-none focus:border-[#3393B8] resize-none"
                    />
                    {getFieldError("message") && (
                      <p role="alert" className="text-[11px] text-[#e60000] mt-1 mb-0">
                        {getFieldError("message")}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <p role="alert" className="text-xs text-[#e60000] m-0">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs sm:text-sm font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSend className="text-xs" />
                    <span>{submitting ? "Sending..." : "Send Direct Message"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
