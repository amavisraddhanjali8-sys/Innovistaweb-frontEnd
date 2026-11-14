import { Suspense, lazy, useEffect, useRef, useState, type FormEvent } from "react";
import { MotionConfig } from "framer-motion";
import { FiArrowRight, FiCheckCircle, FiSend } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import {
  buildFooterConsultationPayload,
  validateFooterConsultation,
} from "../utils/footerConsultationHelpers";
import {
  CONTACT_INTENT_OPTIONS,
  composeSplitFullName,
  getContactIntentMeta,
  splitFullName,
  type CharacterPoseId,
  type ContactFormIntentId,
} from "../utils/contactShowcaseHelpers";
import { CONTACT_DEPARTMENTS } from "../utils/siteContentHelpers";
import InteractiveContactShuffleCards from "./InteractiveContactShuffleCards";
import RequestQuoteButton from "./RequestQuoteButton";
import SiteVisitBookingCard from "./SiteVisitBookingCard";
import TactileActionButton from "./TactileActionButton";

const Contact3DCharacterStage = lazy(() => import("./Contact3DCharacterStage"));

export interface InteractiveContactSectionProps {
  variant?: "footer" | "page";
  idPrefix?: string;
}

type TouchedField = "firstName" | "email" | "phone" | "message";

export default function InteractiveContactSection({
  variant = "footer",
  idPrefix = "get-in-touch",
}: InteractiveContactSectionProps) {
  const { user } = useAuth();
  const { contactSettings } = useSiteSettings();
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const initialSplit = splitFullName(user?.name || "");
  const [firstName, setFirstName] = useState(initialSplit.firstName);
  const [lastName, setLastName] = useState(initialSplit.lastName);
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<ContactFormIntentId>("quote");
  const [department, setDepartment] = useState(
    getContactIntentMeta("quote").department
  );
  const [message, setMessage] = useState("");

  const [pose, setPose] = useState<CharacterPoseId>("handshake");

  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>(
    {}
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !firstName && !lastName) {
      const split = splitFullName(user.name);
      setFirstName(split.firstName);
      setLastName(split.lastName);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.name, user?.email, firstName, lastName, email]);

  const intentMeta = getContactIntentMeta(intent);
  const combinedName = composeSplitFullName(firstName, lastName);

  const formValues = {
    name: combinedName,
    email,
    phone,
    subject:
      variant === "page"
        ? `${department} — ${intentMeta.subjectPreset}`
        : intentMeta.subjectPreset,
    message,
  };

  const errors = validateFooterConsultation(formValues);
  const isFormValid = Object.keys(errors).length === 0;

  const visibleError = (field: TouchedField): string | undefined => {
    if (!touched[field] && !attemptedSubmit) return undefined;
    if (field === "firstName") return errors.name;
    return errors[field];
  };

  const markTouched = (field: TouchedField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleIntentToggle = (nextIntent: ContactFormIntentId) => {
    setIntent(nextIntent);
    const meta = getContactIntentMeta(nextIntent);
    setDepartment(meta.department);
    if (nextIntent === "callback") {
      setPose("call");
    } else if (nextIntent === "visit") {
      setPose("handshake");
    } else {
      setPose("quote");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!isFormValid) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      const basePayload = buildFooterConsultationPayload(formValues);
      const res = await AxiosConfig.post("/order/createOrder", {
        ...basePayload,
        Inquiry_Type:
          variant === "page" ? department : intentMeta.label,
      });
      const refCode = res.data?.data?.OrderID || "CON-SENT";
      setSubmittedRef(refCode);
      setPhone("");
      setMessage("");
      setTouched({});
      setAttemptedSubmit(false);
    } catch {
      setSubmitError("Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const firstNameError = visibleError("firstName");
  const emailError = visibleError("email");
  const phoneError = visibleError("phone");
  const messageError = visibleError("message");

  const inputBaseClass =
    "w-full px-4 py-3 rounded-xl border text-sm text-[#14171A] bg-[#FEF6F0] placeholder:text-[#8E8A87] focus:bg-white focus:outline-none transition-colors";

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid={`interactive-contact-${variant}`}
        className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-12 sm:py-16"
      >
        {/* Centered Header Inspired Directly by Screenshot 1 */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-[32px] sm:text-[42px] font-extrabold tracking-tight leading-tight text-[#14171A] m-0"
          >
            Get In{" "}
            <span className="bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#F97316] bg-clip-text text-transparent">
              Touch
            </span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#5F6672] font-medium m-0">
            Let&apos;s discuss your project
          </p>
        </div>

        {/* Two-Column Split: Left 3D Character & Shuffle Channel Deck | Right Clean Floating Form Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Borderless Animated 3D Character + Shuffle Deck */}
          <div className="lg:col-span-6 space-y-4">
            <Suspense
              fallback={
                <div className="w-full h-[340px] sm:h-[395px] flex items-center justify-center rounded-2xl bg-sky-50/40" />
              }
            >
              <Contact3DCharacterStage pose={pose} onChangePose={setPose} />
            </Suspense>

            <InteractiveContactShuffleCards
              settings={contactSettings}
              onSelectIntent={(selected) => {
                handleIntentToggle(selected);
                firstInputRef.current?.focus();
              }}
            />
          </div>

          {/* Right Column: Elevated Floating White Card Matching Screenshot 1 */}
          <div className="lg:col-span-6">
            <div className="rounded-[28px] bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_20px_54px_-22px_rgba(34,87,122,0.22)]">
              {/* Interactive Intent Toggling Bar */}
              <div className="mb-5">

                <div
                  role="tablist"
                  aria-label="Inquiry mode"
                  className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] border border-slate-200/80"
                >
                  {CONTACT_INTENT_OPTIONS.map((option) => {
                    const active = intent === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => handleIntentToggle(option.id)}
                        className={`relative py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap cursor-pointer transition-all border-0 ${
                          active
                            ? "bg-gradient-to-r from-[#22577A] to-[#3393B8] text-white shadow-xs"
                            : "text-[#5F6672] hover:text-[#14171A] bg-transparent"
                        }`}
                      >
                        <span className="relative z-10">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {intent === "visit" ? (
                <SiteVisitBookingCard idPrefix={`${idPrefix}-visit`} />
              ) : submittedRef ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-[#14171A] m-0">
                    Message Received
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5F6672] m-0 max-w-md mx-auto">
                    Reference{" "}
                    <span className="font-bold text-[#22577A]">
                      {submittedRef}
                    </span>{" "}
                    has been routed to{" "}
                    <span className="font-semibold text-[#14171A]">
                      {variant === "page" ? department : intentMeta.department}
                    </span>
                    .
                  </p>
                  <div className="pt-2">
                    <TactileActionButton
                      tone="amber"
                      size="sm"
                      onClick={() => setSubmittedRef(null)}
                    >
                      Send Another Inquiry
                    </TactileActionButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* First Name & Last Name (Matching Screenshot 1 split row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`${idPrefix}-first-name`}
                        className="sr-only"
                      >
                        First Name
                      </label>
                      <input
                        ref={firstInputRef}
                        id={`${idPrefix}-first-name`}
                        name="firstName"
                        type="text"
                        required
                        aria-invalid={Boolean(firstNameError)}
                        value={firstName}
                        placeholder="First Name"
                        onBlur={() => markTouched("firstName")}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (!touched.firstName) markTouched("firstName");
                        }}
                        className={`${inputBaseClass} ${
                          firstNameError
                            ? "border-[#e60000]"
                            : "border-orange-100/80 focus:border-[#EA580C]"
                        }`}
                      />
                      {firstNameError && (
                        <p
                          role="alert"
                          className="text-[11px] text-[#e60000] mt-1 mb-0"
                        >
                          {firstNameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`${idPrefix}-last-name`}
                        className="sr-only"
                      >
                        Last Name
                      </label>
                      <input
                        id={`${idPrefix}-last-name`}
                        name="lastName"
                        type="text"
                        value={lastName}
                        placeholder="Last Name"
                        onChange={(e) => setLastName(e.target.value)}
                        className={`${inputBaseClass} border-orange-100/80 focus:border-[#EA580C]`}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label htmlFor={`${idPrefix}-email`} className="sr-only">
                      Email Address
                    </label>
                    <input
                      id={`${idPrefix}-email`}
                      name="email"
                      type="email"
                      required
                      aria-invalid={Boolean(emailError)}
                      value={email}
                      placeholder="Email Address"
                      onBlur={() => markTouched("email")}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (!touched.email) markTouched("email");
                      }}
                      className={`${inputBaseClass} ${
                        emailError
                          ? "border-[#e60000]"
                          : "border-orange-100/80 focus:border-[#EA580C]"
                      }`}
                    />
                    {emailError && (
                      <p
                        role="alert"
                        className="text-[11px] text-[#e60000] mt-1 mb-0"
                      >
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Phone Number (+ Optional Department selector on Contact Page) */}
                  <div
                    className={
                      variant === "page"
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                        : ""
                    }
                  >
                    <div>
                      <label htmlFor={`${idPrefix}-phone`} className="sr-only">
                        Phone Number
                      </label>
                      <input
                        id={`${idPrefix}-phone`}
                        name="phone"
                        type="tel"
                        required
                        aria-invalid={Boolean(phoneError)}
                        value={phone}
                        placeholder="Phone Number"
                        onBlur={() => markTouched("phone")}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (!touched.phone) markTouched("phone");
                        }}
                        className={`${inputBaseClass} ${
                          phoneError
                            ? "border-[#e60000]"
                            : "border-orange-100/80 focus:border-[#EA580C]"
                        }`}
                      />
                      {phoneError && (
                        <p
                          role="alert"
                          className="text-[11px] text-[#e60000] mt-1 mb-0"
                        >
                          {phoneError}
                        </p>
                      )}
                    </div>

                    {variant === "page" && (
                      <div>
                        <label
                          htmlFor={`${idPrefix}-department`}
                          className="sr-only"
                        >
                          Department
                        </label>
                        <select
                          id={`${idPrefix}-department`}
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className={`${inputBaseClass} border-orange-100/80 focus:border-[#EA580C]`}
                        >
                          {CONTACT_DEPARTMENTS.map((d) => (
                            <option key={d.id} value={d.title}>
                              {d.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Your Message */}
                  <div>
                    <label htmlFor={`${idPrefix}-message`} className="sr-only">
                      Your Message
                    </label>
                    <textarea
                      id={`${idPrefix}-message`}
                      name="message"
                      rows={5}
                      required
                      aria-invalid={Boolean(messageError)}
                      value={message}
                      placeholder="Your Message"
                      onBlur={() => markTouched("message")}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (!touched.message) markTouched("message");
                      }}
                      className={`${inputBaseClass} resize-none ${
                        messageError
                          ? "border-[#e60000]"
                          : "border-orange-100/80 focus:border-[#EA580C]"
                      }`}
                    />
                    {messageError && (
                      <p
                        role="alert"
                        className="text-[11px] text-[#e60000] mt-1 mb-0"
                      >
                        {messageError}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <p
                      role="alert"
                      className="text-xs font-medium text-[#e60000] m-0"
                    >
                      {submitError}
                    </p>
                  )}

                  {/* Full-width Tactile State-Driven Primary CTA Button */}
                  <TactileActionButton
                    type="submit"
                    size="lg"
                    fullWidth
                    loading={submitting}
                    loadingText="Sending..."
                    icon={<FiSend className="text-sm" />}
                  >
                    Send Message
                  </TactileActionButton>

                  {/* Secondary Full RFQ Trigger */}
                  <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                    <RequestQuoteButton as="link" to="/request-quote" size="sm">
                      <span>Request Quote</span>
                      <FiArrowRight className="text-xs" />
                    </RequestQuoteButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
