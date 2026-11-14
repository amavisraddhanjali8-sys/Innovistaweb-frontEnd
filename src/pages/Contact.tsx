import { useState } from "react";
import {
  FiClock,
  FiExternalLink,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import { useSiteSettings } from "../Context/SiteSettingsContext";
import AboutTaglineHeading from "../components/AboutTaglineHeading";
import InteractiveContactSection from "../components/InteractiveContactSection";
import PageMetadata from "../components/PageMetadata";
import RequestQuoteModal from "../components/RequestQuoteModal";
import ShowcaseHeroSlideshow from "../components/ShowcaseHeroSlideshow";
import type { HeroSlide } from "../utils/aboutContentHelpers";
import { buildOrganizationJsonLd } from "../utils/seoMetadataHelpers";
import {
  CONTACT_DEPARTMENTS,
  CONTACT_LOCATIONS,
} from "../utils/siteContentHelpers";

const CONTACT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "contact-hero-1",
    headline: "Contact Innovista",
    subheadline: "Sales desks, CAD support, fabrication plant, and showrooms across Sri Lanka.",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "contact-hero-2",
    headline: "Visit Our Showrooms",
    subheadline: "Inspect full-scale slim sliding doors, acoustic glass, and finishes in person.",
    image: "/assets/products/showroom.jpg",
  },
];

export default function Contact() {
  const { contactSettings } = useSiteSettings();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  return (
    <div className="w-full bg-white flex flex-col">
      <PageMetadata
        title="Contact Innovista Fabriconix – Colombo & Kandy Desks"
        description="Reach Innovista Fabriconix sales, CAD engineering, and fabrication desks. Call, WhatsApp, or visit our Nawala, Kelaniya, and Kandy showrooms."
        canonicalPath="/contact"
        ogImage="/assets/products/showroom.jpg"
        structuredData={buildOrganizationJsonLd({
          url:
            typeof window !== "undefined"
              ? `${window.location.origin}/contact`
              : undefined,
          phone: contactSettings.phone,
          email: contactSettings.email,
          address: contactSettings.address,
          sameAs: [contactSettings.facebookUrl, contactSettings.instagramUrl],
        })}
      />
      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        productName="Showroom Consultation & Measurement"
        defaultInquiryType="Site Measurement Visit"
      />

      <ShowcaseHeroSlideshow
        slides={CONTACT_HERO_SLIDES}
        slideshowSpeedMs={5000}
        ariaLabel="Contact Innovista locations"
        eyebrowText="Direct Channels"
      />

      {/* Section 1: Department Contact Desks */}
      <section className="w-full bg-white py-10 sm:py-12">
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Speak With Specialists"
            heading="Department Desks"
            tagline="Call, email, or book a visit directly with the right team."
            align="center"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT_DEPARTMENTS.map((dept, idx) => {
              const displayPhone = idx === 0 ? contactSettings.phone : dept.phone;
              const displayEmail = idx === 0 ? contactSettings.email : dept.email;
              return (
                <div
                  key={dept.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4 hover:border-[#3393B8]/60 hover:shadow-sm transition-all"
                >
                  <div>
                    <h3
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="text-[16px] font-bold text-[#14171A] m-0"
                    >
                      {dept.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#5F6672] m-0 leading-relaxed">
                      {dept.role}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="silent-ring-beacon relative inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-50 text-[#3393B8] shrink-0">
                          <FiPhone className="silent-ring-handset text-xs" />
                        </span>
                        <span className="font-semibold tabular-nums">{displayPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiMail className="text-[#3393B8] shrink-0 ml-1" />
                        <span className="truncate">{displayEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <FiClock className="text-slate-400 shrink-0 ml-1" />
                        <span>{dept.hours}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                      className="flex-1 text-center px-3 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold no-underline"
                    >
                      Call Desk
                    </a>
                    <a
                      href={`mailto:${displayEmail}`}
                      className="flex-1 text-center px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
                    >
                      Email
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: Physical Locations & Showrooms */}
      <section className="w-full bg-[#F8FAFC] py-10 sm:py-12 border-y border-slate-200/80">
        <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          <AboutTaglineHeading
            kicker="Showrooms & Plant"
            heading="Our Locations"
            tagline="Visit our showrooms or CNC manufacturing hub."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONTACT_LOCATIONS.map((loc) => (
              <div
                key={loc.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-slate-200 text-[11px] font-semibold text-[#22577A]">
                    {loc.badge}
                  </span>
                  <h3
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="mt-2.5 text-[17px] font-bold text-[#14171A] m-0"
                  >
                    {loc.name}
                  </h3>
                  <div className="mt-3 space-y-2 text-xs text-[#5F6672]">
                    <div className="flex items-start gap-2">
                      <FiMapPin className="text-[#3393B8] shrink-0 mt-0.5" />
                      <span>{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="text-[#3393B8] shrink-0" />
                      <span>{loc.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-[#3393B8] shrink-0" />
                      <span className="font-semibold text-[#14171A]">
                        {loc.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <a
                    href={loc.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-[#14171A] no-underline"
                  >
                    <span>Directions</span>
                    <FiExternalLink className="text-xs" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setQuoteModalOpen(true)}
                    className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs font-semibold cursor-pointer"
                  >
                    Book Visit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Interactive 3D Get In Touch, Shuffle Desks & Form */}
      <section className="w-full bg-[#F8FAFC]">
        <InteractiveContactSection variant="page" idPrefix="contact-page" />
      </section>
    </div>
  );
}
