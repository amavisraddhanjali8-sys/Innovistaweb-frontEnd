import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { message, Popconfirm, Switch } from "antd";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiEye,
  FiFilm,
  FiImage,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import {
  DEFAULT_HOME_DESCRIPTION,
  DEFAULT_HOME_HEADLINE,
  DEFAULT_HOME_SLIDESHOW_CMS,
  HOME_MEDIA_PRESETS,
  clampHomeSlideshowSpeedMs,
  deleteHomeSlide,
  inferMediaTypeFromUrl,
  moveHomeSlide,
  normalizeHomeSlideshowCms,
  parseVideoEmbedUrl,
  toggleHomeSlideActive,
  upsertHomeSlide,
  type HomeHeroSlide,
  type HomeSlideMediaType,
  type HomeSlideshowCmsPayload,
} from "../utils/homeSlideshowHelpers";

interface HomeSlideshowEditorProps {
  onCountChange?: (count: number) => void;
}

export default function HomeSlideshowEditor({
  onCountChange,
}: HomeSlideshowEditorProps) {
  const [cms, setCms] = useState<HomeSlideshowCmsPayload>(
    DEFAULT_HOME_SLIDESHOW_CMS
  );
  const [msgApi, msgContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const msgApiRef = useRef(msgApi);
  msgApiRef.current = msgApi;

  // Add / Edit slide form state
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [draftMediaType, setDraftMediaType] =
    useState<HomeSlideMediaType>("video");
  const [draftMediaUrl, setDraftMediaUrl] = useState(
    "/assets/homeslider/showcase-architectural.mp4"
  );
  const [draftPosterUrl, setDraftPosterUrl] = useState(
    "/assets/homeslider/image1.jpg"
  );
  const [draftHeadline, setDraftHeadline] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftActive, setDraftActive] = useState(true);

  const loadSlideshowCms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get<{ data?: Partial<HomeSlideshowCmsPayload> }>(
        "/api/home-slideshow"
      );
      if (res.data?.data) {
        const normalized = normalizeHomeSlideshowCms(res.data.data);
        setCms(normalized);
        onCountChangeRef.current?.(normalized.slides.length);
      }
    } catch {
      msgApiRef.current.error("Could not load Home slideshow configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlideshowCms();
  }, [loadSlideshowCms]);

  const uploadMediaFile = async (
    file: File
  ): Promise<{ url: string; mediaType: HomeSlideMediaType } | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      const url = data.secure_url || data.url;
      if (url) {
        const resolvedType =
          data.mediaType === "video" || file.type.startsWith("video/")
            ? "video"
            : inferMediaTypeFromUrl(url);
        return { url, mediaType: resolvedType };
      }
    } catch {
      // fallback only for reasonable image sizes
    }
    if (file.type.startsWith("image/") && file.size < 4 * 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve({ url: reader.result, mediaType: "image" });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }
    return null;
  };

  const handleUploadSlideMedia = async (file: File | undefined) => {
    if (!file) return;
    setUploadingMedia(true);
    const uploaded = await uploadMediaFile(file);
    setUploadingMedia(false);
    if (!uploaded) {
      msgApi.error("File upload failed. Please try a smaller file or paste a URL.");
      return;
    }
    setDraftMediaUrl(uploaded.url);
    setDraftMediaType(uploaded.mediaType);
    msgApi.success(
      uploaded.mediaType === "video"
        ? "Video uploaded! Fill headline & save slide."
        : "Image uploaded! Fill headline & save slide."
    );
  };

  const handleUploadPoster = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPoster(true);
    const uploaded = await uploadMediaFile(file);
    setUploadingPoster(false);
    if (!uploaded) {
      msgApi.error("Poster upload failed.");
      return;
    }
    setDraftPosterUrl(uploaded.url);
    msgApi.success("Poster thumbnail updated.");
  };

  const persistCms = async (nextPayload: HomeSlideshowCmsPayload, toastText: string) => {
    try {
      setSaving(true);
      const res = await AxiosConfig.put<{ data?: Partial<HomeSlideshowCmsPayload> }>(
        "/api/home-slideshow",
        nextPayload
      );
      const saved = normalizeHomeSlideshowCms(res.data?.data || nextPayload);
      setCms(saved);
      onCountChangeRef.current?.(saved.slides.length);
      msgApiRef.current.success(toastText);
    } catch {
      msgApiRef.current.error("Could not save Home slideshow changes.");
    } finally {
      setSaving(false);
    }
  };

  const resetDraftForm = () => {
    setEditingSlideId(null);
    setDraftMediaType("video");
    setDraftMediaUrl("/assets/homeslider/showcase-architectural.mp4");
    setDraftPosterUrl("/assets/homeslider/image1.jpg");
    setDraftHeadline("");
    setDraftDescription("");
    setDraftActive(true);
  };

  const handleStartEditSlide = (slide: HomeHeroSlide) => {
    setEditingSlideId(slide.id);
    setDraftMediaType(slide.mediaType);
    setDraftMediaUrl(slide.mediaUrl);
    setDraftPosterUrl(slide.posterUrl || "/assets/homeslider/image1.jpg");
    setDraftHeadline(slide.headline);
    setDraftDescription(slide.description);
    setDraftActive(slide.active !== false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleSubmitSlide = async (e: FormEvent) => {
    e.preventDefault();
    if (!draftMediaUrl.trim()) {
      msgApi.error("Please provide or upload an image or video.");
      return;
    }
    const nextSlides = upsertHomeSlide(
      cms.slides,
      {
        mediaType: draftMediaType,
        mediaUrl: draftMediaUrl.trim(),
        posterUrl: draftPosterUrl.trim(),
        headline: draftHeadline.trim() || DEFAULT_HOME_HEADLINE,
        description: draftDescription.trim() || DEFAULT_HOME_DESCRIPTION,
        active: draftActive,
      },
      editingSlideId
    );
    const nextCms = normalizeHomeSlideshowCms({ ...cms, slides: nextSlides });
    await persistCms(
      nextCms,
      editingSlideId ? "Slide updated & published!" : "New slide added & published!"
    );
    resetDraftForm();
  };

  const handleDeleteSlide = async (slide: HomeHeroSlide) => {
    if (cms.slides.length <= 1) {
      msgApi.warning("At least one slide must remain in the Home slideshow.");
      return;
    }
    const nextSlides = deleteHomeSlide(cms.slides, slide.id);
    const nextCms = normalizeHomeSlideshowCms({ ...cms, slides: nextSlides });
    if (editingSlideId === slide.id) {
      resetDraftForm();
    }
    await persistCms(nextCms, `Removed slide "${slide.headline}".`);
  };

  const handleMoveSlide = async (index: number, direction: -1 | 1) => {
    const moved = moveHomeSlide(cms.slides, index, direction);
    const nextCms = normalizeHomeSlideshowCms({ ...cms, slides: moved });
    setCms(nextCms);
    await persistCms(nextCms, "Slide order updated & published!");
  };

  const handleToggleSlideActive = async (slideId: string) => {
    const toggled = toggleHomeSlideActive(cms.slides, slideId);
    const nextCms = normalizeHomeSlideshowCms({ ...cms, slides: toggled });
    setCms(nextCms);
    await persistCms(nextCms, "Slide visibility updated!");
  };

  const handleSaveAllSettings = async () => {
    await persistCms(cms, "All Home slideshow settings, stats & order saved!");
  };

  const handleResetDefaults = async () => {
    await persistCms(
      DEFAULT_HOME_SLIDESHOW_CMS,
      "Home slideshow restored to defaults."
    );
    resetDraftForm();
  };

  const speedSeconds = Number((cms.slideshowSpeedMs / 1000).toFixed(1));
  const draftEmbedUrl =
    draftMediaType === "video" ? parseVideoEmbedUrl(draftMediaUrl) : null;

  const editingSlideIndex = editingSlideId
    ? cms.slides.findIndex((s) => s.id === editingSlideId)
    : -1;

  return (
    <div className="space-y-6">
      {msgContextHolder}
      {/* Header Bar & Quick Public View Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Home Page Hero Slideshow ({cms.slides.length} slides)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, edit, reorder, or delete images, MP4/WebM videos, YouTube links, headlines, stats, and hero buttons.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] px-3 py-2 text-xs font-semibold text-[#22577A] no-underline transition-colors"
          >
            <FiEye className="text-xs" />
            <span>Preview Home Hero</span>
          </Link>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer transition-colors"
          >
            <FiRotateCcw className="text-xs" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSaveAllSettings}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-60"
          >
            <FiSave className="text-xs" />
            <span>{saving ? "Saving..." : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Slide (Videos, Images & Content) */}
      <form
        ref={formRef}
        onSubmit={handleSubmitSlide}
        data-testid="home-slide-editor-form"
        className={`rounded-2xl border bg-white p-4 sm:p-5 space-y-4 shadow-xs transition-colors ${
          editingSlideId ? "border-[#3393B8] ring-2 ring-[#3393B8]/15" : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {editingSlideId
                ? `Editing Slide #${editingSlideIndex >= 0 ? editingSlideIndex + 1 : ""}`
                : "Add New Image or Video Slide"}
            </span>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDraftMediaType("video")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                draftMediaType === "video"
                  ? "bg-[#22577A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiFilm className="text-xs" />
              <span>Video Slide</span>
            </button>
            <button
              type="button"
              onClick={() => setDraftMediaType("image")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                draftMediaType === "image"
                  ? "bg-[#22577A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FiImage className="text-xs" />
              <span>Image Slide</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Preview + Upload Controls */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
              {draftMediaType === "video" ? (
                draftEmbedUrl ? (
                  <iframe
                    src={draftEmbedUrl}
                    title="Slide video preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    key={draftMediaUrl}
                    src={draftMediaUrl}
                    poster={draftPosterUrl}
                    muted
                    loop
                    playsInline
                    controls
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <img
                  src={draftMediaUrl}
                  alt="Slide preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 px-3 py-2 text-xs font-semibold text-[#22577A] cursor-pointer transition-colors">
                <FiUpload className="text-xs" />
                <span>
                  {uploadingMedia ? "Uploading..." : "Upload Video / Image"}
                </span>
                <input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadSlideMedia(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>

              {draftMediaType === "video" && (
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                  <FiImage className="text-xs" />
                  <span>
                    {uploadingPoster ? "Uploading..." : "Poster Image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleUploadPoster(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <div>
              <label
                htmlFor="home-slide-preset"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Or Pick Local Preset Media
              </label>
              <select
                id="home-slide-preset"
                value={
                  HOME_MEDIA_PRESETS.some((p) => p.url === draftMediaUrl)
                    ? draftMediaUrl
                    : ""
                }
                onChange={(e) => {
                  const chosen = HOME_MEDIA_PRESETS.find(
                    (p) => p.url === e.target.value
                  );
                  if (!chosen) return;
                  setDraftMediaType(chosen.mediaType);
                  setDraftMediaUrl(chosen.url);
                  if (chosen.posterUrl) setDraftPosterUrl(chosen.posterUrl);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#3393B8]"
              >
                <option value="">Choose a preset video or photo...</option>
                {HOME_MEDIA_PRESETS.map((preset) => (
                  <option key={preset.url} value={preset.url}>
                    [{preset.mediaType.toUpperCase()}] {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Inputs */}
          <div className="lg:col-span-7 space-y-3">
            <div>
              <label
                htmlFor="home-slide-media-url"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                {draftMediaType === "video"
                  ? "Video URL (Uploaded .mp4 / .webm, or YouTube / Vimeo URL)"
                  : "Image URL"}
              </label>
              <input
                id="home-slide-media-url"
                type="text"
                value={draftMediaUrl}
                onChange={(e) => {
                  const nextUrl = e.target.value;
                  setDraftMediaUrl(nextUrl);
                  if (inferMediaTypeFromUrl(nextUrl) === "video") {
                    setDraftMediaType("video");
                  }
                }}
                placeholder={
                  draftMediaType === "video"
                    ? "/assets/homeslider/showcase-architectural.mp4 or https://youtube.com/watch?v=..."
                    : "/assets/homeslider/image1.jpg"
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            {draftMediaType === "video" && (
              <div>
                <label
                  htmlFor="home-slide-poster-url"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Video Fallback Poster Image URL
                </label>
                <input
                  id="home-slide-poster-url"
                  type="text"
                  value={draftPosterUrl}
                  onChange={(e) => setDraftPosterUrl(e.target.value)}
                  placeholder="/assets/homeslider/image1.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#3393B8]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="home-slide-headline"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Slide Headline
              </label>
              <input
                id="home-slide-headline"
                type="text"
                value={draftHeadline}
                onChange={(e) => setDraftHeadline(e.target.value)}
                placeholder={DEFAULT_HOME_HEADLINE}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div>
              <label
                htmlFor="home-slide-description"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Slide Content Description
              </label>
              <textarea
                id="home-slide-description"
                rows={3}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder={DEFAULT_HOME_DESCRIPTION}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#3393B8]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <Switch
                  size="small"
                  checked={draftActive}
                  onChange={(checked) => setDraftActive(checked)}
                />
                <span>Show slide live on Home page</span>
              </label>

              <div className="flex items-center gap-2">
                {editingSlideId && (
                  <button
                    type="button"
                    onClick={resetDraftForm}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50"
                  >
                    <FiX className="text-xs" />
                    <span>Cancel Edit</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#22577A] hover:bg-[#19435E] px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
                >
                  {editingSlideId ? <FiSave className="text-xs" /> : <FiPlus className="text-xs" />}
                  <span>
                    {editingSlideId
                      ? "Update Slide"
                      : draftMediaType === "video"
                      ? "Add Video Slide"
                      : "Add Image Slide"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Hero Stats Cards, Speed & Kept Buttons Config */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Hero Stats Cards, Speed &amp; Action Buttons
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the 3 glass metric cards, rotation interval, and kept CTA buttons.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <span>Show 3 Stat Cards</span>
            <Switch
              size="small"
              checked={cms.showStats}
              onChange={(checked) =>
                setCms((prev) => ({ ...prev, showStats: checked }))
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cms.stats.map((stat, idx) => (
            <div
              key={stat.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
            >
              <div className="text-[11px] font-bold text-[#22577A] uppercase tracking-wider">
                Stat Card #{idx + 1}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor={`stat-${stat.id}-number`}
                    className="block text-[11px] text-slate-500 mb-0.5"
                  >
                    Number
                  </label>
                  <input
                    id={`stat-${stat.id}-number`}
                    type="number"
                    min={0}
                    value={stat.number}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setCms((prev) => ({
                        ...prev,
                        stats: prev.stats.map((s) =>
                          s.id === stat.id ? { ...s, number: val } : s
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`stat-${stat.id}-suffix`}
                    className="block text-[11px] text-slate-500 mb-0.5"
                  >
                    Suffix
                  </label>
                  <input
                    id={`stat-${stat.id}-suffix`}
                    type="text"
                    maxLength={4}
                    value={stat.suffix}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCms((prev) => ({
                        ...prev,
                        stats: prev.stats.map((s) =>
                          s.id === stat.id ? { ...s, suffix: val } : s
                        ),
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor={`stat-${stat.id}-label`}
                  className="block text-[11px] text-slate-500 mb-0.5"
                >
                  Label
                </label>
                <input
                  id={`stat-${stat.id}-label`}
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCms((prev) => ({
                      ...prev,
                      stats: prev.stats.map((s) =>
                        s.id === stat.id ? { ...s, label: val } : s
                      ),
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label
              htmlFor="home-primary-btn"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Primary Button Label (Opens Contact)
            </label>
            <input
              id="home-primary-btn"
              type="text"
              value={cms.primaryButtonLabel}
              onChange={(e) =>
                setCms((prev) => ({
                  ...prev,
                  primaryButtonLabel: e.target.value,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
            />
          </div>
          <div>
            <label
              htmlFor="home-secondary-btn"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Secondary Underlined Button
            </label>
            <input
              id="home-secondary-btn"
              type="text"
              value={cms.secondaryButtonLabel}
              onChange={(e) =>
                setCms((prev) => ({
                  ...prev,
                  secondaryButtonLabel: e.target.value,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
            />
          </div>
          <div>
            <label
              htmlFor="home-slide-speed"
              className="block text-[11px] font-bold text-slate-600 mb-1"
            >
              Auto-Advance Interval ({speedSeconds}s)
            </label>
            <input
              id="home-slide-speed"
              type="range"
              min={2}
              max={25}
              step={0.5}
              value={speedSeconds}
              onChange={(e) =>
                setCms((prev) => ({
                  ...prev,
                  slideshowSpeedMs: clampHomeSlideshowSpeedMs(
                    Number(e.target.value) * 1000
                  ),
                }))
              }
              className="w-full accent-[#22577A] mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* Slide Deck Manager List */}
      <div className="space-y-3" data-testid="home-slides-list">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            Published Slides &amp; Videos ({cms.slides.length})
          </h4>
          <span className="text-xs text-slate-500">
            {cms.slides.filter((s) => s.mediaType === "video").length} videos ·{" "}
            {cms.slides.filter((s) => s.mediaType === "image").length} images
          </span>
        </div>

        <div className="space-y-3">
          {cms.slides.map((slide, idx) => {
            const embedSrc =
              slide.mediaType === "video"
                ? parseVideoEmbedUrl(slide.mediaUrl)
                : null;
            return (
              <div
                key={slide.id}
                className={`rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-colors ${
                  slide.active === false
                    ? "border-amber-200 bg-amber-50/35"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Thumbnail / Video Preview */}
                <div className="md:col-span-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                    {slide.mediaType === "video" ? (
                      embedSrc ? (
                        <iframe
                          src={embedSrc}
                          title={slide.headline}
                          className="w-full h-full border-0 pointer-events-none"
                        />
                      ) : (
                        <video
                          src={slide.mediaUrl}
                          poster={slide.posterUrl}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <img
                        src={slide.mediaUrl}
                        alt={slide.headline}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Slide Meta */}
                <div className="md:col-span-6 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-[#22577A]">
                      Slide #{idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      {slide.mediaType === "video" ? (
                        <>
                          <FiFilm className="text-[11px]" /> Video
                        </>
                      ) : (
                        <>
                          <FiImage className="text-[11px]" /> Image
                        </>
                      )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{slide.active === false ? "Hidden" : "Visible"}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {slide.headline}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 m-0">
                    {slide.description}
                  </p>
                  <div className="text-[11px] text-slate-400 truncate">
                    {slide.mediaUrl}
                  </div>
                </div>

                {/* Row Actions */}
                <div className="md:col-span-3 flex flex-wrap md:justify-end items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    aria-label={`Move Slide ${idx + 1} Up`}
                    onClick={() => handleMoveSlide(idx, -1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <FiArrowUp className="text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === cms.slides.length - 1}
                    aria-label={`Move Slide ${idx + 1} Down`}
                    onClick={() => handleMoveSlide(idx, 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <FiArrowDown className="text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSlideActive(slide.id)}
                    className="px-2.5 h-8 rounded-lg border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {slide.active === false ? "Show" : "Hide"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit Slide ${idx + 1}: ${slide.headline}`}
                    onClick={() => handleStartEditSlide(slide)}
                    className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#3393B8]/40 bg-sky-50 hover:bg-sky-100 text-xs font-semibold text-[#22577A] cursor-pointer"
                  >
                    <FiEdit2 className="text-xs" />
                    <span>Edit</span>
                  </button>
                  <Popconfirm
                    title={`Delete slide "${slide.headline}"?`}
                    okText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => handleDeleteSlide(slide)}
                  >
                    <button
                      type="button"
                      disabled={cms.slides.length <= 1}
                      aria-label={`Delete Slide ${idx + 1}: ${slide.headline}`}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 text-xs font-semibold text-red-600 cursor-pointer"
                    >
                      <FiTrash2 className="text-xs" />
                      <span>Delete</span>
                    </button>
                  </Popconfirm>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
