import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  buildGmailRawMessage,
  buildGoogleCalendarEventPayload,
  type CalendarBusyRange,
} from "../utils/siteVisitSchedulerHelpers";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
];

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Strictly in-memory OAuth token cache (never localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initWorkspaceAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Google sign-in did not return an access token.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

export function getWorkspaceUser(): User | null {
  return cachedAccessToken ? auth.currentUser : null;
}

export async function signOutGoogleWorkspace(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
}

export async function fetchCalendarBusyEventsForDate(
  date: string
): Promise<CalendarBusyRange[]> {
  const token = cachedAccessToken;
  if (!token || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return [];
  }

  const timeMin = encodeURIComponent(`${date}T00:00:00+05:30`);
  const timeMax = encodeURIComponent(`${date}T23:59:59+05:30`);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google session expired. Please sign in again.");
  }
  if (!res.ok) {
    throw new Error(`Calendar lookup failed (${res.status}).`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      status?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items || [])
    .filter((item) => item.status !== "cancelled")
    .map((item) => ({
      start: item.start?.dateTime || (item.start?.date ? `${item.start.date}T00:00:00+05:30` : ""),
      end: item.end?.dateTime || (item.end?.date ? `${item.end.date}T23:59:59+05:30` : ""),
      summary: item.summary,
    }))
    .filter((item) => Boolean(item.start && item.end));
}

export async function createGoogleCalendarEvent(input: {
  date: string;
  slotTime: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  locationName: string;
  notes?: string;
  companyEmail?: string;
}): Promise<{ id: string; htmlLink?: string }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error("Please sign in with Google before creating a Calendar event.");
  }

  const payload = buildGoogleCalendarEventPayload(input);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar event creation failed: ${errText || res.status}`);
  }
  const created = (await res.json()) as { id: string; htmlLink?: string };
  return { id: created.id, htmlLink: created.htmlLink };
}

export async function sendGmailConfirmation(input: {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
}): Promise<{ id: string }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error("Please sign in with Google before sending confirmation via Gmail.");
  }

  const raw = buildGmailRawMessage(input);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (res.status === 401) {
    cachedAccessToken = null;
    throw new Error("Google session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail confirmation failed: ${errText || res.status}`);
  }
  const sent = (await res.json()) as { id: string };
  return { id: sent.id };
}
