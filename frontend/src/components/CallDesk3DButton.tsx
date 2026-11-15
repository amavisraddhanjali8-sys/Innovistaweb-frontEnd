import { MotionConfig, motion } from "framer-motion";
import { FiPhoneCall } from "react-icons/fi";
import { formatTelHref } from "../../../shared/footerConsultationHelpers";

export interface CallDesk3DButtonProps {
  phone: string;
  departmentTitle?: string;
  label?: string;
  className?: string;
}

export default function CallDesk3DButton({
  phone,
  departmentTitle,
  label = "Call Desk",
  className = "",
}: CallDesk3DButtonProps) {
  const telHref = formatTelHref(phone);
  const ariaLabel = departmentTitle
    ? `Call ${departmentTitle} at ${phone}`
    : `Call ${phone}`;

  return (
    <MotionConfig reducedMotion="user">
      <motion.a
        href={telHref}
        aria-label={ariaLabel}
        data-testid="call-desk-3d-btn"
        whileHover={{ y: -2, scale: 1.018 }}
        whileTap={{ y: 3, scale: 0.985 }}
        transition={{ type: "spring", stiffness: 520, damping: 28 }}
        className={`group relative isolate overflow-hidden inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#7dd3fc]/70 bg-gradient-to-b from-[#2f9ec9] via-[#1c6b96] to-[#134c72] !text-white no-underline cursor-pointer select-none shadow-[0_5px_0_#0d3550,0_10px_20px_-4px_rgba(14,116,144,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.58)] hover:from-[#38bdf8] hover:via-[#0284c7] hover:to-[#0369a1] hover:shadow-[0_6px_0_#0c4a6e,0_14px_24px_-4px_rgba(14,165,233,0.55),inset_0_1.5px_1px_rgba(255,255,255,0.68)] active:shadow-[0_1px_0_#0d3550,0_3px_8px_-2px_rgba(14,116,144,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.42)] transition-[background,box-shadow] duration-150 ${className}`}
      >
        {/* Crisp top bevel specular edge (subtle so label contrast stays razor-sharp) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1.5 top-[1px] h-[2px] rounded-full bg-white/55"
        />

        {/* Diagonal glass sheen sweep on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 -left-10 w-8 h-16 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-22deg] transition-transform duration-700 ease-out group-hover:translate-x-[220px]"
        />

        {/* Raised 3D Ringing Phone Badge Orb */}
        <span
          aria-hidden="true"
          className="relative z-10 w-6 h-6 rounded-full bg-white/20 border border-white/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.65),0_2px_4px_rgba(7,36,62,0.35)] flex items-center justify-center shrink-0"
        >
          <span className="silent-ring-wave silent-ring-wave-1 !border-white/65" />
          <motion.span
            animate={{
              rotate: [0, -14, 14, -10, 10, 0],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              repeatDelay: 2.2,
              ease: "easeInOut",
            }}
            className="inline-flex items-center justify-center"
          >
            <FiPhoneCall className="text-[12px] text-white stroke-[2.5]" />
          </motion.span>
        </span>

        {/* High-contrast crisp label */}
        <span className="relative z-10 text-xs font-bold tracking-wide text-white whitespace-nowrap drop-shadow-[0_1px_1.5px_rgba(6,24,40,0.6)]">
          {label}
        </span>
      </motion.a>
    </MotionConfig>
  );
}
