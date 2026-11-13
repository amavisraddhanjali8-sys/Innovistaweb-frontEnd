import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiMail,
  FiPhone,
  FiSend,
  FiTag,
  FiUser,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import {
  INQUIRY_TYPE_OPTIONS,
  buildOrderQuotePayload,
  createInitialQuoteFormValues,
  isQuoteModalFormValid,
  validateQuoteModalForm,
  type InquiryType,
  type QuoteModalErrors,
  type QuoteModalFormValues,
} from "../utils/quoteModalHelpers";

export interface RequestQuoteModalProps {
  open: boolean;
  onClose: () => void;
  productName?: string;
  productId?: string | number;
  categoryName?: string;
  accessoryName?: string;
  defaultInquiryType?: InquiryType;
  onSubmitted?: (orderId?: string) => void;
}

type TouchedField = "name" | "email" | "inquiryType" | "phone";

export default function RequestQuoteModal({
  open,
  onClose,
  productName,
  productId,
  categoryName,
  accessoryName,
  defaultInquiryType,
  onSubmitted,
}: RequestQuoteModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [values, setValues] = useState<QuoteModalFormValues>(() =>
    createInitialQuoteFormValues({
      defaultName: user?.name,
      defaultEmail: user?.email,
      defaultInquiryType,
      accessoryName,
    })
  );
  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(
      createInitialQuoteFormValues({
        defaultName: user?.name,
        defaultEmail: user?.email,
        defaultInquiryType,
        accessoryName,
      })
    );
    setTouched({});
    setAttemptedSubmit(false);
    setSubmitError("");
    setSubmittedOrderId(null);
  }, [open, user?.name, user?.email, defaultInquiryType, accessoryName]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const allErrors: QuoteModalErrors = validateQuoteModalForm(values);
  const isFormValid = isQuoteModalFormValid(values);

  const getFieldError = (field: TouchedField): string | undefined => {
    if (!touched[field] && !attemptedSubmit) return undefined;
    return allErrors[field];
  };

  const nameError = getFieldError("name");
  const emailError = getFieldError("email");
  const inquiryError = getFieldError("inquiryType");
  const phoneError = getFieldError("phone");

  const contextLabel = productName || categoryName;
  const fullRfqQuery = [
    productName ? `product=${encodeURIComponent(productName)}` : "",
    productId !== undefined ? `id=${encodeURIComponent(String(productId))}` : "",
    accessoryName ? `accessory=${encodeURIComponent(accessoryName)}` : "",
  ]
    .filter(Boolean)
    .join("&");
  const fullRfqPath = fullRfqQuery
    ? `/request-quote?${fullRfqQuery}`
    : "/request-quote";

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
      const payload = buildOrderQuotePayload(values, {
        productId,
        productName,
        categoryName,
        accessoryName,
      });
      const res = await AxiosConfig.post("/order/createOrder", payload);
      const createdId = res.data?.data?.OrderID || "RFQ-SENT";
      setSubmittedOrderId(createdId);
      onSubmitted?.(createdId);
    } catch {
      setSubmitError("Could not send your quote request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-quote-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-[#F8FAFC]">
          <div className="min-w-0">
            <h2
              id="request-quote-modal-title"
              className="text-lg font-extrabold text-slate-900 m-0 truncate"
            >
              Request Quote
            </h2>
            {contextLabel && (
              <p className="text-xs font-semibold text-[#22577A] mt-0.5 m-0 truncate">
                {contextLabel}
                {accessoryName ? ` · ${accessoryName}` : ""}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-[#e60000] border border-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <FiX className="text-base" />
          </button>
        </div>

        {/* Body */}
        {submittedOrderId ? (
          <div className="p-6 sm:p-7 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <FiCheckCircle className="text-2xl" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Quote Request Received
              </h3>
              <p className="text-xs text-slate-600 m-0">
                Reference{" "}
                <span className="font-bold text-[#22577A]">
                  {submittedOrderId}
                </span>{" "}
                · {values.inquiryType}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer transition-all"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(fullRfqPath);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#22577A] cursor-pointer transition-colors"
              >
                Attach CAD Drawings
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="quote-modal-name"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Name <span className="text-[#e60000]">*</span>
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  id="quote-modal-name"
                  name="name"
                  type="text"
                  required
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "quote-modal-name-error" : undefined}
                  value={values.name}
                  placeholder="Enter your full name"
                  onBlur={() => markTouched("name")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setValues((prev) => ({ ...prev, name: next }));
                    if (!touched.name) markTouched("name");
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none text-sm text-slate-900 bg-white transition-colors ${
                    nameError
                      ? "border-[#e60000] focus:border-[#e60000]"
                      : !allErrors.name && values.name.trim()
                      ? "border-emerald-400 focus:border-[#3393B8]"
                      : "border-slate-200 focus:border-[#3393B8]"
                  }`}
                />
              </div>
              {nameError && (
                <p
                  id="quote-modal-name-error"
                  role="alert"
                  className="text-xs text-[#e60000] mt-1 mb-0"
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="quote-modal-email"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Email <span className="text-[#e60000]">*</span>
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  id="quote-modal-email"
                  name="email"
                  type="email"
                  required
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "quote-modal-email-error" : undefined}
                  value={values.email}
                  placeholder="you@company.com"
                  onBlur={() => markTouched("email")}
                  onChange={(e) => {
                    const next = e.target.value;
                    setValues((prev) => ({ ...prev, email: next }));
                    if (!touched.email) markTouched("email");
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none text-sm text-slate-900 bg-white transition-colors ${
                    emailError
                      ? "border-[#e60000] focus:border-[#e60000]"
                      : !allErrors.email && values.email.trim()
                      ? "border-emerald-400 focus:border-[#3393B8]"
                      : "border-slate-200 focus:border-[#3393B8]"
                  }`}
                />
              </div>
              {emailError && (
                <p
                  id="quote-modal-email-error"
                  role="alert"
                  className="text-xs text-[#e60000] mt-1 mb-0"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Inquiry Type */}
            <div>
              <label
                htmlFor="quote-modal-inquiry-type"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Inquiry Type <span className="text-[#e60000]">*</span>
              </label>
              <div className="relative">
                <FiTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <select
                  id="quote-modal-inquiry-type"
                  name="inquiryType"
                  required
                  aria-invalid={Boolean(inquiryError)}
                  aria-describedby={
                    inquiryError ? "quote-modal-inquiry-error" : undefined
                  }
                  value={values.inquiryType}
                  onBlur={() => markTouched("inquiryType")}
                  onChange={(e) => {
                    const next = e.target.value as InquiryType | "";
                    setValues((prev) => ({ ...prev, inquiryType: next }));
                    markTouched("inquiryType");
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none text-sm bg-white transition-colors ${
                    values.inquiryType ? "text-slate-900" : "text-slate-400"
                  } ${
                    inquiryError
                      ? "border-[#e60000] focus:border-[#e60000]"
                      : !allErrors.inquiryType && values.inquiryType
                      ? "border-emerald-400 focus:border-[#3393B8]"
                      : "border-slate-200 focus:border-[#3393B8]"
                  }`}
                >
                  <option value="">Select inquiry type...</option>
                  {INQUIRY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="text-slate-900">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {inquiryError && (
                <p
                  id="quote-modal-inquiry-error"
                  role="alert"
                  className="text-xs text-[#e60000] mt-1 mb-0"
                >
                  {inquiryError}
                </p>
              )}
            </div>

            {/* Optional Phone & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quote-modal-phone"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Phone (Optional)
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    id="quote-modal-phone"
                    name="phone"
                    type="tel"
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={
                      phoneError ? "quote-modal-phone-error" : undefined
                    }
                    value={values.phone || ""}
                    placeholder="+94 77 123 4567"
                    onBlur={() => markTouched("phone")}
                    onChange={(e) => {
                      const next = e.target.value;
                      setValues((prev) => ({ ...prev, phone: next }));
                      if (!touched.phone) markTouched("phone");
                    }}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl border focus:outline-none text-sm text-slate-900 bg-white ${
                      phoneError
                        ? "border-[#e60000] focus:border-[#e60000]"
                        : "border-slate-200 focus:border-[#3393B8]"
                    }`}
                  />
                </div>
                {phoneError && (
                  <p
                    id="quote-modal-phone-error"
                    role="alert"
                    className="text-xs text-[#e60000] mt-1 mb-0"
                  >
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="quote-modal-notes"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Dimensions / Notes (Optional)
                </label>
                <input
                  id="quote-modal-notes"
                  name="notes"
                  type="text"
                  value={values.notes || ""}
                  placeholder="Quantity or site location"
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-[#3393B8] focus:outline-none text-sm text-slate-900 bg-white"
                />
              </div>
            </div>

            {submitError && (
              <p role="alert" className="text-xs font-medium text-[#e60000] m-0">
                {submitError}
              </p>
            )}

            {!isFormValid && (
              <p className="text-[11px] text-slate-500 m-0">
                Fill in your Name, a valid Email address, and select an Inquiry Type to enable submission.
              </p>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(fullRfqPath);
                }}
                className="text-xs font-semibold text-[#22577A] hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Open Full RFQ Form
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer transition-all shadow-sm disabled:opacity-45 disabled:cursor-not-allowed disabled:brightness-100"
                >
                  <FiSend className="text-xs" />
                  <span>{submitting ? "Sending..." : "Send Quote Request"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
