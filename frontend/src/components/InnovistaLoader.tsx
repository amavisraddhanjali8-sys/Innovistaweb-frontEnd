import { useId } from "react";

export interface InnovistaLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  sm: {
    box: "w-14 h-14",
    viewBox: 56,
    stroke: 3.5,
    textClass: "text-[9px]",
  },
  md: {
    box: "w-20 h-20",
    viewBox: 80,
    stroke: 4,
    textClass: "text-[12px]",
  },
  lg: {
    box: "w-28 h-28",
    viewBox: 112,
    stroke: 4.5,
    textClass: "text-[16px]",
  },
} as const;

export function InnovistaLoader({
  size = "lg",
  className = "",
  label = "Loading Innovista",
}: InnovistaLoaderProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `innovista-ring-${uid}`;
  const cfg = SIZE_MAP[size];
  const center = cfg.viewBox / 2;
  const radius = center - cfg.stroke - 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.72;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="innovista-loader"
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
    >
      <div
        className={`relative inline-flex items-center justify-center ${cfg.box}`}
      >
        <svg
          viewBox={`0 0 ${cfg.viewBox} ${cfg.viewBox}`}
          className="absolute inset-0 w-full h-full innovista-spin-ring"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E60000" />
              <stop offset="52%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#22577A" />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.22)"
            strokeWidth={cfg.stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
        </svg>

        <span
          className={`relative z-10 font-extrabold tracking-tight leading-none bg-gradient-to-r from-[#E60000] via-[#0D9488] to-[#22577A] bg-clip-text text-transparent ${cfg.textClass}`}
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Innovista
        </span>
      </div>
    </div>
  );
}

export function InnovistaSpinIndicator() {
  return (
    <span className="innovista-spin-indicator inline-flex items-center justify-center">
      <InnovistaLoader size="md" />
    </span>
  );
}

export default InnovistaLoader;
