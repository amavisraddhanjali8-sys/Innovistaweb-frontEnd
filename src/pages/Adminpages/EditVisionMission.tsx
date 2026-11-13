import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Slider,
  message,
  Row,
  Col,
  Divider,
  Spin,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import {
  ClientsEditorTab,
  FeedbacksEditorTab,
  JourneyEditorTab,
  PartnersEditorTab,
  TeamEditorTab,
} from "../../components/AdminAboutListEditors";
import {
  ABOUT_PRESET_IMAGES,
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
  getNextSlideIndex,
  getPrevSlideIndex,
  moveArrayItem,
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
  type AboutSectionContent,
  type ClientFeedbackItem,
  type ClientItem,
  type DirectorMessageContent,
  type HeroSlide,
  type JourneyMilestoneItem,
  type PartnerItem,
  type TeamMemberItem,
} from "../../utils/aboutContentHelpers";

const { TextArea } = Input;

const SPEED_PRESETS = [
  { label: "Fast (1.5s)", ms: 1500 },
  { label: "Brisk (2.5s)", ms: 2500 },
  { label: "Balanced (4s)", ms: 4000 },
  { label: "Classic (5.5s)", ms: 5500 },
  { label: "Calm (8s)", ms: 8000 },
];

function EditVisionMission() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get("tab") || "slideshow";

  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Slideshow, Showcase & Ribbon Speed states
  const [slideshowSpeedMs, setSlideshowSpeedMs] = useState<number>(DEFAULT_SLIDESHOW_SPEED_MS);
  const [journeySpeedMs, setJourneySpeedMs] = useState<number>(DEFAULT_JOURNEY_SPEED_MS);
  const [feedbackSpeedMs, setFeedbackSpeedMs] = useState<number>(DEFAULT_FEEDBACK_SPEED_MS);
  const [partnersRibbonSpeed, setPartnersRibbonSpeed] = useState<number>(
    DEFAULT_PARTNERS_RIBBON_SPEED
  );
  const [clientsRibbonSpeed, setClientsRibbonSpeed] = useState<number>(
    DEFAULT_CLIENTS_RIBBON_SPEED
  );
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number>(0);

  // About Sections State
  const [visionData, setVisionData] = useState<AboutSectionContent>(DEFAULT_ABOUT_SECTIONS.vision);
  const [missionData, setMissionData] = useState<AboutSectionContent>(DEFAULT_ABOUT_SECTIONS.mission);
  const [directorMessage, setDirectorMessage] =
    useState<DirectorMessageContent>(DEFAULT_DIRECTOR_MESSAGE);
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>(DEFAULT_TEAM_MEMBERS);
  const [journeyMilestones, setJourneyMilestones] =
    useState<JourneyMilestoneItem[]>(DEFAULT_JOURNEY_MILESTONES);
  const [partners, setPartners] = useState<PartnerItem[]>(DEFAULT_PARTNERS);
  const [clients, setClients] = useState<ClientItem[]>(DEFAULT_CLIENTS);
  const [clientFeedbacks, setClientFeedbacks] =
    useState<ClientFeedbackItem[]>(DEFAULT_CLIENT_FEEDBACKS);

  const updatePreviewFromForm = useCallback(() => {
    const vals = form.getFieldsValue();
    setVisionData({
      badge: vals.vision_badge || "OUR VISION",
      title: vals.vision_title || "Your Space, Your Legacy, Built Forever",
      tagline: vals.vision_tagline || "Precision Craftsmanship & Modern Architecture",
      description: vals.vision_description || "",
      mainImage: vals.vision_mainImage || "/assets/reference/reference_villa_main.jpg",
      thumbnails: [
        {
          id: "v1",
          title: vals.vision_thumb1_title || "Modern Residences",
          caption: vals.vision_thumb1_caption || "Panoramic Glazing",
          image: vals.vision_thumb1_image || "/assets/reference/reference_villa_main.jpg",
        },
        {
          id: "v2",
          title: vals.vision_thumb2_title || "Aluminium Joinery",
          caption: vals.vision_thumb2_caption || "Thermally Broken Suites",
          image: vals.vision_thumb2_image || "/assets/about/facade.jpg",
        },
      ],
    });

    setMissionData({
      badge: vals.mission_badge || "OUR MISSION",
      title: vals.mission_title || "Experience Inspired Precision in Every Detail",
      tagline: vals.mission_tagline || "Architectural Aluminium & Glazing Systems",
      description: vals.mission_description || "",
      mainImage: vals.mission_mainImage || "/assets/reference/reference_mission_clean.jpg",
      thumbnails: [
        {
          id: "m1",
          title: vals.mission_thumb1_title || "Curtain Walls",
          caption: vals.mission_thumb1_caption || "High-Rise Structures",
          image: vals.mission_thumb1_image || "/assets/about/facade.jpg",
        },
        {
          id: "m2",
          title: vals.mission_thumb2_title || "Terrace Balustrades",
          caption: vals.mission_thumb2_caption || "Tempered Safety Glass",
          image: vals.mission_thumb2_image || "/assets/about/terrace.jpg",
        },
      ],
    });
  }, [form]);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get("/about/vision-mission");
      if (res.data) {
        const defaults: AboutCmsPayload = {
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
        const normalized = normalizeAboutCmsPayload(res.data, defaults);
        setSlideshowSpeedMs(normalized.slideshowSpeedMs);
        setJourneySpeedMs(normalized.journeySpeedMs);
        setFeedbackSpeedMs(normalized.feedbackSpeedMs);
        setPartnersRibbonSpeed(normalized.partnersRibbonSpeed);
        setClientsRibbonSpeed(normalized.clientsRibbonSpeed);
        setHeroSlides(normalized.heroSlides);
        setPreviewSlideIdx(0);
        setVisionData(normalized.vision);
        setMissionData(normalized.mission);
        setDirectorMessage(normalized.directorMessage);
        setTeamMembers(normalized.teamMembers);
        setJourneyMilestones(normalized.journeyMilestones);
        setPartners(normalized.partners);
        setClients(normalized.clients);
        setClientFeedbacks(normalized.clientFeedbacks);

        form.setFieldsValue({
          vision_badge: normalized.vision.badge,
          vision_title: normalized.vision.title,
          vision_tagline: normalized.vision.tagline,
          vision_description: normalized.vision.description,
          vision_mainImage: normalized.vision.mainImage,
          vision_thumb1_title: normalized.vision.thumbnails?.[0]?.title || "",
          vision_thumb1_caption: normalized.vision.thumbnails?.[0]?.caption || "",
          vision_thumb1_image: normalized.vision.thumbnails?.[0]?.image || "",
          vision_thumb2_title: normalized.vision.thumbnails?.[1]?.title || "",
          vision_thumb2_caption: normalized.vision.thumbnails?.[1]?.caption || "",
          vision_thumb2_image: normalized.vision.thumbnails?.[1]?.image || "",

          mission_badge: normalized.mission.badge,
          mission_title: normalized.mission.title,
          mission_tagline: normalized.mission.tagline,
          mission_description: normalized.mission.description,
          mission_mainImage: normalized.mission.mainImage,
          mission_thumb1_title: normalized.mission.thumbnails?.[0]?.title || "",
          mission_thumb1_caption: normalized.mission.thumbnails?.[0]?.caption || "",
          mission_thumb1_image: normalized.mission.thumbnails?.[0]?.image || "",
          mission_thumb2_title: normalized.mission.thumbnails?.[1]?.title || "",
          mission_thumb2_caption: normalized.mission.thumbnails?.[1]?.caption || "",
          mission_thumb2_image: normalized.mission.thumbnails?.[1]?.image || "",
        });
      }
    } catch (err) {
      console.error("Error loading About content:", err);
      message.error("Failed to fetch About showcase content");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab) setActiveTab(requestedTab);
  }, [searchParams]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const finalUrl = data.secure_url || data.url;
      if (finalUrl) return finalUrl;
    } catch {
      // Fallback below
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(typeof e.target?.result === "string" ? e.target.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadWithCallback = async (
    file: File,
    key: string,
    onUrl: (url: string) => void
  ) => {
    setUploadingField(key);
    const url = await uploadImageFile(file);
    if (url) {
      onUrl(url);
      message.success("Image uploaded successfully");
    } else {
      message.error("Image upload failed");
    }
    setUploadingField(null);
  };

  const handleFormFileUpload = async (file: File, fieldName: string) => {
    await handleUploadWithCallback(file, fieldName, (url) => {
      form.setFieldsValue({ [fieldName]: url });
      updatePreviewFromForm();
    });
  };

  const handleSlideChange = (slideId: string, field: keyof HeroSlide, value: string) => {
    setHeroSlides((prev) =>
      prev.map((slide) => (slide.id === slideId ? { ...slide, [field]: value } : slide))
    );
  };

  const handleAddSlide = () => {
    const nextNum = heroSlides.length + 1;
    const preset = ABOUT_PRESET_IMAGES[nextNum % 5];
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      headline: `Custom Architectural Suite ${nextNum}`,
      subheadline:
        "Precision anodized aluminium framing and clear laminated glazing crafted for modern spaces.",
      image: preset.url,
    };
    setHeroSlides((prev) => [...prev, newSlide]);
    setPreviewSlideIdx(heroSlides.length);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (heroSlides.length <= 1) {
      message.warning("At least one hero slide must remain.");
      return;
    }
    setHeroSlides((prev) => {
      const filtered = prev.filter((s) => s.id !== slideId);
      if (previewSlideIdx >= filtered.length) {
        setPreviewSlideIdx(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleSaveAll = async () => {
    try {
      const values = form.getFieldsValue(true);
      const cleanedSlides = heroSlides.map((s, idx) => ({
        id: s.id || `slide-${idx + 1}`,
        headline: s.headline.trim() || "Architectural Precision Starts Here",
        subheadline: s.subheadline.trim() || "Engineered aluminium and structural glazing systems.",
        image: s.image.trim() || "/assets/reference/reference_mission_clean.jpg",
      }));

      if (cleanedSlides.length === 0) {
        message.error("Please add at least one hero slide.");
        return;
      }

      setSaving(true);
      const payload: AboutCmsPayload = {
        slideshowSpeedMs: clampSlideshowSpeedMs(slideshowSpeedMs),
        journeySpeedMs: clampSlideshowSpeedMs(journeySpeedMs, DEFAULT_JOURNEY_SPEED_MS),
        feedbackSpeedMs: clampSlideshowSpeedMs(feedbackSpeedMs, DEFAULT_FEEDBACK_SPEED_MS),
        partnersRibbonSpeed: clampRibbonSpeed(
          partnersRibbonSpeed,
          DEFAULT_PARTNERS_RIBBON_SPEED
        ),
        clientsRibbonSpeed: clampRibbonSpeed(
          clientsRibbonSpeed,
          DEFAULT_CLIENTS_RIBBON_SPEED
        ),
        heroSlides: cleanedSlides,
        vision: {
          badge: values.vision_badge || visionData.badge,
          title: values.vision_title || visionData.title,
          tagline: values.vision_tagline || visionData.tagline,
          description: values.vision_description || visionData.description,
          mainImage: values.vision_mainImage || visionData.mainImage,
          thumbnails: [
            {
              id: "v1",
              title: values.vision_thumb1_title || "Modern Residences",
              caption: values.vision_thumb1_caption || "Panoramic Glazing",
              image: values.vision_thumb1_image || "/assets/reference/reference_villa_main.jpg",
            },
            {
              id: "v2",
              title: values.vision_thumb2_title || "Aluminium Joinery",
              caption: values.vision_thumb2_caption || "Thermally Broken Suites",
              image: values.vision_thumb2_image || "/assets/about/facade.jpg",
            },
          ],
        },
        mission: {
          badge: values.mission_badge || missionData.badge,
          title: values.mission_title || missionData.title,
          tagline: values.mission_tagline || missionData.tagline,
          description: values.mission_description || missionData.description,
          mainImage: values.mission_mainImage || missionData.mainImage,
          thumbnails: [
            {
              id: "m1",
              title: values.mission_thumb1_title || "Curtain Walls",
              caption: values.mission_thumb1_caption || "High-Rise Structures",
              image: values.mission_thumb1_image || "/assets/about/facade.jpg",
            },
            {
              id: "m2",
              title: values.mission_thumb2_title || "Terrace Balustrades",
              caption: values.mission_thumb2_caption || "Tempered Safety Glass",
              image: values.mission_thumb2_image || "/assets/about/terrace.jpg",
            },
          ],
        },
        directorMessage,
        teamMembers,
        journeyMilestones,
        partners,
        clients,
        clientFeedbacks,
      };

      await AxiosConfig.put("/about/vision-mission", payload);
      message.success("All About page sections & slideshow settings published!");
      await fetchContent();
    } catch (err) {
      console.error("Save error:", err);
      message.error("Could not save changes. Please verify fields.");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSlideshowSpeedMs(DEFAULT_SLIDESHOW_SPEED_MS);
    setJourneySpeedMs(DEFAULT_JOURNEY_SPEED_MS);
    setFeedbackSpeedMs(DEFAULT_FEEDBACK_SPEED_MS);
    setPartnersRibbonSpeed(DEFAULT_PARTNERS_RIBBON_SPEED);
    setClientsRibbonSpeed(DEFAULT_CLIENTS_RIBBON_SPEED);
    setHeroSlides(DEFAULT_HERO_SLIDES);
    setPreviewSlideIdx(0);
    setDirectorMessage(DEFAULT_DIRECTOR_MESSAGE);
    setTeamMembers(DEFAULT_TEAM_MEMBERS);
    setJourneyMilestones(DEFAULT_JOURNEY_MILESTONES);
    setPartners(DEFAULT_PARTNERS);
    setClients(DEFAULT_CLIENTS);
    setClientFeedbacks(DEFAULT_CLIENT_FEEDBACKS);

    form.setFieldsValue({
      vision_badge: DEFAULT_ABOUT_SECTIONS.vision.badge,
      vision_title: DEFAULT_ABOUT_SECTIONS.vision.title,
      vision_tagline: DEFAULT_ABOUT_SECTIONS.vision.tagline,
      vision_description: DEFAULT_ABOUT_SECTIONS.vision.description,
      vision_mainImage: DEFAULT_ABOUT_SECTIONS.vision.mainImage,
      vision_thumb1_title: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[0].title,
      vision_thumb1_caption: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[0].caption,
      vision_thumb1_image: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[0].image,
      vision_thumb2_title: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[1].title,
      vision_thumb2_caption: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[1].caption,
      vision_thumb2_image: DEFAULT_ABOUT_SECTIONS.vision.thumbnails[1].image,

      mission_badge: DEFAULT_ABOUT_SECTIONS.mission.badge,
      mission_title: DEFAULT_ABOUT_SECTIONS.mission.title,
      mission_tagline: DEFAULT_ABOUT_SECTIONS.mission.tagline,
      mission_description: DEFAULT_ABOUT_SECTIONS.mission.description,
      mission_mainImage: DEFAULT_ABOUT_SECTIONS.mission.mainImage,
      mission_thumb1_title: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[0].title,
      mission_thumb1_caption: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[0].caption,
      mission_thumb1_image: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[0].image,
      mission_thumb2_title: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[1].title,
      mission_thumb2_caption: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[1].caption,
      mission_thumb2_image: DEFAULT_ABOUT_SECTIONS.mission.thumbnails[1].image,
    });
    updatePreviewFromForm();
    message.info("Reset all About sections to defaults (click Save & Publish to apply live).");
  };

  const activePreviewSlide = heroSlides[previewSlideIdx] || heroSlides[0];
  const speedSeconds = Number((slideshowSpeedMs / 1000).toFixed(1));

  const rightRailContent = (
    <div className="space-y-5">
      {/* Live About Page Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-[#3393B8]" />
            <span className="text-xs font-bold text-slate-900">
              Live About Preview
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#22577A] tabular-nums">
            {speedSeconds}s slide
          </span>
        </div>

        {activePreviewSlide && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                Slide {previewSlideIdx + 1} / {heroSlides.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Preview Previous Slide"
                  onClick={() =>
                    setPreviewSlideIdx((prev) =>
                      getPrevSlideIndex(prev, heroSlides.length)
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
                      getNextSlideIndex(prev, heroSlides.length)
                    )
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                >
                  <RightOutlined className="text-[10px]" />
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#22577A] via-[#3393B8] to-white pt-4 text-center border border-slate-100">
              <h4 className="px-3 text-sm font-semibold text-white leading-snug">
                {activePreviewSlide.headline}
              </h4>
              <p className="px-3 mt-1 text-[11px] text-white/90 line-clamp-2">
                {activePreviewSlide.subheadline}
              </p>
              <img
                src={activePreviewSlide.image}
                alt={activePreviewSlide.headline}
                referrerPolicy="no-referrer"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 22%, black 85%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 22%, black 85%, transparent 100%)",
                }}
                className="w-full h-32 object-cover mt-1 block"
              />
            </div>
          </div>
        )}

        <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
          <div>
            <div className="font-bold text-[#22577A] uppercase tracking-wider text-[10px]">
              {visionData.tagline}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
              {visionData.title}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
              Director&apos;s Message
            </div>
            <div className="font-semibold text-slate-800 mt-0.5">
              {directorMessage.directorName}
            </div>
          </div>
        </div>
      </div>

      {/* CMS Counters Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-900">
            Published Sections
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            8 Modules
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">{teamMembers.length}</span>{" "}
            <span className="text-slate-600">Team</span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">{journeyMilestones.length}</span>{" "}
            <span className="text-slate-600">Roadmap ({(journeySpeedMs / 1000).toFixed(1)}s)</span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">{partners.length}</span>{" "}
            <span className="text-slate-600">Partners ({partnersRibbonSpeed} px/s)</span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 tabular-nums">
            <span className="font-bold text-[#22577A]">{clients.length}</span>{" "}
            <span className="text-slate-600">Clients ({clientsRibbonSpeed} px/s)</span>
          </div>
        </div>

        <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs tabular-nums flex items-center justify-between">
          <span className="text-slate-600">Feedbacks ({(feedbackSpeedMs / 1000).toFixed(1)}s)</span>
          <span className="font-bold text-[#22577A]">{clientFeedbacks.length}</span>
        </div>
      </div>

      {/* Bottom Right Action Cluster */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate("/about")}
            className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <EyeOutlined />
            <span>View Live</span>
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            className="py-2.5 px-3 rounded-xl bg-white border border-slate-200/90 hover:border-[#22577A] text-xs font-semibold text-[#22577A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <ReloadOutlined />
            <span>Defaults</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full py-3 px-4 rounded-xl bg-[#22577A] hover:bg-[#19435E] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <SaveOutlined />
          <span>{saving ? "Publishing..." : "Save & Publish"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <AdminPortalShell
      sectionCode="About Showcase CMS"
      sectionTitle="About Page & Slideshow Manager"
      sectionSubtitle="Manage hero slides, speeds, Vision & Mission, Director, Team, Journey, Partners & Clients."
      bannerLeftLines={[
        { label: "Hero Slides", value: `${heroSlides.length} (${speedSeconds}s auto)` },
        { label: "Partners & Clients", value: `${partners.length} Partners · ${clients.length} Clients` },
        { label: "Client Feedbacks", value: `${clientFeedbacks.length} published` },
      ]}
      headerAction={{
        label: saving ? "Publishing..." : "Save & Publish",
        icon: <SaveOutlined />,
        loading: saving,
        onClick: handleSaveAll,
      }}
      customRightRail={rightRailContent}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onValuesChange={updatePreviewFromForm}>
          {/* Accessible Non-Truncating Multi-Section Tab Strip */}
          <div
            role="tablist"
            aria-label="About page content sections"
            className="flex flex-wrap gap-2 pb-4 mb-5 border-b border-slate-200"
          >
                  {[
                    { key: "slideshow", label: `Slideshow (${heroSlides.length})` },
                    { key: "vision", label: "Vision & Mission" },
                    { key: "director", label: "Director's Message" },
                    { key: "team", label: `Meet the Team (${teamMembers.length})` },
                    { key: "journey", label: `Our Journey (${journeyMilestones.length})` },
                    { key: "partners", label: `Our Partners (${partners.length})` },
                    { key: "clients", label: `Our Clients (${clients.length})` },
                    { key: "feedbacks", label: `Client Feedbacks (${clientFeedbacks.length})` },
                  ].map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? "bg-[#3393B8] text-white border-[#3393B8] shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {activeTab === "slideshow" && (
                  <div className="space-y-4">
                    {/* Slideshow Autoplay Speed Control */}
                    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#22577A]">
                            Auto-Change Slide Speed
                          </div>
                          <div className="text-xs text-slate-600">
                            Controls how quickly hero slides advance automatically on the About page.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="slideshow-speed-seconds"
                            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                          >
                            Interval (sec):
                          </label>
                          <InputNumber
                            id="slideshow-speed-seconds"
                            min={1.5}
                            max={20}
                            step={0.5}
                            value={speedSeconds}
                            onChange={(val) => {
                              if (typeof val === "number") {
                                setSlideshowSpeedMs(clampSlideshowSpeedMs(val * 1000));
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
                        value={speedSeconds}
                        onChange={(val) =>
                          setSlideshowSpeedMs(clampSlideshowSpeedMs(val * 1000))
                        }
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        {SPEED_PRESETS.map((preset) => {
                          const isActive = slideshowSpeedMs === preset.ms;
                          return (
                            <button
                              key={preset.ms}
                              type="button"
                              onClick={() => setSlideshowSpeedMs(preset.ms)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
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

                    <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">
                        Add, reorder, or edit Hero Slideshow banners.
                      </span>
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={handleAddSlide}
                      >
                        Add Slide
                      </Button>
                    </div>

                    {heroSlides.map((slide, idx) => (
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
                              aria-label={`Move Slide ${idx + 1} Up`}
                              onClick={() => {
                                setHeroSlides((prev) => moveArrayItem(prev, idx, -1));
                                setPreviewSlideIdx(Math.max(0, idx - 1));
                              }}
                            />
                            <Button
                              size="small"
                              icon={<ArrowDownOutlined />}
                              disabled={idx === heroSlides.length - 1}
                              aria-label={`Move Slide ${idx + 1} Down`}
                              onClick={() => {
                                setHeroSlides((prev) => moveArrayItem(prev, idx, 1));
                                setPreviewSlideIdx(
                                  Math.min(heroSlides.length - 1, idx + 1)
                                );
                              }}
                            />
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              disabled={heroSlides.length <= 1}
                              aria-label={`Delete Slide ${idx + 1}`}
                              onClick={() => handleDeleteSlide(slide.id)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Slide Headline
                          </label>
                          <Input
                            value={slide.headline}
                            onChange={(e) => {
                              handleSlideChange(slide.id, "headline", e.target.value);
                              setPreviewSlideIdx(idx);
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Slide Subtitle
                          </label>
                          <TextArea
                            rows={2}
                            value={slide.subheadline}
                            onChange={(e) => {
                              handleSlideChange(slide.id, "subheadline", e.target.value);
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
                              handleSlideChange(slide.id, "image", e.target.value);
                              setPreviewSlideIdx(idx);
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-400">
                            <UploadOutlined />
                            <span>
                              {uploadingField === slide.id ? "Uploading..." : "Upload Image"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleUploadWithCallback(
                                    e.target.files[0],
                                    slide.id,
                                    (url) => handleSlideChange(slide.id, "image", url)
                                  );
                                }
                              }}
                            />
                          </label>

                          {ABOUT_PRESET_IMAGES.slice(0, 5).map((preset) => (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => {
                                handleSlideChange(slide.id, "image", preset.url);
                                setPreviewSlideIdx(idx);
                              }}
                              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-[#3393B8] text-[11px] font-medium text-slate-700 cursor-pointer whitespace-nowrap"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: activeTab === "vision" ? "block" : "none" }}>
                  <div className="space-y-2">
                    <Divider orientation="left" style={{ fontSize: 13 }}>
                      Our Vision
                    </Divider>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="vision_title" label="Vision Headline">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="vision_tagline" label="Vision Tagline">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="vision_description" label="Vision Description">
                      <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="vision_mainImage" label="Vision Main Image URL">
                      <Input />
                    </Form.Item>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                        <UploadOutlined />
                        <span>
                          {uploadingField === "vision_mainImage"
                            ? "Uploading..."
                            : "Upload Main Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFormFileUpload(e.target.files[0], "vision_mainImage");
                            }
                          }}
                        />
                      </label>
                      {ABOUT_PRESET_IMAGES.slice(0, 5).map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            form.setFieldsValue({ vision_mainImage: preset.url });
                            updatePreviewFromForm();
                          }}
                          className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="vision_thumb1_title" label="Thumb 1 Title">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="vision_thumb1_image" label="Thumb 1 Image URL" style={{ marginBottom: 6 }}>
                          <Input />
                        </Form.Item>
                        <label className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                          <UploadOutlined />
                          <span>
                            {uploadingField === "vision_thumb1_image" ? "Uploading..." : "Upload Thumb 1"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFormFileUpload(e.target.files[0], "vision_thumb1_image");
                              }
                            }}
                          />
                        </label>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="vision_thumb2_title" label="Thumb 2 Title">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="vision_thumb2_image" label="Thumb 2 Image URL" style={{ marginBottom: 6 }}>
                          <Input />
                        </Form.Item>
                        <label className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                          <UploadOutlined />
                          <span>
                            {uploadingField === "vision_thumb2_image" ? "Uploading..." : "Upload Thumb 2"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFormFileUpload(e.target.files[0], "vision_thumb2_image");
                              }
                            }}
                          />
                        </label>
                      </Col>
                    </Row>

                    <Divider orientation="left" style={{ fontSize: 13 }}>
                      Our Mission
                    </Divider>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="mission_title" label="Mission Headline">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="mission_tagline" label="Mission Tagline">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="mission_description" label="Mission Description">
                      <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="mission_mainImage" label="Mission Main Image URL">
                      <Input />
                    </Form.Item>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                        <UploadOutlined />
                        <span>
                          {uploadingField === "mission_mainImage"
                            ? "Uploading..."
                            : "Upload Main Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFormFileUpload(e.target.files[0], "mission_mainImage");
                            }
                          }}
                        />
                      </label>
                      {ABOUT_PRESET_IMAGES.slice(0, 5).map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => {
                            form.setFieldsValue({ mission_mainImage: preset.url });
                            updatePreviewFromForm();
                          }}
                          className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="mission_thumb1_title" label="Mission Thumb 1 Title">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="mission_thumb1_image" label="Mission Thumb 1 URL" style={{ marginBottom: 6 }}>
                          <Input />
                        </Form.Item>
                        <label className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                          <UploadOutlined />
                          <span>
                            {uploadingField === "mission_thumb1_image" ? "Uploading..." : "Upload Thumb 1"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFormFileUpload(e.target.files[0], "mission_thumb1_image");
                              }
                            }}
                          />
                        </label>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="mission_thumb2_title" label="Mission Thumb 2 Title">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="mission_thumb2_image" label="Mission Thumb 2 URL" style={{ marginBottom: 6 }}>
                          <Input />
                        </Form.Item>
                        <label className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium cursor-pointer">
                          <UploadOutlined />
                          <span>
                            {uploadingField === "mission_thumb2_image" ? "Uploading..." : "Upload Thumb 2"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleFormFileUpload(e.target.files[0], "mission_thumb2_image");
                              }
                            }}
                          />
                        </label>
                      </Col>
                    </Row>
                  </div>
                </div>

                {activeTab === "director" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Section Heading
                        </label>
                        <Input
                          value={directorMessage.heading}
                          onChange={(e) =>
                            setDirectorMessage((prev) => ({
                              ...prev,
                              heading: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kicker Tagline
                        </label>
                        <Input
                          value={directorMessage.tagline}
                          onChange={(e) =>
                            setDirectorMessage((prev) => ({
                              ...prev,
                              tagline: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Highlight Quote
                      </label>
                      <TextArea
                        rows={2}
                        value={directorMessage.quote}
                        onChange={(e) =>
                          setDirectorMessage((prev) => ({
                            ...prev,
                            quote: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Message
                      </label>
                      <TextArea
                        rows={4}
                        value={directorMessage.message}
                        onChange={(e) =>
                          setDirectorMessage((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Director Name
                        </label>
                        <Input
                          value={directorMessage.directorName}
                          onChange={(e) =>
                            setDirectorMessage((prev) => ({
                              ...prev,
                              directorName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Role &amp; Organization
                        </label>
                        <Input
                          value={directorMessage.directorTitle}
                          onChange={(e) =>
                            setDirectorMessage((prev) => ({
                              ...prev,
                              directorTitle: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Director Portrait URL
                      </label>
                      <Input
                        value={directorMessage.image}
                        onChange={(e) =>
                          setDirectorMessage((prev) => ({
                            ...prev,
                            image: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-700 cursor-pointer">
                          <UploadOutlined />
                          <span>
                            {uploadingField === "director" ? "Uploading..." : "Upload Portrait"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadWithCallback(
                                  e.target.files[0],
                                  "director",
                                  (url) =>
                                    setDirectorMessage((prev) => ({ ...prev, image: url }))
                                );
                              }
                            }}
                          />
                        </label>
                        {ABOUT_PRESET_IMAGES.slice(5).map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() =>
                              setDirectorMessage((prev) => ({ ...prev, image: preset.url }))
                            }
                            className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "team" && (
                  <TeamEditorTab
                    items={teamMembers}
                    onChange={setTeamMembers}
                    uploadingField={uploadingField}
                    onUploadFile={handleUploadWithCallback}
                  />
                )}

                {activeTab === "journey" && (
                  <JourneyEditorTab
                    items={journeyMilestones}
                    onChange={setJourneyMilestones}
                    journeySpeedMs={journeySpeedMs}
                    onJourneySpeedChange={setJourneySpeedMs}
                  />
                )}

                {activeTab === "partners" && (
                  <PartnersEditorTab
                    items={partners}
                    onChange={setPartners}
                    ribbonSpeed={partnersRibbonSpeed}
                    onRibbonSpeedChange={setPartnersRibbonSpeed}
                    uploadingField={uploadingField}
                    onUploadFile={handleUploadWithCallback}
                  />
                )}

                {activeTab === "clients" && (
                  <ClientsEditorTab
                    items={clients}
                    onChange={setClients}
                    ribbonSpeed={clientsRibbonSpeed}
                    onRibbonSpeedChange={setClientsRibbonSpeed}
                    uploadingField={uploadingField}
                    onUploadFile={handleUploadWithCallback}
                  />
                )}

                {activeTab === "feedbacks" && (
                  <FeedbacksEditorTab
                    items={clientFeedbacks}
                    onChange={setClientFeedbacks}
                    feedbackSpeedMs={feedbackSpeedMs}
                    onFeedbackSpeedChange={setFeedbackSpeedMs}
                    uploadingField={uploadingField}
                    onUploadFile={handleUploadWithCallback}
                  />
                )}

                <div style={{ marginTop: 24, textAlign: "right" }}>
                  <Button
                    type="primary"
                    size="large"
                    loading={saving}
                    icon={<SaveOutlined />}
                    onClick={handleSaveAll}
                    style={{
                      background: "#22577A",
                      borderColor: "#22577A",
                      borderRadius: 10,
                      fontWeight: 600,
                    }}
                  >
                    Save &amp; Publish
                  </Button>
                </div>
              </Form>
            </Spin>
          </AdminPortalShell>
        );
      }

export default EditVisionMission;
