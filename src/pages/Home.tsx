import BlogSection from "../components/BlogSection";
import CustomerFeedback from "../components/CustomerFeedback";
import FeaturedProducts from "../components/FeaturedProducts";
import ImageSlider from "../components/ImageSlider";
import PageAdBannerSlideshow from "../components/PageAdBannerSlideshow";
import ServicesCarousel from "../components/ServiceCarousel";

import PageMetadata from "../components/PageMetadata";
import { buildOrganizationJsonLd } from "../utils/seoMetadataHelpers";
import { useSiteSettings } from "../Context/SiteSettingsContext";

function Home() {
  const { contactSettings } = useSiteSettings();

  return (
    <>
      <PageMetadata
        title="Innovista Fabriconix – Architectural Aluminium & Glazing Systems"
        description="Custom architectural aluminium doors, slim-line windows, curtain walls, louvers, and acoustic partitions engineered and installed by Innovista Fabriconix in Sri Lanka."
        canonicalPath="/"
        structuredData={buildOrganizationJsonLd({
          phone: contactSettings.phone,
          email: contactSettings.email,
          address: contactSettings.address,
          sameAs: [
            contactSettings.facebookUrl,
            contactSettings.instagramUrl,
            contactSettings.linkedinUrl,
          ].filter(Boolean),
        })}
      />
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
