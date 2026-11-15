import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCustomerMetrics,
  computeFeedbackMetrics,
  computeOrderMetrics,
  formatCurrencyLkr,
  getActiveAdminNavKey,
  getAdminBreadcrumb,
  isAdminPortalPath,
} from "./adminPortalHelpers.ts";

describe("adminPortalHelpers", () => {
  it("recognizes admin routes and keeps public routes isolated", () => {
    assert.equal(isAdminPortalPath("/admin-home"), true);
    assert.equal(isAdminPortalPath("/OrdermanageAdmin"), true);
    assert.equal(isAdminPortalPath("/EditVisionMission?tab=partners"), true);
    assert.equal(isAdminPortalPath("/DesignAdded"), true);
    assert.equal(isAdminPortalPath("/"), false);
    assert.equal(isAdminPortalPath("/about"), false);
    assert.equal(isAdminPortalPath("/admin-login"), false);
    assert.equal(isAdminPortalPath("/profile-login"), false);
  });

  it("maps sub-routes to the right top-bar navigation tab key", () => {
    assert.equal(getActiveAdminNavKey("/admin-home"), "overview");
    assert.equal(getActiveAdminNavKey("/ManageAllAdmins"), "overview");
    assert.equal(getActiveAdminNavKey("/DesignAdded"), "designs");
    assert.equal(getActiveAdminNavKey("/ViewAllDesigns"), "designs");
    assert.equal(getActiveAdminNavKey("/ProductCategoriesAdmin"), "categories");
    assert.equal(getActiveAdminNavKey("/CustomerManager"), "customers");
    assert.equal(getActiveAdminNavKey("/OrdermanageAdmin"), "orders");
    assert.equal(getActiveAdminNavKey("/AddProjects"), "projects");
    assert.equal(getActiveAdminNavKey("/AdminFeedback"), "feedback");
    assert.equal(getActiveAdminNavKey("/EditVisionMission"), "about-cms");
    assert.equal(getActiveAdminNavKey("/PageAdsAdmin"), "ads");
    assert.equal(getActiveAdminNavKey("/BlogsAdmin"), "blogs");
    assert.equal(getActiveAdminNavKey("/AdminSecurity"), "security");
    assert.equal(isAdminPortalPath("/AdminSecurity"), true);
  });

  it("returns accurate breadcrumb metadata for admin pages", () => {
    const ordersMeta = getAdminBreadcrumb("/OrdermanageAdmin");
    assert.equal(ordersMeta.parent, "Orders");
    assert.equal(ordersMeta.current, "Order Fulfillment");

    const catMeta = getAdminBreadcrumb("/ProductCategoriesAdmin");
    assert.equal(catMeta.parent, "Categories");
    assert.equal(catMeta.current, "Product Categories & Slideshows");

    const cmsMeta = getAdminBreadcrumb("/EditVisionMission?tab=clients");
    assert.equal(cmsMeta.parent, "About CMS");
    assert.equal(cmsMeta.current, "Showcase Editor");

    const adsMeta = getAdminBreadcrumb("/PageAdsAdmin");
    assert.equal(adsMeta.parent, "Ads");
    assert.equal(adsMeta.current, "Page Advertisements");

    const blogsMeta = getAdminBreadcrumb("/BlogsAdmin");
    assert.equal(blogsMeta.parent, "Blogs");
    assert.equal(blogsMeta.current, "Blogger Sync & Home Curation");

    const securityMeta = getAdminBreadcrumb("/AdminSecurity");
    assert.equal(securityMeta.parent, "Security");
    assert.equal(securityMeta.current, "Security, 2FA & Audit CSV");
  });

  it("computes order metrics accurately including reported total", () => {
    const metrics = computeOrderMetrics(
      [
        { Order_Status: "PENDING" },
        { Order_Status: "COMPLETED" },
        { Order_Status: "SEND" },
        { Order_Status: "VIEWORDER" },
        { Order_Status: "PENDING" },
      ],
      12
    );
    assert.deepEqual(metrics, {
      total: 12,
      pending: 2,
      send: 1,
      viewOrder: 1,
      completed: 1,
    });
  });

  it("computes customer verification and feedback rating metrics cleanly", () => {
    const cus = computeCustomerMetrics([
      { Verify_State: true },
      { Verify_State: false },
      { Verify_State: true },
    ]);
    assert.deepEqual(cus, { total: 3, verified: 2, unverified: 1 });

    const fb = computeFeedbackMetrics([{ Rating: 5 }, { Rating: 4 }]);
    assert.deepEqual(fb, { total: 2, averageRating: 4.5, fiveStarCount: 1 });

    assert.equal(formatCurrencyLkr(8500000), "RS. 8,500,000");
  });
});
