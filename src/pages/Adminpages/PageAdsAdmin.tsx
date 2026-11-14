import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Spin,
  Switch,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import PageAdBannerSlideshow from "../../components/PageAdBannerSlideshow";
import {
  AD_ASSET_PRESETS,
  AD_PAGE_DEFINITIONS,
  AD_SPEED_PRESETS,
  DEFAULT_PAGE_ADS_CMS,
  clampSlideshowSpeedMs,
  countActiveAndPausedAds,
  isValidAdPageKey,
  moveArrayItemToIndex,
  normalizePageAdButtons,
  normalizePageAdsCms,
  normalizeSinglePageAdsConfig,
  type AdPageKey,
  type PageAdButton,
  type PageAdSlide,
  type PageAdsCmsPayload,
  type PageAdsConfig,
} from "../../utils/pageAdsHelpers";

export default function PageAdsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPageParam = searchParams.get("page");
  const [activePageKey, setActivePageKey] = useState<AdPageKey>(() =>
    isValidAdPageKey(initialPageParam) ? initialPageParam : "products"
  );

  const [cms, setCms] = useState<PageAdsCmsPayload>(DEFAULT_PAGE_ADS_CMS);
  const [msgApi, msgContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewResetTick, setPreviewResetTick] = useState(0);
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);

  // Add / Edit Advertisement Modal State
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftImage, setDraftImage] = useState(AD_ASSET_PRESETS[0].url);
  const [draftLinkUrl, setDraftLinkUrl] = useState("#/products");
  const [draftPaused, setDraftPaused] = useState(false);
  const [draftButtons, setDraftButtons] = useState<PageAdButton[]>([]);
  const [savingModalAd, setSavingModalAd] = useState(false);

  const fetchAdsCms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get("/ads/cms");
      const rawCms = res.data?.pages ? res.data : res.data?.data;
      if (rawCms?.pages) {
        setCms(normalizePageAdsCms(rawCms));
      }
    } catch {
      msgApi.error("Could not load page advertisement configuration.");
    } finally {
      setLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    fetchAdsCms();
  }, [fetchAdsCms]);

  useEffect(() => {
    const param = searchParams.get("page");
    if (isValidAdPageKey(param)) {
      setActivePageKey(param);
    }
  }, [searchParams]);

  const activeConfig: PageAdsConfig = cms.pages[activePageKey];
  const activeDef = useMemo(
    () =>
      AD_PAGE_DEFINITIONS.find((d) => d.pageKey === activePageKey) ||
      AD_PAGE_DEFINITIONS[0],
    [activePageKey]
  );

  const totalPublishedAds = useMemo(
    () =>
      AD_PAGE_DEFINITIONS.reduce(
        (sum, def) => sum + (cms.pages[def.pageKey]?.ads?.length || 0),
        0
      ),
    [cms]
  );

  const enabledPageCount = useMemo(
    () =>
      AD_PAGE_DEFINITIONS.filter(
        (def) =>
          cms.pages[def.pageKey]?.enabled &&
          (cms.pages[def.pageKey]?.ads?.length || 0) > 0
      ).length,
    [cms]
  );

  const { activeCount: activePageAdCount, pausedCount: pausedPageAdCount } =
    useMemo(() => countActiveAndPausedAds(activeConfig.ads), [activeConfig.ads]);

  const updateActivePageConfig = (
    updater: (prev: PageAdsConfig) => PageAdsConfig
  ) => {
    setCms((prev) => ({
      pages: {
        ...prev.pages,
        [activePageKey]: updater(prev.pages[activePageKey]),
      },
    }));
  };

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
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const openAddAdModal = () => {
    const preset =
      AD_ASSET_PRESETS[activeConfig.ads.length % AD_ASSET_PRESETS.length];
    setEditingAdId(null);
    setDraftTitle(`${activeDef.label} Promotion ${activeConfig.ads.length + 1}`);
    setDraftImage(preset.url);
    setDraftLinkUrl("#/products");
    setDraftPaused(false);
    setDraftButtons([
      {
        id: `btn-${Date.now()}`,
        label: "Explore Offer",
        url: "#/products",
      },
    ]);
    setAdModalOpen(true);
  };

  const openEditAdModal = (ad: PageAdSlide) => {
    setEditingAdId(ad.id);
    setDraftTitle(ad.title || "");
    setDraftImage(ad.image || "");
    setDraftLinkUrl(ad.linkUrl || "");
    setDraftPaused(Boolean(ad.paused));
    setDraftButtons(
      Array.isArray(ad.buttons) ? ad.buttons.map((b) => ({ ...b })) : []
    );
    setAdModalOpen(true);
  };

  const handleSaveAdModal = async () => {
    if (!draftImage.trim()) {
      msgApi.error("Please upload or provide an advertisement image.");
      return;
    }
    try {
      setSavingModalAd(true);
      const payload = {
        title: draftTitle.trim() || `${activeDef.label} Promotion`,
        image: draftImage.trim(),
        linkUrl: draftLinkUrl.trim(),
        paused: draftPaused,
        buttons: normalizePageAdButtons(draftButtons),
      };

      if (editingAdId) {
        const res = await AxiosConfig.put(
          `/ads/cms/${encodeURIComponent(activePageKey)}/ads/${encodeURIComponent(
            editingAdId
          )}`,
          payload
        );
        const updatedPage = res.data?.page || res.data?.data;
        if (updatedPage) {
          setCms((prev) => ({
            pages: {
              ...prev.pages,
              [activePageKey]: normalizeSinglePageAdsConfig(
                updatedPage,
                activePageKey
              ),
            },
          }));
        }
        msgApi.success("Advertisement updated!");
      } else {
        const res = await AxiosConfig.post(
          `/ads/cms/${encodeURIComponent(activePageKey)}/ads`,
          payload
        );
        const createdPage = res.data?.page || res.data?.data;
        if (createdPage) {
          setCms((prev) => ({
            pages: {
              ...prev.pages,
              [activePageKey]: normalizeSinglePageAdsConfig(
                createdPage,
                activePageKey
              ),
            },
          }));
        }
        msgApi.success("New advertisement added!");
      }
      setAdModalOpen(false);
    } catch {
      msgApi.error(
        editingAdId ? "Failed to update advertisement." : "Failed to add advertisement."
      );
    } finally {
      setSavingModalAd(false);
    }
  };

  const handleUploadSlideImage = async (
    slideId: string,
    file: File | undefined
  ) => {
    if (!file) return;
    setUploadingKey(slideId);
    const url = await uploadImageFile(file);
    setUploadingKey(null);
    if (!url) {
      msgApi.error("Image upload failed.");
      return;
    }
    if (slideId === "modal-draft") {
      setDraftImage(url);
      msgApi.success("Advertisement image ready.");
      return;
    }
    updateActivePageConfig((prev) => ({
      ...prev,
      ads: prev.ads.map((ad) =>
        ad.id === slideId ? { ...ad, image: url } : ad
      ),
    }));
    msgApi.success("Advertisement image updated in draft.");
  };

  const handleBulkUploadAds = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingKey("bulk-ad-upload");
    const createdAds: PageAdSlide[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const url = await uploadImageFile(file);
      if (url) {
        const cleanTitle = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim();
        createdAds.push({
          id: `ad-${activePageKey}-${Date.now()}-${i}`,
          image: url,
          title:
            cleanTitle ||
            `Advertisement ${(activeConfig.ads.length || 0) + i + 1}`,
          linkUrl: "#/products",
          buttons: [
            {
              id: `btn-bulk-${Date.now()}-${i}`,
              label: "Explore Offer",
              url: "#/products",
            },
          ],
        });
      }
    }

    setUploadingKey(null);
    if (createdAds.length === 0) {
      msgApi.error("No images could be uploaded.");
      return;
    }

    const nextConfig: PageAdsConfig = {
      ...activeConfig,
      enabled: true,
      ads: [...activeConfig.ads, ...createdAds],
    };

    try {
      const res = await AxiosConfig.put(
        `/ads/cms/${encodeURIComponent(activePageKey)}`,
        normalizeSinglePageAdsConfig(nextConfig, activePageKey)
      );
      const bulkPage = res.data?.page || res.data?.data;
      if (bulkPage) {
        setCms((prev) => ({
          pages: {
            ...prev.pages,
            [activePageKey]: normalizeSinglePageAdsConfig(
              bulkPage,
              activePageKey
            ),
          },
        }));
      }
      msgApi.success(
        `Published ${createdAds.length} advertisement ${
          createdAds.length === 1 ? "image" : "images"
        }.`
      );
    } catch {
      updateActivePageConfig(() => nextConfig);
      msgApi.warning("Uploaded to draft — click Save to persist.");
    }
  };

  const handleDeleteAd = async (slideId: string) => {
    try {
      const res = await AxiosConfig.delete(
        `/ads/cms/${encodeURIComponent(activePageKey)}/ads/${encodeURIComponent(
          slideId
        )}`
      );
      const deletedPage = res.data?.page || res.data?.data;
      if (deletedPage) {
        setCms((prev) => ({
          pages: {
            ...prev.pages,
            [activePageKey]: normalizeSinglePageAdsConfig(
              deletedPage,
              activePageKey
            ),
          },
        }));
      }
      msgApi.success("Advertisement deleted.");
    } catch {
      updateActivePageConfig((prev) => ({
        ...prev,
        ads: prev.ads.filter((ad) => ad.id !== slideId),
      }));
      msgApi.success("Advertisement removed from draft.");
    }
  };

  const handleTogglePauseAd = async (slide: PageAdSlide) => {
    const nextPaused = !slide.paused;
    try {
      const res = await AxiosConfig.put(
        `/ads/cms/${encodeURIComponent(activePageKey)}/ads/${encodeURIComponent(
          slide.id
        )}`,
        {
          ...slide,
          paused: nextPaused,
        }
      );
      const toggledPage = res.data?.page || res.data?.data;
      if (toggledPage) {
        setCms((prev) => ({
          pages: {
            ...prev.pages,
            [activePageKey]: normalizeSinglePageAdsConfig(
              toggledPage,
              activePageKey
            ),
          },
        }));
      }
      msgApi.success(
        nextPaused
          ? "Advertisement paused (hidden from public popup)."
          : "Advertisement resumed and live in popup."
      );
    } catch {
      updateActivePageConfig((prev) => ({
        ...prev,
        ads: prev.ads.map((ad) =>
          ad.id === slide.id ? { ...ad, paused: nextPaused } : ad
        ),
      }));
      msgApi.warning("Updated in draft — click Save to persist.");
    }
  };

  const handleAddButtonToAd = (slideId: string) => {
    updateActivePageConfig((prev) => ({
      ...prev,
      ads: prev.ads.map((ad) => {
        if (ad.id !== slideId) return ad;
        const currentButtons = Array.isArray(ad.buttons) ? ad.buttons : [];
        return {
          ...ad,
          buttons: [
            ...currentButtons,
            {
              id: `btn-${slideId}-${Date.now()}`,
              label: currentButtons.length === 0 ? "Explore Offer" : "Learn More",
              url: "#/request-quote",
            },
          ],
        };
      }),
    }));
  };

  const handleUpdateAdButton = (
    slideId: string,
    buttonId: string,
    field: "label" | "url",
    value: string
  ) => {
    updateActivePageConfig((prev) => ({
      ...prev,
      ads: prev.ads.map((ad) => {
        if (ad.id !== slideId) return ad;
        return {
          ...ad,
          buttons: (ad.buttons || []).map((btn) =>
            btn.id === buttonId ? { ...btn, [field]: value } : btn
          ),
        };
      }),
    }));
  };

  const handleDeleteAdButton = (slideId: string, buttonId: string) => {
    updateActivePageConfig((prev) => ({
      ...prev,
      ads: prev.ads.map((ad) => {
        if (ad.id !== slideId) return ad;
        return {
          ...ad,
          buttons: (ad.buttons || []).filter((btn) => btn.id !== buttonId),
        };
      }),
    }));
  };

  const handleMoveAd = (fromIdx: number, toIdx: number) => {
    updateActivePageConfig((prev) => ({
      ...prev,
      ads: moveArrayItemToIndex(prev.ads, fromIdx, toIdx),
    }));
  };

  const handleSaveActivePage = async () => {
    try {
      setSaving(true);
      const normalized = normalizeSinglePageAdsConfig(
        activeConfig,
        activePageKey
      );
      const res = await AxiosConfig.put(
        `/ads/cms/${encodeURIComponent(activePageKey)}`,
        normalized
      );
      const savedPage = res.data?.page || res.data?.data;
      if (savedPage) {
        setCms((prev) => ({
          pages: {
            ...prev.pages,
            [activePageKey]: normalizeSinglePageAdsConfig(
              savedPage,
              activePageKey
            ),
          },
        }));
      }
      msgApi.success(
        `${activeDef.label} advertisements & slideshow settings saved!`
      );
    } catch {
      msgApi.error("Failed to save page advertisements.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPage = (key: AdPageKey) => {
    setActivePageKey(key);
    setSearchParams({ page: key });
    setPreviewResetTick((t) => t + 1);
  };

  const publicPreviewHref = activeDef.routeHint
    .replace(":slug", "doors")
    .replace(":designId", "1");

  return (
    <AdminPortalShell
      sectionCode="AD-CMS"
      sectionTitle="Page Advertisement Slideshows"
      sectionSubtitle="Add, edit, pause/resume, or delete popup advertisement images and referral CTA buttons for every public page."
      kpiLabel="Published Ads"
      kpiValue={totalPublishedAds}
      kpiNote={`${enabledPageCount} of ${AD_PAGE_DEFINITIONS.length} pages active`}
      kpiStatusText={activeConfig.enabled && activePageAdCount > 0 ? "ACTIVE" : "PAUSED"}
      kpiStatusTone={activeConfig.enabled && activePageAdCount > 0 ? "green" : "navy"}
      headerAction={{
        label: `Save ${activeDef.label} Settings`,
        onClick: handleSaveActivePage,
        icon: <SaveOutlined />,
        loading: saving,
      }}
      railPrimaryAction={{
        label: "Add Advertisement",
        onClick: openAddAdModal,
        icon: <PlusOutlined />,
      }}
      bannerLeftTitle="Active Page Placement"
      bannerLeftLines={[
        { label: "Target Page", value: activeDef.label },
        {
          label: "Slide Interval",
          value: `${(activeConfig.slideshowSpeedMs / 1000).toFixed(1)}s`,
        },
        {
          label: "Popup Status",
          value: `${activePageAdCount} Active · ${pausedPageAdCount} Paused`,
        },
      ]}
      bannerRightTitle="Public Behaviour"
      bannerRightLines={[
        "Ads pop up cleanly on page entry showing only the image and action buttons.",
        "Individually paused ads stay manageable here and remain hidden from visitors.",
      ]}
    >
      {msgContextHolder}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Page Switcher Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  1. Select Target Card Page
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure separate ad slideshows and animation intervals for every card page.
                </p>
              </div>
              <a
                href={publicPreviewHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#22577A] px-3.5 py-2 text-xs font-semibold text-[#22577A] no-underline transition-colors shrink-0"
              >
                <EyeOutlined />
                <span>Open {activeDef.label} Page</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              {AD_PAGE_DEFINITIONS.map((def) => {
                const cfg = cms.pages[def.pageKey];
                const isSelected = def.pageKey === activePageKey;
                const count = cfg?.ads?.length || 0;
                return (
                  <button
                    key={def.pageKey}
                    type="button"
                    onClick={() => handleSelectPage(def.pageKey)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white border-transparent shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#3393B8] hover:bg-white"
                    }`}
                  >
                    <span>{def.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-white text-[#22577A] border border-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-Page Slideshow Speed & Enable Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. {activeDef.label} Slideshow Settings
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeDef.description}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-semibold text-slate-700">
                  Show Ads on Page
                </span>
                <Switch
                  checked={activeConfig.enabled}
                  onChange={(checked) =>
                    updateActivePageConfig((prev) => ({
                      ...prev,
                      enabled: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Automatic Slideshow Animation Time</span>
                  <span className="text-[#22577A] font-bold tabular-nums">
                    {(activeConfig.slideshowSpeedMs / 1000).toFixed(1)} seconds
                  </span>
                </div>
                <Slider
                  min={1.5}
                  max={20}
                  step={0.5}
                  value={Number(
                    (activeConfig.slideshowSpeedMs / 1000).toFixed(1)
                  )}
                  onChange={(sec) =>
                    updateActivePageConfig((prev) => ({
                      ...prev,
                      slideshowSpeedMs: clampSlideshowSpeedMs(
                        Number(sec) * 1000
                      ),
                    }))
                  }
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {AD_SPEED_PRESETS.map((preset) => {
                    const active =
                      Math.abs(activeConfig.slideshowSpeedMs - preset.ms) < 250;
                    return (
                      <button
                        key={preset.ms}
                        type="button"
                        onClick={() =>
                          updateActivePageConfig((prev) => ({
                            ...prev,
                            slideshowSpeedMs: preset.ms,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                          active
                            ? "bg-[#22577A] text-white border-[#22577A]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-[#3393B8]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Exact Delay (Seconds)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Range: 1.5s – 20s
                  </div>
                </div>
                <InputNumber
                  min={1.5}
                  max={20}
                  step={0.5}
                  value={Number(
                    (activeConfig.slideshowSpeedMs / 1000).toFixed(1)
                  )}
                  onChange={(val) =>
                    updateActivePageConfig((prev) => ({
                      ...prev,
                      slideshowSpeedMs: clampSlideshowSpeedMs(
                        (Number(val) || 4) * 1000
                      ),
                    }))
                  }
                  suffix="s"
                  style={{ width: 105 }}
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Promotion Popup Preview (Image + Buttons Only)
                </h2>
                <p className="text-xs text-slate-500">
                  Visitors see only the centered image popup with overlay referral CTA buttons, Exit (X), and{" "}
                  {(activeConfig.slideshowSpeedMs / 1000).toFixed(1)}s rotation for active slides.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeConfig.enabled && activePageAdCount > 0 && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setPopupPreviewOpen(true)}
                  >
                    Test Popup View
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => setPreviewResetTick((t) => t + 1)}
                >
                  Reset Preview
                </Button>
              </div>
            </div>

            {activeConfig.enabled && activePageAdCount > 0 ? (
              <div className="rounded-xl bg-slate-900/5 border border-slate-200/80 p-4">
                <PageAdBannerSlideshow
                  pageKey={activePageKey}
                  variant="inline"
                  overrideConfig={activeConfig}
                  resetSignal={previewResetTick}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 px-4 text-center text-xs text-slate-500">
                {!activeConfig.enabled
                  ? "Page advertisements are paused globally for this page."
                  : activeConfig.ads.length === 0
                  ? "No advertisement images added yet. Pages with zero ads stay hidden cleanly."
                  : "All advertisements on this page are currently paused individually."}
              </div>
            )}

            {popupPreviewOpen && (
              <PageAdBannerSlideshow
                pageKey={activePageKey}
                variant="popup"
                overrideConfig={activeConfig}
                onDismiss={() => setPopupPreviewOpen(false)}
              />
            )}
          </div>

          {/* Published Ads List & Add / Edit / Pause / Delete CRUD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  3. Manage Advertisements for {activeDef.label} ({activeConfig.ads.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activePageAdCount} active · {pausedPageAdCount} paused — add, edit, pause/resume, reorder slides, or delete ads.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 text-xs font-semibold text-[#22577A] cursor-pointer transition-colors">
                  <UploadOutlined />
                  <span>
                    {uploadingKey === "bulk-ad-upload"
                      ? "Publishing..."
                      : "Bulk Upload Images"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleBulkUploadAds(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddAdModal}
                >
                  Add Advertisement
                </Button>
              </div>
            </div>

            {activeConfig.ads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 px-4 text-center space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  No advertisements published for {activeDef.label}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When a page has no ads, no popup appears on the public page. Add an advertisement below to enable it.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddAdModal}
                  >
                    Add First Advertisement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConfig.ads.map((ad, idx) => (
                  <div
                    key={ad.id}
                    className={`rounded-xl border p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start transition-colors ${
                      ad.paused
                        ? "border-amber-200 bg-amber-50/35"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    {/* Image Thumbnail + Upload */}
                    <div className="lg:col-span-4 space-y-2">
                      <div className="relative w-full rounded-lg overflow-hidden bg-slate-200/75 border border-slate-200 p-2 flex items-center justify-center min-h-[120px]">
                        <img
                          src={ad.image}
                          alt={ad.title}
                          referrerPolicy="no-referrer"
                          className={`max-h-48 w-auto h-auto max-w-full object-contain rounded transition-opacity ${
                            ad.paused ? "opacity-55 grayscale-[25%]" : ""
                          }`}
                        />
                        {ad.paused && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] px-2.5 py-1.5 text-xs font-semibold text-[#22577A] cursor-pointer transition-colors">
                          <UploadOutlined />
                          <span>
                            {uploadingKey === ad.id
                              ? "Uploading..."
                              : "Upload Image"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleUploadSlideImage(ad.id, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        <Select
                          size="small"
                          style={{ minWidth: 150, flex: 1 }}
                          value={
                            AD_ASSET_PRESETS.some((p) => p.url === ad.image)
                              ? ad.image
                              : undefined
                          }
                          placeholder="Choose preset..."
                          options={AD_ASSET_PRESETS.map((p) => ({
                            label: p.label,
                            value: p.url,
                          }))}
                          onChange={(val) =>
                            updateActivePageConfig((prev) => ({
                              ...prev,
                              ads: prev.ads.map((item) =>
                                item.id === ad.id
                                  ? { ...item, image: val }
                                  : item
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Ad Metadata Inputs */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#22577A] uppercase tracking-wider">
                          Advertisement #{idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            ad.paused
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {ad.paused ? "PAUSED" : "ACTIVE"}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Ad Title / Alt Label
                        </label>
                        <Input
                          value={ad.title}
                          placeholder="e.g. Custom Glazing Promo"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActivePageConfig((prev) => ({
                              ...prev,
                              ads: prev.ads.map((item) =>
                                item.id === ad.id
                                  ? { ...item, title: val }
                                  : item
                              ),
                            }));
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Image URL
                          </label>
                          <Input
                            value={ad.image}
                            placeholder="/uploads/banner.jpg"
                            onChange={(e) => {
                              const val = e.target.value;
                              updateActivePageConfig((prev) => ({
                                ...prev,
                                ads: prev.ads.map((item) =>
                                  item.id === ad.id
                                    ? { ...item, image: val }
                                    : item
                                ),
                              }));
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Image Click Link (Optional)
                          </label>
                          <Input
                            value={ad.linkUrl || ""}
                            placeholder="#/request-quote or https://..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateActivePageConfig((prev) => ({
                                ...prev,
                                ads: prev.ads.map((item) =>
                                  item.id === ad.id
                                    ? { ...item, linkUrl: val }
                                    : item
                                ),
                              }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Promotion Referral Action Buttons */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Referral CTA Buttons ({ad.buttons?.length || 0})
                          </span>
                          <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => handleAddButtonToAd(ad.id)}
                          >
                            Add Promo Button
                          </Button>
                        </div>

                        {(ad.buttons || []).length > 0 && (
                          <div className="space-y-2">
                            {(ad.buttons || []).map((btn, btnIdx) => (
                              <div
                                key={btn.id}
                                className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)_auto] items-center gap-2 bg-white border border-slate-200 rounded-lg p-2"
                              >
                                <Input
                                  size="small"
                                  value={btn.label}
                                  placeholder={`Button ${btnIdx + 1} label`}
                                  onChange={(e) =>
                                    handleUpdateAdButton(
                                      ad.id,
                                      btn.id,
                                      "label",
                                      e.target.value
                                    )
                                  }
                                />
                                <Input
                                  size="small"
                                  value={btn.url}
                                  placeholder="Link URL (e.g. #/products/category/doors)"
                                  onChange={(e) =>
                                    handleUpdateAdButton(
                                      ad.id,
                                      btn.id,
                                      "url",
                                      e.target.value
                                    )
                                  }
                                />
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label="Remove button"
                                  onClick={() =>
                                    handleDeleteAdButton(ad.id, btn.id)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit / Pause / Reorder / Delete Actions */}
                    <div className="lg:col-span-2 flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2">
                      <Button
                        size="small"
                        type={ad.paused ? "primary" : "default"}
                        icon={
                          ad.paused ? (
                            <PlayCircleOutlined />
                          ) : (
                            <PauseCircleOutlined />
                          )
                        }
                        onClick={() => handleTogglePauseAd(ad)}
                        aria-label={
                          ad.paused
                            ? `Resume ${ad.title}`
                            : `Pause ${ad.title}`
                        }
                      >
                        {ad.paused ? "Resume" : "Pause"}
                      </Button>

                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditAdModal(ad)}
                      >
                        Edit Ad
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={idx === 0}
                          onClick={() => handleMoveAd(idx, idx - 1)}
                          aria-label="Move advertisement up"
                        />
                        <Button
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={idx === activeConfig.ads.length - 1}
                          onClick={() => handleMoveAd(idx, idx + 1)}
                          aria-label="Move advertisement down"
                        />
                      </div>

                      <Popconfirm
                        title="Delete this advertisement?"
                        okText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => handleDeleteAd(ad.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          Delete
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSaveActivePage}
              >
                Save {activeDef.label} Settings & Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Add / Edit Advertisement Modal */}
      <Modal
        open={adModalOpen}
        onCancel={() => setAdModalOpen(false)}
        title={
          <span className="font-bold text-slate-900">
            {editingAdId
              ? `Edit Advertisement (${activeDef.label})`
              : `Add Advertisement (${activeDef.label})`}
          </span>
        }
        okText={editingAdId ? "Save Changes" : "Publish Advertisement"}
        confirmLoading={savingModalAd}
        onOk={handleSaveAdModal}
        width={640}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          {/* Natural Image Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex flex-col items-center justify-center gap-2 min-h-[140px]">
            {draftImage ? (
              <img
                src={draftImage}
                alt={draftTitle || "Ad Preview"}
                className="max-h-52 w-auto h-auto max-w-full object-contain rounded"
              />
            ) : (
              <span className="text-xs text-slate-400">No image selected</span>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] cursor-pointer">
                <UploadOutlined />
                <span>
                  {uploadingKey === "modal-draft"
                    ? "Uploading..."
                    : "Upload Ad Image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadSlideImage("modal-draft", e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>

              <Select
                size="small"
                style={{ minWidth: 180 }}
                value={
                  AD_ASSET_PRESETS.some((p) => p.url === draftImage)
                    ? draftImage
                    : undefined
                }
                placeholder="Or pick architectural image..."
                options={AD_ASSET_PRESETS.map((p) => ({
                  label: p.label,
                  value: p.url,
                }))}
                onChange={(val) => setDraftImage(val)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Advertisement Title
              </label>
              <Input
                value={draftTitle}
                placeholder="e.g. Thermal Door Offer"
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Image URL
              </label>
              <Input
                value={draftImage}
                placeholder="/assets/products/door.jpg"
                onChange={(e) => setDraftImage(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Image Click Destination Link (Optional)
            </label>
            <Input
              value={draftLinkUrl}
              placeholder="#/products/category/doors or https://..."
              onChange={(e) => setDraftLinkUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Pause Advertisement
              </div>
              <div className="text-[11px] text-slate-500">
                Paused ads stay saved in Admin but are hidden from public popups.
              </div>
            </div>
            <Switch checked={draftPaused} onChange={setDraftPaused} />
          </div>

          {/* Referral Buttons inside Modal */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Referral CTA Buttons ({draftButtons.length})
              </span>
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() =>
                  setDraftButtons((prev) => [
                    ...prev,
                    {
                      id: `btn-draft-${Date.now()}`,
                      label: prev.length === 0 ? "Explore Offer" : "Get Quote",
                      url: "#/products",
                    },
                  ])
                }
              >
                Add Referral Button
              </Button>
            </div>

            {draftButtons.map((btn, idx) => (
              <div
                key={btn.id}
                className="grid grid-cols-1 sm:grid-cols-[175px_minmax(0,1fr)_auto] items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2"
              >
                <Input
                  size="small"
                  value={btn.label}
                  placeholder={`Button ${idx + 1} label`}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftButtons((prev) =>
                      prev.map((item) =>
                        item.id === btn.id ? { ...item, label: val } : item
                      )
                    );
                  }}
                />
                <Input
                  size="small"
                  value={btn.url}
                  placeholder="#/products or https://..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftButtons((prev) =>
                      prev.map((item) =>
                        item.id === btn.id ? { ...item, url: val } : item
                      )
                    );
                  }}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Remove referral button"
                  onClick={() =>
                    setDraftButtons((prev) =>
                      prev.filter((item) => item.id !== btn.id)
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}
