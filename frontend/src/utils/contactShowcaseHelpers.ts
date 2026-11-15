import type { SiteContactSettings } from "../../../shared/footerConsultationHelpers.ts";

export type CharacterPoseId = "handshake" | "call" | "quote";

export type StageBackdropTheme = "clean" | "amber";

export type ContactFormIntentId = "quote" | "visit" | "callback";

export interface CharacterPoseMeta {
  id: CharacterPoseId;
  label: string;
  shortLabel: string;
  speechHeadline: string;
  speechSubline: string;
  actionLabel: string;
  badgeText: string;
}

export const CHARACTER_POSES: Record<CharacterPoseId, CharacterPoseMeta> = {
  handshake: {
    id: "handshake",
    label: "Shake Hands",
    shortLabel: "Handshake",
    speechHeadline: "Contact Us!",
    speechSubline: "Let's shake hands & start your project",
    actionLabel: "Shake Hands Now",
    badgeText: "Live Greeting",
  },
  call: {
    id: "call",
    label: "Live Call",
    shortLabel: "On Call",
    speechHeadline: "Contact Us!",
    speechSubline: "Our engineering desk is ready to talk",
    actionLabel: "Ring Desk Visually",
    badgeText: "Direct Hotline",
  },
  quote: {
    id: "quote",
    label: "Quote Desk",
    shortLabel: "Get Quote",
    speechHeadline: "Contact Us!",
    speechSubline: "Send your specs — fast BOQ turnaround",
    actionLabel: "Wave & Preview",
    badgeText: "RFQ Ready",
  },
};

export const CHARACTER_POSE_ORDER: CharacterPoseId[] = [
  "handshake",
  "call",
  "quote",
];

export interface ContactIntentOption {
  id: ContactFormIntentId;
  label: string;
  department: string;
  subjectPreset: string;
  placeholderNote: string;
}

export const CONTACT_INTENT_OPTIONS: ContactIntentOption[] = [
  {
    id: "quote",
    label: "Project Quote",
    department: "Sales & Estimations",
    subjectPreset: "Custom Aluminium & Glazing BOQ Quote",
    placeholderNote:
      "Tell us your opening sizes, finish preferences, or project location...",
  },
  {
    id: "visit",
    label: "Site Visit",
    department: "Technical & CAD Desk",
    subjectPreset: "On-Site Laser Measurement & CAD Review",
    placeholderNote:
      "Share your preferred inspection date, site city, and window/door scope...",
  },
  {
    id: "callback",
    label: "Direct Callback",
    department: "After-Sales & Warranty",
    subjectPreset: "Engineer Callback Request",
    placeholderNote:
      "Let us know the best time to reach you and what system you want to discuss...",
  },
];

export interface ContactShuffleCardItem {
  id: string;
  kicker: string;
  title: string;
  description: string;
  detailPrimary: string;
  detailSecondary: string;
  kind: "hotline" | "sales" | "engineering" | "social";
  linkedIntent: ContactFormIntentId;
}

export function buildContactShuffleCards(
  settings: SiteContactSettings
): ContactShuffleCardItem[] {
  return [
    {
      id: "card-hotline",
      kicker: "Live Visual Ring",
      title: "Direct Hotline & WhatsApp",
      description: "Silent visual call beacon — tap to call, WhatsApp, or copy.",
      detailPrimary: settings.phone,
      detailSecondary: settings.email,
      kind: "hotline",
      linkedIntent: "callback",
    },
    {
      id: "card-sales",
      kicker: "Department 01",
      title: "Sales & Estimations",
      description: "Fast BOQ pricing, thermal door schedules & showroom bookings.",
      detailPrimary: settings.email,
      detailSecondary: settings.address,
      kind: "sales",
      linkedIntent: "quote",
    },
    {
      id: "card-engineering",
      kicker: "Department 02",
      title: "Technical & CAD Desk",
      description: "Shop drawings, wind-load checks & acoustic glazing specs.",
      detailPrimary: "engineering@innovista.lk",
      detailSecondary: "Mon–Fri · 8:30 AM – 5:30 PM",
      kind: "engineering",
      linkedIntent: "visit",
    },
    {
      id: "card-social",
      kicker: "Connect Online",
      title: "Social & Portfolio Channels",
      description: "Follow recent facade handovers or message us on your favorite app.",
      detailPrimary: settings.website,
      detailSecondary: "LinkedIn · Facebook · Instagram · WhatsApp",
      kind: "social",
      linkedIntent: "quote",
    },
  ];
}

export function getNextPose(current: CharacterPoseId): CharacterPoseId {
  const idx = CHARACTER_POSE_ORDER.indexOf(current);
  if (idx < 0) return "handshake";
  return CHARACTER_POSE_ORDER[(idx + 1) % CHARACTER_POSE_ORDER.length];
}

export interface DeckOrderEntry<T> {
  item: T;
  originalIndex: number;
  slotIndex: number;
}

export function buildContactDeckOrder<T>(
  items: T[],
  activeIndex: number,
  maxVisible = 3
): DeckOrderEntry<T>[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const total = items.length;
  const count = Math.min(Math.max(1, maxVisible), total);
  const start = ((activeIndex % total) + total) % total;

  const result: DeckOrderEntry<T>[] = [];
  for (let slotIndex = 0; slotIndex < count; slotIndex++) {
    const originalIndex = (start + slotIndex) % total;
    result.push({
      item: items[originalIndex],
      originalIndex,
      slotIndex,
    });
  }
  return result;
}

export function composeSplitFullName(
  firstName: string,
  lastName: string
): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function getContactIntentMeta(
  id: ContactFormIntentId
): ContactIntentOption {
  return (
    CONTACT_INTENT_OPTIONS.find((item) => item.id === id) ||
    CONTACT_INTENT_OPTIONS[0]
  );
}

export interface ContactCardThemeMeta {
  kind: ContactShuffleCardItem["kind"];
  gradient: string;
  backplateTint: string;
  accentGlow: string;
  kickerColor: string;
  ctaLabel: string;
}

export const CONTACT_CARD_THEMES: Record<
  ContactShuffleCardItem["kind"],
  ContactCardThemeMeta
> = {
  hotline: {
    kind: "hotline",
    gradient:
      "linear-gradient(125deg, #0D4B6A 0%, #146E94 52%, #2B8FB5 100%)",
    backplateTint: "#135D7F",
    accentGlow: "rgba(14, 165, 233, 0.36)",
    kickerColor: "#BAE6FD",
    ctaLabel: "Request Callback",
  },
  sales: {
    kind: "sales",
    gradient:
      "linear-gradient(125deg, #0B5D4F 0%, #0E826E 54%, #1AA38B 100%)",
    backplateTint: "#0D6E5D",
    accentGlow: "rgba(16, 185, 129, 0.34)",
    kickerColor: "#A7F3D0",
    ctaLabel: "Select Sales Desk",
  },
  engineering: {
    kind: "engineering",
    gradient:
      "linear-gradient(125deg, #9A3412 0%, #C84B0E 52%, #EA6A15 100%)",
    backplateTint: "#B23F0D",
    accentGlow: "rgba(234, 88, 12, 0.38)",
    kickerColor: "#FED7AA",
    ctaLabel: "Book Site / CAD Review",
  },
  social: {
    kind: "social",
    gradient:
      "linear-gradient(125deg, #1E3A8A 0%, #1D4ED8 54%, #3B82F6 100%)",
    backplateTint: "#1E40AF",
    accentGlow: "rgba(37, 99, 235, 0.36)",
    kickerColor: "#BFDBFE",
    ctaLabel: "Start Project Inquiry",
  },
};

export function getContactCardTheme(
  kind: ContactShuffleCardItem["kind"]
): ContactCardThemeMeta {
  return CONTACT_CARD_THEMES[kind] || CONTACT_CARD_THEMES.hotline;
}

