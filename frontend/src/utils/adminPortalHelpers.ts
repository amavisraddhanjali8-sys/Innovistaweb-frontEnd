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
    label: "About",
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
  {
    key: "security",
    label: "Security",
    path: "/AdminSecurity",
    matchPaths: ["/AdminSecurity"],
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
        current: "Overview",
        title: "Overview",
        subtitle: "",
      };
    case "/designadded":
      return {
        parent: "Designs",
        current: "Design",
        title: "Design",
        subtitle: "",
      };
    case "/viewalldesigns":
      return {
        parent: "Designs",
        current: "Designs",
        title: "Designs",
        subtitle: "",
      };
    case "/productcategoriesadmin":
      return {
        parent: "Categories",
        current: "Categories",
        title: "Categories",
        subtitle: "",
      };
    case "/customermanager":
      return {
        parent: "Customers",
        current: "Customers",
        title: "Customers",
        subtitle: "",
      };
    case "/ordermanageadmin":
      return {
        parent: "Orders",
        current: "Orders",
        title: "Orders",
        subtitle: "",
      };
    case "/addprojects":
      return {
        parent: "Projects",
        current: "Projects",
        title: "Projects",
        subtitle: "",
      };
    case "/adminfeedback":
      return {
        parent: "Feedback",
        current: "Feedback",
        title: "Feedback",
        subtitle: "",
      };
    case "/editvisionmission":
      return {
        parent: "About",
        current: "About",
        title: "About",
        subtitle: "",
      };
    case "/pageadsadmin":
      return {
        parent: "Ads",
        current: "Ads",
        title: "Ads",
        subtitle: "",
      };
    case "/portalsadmin":
      return {
        parent: "Portals",
        current: "Portals",
        title: "Portals",
        subtitle: "",
      };
    case "/blogsadmin":
      return {
        parent: "Blogs",
        current: "Blogs",
        title: "Blogs",
        subtitle: "",
      };
    case "/chatbotadmin":
      return {
        parent: "Chatbot",
        current: "Chatbot",
        title: "Chatbot",
        subtitle: "",
      };
    case "/adminsecurity":
      return {
        parent: "Security",
        current: "Security",
        title: "Security",
        subtitle: "",
      };
    default:
      return {
        parent: "Admin",
        current: "Portal",
        title: "Portal",
        subtitle: "",
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
