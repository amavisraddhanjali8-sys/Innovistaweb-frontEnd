import dayjs from "dayjs";
import type { HeroSlide } from "./aboutContentHelpers";

export interface ProjectShowcaseItem {
  ProjectID: number;
  Project_Title: string;
  Project_Description: string;
  Project_Images?: string[];
  Project_CreatedAt?: string;
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Client_Number?: string;
  Client_Company?: string;
  Project_FinishedDate?: string | null;
  Budget: number;
}

export type ProjectStatusFilter = "all" | "completed" | "ongoing";

export interface ProjectPortfolioMetrics {
  totalProjects: number;
  completedCount: number;
  ongoingCount: number;
  uniqueLocationsCount: number;
  totalBudget: number;
}

export const DEFAULT_PROJECT_FALLBACK_IMAGE = "/assets/about/facade.jpg";

export const DEFAULT_PROJECT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "project-hero-1",
    headline: "Engineered Installations",
    subheadline:
      "Signature architectural curtain walls, slim-frame doors, and structural glazing delivered across Sri Lanka.",
    image: "/assets/about/facade.jpg",
  },
  {
    id: "project-hero-2",
    headline: "Coastal & Urban Craft",
    subheadline:
      "Precision extruded aluminium built to withstand tropical climates with enduring architectural clarity.",
    image: "/assets/about/terrace.jpg",
  },
  {
    id: "project-hero-3",
    headline: "Turnkey Project Delivery",
    subheadline:
      "From CAD shop drawings and custom finishes to certified on-site erection and handover.",
    image: "/assets/about/pavilion.jpg",
  },
];

export function getProjectStatus(
  project: Pick<ProjectShowcaseItem, "Project_FinishedDate">
): "completed" | "ongoing" {
  const finished = project.Project_FinishedDate?.trim();
  return finished ? "completed" : "ongoing";
}

export function formatProjectDuration(
  start?: string,
  end?: string | null
): string {
  if (!end || !end.trim()) {
    return "Ongoing Installation";
  }
  if (!start || !start.trim()) {
    return "Completed Delivery";
  }

  const startDate = dayjs(start);
  const endDate = dayjs(end);
  if (!startDate.isValid() || !endDate.isValid()) {
    return "Completed Delivery";
  }

  const diffMonths = Math.max(0, endDate.diff(startDate, "month"));
  if (diffMonths === 0) {
    return "Completed within 1 month";
  }
  return `Completed in ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
}

export function normalizeProjectImages(images?: string[]): string[] {
  const cleaned = (Array.isArray(images) ? images : [])
    .map((img) => (typeof img === "string" ? img.trim() : ""))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : [DEFAULT_PROJECT_FALLBACK_IMAGE];
}

export function filterProjects(
  projects: ProjectShowcaseItem[],
  statusFilter: ProjectStatusFilter,
  searchQuery: string
): ProjectShowcaseItem[] {
  const query = searchQuery.trim().toLowerCase();

  return projects.filter((project) => {
    const status = getProjectStatus(project);
    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      project.Project_Title,
      project.Location,
      project.Client_Name,
      project.Client_Company,
      project.Project_Description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function computeProjectPortfolioMetrics(
  projects: ProjectShowcaseItem[]
): ProjectPortfolioMetrics {
  let completedCount = 0;
  let ongoingCount = 0;
  let totalBudget = 0;
  const locationSet = new Set<string>();

  for (const project of projects) {
    if (getProjectStatus(project) === "completed") {
      completedCount += 1;
    } else {
      ongoingCount += 1;
    }
    if (typeof project.Budget === "number" && Number.isFinite(project.Budget)) {
      totalBudget += Math.max(0, project.Budget);
    }
    const loc = project.Location?.trim().toLowerCase();
    if (loc) {
      locationSet.add(loc);
    }
  }

  return {
    totalProjects: projects.length,
    completedCount,
    ongoingCount,
    uniqueLocationsCount: locationSet.size,
    totalBudget,
  };
}

export function buildProjectHeroSlides(
  projects: ProjectShowcaseItem[]
): HeroSlide[] {
  const dynamicSlides: HeroSlide[] = [];

  for (const project of projects) {
    if (dynamicSlides.length >= 4) break;
    const images = normalizeProjectImages(project.Project_Images);
    const primaryImage = images[0];
    if (!primaryImage) continue;

    dynamicSlides.push({
      id: `proj-slide-${project.ProjectID}`,
      headline: project.Project_Title,
      subheadline: `${project.Location}${
        project.Client_Company ? ` · ${project.Client_Company}` : ""
      }`,
      image: primaryImage,
    });
  }

  return dynamicSlides.length > 0 ? dynamicSlides : DEFAULT_PROJECT_HERO_SLIDES;
}
