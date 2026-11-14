import { motion } from "framer-motion";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
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
      Icon: FaLinkedinIn,
      hoverBg: "hover:from-[#0A66C2] hover:via-[#0A66C2] hover:to-[#004182]",
      glowColor: "hover:shadow-[0_8px_22px_-4px_rgba(10,102,194,0.65)]",
    },
    {
      id: "facebook",
      label: "Facebook",
      href:
        settings.facebookUrl ||
        "https://www.facebook.com/share/1CN1SBPycg/",
      Icon: FaFacebookF,
      hoverBg: "hover:from-[#1877F2] hover:via-[#1877F2] hover:to-[#0C5AC7]",
      glowColor: "hover:shadow-[0_8px_22px_-4px_rgba(24,119,242,0.65)]",
    },
    {
      id: "instagram",
      label: "Instagram",
      href:
        settings.instagramUrl ||
        "https://www.instagram.com/innovista_fabriconx_aluminium?igsh=OXU0MndxZWMwNHo2",
      Icon: FaInstagram,
      hoverBg: "hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF]",
      glowColor: "hover:shadow-[0_8px_22px_-4px_rgba(221,42,123,0.65)]",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: formatWhatsAppHref(settings.whatsapp || settings.phone),
      Icon: FaWhatsapp,
      hoverBg: "hover:from-[#25D366] hover:via-[#1EBE5D] hover:to-[#128C7E]",
      glowColor: "hover:shadow-[0_8px_22px_-4px_rgba(37,211,102,0.65)]",
    },
  ];

  const boxSize = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const iconSize = size === "sm" ? "text-xs" : "text-base";

  return (
    <div
      className={`flex items-center gap-3 pt-1 ${
        align === "end" ? "lg:justify-end" : "justify-start"
      }`}
    >
      {items.map(({ id, label, href, Icon, hoverBg, glowColor }, index) => (
        <motion.a
          key={`${keyPrefix}-${id}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Connect on ${label}`}
          initial={{ opacity: 0.9, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ y: -5, scale: 1.12, rotate: index % 2 === 0 ? -4 : 4 }}
          whileTap={{ scale: 0.94 }}
          className={`social-orb-btn group relative ${boxSize} rounded-full bg-gradient-to-br from-[#22577A] via-[#3393B8] to-[#5CB6D2] ${hoverBg} ${glowColor} text-white flex items-center justify-center border border-white/40 shadow-[0_6px_16px_-6px_rgba(34,87,122,0.5)] transition-all duration-300 no-underline shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3393B8]`}
        >
          {/* Glassy inner highlight ring */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-transparent opacity-80"
          />
          {/* Expanding neon halo ring on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full border border-[#38bdf8]/0 group-hover:border-[#38bdf8]/60 group-hover:scale-110 transition-all duration-300"
          />
          <Icon className={`relative z-10 ${iconSize} transition-transform duration-300 group-hover:scale-110`} />
          {/* Floating tooltip */}
          <span
            role="tooltip"
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-semibold tracking-wide whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-200 shadow-sm"
          >
            {label}
          </span>
        </motion.a>
      ))}
    </div>
  );
}
