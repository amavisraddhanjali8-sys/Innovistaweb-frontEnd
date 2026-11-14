import { motion } from "framer-motion";
import type { SiteContactSettings } from "../utils/footerConsultationHelpers";
import { formatWhatsAppHref } from "../utils/footerConsultationHelpers";

export interface AnimatedSocialIconsProps {
  settings: Pick<
    SiteContactSettings,
    "linkedinUrl" | "facebookUrl" | "instagramUrl" | "whatsapp" | "phone"
  >;
  size?: "sm" | "md";
  align?: "start" | "end";
  keyPrefix?: string;
}

function LinkedInBrandLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.2" fill="#0A66C2" />
      <circle cx="7.6" cy="7.6" r="1.45" fill="#FFFFFF" />
      <rect x="6.35" y="10.2" width="2.5" height="7.6" rx="0.5" fill="#FFFFFF" />
      <path
        d="M10.7 10.2h2.4v1.05c.54-.78 1.44-1.26 2.52-1.26 2.02 0 3.18 1.25 3.18 3.55v4.26h-2.54v-3.78c0-1.15-.44-1.82-1.36-1.82-.98 0-1.66.68-1.66 1.88v3.72H10.7v-7.6Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function FacebookBrandLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M15.42 15.25 15.88 12.25H13.02V10.3C13.02 9.48 13.42 8.68 14.71 8.68H16.02V6.12C16.02 6.12 14.83 5.92 13.7 5.92C11.33 5.92 9.78 7.36 9.78 9.95V12.25H7.16V15.25H9.78V21.75C10.5 21.91 11.24 22 12 22C12.35 22 12.69 21.98 13.02 21.94V15.25H15.42Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function InstagramBrandLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <defs>
        <radialGradient id="ig-brand-grad" cx="28%" cy="92%" r="120%">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="28%" stopColor="#F47133" />
          <stop offset="56%" stopColor="#BC3081" />
          <stop offset="100%" stopColor="#4C63D2" />
        </radialGradient>
      </defs>
      <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.6" fill="url(#ig-brand-grad)" />
      <rect
        x="5.8"
        y="5.8"
        width="12.4"
        height="12.4"
        rx="3.7"
        stroke="#FFFFFF"
        strokeWidth="1.65"
      />
      <circle cx="12" cy="12" r="3.1" stroke="#FFFFFF" strokeWidth="1.65" />
      <circle cx="15.85" cy="8.15" r="0.95" fill="#FFFFFF" />
    </svg>
  );
}

function WhatsAppBrandLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M12 5.4A6.55 6.55 0 0 0 6.32 15.2L5.5 18.4l3.28-.85A6.56 6.56 0 1 0 12 5.4Z"
        stroke="#FFFFFF"
        strokeWidth="1.55"
        strokeLinejoin="round"
        fill="#25D366"
      />
      <path
        d="M9.65 9.05c-.22 0-.55.08-.84.4-.28.31-1.08 1.05-1.08 2.57 0 1.52 1.1 2.98 1.25 3.19.16.2 2.13 3.4 5.26 4.63 2.6 1.02 3.13.82 3.7.77.56-.05 1.81-.74 2.07-1.45.25-.72.25-1.33.18-1.46-.08-.13-.28-.21-.59-.36-.31-.15-1.82-.9-2.1-1-.28-.1-.49-.16-.69.15-.2.3-.79 1-.97 1.2-.18.2-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.15-.18.21-.31.31-.52.1-.2.05-.39-.02-.54-.08-.15-.68-1.66-.94-2.26-.24-.58-.49-.5-.69-.51Z"
        fill="#FFFFFF"
        transform="translate(-1.35 -1.1) scale(0.95)"
      />
    </svg>
  );
}

export default function AnimatedSocialIcons({
  settings,
  size = "md",
  align = "start",
  keyPrefix = "social",
}: AnimatedSocialIconsProps) {
  const items = [
    {
      id: "linkedin",
      label: "LinkedIn",
      href: settings.linkedinUrl || "https://www.linkedin.com",
      Logo: LinkedInBrandLogo,
      tileBg: "from-white via-sky-50 to-slate-100",
      ledgeBorder: "border-b-[#084B8A]",
      glowColor: "hover:shadow-[0_12px_24px_-6px_rgba(10,102,194,0.52)]",
    },
    {
      id: "facebook",
      label: "Facebook",
      href:
        settings.facebookUrl ||
        "https://www.facebook.com/share/1CN1SBPycg/",
      Logo: FacebookBrandLogo,
      tileBg: "from-white via-blue-50 to-slate-100",
      ledgeBorder: "border-b-[#0F4FA8]",
      glowColor: "hover:shadow-[0_12px_24px_-6px_rgba(24,119,242,0.52)]",
    },
    {
      id: "instagram",
      label: "Instagram",
      href:
        settings.instagramUrl ||
        "https://www.instagram.com/innovista_fabriconx_aluminium?igsh=OXU0MndxZWMwNHo2",
      Logo: InstagramBrandLogo,
      tileBg: "from-white via-pink-50 to-amber-50/70",
      ledgeBorder: "border-b-[#A1236B]",
      glowColor: "hover:shadow-[0_12px_24px_-6px_rgba(221,42,123,0.48)]",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: formatWhatsAppHref(settings.whatsapp || settings.phone),
      Logo: WhatsAppBrandLogo,
      tileBg: "from-white via-emerald-50 to-slate-100",
      ledgeBorder: "border-b-[#138A42]",
      glowColor: "hover:shadow-[0_12px_24px_-6px_rgba(37,211,102,0.5)]",
    },
  ];

  const boxSize = size === "sm" ? "w-10 h-10 rounded-xl" : "w-12 h-12 rounded-2xl";
  const logoSize = size === "sm" ? "w-6 h-6" : "w-7 h-7";

  return (
    <div
      style={{ perspective: "600px" }}
      className={`flex flex-wrap items-center gap-3 pt-1 ${
        align === "end" ? "lg:justify-end" : "justify-start"
      }`}
    >
      {items.map(({ id, label, href, Logo, tileBg, ledgeBorder, glowColor }, index) => (
        <motion.a
          key={`${keyPrefix}-${id}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Connect on ${label}`}
          data-testid={`social-3d-${id}`}
          initial={{ opacity: 0.92, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{
            y: -5,
            scale: 1.1,
            rotateX: -12,
            rotateY: index % 2 === 0 ? 10 : -10,
          }}
          whileTap={{ y: 1, scale: 0.95 }}
          className={`group relative ${boxSize} bg-gradient-to-b ${tileBg} border border-white/90 border-b-[4px] ${ledgeBorder} ${glowColor} flex items-center justify-center shadow-[0_8px_18px_-6px_rgba(15,23,42,0.28),inset_0_2px_2px_rgba(255,255,255,0.95)] transition-shadow duration-300 no-underline shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3393B8]`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Specular top 3D glass rim */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1 top-0.5 h-[42%] rounded-t-[inherit] bg-gradient-to-b from-white/90 via-white/35 to-transparent"
          />
          {/* Actual Brand SVG Logo */}
          <Logo
            className={`relative z-10 ${logoSize} drop-shadow-[0_2px_3px_rgba(15,23,42,0.18)] transition-transform duration-300 group-hover:scale-105`}
          />
          {/* Floating tooltip */}
          <span
            role="tooltip"
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-slate-900/95 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-200 shadow-sm z-20"
          >
            {label}
          </span>
        </motion.a>
      ))}
    </div>
  );
}
