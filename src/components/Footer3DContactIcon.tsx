import { motion } from "framer-motion";

export type Footer3DIconKind = "email" | "address" | "hours" | "website";

interface Footer3DContactIconProps {
  kind: Footer3DIconKind;
  className?: string;
}

const PALETTE: Record<
  Footer3DIconKind,
  { tile: string; ledge: string; shadow: string }
> = {
  email: {
    tile: "from-[#FFFDF8] via-[#EBF6FC] to-[#D6ECF7]",
    ledge: "border-b-[#22577A]",
    shadow: "shadow-[0_8px_16px_-6px_rgba(34,87,122,0.34),inset_0_2px_2px_rgba(255,255,255,0.95)]",
  },
  address: {
    tile: "from-[#FFFDFD] via-[#FEEEEE] to-[#FADBD8]",
    ledge: "border-b-[#B91C1C]",
    shadow: "shadow-[0_8px_16px_-6px_rgba(185,28,28,0.28),inset_0_2px_2px_rgba(255,255,255,0.95)]",
  },
  website: {
    tile: "from-[#F8FCFF] via-[#E0F2FE] to-[#BAE6FD]",
    ledge: "border-b-[#0369A1]",
    shadow: "shadow-[0_8px_16px_-6px_rgba(3,105,161,0.32),inset_0_2px_2px_rgba(255,255,255,0.95)]",
  },
  hours: {
    tile: "from-[#FFFDF7] via-[#FEF3C7] to-[#FDE68A]",
    ledge: "border-b-[#B45309]",
    shadow: "shadow-[0_8px_16px_-6px_rgba(180,83,9,0.28),inset_0_2px_2px_rgba(255,255,255,0.95)]",
  },
};

export default function Footer3DContactIcon({
  kind,
  className = "",
}: Footer3DContactIconProps) {
  const palette = PALETTE[kind];

  return (
    <motion.div
      aria-hidden="true"
      whileHover={{ y: -2, rotateX: -8, rotateY: 8, scale: 1.06 }}
      transition={{ duration: 0.22 }}
      style={{ perspective: 450, transformStyle: "preserve-3d" }}
      className={`relative w-11 h-11 rounded-2xl bg-gradient-to-b ${palette.tile} border border-white/95 border-b-[4px] ${palette.ledge} ${palette.shadow} flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0.5 h-[42%] rounded-t-xl bg-gradient-to-b from-white/90 via-white/30 to-transparent"
      />

      {kind === "email" && (
        <svg viewBox="0 0 28 28" className="relative z-10 w-6 h-6 drop-shadow-xs" fill="none">
          <defs>
            <linearGradient id="mail3d-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3393B8" />
              <stop offset="100%" stopColor="#1B3A4E" />
            </linearGradient>
            <linearGradient id="mail3d-flap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <rect x="3" y="6.5" width="22" height="15.5" rx="3.2" fill="url(#mail3d-body)" />
          <path d="M4.2 8.2 14 15.1 23.8 8.2" fill="url(#mail3d-flap)" opacity="0.92" />
          <path
            d="M4.2 8.2 14 15.1 23.8 8.2"
            stroke="#E0F2FE"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21.5" cy="7.5" r="2.6" fill="#E60000" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      )}

      {kind === "address" && (
        <svg viewBox="0 0 28 28" className="relative z-10 w-6 h-6 drop-shadow-xs" fill="none">
          <defs>
            <linearGradient id="pin3d-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>
          <ellipse cx="14" cy="23.5" rx="6.2" ry="1.8" fill="#1E293B" opacity="0.2" />
          <path
            d="M14 4C10.13 4 7 7.13 7 11c0 5.05 5.88 10.62 6.53 11.21.27.25.67.25.94 0C15.12 21.62 21 16.05 21 11c0-3.87-3.13-7-7-7Z"
            fill="url(#pin3d-body)"
          />
          <circle cx="14" cy="10.8" r="2.8" fill="#FFFFFF" />
          <circle cx="13.4" cy="10.2" r="1" fill="#FCA5A5" opacity="0.7" />
        </svg>
      )}

      {kind === "website" && (
        <svg viewBox="0 0 28 28" className="relative z-10 w-6 h-6 drop-shadow-xs" fill="none">
          <defs>
            <radialGradient id="globe3d-fill" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="55%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </radialGradient>
          </defs>
          <circle cx="14" cy="14" r="9.5" fill="url(#globe3d-fill)" />
          <ellipse cx="14" cy="14" rx="4.4" ry="9.5" stroke="#E0F2FE" strokeWidth="1.25" />
          <path d="M5 11.2h18M5 16.8h18" stroke="#E0F2FE" strokeWidth="1.2" />
          <circle cx="10.6" cy="9.2" r="1.8" fill="#FFFFFF" opacity="0.45" />
        </svg>
      )}

      {kind === "hours" && (
        <svg viewBox="0 0 28 28" className="relative z-10 w-6 h-6 drop-shadow-xs" fill="none">
          <defs>
            <linearGradient id="clock3d-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
          </defs>
          <circle cx="14" cy="14" r="9.5" fill="url(#clock3d-rim)" />
          <circle cx="14" cy="14" r="7.2" fill="#FFFBEB" />
          <path
            d="M14 9.5V14l3.2 2.1"
            stroke="#1E293B"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="14" r="1.2" fill="#E60000" />
        </svg>
      )}
    </motion.div>
  );
}
