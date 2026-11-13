import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import {
  DEFAULT_ABOUT_SECTIONS,
  DEFAULT_CLIENTS,
  DEFAULT_CLIENTS_RIBBON_SPEED,
  DEFAULT_CLIENT_FEEDBACKS,
  DEFAULT_DIRECTOR_MESSAGE,
  DEFAULT_FEEDBACK_SPEED_MS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_JOURNEY_MILESTONES,
  DEFAULT_JOURNEY_SPEED_MS,
  DEFAULT_PARTNERS,
  DEFAULT_PARTNERS_RIBBON_SPEED,
  DEFAULT_SLIDESHOW_SPEED_MS,
  DEFAULT_TEAM_MEMBERS,
  clampRibbonSpeed,
  clampSlideshowSpeedMs,
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "./src/utils/aboutContentHelpers";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  designMatchesCategory,
  findCategoryByParam,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
  resolveRelatedDesigns,
  type DesignItem,
  type ProductCategory,
  type ProductLandingCms,
} from "./src/utils/productCatalogHelpers";
import {
  DEFAULT_PAGE_ADS_CMS,
  isValidAdPageKey,
  normalizePageAdSlide,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  type PageAdsCmsPayload,
} from "./src/utils/pageAdsHelpers";
import {
  RELATED_PORTALS,
  RESOURCE_ATTACHMENTS,
  normalizePortalTile,
  normalizeRelatedPortals,
  type RelatedPortalItem,
} from "./src/utils/siteContentHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads directory
const uploadsDir = path.resolve(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// In-memory data stores with sensible initial data
interface Admin {
  AdminId: number;
  Admin_Name: string;
  Admin_Email: string;
  Admin_Phone: string;
  Admin_Password?: string;
  Admin_Profile?: string;
}

let admins: Admin[] = [
  {
    AdminId: 1,
    Admin_Name: "Super Admin",
    Admin_Email: "admin@innovista.com",
    Admin_Phone: "+94 77 123 4567",
    Admin_Password: "admin123",
    Admin_Profile: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  },
  {
    AdminId: 2,
    Admin_Name: "Operations Manager",
    Admin_Email: "manager@innovista.com",
    Admin_Phone: "+94 71 987 6543",
    Admin_Password: "admin123",
    Admin_Profile: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  },
];

interface Project {
  ProjectID: number;
  Project_Title: string;
  Project_Description: string;
  Project_Images: string[];
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Client_Company?: string;
  Project_CreatedAt?: string;
  Project_FinishedDate?: string | null;
  Budget: number;
}

let projects: Project[] = [
  {
    ProjectID: 1,
    Project_Title: "Oceanview Villa Glass Cantilever & Sliding Facade",
    Project_Description: "Complete architectural exterior glazing featuring heavy-duty thermally broken aluminium profiles, motorized slim-line sliding glass doors, and structural frameless glass balustrades.",
    Project_Images: [
      "/assets/about/terrace.jpg",
      "/assets/products/door.jpg",
      "/assets/products/hero-showroom.jpg",
    ],
    Location: "Colombo 07, Sri Lanka",
    Client_Name: "Duminda Perera",
    Client_Email: "duminda@zenithcapital.lk",
    Client_Number: "+94 77 455 1200",
    Client_Company: "Zenith Capital Residencies",
    Project_CreatedAt: "2024-01-15T08:00:00.000Z",
    Project_FinishedDate: "2024-09-30T17:00:00.000Z",
    Budget: 8500000,
  },
  {
    ProjectID: 2,
    Project_Title: "Apex Commercial Tower Curtain Wall System",
    Project_Description: "Supply, fabrication, and structural installation of 12-storey unitized aluminium curtain walling with solar-reflective low-E double glazing and integrated ventilation louvers.",
    Project_Images: [
      "/assets/about/facade.jpg",
      "/assets/products/facade-detail.jpg",
      "/assets/products/shopfront.jpg",
    ],
    Location: "Kollupitiya, Colombo",
    Client_Name: "Niroshan Fernando",
    Client_Email: "info@apexdevelopments.com",
    Client_Number: "+94 11 234 5678",
    Client_Company: "Apex Skyline Towers",
    Project_CreatedAt: "2023-06-10T09:00:00.000Z",
    Project_FinishedDate: "2024-04-12T18:00:00.000Z",
    Budget: 24500000,
  },
  {
    ProjectID: 3,
    Project_Title: "Modernist Residence Aluminium Bi-Fold & Skylight",
    Project_Description: "Ultra-slim multi-panel bi-fold doors creating seamless indoor-outdoor transition, custom acoustic interior partitions, and motorized architectural roof skylights.",
    Project_Images: [
      "/assets/about/pavilion.jpg",
      "/assets/products/roof-skylight.jpg",
      "/assets/products/window.jpg",
    ],
    Location: "Kandy, Sri Lanka",
    Client_Name: "Sachithra Weerasinghe",
    Client_Email: "sweera@arcvision.com",
    Client_Number: "+94 71 890 1234",
    Client_Company: "ArcVision Design Studio",
    Project_CreatedAt: "2024-03-01T10:00:00.000Z",
    Project_FinishedDate: "2024-08-15T15:00:00.000Z",
    Budget: 6200000,
  },
  {
    ProjectID: 4,
    Project_Title: "Corporate HQ Acoustic Glass Partitions & Pivot Doors",
    Project_Description: "Frameless acoustic tempered glass partition suites with matte-black powder-coated aluminium perimeter channels, pivot entrance doors, and privacy smart glass integration.",
    Project_Images: [
      "/assets/products/partition.jpg",
      "/assets/products/showroom.jpg",
      "/assets/products/louvers.jpg",
    ],
    Location: "Rajagiriya, Colombo",
    Client_Name: "Kavinda Jayasuriya",
    Client_Email: "kavinda@novatech.io",
    Client_Number: "+94 77 333 9988",
    Client_Company: "NovaTech Solutions",
    Project_CreatedAt: "2024-04-10T08:30:00.000Z",
    Project_FinishedDate: "2024-07-20T17:00:00.000Z",
    Budget: 4800000,
  },
];

let designs: DesignItem[] = DEFAULT_DESIGNS_CATALOG.map((item) =>
  normalizeDesignItem(item)
);

let productLandingCms: ProductLandingCms = normalizeProductLandingCms(
  DEFAULT_PRODUCT_LANDING_CMS
);

let productCategories: ProductCategory[] = DEFAULT_PRODUCT_CATEGORIES.map(
  (cat, idx) => normalizeProductCategory(cat, idx)
);

interface Customer {
  CustomerId: number;
  Cus_Name: string;
  Cus_Email: string;
  Cus_PhoneNumber: string;
  Cus_CompanyName: string;
  Cus_Logo: string;
  Cus_Password?: string;
  Verify_State: boolean;
  Purchase_Goods?: string[];
}

let customers: Customer[] = [
  {
    CustomerId: 1,
    Cus_Name: "Duminda Perera",
    Cus_Email: "duminda@zenithcapital.lk",
    Cus_PhoneNumber: "+94 77 455 1200",
    Cus_CompanyName: "Zenith Capital Residencies",
    Cus_Logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
    Verify_State: true,
    Purchase_Goods: ["Sliding Doors", "Glass Balustrades", "Window Systems"],
  },
  {
    CustomerId: 2,
    Cus_Name: "Kavinda Jayasuriya",
    Cus_Email: "kavinda@novatech.io",
    Cus_PhoneNumber: "+94 77 333 9988",
    Cus_CompanyName: "NovaTech Solutions",
    Cus_Logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=100&h=100&fit=crop",
    Verify_State: true,
    Purchase_Goods: ["Acoustic Partitions", "Pivot Doors"],
  },
];

interface Order {
  OrderID: string;
  Order_Date: string;
  Order_Status: "PENDING" | "SEND" | "VIEWORDER" | "COMPLETED";
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Customer?: {
    Cus_CompanyName?: string;
    Cus_Logo?: string;
    Purchase_Goods?: string[];
  };
  Designs?: {
    Design?: {
      Design_Name?: string;
      Design_Image?: string | string[];
    };
  }[];
}

const orders: Order[] = [
  {
    OrderID: "ORD-9201",
    Order_Date: "2024-10-18T14:32:00.000Z",
    Order_Status: "COMPLETED",
    Client_Name: "Duminda Perera",
    Client_Email: "duminda@zenithcapital.lk",
    Client_Number: "+94 77 455 1200",
    Customer: {
      Cus_CompanyName: "Zenith Capital Residencies",
      Cus_Logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
      Purchase_Goods: ["Sliding Doors", "Glass Balustrades"],
    },
    Designs: [
      {
        Design: {
          Design_Name: "Minimalist Slimline Sliding Door System",
          Design_Image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
        },
      },
    ],
  },
  {
    OrderID: "ORD-9202",
    Order_Date: "2024-11-04T09:15:00.000Z",
    Order_Status: "PENDING",
    Client_Name: "Kavinda Jayasuriya",
    Client_Email: "kavinda@novatech.io",
    Client_Number: "+94 77 333 9988",
    Customer: {
      Cus_CompanyName: "NovaTech Solutions",
      Cus_Logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=100&h=100&fit=crop",
      Purchase_Goods: ["Acoustic Partitions"],
    },
    Designs: [
      {
        Design: {
          Design_Name: "Acoustic Frameless Glass Office Partition",
          Design_Image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
        },
      },
    ],
  },
];

interface Feedback {
  Feed_backId: number;
  Customer: {
    Cus_Name: string;
    Cus_CompanyName: string;
  };
  Rating: number;
  Feed_back_comment: string;
  Feed_Back_Images: string[];
  Design: {
    Design_Name: string;
  };
}

let feedbacks: Feedback[] = [
  {
    Feed_backId: 1,
    Customer: {
      Cus_Name: "Duminda Perera",
      Cus_CompanyName: "Zenith Capital",
    },
    Rating: 5,
    Feed_back_comment: "The floor-to-ceiling slimline glass doors transformed our luxury villa project. The structural finish and weather resistance are world class.",
    Feed_Back_Images: [
      "/assets/aistudio/1ab77d9a369543a7bc865d1d42116ba4_4d6c0340.jpg",
    ],
    Design: {
      Design_Name: "Minimalist Slimline Sliding Door System",
    },
  },
  {
    Feed_backId: 2,
    Customer: {
      Cus_Name: "Kavinda Jayasuriya",
      Cus_CompanyName: "NovaTech HQ",
    },
    Rating: 5,
    Feed_back_comment: "Acoustic insulation is top notch. Precision installation completed ahead of schedule with spotless attention to detailing.",
    Feed_Back_Images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop",
    ],
    Design: {
      Design_Name: "Acoustic Frameless Glass Office Partition",
    },
  },
];

interface NotificationItem {
  id: string;
  NotificationsID: string;
  Notifications_Title: string;
  Notifications_Body: string;
  Date_Timestamp: string;
  isRead: boolean;
}

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    NotificationsID: "notif-1",
    Notifications_Title: "New Project Inquiry",
    Notifications_Body: "Zenith Capital requested a custom quotation for high-span sliding doors.",
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  },
  {
    id: "notif-2",
    NotificationsID: "notif-2",
    Notifications_Title: "Design Approved",
    Notifications_Body: "Casement suite specifications were approved for production line.",
    Date_Timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    isRead: false,
  },
];

// About Page & Vision/Mission dynamic content store (editable by admin)
let visionMissionContent: AboutCmsPayload = {
  slideshowSpeedMs: DEFAULT_SLIDESHOW_SPEED_MS,
  journeySpeedMs: DEFAULT_JOURNEY_SPEED_MS,
  feedbackSpeedMs: DEFAULT_FEEDBACK_SPEED_MS,
  partnersRibbonSpeed: DEFAULT_PARTNERS_RIBBON_SPEED,
  clientsRibbonSpeed: DEFAULT_CLIENTS_RIBBON_SPEED,
  heroSlides: DEFAULT_HERO_SLIDES,
  vision: DEFAULT_ABOUT_SECTIONS.vision,
  mission: DEFAULT_ABOUT_SECTIONS.mission,
  directorMessage: DEFAULT_DIRECTOR_MESSAGE,
  teamMembers: DEFAULT_TEAM_MEMBERS,
  journeyMilestones: DEFAULT_JOURNEY_MILESTONES,
  partners: DEFAULT_PARTNERS,
  clients: DEFAULT_CLIENTS,
  clientFeedbacks: DEFAULT_CLIENT_FEEDBACKS,
};

// Page Advertisements CMS store (editable per card page by admin)
let pageAdsCms: PageAdsCmsPayload = DEFAULT_PAGE_ADS_CMS;

// Related Hardware & Portals Collage CMS store (editable by admin)
let relatedPortals: RelatedPortalItem[] = normalizeRelatedPortals(RELATED_PORTALS);

// =================== API ENDPOINTS ===================

// Upload route (allows admin to upload images directly)
app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    secure_url: fileUrl,
    url: fileUrl,
    filename: req.file.filename,
  });
});

// Auth endpoints
app.post("/auth/login", (req: Request, res: Response) => {
  const email = (req.query.email as string) || req.body?.email || req.body?.username;
  const password = (req.query.password as string) || req.body?.password;

  const admin = admins.find(
    (a) => a.Admin_Email?.toLowerCase() === email?.toLowerCase()
  );

  if (!admin || (admin.Admin_Password && admin.Admin_Password !== password)) {
    // If entered default demo credentials
    if (email === "admin@innovista.com" && password === "admin123") {
      return res.json({
        message: "Login successful!",
        tokens: {
          accessToken: "mock-access-token-" + Date.now(),
          refreshToken: "mock-refresh-token-" + Date.now(),
        },
        admin: admins[0],
      });
    }
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    message: "Login successful!",
    tokens: {
      accessToken: "mock-access-token-" + admin.AdminId + "-" + Date.now(),
      refreshToken: "mock-refresh-token-" + admin.AdminId + "-" + Date.now(),
    },
    admin,
  });
});

app.get("/auth/refresh", (_req: Request, res: Response) => {
  return res.json({
    accessToken: "mock-new-access-token-" + Date.now(),
  });
});

app.post("/auth/register", (req: Request, res: Response) => {
  const { Admin_Name, Admin_Email, Admin_Phone, Admin_Password, Admin_Profile } = req.body;
  if (!Admin_Name || !Admin_Email) {
    return res.status(400).json({ message: "Name and Email are required." });
  }
  const newAdmin: Admin = {
    AdminId: Date.now(),
    Admin_Name,
    Admin_Email,
    Admin_Phone: Admin_Phone || "",
    Admin_Password: Admin_Password || "admin123",
    Admin_Profile: Admin_Profile || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  };
  admins.push(newAdmin);
  return res.json({ message: "Admin registered successfully!", admin: newAdmin });
});

app.get("/auth/getAllAdmins", (_req: Request, res: Response) => {
  const sanitized = admins.map((admin) => {
    const copy = { ...admin };
    delete copy.Admin_Password;
    return copy;
  });
  return res.json(sanitized);
});

app.delete("/auth/RemoveAdmin", (req: Request, res: Response) => {
  const adminId = parseInt(req.query.adminId as string, 10);
  if (admins.length <= 1) {
    return res.status(400).json({ message: "Cannot remove the only remaining admin." });
  }
  admins = admins.filter((a) => a.AdminId !== adminId);
  return res.json({ message: "Admin removed successfully." });
});

app.post("/auth/ResetPassword", (_req: Request, res: Response) => {
  return res.json({ message: "Password reset successfully." });
});

app.post("/auth/forgot-password", (req: Request, res: Response) => {
  const newPassword = (req.query.newPassword as string) || req.body?.newPassword;
  if (newPassword && admins[0]) {
    admins[0].Admin_Password = newPassword;
  }
  return res.json({ message: "Password reset successfully." });
});

app.get("/admin/summary", (_req: Request, res: Response) => {
  const pendingOrders = orders.filter((o) => o.Order_Status === "PENDING").length;
  const completedOrders = orders.filter((o) => o.Order_Status === "COMPLETED").length;
  const verifiedCustomers = customers.filter((c) => c.Verify_State).length;
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const totalProjectBudget = projects.reduce((sum, p) => sum + (Number(p.Budget) || 0), 0);

  return res.json({
    admins: admins.length,
    designs: designs.length,
    categories: productCategories.length,
    customers: customers.length,
    verifiedCustomers,
    orders: orders.length,
    pendingOrders,
    completedOrders,
    projects: projects.length,
    totalProjectBudget,
    feedbacks: feedbacks.length,
    unreadNotifications,
  });
});

app.post("/auth/logout", (_req: Request, res: Response) => {
  return res.json({ message: "Logout successful." });
});

// Projects endpoints
app.get("/projects/getAllProjects", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = projects.slice(startIndex, endIndex);
  return res.json({
    data,
    total: projects.length,
    page,
    limit,
  });
});

app.post("/projects/createProject", (req: Request, res: Response) => {
  const newProject: Project = {
    ...req.body,
    ProjectID: Date.now(),
    Project_CreatedAt: new Date().toISOString(),
  };
  projects.unshift(newProject);
  return res.json({ message: "Project created successfully!", data: newProject });
});

app.delete("/projects/deleteProject", (req: Request, res: Response) => {
  const id = parseInt(req.query.ProjectID as string, 10);
  projects = projects.filter((p) => p.ProjectID !== id);
  return res.json({ message: "Project deleted successfully!" });
});

app.put("/projects/updateProject", (req: Request, res: Response) => {
  const id = req.body.ProjectID;
  const index = projects.findIndex((p) => p.ProjectID === id);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...req.body };
    return res.json({ message: "Project updated successfully!", data: projects[index] });
  }
  return res.status(404).json({ message: "Project not found" });
});

// Designs endpoints
app.get("/designs/all", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = designs.slice(startIndex, endIndex);
  return res.json({
    data,
    total: designs.length,
    page,
    limit,
  });
});

app.get("/designs/byCategory", (req: Request, res: Response) => {
  const categoryParam = ((req.query.category as string) || "").trim();
  if (!categoryParam || categoryParam.toLowerCase() === "all") {
    return res.json(designs);
  }
  const matchedCat = findCategoryByParam(productCategories, categoryParam);
  const filtered = designs.filter((d) =>
    designMatchesCategory(d, matchedCat || categoryParam)
  );
  return res.json(filtered);
});

app.get("/designs/DesignDetails", (req: Request, res: Response) => {
  const idsStr = (req.query.ids as string) || "";
  const idList = idsStr.split(",").map((s) => s.trim()).filter(Boolean);
  const found = designs.filter((d) => idList.includes(String(d.DesignID)));
  return res.json(found);
});

app.get("/designs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const found = designs.find((d) => String(d.DesignID) === String(id));
  if (!found) {
    return res.status(404).json({ message: "Design not found" });
  }
  const relatedDesigns = resolveRelatedDesigns(found, designs, productCategories, 4);
  return res.json({ data: found, relatedDesigns });
});

app.post("/designs/create", (req: Request, res: Response) => {
  const newDesign = normalizeDesignItem(
    {
      ...req.body,
      DesignID: Date.now(),
      Design_CreatedAt: new Date().toISOString(),
    },
    Date.now()
  );
  designs.unshift(newDesign);
  return res.json({ message: "Design created successfully!", data: newDesign });
});

app.delete("/designs/deleteDesign", (req: Request, res: Response) => {
  const id = String(req.query.designId || "");
  designs = designs
    .filter((d) => String(d.DesignID) !== id)
    .map((d) => ({
      ...d,
      relatedProductIds: (d.relatedProductIds || []).filter(
        (rid) => String(rid) !== id
      ),
    }));
  return res.json({ message: "Design deleted successfully!" });
});

app.put("/designs/updateDesign", (req: Request, res: Response) => {
  const id = req.body.DesignID;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index !== -1) {
    const existing = designs[index];
    const updated = normalizeDesignItem(
      {
        ...existing,
        ...req.body,
        DesignID: existing.DesignID,
        Design_CreatedAt: existing.Design_CreatedAt,
      },
      existing.DesignID
    );
    designs[index] = updated;
    return res.json({ message: "Design updated successfully!", data: updated });
  }
  return res.status(404).json({ message: "Design not found" });
});

app.put("/designs/:id/related", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: "Design not found" });
  }
  const rawIds = Array.isArray(req.body?.relatedProductIds)
    ? req.body.relatedProductIds
    : [];
  const existing = designs[index];
  const updated = normalizeDesignItem(
    {
      ...existing,
      relatedProductIds: rawIds,
    },
    existing.DesignID
  );
  designs[index] = updated;
  return res.json({
    message: "Related products linked successfully!",
    data: updated,
    relatedDesigns: resolveRelatedDesigns(updated, designs, productCategories, 4),
  });
});

app.put("/designs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const index = designs.findIndex((d) => String(d.DesignID) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: "Design not found" });
  }
  const existing = designs[index];
  const updated = normalizeDesignItem(
    {
      ...existing,
      ...req.body,
      DesignID: existing.DesignID,
      Design_CreatedAt: existing.Design_CreatedAt,
    },
    existing.DesignID
  );
  designs[index] = updated;
  return res.json({ message: "Design updated successfully!", data: updated });
});

// Customers endpoints
app.get("/customer/getAllCustomers", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = customers.slice(startIndex, endIndex);
  return res.json({
    data,
    total: customers.length,
    page,
    limit,
  });
});

app.post("/customer/Customer_register", (req: Request, res: Response) => {
  const newCustomer: Customer = {
    ...req.body,
    CustomerId: Date.now(),
    Verify_State: false,
  };
  customers.unshift(newCustomer);
  return res.json({
    message: "Customer registered successfully. Check your email for verification.",
    data: newCustomer,
  });
});

app.put("/customer/updateCustomer", (req: Request, res: Response) => {
  const id = req.body.CustomerId;
  const index = customers.findIndex((c) => c.CustomerId === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...req.body };
    return res.json({ message: "Customer updated successfully!", data: customers[index] });
  }
  return res.status(404).json({ message: "Customer not found" });
});

app.delete("/customer/deleteCustomer", (req: Request, res: Response) => {
  const id = parseInt(req.query.customerId as string, 10);
  customers = customers.filter((c) => c.CustomerId !== id);
  return res.json({ message: "Customer deleted successfully!" });
});

app.post("/customer/login", (req: Request, res: Response) => {
  const email = (req.body.email || req.query.email || "").toString().trim().toLowerCase();
  const password = (req.body.password || req.query.password || "").toString().trim();

  if (!email) {
    return res.status(400).json({ message: "Email or phone number is required." });
  }

  // Find customer by email or phone
  let customer = customers.find(
    (c) =>
      c.Cus_Email.toLowerCase() === email ||
      c.Cus_PhoneNumber.replace(/\s+/g, "") === email.replace(/\s+/g, "")
  );

  // If customer doesn't exist, create a new verified client for a smooth experience
  if (!customer) {
    customer = {
      CustomerId: Date.now(),
      Cus_Name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      Cus_Email: email.includes("@") ? email : `${email}@example.com`,
      Cus_PhoneNumber: email.includes("@") ? "+94 77 123 4567" : email,
      Cus_CompanyName: "Innovista Client Partner",
      Cus_Logo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
      Cus_Password: password || "customer123",
      Verify_State: true,
      Purchase_Goods: ["Architectural Glazing", "Custom Aluminium"],
    };
    customers.push(customer);
  }

  return res.json({
    message: "Customer login successful!",
    tokens: {
      accessToken: "mock-cus-access-token-" + customer.CustomerId + "-" + Date.now(),
      refreshToken: "mock-cus-refresh-token-" + customer.CustomerId + "-" + Date.now(),
    },
    customer,
  });
});

app.get("/customer/profile", (req: Request, res: Response) => {
  const customerId = parseInt(req.query.customerId as string, 10);
  const email = (req.query.email as string || "").toLowerCase();

  let customer = customers.find(
    (c) => (customerId && c.CustomerId === customerId) || (email && c.Cus_Email.toLowerCase() === email)
  );

  if (!customer) {
    customer = customers[0];
  }

  // Get orders associated with this customer
  const customerOrders = orders.filter(
    (o) =>
      (customer && o.Client_Email.toLowerCase() === customer.Cus_Email.toLowerCase()) ||
      (customer && o.Client_Name.toLowerCase() === customer.Cus_Name.toLowerCase()) ||
      (customer && o.Customer?.Cus_CompanyName === customer.Cus_CompanyName)
  );

  return res.json({
    customer,
    orders: customerOrders,
  });
});

app.put("/customer/updateProfile", (req: Request, res: Response) => {
  const customerId = req.body.CustomerId || parseInt(req.query.customerId as string, 10);
  const index = customers.findIndex((c) => c.CustomerId === customerId);

  if (index !== -1) {
    customers[index] = {
      ...customers[index],
      ...req.body,
    };
    return res.json({
      message: "Profile updated successfully!",
      customer: customers[index],
    });
  }

  return res.status(404).json({ message: "Customer profile not found" });
});

app.post("/customer/verifyCustomer", (req: Request, res: Response) => {
  const id = parseInt(req.query.customerId as string, 10);
  const customer = customers.find((c) => c.CustomerId === id);
  if (customer) {
    customer.Verify_State = true;
    return res.json({ message: "Customer verified successfully!" });
  }
  return res.status(404).json({ message: "Customer not found." });
});

// Orders endpoints
app.get("/order/getAllOrders", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = orders.slice(startIndex, endIndex);
  return res.json({
    data,
    total: orders.length,
    page,
    limit,
  });
});

app.post("/order/createOrder", (req: Request, res: Response) => {
  const rawDesigns = Array.isArray(req.body.Designs) ? req.body.Designs : [];
  const designItems =
    rawDesigns.length > 0
      ? rawDesigns.map((item: { DesignID: string | number }) => {
          const fullDesign = designs.find(
            (d) => String(d.DesignID) === String(item.DesignID)
          );
          return {
            Design: {
              Design_Name:
                fullDesign?.Design_Name ||
                req.body.Product_Name ||
                "Custom Fabrication Item",
              Design_Image: fullDesign?.Design_Image || [],
            },
          };
        })
      : [
          {
            Design: {
              Design_Name: req.body.Product_Name || "General Product Inquiry",
              Design_Image: [],
            },
          },
        ];

  const inquiryType =
    typeof req.body.Inquiry_Type === "string" && req.body.Inquiry_Type.trim()
      ? req.body.Inquiry_Type.trim()
      : "Product Quotation";

  const newOrder: Order = {
    OrderID: "ORD-" + Math.floor(1000 + Math.random() * 9000),
    Order_Date: new Date().toISOString(),
    Order_Status: "PENDING",
    Client_Name: req.body.Client_Name || "Valued Client",
    Client_Email: req.body.Client_Email || "client@example.com",
    Client_Number: req.body.Client_Number,
    Customer: {
      Cus_CompanyName: inquiryType,
    },
    Designs: designItems,
  };
  orders.unshift(newOrder);

  // Trigger notification
  notifications.unshift({
    id: "notif-" + Date.now(),
    NotificationsID: "notif-" + Date.now(),
    Notifications_Title: `New ${inquiryType} (${newOrder.OrderID})`,
    Notifications_Body: `Inquiry from ${newOrder.Client_Name} (${newOrder.Client_Email}) for ${
      designItems[0]?.Design?.Design_Name || "Custom System"
    }.`,
    Date_Timestamp: new Date().toISOString(),
    isRead: false,
  });

  return res.json({ message: "Quote request submitted successfully!", data: newOrder });
});

app.put("/order/ChangeStates", (req: Request, res: Response) => {
  const orderId = req.query.orderId as string;
  const status = req.query.Status as Order["Order_Status"];
  const order = orders.find((o) => o.OrderID === orderId);
  if (order && status) {
    order.Order_Status = status;
    return res.json({ message: `Status updated to ${status}!`, order });
  }
  return res.status(404).json({ message: "Order not found" });
});

// Feedback endpoints
app.get("/feedback/allFeedbacks", (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = feedbacks.slice(startIndex, endIndex);
  return res.json({
    data,
    total: feedbacks.length,
    page,
    limit,
  });
});

app.delete("/feedback/deleteFeedback", (req: Request, res: Response) => {
  const id = parseInt(req.query.feedbackId as string, 10);
  feedbacks = feedbacks.filter((f) => f.Feed_backId !== id);
  return res.json({ message: "Feedback deleted successfully!" });
});

app.post("/feedback/createFeedback", (req: Request, res: Response) => {
  const newFeedback: Feedback = {
    ...req.body,
    Feed_backId: Date.now(),
  };
  feedbacks.unshift(newFeedback);
  return res.json({ message: "Feedback submitted successfully!", data: newFeedback });
});

// Notifications endpoints
app.get("/Notification/getalerts", (_req: Request, res: Response) => {
  return res.json(notifications);
});

app.post("/Notification/markAsRead", (req: Request, res: Response) => {
  const id = (req.query.NotificationsID as string) || req.body?.NotificationsID;
  const notif = notifications.find((n) => n.NotificationsID === id || n.id === id);
  if (notif) {
    notif.isRead = true;
    return res.json({ message: "Notification marked as read." });
  }
  return res.status(404).json({ message: "Notification not found." });
});

// About Page Full CMS Endpoints (Slideshow Speed, Vision, Mission, Leadership, Teams, Journey, Partners, Clients, Feedbacks)
app.get("/about/vision-mission", (_req: Request, res: Response) => {
  return res.json(visionMissionContent);
});

app.put("/about/vision-mission", (req: Request, res: Response) => {
  if (req.body) {
    visionMissionContent = normalizeAboutCmsPayload(req.body, visionMissionContent);
    return res.json({
      message: "About showcase, slideshow, and sections updated successfully!",
      data: visionMissionContent,
    });
  }
  return res.status(400).json({ message: "Invalid payload" });
});

app.get("/about/hero-slides", (_req: Request, res: Response) => {
  return res.json({
    heroSlides: visionMissionContent.heroSlides,
    slideshowSpeedMs: visionMissionContent.slideshowSpeedMs,
  });
});

app.put("/about/hero-slides", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.heroSlides) || req.body.heroSlides.length === 0) {
    return res.status(400).json({ message: "At least one slide is required." });
  }
  visionMissionContent.heroSlides = req.body.heroSlides;
  if (req.body.slideshowSpeedMs !== undefined) {
    visionMissionContent.slideshowSpeedMs = clampSlideshowSpeedMs(req.body.slideshowSpeedMs);
  }
  return res.json({
    message: "Hero slideshow updated successfully!",
    heroSlides: visionMissionContent.heroSlides,
    slideshowSpeedMs: visionMissionContent.slideshowSpeedMs,
  });
});

app.get("/about/partners", (_req: Request, res: Response) => {
  return res.json({
    data: visionMissionContent.partners,
    partnersRibbonSpeed: visionMissionContent.partnersRibbonSpeed,
  });
});

app.put("/about/partners", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.partners)) {
    return res.status(400).json({ message: "Partners list is required." });
  }
  const nextSpeed =
    req.body?.partnersRibbonSpeed !== undefined
      ? clampRibbonSpeed(req.body.partnersRibbonSpeed, DEFAULT_PARTNERS_RIBBON_SPEED)
      : visionMissionContent.partnersRibbonSpeed;
  visionMissionContent = normalizeAboutCmsPayload(
    {
      ...visionMissionContent,
      partners: req.body.partners,
      partnersRibbonSpeed: nextSpeed,
    },
    visionMissionContent
  );
  return res.json({
    message: "Partners updated!",
    data: visionMissionContent.partners,
    partnersRibbonSpeed: visionMissionContent.partnersRibbonSpeed,
  });
});

app.get("/about/clients", (_req: Request, res: Response) => {
  return res.json({
    data: visionMissionContent.clients,
    clientsRibbonSpeed: visionMissionContent.clientsRibbonSpeed,
  });
});

app.put("/about/clients", (req: Request, res: Response) => {
  if (!Array.isArray(req.body?.clients)) {
    return res.status(400).json({ message: "Clients list is required." });
  }
  const nextSpeed =
    req.body?.clientsRibbonSpeed !== undefined
      ? clampRibbonSpeed(req.body.clientsRibbonSpeed, DEFAULT_CLIENTS_RIBBON_SPEED)
      : visionMissionContent.clientsRibbonSpeed;
  visionMissionContent = normalizeAboutCmsPayload(
    {
      ...visionMissionContent,
      clients: req.body.clients,
      clientsRibbonSpeed: nextSpeed,
    },
    visionMissionContent
  );
  return res.json({
    message: "Clients updated!",
    data: visionMissionContent.clients,
    clientsRibbonSpeed: visionMissionContent.clientsRibbonSpeed,
  });
});

// Product Landing Slideshow & Product Categories CRUD Endpoints
app.get("/products/cms", (_req: Request, res: Response) => {
  const orderedCategories = [...productCategories].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  return res.json({
    landing: productLandingCms,
    categories: orderedCategories,
  });
});

app.put("/products/cms", (req: Request, res: Response) => {
  productLandingCms = normalizeProductLandingCms(
    req.body?.landing || req.body,
    productLandingCms
  );
  return res.json({
    message: "Product landing slideshow updated successfully!",
    landing: productLandingCms,
  });
});

app.get("/products/categories", (_req: Request, res: Response) => {
  const orderedCategories = [...productCategories].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  return res.json({ data: orderedCategories });
});

app.post("/products/categories", (req: Request, res: Response) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ message: "Category name is required." });
  }
  const normalized = normalizeProductCategory(
    {
      ...req.body,
      CategoryID: `cat-${Date.now()}`,
      displayOrder: productCategories.length + 1,
    },
    productCategories.length
  );

  // Ensure slug uniqueness
  const duplicateSlug = productCategories.some(
    (cat) => cat.slug.toLowerCase() === normalized.slug.toLowerCase()
  );
  if (duplicateSlug) {
    normalized.slug = `${normalized.slug}-${Date.now().toString().slice(-4)}`;
  }

  productCategories.push(normalized);
  return res.json({
    message: "Product category created successfully!",
    data: normalized,
  });
});

app.put("/products/categories/reorder", (req: Request, res: Response) => {
  const orderedIds: string[] = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds
    : [];
  if (orderedIds.length === 0) {
    return res.status(400).json({ message: "orderedIds array is required." });
  }

  const map = new Map(productCategories.map((c) => [c.CategoryID, c]));
  const nextList: ProductCategory[] = [];
  orderedIds.forEach((id, idx) => {
    const found = map.get(id);
    if (found) {
      nextList.push({ ...found, displayOrder: idx + 1 });
      map.delete(id);
    }
  });
  for (const remaining of map.values()) {
    nextList.push({ ...remaining, displayOrder: nextList.length + 1 });
  }
  productCategories = nextList;
  return res.json({
    message: "Categories reordered successfully!",
    data: productCategories,
  });
});

app.put("/products/categories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = productCategories.findIndex(
    (c) => c.CategoryID === id || c.slug === id
  );
  if (idx === -1) {
    return res.status(404).json({ message: "Category not found." });
  }
  const existing = productCategories[idx];
  const updated = normalizeProductCategory(
    {
      ...existing,
      ...req.body,
      CategoryID: existing.CategoryID,
      displayOrder:
        typeof req.body?.displayOrder === "number"
          ? req.body.displayOrder
          : existing.displayOrder,
    },
    idx
  );
  productCategories[idx] = updated;
  return res.json({
    message: "Category updated successfully!",
    data: updated,
  });
});

app.delete("/products/categories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (productCategories.length <= 1) {
    return res
      .status(400)
      .json({ message: "At least one product category must remain active." });
  }
  const before = productCategories.length;
  productCategories = productCategories
    .filter((c) => c.CategoryID !== id && c.slug !== id)
    .map((c, idx) => ({ ...c, displayOrder: idx + 1 }));

  if (productCategories.length === before) {
    return res.status(404).json({ message: "Category not found." });
  }
  return res.json({ message: "Category deleted successfully!" });
});

// Page Advertisements CMS Endpoints (multiple image ads + auto-slideshow interval per card page)
app.get("/ads/cms", (req: Request, res: Response) => {
  const requestedKey = req.query.pageKey;
  if (isValidAdPageKey(requestedKey)) {
    return res.json({
      page: pageAdsCms.pages[requestedKey],
      pages: pageAdsCms.pages,
    });
  }
  return res.json(pageAdsCms);
});

app.put("/ads/cms", (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ message: "Invalid payload." });
  }
  if (isValidAdPageKey(req.body.pageKey)) {
    const key = req.body.pageKey;
    const updatedPage = normalizeSinglePageAdsConfig(
      req.body,
      key,
      pageAdsCms.pages[key]
    );
    pageAdsCms = {
      pages: {
        ...pageAdsCms.pages,
        [key]: updatedPage,
      },
    };
    return res.json({
      message: "Page advertisements updated successfully!",
      page: updatedPage,
      pages: pageAdsCms.pages,
    });
  }
  pageAdsCms = normalizePageAdsCms(req.body, pageAdsCms);
  return res.json({
    message: "All page advertisements updated successfully!",
    pages: pageAdsCms.pages,
  });
});

app.put("/ads/cms/:pageKey", (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    req.body,
    pageKey,
    pageAdsCms.pages[pageKey]
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: `${updatedPage.label} advertisements updated!`,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.post("/ads/cms/:pageKey/ads", (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const slide = normalizePageAdSlide(
    {
      ...req.body,
      id: req.body?.id || `ad-${pageKey}-${Date.now()}`,
    },
    current.ads.length
  );
  if (!slide) {
    return res.status(400).json({ message: "Advertisement image is required." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    {
      ...current,
      enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : true,
      ads: [...current.ads, slide],
    },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement added successfully!",
    slide,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.put("/ads/cms/:pageKey/ads/:adId", (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const idx = current.ads.findIndex((a) => a.id === adId);
  if (idx === -1) {
    return res.status(404).json({ message: "Advertisement not found." });
  }
  const updatedSlide = normalizePageAdSlide(
    {
      ...current.ads[idx],
      ...req.body,
      id: adId,
    },
    idx
  );
  if (!updatedSlide) {
    return res.status(400).json({ message: "Advertisement image is required." });
  }
  const nextAds = current.ads.map((a) => (a.id === adId ? updatedSlide : a));
  const updatedPage = normalizeSinglePageAdsConfig(
    { ...current, ads: nextAds },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement updated successfully!",
    slide: updatedSlide,
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

app.delete("/ads/cms/:pageKey/ads/:adId", (req: Request, res: Response) => {
  const { pageKey, adId } = req.params;
  if (!isValidAdPageKey(pageKey)) {
    return res.status(400).json({ message: "Unknown card page key." });
  }
  const current = pageAdsCms.pages[pageKey];
  const before = current.ads.length;
  const nextAds = current.ads.filter((a) => a.id !== adId);
  if (nextAds.length === before) {
    return res.status(404).json({ message: "Advertisement not found." });
  }
  const updatedPage = normalizeSinglePageAdsConfig(
    { ...current, ads: nextAds },
    pageKey,
    current
  );
  pageAdsCms = {
    pages: {
      ...pageAdsCms.pages,
      [pageKey]: updatedPage,
    },
  };
  return res.json({
    message: "Advertisement deleted successfully!",
    page: updatedPage,
    pages: pageAdsCms.pages,
  });
});

// Downloadable Resource Attachments Endpoint
app.get("/api/resources/download/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const item = RESOURCE_ATTACHMENTS.find((doc) => doc.id === id);
  if (!item) {
    return res.status(404).json({ message: "Resource attachment not found." });
  }

  const documentBody = [
    "INNOVISTA METAL FABRICONIX PVT LTD — TECHNICAL RESOURCE",
    "================================================================",
    `Document Title : ${item.title}`,
    `Document Format: ${item.format}`,
    `Summary        : ${item.summary}`,
    `Prepared Date  : ${new Date().toISOString().slice(0, 10)}`,
    "",
    "CORE ARCHITECTURAL SPECIFICATIONS",
    "----------------------------------------------------------------",
    "- Alloy Grade        : Architectural Aluminium 6063-T5 / 6060-T66",
    "- Coastal Coating    : 25-Micron Anodizing / Qualicoat Class 2",
    "- Hardware Core      : European Marine-Grade SS316 Hardware",
    "- Structural Glazing : Toughened & Acoustic PVB Laminated Glass",
    "- Head Office        : No. 42, Nawala Road, Colombo 05, Sri Lanka",
    "- Direct Support     : engineering@innovista.lk | +94 11 234 5688",
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${item.fileName}"`
  );
  return res.send(documentBody);
});

// Related Hardware & Portals Collage CRUD Endpoints
app.get("/api/resources/portals", (_req: Request, res: Response) => {
  return res.json({ data: relatedPortals });
});

app.put("/api/resources/portals", (req: Request, res: Response) => {
  const payload = Array.isArray(req.body?.data) ? req.body.data : req.body;
  if (!Array.isArray(payload)) {
    return res.status(400).json({ message: "Portals array is required." });
  }
  relatedPortals = normalizeRelatedPortals(payload);
  return res.json({
    message: "Related portals collage updated successfully!",
    data: relatedPortals,
  });
});

app.post("/api/resources/portals", (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!name || !url) {
    return res
      .status(400)
      .json({ message: "Portal name and destination link are required." });
  }
  const tile = normalizePortalTile(
    {
      ...req.body,
      id: req.body?.id || `portal-${Date.now()}`,
    },
    relatedPortals.length
  );
  relatedPortals.push(tile);
  return res.json({
    message: "Portal collage tile added!",
    data: tile,
    items: relatedPortals,
  });
});

app.put("/api/resources/portals/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = relatedPortals.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Portal tile not found." });
  }
  const updated = normalizePortalTile(
    {
      ...relatedPortals[idx],
      ...req.body,
      id,
    },
    idx
  );
  relatedPortals[idx] = updated;
  return res.json({
    message: "Portal collage tile updated!",
    data: updated,
    items: relatedPortals,
  });
});

app.delete("/api/resources/portals/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const before = relatedPortals.length;
  relatedPortals = relatedPortals.filter((p) => p.id !== id);
  if (relatedPortals.length === before) {
    return res.status(404).json({ message: "Portal tile not found." });
  }
  return res.json({
    message: "Portal collage tile deleted!",
    items: relatedPortals,
  });
});

// Start server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
