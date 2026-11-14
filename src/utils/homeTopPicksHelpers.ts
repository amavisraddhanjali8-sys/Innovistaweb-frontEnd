import {
  DEFAULT_DESIGNS_CATALOG,
  DEFAULT_DOOR_ACCESSORIES,
  DEFAULT_WINDOW_ACCESSORIES,
  sanitizeDesignImages,
  type DesignItem,
} from "./productCatalogHelpers";

export interface HomeAccessoryRibbonItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  linkTo: string;
  active: boolean;
}

export interface HomeFeaturedProductsCmsPayload {
  heading: string;
  subheading: string;
  selectedProductIds: (string | number)[];
  productImageOverrides: Record<string, string>;
  accessoriesRibbonHeading: string;
  accessoriesRibbonSubheading: string;
  accessoriesRibbonSpeed: number;
  showAccessoriesRibbon: boolean;
  accessoriesRibbonItems: HomeAccessoryRibbonItem[];
}

export const MIN_RIBBON_SPEED = 15;
export const MAX_RIBBON_SPEED = 120;
export const DEFAULT_RIBBON_SPEED = 45;

export const DEFAULT_TOP_PICKS_HEADING = "Our Top Picks";
export const DEFAULT_TOP_PICKS_SUBHEADING =
  "Explore signature thermally broken aluminium doors, acoustic partitions, and architectural glazing systems.";

export const DEFAULT_ACCESSORIES_RIBBON_HEADING =
  "Architectural Hardware & Accessories";
export const DEFAULT_ACCESSORIES_RIBBON_SUBHEADING =
  "Precision stainless steel rollers, multi-point European locks, dampers, and coastal weather seals.";

export const HOME_ACCESSORY_IMAGE_PRESETS: Array<{ label: string; url: string }> = [
  { label: "Sliding Door Handle Hardware", url: "/assets/products/door.jpg" },
  { label: "Champagne Pull & Showroom", url: "/assets/products/hero-showroom.jpg" },
  { label: "Concealed Pocket Hardware", url: "/assets/products/showroom.jpg" },
  { label: "SS316 Heavy-Duty Tandem Rollers", url: "/assets/about/pavilion.jpg" },
  { label: "Lift & Slide Quad Carriage", url: "/assets/about/terrace.jpg" },
  { label: "Flush Monsoon Drainage Track", url: "/assets/about/facade.jpg" },
  { label: "Acoustic Damper & Seals", url: "/assets/products/partition.jpg" },
  { label: "Wide-Egress Casement Stay", url: "/assets/products/window.jpg" },
  { label: "Louver Espag & Flyscreen", url: "/assets/products/louvers.jpg" },
  { label: "Shower Hinge Hardware", url: "/assets/products/bathroom.jpg" },
];

function buildDefaultAccessoryRibbonItems(): HomeAccessoryRibbonItem[] {
  const allGroups = [...DEFAULT_DOOR_ACCESSORIES, ...DEFAULT_WINDOW_ACCESSORIES];
  const items: HomeAccessoryRibbonItem[] = [];

  for (const group of allGroups) {
    const productLink = group.id.startsWith("w") ? "/products/2" : "/products/1";
    for (const variant of group.variants || []) {
      items.push({
        id: `home-acc-${variant.id}`,
        title: variant.name,
        subtitle: [variant.code, variant.finish].filter(Boolean).join(" · "),
        image: variant.image || group.image,
        linkTo: productLink,
        active: true,
      });
    }
  }

  return items.length > 0
    ? items
    : [
        {
          id: "home-acc-1",
          title: "Matte Charcoal Lift Handle",
          subtitle: "INV-HND-01 · Powder Matte Black",
          image: "/assets/products/door.jpg",
          linkTo: "/products/1",
          active: true,
        },
      ];
}

export const DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS: HomeAccessoryRibbonItem[] =
  buildDefaultAccessoryRibbonItems();

export const DEFAULT_HOME_FEATURED_PRODUCTS_CMS: HomeFeaturedProductsCmsPayload = {
  heading: DEFAULT_TOP_PICKS_HEADING,
  subheading: DEFAULT_TOP_PICKS_SUBHEADING,
  selectedProductIds: [1, 2, 3, 4, 5, 6],
  productImageOverrides: {},
  accessoriesRibbonHeading: DEFAULT_ACCESSORIES_RIBBON_HEADING,
  accessoriesRibbonSubheading: DEFAULT_ACCESSORIES_RIBBON_SUBHEADING,
  accessoriesRibbonSpeed: DEFAULT_RIBBON_SPEED,
  showAccessoriesRibbon: true,
  accessoriesRibbonItems: DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS,
};

export function clampAccessoriesRibbonSpeed(
  rawSpeed: unknown,
  fallback = DEFAULT_RIBBON_SPEED
): number {
  const num = typeof rawSpeed === "number" ? rawSpeed : Number(rawSpeed);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(MAX_RIBBON_SPEED, Math.max(MIN_RIBBON_SPEED, Math.round(num)));
}

export function normalizeSelectedProductIds(
  rawIds?: unknown[] | null
): (string | number)[] {
  if (!Array.isArray(rawIds)) {
    return [...DEFAULT_HOME_FEATURED_PRODUCTS_CMS.selectedProductIds];
  }
  const seen = new Set<string>();
  const cleaned: (string | number)[] = [];

  for (const raw of rawIds) {
    if (raw === null || raw === undefined) continue;
    const str = String(raw).trim();
    if (!str || seen.has(str)) continue;
    seen.add(str);
    cleaned.push(/^\d+$/.test(str) && Number(str) < 1e12 ? Number(str) : str);
  }

  return cleaned;
}

export function normalizeProductImageOverrides(
  rawOverrides?: Record<string, unknown> | null
): Record<string, string> {
  if (!rawOverrides || typeof rawOverrides !== "object" || Array.isArray(rawOverrides)) {
    return {};
  }
  const clean: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawOverrides)) {
    const k = String(key || "").trim();
    const url = typeof val === "string" ? val.trim() : "";
    if (k && url) {
      clean[k] = url;
    }
  }
  return clean;
}

export function normalizeHomeAccessoryRibbonItems(
  rawItems?: Partial<HomeAccessoryRibbonItem>[] | null
): HomeAccessoryRibbonItem[] {
  if (!Array.isArray(rawItems)) {
    return DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS.map((item) => ({ ...item }));
  }

  const normalized = rawItems
    .map((item, idx) => {
      const def =
        DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS[
          idx % DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS.length
        ];
      const image = (item?.image || "").trim();
      const title = (item?.title || "").trim() || def.title;
      if (!image) return null;
      return {
        id: (item?.id || "").trim() || `home-acc-${idx + 1}`,
        title,
        subtitle: (item?.subtitle || "").trim(),
        image,
        linkTo: (item?.linkTo || "").trim() || "/products",
        active: item?.active !== false,
      };
    })
    .filter((item): item is HomeAccessoryRibbonItem => item !== null);

  return normalized;
}

export function normalizeHomeFeaturedProductsCms(
  raw?: Partial<HomeFeaturedProductsCmsPayload> | null
): HomeFeaturedProductsCmsPayload {
  const hasSelectedIds = Array.isArray(raw?.selectedProductIds);
  const selectedIds = hasSelectedIds
    ? normalizeSelectedProductIds(raw!.selectedProductIds)
    : [...DEFAULT_HOME_FEATURED_PRODUCTS_CMS.selectedProductIds];

  return {
    heading: raw?.heading?.trim() || DEFAULT_TOP_PICKS_HEADING,
    subheading: raw?.subheading?.trim() || DEFAULT_TOP_PICKS_SUBHEADING,
    selectedProductIds: selectedIds,
    productImageOverrides: normalizeProductImageOverrides(
      raw?.productImageOverrides
    ),
    accessoriesRibbonHeading:
      raw?.accessoriesRibbonHeading?.trim() || DEFAULT_ACCESSORIES_RIBBON_HEADING,
    accessoriesRibbonSubheading:
      raw?.accessoriesRibbonSubheading?.trim() ||
      DEFAULT_ACCESSORIES_RIBBON_SUBHEADING,
    accessoriesRibbonSpeed: clampAccessoriesRibbonSpeed(
      raw?.accessoriesRibbonSpeed,
      DEFAULT_RIBBON_SPEED
    ),
    showAccessoriesRibbon:
      raw?.showAccessoriesRibbon !== undefined
        ? Boolean(raw.showAccessoriesRibbon)
        : true,
    accessoriesRibbonItems: Array.isArray(raw?.accessoriesRibbonItems)
      ? normalizeHomeAccessoryRibbonItems(raw.accessoriesRibbonItems)
      : DEFAULT_HOME_ACCESSORY_RIBBON_ITEMS.map((item) => ({ ...item })),
  };
}

export function resolveSelectedHomeDesigns(
  selectedProductIds: (string | number)[],
  allDesigns: DesignItem[] = DEFAULT_DESIGNS_CATALOG,
  fallbackCount = 6
): DesignItem[] {
  const safeDesigns = Array.isArray(allDesigns) && allDesigns.length > 0
    ? allDesigns
    : DEFAULT_DESIGNS_CATALOG;

  const byId = new Map<string, DesignItem>();
  for (const d of safeDesigns) {
    byId.set(String(d.DesignID), d);
  }

  const picked: DesignItem[] = [];
  const seen = new Set<string>();
  for (const id of selectedProductIds || []) {
    const key = String(id);
    if (seen.has(key)) continue;
    const match = byId.get(key);
    if (match) {
      picked.push(match);
      seen.add(key);
    }
  }

  if (picked.length > 0) {
    return picked;
  }

  return safeDesigns.slice(0, fallbackCount);
}

export function getHomeProductDisplayImage(
  design: DesignItem,
  overrides?: Record<string, string>
): string {
  const overrideUrl = overrides?.[String(design.DesignID)]?.trim();
  if (overrideUrl) return overrideUrl;
  return sanitizeDesignImages(design.Design_Image)[0];
}

export function toggleSelectedHomeProduct(
  selectedIds: (string | number)[],
  productId: string | number
): (string | number)[] {
  const key = String(productId);
  const exists = selectedIds.some((id) => String(id) === key);
  if (exists) {
    if (selectedIds.length <= 1) return selectedIds;
    return selectedIds.filter((id) => String(id) !== key);
  }
  const normalized = /^\d+$/.test(key) && Number(key) < 1e12 ? Number(key) : key;
  return [...selectedIds, normalized];
}

export function moveSelectedHomeProduct(
  selectedIds: (string | number)[],
  index: number,
  direction: -1 | 1
): (string | number)[] {
  const target = index + direction;
  if (
    index < 0 ||
    index >= selectedIds.length ||
    target < 0 ||
    target >= selectedIds.length
  ) {
    return selectedIds;
  }
  const copy = [...selectedIds];
  const [picked] = copy.splice(index, 1);
  copy.splice(target, 0, picked);
  return copy;
}

export function upsertHomeAccessoryRibbonItem(
  items: HomeAccessoryRibbonItem[],
  draft: {
    title: string;
    subtitle?: string;
    image: string;
    linkTo?: string;
    active?: boolean;
  },
  editingId?: string | null
): HomeAccessoryRibbonItem[] {
  const cleanImage = (draft.image || "").trim();
  const cleanTitle = (draft.title || "").trim() || "Hardware Accessory";
  if (!cleanImage) return items;

  const nextItem: HomeAccessoryRibbonItem = {
    id: editingId?.trim() || `home-acc-${Date.now()}`,
    title: cleanTitle,
    subtitle: (draft.subtitle || "").trim(),
    image: cleanImage,
    linkTo: (draft.linkTo || "").trim() || "/products",
    active: draft.active !== false,
  };

  if (editingId && items.some((i) => i.id === editingId)) {
    return items.map((i) => (i.id === editingId ? nextItem : i));
  }
  return [...items, nextItem];
}

export function deleteHomeAccessoryRibbonItem(
  items: HomeAccessoryRibbonItem[],
  itemId: string
): HomeAccessoryRibbonItem[] {
  if (items.length <= 1) return items;
  const filtered = items.filter((i) => i.id !== itemId);
  return filtered.length > 0 ? filtered : items;
}

export function moveHomeAccessoryRibbonItem(
  items: HomeAccessoryRibbonItem[],
  index: number,
  direction: -1 | 1
): HomeAccessoryRibbonItem[] {
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

export function toggleHomeAccessoryRibbonItemActive(
  items: HomeAccessoryRibbonItem[],
  itemId: string
): HomeAccessoryRibbonItem[] {
  return items.map((i) =>
    i.id === itemId ? { ...i, active: i.active === false } : i
  );
}
