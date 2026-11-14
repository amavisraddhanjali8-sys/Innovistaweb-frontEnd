import { count } from "drizzle-orm";
import { db } from "./index.ts";
import {
  appointmentDates,
  appointments,
  appointmentSlots,
  blogPosts,
  categories,
  chatbotFaqs,
  cmsDocuments,
  customerFeedbacks,
  mediaAssets,
  notifications,
  orderItems,
  orders,
  productCategories,
  productImages,
  products,
  projectImages,
  projects,
  relatedPortals,
  users,
} from "./schema.ts";
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
} from "../utils/aboutContentHelpers.ts";
import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  normalizeDesignItem,
  normalizeProductCategory,
  normalizeProductLandingCms,
} from "../utils/productCatalogHelpers.ts";
import { DEFAULT_PAGE_ADS_CMS } from "../utils/pageAdsHelpers.ts";
import {
  RELATED_PORTALS,
  NEWS_ARTICLES,
  RESOURCE_ATTACHMENTS,
  ENGINEERING_GUIDELINES,
  RESOURCE_FAQS,
  CONTACT_DEPARTMENTS,
  CONTACT_LOCATIONS,
  normalizeRelatedPortals,
} from "../utils/siteContentHelpers.ts";
import { DEFAULT_BLOGGER_CONFIG, DEFAULT_BLOG_POSTS } from "../utils/blogBloggerHelpers.ts";
import { DEFAULT_SITE_CONTACT_SETTINGS, normalizeSiteContactSettings } from "../utils/footerConsultationHelpers.ts";
import { DEFAULT_CHATBOT_CONFIG, DEFAULT_CHATBOT_FAQS } from "../utils/chatbotHelpers.ts";
import {
  SITE_VISIT_SLOT_TEMPLATES,
  getUpcomingSiteVisitDates,
} from "../utils/siteVisitSchedulerHelpers.ts";
import { DEFAULT_HOME_SLIDESHOW_CMS, normalizeHomeSlideshowCms } from "../utils/homeSlideshowHelpers.ts";
import { DEFAULT_HOME_SERVICES_CMS, normalizeHomeServicesCms } from "../utils/homeServicesHelpers.ts";
import {
  DEFAULT_HOME_FEATURED_PRODUCTS_CMS,
  normalizeHomeFeaturedProductsCms,
} from "../utils/homeTopPicksHelpers.ts";
import { DEFAULT_CUSTOMER_FEEDBACKS, normalizeCustomerFeedbackList } from "../utils/customerFeedbackHelpers.ts";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
} from "../utils/mediaAssetHelpers.ts";

let seedPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  // 1. Seed Users (Admin, Staff, Customers)
  const [{ value: existingUsersCount }] = await db.select({ value: count() }).from(users);
  if (Number(existingUsersCount) === 0) {
    await db
      .insert(users)
      .values([
        {
          uid: "admin-1",
          name: "Super Admin",
          email: "admin@innovista.com",
          phone: "+94 77 123 4567",
          company: "Innovista Fabriconix HQ",
          role: "admin",
          passwordHash: "admin123",
          avatarUrl: "/assets/about/director.jpg",
          isVerified: true,
          isActive: true,
          purchaseGoods: [],
        },
        {
          uid: "staff-2",
          name: "Operations Manager",
          email: "manager@innovista.com",
          phone: "+94 71 987 6543",
          company: "Innovista Fabriconix HQ",
          role: "staff",
          passwordHash: "admin123",
          avatarUrl: "/assets/about/team-structural.jpg",
          isVerified: true,
          isActive: true,
          purchaseGoods: [],
        },
        {
          uid: "customer-1",
          name: "Duminda Perera",
          email: "duminda@zenithcapital.lk",
          phone: "+94 77 455 1200",
          company: "Zenith Capital Residencies",
          role: "customer",
          passwordHash: "customer123",
          avatarUrl: "/assets/logos/client-zenith.svg",
          isVerified: true,
          isActive: true,
          purchaseGoods: ["Sliding Doors", "Glass Balustrades", "Window Systems"],
        },
        {
          uid: "customer-2",
          name: "Kavinda Jayasuriya",
          email: "kavinda@novatech.io",
          phone: "+94 77 333 9988",
          company: "NovaTech Solutions",
          role: "customer",
          passwordHash: "customer123",
          avatarUrl: "/assets/logos/client-novatech.svg",
          isVerified: true,
          isActive: true,
          purchaseGoods: ["Acoustic Partitions", "Pivot Doors"],
        },
      ])
      .onConflictDoNothing();
  }

  const allUsers = await db.select().from(users);
  const adminUser = allUsers.find((u) => u.role === "admin") || allUsers[0];
  const staffUser = allUsers.find((u) => u.role === "staff") || adminUser;
  const customerUsers = allUsers.filter((u) => u.role === "customer");

  // 2. Seed Media Assets helper
  const mediaAssetMap = new Map<string, number>();
  const existingAssets = await db.select().from(mediaAssets);
  for (const row of existingAssets) {
    mediaAssetMap.set(row.publicUrl, row.id);
  }

  async function ensurePresetAsset(url: string, title: string, entityScope: string): Promise<number | null> {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) return null;
    if (mediaAssetMap.has(cleanUrl)) return mediaAssetMap.get(cleanUrl)!;
    const [inserted] = await db
      .insert(mediaAssets)
      .values({
        kind: inferMediaKindFromUrlOrMime(cleanUrl),
        sourceType: inferSourceTypeFromUrl(cleanUrl),
        title,
        originalName: cleanUrl.split("/").pop() || "asset",
        storageKey: cleanUrl.startsWith("/uploads/") ? cleanUrl.replace(/^\/+/, "") : "",
        publicUrl: cleanUrl,
        altText: title,
        entityScope,
        uploadedByUserId: adminUser?.id ?? null,
      })
      .returning();
    mediaAssetMap.set(cleanUrl, inserted.id);
    return inserted.id;
  }

  // 3. Seed Categories
  const [{ value: existingCatsCount }] = await db.select({ value: count() }).from(categories);
  if (Number(existingCatsCount) === 0) {
    for (let i = 0; i < DEFAULT_PRODUCT_CATEGORIES.length; i++) {
      const cat = normalizeProductCategory(DEFAULT_PRODUCT_CATEGORIES[i], i);
      const coverAssetId = await ensurePresetAsset(cat.coverImage, cat.name, "category");
      await db
        .insert(categories)
        .values({
          categoryKey: cat.CategoryID,
          name: cat.name,
          slug: cat.slug,
          tagline: cat.tagline,
          description: cat.description,
          coverAssetId,
          coverImage: cat.coverImage,
          featured: cat.featured,
          displayOrder: cat.displayOrder,
          slideshowSpeedMs: cat.slideshowSpeedMs,
          heroSlides: cat.heroSlides,
          specHighlights: cat.specHighlights,
        })
        .onConflictDoNothing();
    }
  }

  const allCategories = await db.select().from(categories);
  const categoryBySlugOrName = new Map<string, number>();
  for (const c of allCategories) {
    categoryBySlugOrName.set(c.slug.toLowerCase(), c.id);
    categoryBySlugOrName.set(c.name.toLowerCase(), c.id);
    categoryBySlugOrName.set(c.categoryKey.toLowerCase(), c.id);
  }

  // 4. Seed Products + Product Categories + Product Images
  const [{ value: existingProductsCount }] = await db.select({ value: count() }).from(products);
  if (Number(existingProductsCount) === 0) {
    for (const rawItem of DEFAULT_DESIGNS_CATALOG) {
      const item = normalizeDesignItem(rawItem);
      const firstImage = item.Design_Image[0] || "/assets/products/door.jpg";
      const coverAssetId = await ensurePresetAsset(firstImage, item.Design_Name, "product");
      const bannerAssetId = item.partnerServiceBannerImage
        ? await ensurePresetAsset(item.partnerServiceBannerImage, `${item.Design_Name} Banner`, "product")
        : null;

      const matchedCatIds: number[] = [];
      for (const catLabel of item.Categories) {
        const key = catLabel.toLowerCase().trim();
        const found = categoryBySlugOrName.get(key);
        if (found && !matchedCatIds.includes(found)) matchedCatIds.push(found);
      }

      const slug = item.Design_Name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const [insertedProduct] = await db
        .insert(products)
        .values({
          legacyDesignId: String(item.DesignID),
          name: item.Design_Name,
          slug: `${slug}-${item.DesignID}`,
          description: item.Design_Description,
          price: item.price !== undefined ? String(item.price) : null,
          primaryCategoryId: matchedCatIds[0] ?? null,
          coverAssetId,
          colors: item.Design_Colors,
          sizes: item.Design_Sizes,
          blogPostRefs: item.Design_BlogPosts,
          features: item.features || [],
          configurations: item.configurations || [],
          featureTable: item.featureTable || null,
          performance: (item.performance as unknown as Record<string, string>) || null,
          downloads: item.downloads || [],
          certifications: (item.certifications as unknown as Array<Record<string, string>>) || [],
          certificationImages: item.certificationImages || [],
          accessoriesHeading: item.accessoriesHeading || "",
          accessoriesTagline: item.accessoriesTagline || "",
          accessoriesSlideshowSpeedMs: item.accessoriesSlideshowSpeedMs ?? 4000,
          accessoriesRibbonSpeed: item.accessoriesRibbonSpeed ?? 45,
          accessories: (item.accessories as unknown as Array<Record<string, unknown>>) || [],
          faqs: item.faqs || [],
          advantages: item.advantages || [],
          customizations: (item.customizations as unknown as Array<{
            id: string;
            category: string;
            title: string;
            description: string;
          }>) || [],
          partnerServices: item.partnerServices || [],
          partnerServiceBannerAssetId: bannerAssetId,
          partnerServiceBannerImage: item.partnerServiceBannerImage || "",
          clientShowcases: item.clientShowcases || [],
          relatedProductIds: item.relatedProductIds || [],
          createdByUserId: adminUser?.id ?? null,
        })
        .returning();

      for (const cid of matchedCatIds) {
        await db
          .insert(productCategories)
          .values({ productId: insertedProduct.id, categoryId: cid })
          .onConflictDoNothing();
      }

      for (let idx = 0; idx < item.Design_Image.length; idx++) {
        const imgUrl = item.Design_Image[idx];
        const imgAssetId = await ensurePresetAsset(imgUrl, `${item.Design_Name} #${idx + 1}`, "product");
        await db.insert(productImages).values({
          productId: insertedProduct.id,
          mediaAssetId: imgAssetId,
          imageUrl: imgUrl,
          sortOrder: idx,
        });
      }
    }
  }

  // 5. Seed Appointment Slots, Dates & Initial Booking
  const [{ value: existingSlotsCount }] = await db.select({ value: count() }).from(appointmentSlots);
  if (Number(existingSlotsCount) === 0) {
    for (let i = 0; i < SITE_VISIT_SLOT_TEMPLATES.length; i++) {
      const slot = SITE_VISIT_SLOT_TEMPLATES[i];
      await db
        .insert(appointmentSlots)
        .values({
          slotKey: slot.id,
          slotTime: slot.time,
          endTime: slot.endTime,
          label: slot.label,
          available: slot.available,
          sortOrder: i,
        })
        .onConflictDoNothing();
    }
  }

  const allSlots = await db.select().from(appointmentSlots);
  const [{ value: existingAppointmentsCount }] = await db
    .select({ value: count() })
    .from(appointments);
  if (Number(existingAppointmentsCount) === 0) {
    const firstDate = getUpcomingSiteVisitDates(10)[0]?.date || new Date().toISOString().slice(0, 10);
    const matchingSlot = allSlots.find((s) => s.slotTime === "11:00") || allSlots[0];
    await db
      .insert(appointmentDates)
      .values({
        visitDate: firstDate,
        available: true,
        note: "Standard showroom & measurement window",
        isCustom: false,
        customSlots: [],
      })
      .onConflictDoNothing();

    await db
      .insert(appointments)
      .values({
        bookingCode: "SV-2041",
        slotId: matchingSlot?.id ?? null,
        visitDate: firstDate,
        slotTime: "11:00",
        slotLabel: "11:00 AM",
        locationName: "Nawala Showroom & Consultation",
        visitorName: "Duminda Perera",
        visitorEmail: "duminda@zenithcapital.lk",
        visitorPhone: "+94 77 455 1200",
        notes: "Slim sliding door frame measurement check.",
        status: "CONFIRMED",
        userId: customerUsers[0]?.id ?? null,
        assignedStaffId: staffUser?.id ?? null,
        calendarEventId: "",
        emailSent: false,
      })
      .onConflictDoNothing();
  }

  // 6. Seed Blog Posts
  const [{ value: existingBlogsCount }] = await db.select({ value: count() }).from(blogPosts);
  if (Number(existingBlogsCount) === 0) {
    for (const post of DEFAULT_BLOG_POSTS) {
      const coverAssetId = await ensurePresetAsset(post.coverImage, post.title, "blog");
      await db
        .insert(blogPosts)
        .values({
          slugKey: post.id,
          externalId: post.externalId || null,
          title: post.title,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          displayDate: post.date,
          publishedAt: post.publishedAt,
          readTime: post.readTime,
          category: post.category,
          labels: post.labels,
          authorName: post.author,
          authorUserId: adminUser?.id ?? null,
          coverAssetId,
          coverImage: post.coverImage,
          source: post.source,
          bloggerUrl: post.bloggerUrl || "",
          featured: post.featured,
          showOnHome: post.showOnHome,
          homeOrder: post.homeOrder,
        })
        .onConflictDoNothing();
    }
  }

  // 7. Seed Projects + Project Images
  const [{ value: existingProjectsCount }] = await db.select({ value: count() }).from(projects);
  if (Number(existingProjectsCount) === 0) {
    const seedProjects = [
      {
        title: "Oceanview Villa Glass Cantilever & Sliding Facade",
        description:
          "Complete architectural exterior glazing featuring heavy-duty thermally broken aluminium profiles, motorized slim-line sliding glass doors, and structural frameless glass balustrades.",
        images: ["/assets/about/terrace.jpg", "/assets/products/door.jpg", "/assets/products/hero-showroom.jpg"],
        location: "Colombo 07, Sri Lanka",
        clientName: "Duminda Perera",
        clientEmail: "duminda@zenithcapital.lk",
        clientNumber: "+94 77 455 1200",
        clientCompany: "Zenith Capital Residencies",
        finishedDate: "2024-09-30T17:00:00.000Z",
        budget: "8500000",
      },
      {
        title: "Apex Commercial Tower Curtain Wall System",
        description:
          "Supply, fabrication, and structural installation of 12-storey unitized aluminium curtain walling with solar-reflective low-E double glazing and integrated ventilation louvers.",
        images: ["/assets/about/facade.jpg", "/assets/products/facade-detail.jpg", "/assets/products/shopfront.jpg"],
        location: "Kollupitiya, Colombo",
        clientName: "Niroshan Fernando",
        clientEmail: "info@apexdevelopments.com",
        clientNumber: "+94 11 234 5678",
        clientCompany: "Apex Skyline Towers",
        finishedDate: "2024-04-12T18:00:00.000Z",
        budget: "24500000",
      },
      {
        title: "Modernist Residence Aluminium Bi-Fold & Skylight",
        description:
          "Ultra-slim multi-panel bi-fold doors creating seamless indoor-outdoor transition, custom acoustic interior partitions, and motorized architectural roof skylights.",
        images: ["/assets/about/pavilion.jpg", "/assets/products/roof-skylight.jpg", "/assets/products/window.jpg"],
        location: "Kandy, Sri Lanka",
        clientName: "Sachithra Weerasinghe",
        clientEmail: "sweera@arcvision.com",
        clientNumber: "+94 71 890 1234",
        clientCompany: "ArcVision Design Studio",
        finishedDate: "2024-08-15T15:00:00.000Z",
        budget: "6200000",
      },
      {
        title: "Corporate HQ Acoustic Glass Partitions & Pivot Doors",
        description:
          "Frameless acoustic tempered glass partition suites with matte-black powder-coated aluminium perimeter channels, pivot entrance doors, and privacy smart glass integration.",
        images: ["/assets/products/partition.jpg", "/assets/products/showroom.jpg", "/assets/products/louvers.jpg"],
        location: "Rajagiriya, Colombo",
        clientName: "Kavinda Jayasuriya",
        clientEmail: "kavinda@novatech.io",
        clientNumber: "+94 77 333 9988",
        clientCompany: "NovaTech Solutions",
        finishedDate: "2024-07-20T17:00:00.000Z",
        budget: "4800000",
      },
    ];

    for (const p of seedProjects) {
      const [insertedProj] = await db
        .insert(projects)
        .values({
          title: p.title,
          description: p.description,
          location: p.location,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          clientNumber: p.clientNumber,
          clientCompany: p.clientCompany,
          budget: p.budget,
          finishedDate: p.finishedDate,
          createdByUserId: adminUser?.id ?? null,
        })
        .returning();

      for (let i = 0; i < p.images.length; i++) {
        const assetId = await ensurePresetAsset(p.images[i], `${p.title} #${i + 1}`, "project");
        await db.insert(projectImages).values({
          projectId: insertedProj.id,
          mediaAssetId: assetId,
          imageUrl: p.images[i],
          sortOrder: i,
        });
      }
    }
  }

  // 8. Seed Orders
  const [{ value: existingOrdersCount }] = await db.select({ value: count() }).from(orders);
  if (Number(existingOrdersCount) === 0) {
    const allProducts = await db.select().from(products);
    const [o1] = await db
      .insert(orders)
      .values({
        orderCode: "ORD-9201",
        customerUserId: customerUsers[0]?.id ?? null,
        orderStatus: "COMPLETED",
        clientName: "Duminda Perera",
        clientEmail: "duminda@zenithcapital.lk",
        clientNumber: "+94 77 455 1200",
        customerCompany: "Zenith Capital Residencies",
        customerLogo: "/assets/logos/client-zenith.svg",
        purchaseGoods: ["Sliding Doors", "Glass Balustrades"],
        orderDate: new Date("2024-10-18T14:32:00.000Z"),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: o1.id,
      productId: allProducts[0]?.id ?? null,
      designName: "Minimalist Slimline Sliding Door System",
      designImage: "/assets/products/door.jpg",
      quantity: 1,
    });

    const [o2] = await db
      .insert(orders)
      .values({
        orderCode: "ORD-9202",
        customerUserId: customerUsers[1]?.id ?? null,
        orderStatus: "PENDING",
        clientName: "Kavinda Jayasuriya",
        clientEmail: "kavinda@novatech.io",
        clientNumber: "+94 77 333 9988",
        customerCompany: "NovaTech Solutions",
        customerLogo: "/assets/logos/client-novatech.svg",
        purchaseGoods: ["Acoustic Partitions"],
        orderDate: new Date("2024-11-04T09:15:00.000Z"),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: o2.id,
      productId: allProducts[2]?.id ?? allProducts[0]?.id ?? null,
      designName: "Acoustic Frameless Glass Office Partition",
      designImage: "/assets/products/partition.jpg",
      quantity: 1,
    });
  }

  // 9. Seed Customer Feedbacks
  const [{ value: existingFeedbackCount }] = await db
    .select({ value: count() })
    .from(customerFeedbacks);
  if (Number(existingFeedbackCount) === 0) {
    const normalizedFeedbacks = normalizeCustomerFeedbackList(DEFAULT_CUSTOMER_FEEDBACKS);
    for (const fb of normalizedFeedbacks) {
      const avatarAssetId = fb.Customer.Cus_Avatar
        ? await ensurePresetAsset(fb.Customer.Cus_Avatar, fb.Customer.Cus_Name, "cms")
        : null;
      await db.insert(customerFeedbacks).values({
        customerUserId: customerUsers[0]?.id ?? null,
        customerName: fb.Customer.Cus_Name,
        companyName: fb.Customer.Cus_CompanyName,
        customerRole: fb.Customer.Cus_Role || "",
        avatarAssetId,
        avatarUrl: fb.Customer.Cus_Avatar || "/assets/about/director.jpg",
        designName: fb.Design.Design_Name,
        designRefId: fb.Design.DesignID || "",
        rating: fb.Rating,
        comment: fb.Feed_back_comment,
        images: fb.Feed_Back_Images,
        showOnHome: fb.showOnHome,
        displayOrder: fb.displayOrder,
      });
    }
  }

  // 10. Seed Chatbot FAQs
  const [{ value: existingFaqsCount }] = await db.select({ value: count() }).from(chatbotFaqs);
  if (Number(existingFaqsCount) === 0) {
    for (const faq of DEFAULT_CHATBOT_FAQS) {
      await db
        .insert(chatbotFaqs)
        .values({
          faqKey: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          keywords: faq.keywords,
          enabled: faq.enabled,
          priority: faq.priority,
          createdByUserId: adminUser?.id ?? null,
        })
        .onConflictDoNothing();
    }
  }

  // 11. Seed Related Portals
  const [{ value: existingPortalsCount }] = await db
    .select({ value: count() })
    .from(relatedPortals);
  if (Number(existingPortalsCount) === 0) {
    const portals = normalizeRelatedPortals(RELATED_PORTALS);
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      const imageAssetId = await ensurePresetAsset(p.image, p.name, "cms");
      await db
        .insert(relatedPortals)
        .values({
          portalKey: p.id,
          name: p.name,
          category: p.category,
          summary: p.summary,
          url: p.url,
          imageAssetId,
          imageUrl: p.image,
          isExternal: p.isExternal,
          sortOrder: i,
        })
        .onConflictDoNothing();
    }
  }

  // 12. Seed Notifications
  const [{ value: existingNotifsCount }] = await db.select({ value: count() }).from(notifications);
  if (Number(existingNotifsCount) === 0) {
    await db
      .insert(notifications)
      .values([
        {
          notifKey: "notif-1",
          title: "New Project Inquiry",
          body: "Zenith Capital requested a custom quotation for high-span sliding doors.",
          userId: adminUser?.id ?? null,
          isRead: false,
        },
        {
          notifKey: "notif-2",
          title: "Design Approved",
          body: "Casement suite specifications were approved for production line.",
          userId: adminUser?.id ?? null,
          isRead: false,
        },
      ])
      .onConflictDoNothing();
  }

  // 13. Seed Structured CMS Documents
  const defaultSiteSettings = normalizeSiteContactSettings({
    phone: process.env.VITE_CONTACT_PHONE || DEFAULT_SITE_CONTACT_SETTINGS.phone,
    whatsapp: process.env.VITE_WHATSAPP_NUMBER || DEFAULT_SITE_CONTACT_SETTINGS.whatsapp,
    email: process.env.VITE_CONTACT_EMAIL || DEFAULT_SITE_CONTACT_SETTINGS.email,
  });

  const cmsSeedEntries: Array<{ key: string; payload: Record<string, unknown> }> = [
    {
      key: "about_cms",
      payload: {
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
      },
    },
    {
      key: "product_landing_cms",
      payload: normalizeProductLandingCms(DEFAULT_PRODUCT_LANDING_CMS) as unknown as Record<string, unknown>,
    },
    {
      key: "page_ads_cms",
      payload: DEFAULT_PAGE_ADS_CMS as unknown as Record<string, unknown>,
    },
    {
      key: "blogger_config",
      payload: DEFAULT_BLOGGER_CONFIG as unknown as Record<string, unknown>,
    },
    {
      key: "site_settings",
      payload: defaultSiteSettings as unknown as Record<string, unknown>,
    },
    {
      key: "chatbot_config",
      payload: DEFAULT_CHATBOT_CONFIG as unknown as Record<string, unknown>,
    },
    {
      key: "site_visit_blocked_keys",
      payload: { blockedKeys: [] },
    },
    {
      key: "home_slideshow",
      payload: normalizeHomeSlideshowCms(DEFAULT_HOME_SLIDESHOW_CMS) as unknown as Record<string, unknown>,
    },
    {
      key: "home_services",
      payload: normalizeHomeServicesCms(DEFAULT_HOME_SERVICES_CMS) as unknown as Record<string, unknown>,
    },
    {
      key: "home_featured_products",
      payload: normalizeHomeFeaturedProductsCms(
        DEFAULT_HOME_FEATURED_PRODUCTS_CMS
      ) as unknown as Record<string, unknown>,
    },
    {
      key: "news_articles",
      payload: { articles: NEWS_ARTICLES },
    },
    {
      key: "resources_content",
      payload: {
        attachments: RESOURCE_ATTACHMENTS,
        guidelines: ENGINEERING_GUIDELINES,
        faqs: RESOURCE_FAQS,
      },
    },
    {
      key: "contact_directory",
      payload: {
        departments: CONTACT_DEPARTMENTS,
        locations: CONTACT_LOCATIONS,
      },
    },
  ];

  for (const entry of cmsSeedEntries) {
    await db
      .insert(cmsDocuments)
      .values({
        key: entry.key,
        payload: entry.payload,
        updatedByUserId: adminUser?.id ?? null,
      })
      .onConflictDoNothing();
  }
}

export async function ensureDatabaseSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
