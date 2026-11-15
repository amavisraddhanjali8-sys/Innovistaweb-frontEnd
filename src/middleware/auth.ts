import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { findUserByEmail, findUserById, getOrCreateUser } from "../db/users.ts";
import { verifySignedToken } from "../utils/securityHelpers.ts";

export interface AuthenticatedPrincipal {
  uid: string;
  email: string;
  name?: string;
  username?: string | null;
  role: "admin" | "staff" | "customer";
  userId?: number;
  isVerified?: boolean;
  emailVerified?: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  totpEnabled?: boolean;
  authProvider: "firebase" | "session";
}

export interface AuthRequest extends Request {
  user?: AuthenticatedPrincipal;
}

function isUserSuspended(user: { accountStatus?: string | null; isActive?: boolean | null }): boolean {
  return (user.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED" || user.isActive === false;
}

async function resolvePrincipalFromHeader(
  authHeader?: string
): Promise<AuthenticatedPrincipal | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  // Explicitly reject legacy insecure placeholder tokens
  if (token === "mock-access-token" || token.startsWith("session:") || token.startsWith("refresh:")) {
    return null;
  }

  // 1. Verify HMAC-SHA256 signed session access token
  const signedPayload = verifySignedToken(token);
  if (signedPayload) {
    if (signedPayload.tokenType !== "access") {
      return null;
    }
    const dbUser =
      (Number.isFinite(signedPayload.sub) ? await findUserById(signedPayload.sub).catch(() => null) : null) ||
      (await findUserByEmail(signedPayload.email).catch(() => null));

    if (!dbUser || isUserSuspended(dbUser)) {
      return null;
    }

    const role = (dbUser.role as "admin" | "staff" | "customer") || "customer";
    if ((role === "admin" || role === "staff") && signedPayload.mfaVerified === false) {
      return null;
    }

    return {
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      username: dbUser.username || null,
      role,
      userId: dbUser.id,
      isVerified: Boolean(dbUser.isVerified),
      emailVerified: Boolean(dbUser.emailVerified),
      accountStatus: "ACTIVE",
      totpEnabled: Boolean(dbUser.totpEnabled),
      authProvider: "session",
    };
  }

  // 2. Fallback: Verify Firebase ID token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || `${decoded.uid}@users.local`).toLowerCase();
    const dbUser = await getOrCreateUser(decoded.uid, email, {
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      avatarUrl: typeof decoded.picture === "string" ? decoded.picture : undefined,
      role: "customer",
      isVerified: false,
      emailVerified: Boolean(decoded.email_verified),
    });

    if (isUserSuspended(dbUser)) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: dbUser.email,
      name: dbUser.name,
      username: dbUser.username || null,
      role: (dbUser.role as "admin" | "staff" | "customer") || "customer",
      userId: dbUser.id,
      isVerified: Boolean(dbUser.isVerified),
      emailVerified: Boolean(dbUser.emailVerified),
      accountStatus: "ACTIVE",
      totpEnabled: Boolean(dbUser.totpEnabled),
      authProvider: "firebase",
    };
  } catch {
    return null;
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const principal = await resolvePrincipalFromHeader(req.headers.authorization);
  if (principal) {
    req.user = principal;
  }
  next();
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token", message: "Authentication required." });
  }

  const principal = await resolvePrincipalFromHeader(authHeader);
  if (!principal) {
    return res.status(401).json({
      error: "Unauthorized: Invalid, suspended, or expired session",
      message: "Your session is invalid, expired, or your account has been suspended.",
    });
  }

  req.user = principal;
  return next();
};

export const requireAdminOrStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token", message: "Administrator authentication required." });
  }
  const principal = await resolvePrincipalFromHeader(authHeader);
  if (!principal) {
    return res.status(401).json({
      error: "Unauthorized: Invalid or expired session",
      message: "Invalid, expired, or MFA-incomplete administrator session.",
    });
  }
  if (principal.role !== "admin" && principal.role !== "staff") {
    return res.status(403).json({
      error: "Forbidden: Admin or staff privileges required",
      message: "Administrator privileges required for this operation.",
    });
  }
  req.user = principal;
  return next();
};
