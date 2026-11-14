export interface CustomerFeedbackCustomer {
  Cus_Name: string;
  Cus_CompanyName: string;
  Cus_Role?: string;
  Cus_Avatar?: string;
}

export interface CustomerFeedbackDesign {
  Design_Name: string;
  DesignID?: string;
}

export interface CustomerFeedbackRecord {
  Feed_backId: number;
  Customer: CustomerFeedbackCustomer;
  Rating: number;
  Feed_back_comment: string;
  Feed_Back_Images: string[];
  Design: CustomerFeedbackDesign;
  showOnHome: boolean;
  displayOrder: number;
  createdAt?: string;
}

export interface HomeFeedbackCard {
  id: string;
  feedbackId: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  designName: string;
  designId?: string;
  projectImages: string[];
}

export const DEFAULT_FEEDBACK_AVATAR = "/assets/about/director.jpg";

export const CUSTOMER_AVATAR_PRESETS: Array<{ label: string; url: string }> = [
  { label: "Executive Director Portrait", url: "/assets/about/director.jpg" },
  { label: "Design Architect Portrait", url: "/assets/about/team-architect.jpg" },
  { label: "Structural Engineer Portrait", url: "/assets/about/team-structural.jpg" },
  { label: "Fabrication Lead Portrait", url: "/assets/about/team-fabrication.jpg" },
  { label: "Terrace Villa Installation", url: "/assets/about/terrace.jpg" },
  { label: "Acoustic Partition Suite", url: "/assets/products/partition.jpg" },
];

export const DEFAULT_CUSTOMER_FEEDBACKS: CustomerFeedbackRecord[] = [
  {
    Feed_backId: 1,
    Customer: {
      Cus_Name: "Duminda Perera",
      Cus_CompanyName: "Zenith Capital",
      Cus_Role: "Managing Partner",
      Cus_Avatar: "/assets/about/director.jpg",
    },
    Rating: 5,
    Feed_back_comment:
      "The floor-to-ceiling slimline glass doors transformed our luxury villa project. The structural finish and weather resistance are world class.",
    Feed_Back_Images: ["/assets/about/terrace.jpg"],
    Design: {
      Design_Name: "Minimalist Slimline Sliding Door System",
      DesignID: "1",
    },
    showOnHome: true,
    displayOrder: 0,
    createdAt: "2026-01-12T09:30:00.000Z",
  },
  {
    Feed_backId: 2,
    Customer: {
      Cus_Name: "Dilini Perera",
      Cus_CompanyName: "Studio Harborline",
      Cus_Role: "Principal Architect",
      Cus_Avatar: "/assets/about/team-architect.jpg",
    },
    Rating: 5,
    Feed_back_comment:
      "Their 22mm slim-line thermal sliders gave our coastal villa projects crisp horizon sightlines with zero salt-air rattle.",
    Feed_Back_Images: ["/assets/products/door.jpg"],
    Design: {
      Design_Name: "Minimalist Slimline Sliding Door System",
      DesignID: "1",
    },
    showOnHome: true,
    displayOrder: 1,
    createdAt: "2026-02-04T11:15:00.000Z",
  },
  {
    Feed_backId: 3,
    Customer: {
      Cus_Name: "Kavinda Jayasuriya",
      Cus_CompanyName: "NovaTech HQ",
      Cus_Role: "Head of Workplace Infrastructure",
      Cus_Avatar: "/assets/about/team-structural.jpg",
    },
    Rating: 5,
    Feed_back_comment:
      "Acoustic insulation is top notch. Precision installation completed ahead of schedule with spotless attention to detailing.",
    Feed_Back_Images: ["/assets/products/partition.jpg"],
    Design: {
      Design_Name: "Acoustic Frameless Glass Office Partition",
      DesignID: "3",
    },
    showOnHome: true,
    displayOrder: 2,
    createdAt: "2026-02-18T14:20:00.000Z",
  },
  {
    Feed_backId: 4,
    Customer: {
      Cus_Name: "Kavinda De Silva",
      Cus_CompanyName: "Horizon Hospitality",
      Cus_Role: "Operations Director",
      Cus_Avatar: "/assets/about/team-fabrication.jpg",
    },
    Rating: 5,
    Feed_back_comment:
      "Our resort suites saw a noticeable drop in cooling load after upgrading to Innovista double-glazed acoustic balconies.",
    Feed_Back_Images: ["/assets/products/window.jpg"],
    Design: {
      Design_Name: "Thermally Broken Casement Window Suite",
      DesignID: "2",
    },
    showOnHome: true,
    displayOrder: 3,
    createdAt: "2026-03-02T10:00:00.000Z",
  },
];

const UNSAFE_IMAGE_PREFIX_RE = /^(javascript:|vbscript:)/i;
const BLOCKED_EXTERNAL_IMAGE_HOSTS = [
  "images.unsplash.com",
  "picsum.photos",
  "placeholder.com",
  "via.placeholder.com",
  "randomuser.me",
];

export function sanitizeFeedbackImage(
  rawUrl?: string | null,
  fallback = DEFAULT_FEEDBACK_AVATAR
): string {
  const clean = (rawUrl || "").trim();
  if (!clean) return fallback;
  if (UNSAFE_IMAGE_PREFIX_RE.test(clean)) return fallback;
  const lower = clean.toLowerCase();
  if (BLOCKED_EXTERNAL_IMAGE_HOSTS.some((host) => lower.includes(host))) {
    return fallback;
  }
  return clean;
}

export function clampFeedbackRating(rawRating: unknown): number {
  const numeric = Number(rawRating);
  if (!Number.isFinite(numeric)) return 5;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function normalizeCustomerFeedbackRecord(
  raw: Partial<CustomerFeedbackRecord> | null | undefined,
  index = 0
): CustomerFeedbackRecord {
  const numericId = Number(raw?.Feed_backId);
  const feedBackId =
    Number.isFinite(numericId) && numericId > 0
      ? numericId
      : Date.now() + index;

  const rawCustomer = raw?.Customer;
  const cusName = String(rawCustomer?.Cus_Name || "").trim() || "Valued Client";
  const cusCompany = String(rawCustomer?.Cus_CompanyName || "").trim();
  const cusRole = String(rawCustomer?.Cus_Role || "").trim();

  const rawImages = Array.isArray(raw?.Feed_Back_Images)
    ? raw.Feed_Back_Images
    : [];
  const cleanImages = rawImages
    .map((img) => sanitizeFeedbackImage(String(img || ""), ""))
    .filter(Boolean);

  const rawAvatar = String(rawCustomer?.Cus_Avatar || "").trim();
  const cusAvatar = rawAvatar
    ? sanitizeFeedbackImage(rawAvatar, cleanImages[0] || DEFAULT_FEEDBACK_AVATAR)
    : cleanImages[0] || DEFAULT_FEEDBACK_AVATAR;

  const rawDesign = raw?.Design;
  const designName =
    String(rawDesign?.Design_Name || "").trim() ||
    "Custom Architectural Aluminium System";
  const designId =
    rawDesign?.DesignID !== undefined && String(rawDesign.DesignID).trim() !== ""
      ? String(rawDesign.DesignID).trim()
      : undefined;

  const displayOrder =
    typeof raw?.displayOrder === "number" && Number.isFinite(raw.displayOrder)
      ? raw.displayOrder
      : index;

  return {
    Feed_backId: feedBackId,
    Customer: {
      Cus_Name: cusName,
      Cus_CompanyName: cusCompany,
      ...(cusRole ? { Cus_Role: cusRole } : {}),
      Cus_Avatar: cusAvatar,
    },
    Rating: clampFeedbackRating(raw?.Rating),
    Feed_back_comment: String(raw?.Feed_back_comment || "").trim(),
    Feed_Back_Images: cleanImages,
    Design: {
      Design_Name: designName,
      ...(designId ? { DesignID: designId } : {}),
    },
    showOnHome: raw?.showOnHome !== false,
    displayOrder,
    ...(raw?.createdAt ? { createdAt: String(raw.createdAt) } : {}),
  };
}

export function normalizeCustomerFeedbackList(
  rawList: unknown,
  fallbackList: CustomerFeedbackRecord[] = DEFAULT_CUSTOMER_FEEDBACKS
): CustomerFeedbackRecord[] {
  if (!Array.isArray(rawList)) {
    return fallbackList.map((item, idx) =>
      normalizeCustomerFeedbackRecord(item, idx)
    );
  }
  return rawList.map((item, idx) =>
    normalizeCustomerFeedbackRecord(
      item as Partial<CustomerFeedbackRecord>,
      idx
    )
  );
}

export function formatCustomerRoleSubtitle(
  customer?: Partial<CustomerFeedbackCustomer>
): string {
  const role = (customer?.Cus_Role || "").trim();
  const company = (customer?.Cus_CompanyName || "").trim();
  if (role && company) return `${role} · ${company}`;
  if (role) return role;
  if (company) return company;
  return "Verified Client";
}

export function resolveHomeFeedbackCards(
  records: CustomerFeedbackRecord[] | null | undefined
): HomeFeedbackCard[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  return [...records]
    .filter(
      (item) =>
        item &&
        item.showOnHome !== false &&
        String(item.Feed_back_comment || "").trim().length > 0
    )
    .sort((a, b) => {
      const orderA =
        typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const orderB =
        typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return b.Feed_backId - a.Feed_backId;
    })
    .map((item, idx) => {
      const normalized = normalizeCustomerFeedbackRecord(item, idx);
      const avatar = sanitizeFeedbackImage(
        normalized.Customer.Cus_Avatar || normalized.Feed_Back_Images[0],
        DEFAULT_FEEDBACK_AVATAR
      );
      return {
        id: `fb-${normalized.Feed_backId}`,
        feedbackId: normalized.Feed_backId,
        name: normalized.Customer.Cus_Name,
        role: formatCustomerRoleSubtitle(normalized.Customer),
        company: normalized.Customer.Cus_CompanyName,
        avatar,
        quote: normalized.Feed_back_comment,
        rating: normalized.Rating,
        designName: normalized.Design.Design_Name,
        designId: normalized.Design.DesignID,
        projectImages: normalized.Feed_Back_Images,
      };
    });
}

export interface CustomerFeedbackFormInput {
  customerName: string;
  customerRole?: string;
  companyName?: string;
  avatarUrl?: string;
  designName?: string;
  designId?: string;
  rating: number;
  comment: string;
  images?: string[];
  showOnHome?: boolean;
}

export function validateCustomerFeedbackForm(
  input: CustomerFeedbackFormInput
): string | null {
  if (!input.customerName || input.customerName.trim().length < 2) {
    return "Please enter the customer's name (at least 2 characters).";
  }
  if (!input.comment || input.comment.trim().length < 10) {
    return "Please enter a testimonial comment (at least 10 characters).";
  }
  return null;
}

export function buildCustomerFeedbackPayload(
  input: CustomerFeedbackFormInput,
  displayOrder = 0
): Omit<CustomerFeedbackRecord, "Feed_backId"> {
  const cleanImages = (input.images || [])
    .map((url) => sanitizeFeedbackImage(url, ""))
    .filter(Boolean);
  const avatar = sanitizeFeedbackImage(
    input.avatarUrl || cleanImages[0],
    DEFAULT_FEEDBACK_AVATAR
  );
  const cleanRole = (input.customerRole || "").trim();
  const cleanDesignId = (input.designId || "").trim();

  return {
    Customer: {
      Cus_Name: input.customerName.trim(),
      Cus_CompanyName: (input.companyName || "").trim(),
      ...(cleanRole ? { Cus_Role: cleanRole } : {}),
      Cus_Avatar: avatar,
    },
    Rating: clampFeedbackRating(input.rating),
    Feed_back_comment: input.comment.trim(),
    Feed_Back_Images: cleanImages,
    Design: {
      Design_Name:
        (input.designName || "").trim() || "Custom Architectural Aluminium System",
      ...(cleanDesignId ? { DesignID: cleanDesignId } : {}),
    },
    showOnHome: input.showOnHome !== false,
    displayOrder,
    createdAt: new Date().toISOString(),
  };
}
