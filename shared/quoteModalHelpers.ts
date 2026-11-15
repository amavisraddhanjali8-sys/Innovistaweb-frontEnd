export const INQUIRY_TYPE_OPTIONS = [
  "Product Quotation",
  "Bulk / Wholesale Pricing",
  "Custom Site Fabrication",
  "Technical Specifications & CAD",
  "Hardware & Accessories",
  "Site Measurement Visit",
] as const;

export type InquiryType = (typeof INQUIRY_TYPE_OPTIONS)[number];

export interface QuoteModalFormValues {
  name: string;
  email: string;
  inquiryType: InquiryType | "";
  phone?: string;
  notes?: string;
}

export interface QuoteModalContext {
  productId?: string | number;
  productName?: string;
  categoryName?: string;
  accessoryName?: string;
}

export type QuoteModalErrors = Partial<
  Record<"name" | "email" | "inquiryType" | "phone", string>
>;

const STRICT_EMAIL_REGEX =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function isValidEmailAddress(raw: string): boolean {
  const email = (raw || "").trim();
  if (!email || email.length > 254) return false;
  if (email.includes("..") || /\s/.test(email)) return false;
  return STRICT_EMAIL_REGEX.test(email);
}

export function isValidOptionalPhone(raw?: string): boolean {
  const phone = (raw || "").trim();
  if (!phone) return true;
  if (!/^[+\d\s().-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function createInitialQuoteFormValues(opts?: {
  defaultName?: string;
  defaultEmail?: string;
  defaultInquiryType?: InquiryType;
  accessoryName?: string;
}): QuoteModalFormValues {
  const defaultType: InquiryType | "" =
    opts?.defaultInquiryType ||
    (opts?.accessoryName ? "Hardware & Accessories" : "");
  return {
    name: opts?.defaultName?.trim() || "",
    email: opts?.defaultEmail?.trim() || "",
    inquiryType: defaultType,
    phone: "",
    notes: "",
  };
}

export function validateQuoteModalForm(
  values: QuoteModalFormValues
): QuoteModalErrors {
  const errors: QuoteModalErrors = {};
  const trimmedName = (values.name || "").trim();

  if (!trimmedName) {
    errors.name = "Name is required.";
  } else if (trimmedName.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 100) {
    errors.name = "Name must be under 100 characters.";
  }

  const trimmedEmail = (values.email || "").trim();
  if (!trimmedEmail) {
    errors.email = "Email address is required.";
  } else if (!isValidEmailAddress(trimmedEmail)) {
    errors.email = "Enter a valid email address (e.g. name@company.com).";
  }

  if (
    !values.inquiryType ||
    !(INQUIRY_TYPE_OPTIONS as readonly string[]).includes(values.inquiryType)
  ) {
    errors.inquiryType = "Please select an inquiry type.";
  }

  if (values.phone && values.phone.trim() && !isValidOptionalPhone(values.phone)) {
    errors.phone = "Enter a valid phone number (7–15 digits).";
  }

  return errors;
}

export function isQuoteModalFormValid(values: QuoteModalFormValues): boolean {
  return Object.keys(validateQuoteModalForm(values)).length === 0;
}

export function buildOrderQuotePayload(
  values: QuoteModalFormValues,
  context?: QuoteModalContext
) {
  const designsPayload =
    context?.productId !== undefined && context.productId !== ""
      ? [{ DesignID: context.productId }]
      : [];

  return {
    Client_Name: values.name.trim(),
    Client_Email: values.email.trim(),
    Client_Number: values.phone?.trim() || "",
    Inquiry_Type: values.inquiryType || "Product Quotation",
    Product_Name:
      context?.productName ||
      context?.categoryName ||
      "Custom Architectural System",
    Accessory_Variant: context?.accessoryName || "",
    Notes: values.notes?.trim() || "",
    Designs: designsPayload,
  };
}
