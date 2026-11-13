import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BLOG_POSTS,
  buildBlogEditorialLayout,
  buildBloggerAtomUrl,
  buildBloggerFeedUrl,
  buildExcerpt,
  computeReadTime,
  filterBlogPosts,
  getBlogCategories,
  getHomePageBlogs,
  getSpotlightBlogs,
  mergeSyncedBloggerPosts,
  normalizeBloggerOrigin,
  parseBloggerApiV3Response,
  parseBloggerAtomFeed,
  parseBloggerJsonFeed,
  sanitizeBlogHtml,
  upscaleBloggerImageUrl,
} from "./blogBloggerHelpers.ts";

describe("blogBloggerHelpers", () => {
  it("normalizes Blogger domains and builds JSON / Atom feed URLs cleanly", () => {
    assert.equal(
      normalizeBloggerOrigin("innovista-journal.blogspot.com/2025/05/post.html"),
      "https://innovista-journal.blogspot.com"
    );
    assert.equal(
      normalizeBloggerOrigin("https://journal.innovista.lk/"),
      "https://journal.innovista.lk"
    );
    assert.equal(
      buildBloggerFeedUrl("innovista-journal.blogspot.com", 10),
      "https://innovista-journal.blogspot.com/feeds/posts/default?alt=json&max-results=10"
    );
    assert.equal(
      buildBloggerAtomUrl("https://innovista.blogspot.com"),
      "https://innovista.blogspot.com/feeds/posts/default?max-results=25"
    );
  });

  it("upscales Blogger s72-c thumbnails and sanitizes unsafe HTML scripts/handlers", () => {
    assert.equal(
      upscaleBloggerImageUrl("http://bp.blogspot.com/abc/s72-c/facade.jpg"),
      "https://bp.blogspot.com/abc/s1200/facade.jpg"
    );
    const cleaned = sanitizeBlogHtml(
      `<p onclick="alert(1)">Hello <strong>Glazing</strong></p><script>evil()</script><a href="javascript:void(0)">Link</a>`
    );
    assert.equal(cleaned.includes("<script>"), false);
    assert.equal(cleaned.includes("onclick"), false);
    assert.equal(cleaned.includes("javascript:"), false);
    assert.equal(cleaned.includes("<strong>Glazing</strong>"), true);
  });

  it("parses Blogger JSON feed entries including cover images, labels, and links", () => {
    const sampleFeed = {
      feed: {
        title: { $t: "Innovista Blogger Journal" },
        entry: [
          {
            id: { $t: "tag:blogger.com,1999:blog-1.post-999" },
            title: { $t: "Acoustic Curtain Walls for Tropical Towers" },
            content: {
              $t: `<p>Thermal and acoustic testing summary for high-rise curtain walls in Colombo.</p><img src="http://bp.blogspot.com/img/s320/curtain.jpg" />`,
            },
            published: { $t: "2025-06-01T10:00:00.000Z" },
            category: [{ term: "Curtain Walls" }, { term: "Acoustics" }],
            author: [{ name: { $t: "Rohan W." } }],
            link: [
              {
                rel: "alternate",
                href: "https://innovista.blogspot.com/2025/06/acoustic-curtain-walls.html",
              },
            ],
          },
        ],
      },
    };

    const parsed = parseBloggerJsonFeed(sampleFeed);
    assert.equal(parsed.blogTitle, "Innovista Blogger Journal");
    assert.equal(parsed.posts.length, 1);
    assert.equal(parsed.posts[0].source, "blogger");
    assert.equal(parsed.posts[0].category, "Curtain Walls");
    assert.equal(
      parsed.posts[0].coverImage,
      "https://bp.blogspot.com/img/s1200/curtain.jpg"
    );
    assert.equal(
      parsed.posts[0].bloggerUrl,
      "https://innovista.blogspot.com/2025/06/acoustic-curtain-walls.html"
    );
    assert.equal(parsed.posts[0].author, "Rohan W.");
  });

  it("parses Atom XML and Blogger v3 API items accurately", () => {
    const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Studio Dispatch</title>
        <entry>
          <id>tag:blogger.com,1999:blog-1.post-77</id>
          <title>Frameless Louver Systems</title>
          <published>2025-05-20T08:00:00Z</published>
          <author><name>Anushka</name></author>
          <category term="Louvers" />
          <link rel="alternate" type="text/html" href="https://studio.blogspot.com/louvers.html" />
          <content type="html">&lt;p&gt;Ventilation blades engineered for airflow.&lt;/p&gt;</content>
        </entry>
      </feed>`;

    const atomParsed = parseBloggerAtomFeed(atomXml);
    assert.equal(atomParsed.blogTitle, "Studio Dispatch");
    assert.equal(atomParsed.posts[0].title, "Frameless Louver Systems");
    assert.equal(atomParsed.posts[0].category, "Louvers");
    assert.equal(
      atomParsed.posts[0].bloggerUrl,
      "https://studio.blogspot.com/louvers.html"
    );

    const v3Parsed = parseBloggerApiV3Response({
      items: [
        {
          id: "88123",
          title: "Patio Bi-Fold Guide",
          content: "<p>Multi-fold anodized openings for villas.</p>",
          published: "2025-06-10T12:00:00Z",
          url: "https://studio.blogspot.com/bifold.html",
          labels: ["Doors"],
          author: { displayName: "Tharindu" },
        },
      ],
    });
    assert.equal(v3Parsed.posts[0].category, "Doors");
    assert.equal(v3Parsed.posts[0].source, "blogger");
  });

  it("merges synced Blogger posts while preserving existing Home page selection", () => {
    const initial = [
      ...DEFAULT_BLOG_POSTS.slice(0, 2),
      {
        ...DEFAULT_BLOG_POSTS[2],
        id: "blogger-old-1",
        externalId: "ext-1",
        source: "blogger" as const,
        bloggerUrl: "https://test.blogspot.com/p1.html",
        showOnHome: true,
        homeOrder: 1,
        featured: true,
      },
    ];

    const incoming = [
      {
        ...DEFAULT_BLOG_POSTS[2],
        id: "new-temp-1",
        externalId: "ext-1",
        title: "Updated From Blogger",
        source: "blogger" as const,
        bloggerUrl: "https://test.blogspot.com/p1.html",
        showOnHome: false,
        homeOrder: 99,
        featured: false,
      },
      {
        ...DEFAULT_BLOG_POSTS[3],
        id: "new-temp-2",
        externalId: "ext-2",
        title: "Brand New Post Created On Blogger",
        publishedAt: "2025-07-01T00:00:00Z",
        source: "blogger" as const,
        bloggerUrl: "https://test.blogspot.com/p2.html",
        showOnHome: false,
        homeOrder: 100,
        featured: false,
      },
    ];

    const res = mergeSyncedBloggerPosts(initial, incoming);
    assert.equal(res.updatedCount, 1);
    assert.equal(res.addedCount, 1);
    const updatedPost = res.merged.find((p) => p.externalId === "ext-1");
    assert.equal(updatedPost?.title, "Updated From Blogger");
    assert.equal(updatedPost?.showOnHome, true);
    assert.equal(updatedPost?.homeOrder, 1);
    assert.equal(
      res.merged.some((p) => p.title === "Brand New Post Created On Blogger"),
      true
    );
  });

  it("selects Home page blogs in homeOrder and filters by category, source, and query", () => {
    const homeBlogs = getHomePageBlogs(DEFAULT_BLOG_POSTS);
    assert.equal(homeBlogs.length, 4);
    assert.equal(homeBlogs[0].homeOrder, 1);

    const categories = getBlogCategories(DEFAULT_BLOG_POSTS);
    assert.equal(categories[0], "All");
    assert.equal(categories.includes("Engineering"), true);

    const engOnly = filterBlogPosts(DEFAULT_BLOG_POSTS, "Engineering", "thermal");
    assert.equal(engOnly.length, 1);

    const spotlights = getSpotlightBlogs(DEFAULT_BLOG_POSTS);
    assert.equal(spotlights.length, 3);

    assert.equal(computeReadTime("one two three"), "1 min read");
    assert.equal(buildExcerpt("<p>Hello   world</p>"), "Hello world");
  });

  it("builds 3-column editorial spotlight and balanced 4-column category sections deterministically", () => {
    const layout = buildBlogEditorialLayout(DEFAULT_BLOG_POSTS);
    assert.ok(layout.centerLead);
    assert.equal(layout.leftColumn.length, 2);
    assert.equal(layout.latestRail.length, 5);
    assert.equal(
      layout.leftColumn.some((p) => p.id === layout.centerLead?.id),
      false
    );
    assert.equal(layout.categorySections.length, 3);
    assert.ok(layout.categorySections.every((sec) => sec.posts.length === 4));

    const withBlogger = [
      {
        ...DEFAULT_BLOG_POSTS[0],
        id: "blogger-sync-1",
        source: "blogger" as const,
        category: "Blogger Post",
        publishedAt: "2026-01-15T10:00:00.000Z",
      },
      ...DEFAULT_BLOG_POSTS,
    ];
    const bloggerLayout = buildBlogEditorialLayout(withBlogger);
    assert.equal(bloggerLayout.categorySections[0].category, "Blogger.com Dispatches");
    assert.equal(bloggerLayout.categorySections[0].sourceFilter, "blogger");
  });
});
