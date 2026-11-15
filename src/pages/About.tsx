import { useState, useEffect } from "react";
import AxiosConfig from "../Context/AxiosConfig";
import AboutHead from "../components/AboutHead";
import VisionSection from "../components/VisionSection";
import PageMetadata from "../components/PageMetadata";
import {
  ClientFeedbackSection,
  DirectorMessageSection,
  MeetTheTeamSection,
  OurClientsSection,
  OurJourneySection,
  OurPartnersSection,
} from "../components/AboutSections";
import {
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
  normalizeAboutCmsPayload,
  type AboutCmsPayload,
} from "../utils/aboutContentHelpers";
import { DEFAULT_HERO_THEME } from "../utils/heroThemeHelpers";

const INITIAL_CMS_STATE: AboutCmsPayload = {
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
  heroTheme: DEFAULT_HERO_THEME,
};

function About() {
  const [cmsData, setCmsData] = useState<AboutCmsPayload>(INITIAL_CMS_STATE);

  useEffect(() => {
    let active = true;
    const loadAboutContent = async () => {
      try {
        const res = await AxiosConfig.get("/about/vision-mission");
        if (!active || !res.data) return;
        const rawPayload = res.data?.data ?? res.data;
        const normalized = normalizeAboutCmsPayload(rawPayload, INITIAL_CMS_STATE);
        setCmsData(normalized);
      } catch {
        // Fallback to verified local defaults
      }
    };

    loadAboutContent();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full bg-white flex flex-col">
      <PageMetadata
        title="About Us — Engineering Heritage, Vision & Leadership"
        description="Discover Innovista Fabriconix's architectural aluminium craftsmanship, leadership message, engineering team, fabrication milestones, and certified partners."
        canonicalPath="/about"
        ogImage="/assets/about/facade.jpg"
      />
      <AboutHead
        slides={cmsData.heroSlides}
        slideshowSpeedMs={cmsData.slideshowSpeedMs}
        heroTheme={cmsData.heroTheme}
      />
      <VisionSection content={cmsData} />
      <DirectorMessageSection data={cmsData.directorMessage} />
      <MeetTheTeamSection members={cmsData.teamMembers} />
      <OurJourneySection
        milestones={cmsData.journeyMilestones}
        journeySpeedMs={cmsData.journeySpeedMs}
      />
      <OurPartnersSection
        partners={cmsData.partners}
        ribbonSpeed={cmsData.partnersRibbonSpeed}
      />
      <OurClientsSection
        clients={cmsData.clients}
        ribbonSpeed={cmsData.clientsRibbonSpeed}
      />
      <ClientFeedbackSection
        feedbacks={cmsData.clientFeedbacks}
        feedbackSpeedMs={cmsData.feedbackSpeedMs}
      />
    </div>
  );
}

export default About;
