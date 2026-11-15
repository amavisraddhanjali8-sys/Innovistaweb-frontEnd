import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Spin,
  Switch,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BgColorsOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import HeroThemeEditor, {
  type HeroThemeCopySource,
} from "../../components/HeroThemeEditor";
import {
  DEFAULT_HERO_THEME,
  buildCategoryAccentFillCss,
  buildHeroBackgroundCss,
  buildHeroImageMaskCss,
  describeHeroThemeSummary,
  normalizeHeroTheme,
  type HeroThemeConfig,
} from "../../../../shared/heroThemeHelpers";
import {
  clampSlideshowSpeedMs,
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  type HeroSlide,
} from "../../../../shared/aboutContentHelpers";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LANDING_CMS,
  PRODUCT_ASSET_PRESETS,
  createDefaultCategorySlides,
  normalizeProductCategory,
  normalizeProductLandingCms,
  slugifyCategoryName,
  type ProductCategory,
  type ProductLandingCms,
  type WhyChooseAccent,
  type WhyChooseIcon,
} from "../../../../shared/productCatalogHelpers";

const SPEED_PRESETS = [
  { label: "Fast (1.5s)", ms: 1500 },
  { label: "Brisk (2.5s)", ms: 2500 },
  { label: "Balanced (4s)", ms: 4000 },
  { label: "Classic (5.5s)", ms: 5500 },
  { label: "Calm (8s)", ms: 8000 },
];

export default function ProductCategoriesAdmin() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "slideshow"
      ? "slideshow"
      : tabParam === "whychoose"
      ? "whychoose"
      : "categories";

  const [activeTab, setActiveTab] = useState<
    "categories" | "slideshow" | "whychoose"
  >(initialTab);
  const [loading, setLoading] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Product Landing Slideshow State
  const [landingCms, setLandingCms] = useState<ProductLandingCms>(
    DEFAULT_PRODUCT_LANDING_CMS
  );
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Categories CRUD State
  const [categories, setCategories] = useState<ProductCategory[]>(
    DEFAULT_PRODUCT_CATEGORIES
  );

  // Category Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catTagline, setCatTagline] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catCoverImage, setCatCoverImage] = useState(PRODUCT_ASSET_PRESETS[0].url);
  const [catFeatured, setCatFeatured] = useState(true);
  const [catSpecsText, setCatSpecsText] = useState(
    "Custom Dimensions, Anodized Finish, Site Tested"
  );
  const [catSlideshowSpeedMs, setCatSlideshowSpeedMs] = useState(4500);
  const [catHeroSlides, setCatHeroSlides] = useState<HeroSlide[]>([]);
  const [catHeroTheme, setCatHeroTheme] =
    useState<HeroThemeConfig>(DEFAULT_HERO_THEME);
  const [aboutHeroTheme, setAboutHeroTheme] =
    useState<HeroThemeConfig>(DEFAULT_HERO_THEME);
  const [applyingAllCategories, setApplyingAllCategories] = useState(false);
  const handledEditParamRef = useRef<string | null>(null);

  const fetchAllProductCms = useCallback(async () => {
    try {
      setLoading(true);
      const [res, heroRes] = await Promise.all([
        AxiosConfig.get("/products/cms"),
        AxiosConfig.get("/api/hero-themes").catch(() => null),
      ]);
      const rawLanding = res.data?.landing ?? res.data?.data;
      if (rawLanding) {
        setLandingCms(normalizeProductLandingCms(rawLanding));
      }
      if (Array.isArray(res.data?.categories)) {
        setCategories(
          res.data.categories.map((c: Partial<ProductCategory>, idx: number) =>
            normalizeProductCategory(c, idx)
          )
        );
      }
      if (heroRes?.data?.aboutHeroTheme) {
        setAboutHeroTheme(
          normalizeHeroTheme(heroRes.data.aboutHeroTheme, DEFAULT_HERO_THEME)
        );
      }
    } catch {
      message.error("Could not load Product Categories CMS.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchAllProductCms();
  }, [fetchAllProductCms]);

  const openCategoryEditor = useCallback(
    (cat?: ProductCategory, scrollToColors = false) => {
      if (cat) {
        setEditingId(cat.CategoryID);
        setCatName(cat.name);
        setCatSlug(cat.slug);
        setCatTagline(cat.tagline);
        setCatDescription(cat.description);
        setCatCoverImage(cat.coverImage);
        setCatFeatured(cat.featured);
        setCatSpecsText((cat.specHighlights || []).join(", "));
        setCatSlideshowSpeedMs(cat.slideshowSpeedMs || 4500);
        setCatHeroTheme(normalizeHeroTheme(cat.heroTheme, DEFAULT_HERO_THEME));
        setCatHeroSlides(
          cat.heroSlides?.length
            ? cat.heroSlides
            : createDefaultCategorySlides(cat.name, cat.tagline, cat.coverImage)
        );
      } else {
        const defaultCover =
          PRODUCT_ASSET_PRESETS[categories.length % PRODUCT_ASSET_PRESETS.length]
            .url;
        setEditingId(null);
        setCatName("");
        setCatSlug("");
        setCatTagline("");
        setCatDescription("");
        setCatCoverImage(defaultCover);
        setCatFeatured(true);
        setCatSpecsText("20mm Sightlines, Marine Powder Coat, Site Tested");
        setCatSlideshowSpeedMs(4500);
        setCatHeroTheme(
          normalizeHeroTheme(landingCms.heroTheme, DEFAULT_HERO_THEME)
        );
        setCatHeroSlides([
          {
            id: `new-cat-s1-${Date.now()}`,
            headline: "Architectural Category Series",
            subheadline:
              "Precision aluminium and laminated glass fabricated to exact site dimensions.",
            image: defaultCover,
          },
        ]);
      }
      setEditorOpen(true);
      if (scrollToColors) {
        setTimeout(() => {
          document
            .getElementById("cat-hero-color-studio")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
      }
    },
    [categories.length, landingCms.heroTheme]
  );

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "slideshow" ||
      requestedTab === "categories" ||
      requestedTab === "whychoose"
    ) {
      setActiveTab(requestedTab);
    }
    const editParam = searchParams.get("edit");
    if (!editParam) {
      handledEditParamRef.current = null;
      return;
    }
    if (handledEditParamRef.current !== editParam && categories.length > 0) {
      const match = categories.find(
        (c) => c.CategoryID === editParam || c.slug === editParam
      );
      if (match) {
        handledEditParamRef.current = editParam;
        openCategoryEditor(match);
      }
    }
  }, [searchParams, categories, openCategoryEditor]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url || data.url) {
        return data.secure_url || data.url;
      }
    } catch {
      // Fallback to FileReader below
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        resolve(typeof e.target?.result === "string" ? e.target.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (
    file: File,
    key: string,
    onDone: (url: string) => void
  ) => {
    setUploadingKey(key);
    const url = await uploadImageFile(file);
    if (url) {
      onDone(url);
      message.success("Image uploaded.");
    } else {
      message.error("Could not upload image.");
    }
    setUploadingKey(null);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      message.warning("Please enter a category name.");
      return;
    }

    const cleanedSlides = (
      catHeroSlides.length > 0
        ? catHeroSlides
        : createDefaultCategorySlides(catName.trim(), catTagline.trim(), catCoverImage)
    ).map((s, idx) => {
      const rawHeadline = s.headline.trim();
      const resolvedHeadline =
        !rawHeadline || rawHeadline === "Architectural Category Series"
          ? idx === 0
            ? `${catName.trim()} Architectural Series`
            : `${catName.trim()} Collection ${idx + 1}`
          : rawHeadline;
      return {
        id: s.id || `cat-slide-${Date.now()}-${idx}`,
        headline: resolvedHeadline,
        subheadline:
          s.subheadline.trim() ||
          catTagline.trim() ||
          "Engineered architectural aluminium and glazing suite.",
        image: s.image.trim() || catCoverImage || PRODUCT_ASSET_PRESETS[0].url,
      };
    });

    const payload = {
      name: catName.trim(),
      slug: slugifyCategoryName(catSlug.trim() || catName.trim()),
      tagline:
        catTagline.trim() ||
        "Precision-engineered architectural aluminium systems.",
      description:
        catDescription.trim() ||
        "Fabricated from structural aluminium alloys with weather-tight architectural sealing.",
      coverImage: catCoverImage.trim() || PRODUCT_ASSET_PRESETS[0].url,
      featured: catFeatured,
      slideshowSpeedMs: clampSlideshowSpeedMs(catSlideshowSpeedMs, 4500),
      heroSlides: cleanedSlides,
      heroTheme: normalizeHeroTheme(catHeroTheme, DEFAULT_HERO_THEME),
      specHighlights: catSpecsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      setSavingCategory(true);
      if (editingId) {
        await AxiosConfig.put(`/products/categories/${editingId}`, payload);
        message.success(`Category "${payload.name}" updated.`);
      } else {
        await AxiosConfig.post("/products/categories", payload);
        message.success(`Category "${payload.name}" added.`);
      }
      setEditorOpen(false);
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("Failed to save product category.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleApplyThemeToAllCategories = async (theme: HeroThemeConfig) => {
    try {
      setApplyingAllCategories(true);
      const clean = normalizeHeroTheme(theme, DEFAULT_HERO_THEME);
      await AxiosConfig.put("/products/categories/apply-theme", { theme: clean });
      setCatHeroTheme(clean);
      message.success(
        `Applied color theme to all ${categories.length} product categories.`
      );
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("Could not apply colors across all categories.");
    } finally {
      setApplyingAllCategories(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    try {
      await AxiosConfig.delete(`/products/categories/${categoryId}`);
      message.success(`Category "${name}" deleted.`);
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("At least one active category must remain.");
    }
  };

  const handleReorderCategory = async (idx: number, direction: -1 | 1) => {
    const nextList = moveArrayItem(categories, idx, direction);
    setCategories(nextList);
    try {
      await AxiosConfig.put("/products/categories/reorder", {
        orderedIds: nextList.map((c) => c.CategoryID),
      });
      message.success("Category display order saved.");
    } catch {
      await fetchAllProductCms();
    }
  };

  const handleSaveLandingSlideshow = async () => {
    try {
      setSavingLanding(true);
      const cleaned = normalizeProductLandingCms(landingCms);
      await AxiosConfig.put("/products/cms", { landing: cleaned });
      message.success("Product landing slideshow & headings published!");
      setRefreshTick((t) => t + 1);
      await fetchAllProductCms();
    } catch {
      message.error("Failed to save product landing slideshow.");
    } finally {
      setSavingLanding(false);
    }
  };

  const activeLandingSlide =
    landingCms.heroSlides[previewSlideIdx] || landingCms.heroSlides[0];
  const landingSpeedSec = Number((landingCms.slideshowSpeedMs / 1000).toFixed(1));
  const catSpeedSec = Number((catSlideshowSpeedMs / 1000).toFixed(1));
  const totalCategorySlides = categories.reduce(
    (acc, c) => acc + (c.heroSlides?.length || 1),
    0
  );

  return (
    <AdminPortalShell
      sectionTitle="Categories"
      refreshTrigger={refreshTick}
      stats={[
        { label: "Categories", value: categories.length, tone: "navy" },
        { label: "Main", value: landingCms.heroSlides.length },
        { label: "Slides", value: totalCategorySlides },
        { label: "Highlights", value: landingCms.whyChooseUs.length, tone: "green" },
      ]}
      actions={[
        {
          label: "Store",
          icon: <EyeOutlined />,
          onClick: () => navigate("/products"),
        },
        {
          label: "Designs",
          onClick: () => navigate("/ViewAllDesigns"),
        },
      ]}
      primaryAction={
        activeTab === "categories"
          ? {
              label: "Add",
              icon: <PlusOutlined />,
              onClick: () => openCategoryEditor(),
            }
          : {
              label: savingLanding ? "Saving..." : "Publish",
              icon: <SaveOutlined />,
              loading: savingLanding,
              onClick: handleSaveLandingSlideshow,
            }
      }
    >
      <Spin spinning={loading}>
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Category sections"
          className="flex flex-wrap items-center gap-2 pb-4 mb-5 border-b border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "categories"}
            onClick={() => setActiveTab("categories")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-[#22577A] text-white border-[#22577A]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Categories
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "slideshow"}
            onClick={() => setActiveTab("slideshow")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "slideshow"
                ? "bg-[#22577A] text-white border-[#22577A]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Slideshow
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "whychoose"}
            onClick={() => setActiveTab("whychoose")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "whychoose"
                ? "bg-[#22577A] text-white border-[#22577A]"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
            }`}
          >
            Highlights
          </button>
        </div>

        {/* TAB 1: Categories */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Categories
              </h2>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCategoryEditor()}
                style={{ background: "#22577A", borderColor: "#22577A" }}
              >
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.CategoryID}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={cat.coverImage}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-medium text-[#22577A]">
                          /products/category/{cat.slug}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        {cat.tagline}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-1 tabular-nums">
                        <span>
                          {cat.heroSlides?.length || 1} category{" "}
                          {(cat.heroSlides?.length || 1) === 1 ? "slide" : "slides"} ·{" "}
                          {((cat.slideshowSpeedMs || 4500) / 1000).toFixed(1)}s auto-change
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                            style={{ background: buildCategoryAccentFillCss(cat.heroTheme) }}
                          />
                          <span>{describeHeroThemeSummary(cat.heroTheme)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={idx === 0}
                      aria-label={`Move ${cat.name} Up`}
                      onClick={() => handleReorderCategory(idx, -1)}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={idx === categories.length - 1}
                      aria-label={`Move ${cat.name} Down`}
                      onClick={() => handleReorderCategory(idx, 1)}
                    />
                    <Button
                      size="small"
                      icon={<BgColorsOutlined />}
                      aria-label={`Edit ${cat.name} Colors`}
                      onClick={() => openCategoryEditor(cat, true)}
                    >
                      Colors
                    </Button>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/products/category/${cat.slug}`)}
                    >
                      Landing
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => openCategoryEditor(cat)}
                      style={{ background: "#22577A", borderColor: "#22577A" }}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title={`Delete "${cat.name}" category?`}
                      description="This removes the category card and its landing route."
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => handleDeleteCategory(cat.CategoryID, cat.name)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={categories.length <= 1}
                        aria-label={`Delete ${cat.name}`}
                      />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Slideshow */}
        {activeTab === "slideshow" && (
          <div className="space-y-4">
            {activeLandingSlide && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <EyeOutlined className="text-[#3393B8]" />
                    <span className="text-xs font-bold text-slate-900">
                      Preview
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      ({previewSlideIdx + 1}/{landingCms.heroSlides.length} · {landingSpeedSec}s)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Preview Previous Slide"
                      onClick={() =>
                        setPreviewSlideIdx((prev) =>
                          getPrevSlideIndex(prev, landingCms.heroSlides.length)
                        )
                      }
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                    >
                      <LeftOutlined className="text-[10px]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Preview Next Slide"
                      onClick={() =>
                        setPreviewSlideIdx((prev) =>
                          getNextSlideIndex(prev, landingCms.heroSlides.length)
                        )
                      }
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                    >
                      <RightOutlined className="text-[10px]" />
                    </button>
                  </div>
                </div>

                <div
                  style={{ background: buildHeroBackgroundCss(landingCms.heroTheme) }}
                  className="relative rounded-xl overflow-hidden pt-4 text-center border border-slate-100"
                >
                  <h4
                    style={{
                      color:
                        landingCms.heroTheme?.headlineColor ||
                        DEFAULT_HERO_THEME.headlineColor,
                    }}
                    className="px-3 text-sm font-semibold leading-snug"
                  >
                    {activeLandingSlide.headline}
                  </h4>
                  <p
                    style={{
                      color:
                        landingCms.heroTheme?.subheadlineColor ||
                        DEFAULT_HERO_THEME.subheadlineColor,
                    }}
                    className="px-3 mt-1 text-[11px] line-clamp-2"
                  >
                    {activeLandingSlide.subheadline}
                  </p>
                  <img
                    src={activeLandingSlide.image}
                    alt={activeLandingSlide.headline}
                    referrerPolicy="no-referrer"
                    style={{
                      maskImage:
                        buildHeroImageMaskCss(landingCms.heroTheme) === "none"
                          ? undefined
                          : buildHeroImageMaskCss(landingCms.heroTheme),
                      WebkitMaskImage:
                        buildHeroImageMaskCss(landingCms.heroTheme) === "none"
                          ? undefined
                          : buildHeroImageMaskCss(landingCms.heroTheme),
                    }}
                    className="w-full h-36 object-cover mt-1 block"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-[#22577A]">
                  Speed
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="product-landing-speed"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Interval
                  </label>
                  <InputNumber
                    id="product-landing-speed"
                    min={1.5}
                    max={20}
                    step={0.5}
                    value={landingSpeedSec}
                    onChange={(val) => {
                      if (typeof val === "number") {
                        setLandingCms((prev) => ({
                          ...prev,
                          slideshowSpeedMs: clampSlideshowSpeedMs(val * 1000),
                        }));
                      }
                    }}
                    style={{ width: 90 }}
                  />
                </div>
              </div>

              <Slider
                min={1.5}
                max={15}
                step={0.5}
                value={landingSpeedSec}
                onChange={(val) =>
                  setLandingCms((prev) => ({
                    ...prev,
                    slideshowSpeedMs: clampSlideshowSpeedMs(val * 1000),
                  }))
                }
              />

              <div className="flex flex-wrap items-center gap-2">
                {SPEED_PRESETS.map((preset) => {
                  const isActive = landingCms.slideshowSpeedMs === preset.ms;
                  return (
                    <button
                      key={preset.ms}
                      type="button"
                      onClick={() =>
                        setLandingCms((prev) => ({
                          ...prev,
                          slideshowSpeedMs: preset.ms,
                        }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#3393B8] text-white border-[#3393B8]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#3393B8]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categories Section Title
                </label>
                <Input
                  value={landingCms.categoriesHeading}
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      categoriesHeading: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Why Choose Us Title
                </label>
                <Input
                  value={landingCms.whyChooseHeading}
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      whyChooseHeading: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <HeroThemeEditor
              value={landingCms.heroTheme}
              onChange={(nextTheme) =>
                setLandingCms((prev) => ({ ...prev, heroTheme: nextTheme }))
              }
              title="Colors"
              previewHeadline={activeLandingSlide?.headline || "Aluminium & Glazing Systems"}
              previewSubheadline="Aluminium & Glazing Systems"
              previewImage={activeLandingSlide?.image || "/assets/products/hero-showroom.jpg"}
              copySources={[
                { id: "about-hero", label: "About", theme: aboutHeroTheme },
                ...categories.map((cat) => ({
                  id: `cat-${cat.CategoryID}`,
                  label: cat.name,
                  theme: normalizeHeroTheme(cat.heroTheme, DEFAULT_HERO_THEME),
                })),
              ]}
              onApplyToAll={handleApplyThemeToAllCategories}
              applyToAllLabel="Apply"
              applyingToAll={applyingAllCategories}
            />

            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                Slides
              </span>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextIdx = landingCms.heroSlides.length + 1;
                  const preset =
                    PRODUCT_ASSET_PRESETS[nextIdx % PRODUCT_ASSET_PRESETS.length];
                  setLandingCms((prev) => ({
                    ...prev,
                    heroSlides: [
                      ...prev.heroSlides,
                      {
                        id: `prod-slide-${Date.now()}`,
                        headline: `Architectural Product Series ${nextIdx}`,
                        subheadline:
                          "Precision extruded aluminium framing paired with solar low-E glazing.",
                        image: preset.url,
                      },
                    ],
                  }));
                  setPreviewSlideIdx(landingCms.heroSlides.length);
                }}
              >
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {landingCms.heroSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      Slide {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: moveArrayItem(prev.heroSlides, idx, -1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === landingCms.heroSlides.length - 1}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: moveArrayItem(prev.heroSlides, idx, 1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={landingCms.heroSlides.length <= 1}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: prev.heroSlides.filter((s) => s.id !== slide.id),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline
                    </label>
                    <Input
                      value={slide.headline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, headline: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subheadline
                    </label>
                    <Input.TextArea
                      rows={2}
                      value={slide.subheadline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, subheadline: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slide Image URL
                    </label>
                    <Input
                      value={slide.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLandingCms((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, image: val } : s
                          ),
                        }));
                        setPreviewSlideIdx(idx);
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-medium cursor-pointer hover:border-[#22577A]">
                      <UploadOutlined />
                      <span>
                        {uploadingKey === slide.id ? "Uploading..." : "Upload Photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpload(e.target.files[0], slide.id, (url) => {
                              setLandingCms((prev) => ({
                                ...prev,
                                heroSlides: prev.heroSlides.map((s) =>
                                  s.id === slide.id ? { ...s, image: url } : s
                                ),
                              }));
                            });
                          }
                        }}
                      />
                    </label>
                    {PRODUCT_ASSET_PRESETS.slice(0, 6).map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setLandingCms((prev) => ({
                            ...prev,
                            heroSlides: prev.heroSlides.map((s) =>
                              s.id === slide.id ? { ...s, image: preset.url } : s
                            ),
                          }));
                          setPreviewSlideIdx(idx);
                        }}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] font-medium cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                block
                loading={savingLanding}
                icon={<SaveOutlined />}
                onClick={handleSaveLandingSlideshow}
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  fontWeight: 600,
                }}
              >
                Publish
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: Highlights */}
        {activeTab === "whychoose" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="why-choose-heading-input"
                  className="block text-xs font-bold text-[#22577A] mb-1"
                >
                  Heading
                </label>
                <Input
                  id="why-choose-heading-input"
                  value={landingCms.whyChooseHeading}
                  placeholder="Highlights"
                  onChange={(e) =>
                    setLandingCms((prev) => ({
                      ...prev,
                      whyChooseHeading: e.target.value,
                    }))
                  }
                />
              </div>

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextNum = landingCms.whyChooseUs.length + 1;
                  setLandingCms((prev) => ({
                    ...prev,
                    whyChooseUs: [
                      ...prev.whyChooseUs,
                      {
                        id: `why-${Date.now()}`,
                        metric: "100%",
                        title: `Engineering Point ${nextNum}`,
                        percent: 90,
                        icon: "craft",
                        accent: "blue",
                      },
                    ],
                  }));
                }}
              >
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {landingCms.whyChooseUs.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Infographic Item {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0}
                        aria-label={`Move ${item.title} Up`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: moveArrayItem(prev.whyChooseUs, idx, -1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === landingCms.whyChooseUs.length - 1}
                        aria-label={`Move ${item.title} Down`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: moveArrayItem(prev.whyChooseUs, idx, 1),
                          }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={landingCms.whyChooseUs.length <= 1}
                        aria-label={`Delete ${item.title}`}
                        onClick={() =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.filter(
                              (w) => w.id !== item.id
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label
                        htmlFor={`why-metric-${item.id}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Key Metric / Value
                      </label>
                      <Input
                        id={`why-metric-${item.id}`}
                        value={item.metric}
                        placeholder="20 mm"
                        onChange={(e) => {
                          const val = e.target.value;
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, metric: val } : w
                            ),
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`why-title-${item.id}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Simple Short Title
                      </label>
                      <Input
                        id={`why-title-${item.id}`}
                        value={item.title}
                        placeholder="Slim Sightlines"
                        onChange={(e) => {
                          const val = e.target.value;
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, title: val } : w
                            ),
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Infographic Icon
                      </label>
                      <Select
                        value={item.icon}
                        style={{ width: "100%" }}
                        onChange={(val: WhyChooseIcon) =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, icon: val } : w
                            ),
                          }))
                        }
                        options={[
                          { label: "Precision Compass", value: "precision" },
                          { label: "Warranty Shield", value: "shield" },
                          { label: "Acoustic Seal", value: "acoustic" },
                          { label: "Weather Proof", value: "weather" },
                          { label: "Award Craft", value: "craft" },
                          { label: "On-Time Delivery", value: "speed" },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Ring Accent Color
                      </label>
                      <Select
                        value={item.accent}
                        style={{ width: "100%" }}
                        onChange={(val: WhyChooseAccent) =>
                          setLandingCms((prev) => ({
                            ...prev,
                            whyChooseUs: prev.whyChooseUs.map((w) =>
                              w.id === item.id ? { ...w, accent: val } : w
                            ),
                          }))
                        }
                        options={[
                          { label: "Brand Navy (#22577A)", value: "navy" },
                          { label: "Ocean Blue (#3393B8)", value: "blue" },
                          { label: "Sky Cyan (#5CB6D2)", value: "cyan" },
                          { label: "Signal Red (#E60000)", value: "red" },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>Infographic Ring Fill</span>
                      <span className="tabular-nums text-[#22577A]">
                        {item.percent}%
                      </span>
                    </div>
                    <Slider
                      min={15}
                      max={100}
                      step={1}
                      value={item.percent}
                      onChange={(val) =>
                        setLandingCms((prev) => ({
                          ...prev,
                          whyChooseUs: prev.whyChooseUs.map((w) =>
                            w.id === item.id ? { ...w, percent: val } : w
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                block
                loading={savingLanding}
                icon={<SaveOutlined />}
                onClick={handleSaveLandingSlideshow}
                style={{
                  background: "#22577A",
                  borderColor: "#22577A",
                  fontWeight: 600,
                }}
              >
                Publish
              </Button>
            </div>
          </div>
        )}
      </Spin>

      {/* Category Modal */}
      <Modal
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        width={780}
        centered
        title={
          <span className="font-bold text-slate-900">
            {editingId ? catName || "Category" : "Category"}
          </span>
        }
        footer={[
          <Button key="cancel" onClick={() => setEditorOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={savingCategory}
            icon={<SaveOutlined />}
            onClick={handleSaveCategory}
            style={{ background: "#22577A", borderColor: "#22577A" }}
          >
            Save
          </Button>,
        ]}
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cat-name-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Name
              </label>
              <Input
                id="cat-name-input"
                value={catName}
                placeholder="Name"
                onChange={(e) => {
                  const val = e.target.value;
                  setCatName(val);
                  if (!editingId) {
                    setCatSlug(slugifyCategoryName(val));
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cat-slug-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Slug
              </label>
              <Input
                id="cat-slug-input"
                value={catSlug}
                placeholder="slug"
                onChange={(e) => setCatSlug(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="cat-tagline-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Tagline
            </label>
            <Input
              id="cat-tagline-input"
              value={catTagline}
              placeholder="Tagline"
              onChange={(e) => setCatTagline(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="cat-desc-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Description
            </label>
            <Input.TextArea
              id="cat-desc-input"
              rows={2}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cat-specs-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Specs
              </label>
              <Input
                id="cat-specs-input"
                value={catSpecsText}
                onChange={(e) => setCatSpecsText(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-1.5 gap-3">
              <Switch checked={catFeatured} onChange={setCatFeatured} />
              <span className="text-xs font-semibold text-slate-700">Featured</span>
            </div>
          </div>

          {/* Image */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700">
              Image
            </label>
            <div className="flex items-center gap-3">
              <img
                src={catCoverImage}
                alt="Cover"
                referrerPolicy="no-referrer"
                className="w-20 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <Input
                value={catCoverImage}
                onChange={(e) => setCatCoverImage(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-[11px] font-medium cursor-pointer">
                <UploadOutlined />
                <span>
                  {uploadingKey === "cat-cover" ? "Uploading..." : "Upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUpload(e.target.files[0], "cat-cover", (url) =>
                        setCatCoverImage(url)
                      );
                    }
                  }}
                />
              </label>
              {PRODUCT_ASSET_PRESETS.slice(0, 8).map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setCatCoverImage(preset.url)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slideshow */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-[#22577A]">
                Slideshow ({catHeroSlides.length} · {catSpeedSec}s)
              </div>
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const nextNum = catHeroSlides.length + 1;
                  setCatHeroSlides((prev) => [
                    ...prev,
                    {
                      id: `cat-slide-${Date.now()}-${nextNum}`,
                      headline: `${catName || "Category"} Feature ${nextNum}`,
                      subheadline:
                        catTagline ||
                        "Precision engineered aluminium systems built to order.",
                      image:
                        PRODUCT_ASSET_PRESETS[nextNum % PRODUCT_ASSET_PRESETS.length]
                          .url,
                    },
                  ]);
                }}
              >
                Add
              </Button>
            </div>

            <Slider
              min={1.5}
              max={15}
              step={0.5}
              value={catSpeedSec}
              onChange={(val) =>
                setCatSlideshowSpeedMs(clampSlideshowSpeedMs(val * 1000))
              }
            />

            <div className="space-y-3">
              {catHeroSlides.map((slide, sIdx) => (
                <div
                  key={slide.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Slide {sIdx + 1}
                    </span>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={catHeroSlides.length <= 1}
                      onClick={() =>
                        setCatHeroSlides((prev) =>
                          prev.filter((item) => item.id !== slide.id)
                        )
                      }
                    />
                  </div>
                  <Input
                    size="small"
                    placeholder="Headline"
                    value={slide.headline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCatHeroSlides((prev) =>
                        prev.map((item) =>
                          item.id === slide.id ? { ...item, headline: val } : item
                        )
                      );
                    }}
                  />
                  <Input
                    size="small"
                    placeholder="Subtitle"
                    value={slide.subheadline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCatHeroSlides((prev) =>
                        prev.map((item) =>
                          item.id === slide.id ? { ...item, subheadline: val } : item
                        )
                      );
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      size="small"
                      placeholder="Image"
                      value={slide.image}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCatHeroSlides((prev) =>
                          prev.map((item) =>
                            item.id === slide.id ? { ...item, image: val } : item
                          )
                        );
                      }}
                    />
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-dashed border-slate-300 text-[11px] cursor-pointer shrink-0">
                      <UploadOutlined />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUpload(e.target.files[0], slide.id, (url) => {
                              setCatHeroSlides((prev) =>
                                prev.map((item) =>
                                  item.id === slide.id ? { ...item, image: url } : item
                                )
                              );
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div id="cat-hero-color-studio">
            <HeroThemeEditor
              value={catHeroTheme}
              onChange={setCatHeroTheme}
              title="Colors"
              previewHeadline={
                catHeroSlides[0]?.headline || `${catName || "Category"} Systems`
              }
              previewSubheadline={
                catTagline || "Custom engineered architectural aluminium & glazing."
              }
              previewImage={
                catHeroSlides[0]?.image ||
                catCoverImage ||
                "/assets/products/hero-showroom.jpg"
              }
              copySources={
                [
                  {
                    id: "prod-landing",
                    label: "Products",
                    theme: normalizeHeroTheme(
                      landingCms.heroTheme,
                      DEFAULT_HERO_THEME
                    ),
                  },
                  {
                    id: "about-hero",
                    label: "About",
                    theme: aboutHeroTheme,
                  },
                  ...categories
                    .filter((c) => c.CategoryID !== editingId)
                    .map((c) => ({
                      id: `cat-${c.CategoryID}`,
                      label: c.name,
                      theme: normalizeHeroTheme(c.heroTheme, DEFAULT_HERO_THEME),
                    })),
                ] as HeroThemeCopySource[]
              }
              onApplyToAll={handleApplyThemeToAllCategories}
              applyToAllLabel="Apply"
              applyingToAll={applyingAllCategories}
              compact
            />
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}
