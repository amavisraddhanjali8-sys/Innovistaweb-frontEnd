export type BlogSource = "local" | "blogger";

export interface BlogPostItem {
  id: string;
  externalId?: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  date: string;
  publishedAt: string;
  readTime: string;
  category: string;
  labels: string[];
  author: string;
  coverImage: string;
  source: BlogSource;
  bloggerUrl?: string;
  featured: boolean;
  showOnHome: boolean;
  homeOrder: number;
}

export interface BloggerConnectionConfig {
  blogUrl: string;
  blogId: string;
  apiKey: string;
  blogTitle: string;
  autoSyncOnVisit: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "idle" | "success" | "error";
  lastSyncMessage: string;
  lastSyncCount: number;
}

export const BLOGGER_COVER_FALLBACKS = [
  "/assets/products/hero-showroom.jpg",
  "/assets/about/facade.jpg",
  "/assets/products/facade-detail.jpg",
  "/assets/about/terrace.jpg",
  "/assets/products/partition.jpg",
  "/assets/about/pavilion.jpg",
];

export const DEFAULT_BLOGGER_CONFIG: BloggerConnectionConfig = {
  blogUrl: "",
  blogId: "",
  apiKey: "",
  blogTitle: "Innovista Architectural Journal",
  autoSyncOnVisit: true,
  lastSyncedAt: null,
  lastSyncStatus: "idle",
  lastSyncMessage:
    "Connect your Blogger.com URL to automatically publish new Blogger posts on this page and select which ones feature on Home.",
  lastSyncCount: 0,
};

export const DEFAULT_BLOG_POSTS: BlogPostItem[] = [
  {
    id: "blog-thermal-break-coastal",
    title: "Thermal-Break Aluminium Framing for Coastal Residences",
    excerpt:
      "How polyamide thermal barriers and marine-grade anodizing cut tropical solar heat gain while resisting salt-air corrosion.",
    contentHtml: `<p>Coastal developments across Colombo, Galle, and Negombo place intense demands on architectural fenestration. High ambient humidity, monsoon wind-driven rain, and airborne marine chlorides quickly degrade standard uncoated extrusions.</p>
<h3>Why Thermal Breaks Matter in the Tropics</h3>
<p>By separating interior and exterior aluminium profiles with glass-fiber reinforced polyamide 6.6 strips, surface conduction drops dramatically. When paired with double-glazed low-E solar control glass, indoor cooling loads decrease by up to 28%.</p>
<h3>Marine Anodizing &amp; Coastal Powder Coats</h3>
<p>Specify minimum 25-micron architectural anodizing or Qualicoat Class 2 marine-grade fluoropolymer powder finishes paired with 316 stainless-steel fasteners across every drainage slot and corner cleat.</p>`,
    date: "May 14, 2025",
    publishedAt: "2025-05-14T09:00:00.000Z",
    readTime: "4 min read",
    category: "Engineering",
    labels: ["Engineering", "Coastal Glazing", "Thermal Break"],
    author: "Anushka Senanayake",
    coverImage: "/assets/about/facade.jpg",
    source: "local",
    featured: true,
    showOnHome: true,
    homeOrder: 1,
  },
  {
    id: "blog-slimline-sliding-panoramas",
    title: "Designing 3.6m Slim-Line Sliding Panoramas Without Sightline Clutter",
    excerpt:
      "Structural wind-load calculations, concealed floor tracks, and stainless carriage rollers behind ultra-narrow 22mm interlocks.",
    contentHtml: `<p>Architects increasingly specify uninterrupted floor-to-ceiling openings that erase the boundary between living pavilions and landscaped terraces. Achieving 3.6-meter panel heights with a 22mm vertical interlock requires strict deflection discipline.</p>
<h3>Concealed Flush Thresholds</h3>
<p>Recessed drainage channels set flush with finished limestone or timber decking eliminate trip hazards while managing monsoon runoff through multi-stage weep chambers.</p>
<h3>Precision Stainless Bogie Rollers</h3>
<p>Dual-tandem sealed stainless steel carriages rated above 400 kg per sash ensure effortless fingertip operation over decades of daily cycling.</p>`,
    date: "Apr 28, 2025",
    publishedAt: "2025-04-28T10:30:00.000Z",
    readTime: "5 min read",
    category: "Design Craft",
    labels: ["Design Craft", "Sliding Systems", "Minimalist Doors"],
    author: "Tharindu Perera",
    coverImage: "/assets/about/pavilion.jpg",
    source: "local",
    featured: true,
    showOnHome: true,
    homeOrder: 2,
  },
  {
    id: "blog-acoustic-office-partitions",
    title: "Acoustic Clarity in Open Offices: Laminated Partition Engineering",
    excerpt:
      "Comparing monolithic tempered glass with PVB acoustic interlayers for 42 dB STC boardroom privacy in slim aluminium channels.",
    contentHtml: `<p>Modern commercial interiors balance daylight transparency with confidential speech privacy. Single-pane 10mm tempered glass rarely exceeds 33 dB STC, allowing conversational speech to carry clearly across open desks.</p>
<h3>Acoustic PVB Interlayers</h3>
<p>Upgrading to 12.76mm acoustic laminated glass within brushed anodized perimeter channels dampens mid-to-high vocal frequencies and boosts attenuation toward 41–44 dB STC when matched with drop-down perimeter seals on pivot doors.</p>`,
    date: "Apr 09, 2025",
    publishedAt: "2025-04-09T08:15:00.000Z",
    readTime: "4 min read",
    category: "Acoustic Systems",
    labels: ["Acoustic Systems", "Office Partitions", "Glass Spec"],
    author: "Dilshan Jayasinghe",
    coverImage: "/assets/products/partition.jpg",
    source: "local",
    featured: true,
    showOnHome: true,
    homeOrder: 3,
  },
  {
    id: "blog-frameless-terrace-balustrades",
    title: "Base-Shoe & Spigot Detailing for Frameless Terrace Glass Balustrades",
    excerpt:
      "Anchorage torque, laminated SGP safety glass selection, and drainage spacing for cantilevered balcony edges.",
    contentHtml: `<p>Frameless glass balustrades deliver unobstructed horizon lines for coastal villas and boutique hospitality decks. Safety depends on engineered laminated glass thickness paired with certified U-channel aluminium base shoes.</p>
<h3>SentriGlas &amp; Post-Breakage Retention</h3>
<p>Using 10+10mm or 12+12mm toughened laminated glass with structural interlayers ensures panels remain rigid in the base shoe even after accidental impact.</p>`,
    date: "Mar 22, 2025",
    publishedAt: "2025-03-22T11:00:00.000Z",
    readTime: "3 min read",
    category: "Safety & Codes",
    labels: ["Safety & Codes", "Balustrades", "Structural Glass"],
    author: "Rohan Wickramasinghe",
    coverImage: "/assets/about/terrace.jpg",
    source: "local",
    featured: false,
    showOnHome: true,
    homeOrder: 4,
  },
  {
    id: "blog-powder-coat-finish-guide",
    title: "Matte Charcoal, Anodized Champagne & Timber-Sublimation Finishes",
    excerpt:
      "How architects specify durable colour consistency across extruded mullions, concealed hardware handles, and perimeter flashing.",
    contentHtml: `<p>Visual harmony across a facade requires more than selecting a swatch—it demands matched sheen levels across extruded profiles, cast aluminium handles, and pressed perimeter flashings.</p>
<h3>Fine-Texture Matte Powders</h3>
<p>Low-gloss 25–30% super-durable polyester powders resist micro-scratching during site handling and eliminate harsh glare under direct equatorial sunlight.</p>`,
    date: "Mar 04, 2025",
    publishedAt: "2025-03-04T09:45:00.000Z",
    readTime: "4 min read",
    category: "Materials",
    labels: ["Materials", "Finishes", "Powder Coating"],
    author: "Anushka Senanayake",
    coverImage: "/assets/products/facade-detail.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 5,
  },
  {
    id: "blog-skylight-daylight-control",
    title: "Solar-Control Structural Skylights & Pergola Louver Integration",
    excerpt:
      "Preventing courtyard overheating with stepped insulated glass units, silicone structural joints, and motorized shading blades.",
    contentHtml: `<p>Overhead glazing transforms dark stairwells and central courtyards into luminous architectural volumes, yet poorly shaded skylights quickly trap excessive afternoon heat.</p>
<h3>Stepped IGU Weather Seals</h3>
<p>Combining solar-reflective double-glazed stepped edges with weather-rated structural silicone eliminates protruding cap bars that pond rainwater on low-pitch roofs.</p>`,
    date: "Feb 16, 2025",
    publishedAt: "2025-02-16T07:30:00.000Z",
    readTime: "5 min read",
    category: "Engineering",
    labels: ["Engineering", "Skylights", "Louvers"],
    author: "Tharindu Perera",
    coverImage: "/assets/products/roof-skylight.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 6,
  },
  {
    id: "blog-unitized-curtain-wall-wind",
    title: "Unitized Curtain-Wall Anchors for High-Rise Coastal Wind Zones",
    excerpt:
      "Finite-element mullion deflection checks, pressure-equalized drainage chambers, and seismic slab-edge tolerance joints.",
    contentHtml: `<p>Multi-storey commercial envelopes along exposed tropical coastlines face cyclical gust pressures exceeding 1.8 kPa. Unitized cassettes fabricated under factory climate control maintain gasket compression precision across every floor slab.</p>
<h3>Pressure-Equalized Rainscreen Channels</h3>
<p>Compartmentalized air chambers allow external wind pressure to equalize behind the outer weather seal, eliminating capillary water draw during monsoon squalls.</p>`,
    date: "Feb 02, 2025",
    publishedAt: "2025-02-02T09:00:00.000Z",
    readTime: "6 min read",
    category: "Engineering",
    labels: ["Engineering", "Curtain Wall", "Wind Load"],
    author: "Rohan Wickramasinghe",
    coverImage: "/assets/products/showroom.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 7,
  },
  {
    id: "blog-hurricane-drainage-sills",
    title: "Monsoon Sub-Sill Weep Geometry in Zero-Threshold Villa Openings",
    excerpt:
      "Dual-chamber baffled drainage trays that divert 120mm/hr tropical downpours away from timber and terrazzo interiors.",
    contentHtml: `<p>Minimalist thresholds look effortless in architectural photography, yet monsoon performance hinges entirely on hidden sub-sill sump capacity and check-valve baffles.</p>
<h3>Stepped Sill Extrusion Profiles</h3>
<p>Setting external slot drains behind gravel verge strips prevents splash-back while directing rainwater into perimeter soakaways without visible floor grates.</p>`,
    date: "Jan 19, 2025",
    publishedAt: "2025-01-19T10:15:00.000Z",
    readTime: "4 min read",
    category: "Engineering",
    labels: ["Engineering", "Drainage", "Coastal Vistas"],
    author: "Anushka Senanayake",
    coverImage: "/assets/products/window.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 8,
  },
  {
    id: "blog-bifold-garden-pavilions",
    title: "Cornerless Bi-Fold Enclosures for Indoor-Outdoor Dining Pavilions",
    excerpt:
      " Cantilevered steel transfer beams and floating post details that open two adjacent glass elevations completely.",
    contentHtml: `<p>Removing the corner mullion transforms courtyard living rooms into shaded verandas in seconds. Top-hung bi-fold systems keep heavy stainless trolleys protected from sand and garden grit.</p>
<h3>Balanced Leaf Width Proportions</h3>
<p>Restricting odd-numbered sash sets below 900mm per leaf ensures clean stacking clearance against exterior masonry piers.</p>`,
    date: "Jan 08, 2025",
    publishedAt: "2025-01-08T08:30:00.000Z",
    readTime: "4 min read",
    category: "Design Craft",
    labels: ["Design Craft", "Bi-Fold Doors", "Courtyards"],
    author: "Tharindu Perera",
    coverImage: "/assets/products/door.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 9,
  },
  {
    id: "blog-shopfront-proportion-rhythm",
    title: "Proportion & Sightline Rhythm in Double-Height Retail Shopfronts",
    excerpt:
      "Aligning spider-finned transom bars with sandstone reveals and slim anodized door rails for luxury hospitality lobbies.",
    contentHtml: `<p>Commercial ground planes succeed when glass structure disappears around the display merchandising. Matching anodized transom shadow lines to adjacent stone cladding creates calm street-level cadence.</p>
<h3>Concealed Overhead Closers</h3>
<p>Replacing bulky surface closers with concealed cam-action transom units preserves crisp 45mm sightlines across busy hotel entrances.</p>`,
    date: "Dec 21, 2024",
    publishedAt: "2024-12-21T11:00:00.000Z",
    readTime: "4 min read",
    category: "Design Craft",
    labels: ["Design Craft", "Shopfronts", "Hospitality"],
    author: "Dilshan Jayasinghe",
    coverImage: "/assets/products/shopfront.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 10,
  },
  {
    id: "blog-fluted-glass-wardrobes",
    title: "Fluted Glass & Bronze-Anodized Wardrobes in Contemporary Suites",
    excerpt:
      "Micro-bevelled 18mm stile joinery, soft-close concealed pivot pins, and diffused LED channel integration.",
    contentHtml: `<p>Architectural aluminium craftsmanship increasingly extends inside master suites and kitchen pantries. Pairing warm bronze anodizing with vertical reeded glass softens visual clutter while catching ambient daylight.</p>
<h3>Zero-Visible-Fastener Corners</h3>
<p>Internal crimped L-brackets allow razor-sharp 45-degree mitred junctions free of exposed screw heads.</p>`,
    date: "Dec 04, 2024",
    publishedAt: "2024-12-04T09:30:00.000Z",
    readTime: "3 min read",
    category: "Design Craft",
    labels: ["Design Craft", "Interiors", "Wardrobes"],
    author: "Anushka Senanayake",
    coverImage: "/assets/products/wardrobe-pantry.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 11,
  },
  {
    id: "blog-bathroom-frameless-hardware",
    title: "Precision Detailing for Moisture-Sealed Frameless Bath Enclosures",
    excerpt:
      "Choosing solid brass-core black PVD hinges, magnetic sweep gaskets, and chamfered stone-curb tolerances.",
    contentHtml: `<p>Wet-zone glass enclosures demand tolerances within 1.5mm against laser-plumb tile walls. Undersized polymer seals harden prematurely under alkaline cleaners, whereas translucent UV-stabilized fins preserve crisp minimal edges.</p>
<h3>Anti-Corrosion Fastener Pairing</h3>
<p>Every wall-to-glass clamp requires marine-grade nylon isolation bushings so 10mm toughened glass never bears directly on metallic threads.</p>`,
    date: "Nov 18, 2024",
    publishedAt: "2024-11-18T14:00:00.000Z",
    readTime: "3 min read",
    category: "Design Craft",
    labels: ["Design Craft", "Bath Enclosures", "Hardware"],
    author: "Rohan Wickramasinghe",
    coverImage: "/assets/products/bathroom.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 12,
  },
  {
    id: "blog-laminated-hurricane-glass",
    title: "SentryGlas vs PVB Interlayers for Overhead Canopy Glazing",
    excerpt:
      "Post-breakage stiffness, edge delamination resistance in humid climates, and spider-bolt load distribution.",
    contentHtml: `<p>Overhead entrance canopies and stairwell balustrades require laminated glass interlayers engineered to hold fractured shards rigidly in place until scheduled replacement.</p>
<h3>Ionoplast Stiffness Advantage</h3>
<p>Structural ionoplast sheets offer up to five times the tear resistance and edge stability of conventional PVB in exposed coastal humidity.</p>`,
    date: "Nov 02, 2024",
    publishedAt: "2024-11-02T10:00:00.000Z",
    readTime: "4 min read",
    category: "Safety & Codes",
    labels: ["Safety & Codes", "Laminated Glass", "Canopies"],
    author: "Dilshan Jayasinghe",
    coverImage: "/assets/about/terrace.jpg",
    source: "local",
    featured: false,
    showOnHome: false,
    homeOrder: 13,
  },
];

export function sanitizeBlogHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function stripHtmlToText(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  return rawHtml
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeReadTime(textOrHtml: string): string {
  const words = stripHtmlToText(textOrHtml)
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 180));
  return `${mins} min read`;
}

export function buildExcerpt(textOrHtml: string, maxLength = 165): string {
  const plain = stripHtmlToText(textOrHtml);
  if (!plain) return "Architectural insight and engineering notes from Innovista.";
  if (plain.length <= maxLength) return plain;
  const trimmed = plain.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${(lastSpace > 60 ? trimmed.slice(0, lastSpace) : trimmed).trim()}...`;
}

export function formatBlogDisplayDate(isoOrString?: string): string {
  if (!isoOrString) return "Recent";
  const parsed = new Date(isoOrString);
  if (Number.isNaN(parsed.getTime())) return String(isoOrString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function upscaleBloggerImageUrl(url: string): string {
  if (!url) return "";
  // Blogger thumbnails often come as .../s72-c/... or .../s320/... — upgrade resolution cleanly
  return url
    .replace(/\/s\d+(-[ch])?\//i, "/s1200/")
    .replace(/=s\d+(-[ch])?$/i, "=s1200")
    .replace(/^http:\/\//i, "https://");
}

export function extractFirstImageFromHtml(html: string): string {
  if (!html) return "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ? upscaleBloggerImageUrl(match[1]) : "";
}

export function normalizeBloggerOrigin(rawUrl: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    if (!parsed.hostname) return "";
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return "";
  }
}

export function buildBloggerFeedUrl(blogUrl: string, maxResults = 25): string {
  const origin = normalizeBloggerOrigin(blogUrl);
  if (!origin) return "";
  return `${origin}/feeds/posts/default?alt=json&max-results=${Math.min(
    Math.max(1, maxResults),
    50
  )}`;
}

export function buildBloggerAtomUrl(blogUrl: string, maxResults = 25): string {
  const origin = normalizeBloggerOrigin(blogUrl);
  if (!origin) return "";
  return `${origin}/feeds/posts/default?max-results=${Math.min(
    Math.max(1, maxResults),
    50
  )}`;
}

export interface BloggerJsonEntry {
  id?: { $t?: string };
  title?: { $t?: string };
  content?: { $t?: string };
  summary?: { $t?: string };
  published?: { $t?: string };
  updated?: { $t?: string };
  category?: Array<{ term?: string }>;
  author?: Array<{ name?: { $t?: string } }>;
  link?: Array<{ rel?: string; href?: string }>;
  media$thumbnail?: { url?: string };
}

export function parseBloggerJsonFeed(payload: unknown): {
  blogTitle: string;
  posts: BlogPostItem[];
} {
  const feedObj = (payload as { feed?: { title?: { $t?: string }; entry?: BloggerJsonEntry[] } })
    ?.feed;
  const blogTitle = feedObj?.title?.$t?.trim() || "Blogger Feed";
  const entries = Array.isArray(feedObj?.entry) ? feedObj.entry : [];

  const posts: BlogPostItem[] = entries.map((entry, idx) => {
    const rawId = entry.id?.$t || `blogger-entry-${idx}-${Date.now()}`;
    const title = (entry.title?.$t || "Untitled Blogger Post").trim();
    const rawBody = entry.content?.$t || entry.summary?.$t || "";
    const contentHtml = sanitizeBlogHtml(rawBody);
    const publishedAt =
      entry.published?.$t || entry.updated?.$t || new Date().toISOString();
    const altLink =
      entry.link?.find((l) => l.rel === "alternate" && l.href)?.href || "";
    const thumbUrl = entry.media$thumbnail?.url
      ? upscaleBloggerImageUrl(entry.media$thumbnail.url)
      : "";
    const bodyImg = extractFirstImageFromHtml(rawBody);
    const coverImage =
      bodyImg ||
      thumbUrl ||
      BLOGGER_COVER_FALLBACKS[idx % BLOGGER_COVER_FALLBACKS.length];
    const labels = (entry.category || [])
      .map((c) => (c.term || "").trim())
      .filter(Boolean);
    const category = labels[0] || "Blogger Post";
    const author = entry.author?.[0]?.name?.$t?.trim() || "Innovista Editorial";

    return {
      id: `blogger-${rawId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(-28) || idx}`,
      externalId: rawId,
      title,
      excerpt: buildExcerpt(rawBody),
      contentHtml:
        contentHtml || `<p>${buildExcerpt(rawBody, 400)}</p>`,
      date: formatBlogDisplayDate(publishedAt),
      publishedAt,
      readTime: computeReadTime(rawBody),
      category,
      labels: labels.length > 0 ? labels : [category],
      author,
      coverImage,
      source: "blogger",
      bloggerUrl: altLink,
      featured: idx === 0,
      showOnHome: false,
      homeOrder: 100 + idx,
    };
  });

  return { blogTitle, posts };
}

export interface BloggerV3Item {
  id?: string;
  title?: string;
  content?: string;
  published?: string;
  updated?: string;
  url?: string;
  labels?: string[];
  author?: { displayName?: string };
  images?: Array<{ url?: string }>;
}

export function parseBloggerApiV3Response(payload: unknown): {
  blogTitle: string;
  posts: BlogPostItem[];
} {
  const data = payload as { items?: BloggerV3Item[] };
  const items = Array.isArray(data?.items) ? data.items : [];
  const posts: BlogPostItem[] = items.map((item, idx) => {
    const rawId = item.id || `v3-${idx}`;
    const rawBody = item.content || "";
    const contentHtml = sanitizeBlogHtml(rawBody);
    const publishedAt =
      item.published || item.updated || new Date().toISOString();
    const coverImage =
      upscaleBloggerImageUrl(item.images?.[0]?.url || "") ||
      extractFirstImageFromHtml(rawBody) ||
      BLOGGER_COVER_FALLBACKS[idx % BLOGGER_COVER_FALLBACKS.length];
    const labels = Array.isArray(item.labels)
      ? item.labels.map((l) => l.trim()).filter(Boolean)
      : [];
    const category = labels[0] || "Blogger Post";

    return {
      id: `blogger-${String(rawId).replace(/[^a-zA-Z0-9_-]+/g, "")}`,
      externalId: String(rawId),
      title: (item.title || "Untitled Blogger Post").trim(),
      excerpt: buildExcerpt(rawBody),
      contentHtml: contentHtml || `<p>${buildExcerpt(rawBody, 400)}</p>`,
      date: formatBlogDisplayDate(publishedAt),
      publishedAt,
      readTime: computeReadTime(rawBody),
      category,
      labels: labels.length > 0 ? labels : [category],
      author: item.author?.displayName?.trim() || "Innovista Editorial",
      coverImage,
      source: "blogger",
      bloggerUrl: item.url || "",
      featured: idx === 0,
      showOnHome: false,
      homeOrder: 100 + idx,
    };
  });

  return { blogTitle: "Blogger Feed", posts };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseBloggerAtomFeed(xml: string): {
  blogTitle: string;
  posts: BlogPostItem[];
} {
  if (!xml || typeof xml !== "string") {
    return { blogTitle: "Blogger Feed", posts: [] };
  }
  const feedTitleMatch = xml.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const blogTitle = decodeXmlEntities(feedTitleMatch?.[1]?.trim() || "Blogger Feed");
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  const posts: BlogPostItem[] = entryMatches.map((block, idx) => {
    const idMatch = block.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const contentMatch =
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i) ||
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    const publishedMatch =
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const authorMatch = block.match(
      /<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i
    );
    const altLinkMatch =
      block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
      block.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i);
    const mediaThumbMatch = block.match(
      /<media:thumbnail[^>]*url=["']([^"']+)["']/i
    );
    const labelMatches = Array.from(
      block.matchAll(/<category[^>]*term=["']([^"']+)["']/gi)
    ).map((m) => decodeXmlEntities(m[1].trim()));

    const rawId = idMatch?.[1]?.trim() || `atom-${idx}`;
    const rawBody = decodeXmlEntities(contentMatch?.[1] || "");
    const contentHtml = sanitizeBlogHtml(rawBody);
    const publishedAt = publishedMatch?.[1]?.trim() || new Date().toISOString();
    const coverImage =
      extractFirstImageFromHtml(rawBody) ||
      upscaleBloggerImageUrl(mediaThumbMatch?.[1] || "") ||
      BLOGGER_COVER_FALLBACKS[idx % BLOGGER_COVER_FALLBACKS.length];
    const category = labelMatches[0] || "Blogger Post";

    return {
      id: `blogger-${rawId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(-28) || idx}`,
      externalId: rawId,
      title: decodeXmlEntities(titleMatch?.[1]?.trim() || "Untitled Blogger Post"),
      excerpt: buildExcerpt(rawBody),
      contentHtml: contentHtml || `<p>${buildExcerpt(rawBody, 400)}</p>`,
      date: formatBlogDisplayDate(publishedAt),
      publishedAt,
      readTime: computeReadTime(rawBody),
      category,
      labels: labelMatches.length > 0 ? labelMatches : [category],
      author: decodeXmlEntities(authorMatch?.[1]?.trim() || "Innovista Editorial"),
      coverImage,
      source: "blogger",
      bloggerUrl: altLinkMatch?.[1] || "",
      featured: idx === 0,
      showOnHome: false,
      homeOrder: 100 + idx,
    };
  });

  return { blogTitle, posts };
}

export function mergeSyncedBloggerPosts(
  existingPosts: BlogPostItem[],
  incomingBloggerPosts: BlogPostItem[]
): {
  merged: BlogPostItem[];
  addedCount: number;
  updatedCount: number;
} {
  const existingByExternal = new Map<string, BlogPostItem>();
  for (const post of existingPosts) {
    if (post.externalId) existingByExternal.set(post.externalId, post);
    if (post.bloggerUrl) existingByExternal.set(post.bloggerUrl, post);
  }

  let addedCount = 0;
  let updatedCount = 0;
  const incomingIds = new Set<string>();
  const syncedProcessed: BlogPostItem[] = incomingBloggerPosts.map((incoming, idx) => {
    const prev =
      (incoming.externalId && existingByExternal.get(incoming.externalId)) ||
      (incoming.bloggerUrl && existingByExternal.get(incoming.bloggerUrl));

    if (prev) {
      updatedCount += 1;
      incomingIds.add(prev.id);
      return {
        ...incoming,
        id: prev.id,
        showOnHome: prev.showOnHome,
        homeOrder: prev.homeOrder,
        featured: prev.featured,
      };
    }

    addedCount += 1;
    const assignedId = incoming.id || `blogger-${Date.now()}-${idx}`;
    incomingIds.add(assignedId);
    return {
      ...incoming,
      id: assignedId,
      showOnHome: false,
      homeOrder: existingPosts.length + idx + 1,
    };
  });

  // Keep existing local posts and any unreplaced posts, placing freshly synced Blogger posts first by date
  const preservedExisting = existingPosts.filter(
    (p) => p.source !== "blogger" && !incomingIds.has(p.id)
  );

  const combined = [...syncedProcessed, ...preservedExisting].sort((a, b) => {
    const timeA = Date.parse(a.publishedAt) || 0;
    const timeB = Date.parse(b.publishedAt) || 0;
    return timeB - timeA;
  });

  return {
    merged: combined,
    addedCount,
    updatedCount,
  };
}

export function getHomePageBlogs(posts: BlogPostItem[]): BlogPostItem[] {
  const selected = posts
    .filter((p) => p.showOnHome)
    .sort((a, b) => {
      if (a.homeOrder !== b.homeOrder) return a.homeOrder - b.homeOrder;
      return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
    });
  if (selected.length > 0) return selected;
  return posts.slice(0, 4);
}

export function getBlogCategories(posts: BlogPostItem[]): string[] {
  const unique = new Set<string>();
  for (const post of posts) {
    if (post.category && post.category.trim()) {
      unique.add(post.category.trim());
    }
  }
  return ["All", ...Array.from(unique)];
}

export function filterBlogPosts(
  posts: BlogPostItem[],
  category: string,
  searchQuery: string,
  sourceFilter: "all" | "blogger" | "local" = "all"
): BlogPostItem[] {
  const q = searchQuery.trim().toLowerCase();
  const catLower = category.trim().toLowerCase();

  return posts.filter((post) => {
    if (sourceFilter !== "all" && post.source !== sourceFilter) {
      return false;
    }
    if (catLower && catLower !== "all" && post.category.toLowerCase() !== catLower) {
      return false;
    }
    if (!q) return true;
    const haystack = `${post.title} ${post.excerpt} ${post.category} ${post.author} ${(
      post.labels || []
    ).join(" ")}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function getSpotlightBlogs(posts: BlogPostItem[]): BlogPostItem[] {
  const featured = posts.filter((p) => p.featured);
  const home = posts.filter((p) => p.showOnHome && !featured.includes(p));
  const rest = posts.filter((p) => !featured.includes(p) && !home.includes(p));
  return [...featured, ...home, ...rest].slice(0, 3);
}

export interface BlogEditorialSection {
  category: string;
  filterKey: string;
  sourceFilter?: "all" | "blogger";
  posts: BlogPostItem[];
  totalCount: number;
}

export interface BlogEditorialLayout {
  centerLead: BlogPostItem | null;
  leftColumn: BlogPostItem[];
  latestRail: BlogPostItem[];
  categorySections: BlogEditorialSection[];
}

export function buildBlogEditorialLayout(
  visiblePosts: BlogPostItem[],
  allPosts: BlogPostItem[] = visiblePosts
): BlogEditorialLayout {
  const sortedVisible = [...visiblePosts].sort(
    (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)
  );
  const sortedAll = [...allPosts].sort(
    (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)
  );

  // Featured lead essay takes visual priority cleanly, falling back to newest post
  const centerLead =
    sortedVisible.find((p) => p.featured) || sortedVisible[0] || null;
  const remainingAfterLead = sortedVisible.filter(
    (p) => !centerLead || p.id !== centerLead.id
  );
  const leftColumn = remainingAfterLead.slice(0, 2);
  const latestRail = (sortedVisible.length >= 5 ? sortedVisible : sortedAll).slice(
    0,
    5
  );

  const sections: BlogEditorialSection[] = [];

  // Surface freshly synced Blogger.com posts in their own band first when present
  const bloggerPosts = sortedVisible.filter((p) => p.source === "blogger");
  if (bloggerPosts.length > 0) {
    sections.push({
      category: "Blogger.com Dispatches",
      filterKey: "All",
      sourceFilter: "blogger",
      posts: bloggerPosts.slice(0, 4),
      totalCount: bloggerPosts.length,
    });
  }

  // Group remaining journal categories, merging rare 1-card categories into a full 4-column specialty row
  const grouped = new Map<string, BlogPostItem[]>();
  for (const post of sortedVisible) {
    const key = (post.category || "Architectural Journal").trim();
    const list = grouped.get(key) || [];
    list.push(post);
    grouped.set(key, list);
  }

  const specialtyBucket: BlogPostItem[] = [];
  const multiEntries = Array.from(grouped.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [category, list] of multiEntries) {
    if (list.length >= 3) {
      sections.push({
        category,
        filterKey: category,
        posts: list.slice(0, 4),
        totalCount: list.length,
      });
    } else {
      specialtyBucket.push(...list);
    }
  }

  if (specialtyBucket.length > 0) {
    const sortedSpecialty = [...specialtyBucket].sort(
      (a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)
    );
    sections.push({
      category: "Acoustics, Safety & Materials",
      filterKey: sortedSpecialty[0]?.category || "Materials",
      posts: sortedSpecialty.slice(0, 4),
      totalCount: sortedSpecialty.length,
    });
  }

  return {
    centerLead,
    leftColumn,
    latestRail,
    categorySections: sections,
  };
}
