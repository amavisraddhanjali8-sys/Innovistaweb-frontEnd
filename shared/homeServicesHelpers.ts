export interface HomeServiceItem {
  id: string;
  image: string;
  title: string;
  description1: string;
  description2: string;
  active: boolean;
}

export interface HomeServicesCmsPayload {
  heading: string;
  subheading: string;
  durationMs: number;
  items: HomeServiceItem[];
}

export const MIN_SERVICES_DURATION_MS = 3000;
export const MAX_SERVICES_DURATION_MS = 30000;
export const DEFAULT_SERVICES_DURATION_MS = 15000;

export const DEFAULT_SERVICES_HEADING = "what we build for you";
export const DEFAULT_SERVICES_SUBHEADING =
  "We create innovative solutions tailored to your needs.";

export const SERVICE_IMAGE_PRESETS: Array<{ label: string; url: string }> = [
  { label: "Doors & Windows", url: "/assets/serviceImages/image1.jpg" },
  { label: "Partitions & Curtain Walls", url: "/assets/serviceImages/image2.jpg" },
  { label: "Roofing Solutions", url: "/assets/serviceImages/image3.jpg" },
  { label: "Steel Structures & Frameworks", url: "/assets/serviceImages/image4.jpg" },
  { label: "Stainless Steel Fabrications", url: "/assets/serviceImages/image5.jpg" },
  { label: "Louvers & Sunshade Systems", url: "/assets/serviceImages/image6.jpg" },
  { label: "Glass Partitions & Cubicles", url: "/assets/serviceImages/image7.jpg" },
  { label: "Fire-Rated & Acoustic Doors", url: "/assets/serviceImages/image8.jpg" },
  { label: "Ventilation & Airflow", url: "/assets/serviceImages/image9.jpg" },
  { label: "Construction & Civil Works", url: "/assets/serviceImages/image10.jpg" },
  { label: "Interior Design & Fit-Out", url: "/assets/serviceImages/image11.jpg" },
  { label: "Renovation & Maintenance", url: "/assets/serviceImages/image12.jpg" },
];

export const DEFAULT_HOME_SERVICE_ITEMS: HomeServiceItem[] = [
  {
    id: "service-1",
    image: "/assets/serviceImages/image1.jpg",
    title: "Aluminium & Steel Doors and Windows",
    description1:
      "We provide high-quality aluminium and steel doors and windows designed for durability, security, and aesthetic appeal. Our solutions cater to residential, commercial, and industrial buildings, ensuring optimal functionality and weather resistance.",
    description2:
      "We handle custom designs, fabrication, and professional installations adhering to industry standards. Additional services include hardware fitting, sealing, and maintenance support for long-lasting performance.",
    active: true,
  },
  {
    id: "service-2",
    image: "/assets/serviceImages/image2.jpg",
    title: "Aluminium Partitions & Glass Curtain Walls",
    description1:
      "Our aluminium partitions and glass curtain walls create modern, elegant spaces that maximize natural light and privacy. These systems are customizable for offices, retail stores, and commercial interiors with a focus on seamless design and structural integrity.",
    description2:
      "We specialize in full project execution from design consultation to installation and finishing. Our solutions also include soundproofing options and energy-efficient glazing.",
    active: true,
  },
  {
    id: "service-3",
    image: "/assets/serviceImages/image3.jpg",
    title: "Aluminium and Steel Roofing Solutions",
    description1:
      "We offer robust aluminium and steel roofing systems tailored to withstand various climatic conditions for different building types. Our expertise covers design, fabrication, and installation of roofs that ensure durability, thermal efficiency, and low maintenance.",
    description2:
      "We also provide waterproofing, insulation, and roofing repair services. Our solutions are optimized for residential, commercial, and industrial applications.",
    active: true,
  },
  {
    id: "service-4",
    image: "/assets/serviceImages/image4.jpg",
    title: "Steel Structures & Frameworks",
    description1:
      "We deliver engineered steel structures and frameworks designed to provide superior strength and stability for construction projects. Our services include fabrication, erection, and quality inspection for industrial facilities, warehouses, and commercial buildings.",
    description2:
      "We ensure compliance with safety standards and optimize designs for cost-effectiveness and longevity. Custom framework solutions are available to meet specific architectural and engineering requirements.",
    active: true,
  },
  {
    id: "service-5",
    image: "/assets/serviceImages/image5.jpg",
    title: "Custom Stainless Steel Fabrications",
    description1:
      "Our custom stainless steel fabrication services cater to architectural, industrial, and decorative needs with precision and high-quality materials. We produce tailored products including railings, balustrades, furniture, and industrial components.",
    description2:
      "Our process covers design, cutting, welding, finishing, and installation. We emphasize corrosion resistance, durability, and aesthetic appeal in every fabrication.",
    active: true,
  },
  {
    id: "service-6",
    image: "/assets/serviceImages/image6.jpg",
    title: "Aluminium Louvers & Sunshade Systems",
    description1:
      "We design and install aluminium louvers and sunshade systems that improve building ventilation, control sunlight, and enhance energy efficiency. These systems are customizable to suit façade aesthetics and functional requirements for commercial and residential buildings.",
    description2:
      "Our solutions include motorized and fixed louvers with durable finishes. We also provide maintenance and repair services to ensure long-term performance.",
    active: true,
  },
  {
    id: "service-7",
    image: "/assets/serviceImages/image7.jpg",
    title: "Glass Partitions, Doors & Cubicles",
    description1:
      "Our glass partitions, doors, and cubicles create transparent, stylish, and functional interior divisions ideal for office, retail, and showroom environments. We offer frameless, semi-frameless, and fully framed systems tailored to client design preferences.",
    description2:
      "Installation includes soundproofing options and hardware fittings for ease of use and security. We also provide customized layouts and repair services to maintain aesthetic and operational quality.",
    active: true,
  },
  {
    id: "service-8",
    image: "/assets/serviceImages/image8.jpg",
    title: "Fire-Rated & Acoustic Doors and Partitions",
    description1:
      "We specialize in fire-rated and acoustic doors and partitions that meet strict safety regulations while providing effective noise reduction. Our products are used in commercial, healthcare, and institutional buildings requiring high safety standards.",
    description2:
      "We offer design consultation, fabrication, installation, and ongoing compliance verification. These systems enhance building safety without compromising style and functionality.",
    active: true,
  },
  {
    id: "service-9",
    image: "/assets/serviceImages/image9.jpg",
    title: "Ventilation Systems & Airflow Solutions",
    description1:
      "Our ventilation services include designing and installing systems for heated air removal, fresh air delivery, and climate control in buildings. We provide tailored solutions for HVAC integration, industrial ventilation, and commercial air quality management.",
    description2:
      "Our expertise covers ductwork, fans, louvers, and control systems to optimize airflow efficiency. Maintenance and upgrades are also part of our comprehensive ventilation services.",
    active: true,
  },
  {
    id: "service-10",
    image: "/assets/serviceImages/image10.jpg",
    title: "Construction & Civil Works",
    description1:
      "We deliver full-spectrum construction and civil engineering services including residential, commercial, and industrial buildings. Our expertise spans steel and prefabricated building solutions, foundation works, structural design, roofing, and site supervision.",
    description2:
      "We manage renovation, remodeling, and turnkey project execution with a focus on quality, safety, and timely delivery. Our team ensures compliance with local regulations and client specifications.",
    active: true,
  },
  {
    id: "service-11",
    image: "/assets/serviceImages/image11.jpg",
    title: "Interior Design & Fit-Out Solutions",
    description1:
      "Our interior design and fit-out services cover concept development, 3D visualization, and execution for offices, retail, and residential spaces. We specialize in false ceilings, modular kitchens, custom joinery, flooring, lighting, and decorative glass installations.",
    description2:
      "We also provide exterior façade solutions including cladding, landscaping, and shading systems. Maintenance, repair, and customized metal and glass solutions complement our design services.",
    active: true,
  },
  {
    id: "service-12",
    image: "/assets/serviceImages/image12.jpg",
    title: "Renovation & Maintenance Services",
    description1:
      "We offer comprehensive renovation and maintenance services for interiors, exteriors, and commercial spaces, including kitchens, bathrooms, and flooring upgrades. Our expertise includes façade restoration, glazing replacement, roofing repairs, and soundproofing improvements.",
    description2:
      "We serve diverse sectors with solutions for fire-rated door upgrades, energy-efficient retrofits, and structural steel repairs. Our focus is on enhancing functionality, aesthetics, and sustainability through modern techniques.",
    active: true,
  },
];

export const DEFAULT_HOME_SERVICES_CMS: HomeServicesCmsPayload = {
  heading: DEFAULT_SERVICES_HEADING,
  subheading: DEFAULT_SERVICES_SUBHEADING,
  durationMs: DEFAULT_SERVICES_DURATION_MS,
  items: DEFAULT_HOME_SERVICE_ITEMS,
};

export function clampServicesDurationMs(
  rawMs: unknown,
  fallback = DEFAULT_SERVICES_DURATION_MS
): number {
  const num = typeof rawMs === "number" ? rawMs : Number(rawMs);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(
    MAX_SERVICES_DURATION_MS,
    Math.max(MIN_SERVICES_DURATION_MS, Math.round(num))
  );
}

export function normalizeHomeServiceItems(
  rawItems?: Partial<HomeServiceItem>[] | null
): HomeServiceItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return DEFAULT_HOME_SERVICE_ITEMS;
  }

  const normalized = rawItems
    .map((item, idx) => {
      const def =
        DEFAULT_HOME_SERVICE_ITEMS[idx % DEFAULT_HOME_SERVICE_ITEMS.length];
      const title = (item?.title || "").trim() || def.title;
      const image = (item?.image || "").trim() || def.image;
      const description1 = (item?.description1 || "").trim() || def.description1;
      const description2 = (item?.description2 || "").trim();
      return {
        id: item?.id?.trim() || `service-${idx + 1}`,
        image,
        title,
        description1,
        description2,
        active: item?.active !== false,
      };
    })
    .filter((item) => Boolean(item.title && item.image));

  return normalized.length > 0 ? normalized : DEFAULT_HOME_SERVICE_ITEMS;
}

export function normalizeHomeServicesCms(
  raw?: Partial<HomeServicesCmsPayload> | null
): HomeServicesCmsPayload {
  return {
    heading: raw?.heading?.trim() || DEFAULT_SERVICES_HEADING,
    subheading: raw?.subheading?.trim() || DEFAULT_SERVICES_SUBHEADING,
    durationMs: clampServicesDurationMs(
      raw?.durationMs,
      DEFAULT_SERVICES_DURATION_MS
    ),
    items: normalizeHomeServiceItems(raw?.items),
  };
}

export function upsertHomeService(
  items: HomeServiceItem[],
  draft: {
    image: string;
    title: string;
    description1: string;
    description2?: string;
    active?: boolean;
  },
  editingId?: string | null
): HomeServiceItem[] {
  const cleanTitle = (draft.title || "").trim();
  const cleanImage = (draft.image || "").trim();
  if (!cleanTitle || !cleanImage) return items;

  const nextItem: HomeServiceItem = {
    id: editingId?.trim() || `service-${Date.now()}`,
    image: cleanImage,
    title: cleanTitle,
    description1: (draft.description1 || "").trim(),
    description2: (draft.description2 || "").trim(),
    active: draft.active !== false,
  };

  if (editingId && items.some((s) => s.id === editingId)) {
    return items.map((s) => (s.id === editingId ? nextItem : s));
  }
  return [...items, nextItem];
}

export function deleteHomeService(
  items: HomeServiceItem[],
  serviceId: string
): HomeServiceItem[] {
  if (items.length <= 1) return items;
  const filtered = items.filter((s) => s.id !== serviceId);
  return filtered.length > 0 ? filtered : items;
}

export function moveHomeService(
  items: HomeServiceItem[],
  index: number,
  direction: -1 | 1
): HomeServiceItem[] {
  const target = index + direction;
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  ) {
    return items;
  }
  const copy = [...items];
  const [picked] = copy.splice(index, 1);
  copy.splice(target, 0, picked);
  return copy;
}

export function toggleHomeServiceActive(
  items: HomeServiceItem[],
  serviceId: string
): HomeServiceItem[] {
  return items.map((s) =>
    s.id === serviceId ? { ...s, active: s.active === false } : s
  );
}
