import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { App as AntdApp, Button, Popconfirm, Spin } from "antd";
import {
  FiCheckCircle,
  FiDroplet,
  FiExternalLink,
  FiLayers,
  FiRefreshCw,
  FiSave,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import HeroThemeEditor, { type HeroThemeCopySource } from "./HeroThemeEditor";
import {
  DEFAULT_HERO_THEME,
  DEFAULT_PAGE_HERO_THEMES,
  buildCategoryAccentFillCss,
  describeHeroThemeSummary,
  normalizeHeroTheme,
  normalizePageHeroThemes,
  type HeroThemeConfig,
  type PageHeroThemeKey,
  type PageHeroThemesMap,
} from "../../../shared/heroThemeHelpers";
import {
  normalizeProductCategory,
  normalizeProductLandingCms,
  type ProductCategory,
} from "../../../shared/productCatalogHelpers";

interface HeroThemesApiResponse {
  pageThemes?: Partial<Record<PageHeroThemeKey, Partial<HeroThemeConfig>>>;
  aboutHeroTheme?: Partial<HeroThemeConfig>;
  productLandingHeroTheme?: Partial<HeroThemeConfig>;
}

const PAGE_HERO_META: Array<{
  key: PageHeroThemeKey;
  label: string;
  route: string;
  previewHeadline: string;
  previewSubheadline: string;
  previewImage: string;
}> = [
  {
    key: "projects",
    label: "Projects Page Hero",
    route: "/projects",
    previewHeadline: "Completed Architectural Projects",
    previewSubheadline: "Landmark residential, commercial & coastal glazing installations.",
    previewImage: "/assets/about/facade.jpg",
  },
  {
    key: "resources",
    label: "Resources Page Hero",
    route: "/resources",
    previewHeadline: "Architectural Specifications & Guides",
    previewSubheadline: "Technical datasheets, warranty schedules, and structural profile documentation.",
    previewImage: "/assets/about/pavilion.jpg",
  },
  {
    key: "contact",
    label: "Contact Page Hero",
    route: "/contact",
    previewHeadline: "Consult With Innovista Engineering",
    previewSubheadline: "Schedule a site inspection, showroom tour, or architectural fabrication quote.",
    previewImage: "/assets/about/terrace.jpg",
  },
];

export default function PageHeroColorsEditor() {
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  const [selectedKey, setSelectedKey] = useState<PageHeroThemeKey>("projects");
  const [pageThemes, setPageThemes] = useState<PageHeroThemesMap>(DEFAULT_PAGE_HERO_THEMES);
  const [aboutTheme, setAboutTheme] = useState<HeroThemeConfig>(DEFAULT_HERO_THEME);
  const [productLandingTheme, setProductLandingTheme] =
    useState<HeroThemeConfig>(DEFAULT_HERO_THEME);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const loadAllThemes = useCallback(async () => {
    try {
      setLoading(true);
      const [themesRes, catRes, prodCmsRes] = await Promise.allSettled([
        AxiosConfig.get<HeroThemesApiResponse>("/api/hero-themes"),
        AxiosConfig.get<unknown>("/api/categories"),
        AxiosConfig.get<{ data?: unknown }>("/products/cms"),
      ]);

      if (themesRes.status === "fulfilled" && themesRes.value.data) {
        const d = themesRes.value.data;
        setPageThemes(normalizePageHeroThemes(d.pageThemes));
        setAboutTheme(normalizeHeroTheme(d.aboutHeroTheme, DEFAULT_HERO_THEME));
        setProductLandingTheme(
          normalizeHeroTheme(d.productLandingHeroTheme, DEFAULT_HERO_THEME)
        );
      }

      if (catRes.status === "fulfilled") {
        const raw = catRes.value.data as unknown;
        const arr = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown[] }).data)
          ? (raw as { data: unknown[] }).data
          : [];
        setCategories(
          arr.map((item, i) =>
            normalizeProductCategory(item as Partial<ProductCategory>, i)
          )
        );
      }

      if (prodCmsRes.status === "fulfilled" && prodCmsRes.value.data?.data) {
        const normalizedProd = normalizeProductLandingCms(prodCmsRes.value.data.data);
        if (normalizedProd.heroTheme) {
          setProductLandingTheme(normalizedProd.heroTheme);
        }
      }
    } catch {
      message.error("Could not load site page hero colors.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadAllThemes();
  }, [loadAllThemes]);

  const activeMeta = useMemo(
    () => PAGE_HERO_META.find((m) => m.key === selectedKey) || PAGE_HERO_META[0],
    [selectedKey]
  );

  const copySources: HeroThemeCopySource[] = useMemo(() => {
    const sources: HeroThemeCopySource[] = [
      { id: "about", label: "About Us Hero", theme: aboutTheme },
      { id: "products", label: "Product Catalog Hero", theme: productLandingTheme },
    ];
    for (const meta of PAGE_HERO_META) {
      if (meta.key !== selectedKey) {
        sources.push({
          id: `page-${meta.key}`,
          label: meta.label,
          theme: pageThemes[meta.key],
        });
      }
    }
    for (const cat of categories) {
      sources.push({
        id: `cat-${cat.CategoryID}`,
        label: cat.name,
        theme: normalizeHeroTheme(cat.heroTheme, DEFAULT_HERO_THEME),
      });
    }
    return sources;
  }, [aboutTheme, productLandingTheme, pageThemes, selectedKey, categories]);

  const handleSavePageThemes = async () => {
    try {
      setSaving(true);
      const res = await AxiosConfig.put<HeroThemesApiResponse>("/api/hero-themes", {
        pageThemes,
      });
      if (res.data?.pageThemes) {
        setPageThemes(normalizePageHeroThemes(res.data.pageThemes));
      }
      message.success("Saved hero color themes for Projects, Resources & Contact!");
    } catch {
      message.error("Could not save page hero themes.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetAllSiteDefaults = async () => {
    try {
      setApplyingAll(true);
      const res = await AxiosConfig.put<HeroThemesApiResponse>("/api/hero-themes", {
        applyToAllSite: true,
        theme: DEFAULT_HERO_THEME,
      });
      if (res.data?.pageThemes) {
        setPageThemes(normalizePageHeroThemes(res.data.pageThemes));
      }
      setAboutTheme(DEFAULT_HERO_THEME);
      setProductLandingTheme(DEFAULT_HERO_THEME);
      message.success("Restored Innovista Ocean gradient across all pages & categories.");
      loadAllThemes();
    } catch {
      message.error("Failed to reset site colors.");
    } finally {
      setApplyingAll(false);
    }
  };

  const handleApplyThemeAcrossEntireSite = async (themeToApply: HeroThemeConfig) => {
    try {
      setApplyingAll(true);
      const res = await AxiosConfig.put<HeroThemesApiResponse>("/api/hero-themes", {
        applyToAllSite: true,
        theme: themeToApply,
      });
      if (res.data?.pageThemes) {
        setPageThemes(normalizePageHeroThemes(res.data.pageThemes));
      }
      setAboutTheme(themeToApply);
      setProductLandingTheme(themeToApply);
      message.success(
        "Applied these colors & RGB stops to About Us, Products, All Categories, Projects, Resources & Contact!"
      );
    } catch {
      message.error("Failed to apply colors across all site pages.");
    } finally {
      setApplyingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 m-0">
          <FiDroplet className="text-[#22577A]" />
          <span>Colors</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Popconfirm
            title="Reset all site colors?"
            onConfirm={handleResetAllSiteDefaults}
            okText="Reset"
            cancelText="Cancel"
          >
            <Button size="small" icon={<FiRefreshCw />} loading={applyingAll}>
              Reset
            </Button>
          </Popconfirm>

          <Button
            type="primary"
            icon={<FiSave />}
            loading={saving}
            onClick={handleSavePageThemes}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Direct Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
              style={{ background: buildCategoryAccentFillCss(aboutTheme) }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">About</div>
              <div className="text-[11px] text-slate-500 truncate">
                {describeHeroThemeSummary(aboutTheme)}
              </div>
            </div>
          </div>
          <Link
            to="/EditVisionMission?tab=slideshow"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-[#22577A] px-2.5 py-1.5 text-xs font-semibold text-[#22577A] no-underline shrink-0"
          >
            <span>Edit</span>
            <FiExternalLink className="text-[11px]" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
              style={{ background: buildCategoryAccentFillCss(productLandingTheme) }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Categories ({categories.length})
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {describeHeroThemeSummary(productLandingTheme)}
              </div>
            </div>
          </div>
          <Link
            to="/ProductCategoriesAdmin?tab=categories"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-[#22577A] px-2.5 py-1.5 text-xs font-semibold text-[#22577A] no-underline shrink-0"
          >
            <FiLayers className="text-[11px]" />
            <span>Categories</span>
          </Link>
        </div>
      </div>

      {/* Page Selector Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PAGE_HERO_META.map((meta) => {
          const theme = pageThemes[meta.key];
          const isSelected = selectedKey === meta.key;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => setSelectedKey(meta.key)}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-[#22577A] bg-sky-50/60"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 capitalize">{meta.key}</span>
                {isSelected && <FiCheckCircle className="text-[#22577A] text-sm shrink-0" />}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-block w-5 h-3.5 rounded border border-slate-200 shrink-0"
                  style={{ background: buildCategoryAccentFillCss(theme) }}
                />
                <span className="text-[11px] text-slate-600 truncate">
                  {describeHeroThemeSummary(theme)}
                </span>
              </div>
              <div className="mt-2">
                <Link
                  to={meta.route}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3393B8] hover:underline no-underline"
                >
                  <span>Open</span>
                  <FiExternalLink className="text-[10px]" />
                </Link>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Page Hero Theme Editor */}
      <HeroThemeEditor
        value={pageThemes[selectedKey]}
        onChange={(nextTheme) =>
          setPageThemes((prev) => ({
            ...prev,
            [selectedKey]: nextTheme,
          }))
        }
        title={activeMeta.label}
        previewHeadline={activeMeta.previewHeadline}
        previewSubheadline={activeMeta.previewSubheadline}
        previewImage={activeMeta.previewImage}
        copySources={copySources}
        onApplyToAll={handleApplyThemeAcrossEntireSite}
        applyToAllLabel="Apply"
        applyingToAll={applyingAll}
      />
    </div>
  );
}
