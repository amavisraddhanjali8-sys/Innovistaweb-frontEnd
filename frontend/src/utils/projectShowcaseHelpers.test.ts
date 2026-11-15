import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROJECT_FALLBACK_IMAGE,
  DEFAULT_PROJECT_HERO_SLIDES,
  buildProjectHeroSlides,
  computeProjectPortfolioMetrics,
  filterProjects,
  formatProjectDuration,
  getProjectStatus,
  normalizeProjectImages,
  type ProjectShowcaseItem,
} from "./projectShowcaseHelpers.ts";

const SAMPLE_PROJECTS: ProjectShowcaseItem[] = [
  {
    ProjectID: 1,
    Project_Title: "Oceanview Villa Sliding Facade",
    Project_Description: "Thermally broken aluminium doors in Colombo.",
    Project_Images: ["/assets/about/terrace.jpg", "/assets/products/door.jpg"],
    Location: "Colombo 07, Sri Lanka",
    Client_Name: "Duminda Perera",
    Client_Email: "duminda@zenithcapital.lk",
    Client_Company: "Zenith Capital Residencies",
    Project_CreatedAt: "2024-01-15T08:00:00.000Z",
    Project_FinishedDate: "2024-09-30T17:00:00.000Z",
    Budget: 8500000,
  },
  {
    ProjectID: 2,
    Project_Title: "Kandy Hills Boutique Pavilion",
    Project_Description: "Skylight and curtain wall fabrication.",
    Project_Images: [],
    Location: "Kandy, Sri Lanka",
    Client_Name: "Sachithra Weerasinghe",
    Client_Email: "sweera@arcvision.com",
    Client_Company: "ArcVision Studio",
    Project_CreatedAt: "2024-03-01T10:00:00.000Z",
    Project_FinishedDate: null,
    Budget: 6200000,
  },
];

test("getProjectStatus and formatProjectDuration distinguish completed and ongoing projects", () => {
  assert.equal(getProjectStatus(SAMPLE_PROJECTS[0]), "completed");
  assert.equal(getProjectStatus(SAMPLE_PROJECTS[1]), "ongoing");

  assert.equal(
    formatProjectDuration(
      SAMPLE_PROJECTS[0].Project_CreatedAt,
      SAMPLE_PROJECTS[0].Project_FinishedDate
    ),
    "Completed in 8 months"
  );
  assert.equal(
    formatProjectDuration(
      SAMPLE_PROJECTS[1].Project_CreatedAt,
      SAMPLE_PROJECTS[1].Project_FinishedDate
    ),
    "Ongoing Installation"
  );
});

test("filterProjects filters accurately by status and keyword query", () => {
  assert.equal(filterProjects(SAMPLE_PROJECTS, "all", "").length, 2);
  assert.equal(filterProjects(SAMPLE_PROJECTS, "completed", "").length, 1);
  assert.equal(filterProjects(SAMPLE_PROJECTS, "ongoing", "").length, 1);
  assert.equal(filterProjects(SAMPLE_PROJECTS, "all", "kandy")[0].ProjectID, 2);
  assert.equal(filterProjects(SAMPLE_PROJECTS, "all", "zenith")[0].ProjectID, 1);
  assert.equal(filterProjects(SAMPLE_PROJECTS, "completed", "kandy").length, 0);
});

test("computeProjectPortfolioMetrics aggregates counts, locations, and total budget", () => {
  const metrics = computeProjectPortfolioMetrics(SAMPLE_PROJECTS);
  assert.deepEqual(metrics, {
    totalProjects: 2,
    completedCount: 1,
    ongoingCount: 1,
    uniqueLocationsCount: 2,
    totalBudget: 14700000,
  });
});

test("normalizeProjectImages and buildProjectHeroSlides provide verified local fallbacks", () => {
  assert.deepEqual(normalizeProjectImages([]), [DEFAULT_PROJECT_FALLBACK_IMAGE]);
  assert.deepEqual(normalizeProjectImages([" /assets/about/terrace.jpg "]), [
    "/assets/about/terrace.jpg",
  ]);

  assert.equal(buildProjectHeroSlides([]).length, DEFAULT_PROJECT_HERO_SLIDES.length);
  const dynamic = buildProjectHeroSlides(SAMPLE_PROJECTS);
  assert.equal(dynamic.length, 2);
  assert.equal(dynamic[0].headline, "Oceanview Villa Sliding Facade");
  assert.equal(dynamic[1].image, DEFAULT_PROJECT_FALLBACK_IMAGE);
});
