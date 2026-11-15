export interface CustomerOrderItem {
  OrderID: string;
  Order_Date: string;
  Order_Status: "COMPLETED" | "PENDING" | "VIEWORDER" | "SEND" | string;
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Customer?: {
    Cus_CompanyName?: string;
    Cus_Logo?: string;
    Purchase_Goods?: string[];
  };
  Designs?: Array<{
    Design?: {
      Design_Name?: string;
      Design_Image?: string | string[];
    };
  }>;
}

export interface CustomerRfqAttachment {
  id: number | string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes?: number | null;
}

export interface CustomerRfqItem {
  id: number | string;
  customerUserId?: number | null;
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectTitle: string;
  location: string;
  projectType: string;
  projectReferenceNumber?: string | null;
  projectDescription: string;
  materialBrand?: string | null;
  colorCode?: string | null;
  interiorStyle?: string | null;
  budget?: string | null;
  latestDeliveryDate?: string | null;
  proposedVisitDates?: string | null;
  siteAddress?: string | null;
  status: string;
  createdAt: string | Date;
  attachments?: CustomerRfqAttachment[];
}

export interface CustomerSiteVisitItem {
  id: string;
  date: string;
  slotTime: string;
  slotLabel: string;
  locationName: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  notes?: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
  createdAt?: string;
}

export type CountdownState =
  | "upcoming"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "elapsed";

export interface SiteVisitCountdown {
  state: CountdownState;
  label: string;
  formatted: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalRemainingMs: number;
  isUrgent: boolean;
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

/**
 * Parses YYYY-MM-DD and HH:mm into a local Date timestamp (ms).
 */
export function parseSiteVisitStartMs(dateStr: string, slotTime: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || "").trim());
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec((slotTime || "").trim());
  const hour = timeMatch ? Math.max(0, Math.min(23, Number(timeMatch[1]))) : 9;
  const minute = timeMatch ? Math.max(0, Math.min(59, Number(timeMatch[2]))) : 30;

  const dt = new Date(year, month, day, hour, minute, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getTime();
}

/**
 * Computes live countdown details for a scheduled site visit.
 */
export function computeSiteVisitCountdown(
  dateStr: string,
  slotTime: string,
  status: string,
  nowMs: number = Date.now()
): SiteVisitCountdown {
  const upperStatus = (status || "").toUpperCase();
  if (upperStatus === "CANCELLED") {
    return {
      state: "cancelled",
      label: "Cancelled",
      formatted: "Cancelled",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalRemainingMs: 0,
      isUrgent: false,
    };
  }
  if (upperStatus === "COMPLETED") {
    return {
      state: "completed",
      label: "Completed",
      formatted: "Completed",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalRemainingMs: 0,
      isUrgent: false,
    };
  }

  const targetMs = parseSiteVisitStartMs(dateStr, slotTime);
  if (targetMs === null) {
    return {
      state: "elapsed",
      label: "Schedule TBD",
      formatted: "TBD",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalRemainingMs: 0,
      isUrgent: false,
    };
  }

  const diffMs = targetMs - nowMs;
  const oneHourMs = 60 * 60 * 1000;

  if (diffMs <= 0 && diffMs > -oneHourMs) {
    return {
      state: "in-progress",
      label: "Session In Progress",
      formatted: "Live Now",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalRemainingMs: 0,
      isUrgent: true,
    };
  }

  if (diffMs <= -oneHourMs) {
    return {
      state: "elapsed",
      label: "Scheduled Window Passed",
      formatted: "Elapsed",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalRemainingMs: 0,
      isUrgent: false,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const nowDate = new Date(nowMs);
  const targetDate = new Date(targetMs);
  const startOfNowDay = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  ).getTime();
  const startOfTargetDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();
  const calendarDaysAway = Math.round(
    (startOfTargetDay - startOfNowDay) / (24 * 60 * 60 * 1000)
  );

  const formatted =
    days > 0
      ? `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`
      : `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;

  return {
    state: "upcoming",
    label:
      calendarDaysAway <= 0
        ? "Starts Today"
        : calendarDaysAway === 1
        ? "Tomorrow"
        : "Upcoming Visit",
    formatted,
    days,
    hours,
    minutes,
    seconds,
    totalRemainingMs: diffMs,
    isUrgent: diffMs <= 24 * 60 * 60 * 1000,
  };
}

/**
 * Filters orders, RFQs, and site visits to match a customer (or returns all for admin).
 */
export function filterCustomerPortalRecords<
  O extends { Client_Email?: string },
  R extends { email?: string; customerUserId?: number | null },
  V extends { visitorEmail?: string }
>(params: {
  orders: O[];
  rfqs: R[];
  siteVisits: V[];
  email?: string;
  userId?: number | string | null;
  isAdmin?: boolean;
}): {
  orders: O[];
  rfqs: R[];
  siteVisits: V[];
} {
  if (params.isAdmin) {
    return {
      orders: params.orders,
      rfqs: params.rfqs,
      siteVisits: params.siteVisits,
    };
  }

  const normalizedEmail = (params.email || "").trim().toLowerCase();
  const numericUserId =
    params.userId !== undefined && params.userId !== null && !Number.isNaN(Number(params.userId))
      ? Number(params.userId)
      : null;

  const orders = params.orders.filter(
    (o) => (o.Client_Email || "").trim().toLowerCase() === normalizedEmail
  );

  const rfqs = params.rfqs.filter((r) => {
    const emailMatch = (r.email || "").trim().toLowerCase() === normalizedEmail;
    const idMatch =
      numericUserId !== null &&
      r.customerUserId !== undefined &&
      r.customerUserId !== null &&
      Number(r.customerUserId) === numericUserId;
    return emailMatch || idMatch;
  });

  const siteVisits = params.siteVisits.filter(
    (v) => (v.visitorEmail || "").trim().toLowerCase() === normalizedEmail
  );

  return { orders, rfqs, siteVisits };
}

/**
 * Returns YYYY-MM-DD for N days from reference date in local time.
 */
export function getLocalIsoDateOffset(daysFromNow: number, fromDate: Date = new Date()): string {
  const target = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + daysFromNow
  );
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns order-creation payload from saved draft design IDs and signed-in customer profile.
 */
export function buildDraftCartOrderPayload(params: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  designIds: Array<string | number>;
}) {
  return {
    Order_Status: "PENDING" as const,
    Client_Name: params.customerName.trim() || "Client",
    Client_Email: params.customerEmail.trim(),
    Client_Number: (params.customerPhone || "").trim(),
    Designs: params.designIds.map((id) => ({ DesignID: id })),
  };
}
