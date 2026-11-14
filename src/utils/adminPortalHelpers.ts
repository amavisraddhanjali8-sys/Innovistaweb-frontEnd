export interface AdminNavItem {
  key: string;
  label: string;
  path: string;
  matchPaths: string[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    path: "/admin-home",
    matchPaths: ["/admin-home", "/ManageAllAdmins", "/admin-register"],
  },
  {
    key: "designs",
    label: "Designs",
    path: "/ViewAllDesigns",
    matchPaths: ["/ViewAllDesigns", "/DesignAdded"],
  },
  {
    key: "categories",
    label: "Categories",
    path: "/ProductCategoriesAdmin",
    matchPaths: ["/ProductCategoriesAdmin"],
  },
  {
    key: "customers",
    label: "Customers",
    path: "/CustomerManager",
    matchPaths: ["/CustomerManager"],
  },
  {
    key: "orders",
    label: "Orders",
    path: "/OrdermanageAdmin",
    matchPaths: ["/OrdermanageAdmin"],
  },
  {
    key: "projects",
    label: "Projects",
    path: "/AddProjects",
    matchPaths: ["/AddProjects"],
  },
  {
    key: "feedback",
    label: "Feedback",
    path: "/AdminFeedback",
    matchPaths: ["/AdminFeedback"],
  },
  {
    key: "about-cms",
    label: "About CMS",
    path: "/EditVisionMission",
    matchPaths: ["/EditVisionMission"],
  },
  {
    key: "ads",
    label: "Ads",
    path: "/PageAdsAdmin",
    matchPaths: ["/PageAdsAdmin"],
  },
  {
    key: "portals",
    label: "Portals",
    path: "/PortalsAdmin",
    matchPaths: ["/PortalsAdmin"],
  },
  {
    key: "blogs",
    label: "Blogs",
    path: "/BlogsAdmin",
    matchPaths: ["/BlogsAdmin"],
  },
  {
    key: "chatbot",
    label: "Chatbot",
    path: "/ChatbotAdmin",
    matchPaths: ["/ChatbotAdmin"],
  },
];

export const ADMIN_SHELL_PATHS: string[] = [
  ...ADMIN_NAV_ITEMS.flatMap((item) => item.matchPaths),
  "/Notification",
];

export function isAdminPortalPath(pathname: string): boolean {
  const clean = pathname.split("?")[0];
  return ADMIN_SHELL_PATHS.some((route) => route.toLowerCase() === clean.toLowerCase());
}

export function getActiveAdminNavKey(pathname: string): string {
  const clean = pathname.split("?")[0].toLowerCase();
  const matched = ADMIN_NAV_ITEMS.find((item) =>
    item.matchPaths.some((p) => p.toLowerCase() === clean)
  );
  return matched ? matched.key : "overview";
}

export interface AdminBreadcrumbMeta {
  parent: string;
  current: string;
  title: string;
  subtitle: string;
}

export function getAdminBreadcrumb(pathname: string): AdminBreadcrumbMeta {
  const clean = pathname.split("?")[0].toLowerCase();
  switch (clean) {
    case "/admin-home":
    case "/managealladmins":
    case "/admin-register":
      return {
        parent: "Admin",
        current: "Overview & Team",
        title: "Admin Command Center",
        subtitle: "Manage administrators, workspace access, and live portal operations.",
      };
    case "/designadded":
      return {
        parent: "Designs",
        current: "Add New Design",
        title: "Design Studio Catalog",
        subtitle: "Publish architectural aluminium & glazing product specifications.",
      };
    case "/viewalldesigns":
      return {
        parent: "Designs",
        current: "All Designs",
        title: "Design Catalog Manager",
        subtitle: "Review, edit, and maintain active architectural systems.",
      };
    case "/productcategoriesadmin":
      return {
        parent: "Categories",
        current: "Product Categories & Slideshows",
        title: "Product Categories & Slideshow CMS",
        subtitle: "Add, edit, delete categories and customize landing page slideshows.",
      };
    case "/customermanager":
      return {
        parent: "Customers",
        current: "Client Directory",
        title: "Customer Accounts",
        subtitle: "Register verified business partners and manage client profiles.",
      };
    case "/ordermanageadmin":
      return {
        parent: "Orders",
        current: "Order Fulfillment",
        title: "Order Management",
        subtitle: "Track fabrication requests, client orders, and fulfillment status.",
      };
    case "/addprojects":
      return {
        parent: "Projects",
        current: "Portfolio Manager",
        title: "Architectural Projects",
        subtitle: "Publish completed installations and maintain portfolio records.",
      };
    case "/adminfeedback":
      return {
        parent: "Feedback",
        current: "Client Reviews",
        title: "Customer Feedback",
        subtitle: "Moderate verified project reviews and client ratings.",
      };
    case "/editvisionmission":
      return {
        parent: "About CMS",
        current: "Showcase Editor",
        title: "About Page CMS",
        subtitle: "Control slideshow speed, Vision & Mission, Team, Journey, Partners & Clients.",
      };
    case "/pageadsadmin":
      return {
        parent: "Ads",
        current: "Page Advertisements",
        title: "Page Advertisement Slideshows",
        subtitle: "Publish multiple ad images and configure slideshow animation speeds for every card page.",
      };
    case "/portalsadmin":
      return {
        parent: "Portals",
        current: "Hardware & Portals Collage",
        title: "Related Hardware & Portals Collage",
        subtitle: "Upload collage photos and assign direct click links for the Resources page directory.",
      };
    case "/blogsadmin":
      return {
        parent: "Blogs",
        current: "Blogger Sync & Home Curation",
        title: "Blogs & Blogger.com Publisher",
        subtitle: "Connect Blogger.com to auto-share posts and curate which articles appear on the Home page.",
      };
    case "/chatbotadmin":
      return {
        parent: "Chatbot",
        current: "Chatbot & Site Visits",
        title: "Chatbot Training & Site Visit Slots",
        subtitle: "Train FAQ questions & answers, customize WhatsApp handoff, and manage visit slots.",
      };
    default:
      return {
        parent: "Admin",
        current: "Portal",
        title: "Innovista Admin",
        subtitle: "Manage operations and content.",
      };
  }
}

export interface OrderMetrics {
  total: number;
  pending: number;
  send: number;
  viewOrder: number;
  completed: number;
}

export function computeOrderMetrics(
  orders: Array<{ Order_Status?: string }>,
  reportedTotal?: number
): OrderMetrics {
  const counts = {
    total: typeof reportedTotal === "number" && reportedTotal >= orders.length ? reportedTotal : orders.length,
    pending: 0,
    send: 0,
    viewOrder: 0,
    completed: 0,
  };

  for (const order of orders) {
    const status = (order.Order_Status || "").toUpperCase();
    if (status === "PENDING") counts.pending += 1;
    else if (status === "SEND") counts.send += 1;
    else if (status === "VIEWORDER") counts.viewOrder += 1;
    else if (status === "COMPLETED") counts.completed += 1;
  }

  return counts;
}

export interface CustomerMetrics {
  total: number;
  verified: number;
  unverified: number;
}

export function computeCustomerMetrics(
  customers: Array<{ Verify_State?: boolean }>,
  reportedTotal?: number
): CustomerMetrics {
  let verified = 0;
  let unverified = 0;
  for (const c of customers) {
    if (c.Verify_State) verified += 1;
    else unverified += 1;
  }
  const total =
    typeof reportedTotal === "number" && reportedTotal >= customers.length
      ? reportedTotal
      : customers.length;
  return { total, verified, unverified };
}

export interface FeedbackMetrics {
  total: number;
  averageRating: number;
  fiveStarCount: number;
}

export function computeFeedbackMetrics(
  feedbacks: Array<{ Rating?: number }>,
  reportedTotal?: number
): FeedbackMetrics {
  if (feedbacks.length === 0) {
    return {
      total: typeof reportedTotal === "number" ? reportedTotal : 0,
      averageRating: 0,
      fiveStarCount: 0,
    };
  }
  let sum = 0;
  let fiveStarCount = 0;
  for (const fb of feedbacks) {
    const rating = Number(fb.Rating) || 0;
    sum += rating;
    if (rating >= 5) fiveStarCount += 1;
  }
  const total =
    typeof reportedTotal === "number" && reportedTotal >= feedbacks.length
      ? reportedTotal
      : feedbacks.length;
  return {
    total,
    averageRating: Number((sum / feedbacks.length).toFixed(1)),
    fiveStarCount,
  };
}

export function formatCurrencyLkr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `RS. ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safe)}`;
}
