import {
  designMatchesCategory,
  type DesignItem,
  type ProductCategory,
} from "./productCatalogHelpers.ts";
import type { HomeServiceItem } from "./homeServicesHelpers.ts";

export type HomeSearchResultKind = "category" | "product" | "solution";

export interface HomeSearchResultItem {
  id: string;
  kind: HomeSearchResultKind;
  title: string;
  subtitle: string;
  image: string;
  to: string;
  meta: string;
}

export interface HomeSearchResultsBundle {
  categories: HomeSearchResultItem[];
  products: HomeSearchResultItem[];
  solutions: HomeSearchResultItem[];
  totalCount: number;
}

function stemWord(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.length > 5 && clean.endsWith("ing")) return clean.slice(0, -3);
  if (clean.length > 4 && clean.endsWith("es")) return clean.slice(0, -2);
  if (clean.length > 3 && clean.endsWith("s")) return clean.slice(0, -1);
  return clean;
}

function scoreMatch(haystack: string, needle: string): number {
  const cleanHay = haystack.toLowerCase();
  const cleanNeedle = needle.toLowerCase();
  if (!cleanNeedle) return 1;
  if (cleanHay === cleanNeedle) return 100;
  if (cleanHay.startsWith(cleanNeedle)) return 75;

  const words = cleanHay.split(/[\s/&,-]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(cleanNeedle))) return 55;
  if (cleanHay.includes(cleanNeedle)) return 35;

  const needleTokens = cleanNeedle.split(/[\s/&,-]+/).filter(Boolean);
  if (
    needleTokens.length > 1 &&
    needleTokens.every((t) => cleanHay.includes(t))
  ) {
    return 25;
  }

  // Stem-based matching (e.g. "roofing" <-> "roof", "windows" <-> "window")
  if (needleTokens.length > 0) {
    const stemmedHayWords = words.map(stemWord).filter((w) => w.length >= 3);
    const allMatch = needleTokens.every((tok) => {
      const sTok = stemWord(tok);
      if (sTok.length < 3) return cleanHay.includes(tok);
      return (
        cleanHay.includes(sTok) ||
        stemmedHayWords.some((hw) => hw === sTok || hw.startsWith(sTok) || sTok.startsWith(hw))
      );
    });
    if (allMatch) return 20;
  }

  return 0;
}

function inferSolutionTargetRoute(
  title: string,
  categories: ProductCategory[],
  designs: DesignItem[]
): string {
  const lower = title.toLowerCase();
  const matchedCat = categories.find((cat) => {
    const tokens = [cat.name, cat.slug, ...cat.specHighlights]
      .join(" ")
      .toLowerCase();
    return (
      lower.includes(cat.name.toLowerCase()) ||
      lower.includes(cat.slug.toLowerCase()) ||
      (lower.includes("roof") && tokens.includes("roof")) ||
      (lower.includes("door") && tokens.includes("door")) ||
      (lower.includes("window") && tokens.includes("window")) ||
      (lower.includes("partition") && tokens.includes("partition")) ||
      (lower.includes("shopfront") && tokens.includes("shopfront")) ||
      (lower.includes("curtain") && tokens.includes("shopfront")) ||
      (lower.includes("louver") && tokens.includes("louver")) ||
      (lower.includes("shower") && tokens.includes("bathroom")) ||
      (lower.includes("wardrobe") && tokens.includes("wardrobe")) ||
      (lower.includes("pantry") && tokens.includes("pantry"))
    );
  });

  if (matchedCat) {
    return `/products/category/${matchedCat.slug}`;
  }

  const matchedDesign = designs.find((d) =>
    title
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length > 3 && d.Design_Name.toLowerCase().includes(word))
  );
  if (matchedDesign) {
    return `/products/${matchedDesign.DesignID}`;
  }

  return `/products?q=${encodeURIComponent(title)}`;
}

export function buildSearchSubmitRoute(
  query: string,
  categorySlug = "all"
): string {
  const cleanQuery = query.trim();
  const cleanCat = (categorySlug || "all").trim();
  if (cleanCat && cleanCat !== "all") {
    return cleanQuery
      ? `/products/category/${encodeURIComponent(cleanCat)}?q=${encodeURIComponent(cleanQuery)}`
      : `/products/category/${encodeURIComponent(cleanCat)}`;
  }
  return cleanQuery
    ? `/products?q=${encodeURIComponent(cleanQuery)}`
    : "/products";
}

export function searchHomeCatalog(params: {
  query: string;
  categorySlug?: string;
  designs: DesignItem[];
  categories: ProductCategory[];
  services?: HomeServiceItem[];
  maxCategories?: number;
  maxProducts?: number;
  maxSolutions?: number;
}): HomeSearchResultsBundle {
  const cleanQuery = params.query.trim();
  const activeCatSlug = (params.categorySlug || "all").trim();
  const maxCats = params.maxCategories ?? 4;
  const maxProds = params.maxProducts ?? 6;
  const maxSols = params.maxSolutions ?? 3;

  const selectedCategory =
    activeCatSlug !== "all"
      ? params.categories.find(
          (c) => c.slug.toLowerCase() === activeCatSlug.toLowerCase()
        )
      : undefined;

  const scoredCategories = params.categories
    .filter((cat) =>
      selectedCategory ? cat.slug === selectedCategory.slug : true
    )
    .map((cat) => {
      if (!cleanQuery) {
        return { item: cat, score: cat.featured ? 20 : 10 };
      }
      const nameScore = scoreMatch(cat.name, cleanQuery) * 2;
      const slugScore = scoreMatch(cat.slug, cleanQuery);
      const bodyScore = scoreMatch(
        `${cat.tagline} ${cat.description} ${cat.specHighlights.join(" ")}`,
        cleanQuery
      );
      return { item: cat, score: Math.max(nameScore, slugScore, bodyScore) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCats)
    .map(({ item }) => ({
      id: `cat-${item.CategoryID}`,
      kind: "category" as const,
      title: item.name,
      subtitle: item.tagline || "Architectural product category",
      image: item.coverImage || "/assets/products/hero-showroom.jpg",
      to: `/products/category/${item.slug}`,
      meta: "Category",
    }));

  const scoredProducts = params.designs
    .filter((design) =>
      selectedCategory ? designMatchesCategory(design, selectedCategory) : true
    )
    .map((design) => {
      if (!cleanQuery) {
        return { item: design, score: 10 };
      }
      const categoriesJoined = (design.Categories || []).join(" ");
      const featuresJoined = (design.features || []).join(" ");
      const nameScore = scoreMatch(design.Design_Name, cleanQuery) * 2;
      const catScore = scoreMatch(categoriesJoined, cleanQuery);
      const typeScore = scoreMatch(
        design.performance?.productType || "",
        cleanQuery
      );
      const descScore = scoreMatch(
        `${design.Design_Description || ""} ${featuresJoined}`,
        cleanQuery
      );
      return {
        item: design,
        score: Math.max(nameScore, catScore, typeScore, descScore),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxProds)
    .map(({ item }) => ({
      id: `prod-${item.DesignID}`,
      kind: "product" as const,
      title: item.Design_Name,
      subtitle:
        item.Categories?.[0] ||
        item.performance?.productType ||
        "Architectural System",
      image: item.Design_Image?.[0] || "/assets/products/door.jpg",
      to: `/products/${item.DesignID}`,
      meta: item.Categories?.[0] || "Product",
    }));

  const scoredSolutions = (params.services || [])
    .filter((svc) => svc.active !== false)
    .map((svc) => {
      const targetRoute = inferSolutionTargetRoute(
        svc.title,
        params.categories,
        params.designs
      );
      if (selectedCategory) {
        const matchesCatRoute =
          targetRoute.toLowerCase() ===
          `/products/category/${selectedCategory.slug.toLowerCase()}`;
        const matchesCatKeywords =
          scoreMatch(
            `${svc.title} ${svc.description1 || ""} ${svc.description2 || ""}`,
            selectedCategory.name
          ) > 0;
        if (!matchesCatRoute && !matchesCatKeywords) {
          return { item: svc, targetRoute, score: 0 };
        }
      }
      if (!cleanQuery) {
        return { item: svc, targetRoute, score: 10 };
      }
      const titleScore = scoreMatch(svc.title, cleanQuery) * 2;
      const bodyScore = scoreMatch(
        `${svc.description1 || ""} ${svc.description2 || ""}`,
        cleanQuery
      );
      return { item: svc, targetRoute, score: Math.max(titleScore, bodyScore) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSols)
    .map(({ item, targetRoute }) => ({
      id: `sol-${item.id}`,
      kind: "solution" as const,
      title: item.title,
      subtitle:
        item.description1 ||
        item.description2 ||
        "Custom architectural fabrication solution",
      image: item.image || "/assets/products/showroom.jpg",
      to: targetRoute,
      meta: "Solution",
    }));

  return {
    categories: scoredCategories,
    products: scoredProducts,
    solutions: scoredSolutions,
    totalCount:
      scoredCategories.length +
      scoredProducts.length +
      scoredSolutions.length,
  };
}
