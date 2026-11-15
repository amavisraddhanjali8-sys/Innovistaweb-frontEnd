import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { FiLoader } from "react-icons/fi";

export type TactileButtonTone =
  | "azure"
  | "amber"
  | "navy"
  | "pearl"
  | "crimson"
  | "emerald";

interface BaseProps {
  children: ReactNode;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  size?: "xs" | "sm" | "md" | "lg";
  tone?: TactileButtonTone;
  surface?: "light" | "dark";
  fullWidth?: boolean;
  className?: string;
  frameClassName?: string;
  ariaLabel?: string;
}

type ButtonModeProps = BaseProps & {
  as?: "button";
  type?: "button" | "submit";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

type AnchorModeProps = BaseProps & {
  as: "a";
  href: string;
  target?: string;
  rel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

type RouterLinkModeProps = BaseProps & {
  as: "link";
  to: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export type TactileActionButtonProps =
  | ButtonModeProps
  | AnchorModeProps
  | RouterLinkModeProps;

const SIZE_CLASSES: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "px-3.5 py-1.5 text-[11px] gap-1.5",
  sm: "px-4 py-2 text-xs gap-1.5",
  md: "px-5 py-2.5 text-xs sm:text-sm gap-2",
  lg: "px-6 py-3 text-sm gap-2",
};

export default function TactileActionButton(props: TactileActionButtonProps) {
  const {
    children,
    icon,
    trailingIcon,
    loading = false,
    loadingText,
    size = "sm",
    tone = "azure",
    surface = "light",
    fullWidth = false,
    className = "",
    frameClassName = "",
    ariaLabel,
  } = props;

  const btnClasses = [
    "tactile-pill-btn",
    "inline-flex items-center justify-center font-bold whitespace-nowrap shrink-0 cursor-pointer select-none no-underline",
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const frameClasses = [
    "tactile-pill-frame",
    fullWidth ? "w-full" : "",
    frameClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const flareAndContent = (
    <>
      {/* Subtle rim light flare glint */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1.5 right-4 w-10 h-3 rounded-full bg-white/65 blur-[4px] opacity-75 z-0"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {loading ? (
          <FiLoader
            aria-hidden="true"
            className="animate-spin text-sm shrink-0"
          />
        ) : icon ? (
          <span
            aria-hidden="true"
            className="inline-flex items-center shrink-0"
          >
            {icon}
          </span>
        ) : null}
        <span>{loading && loadingText ? loadingText : children}</span>
        {trailingIcon && !loading && (
          <span
            aria-hidden="true"
            className="inline-flex items-center shrink-0"
          >
            {trailingIcon}
          </span>
        )}
      </span>
    </>
  );

  if (props.as === "a") {
    return (
      <span
        className={frameClasses}
        data-surface={surface}
        data-tone={tone}
      >
        <a
          href={props.href}
          target={props.target}
          rel={props.rel}
          onClick={props.onClick}
          aria-label={ariaLabel}
          data-tone={tone}
          data-loading={loading ? "true" : "false"}
          className={btnClasses}
        >
          {flareAndContent}
        </a>
      </span>
    );
  }

  if (props.as === "link") {
    return (
      <span
        className={frameClasses}
        data-surface={surface}
        data-tone={tone}
      >
        <Link
          to={props.to}
          onClick={props.onClick}
          aria-label={ariaLabel}
          data-tone={tone}
          data-loading={loading ? "true" : "false"}
          className={btnClasses}
        >
          {flareAndContent}
        </Link>
      </span>
    );
  }

  return (
    <span
      className={frameClasses}
      data-surface={surface}
      data-tone={tone}
    >
      <button
        type={props.type || "button"}
        onClick={props.onClick}
        disabled={props.disabled || loading}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        data-tone={tone}
        data-loading={loading ? "true" : "false"}
        className={btnClasses}
      >
        {flareAndContent}
      </button>
    </span>
  );
}
