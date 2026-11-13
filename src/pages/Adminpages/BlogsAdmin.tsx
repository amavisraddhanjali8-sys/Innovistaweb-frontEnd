import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeOutlined,
  HomeOutlined,
  LinkOutlined,
  PlusOutlined,
  SaveOutlined,
  StarOutlined,
  SyncOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import { moveArrayItem } from "../../utils/pageAdsHelpers";
import {
  BLOGGER_COVER_FALLBACKS,
  DEFAULT_BLOGGER_CONFIG,
  DEFAULT_BLOG_POSTS,
  getHomePageBlogs,
  type BlogPostItem,
  type BloggerConnectionConfig,
} from "../../utils/blogBloggerHelpers";

const CATEGORY_OPTIONS = [
  { label: "Engineering", value: "Engineering" },
  { label: "Design Craft", value: "Design Craft" },
  { label: "Acoustic Systems", value: "Acoustic Systems" },
  { label: "Safety & Codes", value: "Safety & Codes" },
  { label: "Materials", value: "Materials" },
  { label: "Blogger Post", value: "Blogger Post" },
];

export default function BlogsAdmin() {
  const [posts, setPosts] = useState<BlogPostItem[]>(DEFAULT_BLOG_POSTS);
  const [config, setConfig] = useState<BloggerConnectionConfig>(
    DEFAULT_BLOGGER_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msgApi, msgContextHolder] = message.useMessage();

  // Blogger config inputs
  const [blogUrlInput, setBlogUrlInput] = useState("");
  const [blogIdInput, setBlogIdInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [autoSyncOnVisit, setAutoSyncOnVisit] = useState(true);

  // Create / Edit Blog modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState("Engineering");
  const [draftAuthor, setDraftAuthor] = useState("Innovista Editorial");
  const [draftCoverImage, setDraftCoverImage] = useState(
    BLOGGER_COVER_FALLBACKS[0]
  );
  const [draftExcerpt, setDraftExcerpt] = useState("");
  const [draftBodyHtml, setDraftBodyHtml] = useState("");
  const [draftBloggerUrl, setDraftBloggerUrl] = useState("");
  const [draftSource, setDraftSource] = useState<"local" | "blogger">("local");
  const [draftFeatured, setDraftFeatured] = useState(false);
  const [draftShowOnHome, setDraftShowOnHome] = useState(true);
  const [savingModal, setSavingModal] = useState(false);

  const loadBlogsAndConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AxiosConfig.get<{
        posts?: BlogPostItem[];
        config?: BloggerConnectionConfig;
      }>("/api/blogs");
      if (Array.isArray(res.data?.posts)) {
        setPosts(res.data.posts);
      }
      if (res.data?.config) {
        const cfg = res.data.config;
        setConfig(cfg);
        setBlogUrlInput(cfg.blogUrl || "");
        setBlogIdInput(cfg.blogId || "");
        setAutoSyncOnVisit(cfg.autoSyncOnVisit !== false);
      }
    } catch {
      msgApi.error("Could not load blog posts and Blogger settings.");
    } finally {
      setLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    loadBlogsAndConfig();
  }, [loadBlogsAndConfig]);

  const homePosts = useMemo(() => {
    const selected = posts
      .filter((p) => p.showOnHome)
      .sort((a, b) => (a.homeOrder || 999) - (b.homeOrder || 999));
    return selected;
  }, [posts]);

  const bloggerCount = useMemo(
    () => posts.filter((p) => p.source === "blogger").length,
    [posts]
  );

  const handleSyncBlogger = async () => {
    const trimmedUrl = blogUrlInput.trim();
    const trimmedBlogId = blogIdInput.trim();
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedUrl && !(trimmedBlogId && trimmedKey)) {
      msgApi.error(
        "Enter your Blogger.com URL (e.g. https://yourblog.blogspot.com)."
      );
      return;
    }

    try {
      setSyncing(true);
      const res = await AxiosConfig.post("/api/blogs/sync-blogger", {
        blogUrl: trimmedUrl,
        blogId: trimmedBlogId,
        apiKey: trimmedKey || undefined,
        autoSyncOnVisit,
      });
      if (Array.isArray(res.data?.posts)) {
        setPosts(res.data.posts);
      }
      if (res.data?.config) {
        setConfig(res.data.config);
      }
      msgApi.success(res.data?.message || "Synced posts from Blogger.com!");
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; config?: BloggerConnectionConfig } } })?.response?.data;
      if (errData?.config) {
        setConfig(errData.config);
      }
      msgApi.warning(
        errData?.message ||
          "Saved Blogger settings, though live remote feed fetch failed."
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfigOnly = async () => {
    try {
      setSyncing(true);
      const res = await AxiosConfig.put("/api/blogs/config", {
        blogUrl: blogUrlInput.trim(),
        blogId: blogIdInput.trim(),
        apiKey: apiKeyInput.trim() || undefined,
        autoSyncOnVisit,
      });
      if (res.data?.config) {
        setConfig(res.data.config);
      }
      msgApi.success(res.data?.message || "Blogger configuration saved.");
    } catch {
      msgApi.error("Failed to save Blogger settings.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectBlogger = async () => {
    try {
      setSyncing(true);
      const res = await AxiosConfig.put("/api/blogs/config", {
        disconnect: true,
        removeSyncedPosts: false,
      });
      if (res.data?.config) setConfig(res.data.config);
      if (Array.isArray(res.data?.posts)) setPosts(res.data.posts);
      setBlogUrlInput("");
      setBlogIdInput("");
      setApiKeyInput("");
      msgApi.success("Blogger connection disconnected.");
    } catch {
      msgApi.error("Failed to disconnect Blogger.");
    } finally {
      setSyncing(false);
    }
  };

  const persistHomeIds = async (orderedHomeIds: string[], toastMsg?: string) => {
    try {
      setSavingHome(true);
      const res = await AxiosConfig.put("/api/blogs/home-selection", {
        homeIds: orderedHomeIds,
      });
      if (Array.isArray(res.data?.posts)) {
        setPosts(res.data.posts);
      }
      if (toastMsg) msgApi.success(toastMsg);
    } catch {
      msgApi.error("Failed to update Home page blog selection.");
    } finally {
      setSavingHome(false);
    }
  };

  const handleToggleShowOnHome = async (post: BlogPostItem, checked: boolean) => {
    const currentHomeIds = homePosts.map((p) => p.id);
    const nextHomeIds = checked
      ? Array.from(new Set([...currentHomeIds, post.id]))
      : currentHomeIds.filter((id) => id !== post.id);
    await persistHomeIds(
      nextHomeIds,
      checked
        ? `"${post.title}" will now show on the Home page.`
        : `"${post.title}" removed from Home page.`
    );
  };

  const handleMoveHomeOrder = async (fromIdx: number, toIdx: number) => {
    const reordered = moveArrayItem(homePosts, fromIdx, toIdx);
    await persistHomeIds(
      reordered.map((p) => p.id),
      "Updated Home page blog order!"
    );
  };

  const handleToggleFeatured = async (post: BlogPostItem, checked: boolean) => {
    try {
      const res = await AxiosConfig.put(`/api/blogs/${encodeURIComponent(post.id)}`, {
        featured: checked,
      });
      if (Array.isArray(res.data?.posts)) {
        setPosts(res.data.posts);
      }
      msgApi.success(
        checked ? "Pinned to Spotlight!" : "Removed from Spotlight."
      );
    } catch {
      msgApi.error("Could not update spotlight flag.");
    }
  };

  const uploadCoverImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      const uploadedUrl = data.secure_url || data.url;
      if (uploadedUrl) {
        setDraftCoverImage(uploadedUrl);
        msgApi.success("Cover image uploaded!");
        setUploading(false);
        return;
      }
    } catch {
      // Fall back to Data URL below
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraftCoverImage(reader.result);
        msgApi.success("Cover image attached!");
      }
      setUploading(false);
    };
    reader.onerror = () => {
      msgApi.error("Could not read selected image.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setDraftTitle("");
    setDraftCategory("Engineering");
    setDraftAuthor("Innovista Editorial");
    setDraftCoverImage(
      BLOGGER_COVER_FALLBACKS[posts.length % BLOGGER_COVER_FALLBACKS.length]
    );
    setDraftExcerpt("");
    setDraftBodyHtml("<p>Share engineering insights and aluminium system notes here.</p>");
    setDraftBloggerUrl(config.blogUrl || "");
    setDraftSource(config.blogUrl ? "blogger" : "local");
    setDraftFeatured(false);
    setDraftShowOnHome(true);
    setModalOpen(true);
  };

  const openEditModal = (post: BlogPostItem) => {
    setEditingId(post.id);
    setDraftTitle(post.title);
    setDraftCategory(post.category);
    setDraftAuthor(post.author);
    setDraftCoverImage(post.coverImage);
    setDraftExcerpt(post.excerpt);
    setDraftBodyHtml(post.contentHtml);
    setDraftBloggerUrl(post.bloggerUrl || "");
    setDraftSource(post.source);
    setDraftFeatured(post.featured);
    setDraftShowOnHome(post.showOnHome);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    const title = draftTitle.trim();
    if (!title) {
      msgApi.error("Enter an article title.");
      return;
    }

    const payload = {
      title,
      category: draftCategory || "Engineering",
      labels: [draftCategory || "Engineering"],
      author: draftAuthor.trim() || "Innovista Editorial",
      coverImage: draftCoverImage.trim() || BLOGGER_COVER_FALLBACKS[0],
      excerpt: draftExcerpt.trim(),
      contentHtml: draftBodyHtml.trim() || `<p>${title}</p>`,
      bloggerUrl: draftBloggerUrl.trim(),
      source: draftSource,
      featured: draftFeatured,
      showOnHome: draftShowOnHome,
    };

    try {
      setSavingModal(true);
      if (editingId) {
        const res = await AxiosConfig.put(
          `/api/blogs/${encodeURIComponent(editingId)}`,
          payload
        );
        if (Array.isArray(res.data?.posts)) setPosts(res.data.posts);
        msgApi.success(`Updated "${title}"!`);
      } else {
        const res = await AxiosConfig.post("/api/blogs", payload);
        if (Array.isArray(res.data?.posts)) setPosts(res.data.posts);
        msgApi.success(`Published "${title}"!`);
      }
      setModalOpen(false);
    } catch {
      msgApi.error("Failed to save blog post.");
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeletePost = async (post: BlogPostItem) => {
    try {
      const res = await AxiosConfig.delete(
        `/api/blogs/${encodeURIComponent(post.id)}`
      );
      if (Array.isArray(res.data?.posts)) {
        setPosts(res.data.posts);
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
      }
      msgApi.success(`Deleted "${post.title}".`);
    } catch {
      msgApi.error("Could not delete blog post.");
    }
  };

  const effectiveHomePreview = getHomePageBlogs(posts);

  return (
    <AdminPortalShell
      sectionCode="BLOGGER-CMS"
      sectionTitle="Blogs & Blogger.com Publisher"
      sectionSubtitle="Connect your Blogger.com publication to share posts automatically on /blogs and select which articles feature on the Home page."
      kpiLabel="Home Page Blogs"
      kpiValue={homePosts.length}
      kpiNote={`${posts.length} total · ${bloggerCount} Blogger`}
      kpiStatusText={
        config.blogUrl ? "BLOGGER LINKED" : "JOURNAL ACTIVE"
      }
      kpiStatusTone={config.blogUrl ? "green" : "navy"}
      headerAction={{
        label: "New Blog Post",
        onClick: openCreateModal,
        icon: <PlusOutlined />,
      }}
      railPrimaryAction={{
        label: syncing ? "Syncing Blogger..." : "Sync Blogger.com Now",
        onClick: handleSyncBlogger,
        icon: <SyncOutlined spin={syncing} />,
        loading: syncing,
      }}
      bannerLeftLines={[
        { label: "Total Posts", value: String(posts.length) },
        { label: "From Blogger.com", value: String(bloggerCount) },
        { label: "Selected for Home", value: String(homePosts.length) },
      ]}
      bannerRightTitle="Blogger.com Feed Bridge"
      bannerRightLines={[
        config.blogUrl
          ? `Linked: ${config.blogUrl}`
          : "No external Blogger.com URL linked yet.",
        config.lastSyncedAt
          ? `Last Sync: ${new Date(config.lastSyncedAt).toLocaleString()}`
          : "Ready to connect any public Blogspot or custom Blogger domain.",
      ]}
    >
      {msgContextHolder}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card 1: Blogger.com Connection & Auto-Share Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Blogger.com Live Sync Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  When you publish on Blogger.com, posts automatically appear in the public Blogs page feed.
                </p>
              </div>
              <a
                href="/#/blogs"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#22577A] px-3.5 py-2 text-xs font-semibold text-[#22577A] no-underline transition-colors shrink-0"
              >
                <EyeOutlined />
                <span>View Public Blogs</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <label
                  htmlFor="blogger-url-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Blogger.com Blog URL
                </label>
                <Input
                  id="blogger-url-input"
                  prefix={<LinkOutlined className="text-slate-400" />}
                  placeholder="https://yourjournal.blogspot.com"
                  value={blogUrlInput}
                  onChange={(e) => setBlogUrlInput(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="blogger-id-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Blogger Blog ID (Optional — for Google Blogger API v3)
                </label>
                <Input
                  id="blogger-id-input"
                  placeholder="e.g. 2399953"
                  value={blogIdInput}
                  onChange={(e) => setBlogIdInput(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="blogger-apikey-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Google Blogger API Key (Optional)
                </label>
                <Input.Password
                  id="blogger-apikey-input"
                  placeholder="Leave blank to use public Blogger JSON/Atom feed"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <Switch
                  checked={autoSyncOnVisit}
                  onChange={(checked) => setAutoSyncOnVisit(checked)}
                  size="small"
                />
                <span>Auto-refresh Blogger.com posts when visitors open Home or Blogs</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {config.blogUrl && (
                  <Popconfirm
                    title="Disconnect Blogger.com URL?"
                    description="Previously synced posts stay visible until deleted."
                    onConfirm={handleDisconnectBlogger}
                    okText="Disconnect"
                    cancelText="Cancel"
                  >
                    <Button icon={<DisconnectOutlined />} danger size="middle">
                      Disconnect
                    </Button>
                  </Popconfirm>
                )}
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveConfigOnly}
                  loading={syncing}
                >
                  Save Settings
                </Button>
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={syncing} />}
                  onClick={handleSyncBlogger}
                  loading={syncing}
                >
                  Save &amp; Sync Blogger.com
                </Button>
              </div>
            </div>

            {config.lastSyncMessage && (
              <div
                className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                  config.lastSyncStatus === "error"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : config.lastSyncStatus === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {config.lastSyncMessage}
              </div>
            )}
          </div>

          {/* Card 2: Curated Home Page Blog Sequence */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HomeOutlined className="text-[#22577A]" />
                  <span>Selected for Home Page ({homePosts.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle "Show on Home" on any post below to feature it on the landing page carousel, and adjust display order here.
                </p>
              </div>
              {savingHome && (
                <span className="text-xs font-semibold text-[#3393B8]">
                  Updating Home order...
                </span>
              )}
            </div>

            {homePosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
                No blogs explicitly pinned to Home yet — currently showing the latest {effectiveHomePreview.length} articles automatically. Toggle "Show on Home" on any post below to curate the Home section manually.
              </div>
            ) : (
              <div className="space-y-2.5">
                {homePosts.map((post, idx) => (
                  <div
                    key={`home-${post.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-[#22577A] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#3393B8]">
                          {post.category} · {post.date}
                          {post.source === "blogger" ? " · Blogger.com" : ""}
                        </div>
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {post.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={idx === 0 || savingHome}
                        onClick={() => handleMoveHomeOrder(idx, idx - 1)}
                        aria-label={`Move ${post.title} up on Home`}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={idx === homePosts.length - 1 || savingHome}
                        onClick={() => handleMoveHomeOrder(idx, idx + 1)}
                        aria-label={`Move ${post.title} down on Home`}
                      />
                      <Button
                        size="small"
                        danger
                        onClick={() => handleToggleShowOnHome(post, false)}
                      >
                        Remove from Home
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: All Blogs Manager (Journal + Synced Blogger Posts) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  All Journal &amp; Blogger Posts ({posts.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish new essays, edit details, pin spotlight items, or toggle Home visibility.
                </p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Create Blog Post
              </Button>
            </div>

            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-slate-200 bg-white hover:border-[#3393B8]/50 p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-24 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                        <span className="font-semibold text-[#22577A]">
                          {post.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{post.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.readTime}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            post.source === "blogger"
                              ? "font-semibold text-[#8E2A3B]"
                              : "font-semibold text-slate-600"
                          }
                        >
                          {post.source === "blogger"
                            ? "Blogger.com"
                            : "Innovista Journal"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5 mb-0.5 truncate">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-500 m-0 line-clamp-1">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <Switch
                          size="small"
                          checked={post.showOnHome}
                          onChange={(checked) =>
                            handleToggleShowOnHome(post, checked)
                          }
                        />
                        <span>Show on Home</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                        <Switch
                          size="small"
                          checked={post.featured}
                          onChange={(checked) =>
                            handleToggleFeatured(post, checked)
                          }
                        />
                        <StarOutlined className="text-amber-500" />
                        <span>Spotlight</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/#/blogs?post=${encodeURIComponent(post.id)}`}
                        aria-label={`View ${post.title} on Blogs page`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-200 text-slate-600 hover:border-[#22577A] hover:text-[#22577A] no-underline"
                        title="Open on /blogs"
                      >
                        <EyeOutlined />
                      </a>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(post)}
                        aria-label={`Edit ${post.title}`}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title={`Delete "${post.title}"?`}
                        okText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => handleDeletePost(post)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`Delete ${post.title}`}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Blog Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <span className="font-bold text-slate-900">
            {editingId ? "Edit Blog Article" : "Publish New Blog Article"}
          </span>
        }
        okText={editingId ? "Save Changes" : "Publish Article"}
        confirmLoading={savingModal}
        onOk={handleSaveModal}
        width={680}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="blog-draft-title"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Article Title *
            </label>
            <Input
              id="blog-draft-title"
              placeholder="e.g. Coastal Wind-Load Detailing for Double-Glazed Sliders"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="blog-draft-category"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category
              </label>
              <Select
                id="blog-draft-category"
                style={{ width: "100%" }}
                value={draftCategory}
                options={CATEGORY_OPTIONS}
                onChange={(val) => setDraftCategory(val)}
              />
            </div>

            <div>
              <label
                htmlFor="blog-draft-author"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Author
              </label>
              <Input
                id="blog-draft-author"
                value={draftAuthor}
                onChange={(e) => setDraftAuthor(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="blog-draft-source"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Origin Source
              </label>
              <Select
                id="blog-draft-source"
                style={{ width: "100%" }}
                value={draftSource}
                options={[
                  { label: "Innovista Journal", value: "local" },
                  { label: "Blogger.com Synced", value: "blogger" },
                ]}
                onChange={(val) => setDraftSource(val)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cover Image
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-[#22577A] px-3 py-1.5 text-xs font-semibold text-[#22577A] cursor-pointer">
                <UploadOutlined />
                <span>{uploading ? "Uploading..." : "Upload Cover"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    uploadCoverImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <Select
                style={{ minWidth: 220 }}
                value={
                  BLOGGER_COVER_FALLBACKS.includes(draftCoverImage)
                    ? draftCoverImage
                    : undefined
                }
                placeholder="Or pick verified cover..."
                options={BLOGGER_COVER_FALLBACKS.map((url, idx) => ({
                  label: `Architectural Photo ${idx + 1}`,
                  value: url,
                }))}
                onChange={(val) => setDraftCoverImage(val)}
              />
              <Input
                style={{ flex: 1, minWidth: 200 }}
                value={draftCoverImage}
                onChange={(e) => setDraftCoverImage(e.target.value)}
                placeholder="/assets/about/facade.jpg"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="blog-draft-blogger-url"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Original Blogger Post URL (Optional)
            </label>
            <Input
              id="blog-draft-blogger-url"
              placeholder="https://yourjournal.blogspot.com/2026/05/post-slug.html"
              value={draftBloggerUrl}
              onChange={(e) => setDraftBloggerUrl(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="blog-draft-excerpt"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Short Excerpt
            </label>
            <Input.TextArea
              id="blog-draft-excerpt"
              rows={2}
              value={draftExcerpt}
              onChange={(e) => setDraftExcerpt(e.target.value)}
              placeholder="Concise 1-2 sentence summary shown on cards..."
            />
          </div>

          <div>
            <label
              htmlFor="blog-draft-body"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Full Essay Body (HTML or Paragraphs)
            </label>
            <Input.TextArea
              id="blog-draft-body"
              rows={5}
              value={draftBodyHtml}
              onChange={(e) => setDraftBodyHtml(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <Switch
                checked={draftShowOnHome}
                onChange={(c) => setDraftShowOnHome(c)}
              />
              <span>Show on Home Page</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <Switch
                checked={draftFeatured}
                onChange={(c) => setDraftFeatured(c)}
              />
              <span>Pin to Blogs Page Spotlight</span>
            </label>
          </div>
        </div>
      </Modal>
    </AdminPortalShell>
  );
}
