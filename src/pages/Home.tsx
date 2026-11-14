import { useEffect, useState } from "react";
import BlogSection from "../components/BlogSection";
import CustomerFeedback from "../components/CustomerFeedback";
import FeaturedProducts from "../components/FeaturedProducts";
import HomeSearchBar from "../components/HomeSearchBar";
import ImageSlider from "../components/ImageSlider";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import ServicesCarousel from "../components/ServiceCarousel";
import PageMetadata from "../components/PageMetadata";
import AxiosConfig from "../Context/AxiosConfig";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import {
  DEFAULT_OG_IMAGE,
  buildOrganizationJsonLd,
  resolveOgImageUrl,
} from "../utils/seoMetadataHelpers";
import {
  normalizeHomeSlideshowCms,
  type HomeSlideshowCmsPayload,
} from "../utils/homeSlideshowHelpers";

function Home() {
  const { contactSettings } = useSiteSettings();
  const [heroOgImage, setHeroOgImage] = useState<string>(DEFAULT_OG_IMAGE);

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ data?: Partial<HomeSlideshowCmsPayload> }>(
      "/api/home-slideshow"
    )
      .then((res) => {
        if (!active || !res.data?.data) return;
        const normalized = normalizeHomeSlideshowCms(res.data.data);
        const firstActive = normalized.slides.find((s) => s.active !== false);
        const candidate =
          firstActive?.mediaType === "video"
            ? firstActive.posterUrl
            : firstActive?.mediaUrl;
        if (candidate && candidate.trim()) {
          setHeroOgImage(candidate.trim());
        }
      })
      .catch(() => {
        // Keep default showroom OG image
      });
    return () => {
      active = false;
    };
  }, []);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <PageMetadata
        title="Innovista Fabriconix – Architectural Aluminium & Glazing Systems"
        description="Custom architectural aluminium doors, slim-line windows, curtain walls, louvers, and acoustic partitions engineered and installed by Innovista Fabriconix in Sri Lanka."
        canonicalPath="/"
        ogImage={heroOgImage}
        structuredData={buildOrganizationJsonLd({
          url: origin || "https://www.innovistafabriconix.lk",
          phone: contactSettings.phone,
          email: contactSettings.email,
          address: contactSettings.address,
          logo: resolveOgImageUrl(origin, heroOgImage),
          sameAs: [
            contactSettings.facebookUrl,
            contactSettings.instagramUrl,
            contactSettings.linkedinUrl,
          ].filter(Boolean),
        })}
      />
      <HomeSearchBar />
      <div
        style={{
          position: "relative",
          display: "flex",
          marginBottom: "50px",
          justifyContent: "center",
        }}
      >
        <ImageSlider />
      </div>
      <PageAdBannerSlideshow pageKey="home" />
      <ServicesCarousel />
      <FeaturedProducts />
      <CustomerFeedback/>
      <BlogSection/>
    </>
  );
}

export default Home;
