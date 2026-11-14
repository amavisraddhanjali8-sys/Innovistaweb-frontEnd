import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface BaseProps {
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  ariaLabel?: string;
}

type ButtonVariant = BaseProps & {
  as?: "button";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

type LinkVariant = BaseProps & {
  as: "link";
  to: string;
  onClick?: () => void;
};

export type RequestQuoteButtonProps = ButtonVariant | LinkVariant;

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-4 py-2 text-xs rounded-xl",
  md: "px-5 py-2.5 text-xs sm:text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
};

export default function RequestQuoteButton(props: RequestQuoteButtonProps) {
  const {
    children = "Request Quote",
    className = "",
    size = "md",
    fullWidth = false,
    ariaLabel,
  } = props;

  const baseClasses = [
    "request-quote-fx",
    "inline-flex items-center justify-center gap-2 font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer select-none no-underline",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]",
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (props.as === "link") {
    return (
      <Link
        to={props.to}
        onClick={props.onClick}
        aria-label={ariaLabel}
        className={baseClasses}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
        </span>
      </Link>
    );
  }

  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={ariaLabel}
      className={baseClasses}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
