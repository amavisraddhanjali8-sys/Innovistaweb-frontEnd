import { isValidEmailAddress, isValidOptionalPhone } from "./quoteModalHelpers";

export interface FooterConsultationValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export type FooterConsultationErrors = Partial<
  Record<keyof FooterConsultationValues, string>
>;

export interface FooterLinkItem {
  label: string;
  to: string;
}

export interface FooterLinkColumn {
  title: string;
  items: FooterLinkItem[];
}

export const FOOTER_LINK_COLUMNS: FooterLinkColumn[] = [
  {
    title: "Navigation",
    items: [
      { label: "Home", to: "/" },
      { label: "About Us", to: "/about" },
      { label: "All Systems", to: "/products" },
      { label: "Projects", to: "/projects" },
      { label: "Newsroom", to: "/news" },
      { label: "Blogs & Insights", to: "/blogs" },
    ],
  },
  {
    title: "Systems",
    items: [
      { label: "Architectural Doors", to: "/products/category/doors" },
      { label: "Sliding & Casement Windows", to: "/products/category/windows" },
      { label: "Shop Front & Facades", to: "/products/category/shop-front" },
      { label: "Acoustic Partitions", to: "/products/category/partitions" },
      { label: "Roof Skylights & Louvers", to: "/products/category/roof-skylights" },
    ],
  },
  {
    title: "Solutions",
    items: [
      { label: "Resources & Downloads", to: "/resources" },
      { label: "Contact Desks & Locations", to: "/contact" },
      { label: "Request Custom RFQ", to: "/request-quote" },
      { label: "Quality & Milestones", to: "/milestones" },
      { label: "Order Cart", to: "/OrderCart" },
    ],
  },
];

export const FOOTER_CONTACT_DETAILS = {
  phone: "+94 11 234 5678",
  email: "info@innovista.lk",
  website: "www.innovistafabriconix.lk",
  address: "No. 42, Nawala Road, Colombo 05",
};

export const FOOTER_SERVICE_HIGHLIGHTS = [
  "Custom CAD Detailing",
  "Competitive Fabrication Pricing",
  "Island-Wide Installation",
] as const;

export function createInitialFooterConsultationValues(opts?: {
  defaultName?: string;
  defaultEmail?: string;
}): FooterConsultationValues {
  return {
    name: opts?.defaultName?.trim() || "",
    email: opts?.defaultEmail?.trim() || "",
    phone: "",
    subject: "",
    message: "",
  };
}

export function validateFooterConsultation(
  values: FooterConsultationValues
): FooterConsultationErrors {
  const errors: FooterConsultationErrors = {};

  const trimmedName = (values.name || "").trim();
  if (!trimmedName) {
    errors.name = "Name is required.";
  } else if (trimmedName.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const trimmedEmail = (values.email || "").trim();
  if (!trimmedEmail) {
    errors.email = "Email address is required.";
  } else if (!isValidEmailAddress(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  const trimmedPhone = (values.phone || "").trim();
  if (!trimmedPhone) {
    errors.phone = "Phone number is required.";
  } else if (!isValidOptionalPhone(trimmedPhone)) {
    errors.phone = "Enter a valid phone number (7–15 digits).";
  }

  const trimmedMessage = (values.message || "").trim();
  if (!trimmedMessage) {
    errors.message = "Please enter your consultation message.";
  } else if (trimmedMessage.length < 5) {
    errors.message = "Message must be at least 5 characters.";
  }

  return errors;
}

export function isFooterConsultationValid(
  values: FooterConsultationValues
): boolean {
  return Object.keys(validateFooterConsultation(values)).length === 0;
}

export function buildFooterConsultationPayload(
  values: FooterConsultationValues
) {
  return {
    Client_Name: values.name.trim(),
    Client_Email: values.email.trim(),
    Client_Number: values.phone.trim(),
    Inquiry_Type: "Free Architectural Consultation",
    Product_Name:
      values.subject.trim() || "General Aluminium & Glazing Consultation",
    Notes: values.message.trim(),
    Designs: [],
  };
}
