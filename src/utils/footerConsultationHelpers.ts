import { isValidEmailAddress, isValidOptionalPhone } from "./quoteModalHelpers.ts";

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
    title: "Company",
    items: [
      { label: "Home", to: "/" },
      { label: "About Us", to: "/about" },
      { label: "Projects", to: "/projects" },
      { label: "Quality & Milestones", to: "/milestones" },
      { label: "Newsroom", to: "/news" },
      { label: "Blogs & Insights", to: "/blogs" },
    ],
  },
  {
    title: "Core Systems",
    items: [
      { label: "All Systems", to: "/products" },
      { label: "Architectural Doors", to: "/products/category/doors" },
      { label: "Sliding & Casement Windows", to: "/products/category/windows" },
      { label: "Shop Front & Facades", to: "/products/category/shop-front" },
      { label: "Acoustic Partitions", to: "/products/category/partitions" },
    ],
  },
  {
    title: "Specialty & Specs",
    items: [
      { label: "Louvers & Sunshades", to: "/products/category/louvers" },
      { label: "Roof & Skylights", to: "/products/category/roof-skylights" },
      { label: "Bathroom Enclosures", to: "/products/category/bathrooms" },
      { label: "Wardrobe & Pantry", to: "/products/category/wardrobe-pantry" },
      { label: "Resources & Downloads", to: "/resources" },
    ],
  },
  {
    title: "Client & Portals",
    items: [
      { label: "Customer Portal", to: "/profile" },
      { label: "Sign In / Create Account", to: "/profile-login" },
      { label: "Request Custom RFQ", to: "/request-quote" },
      { label: "Contact Desks & Locations", to: "/contact" },
    ],
  },
];

export interface SiteContactSettings {
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  showroomHours?: string;
  linkedinUrl: string;
  facebookUrl: string;
  instagramUrl: string;
}

const envMeta =
  typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string | undefined> }).env
    ? (import.meta as { env?: Record<string, string | undefined> }).env!
    : {};

export const DEFAULT_SITE_CONTACT_SETTINGS: SiteContactSettings = {
  phone: envMeta.VITE_CONTACT_PHONE?.trim() || "+94 76 081 8098",
  whatsapp: envMeta.VITE_WHATSAPP_NUMBER?.trim() || "94760818098",
  email: envMeta.VITE_CONTACT_EMAIL?.trim() || "innovistametal@gmail.com",
  website: "www.innovistafabriconix.lk",
  address: "No. 42, Nawala Road, Colombo 05",
  showroomHours: "Mon – Sat · 8:30 AM – 6:00 PM",
  linkedinUrl: "https://www.linkedin.com",
  facebookUrl: "https://www.facebook.com/share/1CN1SBPycg/",
  instagramUrl:
    "https://www.instagram.com/innovista_fabriconx_aluminium?igsh=OXU0MndxZWMwNHo2",
};

export const FOOTER_CONTACT_DETAILS = {
  phone: DEFAULT_SITE_CONTACT_SETTINGS.phone,
  email: DEFAULT_SITE_CONTACT_SETTINGS.email,
  website: DEFAULT_SITE_CONTACT_SETTINGS.website,
  address: DEFAULT_SITE_CONTACT_SETTINGS.address,
  showroomHours: DEFAULT_SITE_CONTACT_SETTINGS.showroomHours,
};

export function formatTelHref(phone: string): string {
  const cleaned = (phone || "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "tel:+94760818098";
}

export function formatWhatsAppHref(phoneOrWhatsapp: string): string {
  const digits = (phoneOrWhatsapp || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/94760818098";
}

export function normalizeSiteContactSettings(
  raw?: Partial<SiteContactSettings> | null,
  fallback: SiteContactSettings = DEFAULT_SITE_CONTACT_SETTINGS
): SiteContactSettings {
  const phone = typeof raw?.phone === "string" && raw.phone.trim() ? raw.phone.trim() : fallback.phone;
  const whatsappRaw =
    typeof raw?.whatsapp === "string" && raw.whatsapp.trim()
      ? raw.whatsapp.trim()
      : phone.replace(/\D/g, "") || fallback.whatsapp;

  return {
    phone,
    whatsapp: whatsappRaw.replace(/\D/g, "") || fallback.whatsapp,
    email: typeof raw?.email === "string" && raw.email.trim() ? raw.email.trim() : fallback.email,
    website:
      typeof raw?.website === "string" && raw.website.trim()
        ? raw.website.trim()
        : fallback.website,
    address:
      typeof raw?.address === "string" && raw.address.trim()
        ? raw.address.trim()
        : fallback.address,
    showroomHours:
      typeof raw?.showroomHours === "string" && raw.showroomHours.trim()
        ? raw.showroomHours.trim()
        : fallback.showroomHours || "Mon – Sat · 8:30 AM – 6:00 PM",
    linkedinUrl:
      typeof raw?.linkedinUrl === "string" && raw.linkedinUrl.trim()
        ? raw.linkedinUrl.trim()
        : fallback.linkedinUrl,
    facebookUrl:
      typeof raw?.facebookUrl === "string" && raw.facebookUrl.trim()
        ? raw.facebookUrl.trim()
        : fallback.facebookUrl,
    instagramUrl:
      typeof raw?.instagramUrl === "string" && raw.instagramUrl.trim()
        ? raw.instagramUrl.trim()
        : fallback.instagramUrl,
  };
}

export function validateSiteContactSettings(
  settings: SiteContactSettings
): Partial<Record<keyof SiteContactSettings, string>> {
  const errors: Partial<Record<keyof SiteContactSettings, string>> = {};
  if (!settings.phone.trim() || !isValidOptionalPhone(settings.phone)) {
    errors.phone = "Enter a valid phone number (7–15 digits).";
  }
  if (!settings.email.trim() || !isValidEmailAddress(settings.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!settings.address.trim()) {
    errors.address = "Address is required.";
  }
  return errors;
}

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
