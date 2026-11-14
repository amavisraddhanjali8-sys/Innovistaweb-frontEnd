export type AuthRole = "admin" | "customer";

export interface SignupFields {
  name: string;
  company: string;
  email: string;
  phone: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SignupValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof SignupFields, string>>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Determines whether an entered identifier belongs to an Innovista admin account.
 */
export function isAdminEmail(identifier: string): boolean {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  return normalized.endsWith("@innovista.com");
}

/**
 * Resolves the post-authentication route based on the signed-in role.
 */
export function resolvePostAuthRoute(role: AuthRole): string {
  return role === "admin" ? "/admin-home" : "/profile";
}

/**
 * Validates login form inputs before submitting to the server.
 */
export function validateLoginInput(identifier: string, password: string): ValidationResult {
  const cleanId = identifier.trim();
  const cleanPw = password.trim();

  if (!cleanId) {
    return { valid: false, error: "Please enter your email address or phone number." };
  }
  if (!cleanPw) {
    return { valid: false, error: "Please enter your password." };
  }
  return { valid: true };
}

/**
 * Validates customer signup inputs before submitting registration.
 */
export function validateSignupInput(fields: SignupFields): SignupValidationResult {
  const errors: Partial<Record<keyof SignupFields, string>> = {};

  if (!fields.name.trim()) {
    errors.name = "Full name is required.";
  }
  if (!fields.company.trim()) {
    errors.company = "Company name is required.";
  }
  if (!fields.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_REGEX.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.phone.trim()) {
    errors.phone = "Phone number is required.";
  }
  if (!fields.password || fields.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Returns built-in demo credentials for 1-click sign-in buttons.
 */
export function getDemoAccountCredentials(kind: "client" | "admin"): {
  email: string;
  password: string;
  role: AuthRole;
} {
  if (kind === "admin") {
    return {
      email: "admin@innovista.com",
      password: "admin123",
      role: "admin",
    };
  }
  return {
    email: "duminda@zenithcapital.lk",
    password: "customer123",
    role: "customer",
  };
}

export type AuthGateAction = "quote" | "cart" | "rfq";

/**
 * Builds a signup-mode login route URL preserving the intended post-auth destination.
 */
export function buildSignupRedirectUrl(
  redirectPath: string,
  action?: AuthGateAction,
  mode: "signup" | "login" = "signup"
): string {
  const safePath =
    redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/profile";
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("redirect", safePath);
  if (action) {
    params.set("action", action);
  }
  return `/profile-login?${params.toString()}`;
}

/**
 * Parses ?mode=signup|login from query string.
 */
export function getAuthModeFromSearch(search: string): "login" | "signup" {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return params.get("mode") === "signup" ? "signup" : "login";
}

/**
 * Parses ?action=quote|cart|rfq from query string.
 */
export function getAuthActionFromSearch(search: string): AuthGateAction | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const action = params.get("action");
  if (action === "quote" || action === "cart" || action === "rfq") {
    return action;
  }
  return null;
}

/**
 * Resolves a safe post-auth destination from query string or falls back by role.
 */
export function parsePostAuthRedirect(search: string, role: AuthRole): string {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const target = (params.get("redirect") || "").trim();
  if (
    target &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.startsWith("/profile-login") &&
    !target.startsWith("/admin-login")
  ) {
    return target;
  }
  return resolvePostAuthRoute(role);
}

